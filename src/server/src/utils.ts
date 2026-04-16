import { BaseMessage, HumanMessage } from '@langchain/core/messages'
import { LLMConfig } from './types'
import { ChatOpenAI } from '@langchain/openai'

export const getLLMEndpoint = (llmConfig: LLMConfig): string => {
  switch (llmConfig.provider) {
    case 'openai':
      return 'https://api.openai.com/v1'
    case 'anthropic':
      return 'https://api.anthropic.com/v1'
    case 'azure':
      return llmConfig.baseUrl || ''
    case 'qwen':
      return llmConfig.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    case 'longcat':
      return llmConfig.baseUrl || 'https://api.longcat.chat/openai/v1'
    default:
      throw new Error(`不支持的LLM提供商: ${llmConfig.provider}`)
  }
}

export const callLLM = async (
  prompt: string,
  llmConfig: LLMConfig,
  conversationHistory: BaseMessage[] = []
): Promise<string> => {
  try {
    const llm = new ChatOpenAI({
      model: llmConfig.model,
      temperature: llmConfig.temperature || 0.7,
      maxTokens: llmConfig.maxTokens || 2000,
      maxRetries: 2,
      apiKey: llmConfig.apiKey,
      // 其他配置参数可以在这里添加
      configuration: {
        baseURL: getLLMEndpoint(llmConfig)
      }
    })
    // 调用大模型
    const response = await llm.invoke([...conversationHistory, new HumanMessage(prompt)])
    // 提取响应内容
    return response.content.toString()
  } catch (error) {
    throw new Error(`LLM调用错误: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}
