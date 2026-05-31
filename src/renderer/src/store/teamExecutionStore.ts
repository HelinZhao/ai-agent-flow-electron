import { create } from 'zustand'
import { teamExecutionApi } from '@renderer/lib/api'

export interface ExecutionEvent {
  id: string
  executionId: string
  teamId?: string
  eventType: string
  memberId?: string
  memberName?: string
  role?: string
  taskTitle?: string  // 文件持久化时写入根层级
  data: Record<string, any>
  createdAt: string
}

interface PendingApprovalInfo {
  actionRequests: { name: string; args: Record<string, any>; description: string }[]
  taskTitle?: string
  teamName?: string
  teamId?: string
}

interface TeamExecutionState {
  /** 唯一数据源：按 executionId 缓存事件 */
  eventsByExecution: Record<string, ExecutionEvent[]>
  /** sync_state 标记的当前待审批（叠加层，不替代事件自身的 actionRequests） */
  pendingApprovalByExecution: Record<string, PendingApprovalInfo>
  /** 当前活跃的 executionId 列表 */
  activeExecutions: string[]
  /** 当前活跃执行所属的 teamId 列表（由 poll 更新，供侧边栏判断实时状态） */
  activeTeamIds: string[]
  initialized: boolean

  init: () => void
  destroy: () => void
  /** 按 teamId 推导事件（不再缓存，从 eventsByExecution 实时聚合） */
  getTeamEvents: (teamId: string) => ExecutionEvent[]
  loadHistory: (teamId: string, executionId: string) => Promise<void>
  /** 清除待审批标记（审批结果已由服务端持久化到文件） */
  markToolApproved: (executionId: string) => void
  clearTeamEvents: (teamId: string) => void
}

let globalSSE: EventSource | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
/** 记录已从文件加载过的 executionId */
const historyLoadedFromFile = new Set<string>()

/** 按 createdAt 升序排序 */
function eventTimeSorter(a: ExecutionEvent, b: ExecutionEvent): number {
  const ta = new Date(a.createdAt || (a as any)._persistedAt || 0).getTime()
  const tb = new Date(b.createdAt || (b as any)._persistedAt || 0).getTime()
  return ta - tb
}

/** 将 tool_call 中待审批的事件标记为已审批 */
function clearApprovalsInEvents(events: ExecutionEvent[]): ExecutionEvent[] {
  return events.map(e =>
    e.eventType === 'tool_call' && e.data?.actionRequests
      ? { ...e, data: { ...e.data, actionRequests: undefined, approved: true } }
      : e
  )
}

export const useTeamExecutionStore = create<TeamExecutionState>((set, get) => ({
  eventsByExecution: {},
  pendingApprovalByExecution: {},
  activeExecutions: [],
  activeTeamIds: [],
  initialized: false,

  init: () => {
    if (get().initialized) return
    set({ initialized: true })

    globalSSE = teamExecutionApi.subscribeAll((event) => {
      // sync_state：只标记当前待审批，不插入事件
      if (event.type === 'sync_state' && event.state) {
        const pending: Record<string, PendingApprovalInfo> = {}
        for (const p of event.state.pendingApprovals || []) {
          pending[p.executionId] = {
            actionRequests: p.actionRequests,
            taskTitle: p.taskTitle,
            teamName: p.teamName,
            teamId: p.teamId,
          }
        }
        set({ pendingApprovalByExecution: pending })
        return
      }

      if (!event.type || event.type === 'connected' || !event.executionId) return
      const exId = event.executionId
      const entry: ExecutionEvent = {
        id: event._seq != null ? `sseq-${event._seq}` : `${event.type}-${Date.now()}`,
        executionId: exId,
        teamId: event.teamId,
        eventType: event.type === 'tool_approval_required' ? 'tool_call' : event.type,
        memberId: event.memberId,
        memberName: event.memberName,
        role: event.role,
        data: { ...event },
        createdAt: new Date().toISOString(),
      }

      set(state => {
        const events = state.eventsByExecution[exId] || []
        const newExec = {
          ...state.eventsByExecution,
          [exId]: [...events, entry],
        }
        let newPending = state.pendingApprovalByExecution

        // execution_complete：清理待审批标记，并将所有 tool_call 标记为已审批
        if (event.type === 'execution_complete') {
          newPending = { ...newPending }
          delete newPending[exId]
          newExec[exId] = clearApprovalsInEvents(newExec[exId])
        }

        // tool_approval_required：更新 pendingApprovalByExecution 叠加层
        if (event.type === 'tool_approval_required') {
          newPending = { ...newPending, [exId]: { actionRequests: event.actionRequests, teamId: event.teamId, taskTitle: event.taskTitle, teamName: event.teamName } }
        }

        return { eventsByExecution: newExec, pendingApprovalByExecution: newPending }
      })
    })

    const poll = async () => {
      try {
        const data = await teamExecutionApi.list()
        set({
          activeExecutions: data.executions.map(e => e.executionId),
          activeTeamIds: data.executions.map(e => e.teamId).filter(Boolean) as string[],
        })
      } catch { /* ignore */ }
    }
    poll()
    pollTimer = setInterval(poll, 5000)
  },

  destroy: () => {
    if (globalSSE) { globalSSE.close(); globalSSE = null }
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
    set({ initialized: false, eventsByExecution: {}, pendingApprovalByExecution: {}, activeExecutions: [], activeTeamIds: [] })
  },

  /** 从 eventsByExecution 实时聚合团队事件 */
  getTeamEvents: (teamId: string) => {
    const result: ExecutionEvent[] = []
    for (const events of Object.values(get().eventsByExecution)) {
      for (const e of events) {
        if (e.teamId === teamId) result.push(e)
      }
    }
    return result.sort(eventTimeSorter)
  },

  /** 清除指定团队的事件缓存（用于退出历史回看） */
  clearTeamEvents: (teamId: string) => {
    set(state => {
      const newExec = { ...state.eventsByExecution }
      for (const exId of Object.keys(newExec)) {
        if (newExec[exId]?.some(e => e.teamId === teamId)) {
          delete newExec[exId]
          // historyLoadedFromFile 的 key 格式为 `${teamId}:${executionId}`
          historyLoadedFromFile.delete(`${teamId}:${exId}`)
        }
      }
      return { eventsByExecution: newExec }
    })
  },

  /** 清除待审批标记，同时将本地 tool_call 标记为已审批（结果已写入文件） */
  markToolApproved: (executionId: string) => {
    set(state => {
      const newPending = { ...state.pendingApprovalByExecution }
      delete newPending[executionId]
      const events = state.eventsByExecution[executionId]
      if (!events) return { pendingApprovalByExecution: newPending }
      return {
        pendingApprovalByExecution: newPending,
        eventsByExecution: {
          ...state.eventsByExecution,
          [executionId]: clearApprovalsInEvents(events),
        },
      }
    })
  },

  loadHistory: async (teamId: string, executionId: string) => {
    const key = `${teamId}:${executionId}`
    if (historyLoadedFromFile.has(key)) return
    historyLoadedFromFile.add(key)
    const state = get()
    try {
      const { events } = await teamExecutionApi.getHistory(teamId, executionId)
      if (events.length === 0) return

      // 按时间正序处理：tool_approved 标记其前一个 tool_call 已审批
      const normalized: ExecutionEvent[] = []
      const sorted = [...events].sort(eventTimeSorter)

      for (const e of sorted) {
        // tool_approved 事件本身不显示，但用它标记前一个 tool_call 已审批
        if (e.eventType === 'tool_approved') {
          if (normalized.length > 0) {
            const last = normalized[normalized.length - 1]
            if (last.eventType === 'tool_call' && last.data?.actionRequests) {
              last.data = { ...last.data, actionRequests: undefined, approved: true }
            }
          }
          continue
        }

        const ev: ExecutionEvent = {
          ...e,
          createdAt: e.createdAt || (e as any)._persistedAt || new Date().toISOString(),
          data: { ...(e.data || {}) },
        }
        normalized.push(ev)
      }

      // 合并并排序
      const existing = state.eventsByExecution[executionId] || []
      const existingIds = new Set(existing.map(e => e.id))
      const merged = [...existing, ...normalized.filter(e => !existingIds.has(e.id))]
      merged.sort(eventTimeSorter)

      set({
        eventsByExecution: { ...state.eventsByExecution, [executionId]: merged },
      })
    } catch (err) { console.error('[Store] loadHistory error:', err) }
  },
}))
