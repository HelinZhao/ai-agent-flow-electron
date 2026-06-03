import { useEffect, useMemo, useState } from 'react'
import type { Task } from '@renderer/types'
import MarkdownPreview from '@renderer/components/MarkdownPreview'
import SectionHeader from './SectionHeader'
import StatusIcon from '@renderer/components/ui/StatusIcon'
import { useTeamExecutionStore } from '@renderer/store/teamExecutionStore'
import type { ExecutionEvent } from '@renderer/store/teamExecutionStore'

interface TaskDetailRowProps {
  task: Task
  colSpan: number
  getTeamName: (id?: string) => string
  getParentTask: (parentId?: string) => Task | undefined
  allTasks: Task[]
  onCancel: (id: string) => void
  onApprove: (id: string) => void
  onReject: (id: string, comment?: string) => void
  onRestart: (id: string) => void
  onClose: () => void
}

/* ---------- inline SVG icons ---------- */
const IconDescription = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)

const IconResult = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const IconError = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const IconTimeline = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const IconTeam = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
)

/* ---------- helpers ---------- */

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  pending: '待处理',
  assigned: '已指派',
  claimed: '处理中',
  pending_review: '待验收',
  completed: '已完成',
  failed: '失败',
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600',
  pending: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-600',
  assigned: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  claimed: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  pending_review: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  completed: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  failed: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
}

const formatTime = (t?: string) =>
  t ? new Date(t).toLocaleString('zh-CN') : '-'

/* ---------- sub-components ---------- */

function RestartBadge({ task }: { task: Task }) {
  if (!task.restartedFrom) return null
  const prev = JSON.parse(task.restartedFrom)
  return (
    <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800/50 text-xs flex items-center gap-2">
      <span className="font-semibold text-orange-600 dark:text-orange-400">↻ 已重启</span>
      <span className="text-gray-500 dark:text-gray-400">
        前一次: {prev.status === 'completed' ? '已完成' : '失败'}
        {prev.completedAt && ` · ${formatTime(prev.completedAt)}`}
      </span>
    </div>
  )
}

function TimelineCard({ task }: { task: Task }) {
  const items = [
    { label: '创建', time: task.createdAt },
    { label: '认领', time: task.claimedAt },
    { label: '完成', time: task.completedAt },
  ].filter(i => i.time)

  if (items.length === 0) return null

  return (
    <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg border border-gray-200 dark:border-gray-700/50 p-3.5">
      <SectionHeader icon={IconTimeline} label="时间线" />
      <div className="relative ml-1">
        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-2.5 text-xs">
          {items.map((i, idx) => (
            <div key={i.label} className="flex items-start gap-3">
              <span
                className={`relative z-10 mt-1.5 w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 ${
                  idx === items.length - 1
                    ? 'bg-emerald-400 border-emerald-300 dark:bg-emerald-500 dark:border-emerald-400'
                    : 'bg-gray-200 border-gray-300 dark:bg-gray-600 dark:border-gray-500'
                }`}
              />
              <div className="flex-1 min-w-0 flex justify-between items-baseline gap-2">
                <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{i.label}</span>
                <span className="text-gray-700 dark:text-gray-300 text-right">{formatTime(i.time)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TeamCard({ task, getTeamName }: { task: Task; getTeamName: (id?: string) => string }) {
  return (
    <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg border border-gray-200 dark:border-gray-700/50 p-3.5">
      <SectionHeader icon={IconTeam} label="认领团队" />
      <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
        {getTeamName(task.claimedBy)}
      </div>
    </div>
  )
}

function ExecutionIdCard({ task }: { task: Task }) {
  if (!task.executionId) return null
  return (
    <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg border border-gray-200 dark:border-gray-700/50 p-3.5">
      <SectionHeader icon={IconResult} label="执行 ID" />
      <div className="text-[10px] text-gray-600 dark:text-gray-400 font-mono truncate" title={task.executionId}>
        {task.executionId}
      </div>
    </div>
  )
}

/* ---------- Team execution progress (compact) ---------- */

interface MemberState {
  memberId: string
  memberName: string
  role: 'captain' | 'member'
  status: 'thinking' | 'using_tool' | 'done' | 'error'
  toolName?: string
  output?: string
}

function extractMemberId(e: ExecutionEvent): string {
  return e.memberId || (e.data?.memberId as string) || ''
}

function extractMemberName(e: ExecutionEvent): string {
  return e.memberName || (e.data?.memberName as string) || '?'
}

function extractRole(e: ExecutionEvent): 'captain' | 'member' {
  const r = e.role || e.data?.role
  return (r === 'captain' || r === 'member') ? r : 'member'
}

function extractStatus(e: ExecutionEvent): MemberState['status'] {
  const s: string = e.data?.status || 'thinking'
  return (s === 'thinking' || s === 'using_tool' || s === 'done' || s === 'error') ? s : 'thinking'
}

function TeamExecutionProgress({ executionId, teamId }: { executionId: string; teamId?: string }) {
  const events = useTeamExecutionStore(s => s.eventsByExecution[executionId])
  const loadHistory = useTeamExecutionStore(s => s.loadHistory)

  // 首次挂载时从文件加载历史（如果 store 里还没有）
  useEffect(() => {
    if (teamId) {
      loadHistory(teamId, executionId)
    }
  }, [teamId, executionId, loadHistory])

  // 从事件中提取成员最新状态
  const members = useMemo(() => {
    if (!events || events.length === 0) return []
    const map = new Map<string, MemberState>()
    for (const e of events) {
      if (e.eventType === 'member_status' || e.eventType === 'member_output') {
        const mId = extractMemberId(e)
        map.set(mId, {
          memberId: mId,
          memberName: extractMemberName(e),
          role: extractRole(e),
          status: extractStatus(e),
          toolName: e.data?.toolName as string | undefined,
          output: e.data?.output || e.data?.result,
        })
      }
    }
    return Array.from(map.values())
  }, [events])

  const status = useMemo(() => {
    if (!events || events.length === 0) return 'running'
    const last = events[events.length - 1]
    if (last.eventType === 'execution_complete') {
      return last.data?.status === 'completed' ? 'completed' : 'failed'
    }
    return 'running'
  }, [events])

  if (members.length === 0 && status === 'running') {
    return (
      <div className="p-3 bg-white/60 dark:bg-gray-900/40 rounded-lg border border-blue-200/50 dark:border-blue-800/50 text-xs text-gray-500">
        等待团队成员开始执行...
      </div>
    )
  }

  return (
    <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg border border-blue-200/50 dark:border-blue-800/50 p-3">
      <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        团队执行状态
        {status !== 'running' && (
          <span className={`ml-1 font-normal ${status === 'completed' ? 'text-emerald-500' : 'text-red-500'}`}>
            · {status === 'completed' ? '已完成' : '失败'}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {members.map(m => (
          <div key={m.memberId} className="flex items-center gap-2 text-xs">
            <span className="w-4 flex justify-center flex-shrink-0">
              <StatusIcon status={m.status} />
            </span>
            <span className="font-medium text-gray-700 dark:text-gray-300 min-w-[60px]">{m.memberName}</span>
            <span className="text-gray-400 truncate">
              {m.status === 'thinking' && '思考中...'}
              {m.status === 'using_tool' && `使用工具: ${m.toolName || '...'}`}
              {m.status === 'done' && '已完成'}
              {m.status === 'error' && '执行出错'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- main component ---------- */

export default function TaskDetailRow({ task, colSpan, getTeamName, getParentTask, allTasks, onCancel, onApprove, onReject, onRestart, onClose }: TaskDetailRowProps) {
  const showCancel = task.status === 'claimed' || task.status === 'assigned' || task.status === 'pending_review'
  const showRestart = task.status === 'completed' || task.status === 'failed' || task.status === 'pending_review'
  const showApproveReject = task.status === 'pending_review'
  const [rejectComment, setRejectComment] = useState('')

  const parentTask = useMemo(() => getParentTask(task.parentId), [task.parentId, getParentTask])

  // 从 allTasks 中查找当前任务的子任务
  const childTasks = useMemo(() => allTasks.filter(t => t.parentId === task.id), [allTasks, task.id])

  return (
    <tr className="bg-blue-50/40 dark:bg-blue-900/10 border-b border-gray-200 dark:border-gray-700">
      <td colSpan={colSpan} className="px-6 pt-4">
        <div className="space-y-4">
          {/* Restart badge */}
          <RestartBadge task={task} />

          {/* ── Review comment banner ── */}
          {task.reviewComment && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/50 text-xs flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <div>
                <span className="font-semibold text-amber-600 dark:text-amber-400">审核意见</span>
                <p className="text-gray-600 dark:text-gray-400 mt-0.5 whitespace-pre-wrap">{task.reviewComment}</p>
              </div>
            </div>
          )}

          {/* ── Parent task reference ── */}
          {parentTask && (
            <div>
              <SectionHeader icon={IconDescription} label="父任务" />
              <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg border border-gray-200 dark:border-gray-700/50 p-3.5 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 7h10v10" />
                  <path d="M7 17L17 7" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">{parentTask.title}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full border ${STATUS_COLOR[parentTask.status] || ''}`}>
                  {STATUS_LABEL[parentTask.status] || parentTask.status}
                </span>
              </div>
            </div>
          )}

          {/* ── Subtask list ── */}
          {childTasks.length > 0 && (
            <div>
              <SectionHeader icon={IconDescription} label={`子任务（${childTasks.length}）`} />
              <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg border border-gray-200 dark:border-gray-700/50 p-3.5 space-y-1.5">
                {childTasks.map(child => (
                  <div key={child.id} className="flex items-center gap-2 text-sm">
                    <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300">{child.title}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full border ${STATUS_COLOR[child.status] || ''}`}>
                      {STATUS_LABEL[child.status] || child.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Description ── */}
          <div>
            <SectionHeader icon={IconDescription} label="描述" />
            <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg border border-gray-200 dark:border-gray-700/50 p-3.5">
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {task.description || <span className="text-gray-400 italic">暂无描述</span>}
              </div>
            </div>
          </div>

          {/* ── Result ── */}
          {(task.status === 'pending_review' || task.status === 'completed') && task.result && (
            <div>
              <SectionHeader icon={IconResult} label="执行结果" color="text-emerald-600 dark:text-emerald-400" />
              <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50 p-3.5 resize-y overflow-auto min-h-[100px]">
                <MarkdownPreview content={task.result} className="text-sm" />
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {task.status === 'failed' && task.error && (
            <div>
              <SectionHeader icon={IconError} label="错误信息" color="text-red-500" />
              <div className="bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200/50 dark:border-red-800/50 p-3.5 resize-y overflow-auto min-h-[100px]">
                <MarkdownPreview content={task.error} className="text-sm text-red-600 dark:text-red-400" />
              </div>
            </div>
          )}

          {/* ── Team execution progress (compact) ── */}
          {task.status === 'claimed' && (task.executionId || task.id) && (
            <TeamExecutionProgress executionId={`task:${task.id}`} teamId={task.claimedBy} />
          )}

          {/* ── Bottom row: metadata cards + actions ── */}
          <div className="flex flex-col gap-3">
            {/* Meta cards: responsive grid, auto-fit columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <TimelineCard task={task} />
              <TeamCard task={task} getTeamName={getTeamName} />
              <ExecutionIdCard task={task} />
            </div>

            {/* Action buttons */}
            {(showCancel || showRestart || showApproveReject) && (
              <div className="flex flex-wrap gap-2">
                {showApproveReject && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onApprove(task.id) }}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>验收通过</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onReject(task.id, rejectComment); setRejectComment('') }}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 border border-orange-200 dark:border-orange-800 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18.36 6.64a9 9 0 11-12.73 0" />
                        <line x1="12" y1="2" x2="12" y2="12" />
                      </svg>
                      <span>驳回</span>
                    </button>
                  </>
                )}
                {showApproveReject && (
                  <div className="w-full" onClick={e => e.stopPropagation()}>
                    <textarea
                      value={rejectComment}
                      onChange={e => setRejectComment(e.target.value)}
                      placeholder="修改意见（可选）— 团队重新执行时将看到此反馈"
                      rows={2}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
                    />
                  </div>
                )}
                {showCancel && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onCancel(task.id) }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    <span>终止任务</span>
                  </button>
                )}
                {showRestart && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRestart(task.id) }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 border border-orange-200 dark:border-orange-800 transition-colors"
                  >
                    <span>↻</span>
                    <span>重启任务</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Collapse - full-width sticky bar */}
          <div className="-mx-6 -mb-4 mt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onClose() }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-gray-800/40 transition-colors"
              title="收起"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 15l7-7 7 7" />
              </svg>
              收起
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}
