# AI Agent Flow Electron

<div align="center">

🎯 **可视化 AI 工作流编排平台** — 拖拽构建、多 Agent 协同、RAG 增强、本地优先

[![GitHub](https://img.shields.io/badge/GitHub-HelinZhao/ai--agent--flow--electron-181717?logo=github)](https://github.com/HelinZhao/ai-agent-flow-electron)

[快速开始](#快速开始) •
[功能](#主要特性) •
[节点类型](#工作流节点类型) •
[API](#api-接口) •
[构建](#构建)

</div>

AI Agent Flow Electron 是一个基于 Electron + React + TypeScript 的**桌面端 AI 工作流设计器**。通过拖拽节点的方式构建复杂的 AI 自动化流程，支持多 Agent 协同、知识库 RAG 增强、定时触发、人工审批（HITL）等企业级能力。**数据完全本地化存储，隐私安全可控。**

---

## 主要特性

### 🤖 多 Agent 系统
- 创建标准 Agent（绑定技能/工具）和工作流 Agent（关联子工作流）
- 支持自定义头像上传（JPG/PNG/GIF，本地化存储于 userData/avatars/）
- 多轮对话上下文记忆，支持文件附件传输
- 对话列表右键菜单：顶置 Agent（持久化排序）和新建对话
- 无工作流时自动降级为 LLM 对话

### 🔄 可视化工作流
- 基于 React Flow 的拖拽式编辑器，25 种节点类型组合编排
- 一键 Dagre 自动布局
- 实时执行进度、节点状态、耗时监控

### 🧠 RAG 知识库
- **内部知识库** — 上传文档 → 自动分块 → 本地 Embedding → 向量检索
- **外部知识库** — 配置第三方检索 API
- LLM 节点可启用知识库增强，支持分块大小/重叠/TopK 参数调优

### ⚡ 技能管理
- 自定义可复用的 AI 技能模板（Prompt 模板 + 工具绑定）
- 工作流中直接调用已注册的技能节点

### 🔧 工具调用与 HITL 审批
- LLM 自主调用文件读写、命令执行、HTTP 请求等工具
- LLM 节点可调内部 API（工作流/Agent/技能/知识库/项目/系统配置 CRUD）
- 危险操作需人工审批确认，支持会话级放权

### ⏰ 触发器模块
- **Cron 定时触发** — 可视化 Cron 表达式编辑器，支持 Quartz 格式（秒级精度），含预设模板
- **Webhook 触发** — HTTP 回调自动执行工作流或 Agent
- 支持启用/禁用控制和手动执行

### 🎨 更多功能
- **节点测试** — 右键任意节点 → 执行 → 输入测试数据 → 立即查看输出
- **自动重试** — 每个节点可配置重试次数、间隔和退避策略，失败自动重试
- **多 LLM 配置** — OpenAI / Anthropic / Azure / 百炼 / LongCat 等，一键切换活跃配置
- **LLM 缓存** — 自研 TTL 缓存，相同 Prompt 10 分钟内命中缓存，节省 API 费用
- **表达式系统** — {{$input}}、{{$params.xxx}}、{{$nodes["id"].output}}、{{$env.xxx}}、{{$global.xxx}}、{{$now}} 等内置变量，所有模板字段通用
- **环境变量管理** — 工作流级 {{$env.xxx}} + 全局级 {{$global.xxx}}，双层隔离，设置页面可视化 CRUD
- **项目模块** — 创建项目绑定本地工作目录，任务关联后 Agent 执行时自动注入目录上下文，一键打开文件管理器。卡片风格统一靛蓝/紫色主题。
- **任务池** — 完整状态流转（草稿→待处理→已指派→执行中→待验收→已完成），子任务层级、驳回审核意见、自动重派团队
- **SSE 实时同步** — 多窗口间数据变更自动同步
- **🤖 系统 AI 助手** — 悬浮式全局 AI 助手，可拖拽移动，随时对话，支持工具调用和 HITL 审批
- **深色/浅色主题** — 统一的主题切换，节点颜色双模式一致
- **执行监控** — 实时跟踪执行进度、节点状态、耗时、输出日志，支持分页和状态筛选
- **数据管理** — 聊天历史清除、数据库 VACUUM 空间回收

---

## 技术栈

| 层 | 技术 |
|---|---|
| **桌面框架** | Electron |
| **UI** | React 19 + TypeScript + TailwindCSS |
| **流程图** | React Flow + Dagre（自动布局） |
| **状态管理** | Zustand（持久化） |
| **后端服务** | 内嵌 Express 服务器 |
| **数据库** | SQLite（Sequelize ORM）+ sqlite-vec 向量扩展 |
| **AI 框架** | LangChain + LangGraph（含 Checkpoint 持久化） |
| **本地 Embedding** | Ollama（内嵌管理） + bge-m3 模型 |

---

## 系统要求

- Node.js 18+
- npm 10+
- Windows 10+ / macOS 10.15+ / Linux
- **Ollama** — 知识库 Embedding 依赖，应用首次启动时自动管理

---

## 快速开始

```bash
# 安装依赖（自动下载 Ollama）
npm install

# 启动开发模式
npm run dev
```

> **首次启动**：应用自动拉起 Ollama 服务并拉取 bge-m3 embedding 模型（约 1.2GB）。
> 可预先下载模型放入 `resources/models/` 跳过在线拉取。

### 代码质量

```bash
npm run format         # 格式化代码
npm run lint           # 代码检查
npm run typecheck      # 类型检查
```

---

## 构建

打包时自动内嵌 Ollama 可执行文件和 bge-m3 模型，用户安装后开箱即用。

```bash
npm run build          # 构建当前平台
npm run build:win      # 构建 Windows
npm run build:mac      # 构建 macOS
npm run build:linux    # 构建 Linux

# 单独下载模型
npm run download-model
```

---

## Ollama 集成

知识库 RAG 依赖 Ollama 提供本地 Embedding 服务，应用自动管理其生命周期：

- 启动时静默启动 `ollama serve` 子进程
- 按优先级获取 bge-m3 模型：本地打包文件 → registry 在线拉取 → HuggingFace 镜像导入
- 退出时自动清理子进程

也可手动安装：[ollama.com](https://ollama.com)，运行 `ollama pull bge-m3`。

---

## 工作流节点类型

| 节点 | 功能 | 说明 |
|------|------|------|
| Start | 入口 | 接收用户输入，可定义参数，启动工作流 |
| LLM | 大语言模型 | 调用 LLM 生成回复，支持工具调用、TTL 缓存、知识库增强 |
| Skill | 技能 | 调用预定义的技能模板处理输入 |
| Text | 文本 | 模板渲染 + 变量替换，不调用 LLM |
| Code | 代码 | 运行 JavaScript 代码，注入 $input/$params/$nodes 变量 |
| If | 条件分支 | JS 布尔表达式多条件判断，无需 LLM，走 true/false 边 |
| Branch | 条件分支 | LLM 语义评估后选择不同路径 |
| API | HTTP 调用 | 调用外部 API 获取或处理数据 |
| Database | 数据库查询 | 执行 SQL/Redis/MongoDB 查询，返回 JSON 结果 |
| Knowledge | 知识库检索 | 向量检索知识库，获取相关分块上下文 |
| MCP | MCP 工具 | 调用 MCP 协议服务器的工具，支持动态参数表单 |
| Agent | 智能体 | 调用已配置的 Agent 执行子任务 |
| SubWorkflow | 子工作流 | 嵌套执行另一个工作流，支持参数透传 |
| Variable | 变量 | 设置/获取工作流变量，跨节点共享数据 |
| Loop | 循环 | 迭代执行子工作流，支持终止条件和参数映射 |
| Split | 拆分 | 按 JSON 数组或换行拆分，每项独立执行子工作流 |
| Merge | 聚合 | 合并多个上游节点的输出 |
| Transform | 数据转换 | JSON Path 提取、JSON 解析/序列化 |
| Sleep | 睡眠 | 延迟指定时间后透传输入 |
| CLI | 命令行 | 执行 Shell 命令或预设模板 |
| End | 出口 | 汇总并返回最终结果 |
| Team | 团队协作 | 多 Agent 协同执行（队长分发/全员讨论/流水线三种模式） |
| TaskPool | 发布任务 | 将工作流结果发布到任务池，供团队异步认领处理 |
| Catch | 错误处理 | 捕获上游失败节点的错误信息 |
| Note | 注释 | 纯可视化注释，不参与执行 |

---

## 知识库

### 内部知识库
上传 txt/md 文档 → 自动分块 → Ollama + bge-m3 生成 Embedding → sqlite-vec 向量检索。查询时返回 Top-K 最相关分块注入 LLM 上下文。

### 外部知识库
配置外部检索 API 地址和认证信息，查询时直接调用第三方服务获取上下文。

### 参数
- **分块大小** — 文档切分字符数（默认 500）
- **分块重叠** — 相邻分块重叠字符数（默认 50）
- **检索数量 (topK)** — 每次查询返回最大分块数（默认 3）

---

## 项目结构

```
ai-agent-flow-electron/
├── src/
│   ├── main/                    # Electron 主进程
│   │   └── ipc/                 # IPC 处理程序（chatRecord/avatar 等）
│   ├── preload/                 # 预加载桥接脚本
│   ├── renderer/                # 渲染进程 (React)
│   │   ├── assets/              # 样式、图片等静态资源
│   │   ├── components/
│   │   │   ├── ui/              # 通用组件 (Button/Modal/Pagination/Select/Avatar...)
│   │   │   ├── layout/          # 布局组件 (Sidebar/Nav/WindowControls)
│   │   │   ├── workflow/        # 工作流相关组件 (节点配置面板/节点渲染)
│   │   │   ├── agents/          # Agent 表单和详情
│   │   │   ├── chat/            # 对话界面
│   │   │   ├── skills/          # 技能组件
│   │   │   └── knowledge/       # 知识库组件
│   │   ├── pages/               # 页面 (Workflow/Chat/Agents/Skills...)
│   │   │   └── settings/        # 设置子页面 (LLM/主题/数据/赞助/关于...)
│   │   ├── store/               # Zustand 状态管理
│   │   ├── hooks/               # 自定义 Hooks
│   │   ├── lib/                 # API 客户端
│   │   ├── types/               # TypeScript 类型
│   │   └── config/              # 应用配置常量
│   └── server/                  # 内置 API 服务器
│       ├── src/
│       │   ├── database/        # 数据库初始化与迁移
│       │   ├── models/          # Sequelize 数据模型
│       │   ├── routes/          # API 路由 (workflows/agents/skills/triggers...)
│       │   ├── utils/           # 核心工具模块
│       │   │   ├── monitoredExecutor.ts  # LangGraph 执行器
│       │   │   ├── llmCache.ts           # TTL LLM 缓存
│       │   │   ├── knowledge.ts          # 分块/Embedding/向量检索
│       │   │   ├── hitl.ts               # 人工审批系统
│       │   │   ├── llm.ts                # LLM 调用封装
│       │   │   ├── cli.ts                # CLI 命令执行 (execa)
│       │   │   └── file.ts               # 文件操作
│       │   └── index.ts          # Express 入口
│       └── data/                 # SQLite 数据库文件
├── resources/
│   ├── models/                   # bge-m3 GGUF 模型
├── scripts/
│   ├── download-ollama.mjs       # Ollama 下载脚本
│   └── download-model.mjs        # 模型下载脚本
├── electron-vite.config.ts
├── tailwind.config.js
└── package.json
```

---

## API 接口

服务器默认运行在 `http://localhost:3100`。

### 工作流
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/workflows` | 获取所有工作流 |
| POST | `/api/workflows` | 创建工作流 |
| GET | `/api/workflows/:id` | 获取单个工作流 |
| PUT | `/api/workflows/:id` | 更新工作流 |
| DELETE | `/api/workflows/:id` | 删除工作流 |

### Agent
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/agents` | 获取所有 Agent |
| POST | `/api/agents` | 创建 Agent |
| PUT | `/api/agents/:id` | 更新 Agent |
| DELETE | `/api/agents/:id` | 删除 Agent |

### 静态资源
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/attachments/:id/:filename` | 附件文件（对话上传的文件） |
| GET | `/api/avatars/:filename` | Agent 头像图片（支持 1 年浏览器缓存） |

### 团队
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/teams` | 获取所有团队 |
| POST | `/api/teams` | 创建团队 |
| GET | `/api/teams/:id` | 获取单个团队 |
| PUT | `/api/teams/:id` | 更新团队 |
| DELETE | `/api/teams/:id` | 删除团队 |
| POST | `/api/team-chat-monitor` | 直聊执行团队 |

### 任务池
任务完整状态流转：`draft ↔ pending → assigned → claimed → pending_review → completed`，驳回自动重派原团队

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tasks` | 获取所有任务（?status= 筛选） |
| POST | `/api/tasks` | 创建任务（支持 status/parentId/projectId） |
| GET | `/api/tasks/:id` | 获取单个任务 |
| PUT | `/api/tasks/:id` | 更新任务（按状态限制可编辑字段） |
| DELETE | `/api/tasks/:id` | 删除任务 |
| GET | `/api/tasks/:id/subtasks` | 获取子任务列表 |
| POST | `/api/tasks/:id/assign` | 指派给团队 |
| POST | `/api/tasks/:id/complete` | 完成任务（进入待验收） |
| POST | `/api/tasks/:id/approve` | 验收通过（待验收 → 已完成） |
| POST | `/api/tasks/:id/reject` | 驳回（带审核意见，自动重派原团队） |
| POST | `/api/tasks/:id/fail` | 标记失败 |
| POST | `/api/tasks/:id/restart` | 重启任务 |
| POST | `/api/tasks/:id/cancel` | 终止执行中的任务 |

### 项目
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects` | 获取所有项目 |
| POST | `/api/projects` | 创建项目（name/workDir 必填） |
| GET | `/api/projects/:id` | 获取单个项目 |
| PUT | `/api/projects/:id` | 更新项目 |
| DELETE | `/api/projects/:id` | 删除项目（不级联关联任务） |

### 技能
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/skills` | 获取所有技能 |
| POST | `/api/skills` | 创建技能 |
| PUT | `/api/skills/:id` | 更新技能 |
| DELETE | `/api/skills/:id` | 删除技能 |

### LLM 配置
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/llm-config` | 获取所有配置 |
| GET | `/api/llm-config/active` | 获取当前活跃配置 |
| POST | `/api/llm-config` | 创建配置 |
| PUT | `/api/llm-config/:id` | 更新配置 |
| DELETE | `/api/llm-config/:id` | 删除配置 |
| POST | `/api/llm-config/:id/activate` | 切换活跃配置 |
| POST | `/api/llm-config/test-connection` | 测试连接 |

### 知识库
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/knowledge-base` | 获取所有知识库 |
| POST | `/api/knowledge-base` | 创建知识库 |
| PUT | `/api/knowledge-base/:id` | 更新知识库 |
| DELETE | `/api/knowledge-base/:id` | 删除知识库 |
| POST | `/api/knowledge-base/:id/documents` | 上传文档 |
| DELETE | `/api/knowledge-base/:id/documents/:docName` | 删除文档 |
| POST | `/api/knowledge-base/:id/retrieve` | 检索 |
| GET | `/api/knowledge-base/:id/stats` | 文档统计 |

### 触发器
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/triggers` | 获取所有触发器 |
| POST | `/api/triggers` | 创建触发器 |
| PUT | `/api/triggers/:id` | 更新触发器 |
| DELETE | `/api/triggers/:id` | 删除触发器 |
| POST | `/api/triggers/:id/execute` | 手动执行 |
| PUT | `/api/triggers/:id/toggle` | 启用/禁用 |

### 工作流执行
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/execute-workflow` | 执行工作流 |
| POST | `/api/execute-workflow/monitor` | 执行并获取执行 ID |
| GET | `/api/execute-workflow/progress/:id` | 获取执行进度 |
| POST | `/api/execute-workflow/stop/:id` | 停止执行 |
| POST | `/api/execute-workflow/approve-tool/:id` | 审批工具调用 |

### 日志
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/logs` | 获取日志列表 |
| DELETE | `/api/logs` | 清除日志 |

### 其他
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/data/db-stats` | 数据库文件大小统计 |
| POST | `/api/data/vacuum` | VACUUM 回收空间 |
| POST | `/webhook/:id` | Webhook 入口 |
| GET | `/api/health` | 健康检查 |
| GET | `/api/info` | 服务器信息 |

---

## 数据模型

### Workflow

```typescript
interface Workflow {
  id: string
  name: string
  description: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: Date
  updatedAt: Date
}
```

### LLMConfig

```typescript
interface LLMConfig {
  id: string
  name: string
  provider: string        // openai | anthropic | azure | bailian | longcat ...
  apiKey: string
  model: string
  baseUrl?: string
  temperature?: number
  maxTokens?: number
  isActive?: boolean
}
```

### Agent

```typescript
interface Agent {
  id: string
  name: string
  description: string
  instructions: string
  type: 'standard' | 'workflow'
  skillIds?: string[]
  enabledTools?: string[]
  workflowId?: string
  llmConfigId?: string
  avatarUrl?: string       // 头像 URL（/api/avatars/uuid.ext 或 data: URL）
  isSystem?: boolean
  createdAt: Date
  updatedAt: Date
}
```

---

## 开发指南

### 新增 API 路由

在 `src/server/src/routes/` 下创建路由文件，在 `src/server/src/index.ts` 中注册：

```typescript
import newRouter from './routes/new-route'
this.app.use('/api/new-route', newRouter)
```

### 新增节点类型

1. [components/workflow/nodes.ts](src/renderer/src/components/workflow/nodes.ts) 的 `NODE_DEFS` 中添加节点定义
2. [components/workflow/NodeTypes.tsx](src/renderer/src/components/workflow/NodeTypes.tsx) 中添加渲染组件
3. [server/utils/monitoredExecutor.ts](src/server/src/utils/monitoredExecutor.ts) 的 `executeNode` 中添加执行逻辑
4. [tailwind.config.js](tailwind.config.js) 的 safelist 中添加节点颜色

---

## 更新日志

### v2.4.0

- **Agent 头像系统**：新增头像上传（CustomFileUpload + IPC 写入 userData/avatars/ 目录），Express 头像服务路由（`/api/avatars/:filename`），Avatar 通用组件（自动补全 URL / 彩色首字母 / emoji 兜底 / 圆方形状配置）
- **Chat 页 AI 列表右键菜单**：新增顶置 Agent（持久化排序，已顶置排前面）和新对话（清空记忆 + 切换选中）
- **项目卡片风格对齐团队页**：蓝色/青色主题改为靛蓝/紫色，操作按钮改为右上角浮动面板，新增右下角 Chevron 箭头，改用 ResponsiveGrid 布局
- **Avatar 组件抽取**：统一 AgentListSidebar/AgentDetail/AgentCard/ChatMessage 四处的头像渲染

### v2.3.0

- **项目模块**：新增项目管理页面，创建项目绑定本地工作目录，一键打开文件管理器
- **任务关联项目**：顶级任务可选关联项目，Agent 执行时自动注入工作目录到上下文
- **待验收状态**：Agent 执行完后进入 pending_review，用户审查执行结果后手动验收通过或驳回
- **驳回审核意见**：支持填写修改意见，驳回后追加到描述并自动指派回原团队重新执行
- **草稿状态**：任务可设为草稿，草稿任务不可被认领或指派
- **子任务功能**：支持父子任务层级，详情展示父子关系树
- **任务池节点配置**：工作流任务池节点支持选择状态和项目
- **文件夹选择器**：新增系统原生目录选择对话框 IPC

### v2.2.0

- **团队执行看板**：新增 TeamMonitor 页面，实时消息流展示执行过程，支持历史回看
- **SSE 去轮询**：单连接全局 SSE，sync_state 快照 + 增量事件维护 activeTeamIds
- **审批侧栏去轮询**：ToolApprovalSidebar 响应式订阅 store，去掉 3s 轮询
- **审批状态细化**：已批准/已拒绝/已过期三种状态区分显示
- **团队无需审批选项**：autoApproveTools 配置开关，开启后工具自动放行
- **任务终止通知 SSE**：取消时广播 execution_complete + resolve 待审批 Promise
- **架构去双缓存**：eventsByTeam 改为 getter 推导，消除同步不一致
- **文件存储按 teamId 子目录**：logs/<teamId>/<executionId>.jsonl 减少扫描
- **服务端事件序列号**：SSE 事件附带 _seq 用于前端精确去重
- **审批结果持久化**：tool_approved 事件写入文件，刷新后状态恢复
- **StatusIcon 组件化**：消除 TeamMonitor/TaskDetailRow 间的重复定义

### v2.1.0

- **任务池页面全面优化**：表格改用展开行详情替代侧边面板，添加筛选空态、粘性表头、斑马纹、主题色统一为 blue/purple
- **任务编辑功能**：按状态控制可编辑字段（pending 全字段、assigned 仅标题、completed/failed 标题+描述），后端原子更新防竞态
- **任务终止中断 LLM**：AbortController 链路直达 ChatOpenAI.invoke，取消时真正中断 HTTP 请求停止消耗 token
- **任务池节点改发任务**：从"消费 pending 任务"改为"发布任务到池"，标题/描述支持 {{$input}} 模板，可选优先级
- **团队/任务 API 工具**：为 AI 助手布丁追加 teamsApi、tasksApi 工具，可管理团队和任务池
- **指派交互优化**：改用 ItemPickerModal 选择团队，一键指派
- **创建/编辑弹窗改用 Modal 组件**：统一拖拽、遮罩层关闭行为
- **表单管理**：改用 react-hook-form 管理创建/编辑表单状态
- **执行结果 Markdown 渲染**：完成任务的输出用 MarkdownPreview 组件展示
- **safeJsonParse 增强**：自动提取 markdown 代码块和裸 JSON，提高 LLM 解析容错

### v2.0.0

- **团队管理重构**：团队成为一等实体，支持直聊 `POST /team-chat-monitor`
- **三种协作模式**：队长分发、全员讨论、流水线，按团队配置自动执行
- **需求池系统**：Task 模型 + 任务池节点 + 手动指派 → 调度器串行消费
- **自动接取任务**：团队开启 auto-claim 后自动从池中认领执行
- **触发器支持团队**：Cron/Webhook 可直接触发团队执行
- **团队执行锁**：全局统一控制，主动触发排队等候，被动触发跳过
- **SSE 防抖**：Lodash debounce，每 resource 独立防抖 400ms
- **团队状态展示**：卡片显示空闲/待办/执行中状态 + 自动接取标签
- **数据库迁移**：teams 表自动新增 autoClaimEnabled/autoClaimInterval 列

### v1.7.0

- **数据库查询节点**：支持 SQLite/PostgreSQL/MySQL/SQL Server/MongoDB/Redis 六种数据库，SQL 和连接串支持模板变量
- **知识库检索节点**：工作流中直接向量检索知识库，结果传递给 LLM 节点实现 RAG
- **If 条件节点**：JS 布尔表达式多条件分支，无需 LLM 参与
- **Variable 变量节点**：设置/获取工作流变量，{{$vars.xxx}} 跨节点引用
- **模板市场全面升级**：新增工作流/Agent/技能 Tab，种子模板覆盖 API/MCP/Code/Skill/Workflow/Agent
- **Web 搜索切为 Bing**：DuckDuckGo 替换为国内可用的 Bing 搜索
- **模板变量支持表达式运算**：{{$params.a + $params.b}}、{{$input.toUpperCase()}} 等
- **表单统一 react-hook-form**：Triggers/Workflow 表单改用 Controller 管理，解决输入吞字
- **工作流输入对话框拆分**：独立 InputDialog 组件，代码更清晰
- **节点配置面板优化**：分支条件、知识库等支持 ExpressionInput 语法高亮
- **各管理页补充描述**：工作流/Agent/技能/知识库/执行监控页标题下方加说明
- **页面风格统一**：执行监控页布局和 Tabs 与模板市场一致
- **增量种子更新**：模板改为 updateOnDuplicate 幂等 upsert，不丢用户数据

### v1.6.0

- **节点扩容**：从 9 种扩展到 23 种，新增 If、Database、Knowledge、Variable、Loop、Transform、Split、Merge、Catch、Sleep、Note 等节点
- **Merge 并行聚合**：并行分支 fan-out + 条件边前驱等待机制
- **Loop 循环节点**：条件循环 + 反馈回路，JS 终止条件表达式
- **Error Catch 节点**：错误边路由 + 失败自动触发 + 红色虚线样式
- **Transform 转换节点**：JSON Path 提取、JSON↔Text 互转
- **Split 拆分节点**：数组/文本拆分逐项 + 子工作流处理
- **自动重试机制**：每个节点可配重试次数/间隔/退避策略
- **表达式系统**：{{}}、{{.xxx}}、{{[id].output}}、{{.xxx}}、{{.xxx}}、{{}}
- **环境变量管理**：全局(设置页) + 工作流级(编辑器)双层隔离
- **ExpressionInput 组件**：语法高亮 +  自动补全
- **变量参考弹窗**：画布工具栏变量按钮查阅完整变量表
- **节点测试**：右键菜单执行 → 测试对话框 → 独立执行查看输出
- **Code 节点**：JS 执行引擎，注入 //
- **代码质量控制**：.gitattributes eol=lf 统一换行符，多次重构优化

### v1.5.0

- **环境变量系统**：全局 {{$global.xxx}}(设置页) + 工作流级 {{$env.xxx}}(编辑器) 双层管理
- **表达式系统**：{{$input}}、{{$params.xxx}}、{{$nodes["id"].output}}、{{$env.xxx}}、{{$global.xxx}}、{{$now}}
- **ExpressionInput 组件**：语法高亮 + $nodes 自动补全
- **Code 节点**：JavaScript 执行引擎，注入 $input/$params/$nodes
- **变量参考弹窗**：画布工具栏"变量"按钮
- **设置页环境变量管理**：可视化 CRUD
- **全局 LF 换行符**：.gitattributes eol=lf

### v1.3.0

- Agent 类型扩展：标准 Agent（绑定技能/工具）和工作流 Agent（关联子工作流）
- 触发器模块：Cron 定时 + Webhook 自动执行，含可视化的 Cron 表达式编辑器
- LLM 节点内部 API 工具组：直接管理资源 CRUD 和执行
- 知识库 API 工具：LLM 可通过工具管理知识库和 RAG 检索
- SSE 实时同步：多窗口自动刷新数据变更
- 弹窗化改造：触发器/知识库表单/LLM 配置改为 Modal 弹窗
- 提取 Modal/Pagination/ItemPickerModal 公用组件
- 执行监控分页 + 状态筛选
- 时间轮迁移 Worker 线程
- Agent 删除自动清理关联数据和附件
- execa 替代手写命令执行
- 节点颜色统一管理，修复全局样式冲突
- 侧边栏优化：收起按钮移至底部，自动滚动

### v1.2.0

- RAG 知识库：内部/外部知识库，LLM 节点知识库检索增强
- sqlite-vec 向量存储 + Embedding 自动适配
- 工具调用 HITL 审批：危险操作需人工确认
- 执行监控：实时节点状态、进度、耗时
- LLM TTL 缓存 + Dagre 自动布局
- 深色/浅色主题统一
- 工具模块拆分

### v1.1.0

- 多 LLM 配置管理：创建/编辑/删除，一键切换
- 顶部切换器：导航栏快速切换活跃配置

### v1.0.0

- 初始版本：可视化工作流设计、Agent 管理、技能管理

---

## 许可证

本项目采用 **Anti-Commercial License**。个人学习、研究、教育用途免费。禁止商业使用。详见 [LICENSE](LICENSE)。

---

## 赞助支持

如果这个项目对你有帮助，欢迎[赞助支持](src/renderer/src/pages/settings/SettingsSponsor.tsx)项目持续发展。

## 联系方式

- GitHub：[HelinZhao/ai-agent-flow-electron](https://github.com/HelinZhao/ai-agent-flow-electron)
- Gitee：[zhao_he_lin/ai-agent-flow-electron](https://gitee.com/zhao_he_lin/ai-agent-flow-electron)
- 邮箱：<121292464@qq.com>
