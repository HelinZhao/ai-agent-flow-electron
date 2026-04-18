import React, { useState } from 'react'
import { WorkflowExecutionProgress, NodeExecutionResult } from '@renderer/types'
import { memo } from 'react'
import { getNodeDefaultLabel } from './nodes'

interface ExecutionProgressPanelProps {
  progress: WorkflowExecutionProgress | null
  isRunning: boolean
  onStop?: () => void
  onPause?: () => void
  onResume?: () => void
  className?: string
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
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          暂无执行数据
        </div>
      </div>
    )
  }

  const { metrics, nodeResults, logs, currentNodeId, currentNodeLabel, executionPath } = progress

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {progress.workflowName} - 执行进度
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              执行ID: {progress.executionId}
            </p>
          </div>

          {/* 控制按钮 */}
          <div className="flex space-x-2">
            {isRunning && (
              <>
                {metrics?.status === 'paused' && (
                  <button
                    onClick={onResume}
                    className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
                  >
                    恢复
                  </button>
                )
                }
                {metrics?.status === "running" &&
                  <button
                    onClick={onPause}
                    className="px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
                  >
                    暂停
                  </button>
                }
                <button
                  onClick={onStop}
                  className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
                >
                  停止
                </button>
              </>
            )}
          </div>
        </div>

        {/* 进度条 */}
        <div className="mt-3">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
            <span>整体进度</span>
            <span>{metrics?.progress || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${metrics?.progress || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 text-sm font-medium ${activeTab === 'overview'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            概览
          </button>
          <button
            onClick={() => setActiveTab('nodes')}
            className={`py-2 px-1 border-b-2 text-sm font-medium ${activeTab === 'nodes'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            节点详情
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-1 border-b-2 text-sm font-medium ${activeTab === 'logs'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            执行日志
          </button>
        </nav>
      </div>

      {/* 内容区域 */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* 执行指标 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{metrics?.totalNodes || 0}</div>
                <div className="text-sm text-gray-500">总节点数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{metrics?.completedNodes || 0}</div>
                <div className="text-sm text-gray-500">已完成</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{metrics?.failedNodes || 0}</div>
                <div className="text-sm text-gray-500">失败</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {metrics?.duration ? `${Math.round(metrics.duration / 1000)}s` : '-'}
                </div>
                <div className="text-sm text-gray-500">耗时</div>
              </div>
            </div>

            {/* 当前执行节点 */}
            {currentNodeId && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-1">当前执行节点</h4>
                <p className="text-blue-700 dark:text-blue-200">{currentNodeLabel || currentNodeId}</p>
              </div>
            )}

            {/* 执行路径 */}
            {executionPath.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">执行路径</h4>
                <div className="flex flex-wrap gap-2">
                  {executionPath.map((nodeId) => {
                    const isCurrentNode = nodeId === currentNodeId
                    const nodeResult = nodeResults.find(n => n.nodeId === nodeId)

                    return (
                      <div
                        key={nodeId}
                        className={`px-2 py-1 rounded text-xs font-medium ${isCurrentNode
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : nodeResult?.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : nodeResult?.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}
                      >
                        {nodeResult?.nodeLabel || nodeId}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 预估剩余时间 */}
            {(metrics as any)?.estimatedTimeRemaining && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                预估剩余时间: {Math.round((metrics as any).estimatedTimeRemaining / 1000)}秒
              </div>
            )}
          </div>
        )}

        {activeTab === 'nodes' && (
          <div className="space-y-2">
            {nodeResults.map((node) => (
              <NodeResultItem key={node.nodeId} node={node} />
            ))}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-1">
            {logs.map((log, _index) => (
              <LogItem key={_index} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 节点结果项组件
const NodeResultItem: React.FC<{ node: NodeExecutionResult }> = ({ node }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      case 'failed': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      case 'running': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成'
      case 'failed': return '失败'
      case 'running': return '运行中'
      default: return '等待中'
    }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-gray-900 dark:text-white">
          {node.nodeLabel}
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(node.status)}`}>
          {getStatusText(node.status)}
        </span>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
        <div>节点ID: {node.nodeId}</div>
        <div>类型: {getNodeDefaultLabel(node.metadata?.type)}</div>
        {node.duration ? <div>耗时: {Math.round(node.duration / 1000)}秒</div> : null}
        {node.error && (
          <div className="text-red-600 dark:text-red-400">错误: {node.error}</div>
        )}
      </div>

      {node.output && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
          <div className="font-medium mb-1 text-gray-700 dark:text-gray-300">输出:</div>
          <pre className="whitespace-pre-wrap break-words text-gray-600 dark:text-gray-400">
            {typeof node.output === 'string' ? node.output : JSON.stringify(node.output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// 日志项组件
const LogItem: React.FC<{ log: any }> = ({ log }) => {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600'
      case 'warn': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="flex items-start space-x-2 text-sm py-1">
      <span className="text-gray-400 text-xs whitespace-nowrap">
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
      <span className={`font-medium ${getLevelColor(log.level)}`}>
        {log.level.toUpperCase()}
      </span>
      <span className="text-gray-900 dark:text-white flex-1">
        {log.message}
      </span>
      {log.nodeId && (
        <span className="text-gray-500 text-xs">
          [{log.nodeId}]
        </span>
      )}
    </div>
  )
}

export default memo(ExecutionProgressPanel)