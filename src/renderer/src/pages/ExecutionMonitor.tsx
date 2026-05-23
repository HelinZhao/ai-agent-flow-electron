import { memo, useEffect, useRef, useState } from 'react'
import { ExecutionSummary, WorkflowExecutionProgress, NodeExecutionResult } from '@renderer/types'
import { workflowExecutionApi } from '@renderer/lib/api'
import { useWorkflowStore } from '@renderer/store/workflowStore'
import Pagination from '@renderer/components/ui/Pagination'

const PAGE_SIZE = 20

type StatusFilter = 'all' | 'running' | 'paused' | 'completed' | 'failed'

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'running', label: '运行中' },
  { key: 'paused', label: '已暂停' },
  { key: 'completed', label: '已完成' },
  { key: 'failed', label: '已失败' }
]

const STATUS_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  running: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  paused: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  completed: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  failed: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' }
}

const STATUS_LABEL: Record<string, string> = {
  running: '运行中',
  paused: '已暂停',
  completed: '已完成',
  failed: '已失败'
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '不到 1 秒'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes} 分 ${secs} 秒`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const ExecutionMonitor = () => {
  const [executions, setExecutions] = useState<ExecutionSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval>>(null)
  const intervalRef = useRef(2000)
  const currentPage = useWorkflowStore(s => s.currentPage)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const statusParam = filter === 'all' ? undefined : filter

  useEffect(() => {
    // 不在监控页时停止轮询
    if (currentPage !== '/monitor') return

    let cancelled = false

    const poll = async () => {
      try {
        const result = await workflowExecutionApi.listExecutions(statusParam, page, PAGE_SIZE)
        if (cancelled) return
        setExecutions(result.data)
        setTotal(result.total)
        const hasActive = result.data.some(e => e.status === 'running' || e.status === 'paused')
        intervalRef.current = hasActive ? 2000 : 5000
      } catch {
        // ignore
      } finally {
        if (!cancelled) {
          setIsLoading(false)
          pollingRef.current = setTimeout(poll, intervalRef.current)
        }
      }
    }

    poll()

    return () => {
      cancelled = true
      if (pollingRef.current) clearTimeout(pollingRef.current)
    }
  }, [statusParam, page, currentPage])

  const handleStop = async (id: string) => {
    try {
      await workflowExecutionApi.stopExecution(id)
    } catch { /* ignore */ }
  }

  const handlePause = async (id: string) => {
    try {
      await workflowExecutionApi.pauseExecution(id)
    } catch { /* ignore */ }
  }

  const handleResume = async (id: string) => {
    try {
      await workflowExecutionApi.resumeExecution(id)
    } catch { /* ignore */ }
  }

  // 切换过滤时回到第一页
  const handleFilterChange = (f: StatusFilter) => {
    setFilter(f)
    setPage(1)
  }

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          执行监控
        </h1>
      </div>

      {/* 过滤标签 */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleFilterChange(tab.key)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              filter === tab.key
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          {isLoading ? '加载中...' : `共 ${total} 条`}
        </span>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-3">
        {isLoading && executions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 mb-4">
              <svg className="w-8 h-8 text-blue-500 dark:text-blue-400 animate-spin opacity-60" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">加载中...</p>
          </div>
        )}

        {!isLoading && executions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 mb-4">
              <svg className="w-8 h-8 text-blue-500 dark:text-blue-400 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">暂无执行记录</p>
          </div>
        )}

        {executions.map((exec: ExecutionSummary) => {
          const badge = STATUS_BADGE[exec.status] || STATUS_BADGE.completed
          const isExpanded = expandedId === exec.executionId

          return (
            <div
              key={exec.executionId}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* 主行 */}
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  {/* 左侧信息 */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : exec.executionId)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {exec.workflowName}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {STATUS_LABEL[exec.status] || exec.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatTime(exec.startTime)}</span>
                      <span>·</span>
                      <span>{formatDuration(exec.duration || 0)}</span>
                      {exec.currentNodeLabel && (
                        <>
                          <span>·</span>
                          <span className="text-blue-500 dark:text-blue-400">当前: {exec.currentNodeLabel}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 右侧操作 */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setDetailId(exec.executionId)}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors"
                    >
                      详情
                    </button>
                    {exec.status === 'running' && (
                      <>
                        <button
                          onClick={() => handlePause(exec.executionId)}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                        >
                          暂停
                        </button>
                        <button
                          onClick={() => handleStop(exec.executionId)}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                          停止
                        </button>
                      </>
                    )}
                    {exec.status === 'paused' && (
                      <>
                        <button
                          onClick={() => handleResume(exec.executionId)}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        >
                          恢复
                        </button>
                        <button
                          onClick={() => handleStop(exec.executionId)}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                          停止
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : exec.executionId)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      >
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>{exec.completedNodes}/{exec.totalNodes} 节点</span>
                    <span className="font-medium">{exec.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        exec.status === 'failed'
                          ? 'bg-gradient-to-r from-red-500 to-red-400'
                          : exec.status === 'completed'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                            : 'bg-gradient-to-r from-blue-500 to-blue-400'
                      }`}
                      style={{ width: `${Math.max(exec.progress, exec.status === 'running' ? 2 : 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 展开详情 */}
              {isExpanded && (
                <div className="px-5 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        </div>
                        <div className="flex flex-col justify-between h-10">
                          <div className="text-xs leading-none text-gray-500 dark:text-gray-400">总节点</div>
                          <div className="text-lg font-bold leading-none text-gray-900 dark:text-white">{exec.totalNodes}</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div className="flex flex-col justify-between h-10">
                          <div className="text-xs leading-none text-gray-500 dark:text-gray-400">已完成</div>
                          <div className="text-lg font-bold leading-none text-gray-900 dark:text-white">{exec.completedNodes}</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6" /></svg>
                        </div>
                        <div className="flex flex-col justify-between h-10">
                          <div className="text-xs leading-none text-gray-500 dark:text-gray-400">失败</div>
                          <div className="text-lg font-bold leading-none text-gray-900 dark:text-white">{exec.failedNodes}</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                        </div>
                        <div className="flex flex-col justify-between h-10">
                          <div className="text-xs leading-none text-gray-500 dark:text-gray-400">耗时</div>
                          <div className="text-lg font-bold leading-none text-gray-900 dark:text-white">{formatDuration(exec.duration || 0)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    执行ID: {exec.executionId}
                    {exec.agentId && <> · Agent: {exec.agentId}</>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      {/* 详情模态框 */}
      {detailId && (
        <DetailModal
          executionId={detailId}
          onClose={() => setDetailId(null)}
          onStop={handleStop}
          onPause={handlePause}
          onResume={handleResume}
        />
      )}
    </div>
  )
}

// 节点结果项
const NodeResultItem: React.FC<{ node: NodeExecutionResult }> = ({ node }) => {
  const statusColor = (() => {
    switch (node.status) {
      case 'completed': return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      case 'failed': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      case 'running': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
    }
  })()
  const statusText: Record<string, string> = { completed: '已完成', failed: '失败', running: '运行中', pending: '等待中' }
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            node.status === 'completed' ? 'bg-green-500' :
            node.status === 'failed' ? 'bg-red-500' :
            node.status === 'running' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
          }`} />
          <span className="font-medium text-sm text-gray-900 dark:text-white">{node.metadata?.label || '--'}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
          {statusText[node.status] || node.status}
        </span>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 ml-4">
        <div>节点ID: {node.nodeId || '--'}</div>
        {node.duration ? <div>耗时: {Math.round(node.duration / 1000)}秒</div> : null}
        {node.error && <div className="text-red-600 dark:text-red-400 mt-1">错误: {node.error}</div>}
      </div>
      {node.output && (
        <div className="mt-2 p-2.5 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-100 dark:border-gray-700/30 text-xs">
          <div className="font-medium mb-1 text-gray-600 dark:text-gray-400">输出:</div>
          <pre className="whitespace-pre-wrap break-words text-gray-600 dark:text-gray-400">
            {typeof node.output === 'string' ? node.output : JSON.stringify(node.output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// 日志项
const LogItem: React.FC<{ log: any }> = ({ log }) => {
  const levelColor: Record<string, string> = { error: 'text-red-600', warn: 'text-yellow-600', info: 'text-gray-600' }
  return (
    <div className="text-sm py-1.5 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <div className="flex items-start gap-2">
        <span className={`font-medium shrink-0 text-xs ${levelColor[log.level] || ''}`}>
          {log.level.toUpperCase()}
        </span>
        <span className="text-gray-900 dark:text-white flex-1 text-xs">{log.message}</span>
        {log.nodeId && <span className="text-gray-500 text-xs shrink-0 font-mono">[{log.nodeId}]</span>}
      </div>
      <div className="flex justify-end mt-0.5">
        <span className="text-gray-400 text-xs font-mono">
          {new Date(log.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
}

// 详情模态框
interface DetailModalProps {
  executionId: string
  onClose: () => void
  onStop: (id: string) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
}

const DetailModal: React.FC<DetailModalProps> = ({ executionId, onClose, onStop, onPause, onResume }) => {
  const [progress, setProgress] = useState<WorkflowExecutionProgress | null>(null)
  const [tab, setTab] = useState<'overview' | 'nodes' | 'logs'>('overview')

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    const fetchProgress = async () => {
      try {
        const data = await workflowExecutionApi.getProgress(executionId)
        if (cancelled) return
        setProgress(data)
        // 执行完成或失败时停止轮询
        if (data.metrics.status === 'completed' || data.metrics.status === 'failed') {
          if (timer) clearInterval(timer)
          timer = null
        }
      } catch {
        if (!cancelled) setProgress(null)
      }
    }

    fetchProgress()
    timer = setInterval(fetchProgress, 2000)

    return () => { cancelled = true; if (timer) clearInterval(timer) }
  }, [executionId])

  if (!progress) {
    return (
      <>
        <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40" onClick={onClose} />
        <div className="fixed right-0 top-14 bottom-0 w-[600px] max-w-[90vw] bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-xl z-50 flex items-center justify-center border-l border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            加载中...
          </div>
        </div>
      </>
    )
  }

  const { metrics, nodeResults, logs, currentNodeId, currentNodeLabel, executionPath } = progress
  const isActive = metrics.status === 'running' || metrics.status === 'paused'
  const isRunning = metrics.status === 'running'

  return (
    <>
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-14 bottom-0 w-[600px] max-w-[90vw] bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-700">
        {/* 头部 */}
        <div className="shrink-0 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {progress.workflowName}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                执行ID: {progress.executionId}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isActive && (
                <>
                  {metrics.status === 'paused' && (
                    <button onClick={() => onResume(executionId)}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                      恢复
                    </button>
                  )}
                  {isRunning && (
                    <button onClick={() => onPause(executionId)}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                      暂停
                    </button>
                  )}
                  <button onClick={() => onStop(executionId)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                    停止
                  </button>
                </>
              )}
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          {/* 进度条 */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>整体进度</span>
              <span className="font-medium">{metrics.progress}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${
                metrics.status === 'failed'
                  ? 'bg-gradient-to-r from-red-500 to-red-400'
                  : metrics.status === 'completed'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                    : 'bg-gradient-to-r from-blue-500 to-blue-400'
              }`}
                style={{ width: `${Math.max(metrics.progress, isRunning ? 2 : 0)}%` }} />
            </div>
          </div>
        </div>

        {/* 标签页 */}
        <div className="shrink-0 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-8 px-5">
            {(['overview', 'nodes', 'logs'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`py-2.5 border-b-2 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                {t === 'overview' ? '概览' : t === 'nodes' ? '节点详情' : '执行日志'}
              </button>
            ))}
          </nav>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-5">
          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">总节点</div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics.totalNodes}</p>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">已完成</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics.completedNodes}</p>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">失败</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics.failedNodes}</p>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3">
                  <div className="flex items-center gap-1 mb-0.5">
                    <svg className="w-3 h-3 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">耗时</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {metrics.duration ? `${Math.round(metrics.duration / 1000)}s` : '-'}
                  </p>
                </div>
              </div>
              {currentNodeId && (
                <div className="bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm rounded-xl border border-blue-200/50 dark:border-blue-800/50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">当前执行节点</span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-200 ml-4">{currentNodeLabel || currentNodeId}</p>
                </div>
              )}
              {executionPath && executionPath.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">执行路径</h4>
                  <div className="flex flex-wrap gap-2">
                    {executionPath.map(nodeId => {
                      const nr = nodeResults.find(n => n.nodeId === nodeId)
                      return (
                        <span key={nodeId}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            nodeId === currentNodeId
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : nr?.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : nr?.status === 'failed'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                          {nr?.metadata?.label || nodeId}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === 'nodes' && (
            <div className="space-y-2">
              {nodeResults.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">暂无节点数据</p>}
              {nodeResults.map(node => <NodeResultItem key={node.nodeId} node={node} />)}
            </div>
          )}
          {tab === 'logs' && (
            <div className="space-y-1">
              {logs.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">暂无日志</p>}
              {logs.map((log, i) => <LogItem key={i} log={log} />)}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default memo(ExecutionMonitor)
