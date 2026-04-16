import axios from 'axios'
import { Workflow, Skill, Agent, LLMConfig } from '@renderer/types'

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token等
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API请求失败:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    })
    return Promise.reject(error)
  }
)

// Workflow API
export const workflowApi = {
  // 获取所有工作流
  getAll: (): Promise<Workflow[]> => api.get('/workflows'),

  // 获取单个工作流
  getById: (id: string): Promise<Workflow> => api.get(`/workflows/${id}`),

  // 创建工作流
  create: (data: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> =>
    api.post('/workflows', {
      ...data,
      nodes: data.nodes ?? [],
      edges: data.edges ?? []
    }),

  // 更新工作流
  update: (id: string, data: Partial<Workflow>): Promise<Workflow> => {
    const requestData: any = { ...data }
    if (data.nodes !== undefined) {
      requestData.nodes = data.nodes
    }
    if (data.edges !== undefined) {
      requestData.edges = data.edges
    }
    return api.put(`/workflows/${id}`, requestData)
  },

  // 删除工作流
  delete: (id: string): Promise<void> => api.delete(`/workflows/${id}`),

  // 执行工作流
  execute: (
    workflow: Workflow,
    input: string,
    llmConfig?: LLMConfig,
    agentId?: string,
    threadId?: string
  ): Promise<{ result: string }> =>
    api.post('/execute-workflow', {
      workflow,
      input,
      llmConfig,
      agentId,
      threadId
    })
}

// Skill API
export const skillApi = {
  // 获取所有技能
  getAll: (): Promise<Skill[]> => api.get('/skills'),

  // 获取单个技能
  getById: (id: string): Promise<Skill> => api.get(`/skills/${id}`),

  // 创建技能
  create: (data: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Promise<Skill> =>
    api.post('/skills', data),

  // 更新技能
  update: (id: string, data: Partial<Skill>): Promise<Skill> => api.put(`/skills/${id}`, data),

  // 删除技能
  delete: (id: string): Promise<void> => api.delete(`/skills/${id}`)
}

// Agent API
export const agentApi = {
  // 获取所有智能体
  getAll: (): Promise<Agent[]> => api.get('/agents'),

  // 获取单个智能体
  getById: (id: string): Promise<Agent> => api.get(`/agents/${id}`),

  // 创建智能体
  create: (data: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agent> =>
    api.post('/agents', data),

  // 更新智能体
  update: (id: string, data: Partial<Agent>): Promise<Agent> => api.put(`/agents/${id}`, data),

  // 删除智能体
  delete: (id: string): Promise<void> => api.delete(`/agents/${id}`)
}

// LLM配置API
export const llmConfigApi = {
  // 获取所有LLM配置
  getAll: (): Promise<LLMConfig[]> => api.get('/llm-config'),

  // 获取当前活跃的LLM配置
  getActive: (): Promise<LLMConfig> => api.get('/llm-config/active'),

  // 创建新的LLM配置
  create: (data: Omit<LLMConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<LLMConfig> =>
    api.post('/llm-config', data),

  // 更新LLM配置
  update: (id: string, data: Partial<LLMConfig>): Promise<LLMConfig> =>
    api.put(`/llm-config/${id}`, data),

  // 删除LLM配置
  delete: (id: string): Promise<void> => api.delete(`/llm-config/${id}`),

  // 切换活跃配置
  activate: (id: string): Promise<{ message: string; config: LLMConfig }> =>
    api.post(`/llm-config/${id}/activate`)
}

export default api
