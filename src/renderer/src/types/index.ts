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
