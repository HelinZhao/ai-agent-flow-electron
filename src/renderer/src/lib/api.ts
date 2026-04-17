import axios from 'axios'
import {
  Workflow,
  Skill,
  Agent,
  LLMConfig,
  WorkflowExecutionProgress,
  WorkflowExecutionMetrics,
  NodeExecutionResult
} from '@renderer/types'

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
    agentId?: string,
    threadId?: string
  ): Promise<{ result: string; llmConfigName: string }> =>
    api.post('/execute-workflow', {
      workflow,
      input,
      agentId,
      threadId
    }),

  // AI Agent 对话
  agentChat: (
    agentId: string,
    input: string,
    threadId?: string
  ): Promise<{
    success: boolean
    result: string
    agentName: string
    workflowName: string
    llmConfigName: string
  }> =>
    api.post('/execute-workflow', {
      agentId,
      input,
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
    api.post(`/llm-config/${id}/activate`),

  // 测试连接
  testConnection: (
    data: Omit<LLMConfig, 'id' | 'createdAt' | 'updatedAt' | 'name'>
  ): Promise<{
    success: boolean
    message: string
    response: string
  }> => api.post(`/llm-config/test-connection`, data)
}

// 工作流执行监控API
export const workflowExecutionApi = {
  // 执行工作流并获取执行ID
  execute: (
    workflow: Workflow,
    input: string,
    agentId?: string,
    threadId?: string
  ): Promise<{ executionId: string; message: string }> =>
    api.post('/execute-workflow/monitor', {
      workflow,
      input,
      agentId,
      threadId
    }),

  // 获取执行进度
  getProgress: (executionId: string): Promise<WorkflowExecutionProgress> =>
    api.get(`/execute-workflow/progress/${executionId}`),

  // 获取执行指标
  getMetrics: (executionId: string): Promise<WorkflowExecutionMetrics> =>
    api.get(`/execute-workflow/metrics/${executionId}`),

  // 获取节点执行结果
  getNodeResults: (executionId: string): Promise<NodeExecutionResult[]> =>
    api.get(`/execute-workflow/node-results/${executionId}`),

  // 停止工作流执行
  stopExecution: (executionId: string): Promise<{ message: string }> =>
    api.post(`/execute-workflow/stop/${executionId}`),

  // 暂停工作流执行
  pauseExecution: (executionId: string): Promise<{ message: string }> =>
    api.post(`/execute-workflow/pause/${executionId}`),

  // 恢复工作流执行
  resumeExecution: (executionId: string): Promise<{ message: string }> =>
    api.post(`/execute-workflow/resume/${executionId}`),

  // 获取执行历史
  getExecutionHistory: (
    workflowId?: string,
    limit?: number
  ): Promise<WorkflowExecutionProgress[]> => {
    const params = new URLSearchParams()
    if (workflowId) params.append('workflowId', workflowId)
    if (limit) params.append('limit', limit.toString())

    return api.get(`/execute-workflow/history?${params.toString()}`)
  },

  // AI Agent 对话（带监控）
  agentChatMonitor: (
    agentId: string,
    input: string,
    threadId?: string
  ): Promise<{
    executionId: string
    success: boolean
    message: string
    agentName: string
    workflowName: string
  }> =>
    api.post('/execute-workflow/agent-chat-monitor', {
      agentId,
      input,
      threadId
    }),

  // 等待AI Agent对话完成并获取结果
  waitForAgentChatResult: (
    executionId: string,
    onProgress?: (progress: any) => void
  ): Promise<{
    success: boolean
    message: string
    executionId: string
  }> => {
    return new Promise((resolve, reject) => {
      let attempts = 0
      const maxAttempts = 100 // 最多等待100秒（200 * 500ms）
      const pollInterval = 1000 // 500ms轮询一次

      const poll = async () => {
        try {
          const progress = await workflowExecutionApi.getProgress(executionId)
          // 调用进度回调
          if (onProgress) {
            onProgress(progress)
          }
          // 检查执行是否完成
          if (progress.metrics.status === 'completed' || progress.metrics.status === 'failed') {
            // 获取最终的执行结果
            if (progress.metrics.status === 'completed') {
              // 尝试从节点结果中获取AI回复
              let aiResponse = '工作流执行完成'

              // 查找最后一个非分支节点的输出
              for (let i = progress.nodeResults.length - 1; i >= 0; i--) {
                const result = progress.nodeResults[i]
                if (
                  result.status === 'completed' &&
                  result.output &&
                  (!result.metadata?.type ||
                    !['start', 'end', 'branch'].includes(result.metadata.type))
                ) {
                  aiResponse = result.output
                  break
                }
              }

              resolve({
                success: true,
                message: aiResponse,
                executionId
              })
            } else {
              resolve({
                success: false,
                message: `执行失败: ${progress.logs?.find((log) => log.level === 'error')?.message || '未知错误'}`,
                executionId
              })
            }
          } else if (attempts >= maxAttempts) {
            reject(new Error('执行超时，请稍后查看执行状态'))
          } else {
            // 继续轮询
            attempts++
            setTimeout(poll, pollInterval)
          }
        } catch (error) {
          if (attempts >= maxAttempts) {
            reject(error)
          } else {
            // 继续轮询
            attempts++
            setTimeout(poll, pollInterval)
          }
        }
      }

      // 开始轮询
      poll()
    })
  }
}

export default api
