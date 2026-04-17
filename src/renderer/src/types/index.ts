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
  type: 'start' | 'skill' | 'branch' | 'api' | 'llm' | 'agent' | 'end'
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
export interface WorkflowEdge {
  id: string
  source: string
  target: string
  label?: string
  condition?: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
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
  provider: 'openai' | 'anthropic' | 'azure' | 'qwen' | 'longcat'
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
  workflowId?: string
  createdAt: Date
  updatedAt: Date
}

// 对话历史相关类型
export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'agent'
  timestamp: string // ISO string
  agentId?: string
}

export interface ChatHistory {
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
}

// 工作流执行监控相关类型
export interface WorkflowExecutionMetrics {
  executionId: string
  startTime: Date
  endTime?: Date
  duration?: number
  status: 'running' | 'completed' | 'failed'
  totalNodes: number
  completedNodes: number
  failedNodes: number
  progress: number // 0-100
}

export interface NodeExecutionResult {
  nodeId: string
  nodeType: string
  nodeLabel: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: Date
  endTime?: Date
  duration?: number
  input?: any
  output?: any
  error?: string
  metadata?: Record<string, any>
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
