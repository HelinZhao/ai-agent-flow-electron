import { BaseMessage, HumanMessage } from '@langchain/core/messages'
import { ApiConfig, LLMConfig } from './types'
import { ChatOpenAI } from '@langchain/openai'
import { exec, spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import iconv from 'iconv-lite'
import jschardet from 'jschardet'
import { createAgent, humanInTheLoopMiddleware } from "langchain"
import { MemorySaver } from "@langchain/langgraph"
import { Command } from "@langchain/langgraph"
import { getToolsByIds } from './tools'
import { app } from 'electron'

export interface HITLRequest {
  actionRequests: { name: string; args: Record<string, any>; description: string }[]
  reviewConfigs: { actionName: string; allowedDecisions: string[] }[]
}

export interface HITLDecision {
  type: 'approve' | 'reject'
  message?: string
}

export interface HITLResponse {
  decisions: HITLDecision[]
}

export interface CallLLMOptions {
  approvalCallback?: (request: HITLRequest) => Promise<HITLResponse>
}

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
  options?: CallLLMOptions
): Promise<string> => {
  const maxAttempts = 5
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await callLLMOnce(prompt, llmConfig, conversationHistory, enabledTools, attempt, options)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (!isRetryableError(lastError) || attempt >= maxAttempts) {
        throw lastError
      }
      // 429 限流需要更长等待，指数退避：30s, 60s, 120s, 240s
      const waitSeconds = Math.min(30 * Math.pow(2, attempt - 1), 240)
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
  options?: CallLLMOptions
): Promise<string> => {
  const hasTools = enabledTools.length > 0
  const effectiveMaxTokens = hasTools
    ? Math.max(llmConfig.maxTokens || 2000, 4096)
    : (llmConfig.maxTokens || 2000)

  const llm = new ChatOpenAI({
    model: llmConfig.model,
    temperature: llmConfig.temperature || 0.7,
    maxTokens: effectiveMaxTokens,
    maxRetries: 6,
    apiKey: llmConfig.apiKey,
    configuration: {
      baseURL: getLLMEndpoint(llmConfig)
    },
  })

  const tools = getToolsByIds(enabledTools)

  // 构建 HITL 中间件：危险工具需要审批，安全工具自动放行
  const needsApproval = enabledTools.some(t => ['writeFile', 'executeCommand', 'httpRequest'].includes(t))
  const useHITL = hasTools && needsApproval && options?.approvalCallback

  const interruptOn: Record<string, boolean> = {}
  if (useHITL) {
    for (const toolId of enabledTools) {
      // 危险工具拦截，安全工具自动放行
      interruptOn[toolId] = ['writeFile', 'executeCommand', 'httpRequest'].includes(toolId)
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

  const lastContent = conversationHistory[conversationHistory.length - 1]?.content
  const lastContentStr = typeof lastContent === 'string'
    ? lastContent
    : Array.isArray(lastContent)
      ? lastContent.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join('\n')
      : ''

  const messages = prompt !== lastContentStr
    ? [...conversationHistory, new HumanMessage(prompt)]
    : conversationHistory

  const recursionLimit = hasTools ? 50 : 25

  if (attempt > 1) console.log(`[LLM Agent] 第${attempt}次重试开始`)

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

    for await (const chunk of stream) {
      for (const [nodeName, nodeState] of Object.entries(chunk)) {
        if (nodeName === 'agent') {
          const msg = nodeState?.messages?.[nodeState.messages.length - 1]
          if (msg) {
            stepCount++
            lastAgentMsg = msg
            if (msg.content && typeof msg.content === 'string') {
              console.log(`[LLM Agent] 步骤${stepCount} - 模型输出: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`)
            }
            const toolCalls = (msg as any).tool_calls
            if (toolCalls && toolCalls.length > 0) {
              for (const tc of toolCalls) {
                console.log(`[LLM Agent] 步骤${stepCount} - 调用工具: ${tc.name}(${JSON.stringify(tc.args).substring(0, 300)})`)
              }
            }
          }
        } else if (nodeName === 'tools') {
          const msg = nodeState?.messages?.[nodeState.messages.length - 1]
          if (msg && msg.content) {
            const resultStr = typeof msg.content === 'string'
              ? msg.content
              : JSON.stringify(msg.content)
            console.log(`[LLM Agent] 工具结果 (${msg.name || 'unknown'}): ${resultStr.substring(0, 300)}${resultStr.length > 300 ? '...' : ''}`)
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

export const executeApiCall = async (apiConfig: ApiConfig): Promise<any> => {
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

// Buffer 编码解码：jschardet 自动检测 + iconv-lite 解码
const decodeBuffer = (buf: Buffer): string => {
  if (buf.length === 0) return ''
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    return buf.subarray(3).toString('utf-8')
  }
  const detected = jschardet.detect(buf.toString('binary'))
  const encoding = detected.encoding || 'utf-8'
  if (encoding === 'ascii' || encoding === 'UTF-8') {
    return buf.toString('utf-8')
  }
  return iconv.decode(buf, encoding)
}

// spawn 执行并收集输出（用于 npm/pip/node/python 模板）
const spawnWithOutput = (cmd: string, args: string[], options: { cwd?: string; timeout?: number }): Promise<{ stdout: string; stderr: string; exitCode: number | null }> => {
  const timeoutMs = (options.timeout || 30) * 1000
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd || process.cwd(),
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })

    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []

    child.stdout?.on('data', (data: Buffer) => stdoutChunks.push(data))
    child.stderr?.on('data', (data: Buffer) => stderrChunks.push(data))

    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`命令执行超时 (超过 ${options.timeout || 30} 秒)`))
    }, timeoutMs)

    child.on('close', (code: number | null) => {
      clearTimeout(timer)
      resolve({
        stdout: decodeBuffer(Buffer.concat(stdoutChunks)),
        stderr: decodeBuffer(Buffer.concat(stderrChunks)),
        exitCode: code,
      })
    })

    child.on('error', (err: Error) => {
      clearTimeout(timer)
      reject(new Error(`命令启动失败: ${err.message}`))
    })
  })
}

// 预设模板：Node.js 函数固化实现，跨平台兼容
export const executeCliTemplate = async (
  templateId: string,
  templateVariables: Record<string, string>,
  options: { workingDirectory?: string; timeout?: number }
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> => {
  const cwd = options.workingDirectory || process.cwd()
  const timeout = options.timeout || 30

  switch (templateId) {
    case 'npm_install': {
      const packageName = templateVariables.packageName || ''
      if (!packageName) throw new Error('请输入包名')
      return spawnWithOutput('npm', ['install', packageName], { cwd, timeout })
    }

    case 'pip_install': {
      const packageName = templateVariables.packageName || ''
      if (!packageName) throw new Error('请输入包名')
      return spawnWithOutput('pip', ['install', packageName], { cwd, timeout })
    }

    case 'read_file': {
      const filePath = templateVariables.filePath || ''
      if (!filePath) throw new Error('请输入文件路径')
      const resolved = path.resolve(cwd, filePath)
      const content = await fs.readFile(resolved, 'utf-8')
      return { stdout: content, stderr: '', exitCode: 0 }
    }

    case 'write_file': {
      const filePath = templateVariables.filePath || ''
      const content = templateVariables.content || ''
      if (!filePath) throw new Error('请输入文件路径')
      const resolved = path.resolve(cwd, filePath)
      await fs.writeFile(resolved, content, 'utf-8')
      return { stdout: `已写入文件: ${resolved}`, stderr: '', exitCode: 0 }
    }

    case 'list_dir': {
      const dirPath = templateVariables.dirPath || ''
      if (!dirPath) throw new Error('请输入目录路径')
      const resolved = path.resolve(cwd, dirPath)
      const entries = await fs.readdir(resolved, { withFileTypes: true })
      const lines = entries.map(e => {
        const typeLabel = e.isDirectory() ? '[目录]' : e.isFile() ? '[文件]' : '[其他]'
        return `${typeLabel} ${e.name}`
      })
      return { stdout: lines.join('\n'), stderr: '', exitCode: 0 }
    }

    case 'run_node': {
      const scriptPath = templateVariables.scriptPath || ''
      if (!scriptPath) throw new Error('请输入脚本路径')
      const resolved = path.resolve(cwd, scriptPath)
      return spawnWithOutput('node', [resolved], { cwd, timeout })
    }

    case 'run_python': {
      const scriptPath = templateVariables.scriptPath || ''
      if (!scriptPath) throw new Error('请输入脚本路径')
      const resolved = path.resolve(cwd, scriptPath)
      return spawnWithOutput('python', [resolved], { cwd, timeout })
    }

    default:
      throw new Error(`未知的预设模板: ${templateId}`)
  }
}

// 自定义命令：shell 执行
const BLOCKED_COMMAND_PATTERNS = [
  /rm\s+-rf\s+\/\s*$/,
  /mkfs/,
  /format\s+[a-z]:/i,
  /shutdown/,
  /reboot/,
  /dd\s+if=/,
  /:\s*\(\s*\)\s*\{\s*:\s*\|\s*&\s*\}\s*;/,
]

const WARNING_COMMAND_PATTERNS = [
  /rm\s+/,
  /chmod\s+/,
  /sudo\s+/,
  />\s*\/dev\//,
  /curl\s+.*\|\s*(sh|bash)/,
  /wget\s+.*\|\s*(sh|bash)/,
]

interface CliExecutionOptions {
  command: string
  workingDirectory?: string
  timeout?: number
}

export const executeCliCommand = async (options: CliExecutionOptions): Promise<{
  stdout: string
  stderr: string
  exitCode: number | null
}> => {
  const { command, workingDirectory, timeout } = options

  for (const pattern of BLOCKED_COMMAND_PATTERNS) {
    if (pattern.test(command)) {
      throw new Error(`命令被安全策略阻止: "${command}" 匹配了危险命令模式`)
    }
  }

  for (const pattern of WARNING_COMMAND_PATTERNS) {
    if (pattern.test(command)) {
      console.warn(`[CLI安全警告] 执行可能危险的命令: "${command}"`)
    }
  }

  const timeoutMs = (timeout || 30) * 1000

  return new Promise((resolve, reject) => {
    exec(command, {
      cwd: workingDirectory || process.cwd(),
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 10,
      windowsHide: true,
      encoding: 'buffer',
    }, (error, stdoutBuf, stderrBuf) => {
      if (error && error.killed) {
        reject(new Error(`命令执行超时 (超过 ${timeout || 30} 秒)`))
        return
      }

      resolve({
        stdout: decodeBuffer(stdoutBuf as Buffer),
        stderr: decodeBuffer(stderrBuf as Buffer),
        exitCode: error ? (error.code as number) || 1 : 0,
      })
    })
  })
}

// 获取数据目录
export const getDataDir = (subPath?: string): string => {
  if (app.isPackaged) {
    return path.join(path.dirname(process.execPath), `data${subPath}`)
  } else {
    return path.join(`./data${subPath}`) // 开发时
  }
}