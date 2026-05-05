# AI Agent Flow Designer

AI Agent Flow Designer 是一个基于 Electron + React + TypeScript 的可视化 AI 工作流设计器。它允许用户通过拖拽节点的方式设计复杂的 AI 工作流，支持多种 AI 模型、自定义技能、知识库 RAG 增强等功能。

## 主要特性

- **可视化工作流设计** — 基于 React Flow 的拖拽式工作流编辑器，支持一键 dagre 自动布局
- **多 Agent 支持** — 创建和管理多个 AI Agent，支持多轮对话和附件传输
- **技能管理** — 自定义和管理 AI 技能模板
- **多 LLM 配置管理** — 支持 OpenAI、Anthropic、Azure、百炼(Bailian)、LongCat 等提供商，一键切换
- **知识库 RAG 增强** — 支持内部知识库（上传文档→自动分块→embedding→向量检索）和外部知识库（API 接入），LLM 节点可启用知识库增强
- **工具调用与 HITL 审批** — LLM 可自主调用文件读写、命令执行、HTTP 请求等工具，危险操作需人工审批
- **执行监控** — 实时查看工作流执行进度、节点状态、耗时和输出日志
- **LLM 缓存** — 自研 TTLCache，相同 prompt 10 分钟内直接返回缓存结果，节省 API 调用
- **深色/浅色主题** — 统一的主题切换，画布节点颜色在两种模式下保持一致
- **本地数据存储** — SQLite + sqlite-vec 向量存储，数据完全本地化
- **数据管理** — 支持聊天历史清除、数据库 VACUUM 空间回收

## 技术栈

### 前端

- **Electron** — 桌面应用框架
- **React 18 + TypeScript** — 用户界面
- **React Flow** — 流程图编辑引擎
- **Dagre** — 自动布局算法
- **Zustand** — 状态管理
- **TailwindCSS** — 样式框架
- **react-hook-form** — 表单管理

### 后端

- **Express** — 内嵌 Web 服务器
- **Sequelize + better-sqlite3** — ORM + SQLite 数据库
- **sqlite-vec** — 向量存储扩展，支持 float32 向量相似度检索
- **LangChain + LangGraph** — AI 应用开发框架，带 checkpoint 持久化
- **Multer** — 文件上传处理

## 系统要求

- Node.js 18+
- npm 10+
- Windows 10+ / macOS 10.15+ / Linux

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev
```

### 构建

```bash
npm run build          # 构建当前平台
npm run build:win      # 构建 Windows 版本
npm run build:mac      # 构建 macOS 版本
npm run build:linux    # 构建 Linux 版本
```

### 代码质量

```bash
npm run format         # 格式化代码
npm run lint           # 代码检查
npm run typecheck      # 类型检查
```

## 项目结构

```text
ai-agent-flow-electron/
├── src/
│   ├── main/                # Electron 主进程
│   ├── preload/             # 预加载脚本
│   ├── renderer/            # 渲染进程 (React)
│   │   ├── assets/          # 静态资源和样式
│   │   ├── components/      # React 组件
│   │   │   ├── ui/          # 通用 UI 组件 (Button/Input/Select...)
│   │   │   ├── chat/        # 对话界面组件
│   │   │   ├── layout/      # 布局组件
│   │   │   └── workflow/    # 工作流相关组件
│   │   │       ├── config/  # 节点配置面板 (LLM/CLI/Skill...)
│   │   │       └── nodes.tsx # 节点类型定义和渲染
│   │   ├── lib/             # 工具库 (API 客户端)
│   │   ├── pages/           # 页面组件
│   │   │   ├── settings/    # 设置子页面 (LLM/知识库/主题/数据)
│   │   ├── store/           # Zustand 状态管理
│   │   ├── types/           # TypeScript 类型定义
│   │   └── App.tsx          # 主应用组件
│   └── server/              # 内置 API 服务器
│       ├── src/
│       │   ├── database/    # 数据库初始化
│       │   ├── models/      # Sequelize 数据模型
│       │   │   ├── KnowledgeBase.ts    # 知识库模型
│       │   │   ├── KnowledgeChunk.ts   # 知识分块模型
│       │   ├── routes/      # API 路由
│       │   │   ├── knowledge-base.ts   # 知识库 CRUD + 文档上传
│       │   │   ├── data.ts             # 数据管理 (VACUUM 等)
│       │   ├── utils/       # 工具模块
│       │   │   ├── knowledge.ts        # 文档分块/embedding/向量检索
│       │   │   ├── monitoredExecutor.ts # LangGraph 工作流执行器
│       │   │   ├── llmCache.ts         # TTL LLM 缓存
│       │   │   ├── llm.ts              # LLM 调用
│       │   │   ├── hitl.ts             # 人工审批(HITL)类型
│       │   │   ├── cli.ts              # CLI 命令执行
│       │   │   ├── api.ts              # HTTP API 调用
│       │   │   ├── file.ts             # 文件和附件操作
│       │   │   ├── shared.ts           # 共享类型和工具函数
│       │   │   └── index.ts            # 模块导出桶文件
│       │   └── index.ts     # 服务器入口 (Express + 路由注册)
│       └── data/            # SQLite 数据库文件目录
│           ├── database.sqlite   # 主数据库
│           └── knowledge.sqlite  # 向量数据库
├── resources/               # 应用资源文件
├── tailwind.config.js       # Tailwind 配置 (含节点颜色 safelist)
├── electron-vite.config.ts  # Electron-Vite 配置
└── package.json
```

## 工作流节点类型

| 节点 | 功能 | 说明 |
|------|------|------|
| Start | 入口 | 接收用户输入 |
| LLM | 大语言模型 | 调用 LLM 生成回复，支持工具调用、缓存、知识库增强 |
| Skill | 技能 | 调用预定义技能模板处理输入 |
| Branch | 条件分支 | 用 LLM 语义评估选择不同路径 |
| API | HTTP 调用 | 调用外部 API 获取数据 |
| Agent | 智能体 | 调用预配置 Agent 执行任务 |
| CLI | 命令行 | 执行 shell 命令或预设模板 |
| End | 出口 | 返回最终结果 |

## 知识库功能

### 内部知识库

- 上传 txt/md 文档，系统自动分块、生成 embedding 向量、存入 sqlite-vec
- Embedding 模型根据当前活跃的 LLM 提供商自动选择（百炼→text-embedding-v3，OpenAI→text-embedding-3-small）
- 检索时用向量相似度搜索返回最相关的 top-K 分块，注入 LLM 提示词

### 外部知识库

- 配置外部检索 API 地址和认证信息
- 查询时直接调用第三方服务获取上下文

### 配置参数

- **分块大小** — 文档切分的字符数（默认 500），影响语义完整性和检索精度
- **分块重叠** — 相邻分块重叠字符数（默认 50），防止关键信息被切断
- **检索数量 (topK)** — 每次查询返回的最大分块数（默认 3）

## API 接口

服务器默认运行在 `http://localhost:3100`。

### 工作流管理

- `GET /api/workflows` — 获取所有工作流
- `POST /api/workflows` — 创建工作流
- `GET /api/workflows/:id` — 获取单个工作流
- `PUT /api/workflows/:id` — 更新工作流
- `DELETE /api/workflows/:id` — 删除工作流

### Agent 管理

- `GET /api/agents` — 获取所有 Agent
- `POST /api/agents` — 创建 Agent
- `PUT /api/agents/:id` — 更新 Agent
- `DELETE /api/agents/:id` — 删除 Agent

### 技能管理

- `GET /api/skills` — 获取所有技能
- `POST /api/skills` — 创建技能
- `PUT /api/skills/:id` — 更新技能
- `DELETE /api/skills/:id` — 删除技能

### LLM 配置管理

- `GET /api/llm-config` — 获取所有 LLM 配置
- `GET /api/llm-config/active` — 获取当前活跃配置
- `POST /api/llm-config` — 创建配置
- `PUT /api/llm-config/:id` — 更新配置
- `DELETE /api/llm-config/:id` — 删除配置
- `POST /api/llm-config/:id/activate` — 切换活跃配置
- `POST /api/llm-config/test-connection` — 测试连接

### 知识库管理

- `GET /api/knowledge-base` — 获取所有知识库
- `POST /api/knowledge-base` — 创建知识库
- `PUT /api/knowledge-base/:id` — 更新知识库
- `DELETE /api/knowledge-base/:id` — 删除知识库
- `POST /api/knowledge-base/:id/documents` — 上传文档（内部知识库）
- `DELETE /api/knowledge-base/:id/documents/:docName` — 删除文档
- `POST /api/knowledge-base/:id/retrieve` — 检索接口
- `GET /api/knowledge-base/:id/stats` — 获取文档统计

### 数据管理

- `GET /api/data/db-stats` — 获取数据库文件大小统计
- `POST /api/data/vacuum` — 清理数据库空闲空间

### 工作流执行

- `POST /api/execute-workflow` — 执行工作流
- `POST /api/execute-workflow/monitor` — 执行工作流并获取执行 ID
- `GET /api/execute-workflow/progress/:id` — 获取执行进度
- `POST /api/execute-workflow/stop/:id` — 停止执行
- `POST /api/execute-workflow/approve-tool/:id` — 审批工具调用

### 系统接口

- `GET /api/health` — 健康检查
- `GET /api/info` — 获取服务器信息

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
  provider: 'openai' | 'anthropic' | 'azure' | 'bailian' | 'longcat'
  apiKey: string
  model: string
  baseUrl?: string
  temperature?: number
  maxTokens?: number
  isActive?: boolean
}
```

### KnowledgeBase

```typescript
interface KnowledgeBase {
  id: string
  name: string
  description: string
  type: 'internal' | 'external'
  embeddingModel: string    // 自动根据提供商设置
  chunkSize: number         // 默认 500
  chunkOverlap: number      // 默认 50
  topK: number              // 默认 3
  apiUrl: string            // 外部知识库 API 地址
  apiKey: string            // 外部知识库认证密钥
  createdAt: Date
  updatedAt: Date
}
```

## 开发指南

### 数据库

Sequelize 自动同步表结构，无需手动迁移。数据库文件位于 `data/database.sqlite`，向量数据位于 `data/knowledge.sqlite`。删除数据后文件不会自动缩小，可在设置→数据管理中执行 VACUUM 回收空间。

### 新增 API 路由

在 `src/server/src/routes/` 下创建路由文件，在 `src/server/src/index.ts` 中注册：

```typescript
import newRouter from './routes/new-route'
this.app.use('/api/new-route', newRouter)
```

### 新增节点类型

1. 在 `src/renderer/src/components/workflow/nodes.ts` 的 `NODE_DEFS` 中添加节点定义
2. 在 `src/renderer/src/components/workflow/NodeTypes.tsx` 中添加节点渲染组件
3. 在 `src/server/src/utils/monitoredExecutor.ts` 的 `executeNode` 中添加执行逻辑
4. 在 `tailwind.config.js` 的 safelist 中添加节点颜色

## 更新日志

### v1.2.0

- 知识库 RAG 增强 — 支持内部/外部知识库，LLM 节点可启用知识库检索增强
- sqlite-vec 向量存储 — 内部知识库使用 sqlite-vec 进行向量相似度检索
- Embedding 自动适配 — 根据活跃 LLM 提供商自动选择 embedding 模型和维度
- 工具调用 HITL 审批 — 危险工具需人工审批，支持会话级放权
- 执行监控 — 实时查看节点状态、进度、耗时
- LLM TTL 缓存 — 10 分钟过期，避免重复 API 调用
- 一键 dagre 自动布局 — 画布节点自动排列
- 深色/浅色主题统一 — 节点颜色在两种模式下一致
- 数据管理 — 支持 VACUUM 清理数据库空闲空间
- 工具模块拆分 — server/utils 从单文件拆分为独立模块

### v1.1.0

- 多 LLM 配置管理 — 支持创建、编辑、删除多个 AI 模型配置
- 配置一键切换 — 类似 CCswitch 的快速切换功能
- 顶部切换器 — 导航栏快速切换活跃配置

### v1.0.0

- 初始版本发布
- 可视化工作流设计、Agent 管理、技能管理
- SQLite 数据库、ReactFlow 编辑器

## 许可证

本项目采用 MIT 许可证。

## 联系方式

- 项目地址: [https://gitee.com/zhao_he_lin/ai-agent-flow-electron](https://gitee.com/zhao_he_lin/ai-agent-flow-electron)
- 邮箱: <121292464@qq.com>