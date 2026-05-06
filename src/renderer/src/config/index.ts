/**
 * 前端集中配置文件
 * 将散落在各组件中的硬编码配置集中管理，便于统一调整
 */

// ========== API 连接 ==========

/** 后端服务地址 */
export const API_BASE_URL = 'http://localhost:3100/api'

/** 后端服务根地址（不带 /api 前缀，用于附件 URL 等） */
export const SERVER_BASE_URL = 'http://localhost:3100'

/** 默认请求 Content-Type */
export const API_CONTENT_TYPE = 'application/json'

// ========== 工作流执行轮询 ==========

/** 轮询进度最大次数（约 100 秒） */
export const POLL_MAX_ATTEMPTS = 100

/** 轮询间隔（毫秒） */
export const POLL_INTERVAL = 1000

/** 执行历史默认查询数量 */
export const HISTORY_DEFAULT_LIMIT = 50

// ========== LLM 配置默认值 ==========

export const LLM_DEFAULTS = {
  provider: 'openai' as string,
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 2000,
  baseUrl: '',
}

/** 提供商默认 API 地址（仅作 placeholder 提示） */
export const PROVIDER_DEFAULT_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  azure: 'https://your-resource.openai.azure.com/',
  bailian: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  longcat: 'https://api.longcat.ai',
}

/** 提供商 API Key 前缀校验规则 */
export const PROVIDER_API_KEY_PREFIXES: Record<string, string> = {
  openai: 'sk-',
  anthropic: 'sk-ant-',
  azure: '',
  bailian: 'sk-',
  longcat: 'ak_',
}

/** Temperature 输入范围 */
export const TEMPERATURE_RANGE = { min: 0, max: 2, step: 0.1 }

/** MaxTokens 输入范围 */
export const MAX_TOKENS_RANGE = { min: 1, max: 1_024_000 }

/** 不可删除最后一个 LLM 配置 */
export const MIN_LLM_CONFIG_COUNT = 1

// ========== 知识库配置默认值 ==========

export const KB_DEFAULTS = {
  type: 'internal' as 'internal' | 'external',
  chunkSize: 500,
  chunkOverlap: 50,
  topK: 3,
}

/** 知识库分块大小范围 */
export const CHUNK_SIZE_RANGE = { min: 100, max: 2000 }

/** 分块重叠范围 */
export const CHUNK_OVERLAP_RANGE = { min: 0, max: 500 }

/** Top-K 检索范围 */
export const TOP_K_RANGE = { min: 1, max: 20 }

// ========== 知识库文档管理 ==========

/** 文档上传接受的 MIME 扩展名 */
export const KB_UPLOAD_ACCEPT = '.txt,.md,.pdf,.csv'

/** 分块查看器每页条目数 */
export const CHUNK_PAGE_SIZE = 5

/** 分块内容预览截断行数 */
export const CHUNK_PREVIEW_LINES = 2

/** 分块查看器模态框默认高度 */
export const CHUNK_VIEWER_HEIGHT = 'h-[560px] max-h-[80vh]'

// ========== 文件导入 ==========

/** 技能导入接受扩展名 */
export const SKILL_IMPORT_ACCEPT = '.md,.txt'

/** 工作流导入接受扩展名 */
export const WORKFLOW_IMPORT_ACCEPT = '.json'

// ========== 聊天界面 ==========

// ========== CLI 默认参数 ==========

export const CLI_DEFAULTS = {
  timeout: 30,
  outputMode: 'raw' as 'raw' | 'formatted',
}

// ========== 附件分类规则 ==========

/** 文本类文件扩展名 */
export const TEXT_FILE_EXTENSIONS = [
  '.txt', '.md', '.json', '.csv', '.xml', '.html', '.yaml', '.yml',
  '.log', '.sh', '.bat', '.ps1', '.env', '.cfg', '.ini', '.conf',
]

/** 代码类文件扩展名 */
export const CODE_FILE_EXTENSIONS = [
  '.js', '.ts', '.py', '.java', '.cpp', '.c', '.h', '.go', '.rs',
  '.rb', '.php', '.swift', '.kt', '.scala', '.dart', '.tsx', '.jsx',
  '.vue',
]

// ========== 存储键名 ==========

/** Zustand persist 存储键 */
export const STORAGE_KEY = 'workflow-storage'

/** Zustand persist 白名单字段 */
export const STORAGE_PERSIST_FIELDS = ['workflows', 'skills', 'agents', 'llmConfigs', 'activeLLMConfig', 'currentPage']
