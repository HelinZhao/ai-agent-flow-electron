import type { Task } from '@renderer/types'
import MarkdownPreview from '@renderer/components/MarkdownPreview'
import SectionHeader from './SectionHeader'

interface TaskDetailRowProps {
  task: Task
  colSpan: number
  getTeamName: (id?: string) => string
  onCancel: (id: string) => void
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

/* ---------- main component ---------- */

export default function TaskDetailRow({ task, colSpan, getTeamName, onCancel, onRestart, onClose }: TaskDetailRowProps) {
  const showCancel = task.status === 'claimed' || task.status === 'assigned'
  const showRestart = task.status === 'completed' || task.status === 'failed'

  return (
    <tr className="bg-blue-50/40 dark:bg-blue-900/10 border-b border-gray-200 dark:border-gray-700">
      <td colSpan={colSpan} className="px-6 py-4">
        <div className="space-y-4">
          {/* Restart badge */}
          <RestartBadge task={task} />

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
          {task.status === 'completed' && task.result && (
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

          {/* ── Bottom row: metadata cards + actions ── */}
          <div className="flex flex-col gap-3">
            {/* Meta cards: responsive grid, auto-fit columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <TimelineCard task={task} />
              <TeamCard task={task} getTeamName={getTeamName} />
              <ExecutionIdCard task={task} />
            </div>

            {/* Action buttons */}
            {(showCancel || showRestart) && (
              <div className="flex flex-wrap gap-2">
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

          {/* Collapse button */}
          <div className="flex justify-center pt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onClose() }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
