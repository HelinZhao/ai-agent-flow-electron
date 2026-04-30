# AI Agent Flow Designer

AI Agent Flow Designer 是一个基于 Electron + React + TypeScript 的可视化 AI 工作流设计器。它允许用户通过拖拽节点的方式设计复杂的 AI 工作流，支持多种 AI 模型和自定义技能。

## ✨ 主要特性

- 🎨 **可视化工作流设计** - 基于 ReactFlow 的拖拽式工作流编辑器
- 🤖 **多 Agent 支持** - 创建和管理多个 AI Agent
- 🛠️ **技能管理** - 自定义和管理 AI 技能
- 🔧 **多LLM配置管理** - 支持创建和管理多个AI模型配置，一键切换不同提供商（OpenAI、Anthropic、Azure、Bailian、LongCat）
- 💾 **本地数据存储** - 使用 SQLite 数据库进行本地数据持久化
- 🌐 **RESTful API** - 内置 Express 服务器提供完整的 API 接口
- 🎯 **实时执行** - 支持工作流的实时执行和调试

## 🏗️ 技术栈

### 前端

- **Electron** - 桌面应用框架
- **React 18** - 用户界面库
- **TypeScript** - 类型安全
- **ReactFlow** - 流程图编辑器
- **Zustand** - 状态管理
- **Axios** - HTTP 客户端
- **TailwindCSS** - 样式框架

### 后端

- **Express** - Web 服务器框架
- **Sequelize** - ORM 数据库工具
- **SQLite** - 轻量级数据库
- **LangChain** - AI 应用开发框架

## 📋 系统要求

- Node.js 18+
- npm 10+
- Windows 10+ / macOS 10.15+ / Linux

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动开发服务器
npm run dev
```

### 构建应用

```bash
# 构建当前平台
npm run build

# 构建 Windows 版本
npm run build:win

# 构建 macOS 版本  
npm run build:mac

# 构建 Linux 版本
npm run build:linux
```

### 代码检查

```bash
# 格式化代码
npm run format

# 代码检查
npm run lint

# 类型检查
npm run typecheck
```

## 📁 项目结构

```text
ai-agent-flow-electron/
├── src/
│   ├── main/              # Electron 主进程代码
│   │   └── index.ts
│   ├── preload/           # 预加载脚本
│   │   └── index.ts
│   ├── renderer/          # 渲染进程代码 (React)
│   │   ├── assets/        # 静态资源
│   │   ├── components/    # React 组件
│   │   ├── lib/          # 工具库 (API 客户端等)
│   │   ├── pages/         # 页面组件
│   │   ├── store/         # 状态管理 (Zustand)
│   │   ├── types/         # TypeScript 类型定义
│   │   └── App.tsx        # 主应用组件
│   └── server/            # 内置 API 服务器
│       ├── src/
│       │   ├── models/    # 数据库模型
│       │   ├── routes/    # API 路由
│       │   ├── database/ # 数据库配置
│       │   └── index.ts  # 服务器入口
│       └── data/         # SQLite 数据库文件
├── resources/             # 应用资源文件
├── electron-vite.config.ts # Electron-Vite 配置
├── package.json
└── README.md
```

## 🔌 API 接口

服务器默认运行在 `http://localhost:3000`，提供以下 API 接口：

### 工作流管理

- `GET /api/workflows` - 获取所有工作流
- `POST /api/workflows` - 创建工作流
- `GET /api/workflows/:id` - 获取单个工作流
- `PUT /api/workflows/:id` - 更新工作流
- `DELETE /api/workflows/:id` - 删除工作流

### Agent 管理

- `GET /api/agents` - 获取所有 Agent
- `POST /api/agents` - 创建 Agent
- `GET /api/agents/:id` - 获取单个 Agent
- `PUT /api/agents/:id` - 更新 Agent
- `DELETE /api/agents/:id` - 删除 Agent

### 技能管理

- `GET /api/skills` - 获取所有技能
- `POST /api/skills` - 创建技能
- `GET /api/skills/:id` - 获取单个技能
- `PUT /api/skills/:id` - 更新技能
- `DELETE /api/skills/:id` - 删除技能

### LLM 配置管理

- `GET /api/llm-config` - 获取所有 LLM 配置
- `GET /api/llm-config/active` - 获取当前活跃配置
- `POST /api/llm-config` - 创建新的 LLM 配置
- `PUT /api/llm-config/:id` - 更新指定配置
- `DELETE /api/llm-config/:id` - 删除配置
- `POST /api/llm-config/:id/activate` - 切换为活跃配置

### 工作流执行

- `POST /api/execute-workflow` - 执行工作流

### 系统接口

- `GET /api/health` - 健康检查
- `GET /api/info` - 获取服务器信息

## 🗄️ 数据模型

### Workflow (工作流)

```typescript
interface Workflow {
  id: string
  name: string
  description: string
  nodes: WorkflowNode[]    // 工作流节点
  edges: WorkflowEdge[]    // 节点连接关系
  createdAt: Date
  updatedAt: Date
}
```

### Agent (智能体)

```typescript
interface Agent {
  id: string
  name: string
  description: string
  instructions: string     // 指令/提示词
  workflowId?: string     // 关联的工作流
  createdAt: Date
  updatedAt: Date
}
```

### Skill (技能)

```typescript
interface Skill {
  id: string
  name: string
  description: string
  content: string         // 技能内容/代码
  createdAt: Date
  updatedAt: Date
}
```

### LLMConfig (LLM配置)

```typescript
interface LLMConfig {
  id?: string                    // 配置ID
  name: string                   // 配置名称
  provider: 'openai' | 'anthropic' | 'azure' | 'bailian' | 'longcat'
  apiKey: string                 // API密钥
  model: string                  // 模型名称
  baseUrl?: string              // 自定义API地址（可选）
  temperature?: number          // 温度参数
  maxTokens?: number            // 最大Token数
  isActive?: boolean            // 是否为当前活跃配置
  createdAt?: Date
  updatedAt?: Date
}
```

## 🛠️ 开发指南

### 环境变量

应用支持以下环境变量：

- `ELECTRON_RENDERER_URL` - 开发环境下的渲染器 URL
- `NODE_ENV` - 环境模式 (development/production)

### 编码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 和 Prettier 配置
- 中文注释和文档
- UTF-8 编码

### 数据库迁移

数据库使用 Sequelize 自动同步，无需手动迁移。调试开发的数据库文件位于 `/data/database.sqlite`。

### API 开发

新的 API 路由应在 `src/server/src/routes/` 目录下创建，并在 `src/server/src/index.ts` 中注册。

## 🐛 常见问题

### 1. 中文乱码问题

如果在 API 响应中遇到中文乱码，确保：

- 服务器响应头包含 `Content-Type: application/json; charset=utf-8`
- 数据库使用 UTF-8 编码
- Node.js 环境支持 UTF-8

### 2. Sequelize 警告

如果看到 "public class fields" 警告，这是正常的，我们使用 `declare` 关键字来避免属性冲突。

### 3. 多LLM配置管理

- 支持创建多个不同提供商的AI配置
- 可在顶部导航栏快速切换活跃配置
- 每个配置可独立设置API参数
- 配置数据自动保存到本地数据库

### 4. 端口占用

如果端口 3000 被占用，服务器会自动尝试下一个可用端口。

## 📝 更新日志

### v1.1.0

- 🚀 **多LLM配置管理** - 支持创建、编辑、删除多个AI模型配置
- 🔄 **配置一键切换** - 类似CCswitch的快速配置切换功能
- 🎯 **顶部切换器** - 在导航栏快速切换活跃配置
- 💼 **配置持久化** - 所有配置自动保存到本地数据库
- 🛡️ **数据迁移** - 自动处理数据库表结构升级

### v1.0.0

- 🎉 初始版本发布
- ✨ 实现基本的工作流设计功能
- 🤖 支持 Agent 管理
- 🛠️ 添加技能管理功能
- 🔧 支持多LLM配置管理和一键切换
- 💾 集成 SQLite 数据库
- 🎨 基于 ReactFlow 的可视化编辑器

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

如有问题或建议，请提交 Issue 或通过以下方式联系：

- 项目地址: [https://gitee.com/zhao_he_lin/ai-agent-flow-electron](https://gitee.com/zhao_he_lin/ai-agent-flow-electron)
- 邮箱: <121292464@qq.com>

---

**AI Agent Flow Designer** - 让 AI 工作流设计变得简单直观 🎯
