/**
 * 内部 API 工具的描述文本，从 index.ts 拆分至此以保持工具定义文件简洁。
 * 这些描述会被 LLM 读取以了解可用的 REST API 接口。
 */

export const WORKFLOWS_API_DESCRIPTION = `调用工作流和执行相关的 REST API。路径 {id} 用实际值替换。

⚠️ 只允许以下19种节点type，禁止发明其他type:
start, end, llm, branch, skill, api, agent, cli, text, subWorkflow, loop, split, merge, transform, mcp, code, sleep, catch, note, if, knowledge

节点通用结构: {"id":"唯一id","type":"上面之一","position":{"x":0,"y":0},"data":{"label":"显示名","config":{...}}}
通用可选(retry): retryCount(重试次数), retryDelay(间隔ms), retryBackoff(fixed|exponential)

各节点 config 详解 (type→config字段):
start/end → 无需config，Start可定义params[]作为入参声明
llm → prompt(提示词模板), variables[{name,displayName,type,defaultValue,required,description}], enabledTools[], skills[], knowledgeBaseIds[], ragTopK, responseFormat(text|json_object)
branch → branches[{id,label,condition}] condition支持模板变量，边上condition字段对应分支id
skill → skillId, skillName
api → apiConfig{url,method(GET|POST|PUT|DELETE),headers,body,timeout}, outputMode(raw|llm_process), llmProcessPrompt
agent → agentId, agentName
cli → cliConfig{templateId,command,templateVariables,workingDirectory,timeout}, outputMode(raw|llm_process), llmProcessPrompt
text → text(模板), variables[](同llm) 不调LLM直接渲染
subWorkflow → workflowId, workflowName, params{key:值或{{$input}}}
loop → workflowId, workflowName, maxIterations, condition(JS布尔), params{key:值或{{$input}}或{{$params._index}}}
split → workflowId, workflowName, maxItems
merge → 无需config
transform → operation(jsonpath|parse-json|to-json), expression
mcp → mcpConfig{serverId,serverName,toolName,params{}}
code → code(return ...), language(javascript)
sleep → sleepMs(毫秒)
catch → errorOnly(true) 需上游sourceType:"error"边
note → content(注释) 纯可视化不执行
knowledge → knowledgeBaseId(知识库id), query(检索查询,支持模板变量), topK(返回结果数)
if → condition(JS布尔表达式, 如 $input.length > 10), 支持模板变量, 边上condition为"true"/"false"

边(edge)结构: {"id":"唯一id","source":"源节点id","target":"目标节点id"}
分支/条件节点的出边额外: "condition":"分支id或true/false", "label":"分支标签"
错误处理边: "sourceType":"error" (源节点失败时走此边到catch节点)

===== 模板变量(所有支持文本模板的地方通用) =====
{{$input}} — 当前节点接收到的上游输入
{{$params.xxx}} / {{$params.xxx.yyy}} — 工作流入参(Start节点定义)，支持点号路径
{{$nodes["节点id"].output}} — 引用任意已完成节点的输出
{{$env.xxx}} — 工作流级环境变量(编辑器"环境变量"按钮配置)
{{$global.xxx}} — 全局环境变量(设置→环境变量页面管理)
{{$now}} / {{$now.iso}} — 当前ISO时间
{{$now.date}} — 日期 YYYY-MM-DD
{{$now.time}} — 时间 HH:mm:ss
{{$now.timestamp}} — 毫秒时间戳
{{$now.year}}/{{$now.month}}/{{$now.day}}/{{$now.hour}}/{{$now.minute}}/{{$now.second}} — 各时间分量
{{$params.a + $params.b}} — 支持 JS 表达式运算，如加法、字符串拼接、toUpperCase() 等
{{$params._index}} — 循环节点中当前轮次索引(从0开始)
可用范围: llm.prompt / text.text / api.apiConfig.url/headers/body / cli.cliConfig.command/workingDirectory / mcp.mcpConfig.params / subWorkflow.params / loop.params / split.params / code.code / branch.condition / if.condition / sleep.sleepMs

===== 查询参数(所有列表) =====
?name=&createdAfter=&createdBefore=&updatedAfter=&updatedBefore=&page=1&pageSize=20

===== 接口 =====
GET    /api/workflows                                          — 列表
POST   /api/workflows                                          — 创建 {"name":"","description":"","nodes":[],"edges":[],"layoutDirection":"horizontal|vertical","envVars":{"KEY":"value"}}
GET    /api/workflows/{id}                                      — 详情
PUT    /api/workflows/{id}                                      — 覆盖更新
DEL    /api/workflows/{id}                                      — 删除
POST   /api/execute-workflow/monitor                            — 异步执行 {"workflow":{"id":"","name":"","nodes":[],"edges":[]},"input":"","agentId":"(可选)","threadId":"(可选)","params":{"key":"val"}}
GET    /api/execute-workflow/progress/{executionId}             — 进度(WorkflowExecutionProgress)
GET    /api/execute-workflow/node-results/{executionId}         — 节点结果
GET    /api/execute-workflow/progress-sse/{executionId}         — SSE实时推送
GET    /api/execute-workflow/list                               — 记录列表 ?status=running|completed|failed|paused
POST   /api/execute-workflow/stop/{executionId}                 — 停止
POST   /api/execute-workflow/pause/{executionId}                — 暂停
POST   /api/execute-workflow/resume/{executionId}               — 恢复
POST   /api/execute-workflow/approve-tool/{executionId}         — 审批工具 {"decisions":[{"type":"approve|reject","message":"(可选)","actionName":""}]}
POST   /api/execute-workflow/auto-approve/{executionId}         — 自动放行 {"toolName":"readFile"}
POST   /api/execute-workflow/agent-chat-monitor                 — Agent对话 {"agentId":"","input":"","threadId":"(可选)","attachments":[],"autoApprovedTools":[]}
POST   /api/execute-workflow/test-node                          — 单节点测试 {"workflow":{"nodes":[],"edges":[]},"nodeId":"","input":""}
DEL    /api/execute-workflow/delete-thread/{threadId}           — 清除AI记忆
POST   /api/execute-workflow                                   — 同步执行(等结果, body同monitor)`

export const AGENTS_SKILLS_API_DESCRIPTION = `调用 Agent 和技能管理的 REST API。路径 {id} 用实际值替换。

GET  /api/agents                     — 列表 ?name=&createdAfter=&updatedAfter=
POST /api/agents                     — 创建 {"name":"","description":"","instructions":"","type":"","workflowId":"(可选)","skillIds":[],"enabledTools":[],"llmConfigId":"(可选)"}
GET  /api/agents/{id}                — 详情
PUT  /api/agents/{id}                — 更新(同上, isSystem不可改)
DEL  /api/agents/{id}                — 删除(不可删isSystem=true)
GET  /api/skills                     — 技能列表
POST /api/skills                     — 创建 {"name":"","description":"","content":""}
GET  /api/skills/{id}                — 详情
PUT  /api/skills/{id}                — 更新
DEL  /api/skills/{id}                — 删除`

export const KNOWLEDGE_API_DESCRIPTION = `调用知识库管理的 REST API。路径 {id} 用实际值替换。

知识库:
GET  /api/knowledge-base                                        — 列表
POST /api/knowledge-base                                        — 创建 {"name":"","type":"internal|external","description":"","chunkSize":500,"chunkOverlap":50,"topK":3,"vectorStore":"sqlite-vec|lancedb|qdrant|pinecone|weaviate|milvus|pgvector|mongodb-atlas|redis|elasticsearch","vectorConfig":"可选JSON","apiUrl":"","apiKey":"","provider":"generic|dify|bailian|qianfan|anythingllm|fastgpt|ragflow"}
PUT  /api/knowledge-base/{id}                                   — 更新
DEL  /api/knowledge-base/{id}                                   — 删除(含分块和向量)

文档:
GET  /api/knowledge-base/{id}/stats                             — 统计(文档列表+总分块数)
POST /api/knowledge-base/{id}/attachment-upload                 — 附件上传文档 {"attachmentUrl":"/api/attachments/att-xxx/filename.md"}
DEL  /api/knowledge-base/{id}/documents/{docName}               — 删文档及分块
GET  /api/knowledge-base/{id}/documents/{docName}/download      — 重建原文

RAG:
POST /api/knowledge-base/{id}/retrieve                          — 检索 {"query":"","topK":3}
POST /api/knowledge-base/{id}/retrieve-debug                    — 召回测试(含距离分数)

分块:
GET  /api/knowledge-base/{id}/chunks/{docName}                  — 列表
POST /api/knowledge-base/{id}/chunks                            — 新增 {"content":"","source":"文档名"}
PUT  /api/knowledge-base/{id}/chunks/{chunkId}                  — 更新 {"content":""}
DEL  /api/knowledge-base/{id}/chunks/{chunkId}                  — 删除
PATCH /api/knowledge-base/{id}/chunks/{chunkId}/toggle          — 启停切换

向量引擎: sqlite-vec(默认)/lancedb/qdrant/pinecone/weaviate/milvus/pgvector/mongodb-atlas/redis/elasticsearch`

export const CONFIG_API_DESCRIPTION = `调用系统设置相关 REST API。路径 {id} 用实际值替换。

LLM配置:
GET  /api/llm-config                            — 所有配置(含isActive)
GET  /api/llm-config/active                     — 当前活跃
POST /api/llm-config                            — 创建 {"name":"","provider":"openai|anthropic|azure|bailian|longcat|deepseek|ollama","model":"gpt-4|claude-4|...","apiKey":"sk-...","baseUrl":"(可选)","temperature":0.7,"maxTokens":2000}
PUT  /api/llm-config/{id}                       — 更新
DEL  /api/llm-config/{id}                       — 删除
POST /api/llm-config/{id}/activate              — 激活
POST /api/llm-config/test-connection            — 测试连接 {"provider":"","apiKey":"","model":"","baseUrl":"(可选)"}

代理:
GET  /api/proxy                                 — 获取
PUT  /api/proxy                                 — 更新 {"enabled":true,"host":"127.0.0.1","port":7890,"protocol":"http|https|socks5","username":"(可选)","password":"(可选)"}

触发器:
GET  /api/triggers                              — 列表
POST /api/triggers                              — 创建 {"name":"","type":"cron|webhook","cronExpression":"0 0 9 * * *","targetType":"workflow|agent","targetId":"id","input":"(可选)","params":"可选JSON","enabled":true}
                                                  注意: cronExpression 是 6 段 Quartz 格式: 秒 分 时 日 月 周，首段为秒。示例 "0 0 9 * * *" = 每天 9:00
PUT  /api/triggers/{id}                         — 更新(可切换type)
DEL  /api/triggers/{id}                         — 删除
POST /api/triggers/{id}/run                    — 手动执行
POST /webhook/{token}                           — Webhook触发(无/api前缀) {"input":"","params":{}} 限流:同token 10次/分钟

数据库&日志:
GET  /api/data/db-stats                         — 统计(文件大小/记录数)
POST /api/data/vacuum                           — VACUUM回收空间
GET  /api/logs/stream                           — SSE实时日志(回放最近2000条)

MCP服务器:
GET  /api/mcp-servers                           — 列表(含连接状态/工具数)
GET  /api/mcp-servers/tools                     — 所有工具定义
GET  /api/mcp-servers/{id}                      — 详情(含工具列表+JSON Schema)
POST /api/mcp-servers                           — 创建 {"name":"","transportType":"stdio|sse","command":"npx","args":["-y","@modelcontextprotocol/server-everything"],"url":"(sse必填)","enabled":true,"settings":{}}
PUT  /api/mcp-servers/{id}                      — 更新
DEL  /api/mcp-servers/{id}                      — 删除
POST /api/mcp-servers/{id}/connect              — 手动连接
POST /api/mcp-servers/{id}/disconnect           — 手动断开
POST /api/mcp-servers/{id}/refresh              — 刷新工具
POST /api/mcp-servers/refresh-all               — 刷新全部

环境变量:
GET  /api/environment-variables                 — 列表(name ASC)
POST /api/environment-variables                 — 创建 {"name":"KEY","value":"VALUE","description":"(可选)"}
GET  /api/environment-variables/{id}            — 详情
PUT  /api/environment-variables/{id}            — 更新
DEL  /api/environment-variables/{id}            — 删除

模板:
GET  /api/templates                             — 列表 ?type=api|mcp|code
GET  /api/templates/{id}                        — 详情 {"id","name","description","type","category","icon","content","author","version"}

Ollama:
GET  /api/ollama/status                         — 检查运行状态
POST /api/ollama/pull                           — 拉取bge-m3模型(异步)
GET  /api/ollama/pull-progress                  — SSE拉取进度

通用:
GET  /api/events                                — SSE数据变更通知(resource="environment-variables|mcp-servers")
GET  /api/attachments/{id}/{filename}           — 附件文件(自动Content-Type)
GET  /api/health                                — 健康检查
GET  /api/info                                  — 应用信息(版本/平台)
GET  /                                           — API根目录(所有端点)
GET  /health                                    — 健康检查(无前缀)`
