/** 每种节点类型的可用配置字段及说明，供 LLM 参考 */
export const NODE_CONFIG_SCHEMAS: Record<string, Record<string, string>> = {
  start: {
    outputSchema: 'Start 节点输出的参数名集合 JSON，如 {"key": "参数说明"}',
  },
  end: {},
  llm: {
    promptTemplate: 'LLM 提示词模板，支持 {{$input}}、{{$params.xxx}} 等变量占位',
    enableKnowledgeBase: '是否启用知识库，true/false',
    knowledgeBaseId: '知识库 ID',
    skillIds: '绑定的技能 ID 数组',
    enabledTools: '启用的工具名称数组，如 ["webSearch"]',
    enableCache: '是否启用 LLM 缓存，true/false',
    retryCount: 'LLM 调用失败重试次数',
  },
  api: {
    url: '请求 URL，支持 {{paramName}} 模板变量',
    method: 'HTTP 方法，可选 GET/POST/PUT/DELETE',
    headers: '请求头 JSON，如 {"Content-Type": "application/json"}',
    body: '请求体 JSON（仅 POST/PUT 时需要）',
  },
  cli: {
    command: '要执行的 shell 命令',
    templateId: '内置命令模板 ID，custom 表示自定义命令',
    templateVariables: '模板变量 KV 对',
    workingDirectory: '工作目录，留空使用默认目录',
    timeout: '超时秒数',
    outputMode: '输出模式，raw 为原始输出，llm_process 为 LLM 处理',
    llmProcessPrompt: 'LLM 处理输出的提示词，用 {{output}} 代替命令输出',
  },
  code: {
    code: 'JavaScript 代码，需使用 return 返回值，支持 async/await',
    language: '语言，目前仅支持 javascript',
  },
  agent: {
    agentId: '绑定的 Agent ID',
    mode: '执行模式，direct 为直接对话，workflow 为工作流模式',
  },
  skill: {
    skillId: '绑定的技能 ID',
  },
  database: {
    dbType: '数据库类型：sqlite / postgres / mysql / mssql / mongodb / redis',
    connectionConfig: '连接配置 JSON',
    sql: 'SQL 语句（SQLite/PostgreSQL/MySQL/SQL Server/Redis 使用）',
    query: 'MongoDB 查询条件 JSON',
    collection: 'MongoDB 集合名称',
    operation: 'MongoDB 操作类型：find / findOne / aggregate / count / insertOne / updateOne / deleteOne',
    mode: '执行模式：query 为查询，execute 为执行',
  },
  knowledge: {
    knowledgeBaseId: '绑定的知识库 ID',
    query: '检索查询文本',
    topK: '返回结果数量',
  },
  variable: {
    mode: '操作模式，set 为设置变量，get 为获取变量',
    items: '变量列表，每个包含 name（变量名）、value（变量值表达式）',
  },
  mcp: {
    serverId: 'MCP 服务器 ID',
    toolName: 'MCP 工具名',
    args: '工具参数 JSON',
  },
  transform: {
    mapping: '字段映射规则 JSON',
  },
  if: {
    expression: 'JS 条件表达式，返回 true/false，支持 $input',
    branches: '分支配置数组',
  },
  sleep: {
    duration: '延迟毫秒数',
  },
  loop: {
    times: '循环次数',
    inputMapping: '每次循环的输入映射',
  },
  merge: {},
  split: {
    splitExpression: '拆分表达式，返回数组',
  },
  subWorkflow: {
    workflowId: '子工作流 ID',
  },
  text: {
    content: '静态文本内容',
  },
  note: {
    content: '备注内容',
  },
  catch: {
    retryCount: '重试次数',
    retryDelay: '重试间隔毫秒',
  },
}
