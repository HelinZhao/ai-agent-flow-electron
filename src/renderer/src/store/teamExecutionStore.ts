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
  data: Record<string, any>
  createdAt: string
}

interface TeamExecutionState {
  /** 按 executionId 缓存 */
  eventsByExecution: Record<string, ExecutionEvent[]>
  /** 按 teamId 索引（当前活跃执行的事件） */
  eventsByTeam: Record<string, ExecutionEvent[]>
  /** 当前活跃的 executionId 列表 */
  activeExecutions: string[]
  initialized: boolean

  init: () => void
  destroy: () => void
  getTeamEvents: (teamId: string) => ExecutionEvent[]
  loadHistory: (teamId: string, executionId: string) => Promise<void>
  markToolApproved: (executionId: string, teamId?: string) => void
  clearTeamEvents: (teamId: string) => void
}

let globalSSE: EventSource | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
/** 记录已从文件加载过的 executionId */
const historyLoadedFromFile = new Set<string>()

/** 按 createdAt 升序排序的比较函数 */
function eventTimeSorter(a: ExecutionEvent, b: ExecutionEvent): number {
  const ta = new Date(a.createdAt || (a as any)._persistedAt || 0).getTime()
  const tb = new Date(b.createdAt || (b as any)._persistedAt || 0).getTime()
  return ta - tb
}

// ─── 辅助：同步追加事件到 eventsByExecution + eventsByTeam ───

function appendToBothViews(
  prev: TeamExecutionState,
  exId: string,
  entries: ExecutionEvent[],
): Pick<TeamExecutionState, 'eventsByExecution' | 'eventsByTeam'> {
  const newExec = { ...prev.eventsByExecution }
  const newTeam = { ...prev.eventsByTeam }

  /** 二分插入，按 createdAt 保持有序 */
  function sortedPush(arr: ExecutionEvent[], entry: ExecutionEvent): ExecutionEvent[] {
    const t = new Date(entry.createdAt || 0).getTime()
    // 从后往前找插入点（大部分场景是追加到最后）
    let i = arr.length
    while (i > 0 && new Date(arr[i - 1].createdAt || 0).getTime() > t) i--
    const copy = [...arr]
    copy.splice(i, 0, entry)
    return copy
  }

  for (const entry of entries) {
    newExec[exId] = sortedPush(newExec[exId] || [], entry)
    if (entry.teamId) {
      newTeam[entry.teamId] = sortedPush(newTeam[entry.teamId] || [], entry)
    }
  }
  return { eventsByExecution: newExec, eventsByTeam: newTeam }
}

/** 将 execution 中所有 tool_call 待审批事件标记为已审批 */
function clearApprovalsInViews(
  prev: TeamExecutionState,
  executionId: string,
  teamId?: string,
): Pick<TeamExecutionState, 'eventsByExecution' | 'eventsByTeam'> {
  const clearOne = (arr: ExecutionEvent[]) =>
    arr.map(e =>
      e.eventType === 'tool_call' && e.data?.actionRequests
        ? { ...e, data: { ...e.data, actionRequests: undefined, approved: true } }
        : e
    )

  const newExec = { ...prev.eventsByExecution }
  if (newExec[executionId]) {
    newExec[executionId] = clearOne(newExec[executionId])
  }
  const newTeam = { ...prev.eventsByTeam }
  if (teamId && newTeam[teamId]) {
    newTeam[teamId] = clearOne(newTeam[teamId])
  }
  return { eventsByExecution: newExec, eventsByTeam: newTeam }
}

// ─── Store ───

export const useTeamExecutionStore = create<TeamExecutionState>((set, get) => ({
  eventsByExecution: {},
  eventsByTeam: {},
  activeExecutions: [],
  initialized: false,

  init: () => {
    if (get().initialized) return
    set({ initialized: true })

    globalSSE = teamExecutionApi.subscribeAll((event) => {
      // 重连后的状态同步
      if (event.type === 'sync_state' && event.state) {
        const synced: Record<string, ExecutionEvent[]> = {}
        for (const p of event.state.pendingApprovals || []) {
          const entry: ExecutionEvent = {
            id: `sync-${p.executionId}-${p.teamId || 'x'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            executionId: p.executionId,
            teamId: p.teamId,
            eventType: 'tool_call',
            data: { actionRequests: p.actionRequests, taskTitle: p.taskTitle, teamName: p.teamName, teamId: p.teamId },
            createdAt: new Date().toISOString(),
          }
          const exId = p.executionId
          synced[exId] = [...(synced[exId] || []), entry]
        }
        if (Object.keys(synced).length > 0) {
          set(state => {
            let updated = { eventsByExecution: { ...state.eventsByExecution }, eventsByTeam: { ...state.eventsByTeam } }
            for (const [exId, entries] of Object.entries(synced)) {
              updated = appendToBothViews(
                { ...state, ...updated },
                exId,
                entries,
              )
            }
            return updated
          })
        }
        return
      }

      if (!event.type || event.type === 'connected' || !event.executionId) return
      const exId = event.executionId
      const tid = event.teamId
      const entry: ExecutionEvent = {
        id: event._seq != null ? `sseq-${event._seq}` : `${event.type}-${Date.now()}`,
        executionId: exId,
        teamId: tid,
        eventType: event.type === 'tool_approval_required' ? 'tool_call' : event.type,
        memberId: event.memberId,
        memberName: event.memberName,
        role: event.role,
        data: { ...event },
        createdAt: new Date().toISOString(),
      }

      set(state => {
        const views = appendToBothViews(state, exId, [entry])

        // 执行完成时自动清除该 execution 的待审批标记
        if (event.type === 'execution_complete') {
          return clearApprovalsInViews(
            { ...state, ...views },
            exId,
            tid,
          )
        }
        return views
      })
    })

    const poll = async () => {
      try {
        const data = await teamExecutionApi.list()
        set({ activeExecutions: data.executions.map(e => e.executionId) })
      } catch { /* ignore */ }
    }
    poll()
    pollTimer = setInterval(poll, 5000)
  },

  destroy: () => {
    if (globalSSE) { globalSSE.close(); globalSSE = null }
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
    set({ initialized: false, eventsByExecution: {}, eventsByTeam: {}, activeExecutions: [] })
  },

  getTeamEvents: (teamId: string) => {
    return get().eventsByTeam[teamId] || []
  },

  /** 清除指定团队的事件缓存（用于退出历史回看） */
  clearTeamEvents: (teamId: string) => {
    set(state => {
      const newTeam = { ...state.eventsByTeam }
      delete newTeam[teamId]
      // 同时清除该团队相关 execution 的事件和文件加载标记
      const newExec = { ...state.eventsByExecution }
      for (const exId of Object.keys(newExec)) {
        if (newExec[exId]?.some(e => e.teamId === teamId)) {
          delete newExec[exId]
          historyLoadedFromFile.delete(exId)
        }
      }
      return { eventsByTeam: newTeam, eventsByExecution: newExec }
    })
  },

  /** 标记某 execution 的待审批事件为已处理 */
  markToolApproved: (executionId: string, teamId?: string) => {
    set(state => clearApprovalsInViews(state, executionId, teamId))
  },

  loadHistory: async (teamId: string, executionId: string) => {
    const key = `${teamId}:${executionId}`
    if (historyLoadedFromFile.has(key)) return
    historyLoadedFromFile.add(key)
    const state = get()
    try {
      const { events } = await teamExecutionApi.getHistory(teamId, executionId)
      if (events.length > 0) {
        // 检查是否已有来自 SSE/sync_state 的当前待审批 tool_call
        const existing = state.eventsByExecution[executionId] || []
        const hasLivePendingToolCall = existing.some(e => e.eventType === 'tool_call' && e.data?.actionRequests)
        const existingIds = new Set(existing.map(e => e.id))

        // 规范化文件事件：旧格式没有 createdAt，用 _persistedAt 回退
        const normalized = events
          // 如果已有实时待审批条目，跳过文件中的旧 tool_call（它们是已解析的副本）
          .filter(e => !(hasLivePendingToolCall && e.eventType === 'tool_call'))
          .map(e => {
            // 历史 tool_call 不再显示审批 UI
            const isHistoricalToolCall = e.eventType === 'tool_call' && e.data?.actionRequests
            return {
              ...e,
              createdAt: e.createdAt || (e as any)._persistedAt || new Date().toISOString(),
              ...(isHistoricalToolCall
                ? { data: { ...e.data, actionRequests: undefined, approved: true } }
                : {}),
            }
          })
        // 使用 _seq 或 id 做去重
        const merged = [...existing, ...normalized.filter(e => !existingIds.has(e.id))]
        // 按时间正序排列（文件事件 + SSE 事件混合后必须重排序）
        merged.sort(eventTimeSorter)
        const newExec = { ...state.eventsByExecution, [executionId]: merged }
        // 从排序后的 merged 重建相关团队的 eventsByTeam（其他团队事件保留），再统一按时间排序
        const affectedTeams = new Set<string>()
        for (const e of merged) if (e.teamId) affectedTeams.add(e.teamId)
        const newTeam = { ...state.eventsByTeam }
        for (const tid of affectedTeams) {
          const teamEvents = merged.filter(e => e.teamId === tid)
          const otherEvents = (newTeam[tid] || []).filter(e => e.executionId !== executionId)
          newTeam[tid] = [...otherEvents, ...teamEvents].sort(eventTimeSorter)
        }
        set({ eventsByExecution: newExec, eventsByTeam: newTeam })
      }
    } catch (err) { console.error('[Store] loadHistory error:', err) }
  },
}))
