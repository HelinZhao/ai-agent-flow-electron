import axios from 'axios'
import {
  Workflow,
  Skill,
  Agent,
  Team,
  Task,
  LLMConfig,
  WorkflowExecutionProgress,
  WorkflowExecutionMetrics,
  NodeExecutionResult,
  ExecutionSummary,
  KnowledgeBase,
  KnowledgeChunk,
  Trigger,
  EnvVar,
  Template,
  TokenUsageItem,
  TokenUsageSummary,
  ModelTokenUsage
} from '@renderer/types'
import { API_BASE_URL, POLL_MAX_ATTEMPTS, POLL_INTERVAL } from '@renderer/config'

const baseURL = API_BASE_URL

// 创建axios实例
const api = axios.create({
  baseURL,
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
    return Promise.reject(error.response?.data?.error ? new Error(error.response.data.error) : error)
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

  // 导出工作流（返回 bundle JSON，浏览器触发下载）
  exportBundle: (id: string): Promise<any> => api.get(`/workflows/${id}/export`),

  // 导入工作流 bundle
  importBundle: (bundle: any): Promise<Workflow> => api.post('/workflows/import', bundle),

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
    threadId?: string,
    params?: Record<string, any>
  ): Promise<{ executionId: string; message: string }> =>
    api.post('/execute-workflow/monitor', {
      workflow,
      input,
      agentId,
      threadId,
      params
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

  // 获取所有执行记录列表（分页）
  listExecutions: (status?: string, page?: number, pageSize?: number, name?: string): Promise<{ data: ExecutionSummary[]; total: number; page: number; pageSize: number }> => {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (page) params.append('page', page.toString())
    if (pageSize) params.append('pageSize', pageSize.toString())
    if (name) params.append('name', name)
    return api.get(`/execute-workflow/list?${params.toString()}`)
  },

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
    threadId?: string,
    attachments?: any[],
    autoApprovedTools?: string[]
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
      threadId,
      attachments,
      autoApprovedTools,
    }),

  // 用户审批工具调用
  approveToolCall: (
    executionId: string,
    decisions: { type: 'approve' | 'reject'; message?: string }[]
  ): Promise<{ success: boolean; message: string }> =>
    api.post(`/execute-workflow/approve-tool/${executionId}`, { decisions }),

  // 按工具类型设置会话级放权
  setAutoApprove: (
    executionId: string,
    toolName: string
  ): Promise<{ success: boolean; message: string }> =>
    api.post(`/execute-workflow/auto-approve/${executionId}`, { toolName }),

  // 删除线程的AI记忆（checkpoint数据）
  deleteThread: (
    threadId: string
  ): Promise<{ success: boolean; message: string }> =>
    api.delete(`/execute-workflow/delete-thread/${threadId}`),

  // 单节点独立测试
  testNode: (workflow: any, nodeId: string, input: string): Promise<{
    output: string; duration: number; status: string; error?: string; metadata?: any
  }> => api.post('/execute-workflow/test-node', { workflow, nodeId, input }),

  // 等待AI Agent对话完成并获取结果（使用SSE）
  waitForAgentChatResultSSE: (
    executionId: string,
    onProgress?: (progress: any) => void
  ): Promise<{
    success: boolean
    message: string
    executionId: string
  }> => {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`${baseURL}/execute-workflow/progress-sse/${executionId}`)

      eventSource.onopen = () => {
        console.log('SSE连接已建立')
      }

      eventSource.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data)

          // 调用进度回调
          if (onProgress) {
            onProgress(data)
          }

          // 处理不同类型的消息
          if (data.type === 'execution_complete') {
            eventSource.close()

            if (data.status === 'completed') {
              // 获取最终的执行结果
              const nodeResults = await workflowExecutionApi.getNodeResults(executionId)

              // 尝试从节点结果中获取AI回复
              let aiResponse = '工作流执行完成'

              // 查找最后一个非分支节点的输出
              for (let i = nodeResults.length - 1; i >= 0; i--) {
                const result = nodeResults[i]
                if (
                  result.status === 'completed' &&
                  result.output &&
                  (!result.metadata?.type ||
                    !['start', 'end', 'branch'].includes(result.metadata?.type))
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
                message: data.error || '执行失败',
                executionId
              })
            }
          } else if (data.type === 'error') {
            eventSource.close()
            reject(new Error(data.message || 'SSE连接错误'))
          }
        } catch (error) {
          console.error('解析SSE消息失败:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('SSE连接错误:', error)
        eventSource.close()
        reject(new Error('SSE连接失败'))
      }
    })
  },

  // 等待AI Agent对话完成并获取结果（轮询版本，保持向后兼容）
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
      const maxAttempts = POLL_MAX_ATTEMPTS // 最多等待100秒（200 * 500ms）
      const pollInterval = POLL_INTERVAL // 500ms轮询一次

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

// 知识库 API
export const knowledgeBaseApi = {
  getAll: (): Promise<KnowledgeBase[]> => api.get('/knowledge-base'),

  create: (data: Partial<KnowledgeBase>): Promise<KnowledgeBase> =>
    api.post('/knowledge-base', data),

  update: (id: string, data: Partial<KnowledgeBase>): Promise<KnowledgeBase> =>
    api.put(`/knowledge-base/${id}`, data),

  delete: (id: string): Promise<void> => api.delete(`/knowledge-base/${id}`),

  uploadDocument: (id: string, file: File): Promise<{ message: string; chunkCount: number }> => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/knowledge-base/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  deleteDocument: (id: string, docName: string): Promise<void> =>
    api.delete(`/knowledge-base/${id}/documents/${encodeURIComponent(docName)}`),

  getStats: (id: string): Promise<{ documents: string[]; totalChunks: number }> =>
    api.get(`/knowledge-base/${id}/stats`),

  getChunks: (kbId: string, docName: string): Promise<KnowledgeChunk[]> =>
    api.get(`/knowledge-base/${kbId}/chunks/${encodeURIComponent(docName)}`),

  addChunk: (kbId: string, data: { content: string; source: string }): Promise<KnowledgeChunk> =>
    api.post(`/knowledge-base/${kbId}/chunks`, data),

  updateChunk: (kbId: string, chunkId: string, data: { content: string }): Promise<{ message: string }> =>
    api.put(`/knowledge-base/${kbId}/chunks/${chunkId}`, data),

  deleteChunk: (kbId: string, chunkId: string): Promise<{ message: string }> =>
    api.delete(`/knowledge-base/${kbId}/chunks/${chunkId}`),

  toggleChunk: (kbId: string, chunkId: string): Promise<{ id: string; enabled: boolean; message: string }> =>
    api.patch(`/knowledge-base/${kbId}/chunks/${chunkId}/toggle`),

  downloadDocument: (kbId: string, docName: string): Promise<Blob> =>
    axios.get(`${baseURL}/knowledge-base/${kbId}/documents/${encodeURIComponent(docName)}/download`, {
      responseType: 'blob'
    }).then(res => res.data),

  retrieveDebug: (kbId: string, query: string, topK?: number): Promise<{ results: { id: string; content: string; source: string; chunkIndex: number; distance: number }[] }> =>
    api.post(`/knowledge-base/${kbId}/retrieve-debug`, { query, topK }),
}

// 数据管理 API
export const proxyApi = {
  getConfig: (): Promise<{ enabled: boolean; protocol: string; host: string; port: number; username?: string; password?: string }> =>
    api.get('/proxy'),
  saveConfig: (config: any): Promise<{ success: boolean; message: string }> =>
    api.put('/proxy', config),
}

export const dataApi = {
  getDbStats: (): Promise<{ base: { path: string; size: number }; knowledge: { path: string; size: number }; total: number }> =>
    api.get('/data/db-stats'),

  vacuum: (): Promise<{ message: string; base: { size: number }; knowledge: { size: number }; total: number }> =>
    api.post('/data/vacuum'),
}

// 触发器 API
export const templateApi = {
  getAll: (type?: string): Promise<Template[]> =>
    api.get('/templates' + (type ? '?type=' + type : '')),
  getById: (id: string): Promise<Template> => api.get('/templates/' + id),
}

export const assistContextApi = {
  set: (ctx: Record<string, any>): Promise<any> => api.post('/assist-context', ctx),
  get: (): Promise<any> => api.get('/assist-context'),
  clear: (): Promise<any> => api.delete('/assist-context'),
}

export const envVarApi = {
  getAll: (): Promise<EnvVar[]> => api.get('/environment-variables'),

  create: (data: Omit<EnvVar, 'id' | 'createdAt' | 'updatedAt'>): Promise<EnvVar> =>
    api.post('/environment-variables', data),

  update: (id: string, data: Partial<EnvVar>): Promise<EnvVar> =>
    api.put(`/environment-variables/${id}`, data),

  delete: (id: string): Promise<void> => api.delete(`/environment-variables/${id}`),
}

export const triggerApi = {
  getAll: (): Promise<Trigger[]> => api.get('/triggers'),

  create: (data: Omit<Trigger, 'id' | 'createdAt' | 'updatedAt' | 'webhookToken' | 'nextRunAt' | 'lastRunAt' | 'lastRunStatus'>): Promise<Trigger> =>
    api.post('/triggers', data),

  update: (id: string, data: Partial<Trigger>): Promise<Trigger> =>
    api.put(`/triggers/${id}`, data),

  delete: (id: string): Promise<void> => api.delete(`/triggers/${id}`),

  runManual: (id: string): Promise<{ message: string }> =>
    api.post(`/triggers/${id}/run`),
}

// Health check
export const checkHealth = async (): Promise<{ status: string; timestamp: string }> => {
  return api.get('/health')
}

export const waitForServer = async (maxRetries = 120, interval = 1000): Promise<void> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await checkHealth()
      if (res?.status === 'ok') return
    } catch {
      // server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  throw new Error('启动服务超时')
}

export default api

// Ollama 模型管理 API
export interface OllamaStatus {
  ollamaRunning: boolean
  modelExists: boolean
  pulling: boolean
}

export interface PullProgress {
  status: string
  completed?: number
  total?: number
  message?: string
}

export const ollamaApi = {
  getStatus: (): Promise<OllamaStatus> => api.get('/ollama/status'),

  pullModel: (): Promise<{ success: boolean; message?: string }> =>
    api.post('/ollama/pull'),

  subscribePullProgress: (
    onProgress: (progress: PullProgress) => void
  ): (() => void) => {
    const eventSource = new EventSource(`${API_BASE_URL}/ollama/pull-progress`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as PullProgress
        onProgress(data)
        if (data.status === 'success' || data.status === 'error') {
          eventSource.close()
        }
      } catch {
        // ignore parse errors
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }
}

export const teamApi = {
  getAll: (): Promise<Team[]> => api.get('/teams'),
  getById: (id: string): Promise<Team> => api.get(`/teams/${id}`),
  create: (data: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team> =>
    api.post('/teams', data),
  update: (id: string, data: Partial<Team>): Promise<Team> => api.put(`/teams/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/teams/${id}`)
}

export const taskApi = {
  getAll: (status?: string): Promise<Task[]> =>
    api.get('/tasks' + (status ? `?status=${status}` : '')),
  getById: (id: string): Promise<Task> => api.get(`/tasks/${id}`),
  create: (data: { title: string; description: string; priority?: number }): Promise<Task> =>
    api.post('/tasks', data),
  update: (id: string, data: Partial<Task>): Promise<Task> => api.put(`/tasks/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/tasks/${id}`),
  claimNext: (claimedBy?: string, executionId?: string): Promise<{ claimed: boolean; task: Task | null }> =>
    api.post('/tasks/claim-next', { claimedBy, executionId }),
  complete: (id: string, result: string): Promise<Task> =>
    api.post(`/tasks/${id}/complete`, { result }),
  fail: (id: string, error: string): Promise<Task> =>
    api.post(`/tasks/${id}/fail`, { error }),
  restart: (id: string): Promise<Task> =>
    api.post(`/tasks/${id}/restart`),
  cancel: (id: string): Promise<Task> =>
    api.post(`/tasks/${id}/cancel`),
  assign: (id: string, teamId: string): Promise<Task> =>
    api.post(`/tasks/${id}/assign`, { teamId }),
}

export const teamChatMonitor = (data: {
  teamId: string
  input: string
}): Promise<{ executionId: string; success: boolean; message: string; teamName: string }> =>
  api.post('/team-chat-monitor', data)

export const tokenUsageApi = {
  getByExecution: (executionId: string): Promise<{ details: TokenUsageItem[]; summary: TokenUsageSummary }> =>
    api.get(`/token-usage/by-execution/${executionId}`),

  getSummary: (): Promise<ModelTokenUsage[]> =>
    api.get('/token-usage/summary'),
}

/** 团队执行实时监控 API */
export const teamExecutionApi = {
  /** 获取活跃执行列表 */
  list: (): Promise<{ executions: { executionId: string; taskTitle?: string; teamName?: string; teamId?: string }[]; pendingApprovalCount: number }> =>
    api.get('/team-execution/list'),

  /** 订阅指定 execution 的 SSE 实时流 */
  subscribeSSE: (executionId: string, onEvent: (event: any) => void): EventSource => {
    const es = new EventSource(`${API_BASE_URL}/team-execution/progress-sse/${executionId}`)
    es.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)) } catch { /* ignore malformed */ }
    }
    return es
  },

  /** 订阅全局 SSE（接收所有 team execution 的事件） */
  subscribeAll: (onEvent: (event: any) => void): EventSource => {
    const es = new EventSource(`${API_BASE_URL}/team-execution/progress-sse`)
    es.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)) } catch { /* ignore malformed */ }
    }
    return es
  },

  /** 批准/拒绝工具调用 */
  approveTool: (executionId: string, decisions: { type: 'approve' | 'reject'; message?: string }[]): Promise<any> =>
    api.post(`/team-execution/approve-tool/${executionId}`, { decisions }),

  /** 设置自动审批 */
  autoApprove: (executionId: string, toolName: string): Promise<any> =>
    api.post(`/team-execution/auto-approve/${executionId}`, { toolName }),

  /** 获取待审批列表 */
  getPendingApprovalDetails: (): Promise<{
    items: { executionId: string; taskTitle?: string; teamName?: string; actionRequests: { name: string; args: Record<string, any>; description: string }[] }[]
    count: number
  }> => api.get('/team-execution/pending-approvals'),

  /** 按 teamId 查找最近的执行 executionId */
  getLastExecution: (teamId: string): Promise<{ executionId: string | null; lastEventAt?: string }> =>
    api.get(`/team-execution/last-execution/${teamId}`),

  /** 获取团队的所有历史执行列表 */
  getHistoryByTeam: (teamId: string): Promise<{ executions: { executionId: string; taskTitle?: string; lastEventAt: string; eventCount: number }[] }> =>
    api.get(`/team-execution/history-by-team/${teamId}`),

  /** 获取指定 execution 的历史事件（通过文件 URL 直接读取解析） */
  getHistory: async (teamId: string, executionId: string): Promise<{ events: any[] }> => {
    const res: any = await api.get(`/team-execution/history/${teamId}/${executionId}`)
    if (!res.url) return { events: res.events || [] }
    const text = await fetch(`${API_BASE_URL}${res.url}`).then(r => r.text())
    const events = text.split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line) } catch { return null }
    }).filter(Boolean)
    return { events }
  },
}
