import type { BaseMessage } from '@langchain/core/messages'
import type { CompiledStateGraph } from '@langchain/langgraph'
import type { Workflow, LLMConfig } from '../../types'
import type { HITLRequest, HITLResponse, ChoiceRequest, ChoiceResponse } from '../hitl'
import type { AttachmentPayload } from '../shared'

/** 执行状态存储 */
export interface ExecutionState {
  executionId: string
  workflow: Workflow
  status: 'running' | 'paused' | 'completed' | 'failed'
  startTime: Date
  endTime?: Date
  currentNodeId?: string
  nodeResults: Map<string, any>
  progress: number
  logs: Array<{
    timestamp: Date
    level: 'info' | 'warn' | 'error'
    message: string
    nodeId?: string
  }>
  agentId?: string
  threadId?: string
  compiledGraph?: CompiledStateGraph<any, any>
  autoApprovedToolTypes: Set<string>
  pendingApproval: { resolve: (response: HITLResponse) => void; reject: (error: Error) => void; request: HITLRequest } | null
  pendingChoice: { resolve: (response: ChoiceResponse) => void; reject: (error: Error) => void; request: ChoiceRequest } | null
  attachments?: AttachmentPayload[]
  abortController?: AbortController
  params?: Record<string, any>
  variables?: Record<string, any>
}

/** 节点执行上下文，替代平铺参数传递给各 executor */
export interface ExecCtx {
  executionId: string
  node: any
  input: string
  llmConfig: LLMConfig
  conversationHistory?: BaseMessage[]
  attachments?: AttachmentPayload[]
  params?: Record<string, any>
  nodeResults?: Map<string, any>
  workflowEnvVars?: Record<string, string>
  variables: Record<string, any>
  node2Sources: Map<string, string[]>
  node2Targets: Map<string, string[]>
}

/** 节点执行器需要的依赖（由主类实现），避免循环依赖 */
export interface NodeExecutorDeps {
  executionStates: Map<string, ExecutionState>
  agentCallStack: Set<string>
  workflowCallStack: Set<string>
  envVarsCache: Record<string, string> | null
  buildMonitoredLangGraph(executionId: string, workflow: Workflow, llmConfig: LLMConfig): Promise<CompiledStateGraph<any, any>>
  executeMonitoredLangGraph(compiledGraph: CompiledStateGraph<any, any>, input: string, executionId: string, threadId?: string, attachments?: AttachmentPayload[]): Promise<string>
  broadcastToSSEClients(executionId: string, data: any): void
}

/** 手动终止时使用的专用错误，各 catch 块据此透传而非吞掉 */
export class ExecutionTerminatedError extends Error {
  constructor() { super('执行已被手动终止') }
}

/** 这些节点透传 input，不产生 AI message */
export const PASSTHROUGH_NODES = new Set(['end', 'start', 'branch', 'if', 'merge'])
