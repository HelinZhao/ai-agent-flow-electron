import { useState, useEffect, useRef } from 'react'
import {
  Workflow,
  WorkflowExecutionProgress,
  NodeExecutionResult,
  WorkflowExecutionMetrics
} from '@renderer/types'
import { workflowExecutionApi } from '@renderer/lib/api'
import { useMemoizedFn } from 'ahooks'
import { POLL_INTERVAL, HISTORY_DEFAULT_LIMIT } from '@renderer/config'

interface UseWorkflowExecutionProps {
  onProgress?: (progress: WorkflowExecutionProgress) => void
  onNodeComplete?: (nodeResult: NodeExecutionResult) => void
  onComplete?: (finalProgress: WorkflowExecutionProgress) => void
  onError?: (error: string) => void
}

export function useWorkflowExecution({
  onProgress,
  onNodeComplete,
  onComplete,
  onError
}: UseWorkflowExecutionProps = {}) {
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [progress, setProgress] = useState<WorkflowExecutionProgress | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<WorkflowExecutionMetrics | null>(null)
  const [nodeResults, setNodeResults] = useState<NodeExecutionResult[]>([])

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 清理函数
  const cleanup = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }

  // 获取执行进度
  const fetchProgress = async (execId: string) => {
    try {
      abortControllerRef.current = new AbortController()
      const progressData = await workflowExecutionApi.getProgress(execId)

      setProgress(progressData)
      setMetrics(progressData.metrics)
      setNodeResults(progressData.nodeResults)

      // 触发回调
      onProgress?.(progressData)

      // 检查是否有新完成的节点
      const latestNode = progressData.nodeResults.find(
        (node) =>
          node.status === 'completed' &&
          !nodeResults.find((n) => n.nodeId === node.nodeId && n.status === 'completed')
      )
      if (latestNode) {
        onNodeComplete?.(latestNode)
      }

      // 检查执行是否完成
      if (progressData.metrics.status === 'completed' || progressData.metrics.status === 'failed') {
        setIsRunning(false)
        cleanup()
        onComplete?.(progressData)
        setExecutionId(null)
      } else if (progressData.metrics.status === 'paused') {
        cleanup()
      }
      setError(null)
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        const errorMessage = err instanceof Error ? err.message : '获取执行进度失败'
        setError(errorMessage)
        onError?.(errorMessage)
        setIsRunning(false)
        cleanup()
        setExecutionId(null)
      }
    }
  }

  // 开始轮询进度
  const startPolling = useMemoizedFn((execId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    // 立即获取一次进度
    fetchProgress(execId)

    // 设置定时轮询（每1秒更新一次）
    pollIntervalRef.current = setInterval(() => {
      if (execId) {
        fetchProgress(execId)
      }
    }, POLL_INTERVAL)
  })

  // 执行工作流
  const executeWorkflow = useMemoizedFn(
    async (workflow: Workflow, input: string, agentId?: string, threadId?: string) => {
      try {
        setIsRunning(true)
        setError(null)
        setProgress(null)
        setNodeResults([])

        const response = await workflowExecutionApi.execute(workflow, input, agentId, threadId)
        setExecutionId(response.executionId)

        // 开始轮询进度
        startPolling(response.executionId)

        return response.executionId
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '工作流执行失败'
        setError(errorMessage)
        setIsRunning(false)
        onError?.(errorMessage)
        throw err
      }
    }
  )

  // AI Agent 对话（带监控）
  const executeAgentChat = async (agentId: string, input: string, threadId?: string) => {
    try {
      setIsRunning(true)
      setError(null)
      setProgress(null)
      setNodeResults([])

      const response = await workflowExecutionApi.agentChatMonitor(agentId, input, threadId)
      setExecutionId(response.executionId)

      // 开始轮询进度
      startPolling(response.executionId)

      return response.executionId
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Agent对话执行失败'
      setError(errorMessage)
      setIsRunning(false)
      onError?.(errorMessage)
      throw err
    }
  }

  // 停止执行
  const stopExecution = async () => {
    if (!executionId) return

    try {
      await workflowExecutionApi.stopExecution(executionId)
      setIsRunning(false)
      cleanup()
      setExecutionId(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '停止执行失败'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }

  // 暂停执行
  const pauseExecution = async () => {
    if (!executionId) return

    try {
      await workflowExecutionApi.pauseExecution(executionId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '暂停执行失败'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }

  // 恢复执行
  const resumeExecution = async () => {
    if (!executionId) return

    try {
      await workflowExecutionApi.resumeExecution(executionId)
      startPolling(executionId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '恢复执行失败'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }

  // 清理副作用
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  // 当executionId改变时，如果之前有轮询，重新开始
  useEffect(() => {
    if (executionId && isRunning) {
      startPolling(executionId)
    }
  }, [executionId, isRunning, startPolling])

  return {
    // 状态
    executionId,
    progress,
    isRunning,
    error,
    metrics,
    nodeResults,

    // 方法
    executeWorkflow,
    executeAgentChat,
    stopExecution,
    pauseExecution,
    resumeExecution,

    // 工具方法
    getNodeById: (nodeId: string) => nodeResults.find((node) => node.nodeId === nodeId),
    getCompletedNodes: () => nodeResults.filter((node) => node.status === 'completed'),
    getFailedNodes: () => nodeResults.filter((node) => node.status === 'failed'),
    getCurrentNode: () =>
      progress?.currentNodeId
        ? nodeResults.find((node) => node.nodeId === progress.currentNodeId)
        : null,
    getProgressPercentage: () => progress?.metrics?.progress || 0
  }
}

// 用于获取执行历史的Hook
export function useExecutionHistory(workflowId?: string) {
  const [history, setHistory] = useState<WorkflowExecutionProgress[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = async (limit = HISTORY_DEFAULT_LIMIT) => {
    try {
      setIsLoading(true)
      setError(null)
      const historyData = await workflowExecutionApi.getExecutionHistory(workflowId, limit)
      setHistory(historyData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取执行历史失败'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    history,
    isLoading,
    error,
    fetchHistory
  }
}
