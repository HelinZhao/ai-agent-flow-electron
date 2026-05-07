/**
 * 服务端集中配置文件
 * 将散落在各文件中的硬编码配置集中管理，便于统一调整
 */

// ========== 服务器基础配置 ==========

/** 服务器监听端口 */
export const SERVER_PORT = 3100

/** Express JSON/URL-encoded 请求体大小上限 */
export const BODY_SIZE_LIMIT = '50mb'

/** API 版本号 */
export const API_VERSION = '1.0.0'

/** API 服务显示名称 */
export const API_DISPLAY_NAME = 'AI Agent Flow Designer API Server'

// ========== 数据库与存储路径 ==========

/** 主 SQLite 数据库文件名（相对于 dataDir） */
export const DB_FILENAME = '/database.sqlite'

/** 知识库 SQLite 数据库文件名（相对于 dataDir） */
export const KB_DB_FILENAME = '/knowledge.sqlite'

/** 文件上传临时目录（相对于 dataDir） */
export const UPLOAD_DIR = '/uploads'

/** 附件存储目录（相对于 dataDir） */
export const ATTACHMENT_DIR = '/attachments'

// ========== LLM 默认参数 ==========

/** 默认 LLM 温度参数 */
export const DEFAULT_TEMPERATURE = 0.7

/** 默认 LLM 最大输出 token 数 */
export const DEFAULT_MAX_TOKENS = 2000

/** 工具调用模式下 maxTokens 的最低阈值（低于此值会被自动上调） */
export const MIN_MAX_TOKENS_WITH_TOOLS = 4096

/** 测试连接时使用的温度参数 */
export const TEST_TEMPERATURE = 0.1

/** 测试连接时使用的 maxTokens */
export const TEST_MAX_TOKENS = 10

// ========== LLM 重试与超时 ==========

/** LLM 请求最大重试次数（含指数退避） */
export const LLM_MAX_RETRIES = 5

/** LangChain ChatOpenAI 内部 SDK 最大重试次数 */
export const LLM_SDK_MAX_RETRIES = 6

/** 指数退避基准延迟（秒），遇 429/限流时首轮等待此值 */
export const LLM_RETRY_BASE_DELAY = 30

/** 指数退避最大等待上限（秒） */
export const LLM_RETRY_MAX_DELAY = 240

/** LangGraph 递归限制：带工具调用时 */
export const LANGGRAPH_RECURSION_LIMIT_WITH_TOOLS = 50

/** LangGraph 递归限制：无工具调用时 */
export const LANGGRAPH_RECURSION_LIMIT_NO_TOOLS = 25

// ========== LLM 缓存 ==========

/** LLM 响应缓存 TTL（毫秒），过期后相同请求会重新调用模型 */
export const LLM_CACHE_TTL = 10 * 60 * 1000 // 10 分钟

// ========== LLM 提供商默认 API 地址 ==========

export const PROVIDER_DEFAULT_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  bailian: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  longcat: 'https://api.longcat.chat/openai/v1',
  deepseek: 'https://api.deepseek.com',
}

/** LLM 提供商对应的 API Key 常见前缀（用于输入校验提示） */
export const PROVIDER_API_KEY_PREFIXES: Record<string, string> = {
  openai: 'sk-',
  anthropic: 'sk-ant-',
  bailian: 'sk-',
  longcat: 'ak_',
  deepseek: 'sk-',
}

// ========== 视觉模型检测 ==========

/** 模型名称中包含以下关键词则判定为支持图像/视觉输入 */
export const VISION_MODEL_PATTERNS = [
  '4o', '4-turbo', 'vision', 'gpt-4-vision', 'o1', 'o3', 'o4',
  'claude-3', 'claude-3.5', 'claude-4',
  'vl', 'qwen-vl', 'qwen2-vl',
  'gemini', 'grok-2', 'qwen3.6-plus',
]

// ========== 人机协同审批（HITL） ==========

/** 需要人工审批后才能执行的危险工具名称列表 */
export const DANGEROUS_TOOLS = ['writeFile', 'executeCommand', 'httpRequest']

// ========== 知识库默认参数 ==========

/** 默认文本分块大小（字符数） */
export const DEFAULT_CHUNK_SIZE = 500

/** 默认分块重叠字符数 */
export const DEFAULT_CHUNK_OVERLAP = 50

/** 默认检索返回的分块数量（Top-K） */
export const DEFAULT_TOP_K = 3

// ========== 知识库 Embedding 配置 ==========

/** 各提供商默认使用的 Embedding 模型名称 */
export const PROVIDER_EMBEDDING_MODEL: Record<string, string> = {
  openai: 'text-embedding-3-small',
  anthropic: 'text-embedding-3-small',
  azure: 'text-embedding-3-small',
  bailian: 'text-embedding-v3',
  longcat: 'text-embedding-3-small',
}

/** 各提供商 Embedding 模型对应的向量维度 */
export const PROVIDER_EMBEDDING_DIMS: Record<string, number> = {
  openai: 1536,
  anthropic: 1536,
  azure: 1536,
  bailian: 1024,
  longcat: 1536,
}

/** 当无法确定提供商时使用的默认向量维度 */
export const DEFAULT_VECTOR_DIMS = 1024

/** sqlite-vec 虚拟表名称 */
export const VEC_TABLE_NAME = 'vec_chunks'

/** 外部知识库 API 调用超时（毫秒） */
export const EXTERNAL_KB_TIMEOUT = 30000

/**
 * 外部知识库提供商适配器
 * 定义各提供商检索 API 的请求体构建与响应解析方式
 */
export const EXTERNAL_KB_PROVIDERS: Record<string, {
  name: string
  buildBody: (query: string, topK: number) => any
  parseResponse: (data: any) => string
}> = {
  generic: {
    name: '通用 API',
    buildBody: (query, topK) => ({ query, topK }),
    parseResponse: (data) => {
      if (Array.isArray(data.results)) return data.results.map((r: any) => r.content || r.text || String(r)).join('\n\n---\n\n')
      if (Array.isArray(data.documents)) return data.documents.map((d: any) => d.content || d.text || String(d)).join('\n\n---\n\n')
      if (typeof data.context === 'string') return data.context
      return JSON.stringify(data)
    }
  },
  dify: {
    name: 'Dify',
    buildBody: (query, topK) => ({
      query,
      retrieval_model: { top_k: topK, search_strategy: 'hybrid', reranking_enabled: false }
    }),
    parseResponse: (data) => {
      const records = data.records || []
      return records.map((r: any) => r.segment?.content || r.content || String(r)).join('\n\n---\n\n')
    }
  },
  bailian: {
    name: '阿里百炼',
    buildBody: (query, topK) => ({ query, top_k: topK }),
    parseResponse: (data) => {
      const chunks = data.data?.chunks || data.chunks || []
      return chunks.map((c: any) => c.content || String(c)).join('\n\n---\n\n')
    }
  },
  qianfan: {
    name: '百度千帆',
    buildBody: (query, topK) => ({ query, limit: topK }),
    parseResponse: (data) => {
      const items = data.data || data.result || []
      return items.map((i: any) => i.content || i.text || String(i)).join('\n\n---\n\n')
    }
  },
  anythingllm: {
    name: 'AnythingLLM',
    buildBody: (query, topK) => ({ message: query, mode: 'query', topN: topK }),
    parseResponse: (data) => {
      if (data.textResponse) return data.textResponse
      if (data.context?.text) return data.context.text
      return JSON.stringify(data)
    }
  },
  fastgpt: {
    name: 'FastGPT',
    buildBody: (query, topK) => ({ query, limit: topK }),
    parseResponse: (data) => {
      const items = data.data || data.records || []
      return items.map((i: any) => i.content || i.text || String(i)).join('\n\n---\n\n')
    }
  },
  ragflow: {
    name: 'RAGFlow',
    buildBody: (query, topK) => ({ query, top_k: topK }),
    parseResponse: (data) => {
      const chunks = data.data?.chunks || data.records || data.chunks || []
      return chunks.map((c: any) => c.content || c.text || String(c)).join('\n\n---\n\n')
    }
  },
}

// ========== 文件上传 ==========

/** 知识库文档上传允许的文件扩展名 */
export const KB_UPLOAD_EXTENSIONS = ['.txt', '.md']

// ========== CLI 工具 ==========

/** CLI 命令默认执行超时（秒） */
export const CLI_DEFAULT_TIMEOUT = 30

/** CLI 命令执行 maxBuffer（字节），防止超大输出导致崩溃 */
export const CLI_MAX_BUFFER = 1024 * 1024 * 10 // 10 MB

// ========== 工具执行与输出 ==========

/** 工具执行默认超时（秒） */
export const TOOL_EXECUTION_TIMEOUT = 120

/** readFile 工具返回内容最大字符数 */
export const TOOL_READ_FILE_MAX_CHARS = 5000

/** httpRequest 工具返回内容最大字符数 */
export const TOOL_HTTP_MAX_CHARS = 5000

/** webSearch 工具最大返回结果数 */
export const TOOL_WEB_SEARCH_MAX_RESULTS = 5

/** webSearch 每条结果的最大摘要长度 */
export const TOOL_WEB_SEARCH_SNIPPET_LENGTH = 150

/** DuckDuckGo 搜索引擎 URL */
export const DUCKDUCKGO_URL = 'https://lite.duckduckgo.com/lite/'

/** webSearch 请求的 User-Agent */
export const WEB_SEARCH_USER_AGENT = 'Mozilla/5.0'

// ========== 工作流执行轮询 ==========

/** 同步工作流执行状态轮询最大次数 */
export const WORKFLOW_POLL_MAX_ATTEMPTS = 100

/** 同步工作流执行状态轮询间隔（毫秒） */
export const WORKFLOW_POLL_INTERVAL = 500

// ========== MIME 类型映射 ==========

/** 附件文件扩展名 → MIME 类型映射 */
export const ATTACHMENT_CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.html': 'text/html',
  '.xml': 'text/xml',
  '.zip': 'application/zip',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
}