import { useState } from 'react'
import { NodeExecutionResult } from '@renderer/types'

interface ExecutionResultTabsProps {
  metrics: {
    totalNodes: number
    completedNodes: number
    failedNodes: number
    progress?: number
    duration?: number
    status?: string
  }
  nodeResults: NodeExecutionResult[]
  logs: any[]
  currentNodeId?: string
  currentNodeLabel?: string
  executionPath: string[]
  compact?: boolean
}

// 节点结果项（可展开）
export const NodeResultItem: React.FC<{ node: NodeExecutionResult }> = ({ node }) => {
  const [expanded, setExpanded] = useState(false)
  const statusStyle: Record<string, { color: string; text: string }> = {
    completed: { color: 'text-green-600 bg-green-50 dark:bg-green-900/20', text: '已完成' },
    failed: { color: 'text-red-600 bg-red-50 dark:bg-red-900/20', text: '失败' },
    running: { color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', text: '运行中' },
    pending: { color: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20', text: '等待中' }
  }
  const style = statusStyle[node.status] || statusStyle.pending
  const display = node.output
    ? typeof node.output === 'string'
      ? node.output
      : JSON.stringify(node.output, null, 2)
    : undefined

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
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.color}`}>
          {style.text}
        </span>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 ml-4">
        <div>节点ID: {node.nodeId || '--'}</div>
        {node.duration ? <div>耗时: {Math.round(node.duration / 1000)}秒</div> : null}
        {node.error && <div className="text-red-600 dark:text-red-400 mt-1">错误: {node.error}</div>}
      </div>
      {display && (
        <div className="mt-2 p-2.5 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-100 dark:border-gray-700/30 text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium text-gray-600 dark:text-gray-400">输出:</span>
            {display.length > 200 && (
              <button onClick={() => setExpanded(!expanded)}
                className="text-blue-500 hover:text-blue-700 text-xs font-medium">
                {expanded ? '收起' : '展开'}
              </button>
            )}
          </div>
          <pre className="whitespace-pre-wrap break-words text-gray-600 dark:text-gray-400 max-h-60 overflow-auto">
            {expanded ? display : display.length > 200 ? display.substring(0, 200) + '...' : display}
          </pre>
        </div>
      )}
    </div>
  )
}

// 日志项
export const LogItem: React.FC<{ log: any }> = ({ log }) => {
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

const ExecutionResultTabs: React.FC<ExecutionResultTabsProps> = ({
  metrics, nodeResults, logs, currentNodeId, currentNodeLabel, executionPath, compact
}) => {
  const [tab, setTab] = useState<'overview' | 'nodes' | 'logs'>('overview')

  return (
    <>
      {/* 标签页 */}
      <div className="shrink-0 border-b border-gray-200 dark:border-gray-700">
        <nav className={`flex gap-${compact ? '0' : '8'} ${compact ? 'px-4' : 'px-5'}`}>
          {(['overview', 'nodes', 'logs'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`${compact ? 'py-2 px-3 text-xs' : 'py-2.5 text-sm'} border-b-2 font-medium transition-colors ${
                tab === t
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {t === 'overview' ? '概览' : t === 'nodes' ? (compact ? '节点' : '节点详情') : compact ? '日志' : '执行日志'}
            </button>
          ))}
        </nav>
      </div>

      {/* 内容 */}
      <div className={compact ? 'flex-1 overflow-y-auto p-4' : 'flex-1 overflow-auto p-5'}>
        {tab === 'overview' && (
          <div className={`space-y-${compact ? '4' : '5'}`}>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">总节点</div>
                <div className={`font-bold text-gray-900 dark:text-white ${compact ? 'text-lg' : 'text-xl'}`}>{metrics.totalNodes}</div>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">已完成</span>
                </div>
                <div className={`font-bold text-gray-900 dark:text-white ${compact ? 'text-lg' : 'text-xl'}`}>{metrics.completedNodes}</div>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">失败</span>
                </div>
                <div className={`font-bold text-gray-900 dark:text-white ${compact ? 'text-lg' : 'text-xl'}`}>{metrics.failedNodes}</div>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <svg className="w-3 h-3 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">耗时</span>
                </div>
                <div className={`font-bold text-gray-900 dark:text-white ${compact ? 'text-lg' : 'text-xl'}`}>
                  {metrics.duration ? `${Math.round(metrics.duration / 1000)}s` : '-'}
                </div>
              </div>
            </div>
            {currentNodeId && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-medium text-blue-800 dark:text-blue-300">当前执行节点</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-200 ml-4">{currentNodeLabel || currentNodeId}</p>
              </div>
            )}
            {executionPath.length > 0 && (
              <div>
                <h4 className={`font-medium text-gray-900 dark:text-white mb-2 ${compact ? 'text-xs' : ''}`}>执行路径</h4>
                <div className="flex flex-wrap gap-1.5">
                  {executionPath.map((nodeId, idx) => {
                    const nr = nodeResults.find(n => n.nodeId === nodeId)
                    return (
                      <span key={`${nodeId}-${idx}`}
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
            {nodeResults.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">暂无节点数据</p>}
            {nodeResults.map(node => <NodeResultItem key={node.nodeId} node={node} />)}
          </div>
        )}
        {tab === 'logs' && (
          <div className="space-y-0.5">
            {logs.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">暂无日志</p>}
            {logs.map((log, i) => <LogItem key={i} log={log} />)}
          </div>
        )}
      </div>
    </>
  )
}

export default ExecutionResultTabs