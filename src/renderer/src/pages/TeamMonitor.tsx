import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import MarkdownPreview from '@renderer/components/MarkdownPreview'
import StatusIcon from '@renderer/components/ui/StatusIcon'
import { useAppStore } from '@renderer/store/appStore'
import { useTeamExecutionStore } from '@renderer/store/teamExecutionStore'
import { teamExecutionApi } from '@renderer/lib/api'
import type { ExecutionEvent } from '@renderer/store/teamExecutionStore'

/* ---------- helpers ---------- */

function buildTeamEventMap(eventsByExecution: Record<string, ExecutionEvent[]>): Record<string, ExecutionEvent[]> {
  const map: Record<string, ExecutionEvent[]> = {}
  for (const events of Object.values(eventsByExecution)) {
    for (const e of events) {
      if (e.teamId) {
        (map[e.teamId] ??= []).push(e)
      }
    }
  }
  for (const tid of Object.keys(map)) {
    map[tid].sort((a, b) => {
      const ta = new Date(a.createdAt || (a as any)._persistedAt || 0).getTime()
      const tb = new Date(b.createdAt || (b as any)._persistedAt || 0).getTime()
      return ta - tb
    })
  }
  return map
}

/* ---------- main component ---------- */

export default function TeamMonitor() {
  const { teams, tasks } = useAppStore()
  const loadHistory = useTeamExecutionStore(s => s.loadHistory)
  const markToolApproved = useTeamExecutionStore(s => s.markToolApproved)
  const clearTeamEvents = useTeamExecutionStore(s => s.clearTeamEvents)
  const pendingApprovalByExecution = useTeamExecutionStore(s => s.pendingApprovalByExecution)
  const eventsByExecution = useTeamExecutionStore(s => s.eventsByExecution)
  const activeTeamIds = useTeamExecutionStore(s => s.activeTeamIds)
  const msgEndRef = useRef<HTMLDivElement>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [historyList, setHistoryList] = useState<{ executionId: string; taskTitle?: string; lastEventAt: string; eventCount: number }[]>([])
  const historyLoadedRef = useRef<Set<string>>(new Set())

  const selectedTeam = teams.find(t => t.id === selectedTeamId)

  // 从 eventsByExecution 推导所有团队事件（侧边栏用）
  const allTeamEvents = useMemo(() => buildTeamEventMap(eventsByExecution), [eventsByExecution])

  // 选中团队的事件列表
  const teamEvents = useMemo(
    () => (selectedTeamId ? allTeamEvents[selectedTeamId] ?? [] : []),
    [allTeamEvents, selectedTeamId],
  )

  // 无活跃执行时加载历史列表
  useEffect(() => {
    if (!selectedTeamId || teamEvents.length > 0) return
    let cancelled = false
    teamExecutionApi.getHistoryByTeam(selectedTeamId).then(res => {
      if (!cancelled) setHistoryList(res.executions || [])
    }).catch(() => { })
    return () => { cancelled = true }
  }, [selectedTeamId, teamEvents.length])

  // 点击历史记录（Store 的 historyLoadedFromFile 会做去重，这里不用额外 guard）
  const handleSelectHistory = useCallback((executionId: string) => {
    if (!selectedTeamId) return
    loadHistory(selectedTeamId, executionId)
  }, [selectedTeamId, loadHistory])

  // 从事件中提取执行概要
  const execSummary = useMemo(() => {
    if (teamEvents.length === 0) return null
    const first = teamEvents[0]
    // 从后往前找 execution_complete 事件（文件事件的 taskTitle 在根层级）
    const completeEvent = [...teamEvents].reverse().find(e => e.eventType === 'execution_complete')
    return {
      executionId: first.executionId,
      taskTitle: first.taskTitle || first.data?.taskTitle || null,
      execStatus: completeEvent
        ? (completeEvent.data?.status === 'completed' ? 'completed' as const : 'failed' as const)
        : 'running' as const,
    }
  }, [teamEvents])

  // 选中团队时加载最近的执行历史
  useEffect(() => {
    if (!selectedTeamId) return
    const loadKey = `lastExec:${selectedTeamId}`
    if (historyLoadedRef.current.has(loadKey)) return
    historyLoadedRef.current.add(loadKey)
    teamExecutionApi.getLastExecution(selectedTeamId).then(res => {
      if (res.executionId) {
        loadHistory(selectedTeamId, res.executionId)
      }
    }).catch(err => console.error('[TeamMonitor] error:', err))
  }, [selectedTeamId, loadHistory])

  const pendingTaskCount = tasks.filter(t => t.status === 'pending').length

  // 组装消息列表（每个事件携带自己的 actionRequests，由 tool_approved 文件事件决定是否剥离）
  const messages = useMemo(() => teamEvents.map((e: ExecutionEvent, idx: number) => {
    const eventCreatedAt = e.createdAt || (e as any)._persistedAt || e.id || ''
    return {
      id: e.id || `${e.teamId || 'x'}-${e.eventType}-${eventCreatedAt}-${idx}`,
      type: e.eventType,
      executionId: e.executionId,
      timestamp: new Date(eventCreatedAt).getTime(),
      memberId: e.memberId,
      memberName: e.memberName,
      role: e.role,
      status: e.data?.status as string | undefined,
      toolName: e.data?.toolName as string | undefined,
      toolArgs: e.data?.toolArgs as Record<string, any> | undefined,
      output: e.data?.output || e.data?.result,
      actionRequests: e.data?.actionRequests as Array<{ name: string; args: Record<string, any>; description: string }> | undefined,
      toolApproved: e.data?.approved as boolean | undefined,
      toolRejected: e.data?.rejected as boolean | undefined,
      toolExpired: e.data?.expired as boolean | undefined,
      execStatus: e.data?.status as string | undefined,
      error: e.data?.error as string | undefined,
    }
  }), [teamEvents])

  const handleApprove = useCallback(async (executionId: string, decision: 'approve' | 'reject', count: number = 1) => {
    try {
      const decisions = Array.from({ length: count }, () => ({ type: decision }))
      await teamExecutionApi.approveTool(executionId, decisions)
      markToolApproved(executionId, decision === 'approve' ? 'approved' : 'rejected')
    } catch { /* ignore */ }
  }, [markToolApproved])

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  /* ---------- render ---------- */

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Team list ── */}
      <div className="w-60 flex-shrink-0 border-r border-gray-200/60 dark:border-gray-700/50 bg-white dark:bg-gray-900 flex flex-col">
        <div className="px-4 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm tracking-tight">团队列表</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                {teams.length} 个团队 · {pendingTaskCount} 待办
              </p>
            </div>
          </div>
        </div>

        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-gray-200/60 dark:via-gray-700/50 to-transparent flex-shrink-0" />

        <nav className="flex-1 px-2 pt-3 pb-3 space-y-0.5 overflow-y-auto">
          {teams.map(team => {
            // 实时状态（不受历史事件影响）：待审批中 或 活跃执行中
            const isActiveNow = activeTeamIds.includes(team.id)
            const isPendingForTeam = Object.values(pendingApprovalByExecution).some(p => p.teamId === team.id)
            const isRunning = isActiveNow || isPendingForTeam
            const isActive = selectedTeamId === team.id
            const initial = team.name.charAt(0).toUpperCase()
            return (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 text-sm rounded-lg transition-all duration-150 group relative ${isActive
                  ? 'bg-blue-50/80 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800/70'
                  }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 text-md font-bold transition-all ${isRunning
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/20'
                    : 'bg-gray-200/70 dark:bg-gray-700/70 text-gray-500 dark:text-gray-400'
                    }`}
                >
                  {initial}
                </span>
                <div className="text-left min-w-0 flex-1">
                  <div className="text-sm font-medium truncate leading-tight flex items-center gap-1.5">
                    {team.name}
                    {isRunning && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="执行中" />
                    )}
                  </div>
                  {isRunning ? (
                    <div className="text-xs mt-0.5 truncate text-blue-500 dark:text-blue-400 leading-tight">
                      {execSummary?.taskTitle || '执行中...'}
                    </div>
                  ) : (
                    <div className="text-xs mt-0.5 truncate text-gray-400 dark:text-gray-500 leading-tight">空闲</div>
                  )}
                </div>
              </button>
            )
          })}
          {teams.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 px-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">暂无团队</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">请先在团队管理页面创建</p>
            </div>
          )}
        </nav>
      </div>

      {/* ── Right: Execution message feed ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedTeam ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-3">📡</div>
              <p className="text-sm">从左侧选择一个团队查看执行状态</p>
            </div>
          </div>
        ) : teamEvents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-6">
            {historyList.length > 0 ? (
              <div className="w-full max-w-md">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">{selectedTeam.name} - 历史执行</h3>
                <div className="space-y-2">
                  {historyList.map(h => (
                    <button
                      key={h.executionId}
                      onClick={() => handleSelectHistory(h.executionId)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{h.taskTitle || '无标题'}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{new Date(h.lastEventAt).toLocaleString('zh-CN')} · {h.eventCount} 条事件</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-3">💤</div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{selectedTeam.name}</p>
                <p className="text-xs mt-1">当前没有正在执行的任务</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex-shrink-0 px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center gap-3">
              {execSummary?.execStatus !== 'running' && (
                <button
                  onClick={() => clearTeamEvents(selectedTeamId!)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                  title="返回历史列表"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTeam.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{execSummary?.taskTitle || '执行中...'}</p>
              </div>
              {execSummary && (
                <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${execSummary.execStatus === 'completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                  execSummary.execStatus === 'failed' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                    'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                  }`}>
                  {execSummary.execStatus === 'completed' ? '已完成' : execSummary.execStatus === 'failed' ? '失败' : '运行中'}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {messages.map(msg => {
                // 逐事件判断审批状态
                const isLivePending = !!msg.actionRequests && (msg.executionId in pendingApprovalByExecution)
                const isExpiredTool = !!msg.toolExpired || (!!msg.actionRequests && !(msg.executionId in pendingApprovalByExecution))
                const actionRequests = isLivePending
                  ? (msg.actionRequests || pendingApprovalByExecution[msg.executionId]?.actionRequests)
                  : undefined
                const actionReqCount = actionRequests?.length || 0

                return (
                  <div key={msg.id} className="text-sm">
                    {(msg.type === 'member_status' || msg.type === 'member_output') && (
                      <div className="flex items-start gap-2.5">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-600 dark:text-gray-300 mt-0.5">
                          {msg.role === 'captain' ? 'C' : msg.memberName?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700 dark:text-gray-300 text-xs">{msg.memberName}</span>
                            <StatusIcon status={msg.status} />
                          </div>
                          {msg.status === 'thinking' && <p className="text-gray-400 text-xs mt-0.5">思考中...</p>}
                          {msg.status === 'using_tool' && (
                            <div className="mt-0.5 text-xs">
                              <span className="text-amber-600 dark:text-amber-400 font-medium">使用工具: {msg.toolName}</span>
                              {msg.toolArgs && (
                                <pre className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded text-[10px] text-gray-600 dark:text-gray-400 overflow-x-auto">
                                  {JSON.stringify(msg.toolArgs, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}
                          {msg.output && (
                            <div className="mt-1 p-2.5 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700/50">
                              <MarkdownPreview content={msg.output} className="text-xs" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {msg.type === 'tool_call' && (
                      <div className={`p-3 rounded-lg border text-xs ${isLivePending
                        ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50'
                        : 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700'
                        }`}>
                        {isLivePending ? (
                          <>
                            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">🛡️ 工具调用待审批</div>
                            {(actionRequests || []).map((a: any, i: number) => (
                              <div key={i} className="mb-2 last:mb-0 p-2 bg-white/60 dark:bg-gray-900/40 rounded text-xs">
                                <div className="font-medium text-gray-700 dark:text-gray-300">{a.name}</div>
                                {a.description && <div className="text-gray-500 mt-0.5">{a.description}</div>}
                                <pre className="mt-1 text-[10px] text-gray-400 overflow-x-auto">{JSON.stringify(a.args, null, 2)}</pre>
                              </div>
                            ))}
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleApprove(msg.executionId, 'approve', actionReqCount)}
                                className="px-3 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                              >批准</button>
                              <button
                                onClick={() => handleApprove(msg.executionId, 'reject', actionReqCount)}
                                className="px-3 py-1 text-xs font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
                              >拒绝</button>
                            </div>
                          </>
                        ) : isExpiredTool ? (
                          <div className="text-gray-400 dark:text-gray-500 font-medium">⏳ 已过期</div>
                        ) : msg.toolRejected ? (
                          <div className="text-red-500 dark:text-red-400 font-medium">❌ 已拒绝</div>
                        ) : (
                          <div className="text-emerald-600 dark:text-emerald-400 font-medium">✅ 已批准</div>
                        )}
                      </div>
                    )}

                    {msg.type === 'execution_complete' && (
                      <div className={`p-3 rounded-lg border text-xs ${msg.execStatus === 'completed'
                        ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300'
                        }`}>
                        <span className="font-semibold">
                          {msg.execStatus === 'completed' ? '✅ 任务执行完成' : '❌ 任务执行失败'}
                        </span>
                        {msg.error && <p className="mt-1 text-red-600 dark:text-red-400">{msg.error}</p>}
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={msgEndRef} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
