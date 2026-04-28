import { tool } from 'langchain'
import { z } from 'zod'
import * as fs from 'fs/promises'
import * as path from 'path'
import { spawn } from 'child_process'
import * as iconv from 'iconv-lite'
import * as jschardet from 'jschardet'

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

const spawnWithOutput = (cmd: string, args: string[], cwd?: string, timeout?: number): Promise<string> => {
  const timeoutMs = (timeout || 30) * 1000
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: cwd || process.cwd(), windowsHide: true })
    const chunks: Buffer[] = []
    const errChunks: Buffer[] = []
    child.stdout?.on('data', (d: Buffer) => chunks.push(d))
    child.stderr?.on('data', (d: Buffer) => errChunks.push(d))
    const timer = setTimeout(() => { child.kill(); reject(new Error('执行超时')) }, timeoutMs)
    child.on('close', () => {
      clearTimeout(timer)
      const stdout = decodeBuffer(Buffer.concat(chunks))
      const stderr = decodeBuffer(Buffer.concat(errChunks))
      resolve(stderr ? `${stdout}\n[stderr]: ${stderr}` : stdout)
    })
    child.on('error', (err) => { clearTimeout(timer); reject(err) })
  })
}

// tool() API: tool(func, { name, description, schema })
export const readFileTool = tool(
  async ({ filePath }: { filePath: string }) => {
    const resolved = path.resolve(filePath)
    const content = await fs.readFile(resolved, 'utf-8')
    return content.length > 5000 ? content.substring(0, 5000) + '\n...(内容过长，已截断)' : content
  },
  {
    name: 'readFile',
    description: '读取指定文件的内容，返回 UTF-8 文本',
    schema: z.object({ filePath: z.string().describe('文件路径') }),
  }
)

export const writeFileTool = tool(
  async ({ filePath, content }: { filePath: string; content: string }) => {
    const resolved = path.resolve(filePath)
    await fs.mkdir(path.dirname(resolved), { recursive: true })
    await fs.writeFile(resolved, content, 'utf-8')
    return `已写入文件: ${resolved} (${content.length} 字符)`
  },
  {
    name: 'writeFile',
    description: '将内容写入指定文件，以 UTF-8 编码保存',
    schema: z.object({
      filePath: z.string().describe('文件路径'),
      content: z.string().describe('要写入的内容'),
    }),
  }
)

export const listDirectoryTool = tool(
  async ({ dirPath }: { dirPath: string }) => {
    const resolved = path.resolve(dirPath)
    const entries = await fs.readdir(resolved, { withFileTypes: true })
    return entries.map(e => `${e.isDirectory() ? '[目录]' : e.isFile() ? '[文件]' : '[其他]'} ${e.name}`).join('\n')
  },
  {
    name: 'listDirectory',
    description: '列出指定目录下的文件和子目录',
    schema: z.object({ dirPath: z.string().describe('目录路径') }),
  }
)

export const executeCommandTool = tool(
  async ({ command, timeout }: { command: string; timeout?: number }) => {
    const blocked = [/rm\s+-rf\s+\/\s*$/, /mkfs/, /format\s+[a-z]:/i, /shutdown/, /reboot/, /dd\s+if=/]
    for (const p of blocked) {
      if (p.test(command)) return `命令被安全策略阻止: "${command}"`
    }
    const isWin = process.platform === 'win32'
    if (isWin) {
      return spawnWithOutput('cmd.exe', ['/d', '/s', '/c', command], process.cwd(), timeout || 30)
    }
    return spawnWithOutput('/bin/sh', ['-c', command], process.cwd(), timeout || 30)
  },
  {
    name: 'executeCommand',
    description: '执行一条 shell 命令并返回输出结果。可用于安装依赖、运行脚本等操作。',
    schema: z.object({
      command: z.string().describe('要执行的命令'),
      timeout: z.number().optional().describe('超时秒数，默认30'),
    }),
  }
)

export const httpRequestTool = tool(
  async ({ url, method, headers, body }: { url: string; method: string; headers?: string; body?: string }) => {
    const parsedHeaders = headers ? JSON.parse(headers) : {}
    const opts: any = { method, headers: parsedHeaders }
    if (body && (method === 'POST' || method === 'PUT')) opts.body = body
    const resp = await fetch(url, opts)
    const text = await resp.text()
    return text.length > 5000 ? text.substring(0, 5000) + '\n...(响应过长，已截断)' : text
  },
  {
    name: 'httpRequest',
    description: '发送 HTTP 请求并返回响应内容。支持 GET、POST、PUT、DELETE 方法。',
    schema: z.object({
      url: z.string().describe('请求 URL'),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET').describe('HTTP 方法'),
      headers: z.string().optional().describe('请求头 JSON，如 {"Content-Type":"application/json"}'),
      body: z.string().optional().describe('请求体（JSON 字符串）'),
    }),
  }
)

export const webSearchTool = tool(
  async ({ query }: { query: string }) => {
    console.log(999)
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const html = await resp.text()
    const results: string[] = []
    const linkRegex = /<a[^>]*class="result__a"[^>]*>([^<]+)<\/a>/gi
    let match
    while ((match = linkRegex.exec(html)) !== null && results.length < 5) {
      const title = match[1].trim()
      const afterIndex = match.index + match[0].length
      const snippet = html.substring(afterIndex, afterIndex + 200)
        .replace(/<[^>]+>/g, '').trim().substring(0, 150)
      results.push(`${title}\n${snippet}`)
    }
    return results.length > 0
      ? `搜索结果:\n${results.join('\n\n')}`
      : '未找到相关搜索结果'
  },
  {
    name: 'webSearch',
    description: '搜索网页获取信息。通过 DuckDuckGo 搜索引擎返回相关结果摘要。',
    schema: z.object({ query: z.string().describe('搜索关键词') }),
  }
)

const ALL_TOOLS: Record<string, any> = {
  readFile: readFileTool,
  writeFile: writeFileTool,
  listDirectory: listDirectoryTool,
  executeCommand: executeCommandTool,
  httpRequest: httpRequestTool,
  webSearch: webSearchTool,
}

export const getToolsByIds = (ids: string[]): any[] => {
  return ids.map(id => ALL_TOOLS[id]).filter(Boolean)
}

export const TOOL_DEFINITIONS = [
  { id: 'readFile', label: '读取文件', description: '读取指定文件内容' },
  { id: 'writeFile', label: '写入文件', description: '将内容写入指定文件' },
  { id: 'listDirectory', label: '列出目录', description: '列出目录下的文件和子目录' },
  { id: 'executeCommand', label: '执行命令', description: '执行 shell 命令' },
  { id: 'httpRequest', label: 'HTTP请求', description: '发送 HTTP 请求' },
  { id: 'webSearch', label: '网页搜索', description: '搜索网页获取信息' },
]