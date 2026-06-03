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

// ========== 应用信息 ==========

/** 应用版本号 */
export const APP_VERSION = '2.3.0'

/** 应用名称 */
export const APP_NAME = 'Agent Flow'

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
/** 提供商信息 */
export const PROVIDER_MATES: Record<string, {
  name: string, // 提供商显示名称
  baseUrl: string, // 默认 API 地址（仅作 placeholder 提示）
  prefix: string // 提供商 API Key 前缀校验规则
}> = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    prefix: 'sk-'
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    prefix: 'sk-ant-'
  },
  bailian: {
    name: 'Bailian (阿里百炼)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    prefix: 'sk-'
  },
  longcat: {
    name: 'Longcat (美团龙猫)',
    baseUrl: 'https://api.longcat.ai',
    prefix: 'ak_'
  },
  deepseek: {
    name: 'Deepseek (深度求索)',
    baseUrl: 'https://api.deepseek.com',
    prefix: 'sk-'
  },
  ollama: {
    name: 'Ollama (本地模型)',
    baseUrl: 'http://127.0.0.1:11434',
    prefix: ''
  },
}

/** Temperature 输入范围 */
export const TEMPERATURE_RANGE = { min: 0, max: 2, step: 0.1 }

/** MaxTokens 输入范围 */
export const MAX_TOKENS_RANGE = { min: 1, max: 1_024_000 }

/** 不可删除最后一个 LLM 配置 */
export const MIN_LLM_CONFIG_COUNT = 1

// ========== 向量引擎选项 ==========

/** 向量引擎选项（前端展示用） */
export const VECTOR_STORE_OPTIONS: { value: string; label: string; category: string }[] = [
  // 内嵌引擎
  { value: 'sqlite-vec', label: 'SQLite Vec（内嵌，默认）', category: '内嵌引擎' },
  { value: 'lancedb', label: 'LanceDB（内嵌）', category: '内嵌引擎' },
  // 外部服务
  { value: 'qdrant', label: 'Qdrant', category: '外部服务' },
  { value: 'pinecone', label: 'Pinecone', category: '外部服务' },
  { value: 'weaviate', label: 'Weaviate', category: '外部服务' },
  { value: 'milvus', label: 'Milvus', category: '外部服务' },
  { value: 'pgvector', label: 'PostgreSQL + pgvector', category: '外部服务' },
  { value: 'mongodb-atlas', label: 'MongoDB Atlas', category: '外部服务' },
  { value: 'redis', label: 'Redis + RedisSearch', category: '外部服务' },
  { value: 'elasticsearch', label: 'Elasticsearch', category: '外部服务' },
]

/** 各向量引擎的外部连接配置字段定义 */
export const VECTOR_STORE_CONFIG_FIELDS: Record<string, { key: string; label: string; type: 'text' | 'password' | 'number'; required: boolean; placeholder?: string }[]> = {
  'qdrant': [
    { key: 'url', label: 'API URL', type: 'text', required: true, placeholder: 'http://localhost:6333' },
    { key: 'apiKey', label: 'API Key', type: 'password', required: false, placeholder: '可选' },
    { key: 'collectionName', label: 'Collection 名称', type: 'text', required: false, placeholder: 'knowledge_chunks' },
  ],
  'pinecone': [
    { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'pcsk_...' },
    { key: 'indexName', label: 'Index 名称', type: 'text', required: false, placeholder: 'knowledge' },
  ],
  'weaviate': [
    { key: 'url', label: 'HTTP URL', type: 'text', required: true, placeholder: 'http://localhost:8080' },
    { key: 'apiKey', label: 'API Key', type: 'password', required: false, placeholder: '可选' },
    { key: 'className', label: 'Class 名称', type: 'text', required: false, placeholder: 'KnowledgeChunk' },
  ],
  'milvus': [
    { key: 'address', label: '地址（host:port）', type: 'text', required: true, placeholder: 'localhost:19530' },
    { key: 'username', label: '用户名', type: 'text', required: false, placeholder: '可选' },
    { key: 'password', label: '密码', type: 'password', required: false, placeholder: '可选' },
    { key: 'collectionName', label: 'Collection 名称', type: 'text', required: false, placeholder: 'knowledge_chunks' },
  ],
  'pgvector': [
    { key: 'connectionString', label: '数据库连接串', type: 'password', required: true, placeholder: 'postgresql://user:pass@host:5432/db' },
    { key: 'tableName', label: '表名', type: 'text', required: false, placeholder: 'knowledge_vectors' },
  ],
  'mongodb-atlas': [
    { key: 'connectionString', label: '连接串', type: 'password', required: true, placeholder: 'mongodb+srv://...' },
    { key: 'dbName', label: '数据库名', type: 'text', required: false, placeholder: 'knowledge' },
    { key: 'collectionName', label: 'Collection 名称', type: 'text', required: false, placeholder: 'vectors' },
    { key: 'indexName', label: 'Index 名称', type: 'text', required: false, placeholder: 'vector_index' },
  ],
  'redis': [
    { key: 'url', label: 'URL', type: 'text', required: true, placeholder: 'redis://localhost:6379' },
    { key: 'password', label: '密码', type: 'password', required: false, placeholder: '可选' },
    { key: 'indexName', label: 'Index 名称', type: 'text', required: false, placeholder: 'idx:knowledge' },
  ],
  'elasticsearch': [
    { key: 'url', label: 'URL', type: 'text', required: true, placeholder: 'http://localhost:9200' },
    { key: 'apiKey', label: 'API Key', type: 'password', required: false, placeholder: '可选' },
    { key: 'indexName', label: 'Index 名称', type: 'text', required: false, placeholder: 'knowledge_vectors' },
  ],
}

/** 向量引擎默认配置提示 */
export const VECTOR_STORE_DEFAULTS: Record<string, string> = {
  'sqlite-vec': '使用 SQLite + sqlite-vec 扩展，无需额外配置',
  'lancedb': '使用 LanceDB 内嵌格式，数据存储在 data/lancedb 目录',
  'qdrant': '连接已有的 Qdrant 服务',
  'pinecone': '连接 Pinecone 服务',
  'weaviate': '连接 Weaviate 服务',
  'milvus': '连接 Milvus 服务',
  'pgvector': '连接 PostgreSQL 数据库（需已安装 pgvector 扩展）',
  'mongodb-atlas': '连接 MongoDB Atlas（需已配置 Vector Search Index）',
  'redis': '连接 Redis 实例（需已加载 RedisSearch 模块）',
  'elasticsearch': '连接 Elasticsearch 服务（需支持 dense_vector）',
}

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

/** 外部知识库提供商元信息（显示名称、默认 URL、文档链接） */
export const EXTERNAL_KB_PROVIDER_META: Record<string, {
  name: string
  defaultUrl: string
  docs: string
}> = {
  generic: { name: '通用 API', defaultUrl: '', docs: '' },
  dify: { name: 'Dify', defaultUrl: 'https://api.dify.ai/v1/datasets/{dataset_id}/retrieve', docs: 'https://docs.dify.ai' },
  bailian: { name: '阿里百炼', defaultUrl: 'https://dashscope.aliyuncs.com/api/v1/services/knowledge-base/retrieve', docs: 'https://help.aliyun.com/zh/model-studio' },
  qianfan: { name: '百度千帆', defaultUrl: 'https://qianfan.baidubce.com/v2/knowledge/retrieve', docs: 'https://cloud.baidu.com/doc/WENXINWORKSHOP' },
  anythingllm: { name: 'AnythingLLM', defaultUrl: 'http://localhost:3001/api/v1/workspace/{workspace_id}/chat', docs: 'https://docs.useanythingllm.com' },
  fastgpt: { name: 'FastGPT', defaultUrl: 'http://localhost:3000/api/v1/chat/knowledge/retrieve', docs: 'https://doc.fastgpt.in' },
  ragflow: { name: 'RAGFlow', defaultUrl: 'http://localhost:9380/api/v1/retrieval', docs: 'https://ragflow.io/docs' },
}

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
export const STORAGE_KEY = 'app-storage'

/** Zustand persist 白名单字段 */
export const STORAGE_PERSIST_FIELDS = ['workflows', 'skills', 'agents', 'teams', 'llmConfigs', 'activeLLMConfig', 'currentPage']

// ========== 触发器 ==========

/** Cron 预设模板 */
export const CRON_PRESETS = [
  { label: '每 5 分钟', value: '0 */5 * * * *' },
  { label: '每 30 分钟', value: '0 */30 * * * *' },
  { label: '每小时', value: '0 0 * * * *' },
  { label: '每天 9:00', value: '0 0 9 * * *' },
  { label: '每天 18:00', value: '0 0 18 * * *' },
  { label: '每个工作日 9:00', value: '0 0 9 * * 1-5' },
  { label: '每周一 9:00', value: '0 0 9 * * 1' },
]

/** Webhook 基础 URL */
export const WEBHOOK_BASE_URL = 'http://localhost:3100/webhook'

// ========== 工具定义（ID → 中文标签映射） ==========

export interface ToolDef { id: string; label: string; description: string }

export const TOOL_DEFINITIONS: ToolDef[] = [
  { id: 'readFile', label: '读取文件', description: '读取指定文件内容' },
  { id: 'writeFile', label: '写入文件', description: '将内容写入指定文件' },
  { id: 'listDirectory', label: '列出目录', description: '列出目录下的文件和子目录' },
  { id: 'executeCommand', label: '执行命令', description: '执行 shell 命令' },
  { id: 'httpRequest', label: 'HTTP请求', description: '发送 HTTP 请求' },
  { id: 'webSearch', label: '网页搜索', description: '搜索网页获取信息' },
  { id: 'workflowsApi', label: '工作流API', description: '管理工作流和执行（CRUD+执行）' },
  { id: 'agentsSkillsApi', label: 'Agent/技能API', description: '管理 Agent 和技能（CRUD）' },
  { id: 'teamsApi', label: '团队API', description: '调用团队管理接口，管理 Agent 团队及其协作模式' },
  { id: 'tasksApi', label: '任务API', description: '调用任务池管理接口，创建、指派、终止任务' },
  { id: 'projectsApi', label: '项目API', description: '调用项目管理接口，管理项目工作目录' },
  { id: 'knowledgeApi', label: '知识库API', description: '管理知识库和 RAG 检索' },
  { id: 'configApi', label: '系统配置API', description: 'LLM 配置、触发器、系统设置' },
  { id: 'readSkill', label: '读取技能', description: '读取指定技能的完整内容' },
]

/** 工具 ID → 中文标签快速查找 */
export const TOOL_LABEL_MAP: Record<string, string> = Object.fromEntries(
  TOOL_DEFINITIONS.map(t => [t.id, t.label])
)
