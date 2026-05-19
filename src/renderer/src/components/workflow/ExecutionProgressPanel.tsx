import { useState } from 'react'
import { WorkflowExecutionProgress, NodeExecutionResult } from '@renderer/types'
import { memo } from 'react'

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
  const [activeTab, setActiveTab] = useState<'overview' | 'nodes' | 'logs'>('overview')

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

      {/* 标签页 */}
      <div className="shrink-0 border-b border-gray-200/50 dark:border-gray-700/50">
        <nav className="flex px-4">
          {(['overview', 'nodes', 'logs'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`py-2 px-3 border-b-2 text-xs font-medium transition-colors ${
                activeTab === t
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {t === 'overview' ? '概览' : t === 'nodes' ? '节点' : '日志'}
            </button>
          ))}
        </nav>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* 指标卡片 */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '总节点', value: metrics?.totalNodes || 0, bg: 'bg-gray-50 dark:bg-gray-800/50', icon: null },
                { label: '已完成', value: metrics?.completedNodes || 0, bg: 'bg-green-50 dark:bg-green-900/20', dot: 'bg-green-500' },
                { label: '失败', value: metrics?.failedNodes || 0, bg: 'bg-red-50 dark:bg-red-900/20', dot: 'bg-red-500' },
                { label: '耗时', value: metrics?.duration ? `${Math.round(metrics.duration / 1000)}s` : '-', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>, color: 'text-blue-500' }
              ].map(item => (
                <div key={item.label} className={`${item.bg} rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {item.icon ? (
                      <svg className={`w-3.5 h-3.5 ${item.color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{item.icon}</svg>
                    ) : item.dot ? (
                      <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                    ) : null}
                    <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{item.value}</div>
                </div>
              ))}
            </div>

            {/* 当前执行节点 */}
            {currentNodeId && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-medium text-blue-800 dark:text-blue-300">当前执行节点</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-200 ml-4">{currentNodeLabel || currentNodeId}</p>
              </div>
            )}

            {/* 执行路径 */}
            {executionPath.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">执行路径</h4>
                <div className="flex flex-wrap gap-1.5">
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

        {activeTab === 'nodes' && (
          <div className="space-y-2">
            {nodeResults.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">暂无节点数据</p>
            )}
            {nodeResults.map(node => <NodeResultItem key={node.nodeId} node={node} />)}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-0.5">
            {logs.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">暂无日志</p>
            )}
            {logs.map((log, i) => <LogItem key={i} log={log} />)}
          </div>
        )}
      </div>
    </div>
  )
}

// 节点结果项
const NodeResultItem: React.FC<{ node: NodeExecutionResult }> = ({ node }) => {
  const statusStyle: Record<string, { color: string; text: string }> = {
    completed: { color: 'text-green-600 bg-green-50 dark:bg-green-900/20', text: '已完成' },
    failed: { color: 'text-red-600 bg-red-50 dark:bg-red-900/20', text: '失败' },
    running: { color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', text: '运行中' },
    pending: { color: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20', text: '等待中' }
  }
  const s = statusStyle[node.status] || statusStyle.pending

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3 hover:border-blue-300 dark:hover:border-blue-600/50 transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            node.status === 'completed' ? 'bg-green-500' :
            node.status === 'failed' ? 'bg-red-500' :
            node.status === 'running' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
          }`} />
          <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{node.metadata?.label || '--'}</span>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.color}`}>{s.text}</span>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 ml-4 space-y-0.5">
        <div>节点ID: {node.nodeId || '--'}</div>
        {node.duration ? <div>耗时: {Math.round(node.duration / 1000)}秒</div> : null}
        {node.error && <div className="text-red-600 dark:text-red-400 mt-1">错误: {node.error}</div>}
      </div>
      {node.output && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-100 dark:border-gray-700/30 text-xs">
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
  const levelColor: Record<string, string> = { error: 'text-red-600', warn: 'text-amber-600', info: 'text-gray-600 dark:text-gray-400' }
  return (
    <div className="text-xs py-1.5 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <div className="flex items-start gap-2">
        <span className={`font-medium shrink-0 ${levelColor[log.level] || ''}`}>{log.level.toUpperCase()}</span>
        <span className="text-gray-900 dark:text-white flex-1">{log.message}</span>
        {log.nodeId && <span className="text-gray-500 dark:text-gray-400 shrink-0 font-mono">[{log.nodeId}]</span>}
      </div>
      <div className="flex justify-end mt-0.5">
        <span className="text-gray-400 dark:text-gray-500 font-mono">
          {new Date(log.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
}

export default memo(ExecutionProgressPanel)