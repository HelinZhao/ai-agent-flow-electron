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
  loadHistory: (executionId: string) => Promise<void>
  markToolApproved: (executionId: string, teamId?: string) => void
}

let globalSSE: EventSource | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

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
        const synced: Record<string, any[]> = {}
        for (const p of event.state.pendingApprovals || []) {
          const entry = {
            id: `sync-${p.executionId}-${Date.now()}`,
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
            const newExec = { ...state.eventsByExecution }
            const newTeam = { ...state.eventsByTeam }
            for (const [exId, entries] of Object.entries(synced)) {
              newExec[exId] = [...(newExec[exId] || []), ...entries]
              const tid = entries[0]?.teamId
              if (tid) newTeam[tid] = [...(newTeam[tid] || []), ...entries]
            }
            return { eventsByExecution: newExec, eventsByTeam: newTeam }
          })
        }
        return
      }

      if (!event.type || event.type === 'connected' || !event.executionId) return
      const exId = event.executionId
      const tid = event.teamId
      const store = get()
      const entry = {
        id: `${event.type}-${Date.now()}`,
        executionId: exId,
        teamId: tid,
        eventType: event.type === 'tool_approval_required' ? 'tool_call' : event.type,
        memberId: event.memberId,
        memberName: event.memberName,
        role: event.role,
        data: { ...event },
        createdAt: new Date().toISOString(),
      }

      const newExec = { ...store.eventsByExecution }
      newExec[exId] = [...(newExec[exId] || []), entry]

      const newTeam = { ...store.eventsByTeam }
      if (tid) newTeam[tid] = [...(newTeam[tid] || []), entry]

      set({ eventsByExecution: newExec, eventsByTeam: newTeam })
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

  /** 标记某 execution 的待审批事件为已处理 */
  markToolApproved: (executionId: string, teamId?: string) => {
    set(state => {
      const newExec = { ...state.eventsByExecution }
      const exec = newExec[executionId]
      if (exec) {
        newExec[executionId] = exec.map(e =>
          e.eventType === 'tool_call' && e.data?.actionRequests
            ? { ...e, data: { ...e.data, actionRequests: undefined, approved: true } }
            : e
        )
      }
      const newTeam = { ...state.eventsByTeam }
      if (teamId && newTeam[teamId]) {
        newTeam[teamId] = newTeam[teamId].map(e =>
          e.eventType === 'tool_call' && e.data?.actionRequests
            ? { ...e, data: { ...e.data, actionRequests: undefined, approved: true } }
            : e
        )
      }
      return { eventsByExecution: newExec, eventsByTeam: newTeam }
    })
  },

  loadHistory: async (executionId: string) => {
    const state = get()
    try {
      const { events } = await teamExecutionApi.getHistory(executionId)
      if (events.length > 0) {
        // 合并历史事件到已有事件（sync_state 可能已写入待审批）
        const existing = state.eventsByExecution[executionId] || []
        const existingIds = new Set(existing.map(e => e.id))
        const merged = [...existing, ...events.filter(e => !existingIds.has(e.id))]
        const newExec = { ...state.eventsByExecution, [executionId]: merged }
        const newTeam = { ...state.eventsByTeam }
        for (const e of merged) {
          if (e.teamId) {
            const tid = e.teamId
            const teamEvents = newTeam[tid] || []
            // 用 executionId+eventType+createdAt 做去重 key（文件事件没有 id）
            const key = e.id || `${e.executionId}-${e.eventType}-${e.createdAt}`
            if (!teamEvents.some(t => (t.id || `${t.executionId}-${t.eventType}-${t.createdAt}`) === key)) {
              newTeam[tid] = [...teamEvents, e]
            }
          }
        }
        set({ eventsByExecution: newExec, eventsByTeam: newTeam })
      }
    } catch (err) { console.error('[Store] loadHistory error:', err) }
  },
}))
