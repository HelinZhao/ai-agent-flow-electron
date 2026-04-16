import { Workflow, ApiConfig } from '@renderer/types'
import { workflowApi } from './api'

class LangGraphExecutor {
  async executeWorkflow(
    workflow: Workflow,
    input: string,
    agentId?: string,
    threadId?: string
  ): Promise<string> {
    try {
      // 调用服务端的API来执行工作流（避免跨域问题）
      const response = await workflowApi.execute(workflow, input, agentId, threadId)
      return response.result
    } catch (error) {
      throw new Error(`工作流执行失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // AI Agent 对话方法
  async agentChat(agentId: string, input: string, threadId?: string): Promise<string> {
    try {
      // 调用服务端的 AI Agent 对话 API
      const response = await workflowApi.agentChat(agentId, input, threadId)

      if (!response.success) {
        throw new Error(`对话执行失败: ${response.result}`)
      }

      return response.result
    } catch (error) {
      throw new Error(`AI Agent 对话失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // API调用方法（用于节点配置面板中的实际API调用）
  async executeApiCall(apiConfig: ApiConfig): Promise<any> {
    try {
      const response = await fetch(apiConfig.url, {
        method: apiConfig.method,
        headers: apiConfig.headers || {},
        body: apiConfig.body ? JSON.stringify(apiConfig.body) : undefined,
        signal: apiConfig.timeout ? AbortSignal.timeout(apiConfig.timeout) : undefined
      })

      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      throw new Error(`API调用错误: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }
}

export const langGraphExecutor = new LangGraphExecutor()
