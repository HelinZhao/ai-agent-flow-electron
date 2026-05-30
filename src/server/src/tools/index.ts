import { tool } from 'langchain'
import { z } from 'zod'
import * as fs from 'fs/promises'
import * as path from 'path'
import { execa } from 'execa'
import { TOOL_EXECUTION_TIMEOUT, TOOL_READ_FILE_MAX_CHARS, TOOL_HTTP_MAX_CHARS, TOOL_WEB_SEARCH_MAX_RESULTS, TOOL_WEB_SEARCH_SNIPPET_LENGTH, WEB_SEARCH_USER_AGENT, SERVER_PORT } from '../config'
import { changeNotifier } from '../utils/dataChangeNotifier'
import { getUserDataDir } from '../utils/file'
import { mcpConnectionManager } from '../mcp'
import {
  WORKFLOWS_API_DESCRIPTION,
  AGENTS_SKILLS_API_DESCRIPTION,
  KNOWLEDGE_API_DESCRIPTION,
  CONFIG_API_DESCRIPTION,
  TEAMS_API_DESCRIPTION,
  TASKS_API_DESCRIPTION,
} from './api-descriptions'

// 当前平台信息（用于工具描述，避免 LLM 用错路径格式和用户名）
const CURRENT_USER = process.env.USERNAME || process.env.USER || '用户名'
const PLATFORM_HINT = process.platform === 'win32'
  ? `当前运行在 Windows 系统，当前用户名是 ${CURRENT_USER}。文件路径应使用 Windows 格式（如 C:\\Users\\${CURRENT_USER}\\Desktop\\file.txt），命令使用 cmd.exe 语法。`
  : `当前运行在 Linux/Mac 系统，当前用户名是 ${CURRENT_USER}。文件路径应使用 Unix 格式（如 /home/${CURRENT_USER}/Desktop/file.txt），命令使用 sh 语法。`

// 路径归一化：Windows 上将 Unix 风格绝对路径转为 Windows 路径
function normalizePath(filePath: string): string {
  if (process.platform !== 'win32') return filePath
  const userMatch = filePath.match(/^\/Users\/([^/]+)\/(.+)$/)
  if (userMatch) {
    return path.join(process.env.USERPROFILE || `C:\\Users\\${userMatch[1]}`, userMatch[2])
  }
  const homeMatch = filePath.match(/^\/home\/([^/]+)\/(.+)$/)
  if (homeMatch) {
    return path.join(process.env.USERPROFILE || `C:\\Users\\${homeMatch[1]}`, homeMatch[2])
  }
  return filePath
}

// 工具执行的工作目录（用户数据目录，以保证写入权限）
export const getToolWorkingDir = (): string => getUserDataDir('/tools')

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
    const effectiveTimeout = (timeout || TOOL_EXECUTION_TIMEOUT) * 1000
    try {
      const { stdout, stderr } = await execa(command, { shell: true, timeout: effectiveTimeout, reject: false, encoding: 'utf8' })
      return stdout || stderr || '命令执行完成，无输出'
    } catch (error) {
      return `命令执行失败: ${error instanceof Error ? error.message : String(error)}`
    }
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
    const url = `https://cn.bing.com/search?q=${encodeURIComponent(query)}&mkt=zh-CN`
    const resp = await fetch(url, { headers: { 'User-Agent': WEB_SEARCH_USER_AGENT } })
    const html = await resp.text()
    const results: string[] = []
    // Bing 搜索结果解析：<li class="b_algo"> 内 <h2><a>标题</a></h2> + <p>摘要</p>
    const blockRegex = /<li[^>]*class="b_algo"[^>]*>[\s\S]*?<h2[^>]*><a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a><\/h2>[\s\S]*?<p[^>]*class="b_lineclamp2"[^>]*>([\s\S]*?)<\/p>/gi
    let match
    while ((match = blockRegex.exec(html)) !== null && results.length < TOOL_WEB_SEARCH_MAX_RESULTS) {
      const [, , rawTitle, rawSnippet] = match
      const title = rawTitle.replace(/<[^>]+>/g, '').trim()
      if (!title) continue
      const snippet = rawSnippet.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, TOOL_WEB_SEARCH_SNIPPET_LENGTH)
      results.push(`${title}\n${snippet}`)
    }
    return results.length > 0
      ? `搜索结果:\n${results.join('\n\n')}`
      : '未找到相关搜索结果'
  },
  {
    name: 'webSearch',
    description: '搜索网页获取信息。通过 Bing 搜索引擎返回相关结果摘要。',
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
  if (path.includes('/api/mcp-servers')) return 'mcp-servers'
  if (path.includes('/api/teams')) return 'teams'
  if (path.includes('/api/tasks')) return 'tasks'
  return null
}

const callInternalApi = async (method: string, path: string, body?: string): Promise<string> => {
  const opts: any = { method, headers: { 'Content-Type': 'application/json' } }
  if (body && (method === 'POST' || method === 'PUT')) {
    // 确保 body 是合法 JSON，重新序列化避免 LLM 生成不规范的 JSON
    try {
      opts.body = JSON.stringify(JSON.parse(body))
    } catch {
      return `JSON 解析错误：LLM 生成的请求体不是合法的 JSON 格式，请修正后重试。前100字符: ${body.substring(0, 100)}`
    }
  }
  const url = `http://127.0.0.1:${SERVER_PORT}${path}`
  console.log(`[API工具] ${method} ${path} bodyLen=${body?.length || 0}`)
  try {
    const resp = await fetch(url, opts)
    const text = await resp.text()
    console.log(`[API工具] 响应 ${resp.status} ${method} ${path} 长度=${text.length}`)
    if (method !== 'GET' && resp.ok) {
      const resource = inferResource(path)
      if (resource) changeNotifier.emitChange(resource as any)
    }
    return text.length > TOOL_HTTP_MAX_CHARS
      ? text.substring(0, TOOL_HTTP_MAX_CHARS) + '\n...(响应过长，已截断)'
      : text
  } catch (err) {
    console.error(`[API工具] 失败 ${method} ${url}: ${err instanceof Error ? err.message : String(err)}`)
    return `API 调用失败: ${err instanceof Error ? err.message : String(err)}`
  }
}

// ===== 内部 API 工具（按领域分组，使 LLM 可调用本项目的 REST API） =====

export const workflowsApiTool = tool(
  async ({ method, path, body }: { method: string; path: string; body?: string }) =>
    callInternalApi(method, path, body),
  {
    name: 'workflowsApi',
    description: WORKFLOWS_API_DESCRIPTION,
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
    description: AGENTS_SKILLS_API_DESCRIPTION,
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
    description: KNOWLEDGE_API_DESCRIPTION,
    schema: z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).describe('HTTP 方法'),
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
    description: CONFIG_API_DESCRIPTION,
    schema: z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).describe('HTTP 方法'),
      path: z.string().describe('API 路径'),
      body: z.string().optional().describe('JSON 请求体（POST/PUT 时需要）'),
    }),
  }
)

export const teamsApiTool = tool(
  async ({ method, path, body }: { method: string; path: string; body?: string }) =>
    callInternalApi(method, path, body),
  {
    name: 'teamsApi',
    description: TEAMS_API_DESCRIPTION,
    schema: z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).describe('HTTP 方法'),
      path: z.string().describe('API 路径，如 /api/teams 或 /api/teams/some-id'),
      body: z.string().optional().describe('JSON 请求体（POST/PUT 时需要）'),
    }),
  }
)

export const tasksApiTool = tool(
  async ({ method, path, body }: { method: string; path: string; body?: string }) =>
    callInternalApi(method, path, body),
  {
    name: 'tasksApi',
    description: TASKS_API_DESCRIPTION,
    schema: z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).describe('HTTP 方法'),
      path: z.string().describe('API 路径，如 /api/tasks 或 /api/tasks/some-id'),
      body: z.string().optional().describe('JSON 请求体（POST/PUT 时需要）'),
    }),
  }
)

export const readSkillTool = tool(
  async ({ skillId }: { skillId: string }) => {
    try {
      const resp = await fetch(`http://127.0.0.1:${SERVER_PORT}/api/skills/${skillId}`)
      if (!resp.ok) return `获取技能失败: HTTP ${resp.status}`
      const skill = await resp.json()
      return `名称: ${skill.name}\n描述: ${skill.description}\n内容:\n${skill.content}`
    } catch (err) {
      return `获取技能失败: ${err instanceof Error ? err.message : String(err)}`
    }
  },
  {
    name: 'readSkill',
    description: `读取指定 ID 的技能的完整内容（名称、描述、正文）。当你需要了解某个技能的详细内容时调用此工具。`,
    schema: z.object({
      skillId: z.string().describe('技能的 ID'),
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
  teamsApi: teamsApiTool,
  tasksApi: tasksApiTool,
  knowledgeApi: knowledgeApiTool,
  configApi: configApiTool,
  readSkill: readSkillTool,
}

export const getToolsByIds = (ids: string[]): any[] => {
  const builtinTools = ids.map(id => ALL_TOOLS[id]).filter(Boolean)
  const mcpIds = ids.filter(id => id.startsWith('mcp_'))
  const mcpTools = mcpIds
    .map(id => mcpConnectionManager.getMcpToolById(id))
    .filter(Boolean)
  return [...builtinTools, ...mcpTools]
}

export interface ToolDefinition {
  id: string
  label: string
  description: string
}

/** 合并内置工具和 MCP 工具的所有定义 */
export const getAllToolDefinitions = (): ToolDefinition[] => {
  const mcpDefs = mcpConnectionManager.getMcpToolDefinitions()
  return [...TOOL_DEFINITIONS, ...mcpDefs]
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  { id: 'readFile', label: '读取文件', description: '读取指定文件内容' },
  { id: 'writeFile', label: '写入文件', description: '将内容写入指定文件' },
  { id: 'listDirectory', label: '列出目录', description: '列出目录下的文件和子目录' },
  { id: 'executeCommand', label: '执行命令', description: '执行 shell 命令' },
  { id: 'httpRequest', label: 'HTTP请求', description: '发送 HTTP 请求' },
  { id: 'webSearch', label: '网页搜索', description: '搜索网页获取信息' },
  { id: 'workflowsApi', label: '工作流API', description: '调用工作流和执行管理接口' },
  { id: 'agentsSkillsApi', label: 'Agent/技能API', description: '调用 Agent 和技能管理接口' },
  { id: 'teamsApi', label: '团队API', description: '调用团队管理接口，管理 Agent 团队及其协作模式' },
  { id: 'tasksApi', label: '任务API', description: '调用任务池管理接口，创建、指派、终止任务' },
  { id: 'knowledgeApi', label: '知识库API', description: '调用知识库管理接口' },
  { id: 'configApi', label: '系统配置API', description: '调用 LLM 配置、触发器、系统设置接口' },
  { id: 'readSkill', label: '读取技能', description: '读取指定技能的完整内容' },
]