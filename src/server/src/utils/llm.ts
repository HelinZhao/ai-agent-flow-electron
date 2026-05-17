import { BaseMessage, HumanMessage } from '@langchain/core/messages'
import { LLMConfig } from '../types'
import { ChatOpenAI } from '@langchain/openai'
import { createAgent, humanInTheLoopMiddleware } from "langchain"
import { MemorySaver } from "@langchain/langgraph"
import { Command } from "@langchain/langgraph"
import { getToolsByIds } from '../tools'
import { llmCache } from './llmCache'
import { HITLRequest, HITLResponse, CallLLMOptions } from './hitl'
import { AttachmentPayload, isVisionModel } from './shared'
import { loadAttachmentAsDataUrl } from './file'
import { PROVIDER_DEFAULT_BASE_URLS, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS, MIN_MAX_TOKENS_WITH_TOOLS, LLM_MAX_RETRIES, LLM_SDK_MAX_RETRIES, LLM_RETRY_BASE_DELAY, LLM_RETRY_MAX_DELAY, LANGGRAPH_RECURSION_LIMIT_WITH_TOOLS, LANGGRAPH_RECURSION_LIMIT_NO_TOOLS, DANGEROUS_TOOLS } from '../config'
import { getCachedProxyConfig, getProxyFetch } from './proxy'

export const getLLMEndpoint = (llmConfig: LLMConfig): string => {
  const defaultUrl = PROVIDER_DEFAULT_BASE_URLS[llmConfig.provider]
  if (defaultUrl) {
    return llmConfig.baseUrl || defaultUrl
  }
  throw new Error(`不支持的LLM提供商: ${llmConfig.provider}`)
}

// 判断是否为可重试的瞬态错误（429 限流、网络断连等）
const isRetryableError = (error: any): boolean => {
  const msg = error instanceof Error ? error.message : String(error)
  return /429|rate.?limit|quota|exceeded|connection.?error|ECONNRESET|ECONNREFUSED|ETIMEDOUT|fetch.?failed/i.test(msg)
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const callLLM = async (
  prompt: string,
  llmConfig: LLMConfig,
  conversationHistory: BaseMessage[] = [],
  enabledTools: string[] = [],
  options?: CallLLMOptions,
  attachments?: AttachmentPayload[]
): Promise<string> => {
  const maxAttempts = LLM_MAX_RETRIES
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await callLLMOnce(prompt, llmConfig, conversationHistory, enabledTools, attempt, options, attachments)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (!isRetryableError(lastError) || attempt >= maxAttempts) {
        throw lastError
      }
      // 429 限流需要更长等待，指数退避
      const waitSeconds = Math.min(LLM_RETRY_BASE_DELAY * Math.pow(2, attempt - 1), LLM_RETRY_MAX_DELAY)
      console.log(`[LLM Agent] 第${attempt}次执行失败(${lastError.message})，${waitSeconds}秒后重试...`)
      await sleep(waitSeconds * 1000)
    }
  }
  throw lastError!
}

const callLLMOnce = async (
  prompt: string,
  llmConfig: LLMConfig,
  conversationHistory: BaseMessage[],
  enabledTools: string[],
  attempt: number,
  options?: CallLLMOptions,
  attachments?: AttachmentPayload[]
): Promise<string> => {
  const hasTools = enabledTools.length > 0
  const effectiveMaxTokens = hasTools
    ? Math.max(llmConfig.maxTokens || DEFAULT_MAX_TOKENS, MIN_MAX_TOKENS_WITH_TOOLS)
    : (llmConfig.maxTokens || DEFAULT_MAX_TOKENS)

  // 加载代理配置，若开启则使用代理 fetch
  const proxyConfig = await getCachedProxyConfig()
  const proxyFetch = getProxyFetch(proxyConfig)
  const llmOptions: ConstructorParameters<typeof ChatOpenAI>[0] = {
    model: llmConfig.model,
    temperature: llmConfig.temperature || DEFAULT_TEMPERATURE,
    maxTokens: effectiveMaxTokens,
    maxRetries: LLM_SDK_MAX_RETRIES,
    apiKey: llmConfig.apiKey,
    configuration: {
      baseURL: getLLMEndpoint(llmConfig),
      ...(proxyFetch !== fetch ? { fetch: proxyFetch } : {}),
    },
    ...(options?.cache ? { cache: llmCache } : {}),
  }
  const llm = new ChatOpenAI(llmOptions)

  const tools = getToolsByIds(enabledTools)

  // 构建 HITL 中间件：危险工具需要审批，安全工具自动放行
  const needsApproval = enabledTools.some(t => DANGEROUS_TOOLS.includes(t))
  const useHITL = hasTools && needsApproval && options?.approvalCallback

  // 构建消息（公共逻辑，直接调用和 agent 路径共用）
  const lastContent = conversationHistory[conversationHistory.length - 1]?.content
  const lastContentStr = typeof lastContent === 'string'
    ? lastContent
    : Array.isArray(lastContent)
      ? lastContent.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join('\n')
      : ''

  const imageAttachments = attachments?.filter(att => att.category === 'image') || []
  const supportsVision = isVisionModel(llmConfig.model)
  const imageDataUrls: Map<string, string> = new Map()
  for (const att of imageAttachments) {
    if (att.dataUrl) {
      imageDataUrls.set(att.id, att.dataUrl)
    } else if (att.filePath) {
      try {
        const dataUrl = await loadAttachmentAsDataUrl(att.filePath, att.type)
        imageDataUrls.set(att.id, dataUrl)
      } catch (error) {
        console.error(`[LLM Agent] 读取图片附件 ${att.name} 失败:`, error)
      }
    }
  }

  const hasImages = imageDataUrls.size > 0 && supportsVision

  if (hasImages) {
    console.log(`[LLM Agent] 模型 ${llmConfig.model} 支持vision，注入${imageDataUrls.size}张图片`)
  } else if (imageAttachments.length > 0) {
    const imageNames = imageAttachments.map(att => att.name).join('、')
    throw new Error(
      `当前配置的模型「${llmConfig.model}」不支持图像识别，无法处理图片附件（${imageNames}）。` +
      `请更换支持多模态的模型（如 gpt-4o、claude-3.5-sonnet、gemini-pro-vision 等）后再试。`
    )
  }

  const userMessage = hasImages
    ? new HumanMessage({
      content: [
        { type: 'text', text: prompt },
        ...imageAttachments
          .filter(att => imageDataUrls.has(att.id))
          .map(att => ({
            type: 'image_url' as const,
            image_url: { url: imageDataUrls.get(att.id)! }
          }))
      ]
    })
    : new HumanMessage(prompt)

  const messages = prompt !== lastContentStr
    ? [...conversationHistory, userMessage]
    : conversationHistory

  if (attempt > 1) console.log(`[LLM Agent] 第${attempt}次重试开始`)

  // 无工具且无 HITL 时直接调用模型，绕过 createAgent 避免 LangGraph 注入动态元数据破坏缓存
  if (!hasTools && !useHITL) {
    const response = await llm.invoke(messages)
    return response.content.toString()
  }

  // 有工具或 HITL 时走 createAgent 路径
  const interruptOn: Record<string, boolean> = {}
  if (useHITL) {
    for (const toolId of enabledTools) {
      // 危险工具拦截，安全工具自动放行
      interruptOn[toolId] = DANGEROUS_TOOLS.includes(toolId)
    }
  }

  const checkpointer = useHITL ? new MemorySaver() : undefined
  const threadId = `thread-${Date.now()}`

  const agent = createAgent({
    model: llm,
    tools,
    middleware: useHITL ? [humanInTheLoopMiddleware({ interruptOn })] : [],
    checkpointer,
  });

  const recursionLimit = hasTools ? LANGGRAPH_RECURSION_LIMIT_WITH_TOOLS : LANGGRAPH_RECURSION_LIMIT_NO_TOOLS

  // HITL 模式：invoke + 检查 interrupt + 等待审批 + resume 循环
  if (useHITL) {
    let stepCount = 0
    let result: any = await agent.invoke({ messages }, {
      configurable: { thread_id: threadId },
      recursionLimit,
    })

    while (result.__interrupt__ && result.__interrupt__.length > 0) {
      // 提取 HITL 请求信息
      const interruptValue = result.__interrupt__[0].value as HITLRequest
      stepCount++
      for (const action of interruptValue.actionRequests) {
        console.log(`[LLM Agent] 步骤${stepCount} - 等待审批: ${action.name}(${JSON.stringify(action.args).substring(0, 300)})`)
      }

      // 调用审批回调，等待用户决策
      const hitlResponse: HITLResponse = await options!.approvalCallback!(interruptValue)

      // 用用户决策 resume agent
      console.log(`[LLM Agent] 审批结果: ${hitlResponse.decisions.map(d => d.type).join(',')}`)
      result = await agent.invoke(new Command({ resume: hitlResponse }), {
        configurable: { thread_id: threadId },
        recursionLimit,
      })

      // 解析 resume 后的中间步骤（工具执行结果）
      const lastMsg = result.messages?.[result.messages.length - 1]
      if (lastMsg) {
        stepCount++
        if (lastMsg.content && typeof lastMsg.content === 'string') {
          console.log(`[LLM Agent] 步骤${stepCount} - 模型输出: ${lastMsg.content.substring(0, 200)}${lastMsg.content.length > 200 ? '...' : ''}`)
        }
      }
    }

    const finalContent = result.messages?.[result.messages.length - 1]?.content?.toString() || ''
    if (!finalContent) {
      console.log(`[LLM Agent] agent 返回内容为空，可能因递归限制(${recursionLimit})或步数不足被截断`)
    }
    console.log(`[LLM Agent] 执行完成，共${stepCount}步`)
    return finalContent
  }

  // 无 HITL：stream 模式追踪每一步
  if (hasTools) {
    let lastAgentMsg: any = null
    let stepCount = 0
    const stream = await agent.stream({ messages }, { recursionLimit })

    for await (const rawChunk of stream) {
      const chunk = rawChunk as any
      for (const [nodeName, nodeState] of Object.entries<any>(chunk)) {
        if (nodeName === "model_request") {
          const msgs = nodeState?.messages
          const msg = Array.isArray(msgs) ? msgs[msgs.length - 1] : undefined
          if (msg?.content !== undefined || msg?.tool_calls?.length) {
            stepCount++; lastAgentMsg = msg
            if (msg.content && typeof msg.content === "string")
              console.log(`[LLM Agent] 步骤${stepCount} - 模型输出: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? "..." : ""}`)
            if (msg?.tool_calls?.length)
              for (const tc of msg.tool_calls)
                console.log(`[LLM Agent] 步骤${stepCount} - 调用工具: ${tc.name}(${JSON.stringify(tc.args).substring(0, 300)})`)
          }
        } else if (nodeName === "tools") {
          const msgs = nodeState?.messages
          const msg = Array.isArray(msgs) ? msgs[msgs.length - 1] : undefined
          if (msg?.content) {
            const resultStr = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
            console.log(`[LLM Agent] 工具结果 (${msg.name || "unknown"}): ${resultStr.substring(0, 300)}${resultStr.length > 300 ? "..." : ""}`)
          }
        }
      }
    }
    const finalContent = lastAgentMsg?.content?.toString() || ''
    if (!finalContent) {
      console.log(`[LLM Agent] agent 返回内容为空，可能因递归限制(${recursionLimit})或步数不足被截断`)
    }
    console.log(`[LLM Agent] 执行完成，共${stepCount}步`)
    return finalContent
  }

  // 无工具时直接 invoke
  const response = await agent.invoke({ messages }, { recursionLimit });
  return response.messages[response.messages.length - 1].content.toString()
}