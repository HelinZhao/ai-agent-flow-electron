import { memo, useEffect, useState } from 'react'
import ExecutionResultTabs from './ExecutionResultTabs'
import { WorkflowExecutionProgress, TokenUsageSummary } from '@renderer/types'
import { tokenUsageApi } from '@renderer/lib/api'
import { useDebounceEffect } from 'ahooks'

interface ExecutionProgressPanelProps {
  progress: WorkflowExecutionProgress | null
  isRunning: boolean
  onStop?: () => void
  onPause?: () => void
  onResume?: () => void
  className?: string
}

const STATUS_BADGE: Record<string, { bg: string; text: string; dot: string; bar: string }> = {
  running: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500', bar: 'bg-gradient-to-r from-blue-500 to-blue-400' },
  paused: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', bar: 'bg-gradient-to-r from-amber-500 to-amber-400' },
  completed: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500', bar: 'bg-gradient-to-r from-green-500 to-emerald-400' },
  failed: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', bar: 'bg-gradient-to-r from-red-500 to-red-400' }
}

const STATUS_LABEL: Record<string, string> = {
  running: '运行中', paused: '已暂停', completed: '已完成', failed: '已失败'
}

const ExecutionProgressPanel: React.FC<ExecutionProgressPanelProps> = ({
  progress,
  isRunning,
  onStop,
  onPause,
  onResume,
  className = ''
}) => {
  if (!progress) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
          <svg className="w-10 h-10 mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" />
          </svg>
          <p className="text-sm font-medium">暂无执行数据</p>
          <p className="text-xs mt-1">运行工作流后将在右下角显示进度</p>
        </div>
      </div>
    )
  }

  const { metrics, nodeResults, logs, currentNodeId, currentNodeLabel, executionPath } = progress
  const badge = STATUS_BADGE[metrics?.status] || STATUS_BADGE.completed

  // 执行路径或状态变化时查一次 token 用量
  const [tokenUsage, setTokenUsage] = useState<TokenUsageSummary | null>(null)

  useDebounceEffect(() => {
    if (!progress) return
    let cancelled = false
    tokenUsageApi.getByExecution(progress.executionId).then(({ summary }) => {
      if (!cancelled) setTokenUsage(summary)
    }).catch(() => { })
    return () => { cancelled = true }
  }, [progress?.executionId, progress?.executionPath?.length], { wait: 200 })

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm flex flex-col ${className}`} style={{ height: 'calc(100vh - 200px)' }}>
      {/* 头部 */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{progress.workflowName}</h3>
              {isRunning && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">ID: {progress.executionId}</p>
          </div>

          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 mr-4 rounded text-xs font-medium shrink-0 ${badge.bg} ${badge.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {STATUS_LABEL[metrics?.status] || metrics?.status}
          </span>
        </div>

        {/* 进度条 */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>{metrics?.completedNodes}/{metrics?.totalNodes} 节点</span>
            <span className="font-medium">{metrics?.progress || 0}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${badge.bar}`}
              style={{ width: `${Math.max(metrics?.progress || 0, metrics?.status === 'running' ? 2 : 0)}%` }}
            />
          </div>
        </div>

        {/* 操作按钮 */}
        {isRunning && (
          <div className="flex items-center gap-2 mt-3">
            {metrics?.status === 'paused' && (
              <button onClick={onResume}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                恢复
              </button>
            )}
            {metrics?.status === 'running' && (
              <button onClick={onPause}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                暂停
              </button>
            )}
            <button onClick={onStop}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
              停止
            </button>
          </div>
        )}
      </div>

      <ExecutionResultTabs
        metrics={metrics}
        nodeResults={nodeResults}
        logs={logs}
        currentNodeId={currentNodeId}
        currentNodeLabel={currentNodeLabel}
        executionPath={executionPath}
        compact
        tokenUsage={tokenUsage || undefined}
      />
    </div>
  )
}

export default memo(ExecutionProgressPanel)