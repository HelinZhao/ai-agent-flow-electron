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
  type: 'start' | 'skill' | 'branch' | 'api' | 'llm' | 'agent' | 'cli' | 'text' | 'end' | 'workflow'
  position: { x: number; y: number }
  data: {
    label: string
    config?: any
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
  provider: 'openai' | 'anthropic' | 'azure' | 'bailian' | 'longcat' | 'deepseek' | 'ollama'
  apiKey: string
  model: string
  baseUrl?: string
  temperature?: number
  maxTokens?: number
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
  createdAt: Date
  updatedAt: Date
}
