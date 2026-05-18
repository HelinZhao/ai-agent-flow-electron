import { tool } from 'langchain'
import { z } from 'zod'
import * as fs from 'fs/promises'
import * as path from 'path'
import { execa } from 'execa'
import { DUCKDUCKGO_URL, TOOL_EXECUTION_TIMEOUT, TOOL_READ_FILE_MAX_CHARS, TOOL_HTTP_MAX_CHARS, TOOL_WEB_SEARCH_MAX_RESULTS, TOOL_WEB_SEARCH_SNIPPET_LENGTH, WEB_SEARCH_USER_AGENT, SERVER_PORT } from '../config'
import { changeNotifier } from '../utils/dataChangeNotifier'
import { getUserDataDir } from '../utils/file'

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
    description: `调用工作流和执行相关的内部 REST API。路径中的 {id} 需替换为实际 ID。
节点类型及config结构:
  节点通用结构: {"id":"唯一id","type":"类型","position":{"x":0,"y":0},"data":{"label":"显示名","config":{...}}}
  start/end: 节点通用结构,但无需config
  llm:   config={"enabledTools":[],"prompt":"提示词","variables":[]}
  branch: config={"branches":[{"id":"b1","label":"分支A","condition":"条件"}]}
  skill: config={"skillId":"技能id","skillName":"技能名"}
  api:   config={"apiConfig":{"url":"https://...","method":"GET","headers":"","body":""}}
  agent: config={"agentId":"agentId","agentName":"名称"}
  cli:   config={"cliConfig":{"templateId":"custom","command":"命令","workingDirectory":"","timeout":60}}
  text:  config={"text":"文本内容","variables":[]}
  edge: {"id":"唯一id","source":"源id","target":"目标id"}
  分支出边额外字段: "condition":"分支id", "label":"分支标签"

GET  /api/workflows                              - 获取全部工作流列表（?name=&createdAfter=&updatedAfter=）
POST /api/workflows                              - 创建工作流（节点类型及config见上方）
GET  /api/workflows/{id}                         - 获取单个工作流详情
PUT  /api/workflows/{id}                         - 更新工作流（节点类型及config见上方）
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

GET  /api/agents                     - 获取全部 Agent 列表（?name=&createdAfter=&updatedAfter=）
POST /api/agents                     - 创建 Agent body: {"name":"","description":"","instructions":"","workflowId":"(可选)"}
GET  /api/agents/{id}                - 获取单个 Agent 详情
PUT  /api/agents/{id}                - 更新 Agent body: {"name":"","description":"","instructions":"","workflowId":"(可选)"}
DEL  /api/agents/{id}                - 删除 Agent
GET  /api/skills                     - 获取全部技能列表（?name=&createdAfter=&updatedAfter=）
POST /api/skills                     - 创建技能 body: {"name":"","description":"","content":""}
GET  /api/skills/{id}                - 获取技能详情
PUT  /api/skills/{id}                - 更新技能 body: {"name":"","description":"","content":""}
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

知识库管理:
GET  /api/knowledge-base                                    - 获取全部知识库列表（?name=&createdAfter=&updatedAfter=）
POST /api/knowledge-base                                    - 创建知识库 body: {"name":"","type":"internal|external","description":"","chunkSize":1000,"chunkOverlap":200}
PUT  /api/knowledge-base/{id}                               - 更新知识库 body: {"name":"","description":"","type":"","chunkSize":1000}
DEL  /api/knowledge-base/{id}                               - 删除知识库（会同时删除所有分块和向量）

文档管理:
GET  /api/knowledge-base/{id}/stats                         - 知识库文档统计（返回文档列表和总分块数）
POST /api/knowledge-base/{id}/documents                     - 上传文档（multipart/form-data 格式，LLM无法直接使用，请使用 attachment-upload代替）
POST /api/knowledge-base/{id}/attachment-upload             - 通过附件URL上传文档 body: {"attachmentUrl":"/api/attachments/att-xxx/filename.md"}
DEL  /api/knowledge-base/{id}/documents/{docName}           - 删除指定文档及其所有分块
GET  /api/knowledge-base/{id}/documents/{docName}/download  - 从分块拼接重建并下载文档原文

RAG 检索:
POST /api/knowledge-base/{id}/retrieve                      - RAG 检索 body: {"query":"检索内容"}
POST /api/knowledge-base/{id}/retrieve-debug                - 召回测试 body: {"query":"检索内容"}，返回结构化结果（含距离分数）

分块管理:
GET  /api/knowledge-base/{id}/chunks/{docName}              - 获取文档的分块列表
POST /api/knowledge-base/{id}/chunks                        - 新增分块 body: {"content":"","source":"文档名"}
PUT  /api/knowledge-base/{id}/chunks/{chunkId}              - 更新分块内容 body: {"content":""}
DEL  /api/knowledge-base/{id}/chunks/{chunkId}              - 删除单个分块
PATCH /api/knowledge-base/{id}/chunks/{chunkId}/toggle      - 切换分块启用/停用状态`,
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
    description: `调用 LLM 配置、触发器、代理等系统设置相关的内部 REST API。路径中的 {id} 需替换为实际 ID。

GET  /api/llm-config                      - 获取所有 LLM 配置
POST /api/llm-config                      - 创建 LLM 配置 body: {"name":"","provider":"openai|anthropic|azure|bailian|deepseek|ollama","model":"","apiKey":"","baseUrl":"(可选)"}
POST /api/llm-config/{id}/activate        - 激活指定 LLM 配置
POST /api/llm-config/test-connection      - 测试连接 body: {"provider":"","apiKey":"","model":"","baseUrl":"(可选)"}
DEL  /api/llm-config/{id}                 - 删除 LLM 配置
GET  /api/proxy                           - 获取代理配置
PUT  /api/proxy                           - 更新代理 body: {"enabled":true,"host":"","port":""}
GET  /api/triggers                        - 获取触发器列表（?name=&createdAfter=&updatedAfter=）
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
  knowledgeApi: knowledgeApiTool,
  configApi: configApiTool,
  readSkill: readSkillTool,
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
  { id: 'readSkill', label: '读取技能', description: '读取指定技能的完整内容' },
]