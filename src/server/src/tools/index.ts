import { tool } from 'langchain'
import { z } from 'zod'
import * as fs from 'fs/promises'
import * as path from 'path'
import { spawn } from 'child_process'
import * as iconv from 'iconv-lite'
import * as jschardet from 'jschardet'
import { DUCKDUCKGO_URL, TOOL_EXECUTION_TIMEOUT, TOOL_READ_FILE_MAX_CHARS, TOOL_HTTP_MAX_CHARS, TOOL_WEB_SEARCH_MAX_RESULTS, TOOL_WEB_SEARCH_SNIPPET_LENGTH, WEB_SEARCH_USER_AGENT, SERVER_PORT } from '../config'
import { changeNotifier } from '../utils/dataChangeNotifier'
import { getUserDataDir } from '../utils/file'

// 当前平台信息（用于工具描述，避免 LLM 用错路径格式和用户名）
const CURRENT_USER = process.env.USERNAME || process.env.USER || '用户名'
const PLATFORM_HINT = process.platform === 'win32'
  ? `当前运行在 Windows 系统，当前用户名是 ${CURRENT_USER}。文件路径应使用 Windows 格式（如 C:\\Users\\${CURRENT_USER}\\Desktop\\file.txt），命令使用 cmd.exe 语法。`
  : `当前运行在 Linux/Mac 系统，当前用户名是 ${CURRENT_USER}。文件路径应使用 Unix 格式（如 /home/${CURRENT_USER}/Desktop/file.txt），命令使用 sh 语法。`

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

// 路径归一化：Windows 上将 Unix 风格绝对路径转为 Windows 路径
function normalizePath(filePath: string): string {
  if (process.platform !== 'win32') return filePath
  // /Users/xxx/... → C:\Users\xxx\...
  const userMatch = filePath.match(/^\/Users\/([^/]+)\/(.+)$/)
  if (userMatch) {
    return path.join(process.env.USERPROFILE || `C:\\Users\\${userMatch[1]}`, userMatch[2])
  }
  // /home/xxx/... → C:\Users\xxx\...（WSL 兼容）
  const homeMatch = filePath.match(/^\/home\/([^/]+)\/(.+)$/)
  if (homeMatch) {
    return path.join(process.env.USERPROFILE || `C:\\Users\\${homeMatch[1]}`, homeMatch[2])
  }
  return filePath
}

// 工具执行的工作目录（用户数据目录，以保证写入权限）
export const getToolWorkingDir = (): string => getUserDataDir('/tools')

const spawnWithOutput = (cmd: string, args: string[], cwd?: string, timeout?: number): Promise<string> => {
  const timeoutMs = (timeout || TOOL_EXECUTION_TIMEOUT) * 1000
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
    const normalized = normalizePath(filePath)
    const resolved = path.isAbsolute(normalized) ? normalized : path.join(getToolWorkingDir(), normalized)
    const content = await fs.readFile(resolved, 'utf-8')
    return content.length > TOOL_READ_FILE_MAX_CHARS ? content.substring(0, TOOL_READ_FILE_MAX_CHARS) + '\n...(内容过长，已截断)' : content
  },
  {
    name: 'readFile',
    description: `读取指定文件的内容，返回 UTF-8 文本。${PLATFORM_HINT}`,
    schema: z.object({ filePath: z.string().describe(`文件路径。${PLATFORM_HINT}`) }),
  }
)

export const writeFileTool = tool(
  async ({ filePath, content }: { filePath: string; content: string }) => {
    const normalized = normalizePath(filePath)
    const resolved = path.isAbsolute(normalized) ? normalized : path.join(getToolWorkingDir(), normalized)
    const dir = path.dirname(resolved)
    try {
      await fs.access(dir)
    } catch {
      await fs.mkdir(dir, { recursive: true })
    }
    await fs.writeFile(resolved, content, 'utf-8')
    return `已写入文件: ${resolved} (${content.length} 字符)`
  },
  {
    name: 'writeFile',
    description: `将内容写入指定文件，以 UTF-8 编码保存。${PLATFORM_HINT}`,
    schema: z.object({
      filePath: z.string().describe(`文件路径。${PLATFORM_HINT}`),
      content: z.string().describe('要写入的内容'),
    }),
  }
)

export const listDirectoryTool = tool(
  async ({ dirPath }: { dirPath: string }) => {
    const normalized = normalizePath(dirPath)
    const resolved = path.isAbsolute(normalized) ? normalized : path.join(getToolWorkingDir(), normalized)
    const entries = await fs.readdir(resolved, { withFileTypes: true })
    return entries.map(e => `${e.isDirectory() ? '[目录]' : e.isFile() ? '[文件]' : '[其他]'} ${e.name}`).join('\n')
  },
  {
    name: 'listDirectory',
    description: `列出指定目录下的文件和子目录。${PLATFORM_HINT}`,
    schema: z.object({ dirPath: z.string().describe(`目录路径。${PLATFORM_HINT}`) }),
  }
)

export const executeCommandTool = tool(
  async ({ command, timeout }: { command: string; timeout?: number }) => {
    const blocked = [/rm\s+-rf\s+\/\s*$/, /mkfs/, /format\s+[a-z]:/i, /shutdown/, /reboot/, /dd\s+if=/]
    for (const p of blocked) {
      if (p.test(command)) return `命令被安全策略阻止: "${command}"`
    }
    const effectiveTimeout = timeout || TOOL_EXECUTION_TIMEOUT
    const isWin = process.platform === 'win32'
    if (isWin) {
      return spawnWithOutput('cmd.exe', ['/d', '/s', '/c', command], undefined, effectiveTimeout)
    }
    return spawnWithOutput('/bin/sh', ['-c', command], undefined, effectiveTimeout)
  },
  {
    name: 'executeCommand',
    description: `执行一条 shell 命令并返回输出结果。可用于安装依赖、运行脚本等操作。对于耗时较长的命令（如 npm install、npx create-react-app 等），建议设置较大的 timeout 值（如 300 秒）。${PLATFORM_HINT}`,
    schema: z.object({
      command: z.string().describe('要执行的命令'),
      timeout: z.number().optional().describe(`超时秒数，默认${TOOL_EXECUTION_TIMEOUT}。耗时命令建议设为300或更大`),
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
    return text.length > TOOL_HTTP_MAX_CHARS ? text.substring(0, TOOL_HTTP_MAX_CHARS) + '\n...(响应过长，已截断)' : text
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
    const url = `${DUCKDUCKGO_URL}?q=${encodeURIComponent(query)}`
    const resp = await fetch(url, { headers: { 'User-Agent': WEB_SEARCH_USER_AGENT } })
    const html = await resp.text()
    const results: string[] = []
    const linkRegex = /<a[^>]*class="result__a"[^>]*>([^<]+)<\/a>/gi
    let match
    while ((match = linkRegex.exec(html)) !== null && results.length < TOOL_WEB_SEARCH_MAX_RESULTS) {
      const title = match[1].trim()
      const afterIndex = match.index + match[0].length
      const snippet = html.substring(afterIndex, afterIndex + 200)
        .replace(/<[^>]+>/g, '').trim().substring(0, TOOL_WEB_SEARCH_SNIPPET_LENGTH)
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

// ===== 内部 API 调用辅助函数 =====
const inferResource = (path: string): string | null => {
  if (path.includes('/api/workflows') || path.includes('/api/execute-workflow')) return 'workflows'
  if (path.includes('/api/agents')) return 'agents'
  if (path.includes('/api/skills')) return 'skills'
  if (path.includes('/api/knowledge-base')) return 'knowledge-base'
  if (path.includes('/api/llm-config')) return 'llm-config'
  if (path.includes('/api/triggers')) return 'triggers'
  return null
}

const callInternalApi = async (method: string, path: string, body?: string): Promise<string> => {
  const opts: any = { method, headers: { 'Content-Type': 'application/json' } }
  if (body && (method === 'POST' || method === 'PUT')) opts.body = body
  try {
    const resp = await fetch(`http://127.0.0.1:${SERVER_PORT}${path}`, opts)
    const text = await resp.text()
    // 写操作成功后通知前端数据已变更
    if (method !== 'GET' && resp.ok) {
      const resource = inferResource(path)
      if (resource) changeNotifier.emitChange(resource as any)
    }
    return text.length > TOOL_HTTP_MAX_CHARS
      ? text.substring(0, TOOL_HTTP_MAX_CHARS) + '\n...(响应过长，已截断)'
      : text
  } catch (err) {
    return `API 调用失败: ${err instanceof Error ? err.message : String(err)}`
  }
}

// ===== 内部 API 工具（按领域分组，使 LLM 可调用本项目的 REST API） =====

export const workflowsApiTool = tool(
  async ({ method, path, body }: { method: string; path: string; body?: string }) =>
    callInternalApi(method, path, body),
  {
    name: 'workflowsApi',
    description: `调用工作流和执行相关的内部 REST API。路径中的 {id} 需替换为实际 ID。

GET  /api/workflows                              - 获取全部工作流列表
POST /api/workflows                              - 创建工作流 body: {"name":"","description":"","nodes":[],"edges":[]}
GET  /api/workflows/{id}                         - 获取单个工作流详情
PUT  /api/workflows/{id}                         - 更新工作流
DEL  /api/workflows/{id}                         - 删除工作流
POST /api/execute-workflow/monitor               - 异步执行工作流 body: {"workflow":{},"input":""}
GET  /api/execute-workflow/progress/{executionId} - 获取执行进度
POST /api/execute-workflow/stop/{executionId}    - 停止执行
POST /api/execute-workflow/pause/{executionId}   - 暂停执行
POST /api/execute-workflow/resume/{executionId}  - 恢复执行
GET  /api/execute-workflow/list                  - 执行记录列表（?status=&page=&pageSize=）
POST /api/execute-workflow/agent-chat-monitor    - Agent 对话 body: {"agentId":"","input":"","threadId":"(可选)"}
DEL  /api/execute-workflow/delete-thread/{id}    - 清除 AI 记忆`,
    schema: z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).describe('HTTP 方法'),
      path: z.string().describe('API 路径，如 /api/workflows 或 /api/workflows/some-id'),
      body: z.string().optional().describe('JSON 请求体（POST/PUT 时需要）'),
    }),
  }
)

export const agentsSkillsApiTool = tool(
  async ({ method, path, body }: { method: string; path: string; body?: string }) =>
    callInternalApi(method, path, body),
  {
    name: 'agentsSkillsApi',
    description: `调用 Agent 和技能管理相关的内部 REST API。路径中的 {id} 需替换为实际 ID。

GET  /api/agents                     - 获取全部 Agent 列表
POST /api/agents                     - 创建 Agent body: {"name":"","description":"","instructions":"","workflowId":"(可选)"}
GET  /api/agents/{id}                - 获取单个 Agent 详情
PUT  /api/agents/{id}                - 更新 Agent
DEL  /api/agents/{id}                - 删除 Agent
GET  /api/skills                     - 获取全部技能列表
POST /api/skills                     - 创建技能 body: {"name":"","description":"","content":""}
GET  /api/skills/{id}                - 获取技能详情
PUT  /api/skills/{id}                - 更新技能
DEL  /api/skills/{id}                - 删除技能`,
    schema: z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).describe('HTTP 方法'),
      path: z.string().describe('API 路径，如 /api/agents 或 /api/agents/some-id'),
      body: z.string().optional().describe('JSON 请求体（POST/PUT 时需要）'),
    }),
  }
)

export const knowledgeApiTool = tool(
  async ({ method, path, body }: { method: string; path: string; body?: string }) =>
    callInternalApi(method, path, body),
  {
    name: 'knowledgeApi',
    description: `调用知识库管理相关的内部 REST API。路径中的 {id} 需替换为实际 ID。

GET  /api/knowledge-base              - 获取全部知识库列表
POST /api/knowledge-base              - 创建知识库 body: {"name":"","type":"internal","description":""}
GET  /api/knowledge-base/{id}/stats   - 知识库文档统计
DEL  /api/knowledge-base/{id}         - 删除知识库
POST /api/knowledge-base/{id}/retrieve - RAG 检索 body: {"query":"检索内容"}
GET  /api/knowledge-base/{id}/chunks/{docName} - 文档分块列表`,
    schema: z.object({
      method: z.enum(['GET', 'POST', 'DELETE']).describe('HTTP 方法'),
      path: z.string().describe('API 路径，如 /api/knowledge-base 或 /api/knowledge-base/id/retrieve'),
      body: z.string().optional().describe('JSON 请求体（POST 时需要）'),
    }),
  }
)

export const configApiTool = tool(
  async ({ method, path, body }: { method: string; path: string; body?: string }) =>
    callInternalApi(method, path, body),
  {
    name: 'configApi',
    description: `调用 LLM 配置、触发器、代理等系统设置相关的内部 REST API。路径中的 {id} 需替换为实际 ID。

GET  /api/llm-config                      - 获取所有 LLM 配置
POST /api/llm-config                      - 创建 LLM 配置 body: {"name":"","provider":"openai|anthropic|azure|bailian|deepseek|ollama","model":"","apiKey":"","baseUrl":"(可选)"}
POST /api/llm-config/{id}/activate        - 激活指定 LLM 配置
POST /api/llm-config/test-connection      - 测试连接 body: {"provider":"","apiKey":"","model":"","baseUrl":"(可选)"}
DEL  /api/llm-config/{id}                 - 删除 LLM 配置
GET  /api/proxy                           - 获取代理配置
PUT  /api/proxy                           - 更新代理 body: {"enabled":true,"host":"","port":""}
GET  /api/triggers                        - 获取触发器列表
POST /api/triggers                        - 创建触发器 body: {"name":"","type":"cron|webhook","cronExpression":"","workflowId":"","enabled":true}
POST /api/triggers/{id}/run               - 手动触发
GET  /api/data/db-stats                   - 数据库存储统计
POST /api/data/vacuum                     - 回收数据库空间
GET  /api/health                          - 健康检查`,
    schema: z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).describe('HTTP 方法'),
      path: z.string().describe('API 路径'),
      body: z.string().optional().describe('JSON 请求体（POST/PUT 时需要）'),
    }),
  }
)

const ALL_TOOLS: Record<string, any> = {
  readFile: readFileTool,
  writeFile: writeFileTool,
  listDirectory: listDirectoryTool,
  executeCommand: executeCommandTool,
  httpRequest: httpRequestTool,
  webSearch: webSearchTool,
  workflowsApi: workflowsApiTool,
  agentsSkillsApi: agentsSkillsApiTool,
  knowledgeApi: knowledgeApiTool,
  configApi: configApiTool,
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
  { id: 'workflowsApi', label: '工作流API', description: '调用工作流和执行管理接口' },
  { id: 'agentsSkillsApi', label: 'Agent/技能API', description: '调用 Agent 和技能管理接口' },
  { id: 'knowledgeApi', label: '知识库API', description: '调用知识库管理接口' },
  { id: 'configApi', label: '系统配置API', description: '调用 LLM 配置、触发器、系统设置接口' },
]