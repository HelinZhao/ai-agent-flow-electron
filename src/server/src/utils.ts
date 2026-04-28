import { BaseMessage, HumanMessage } from '@langchain/core/messages'
import { ApiConfig, LLMConfig } from './types'
import { ChatOpenAI } from '@langchain/openai'
import { exec, spawn } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as iconv from 'iconv-lite'
import * as jschardet from 'jschardet'

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
      configuration: {
        baseURL: getLLMEndpoint(llmConfig)
      }
    })
    const response = await llm.invoke([...conversationHistory, new HumanMessage(prompt)])
    return response.content.toString()
  } catch (error) {
    throw new Error(`LLM调用错误: ${error instanceof Error ? error.message : '未知错误'}`)
  }
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