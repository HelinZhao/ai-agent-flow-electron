import { BaseMessage, HumanMessage, AIMessage, RemoveMessage } from '@langchain/core/messages'
import { LLMConfig, TokenUsage } from '../types'
import { ChatOpenAI } from '@langchain/openai'
import { AgentMiddleware, createAgent, createMiddleware, humanInTheLoopMiddleware } from "langchain"
import { BaseCheckpointSaver, MemorySaver, REMOVE_ALL_MESSAGES } from "@langchain/langgraph"
import { Command } from "@langchain/langgraph"
import { getToolsByIds } from '../tools'
import { createAskUserChoiceTool } from '../tools/choiceTool'
import { llmCache } from './llmCache'
import { CallLLMOptions } from './hitl'
import { AttachmentPayload, isVisionModel, sleep } from './shared'
import { loadAttachmentAsDataUrl } from './file'
import { PROVIDER_DEFAULT_BASE_URLS, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS, MIN_MAX_TOKENS_WITH_TOOLS, LLM_MAX_RETRIES, LLM_SDK_MAX_RETRIES, LLM_RETRY_BASE_DELAY, LLM_RETRY_MAX_DELAY, LANGGRAPH_RECURSION_LIMIT_WITH_TOOLS, LANGGRAPH_RECURSION_LIMIT_NO_TOOLS, DANGEROUS_TOOLS, CHAT_MAX_HISTORY } from '../config'
import { getCachedProxyConfig, getProxyFetch } from './proxy'

export interface CallLLMCtx {
  prompt: string
  llmConfig: LLMConfig
  conversationHistory?: BaseMessage[]
  enabledTools?: string[]
  options?: CallLLMOptions
  attachments?: AttachmentPayload[]
  extraTools?: any[]
  checkpointer?: BaseCheckpointSaver
  threadId?: string
  /** 以下用于 token 用量记录 */
  executionId?: string
  nodeId?: string
  /** 内部使用：重试次数 */
  attempt?: number
}

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

/** 超过 CHAT_MAX_HISTORY 条时压缩旧消息（LangGraph 中间件，自动同步 checkpoint） */
function createTrimConversation(llm: ChatOpenAI) {
  return createMiddleware({
    name: "TrimConversation",
    beforeModel: async (state: { messages: BaseMessage[] }) => {
      if (!state.messages || state.messages.length <= CHAT_MAX_HISTORY) return
      const keepCount = Math.floor(state.messages.length * 0.7)
      const toSummarize = state.messages.slice(0, state.messages.length - keepCount)
      const recentMsgs = state.messages.slice(-keepCount)
      const text = toSummarize
        .map((m: any) => `[${m._getType?.() || 'message'}] ${typeof m.content === 'string' ? m.content.slice(0, 500) : '(非文本)'}`)
        .join('\n')
      try {
        const resp = await llm.invoke([new HumanMessage(`请用中文将以下对话压缩为一段简洁的摘要，保留关键决策、结论和用户意图（不超过 300 字）：\n\n${text}`)])
        const summary = resp.content.toString()
        return { messages: [new RemoveMessage({ id: REMOVE_ALL_MESSAGES }), new AIMessage(`【历史摘要】\n${summary}`), ...recentMsgs] }
      } catch {
        return { messages: [new RemoveMessage({ id: REMOVE_ALL_MESSAGES }), ...recentMsgs] }
      }
    },
  })
}

function extractTokenUsage(msg: any): TokenUsage | undefined {
  const meta = msg?.usage_metadata
  if (meta?.input_tokens !== undefined || meta?.output_tokens !== undefined) {
    return {
      promptTokens: meta.input_tokens ?? 0,
      completionTokens: meta.output_tokens ?? 0,
      totalTokens: meta.total_tokens ?? 0,
    }
  }
  return undefined
}

export const callLLM = async (ctx: CallLLMCtx): Promise<{ content: string; tokenUsage?: TokenUsage }> => {
  const maxAttempts = LLM_MAX_RETRIES
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await callLLMOnce({ ...ctx, attempt }) as any
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (!isRetryableError(lastError) || attempt >= maxAttempts) {
        throw lastError
      }
      const waitSeconds = Math.min(LLM_RETRY_BASE_DELAY * Math.pow(2, attempt - 1), LLM_RETRY_MAX_DELAY)
      console.log(`[LLM Agent] 第${attempt}次执行失败(${lastError.message})，${waitSeconds}秒后重试...`)
      await sleep(waitSeconds * 1000)
    }
  }
  throw lastError!
}

// ============================================================
//  执行路径
// ============================================================

const callLLMOnce = async (ctx: CallLLMCtx): Promise<{ content: string; tokenUsage?: TokenUsage }> => {
  const { prompt, conversationHistory = [], enabledTools = [], attempt = 1,
    options, extraTools: ctxExtraTools = [], checkpointer, threadId } = ctx
  // 有 choiceCallback 时自动注入选择工具
  const extraTools = [...ctxExtraTools]
  if (options?.choiceCallback) {
    extraTools.push(createAskUserChoiceTool(options.choiceCallback))
  }
  const hasTools = enabledTools.length > 0 || extraTools.length > 0
  const useHITL = hasTools && enabledTools.some(t => DANGEROUS_TOOLS.includes(t)) && !!options?.approvalCallback

  const llm = await _buildLLM(ctx)
  const tools = [...getToolsByIds(enabledTools), ...extraTools]
  const userMessage = await _buildUserMessage(ctx)
  const messages = checkpointer && threadId
    ? [userMessage]
    : prompt !== String(conversationHistory[conversationHistory.length - 1]?.content || "")
      ? [...conversationHistory, userMessage]
      : conversationHistory

  if (attempt > 1) console.log("[LLM Agent] 第" + attempt + "次重试开始")

  if (checkpointer && threadId) return _execAgent(llm, tools, messages, hasTools, useHITL, enabledTools, options, checkpointer, threadId)
  if (!hasTools && !useHITL) {
    const r = await llm.invoke(messages, { signal: options?.signal })
    return { content: r.content.toString(), tokenUsage: extractTokenUsage(r) }
  }
  return _execAgent(llm, tools, messages, hasTools, useHITL, enabledTools, options)
}

/** 构建 LLM 实例（含代理、缓存） */
async function _buildLLM(ctx: CallLLMCtx): Promise<ChatOpenAI> {
  const { llmConfig, options } = ctx
  const hasTools = (ctx.enabledTools?.length ?? 0) > 0 || (ctx.extraTools?.length ?? 0) > 0
  const proxyConfig = await getCachedProxyConfig()
  const proxyFetch = getProxyFetch(proxyConfig)
  return new ChatOpenAI({
    model: llmConfig.model, temperature: llmConfig.temperature || DEFAULT_TEMPERATURE,
    maxTokens: hasTools ? Math.max(llmConfig.maxTokens || DEFAULT_MAX_TOKENS, MIN_MAX_TOKENS_WITH_TOOLS) : (llmConfig.maxTokens || DEFAULT_MAX_TOKENS),
    maxRetries: LLM_SDK_MAX_RETRIES, apiKey: llmConfig.apiKey,
    configuration: { baseURL: getLLMEndpoint(llmConfig), ...(proxyFetch !== fetch ? { fetch: proxyFetch } : {}) },
    ...(options?.cache ? { cache: llmCache } : {}),
  })
}

/** 构建用户消息（支持纯文本和 vision 图片） */
async function _buildUserMessage(ctx: CallLLMCtx): Promise<HumanMessage> {
  const { prompt, llmConfig, attachments } = ctx
  const supportsVision = isVisionModel(llmConfig.model)
  const imageAttachments = attachments?.filter(a => a.category === "image") || []
  const imageDataUrls: Map<string, string> = new Map()
  for (const att of imageAttachments) {
    if (att.dataUrl) imageDataUrls.set(att.id, att.dataUrl)
    else if (att.filePath) {
      try { imageDataUrls.set(att.id, await loadAttachmentAsDataUrl(att.filePath, att.type)) }
      catch (e) { console.error("[LLM] 读图失败:", e) }
    }
  }
  if (imageAttachments.length > 0 && !supportsVision)
    throw new Error("当前配置的模型不支持图像识别，无法处理图片附件")
  if (imageDataUrls.size === 0 || !supportsVision) return new HumanMessage(prompt)
  return new HumanMessage({
    content: [{ type: "text", text: prompt },
    ...imageAttachments.filter(a => imageDataUrls.has(a.id)).map(a => ({
      type: "image_url" as const, image_url: { url: imageDataUrls.get(a.id)! }
    }))],
  })
}

/** 从 invoke 结果中提取并打印工具调用 */
function _logToolCalls(result: any, prefix: string): void {
  const msgs = result?.messages || []
  for (const m of msgs) {
    if (m?.tool_calls?.length) {
      for (const tc of m.tool_calls)
        console.log(`[LLM Agent] ${prefix} 调用工具: ${tc.name}(${JSON.stringify(tc.args).substring(0, 300)})`)
    }
    if (m?.content && typeof m.content === 'string' && msgs.indexOf(m) === msgs.length - 1) {
      console.log(`[LLM Agent] ${prefix} 模型回复: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`)
    }
  }
}

/**
 * 中间件：清理 checkpointer 恢复的孤立 tool_call
 * 重启后 checkpointer 中可能残留 AIMessage.tool_calls 但无对应 ToolMessage
 * 若不清理会导致 LangGraph 报 INVALID_TOOL_RESULTS 错误
 */
function createCleanOrphanedToolCalls() {
  return createMiddleware({
    name: "CleanOrphanedToolCalls",
    beforeModel: async (state: { messages: BaseMessage[] }) => {
      if (!state.messages || state.messages.length === 0) return

      // 找出所有实际存在的 tool 消息的 tool_call_id
      const respondedIds = new Set<string>()
      for (const msg of state.messages) {
        if (msg._getType() === 'tool' && (msg as any).tool_call_id) {
          respondedIds.add((msg as any).tool_call_id)
        }
      }

      // 清理无对应 tool 响应的 tool_calls
      let changed = false
      const cleaned = state.messages.map(msg => {
        if (msg._getType() !== 'ai') return msg
        const ai = msg as AIMessage
        if (!ai.tool_calls || ai.tool_calls.length === 0) return msg

        const valid = ai.tool_calls.filter(tc => respondedIds.has(tc.id!))
        if (valid.length === ai.tool_calls.length) return msg

        changed = true
        console.log(`[LLM] 清理 ${ai.tool_calls.length - valid.length} 个孤立 tool_call`)
        if (valid.length === 0 && !ai.content) {
          // 全部被清理且无文本内容 → 整条删除
          return new RemoveMessage({ id: ai.id || '' })
        }
        // 保留有效的 tool_calls
        return new AIMessage({ content: ai.content, tool_calls: valid, id: ai.id })
      })

      if (changed) return { messages: cleaned }
    },
  })
}

/** 统一的 agent 执行（支持 SQLite / MemorySaver checkpointer、工具、HITL、流式） */
async function _execAgent(
  llm: ChatOpenAI, tools: any[], messages: BaseMessage[],
  hasTools: boolean, useHITL: boolean, enabledTools: string[], options?: CallLLMOptions,
  checkpointer?: BaseCheckpointSaver, threadId?: string,
): Promise<{ content: string; tokenUsage?: TokenUsage }> {
  // 中间件：清理孤立 tool_call + 历史压缩 + HITL 审批
  const mw: AgentMiddleware[] = [createCleanOrphanedToolCalls()]
  if (checkpointer) mw.push(createTrimConversation(llm))
  if (useHITL) {
    const io: Record<string, boolean> = {}
    for (const t of enabledTools) io[t] = DANGEROUS_TOOLS.includes(t)
    mw.push(humanInTheLoopMiddleware({ interruptOn: io }))
  }
  const cp = checkpointer || (useHITL ? new MemorySaver() : undefined)
  const agent = createAgent({ model: llm, tools, checkpointer: cp, middleware: mw })
  const rl = hasTools ? LANGGRAPH_RECURSION_LIMIT_WITH_TOOLS : LANGGRAPH_RECURSION_LIMIT_NO_TOOLS
  const tid = threadId || "thread-" + crypto.randomUUID()
  
  // HITL 模式：agent.invoke → 工具被拦截 → 等待用户审批 → resume 继续
  if (useHITL) {
    let stepCount = 0
    let result: any = await agent.invoke({ messages }, { configurable: { thread_id: tid }, recursionLimit: rl, signal: options?.signal })
    // 打印本次 invoke 中的所有工具调用
    _logToolCalls(result, '')
    while (result.__interrupt__?.length > 0) {
      stepCount++
      for (const action of result.__interrupt__[0].value.actionRequests)
        console.log(`[LLM Agent] 步骤${stepCount} - 等待审批: ${action.name}(${JSON.stringify(action.args).substring(0, 300)})`)
      // 等待用户审批（前端 SSE 弹窗 → 用户点允许/拒绝）
      const resp = await options!.approvalCallback!(result.__interrupt__[0].value)
      result = await agent.invoke(new Command({ resume: resp }), { configurable: { thread_id: tid }, recursionLimit: rl, signal: options?.signal })
      _logToolCalls(result, '审批后')
    }
    const lm = result.messages?.[result.messages.length - 1]
    return { content: lm?.content?.toString() || "", tokenUsage: extractTokenUsage(lm) }
  }

  // 有工具：stream 模式追踪每一步
  if (hasTools) {
    let lastMsg: any = null; let step = 0
    const stream = await agent.stream({ messages }, { configurable: { thread_id: tid }, recursionLimit: rl })
    for await (const rawChunk of stream) {
      for (const [nodeName, nodeState] of Object.entries<any>(rawChunk)) {
        if (nodeName === "model_request") {
          const msgs = nodeState?.messages; const msg = Array.isArray(msgs) ? msgs[msgs.length - 1] : undefined
          if (msg?.content !== undefined || msg?.tool_calls?.length) {
            step++; lastMsg = msg
            if (msg.content && typeof msg.content === "string")
              console.log(`[LLM Agent] 步骤${step} - 模型输出: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? "..." : ""}`)
            if (msg?.tool_calls?.length)
              for (const tc of msg.tool_calls)
                console.log(`[LLM Agent] 步骤${step} - 调用工具: ${tc.name}(${JSON.stringify(tc.args).substring(0, 300)})`)
          }
        } else if (nodeName === "tools") {
          const msgs = nodeState?.messages; const msg = Array.isArray(msgs) ? msgs[msgs.length - 1] : undefined
          if (msg?.content) {
            const resultStr = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
            console.log(`[LLM Agent] 工具结果 (${msg.name || "unknown"}): ${resultStr.substring(0, 300)}${resultStr.length > 300 ? "..." : ""}`)
          }
        }
      }
    }
    return { content: lastMsg?.content?.toString() || "", tokenUsage: extractTokenUsage(lastMsg) }
  }

  // 无工具：直接 invoke
  const r = await agent.invoke({ messages }, { configurable: { thread_id: tid }, recursionLimit: rl, signal: options?.signal })
  const lm = r.messages[r.messages.length - 1]
  return { content: lm.content.toString(), tokenUsage: extractTokenUsage(lm) }
}

export async function callLLMWithTracking(ctx: CallLLMCtx): Promise<string> {
  const { executionId = '', nodeId, llmConfig } = ctx
  const provider = llmConfig.provider
  const model = llmConfig.model
  const { content, tokenUsage } = await callLLM(ctx)
  if (tokenUsage) {
    import('../models').then(({ UsageLogModel }) => {
      UsageLogModel.create({
        executionId, nodeId, provider, model,
        promptTokens: tokenUsage.promptTokens,
        completionTokens: tokenUsage.completionTokens,
        totalTokens: tokenUsage.totalTokens,
      }).catch(err => console.error('[TokenUsage] 记录失败:', err))
    }).catch(() => { })
  }
  return content
}