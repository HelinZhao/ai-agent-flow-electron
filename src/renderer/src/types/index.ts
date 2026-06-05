import { Edge } from "@xyflow/react"

export interface BranchCondition {
  id: string
  label: string
  condition: string
}

export interface BranchNodeConfig {
  branches: BranchCondition[]
}

export interface WorkflowNode {
  id: string
  type: 'start' | 'skill' | 'branch' | 'api' | 'llm' | 'agent' | 'cli' | 'text' | 'end' | 'subWorkflow' | 'mcp' | 'code' | 'note' | 'loop' | 'catch' | 'transform' | 'split' | 'merge' | 'sleep' | 'if' | 'knowledge' | 'variable' | 'database' | 'team' | 'taskPool'
  position: { x: number; y: number }
  data: {
    label: string
    config?: Record<string, any>
  }
}
export interface WorkflowBranch {
  id: string
  condition: string
  label: string
}
export interface WorkflowEdge extends Edge{
  id: string
  source: string
  target: string
  label?: string
  condition?: string
  sourceType?: 'normal' | 'error'
}

export interface Workflow {
  id: string
  name: string
  description: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  layoutDirection?: 'horizontal' | 'vertical'
  envVars?: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

export interface Skill {
  id: string
  name: string
  description: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface Team {
  id: string
  name: string
  description: string
  captainId?: string
  memberIds: string[]
  mode: string
  autoClaimEnabled?: boolean
  autoClaimInterval?: number
  autoApproveTools?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ApiConfig {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: string
  timeout?: number
}

export interface LLMConfig {
  id?: string
  name: string
  provider: string
  apiKey: string
  model: string
  baseUrl?: string
  temperature?: number
  maxTokens?: number
  isActive?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface Agent {
  id: string
  name: string
  description: string
  instructions: string
  type: string
  skillIds?: string[]
  enabledTools?: string[]
  workflowId?: string
  llmConfigId?: string
  isSystem?: boolean
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}

// 附件元数据（轻量，用于历史持久化）
export interface AttachmentMetadata {
  id: string
  name: string          // 文件名
  type: string          // MIME类型
  size: number          // 文件大小
  category: 'image' | 'text' | 'pdf' | 'binary'  // 分类
  previewUrl?: string   // 图片预览（仅当前会话使用，不存入历史）
  url?: string          // Express服务URL（/api/attachments/:id/:filename，不存入历史）
}

// 对话记录相关类型
export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'agent'
  timestamp: string // ISO string
  agentId?: string
  attachments?: AttachmentMetadata[]
}

export interface ChatRecord {
  id: string
  agentId: string
  agentName: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface VariableConfig {
  name: string
  displayName: string
  type: 'string' | 'number' | 'boolean' | 'array'
  defaultValue?: any
  required?: boolean
  description?: string
}

export interface LLMNodeConfig {
  prompt: string
  variables: VariableConfig[]
  enabledTools?: string[]
}

// 工作流执行监控相关类型
export interface WorkflowExecutionMetrics {
  executionId: string
  startTime: Date
  endTime?: Date
  duration?: number
  status: 'running' | 'completed' | 'failed' | 'paused'
  totalNodes: number
  completedNodes: number
  failedNodes: number
  progress: number // 0-100
}

export interface NodeExecutionResult {
  nodeId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: Date
  endTime?: Date
  duration?: number
  input?: string
  output?: string
  error?: string
  variables?: Record<string, any>
  params?: Record<string, any>
  metadata?: {
    nodeId: string
    type: string
    label: string
    [key: string]: any
  }
}

export interface WorkflowExecutionProgress {
  executionId: string
  workflowId: string
  workflowName: string
  currentNodeId?: string
  currentNodeLabel?: string
  metrics: WorkflowExecutionMetrics
  nodeResults: NodeExecutionResult[]
  executionPath: string[]
  estimatedTimeRemaining?: number
  logs: ExecutionLog[]
}

export interface ExecutionLog {
  timestamp: Date
  level: 'info' | 'warn' | 'error'
  message: string
  nodeId?: string
  details?: any
}

export interface CliNodeConfig {
  command: string
  templateId?: string
  templateVariables?: Record<string, string>
  workingDirectory?: string
  timeout?: number
  outputMode: 'raw' | 'llm_process'
  llmProcessPrompt?: string
}

export interface CodeNodeConfig {
  code: string
  language: 'javascript'
}

// 执行列表摘要（轻量，不含 nodeResults/logs）
export interface ExecutionSummary {
  executionId: string
  workflowName: string
  status: 'running' | 'paused' | 'completed' | 'failed'
  startTime: string
  endTime?: string
  duration?: number
  progress: number
  totalNodes: number
  completedNodes: number
  failedNodes: number
  currentNodeLabel?: string
  agentId?: string
}

export interface PaginatedExecutions {
  data: ExecutionSummary[]
  total: number
  page: number
  pageSize: number
}

// Token 用量相关
export interface TokenUsageItem {
  id: string
  executionId: string
  nodeId?: string
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  createdAt: string
}

export interface TokenUsageSummary {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface ModelTokenUsage {
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  callCount: number
}

// 工具审批相关类型
export interface ToolApprovalAction {
  name: string
  args: Record<string, any>
  description: string
}

export interface ToolApprovalRequest {
  actionRequests: ToolApprovalAction[]
  reviewConfigs: { actionName: string; allowedDecisions: string[] }[]
}

export interface ToolApprovalDecision {
  type: 'approve' | 'reject'
  message?: string
}

// 知识库类型
export interface KnowledgeBase {
  id: string
  name: string
  description: string
  type: 'internal' | 'external'
  provider?: string
  chunkSize: number
  chunkOverlap: number
  topK: number
  vectorStore?: string
  vectorConfig?: string
  apiUrl: string
  apiKey: string
  providerConfig?: string
  documentCount?: number
  totalChunks?: number
  documents?: string[]
  createdAt: Date
  updatedAt: Date
}

// 知识库分块类型
export interface KnowledgeChunk {
  id: string
  knowledgeBaseId: string
  content: string
  source: string
  chunkIndex: number
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

// 模板市场类型
export interface Template {
  id: string
  name: string
  description: string
  type: 'api' | 'mcp' | 'code' | 'workflow' | 'agent' | 'skill' | 'cli' | 'sql'
  category: string
  icon: string
  content: string
  author: string
  version: string
  createdAt: string
  updatedAt: string
}

// 项目类型
export interface Project {
  id: string
  name: string
  description: string
  workDir: string
  createdAt: string
  updatedAt: string
}

// 环境变量类型
export interface EnvVar {
  id: string
  name: string
  value: string
  description: string
  createdAt: string
  updatedAt: string
}

// 触发器类型
export interface Trigger {
  id: string
  name: string
  type: 'cron' | 'webhook'
  cronExpression?: string
  targetType: 'workflow' | 'agent' | 'team'
  targetId: string
  input: string
  params?: string
  webhookToken?: string
  enabled: boolean
  nextRunAt?: string
  lastRunAt?: string
  lastRunStatus?: 'success' | 'failed' | 'running'
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'draft' | 'pending' | 'assigned' | 'claimed' | 'pending_review' | 'completed' | 'failed'
  priority: number
  claimedBy?: string
  executionId?: string
  result?: string
  error?: string
  restartedFrom?: string
  parentId?: string
  reviewComment?: string
  projectId?: string
  claimedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}
