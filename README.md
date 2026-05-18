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
- 多轮对话上下文记忆，支持文件附件传输
- 无工作流时自动降级为 LLM 对话

### 🔄 可视化工作流
- 基于 React Flow 的拖拽式编辑器，8 种节点类型组合编排
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
- LLM 节点可调内部 API（工作流/Agent/技能/知识库/系统配置 CRUD）
- 危险操作需人工审批确认，支持会话级放权

### ⏰ 触发器模块
- **Cron 定时触发** — 可视化 Cron 表达式编辑器，支持 Quartz 格式（秒级精度），含预设模板
- **Webhook 触发** — HTTP 回调自动执行工作流或 Agent
- 支持启用/禁用控制和手动执行

### 🎨 更多功能
- **多 LLM 配置** — OpenAI / Anthropic / Azure / 百炼 / LongCat 等，一键切换活跃配置
- **LLM 缓存** — 自研 TTL 缓存，相同 Prompt 10 分钟内命中缓存，节省 API 费用
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
| Start | 入口 | 接收用户输入，启动工作流 |
| LLM | 大语言模型 | 调用 LLM 生成回复，支持工具调用、TTL 缓存、知识库增强 |
| Skill | 技能 | 调用预定义的技能模板处理输入 |
| Branch | 条件分支 | LLM 语义评估后选择不同路径 |
| API | HTTP 调用 | 调用外部 API 获取或处理数据 |
| Agent | 智能体 | 调用已配置的 Agent 执行子任务 |
| CLI | 命令行 | 执行 Shell 命令或预设模板 |
| End | 出口 | 汇总并返回最终结果 |

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
│   ├── preload/                 # 预加载桥接脚本
│   ├── renderer/                # 渲染进程 (React)
│   │   ├── assets/              # 样式、图片等静态资源
│   │   ├── components/
│   │   │   ├── ui/              # 通用组件 (Button/Modal/Pagination/Select...)
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
  type: 'standard' | 'workflow'
  systemPrompt?: string
  skillIds?: string[]
  tools?: string[]
  workflowId?: string
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

### v1.4.0

- **系统 AI 助手**：悬浮式 AI 助手（可拖拽），支持自由移动位置、智能避让窗口边缘
- 系统助手集成全部工具能力，危险操作走 HITL 人工审批流程
- 系统助手对话历史持久化，每次打开自动恢复上下文
- Agent 列表置顶显示系统助手，支持限制编辑（仅技能/工具可调）
- Chat 页 Agent 列表系统助手增加"系统"标签
- 通用设置新增"悬浮系统助手"开关，可关闭
- 备份导出：支持触发器和知识库数据
- download-ollama.mjs 新增 --platform / --arch 参数，支持跨平台指定下载

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
