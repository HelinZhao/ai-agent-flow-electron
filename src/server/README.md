# AI Agent Flow Designer - Backend Server

这是一个独立的Express后端服务，为AI Agent Flow Designer提供API支持。

## 功能特性

- 🚀 基于Express.js构建的高性能API服务
- 🗄️ SQLite数据库存储，支持工作流、智能体、技能等数据管理
- 🔗 LangGraph集成，支持复杂工作流的执行
- 🤖 多LLM提供商支持（OpenAI、Anthropic、Azure、Qwen、LongCat）
- 🛣️ RESTful API设计，易于集成和使用

## 技术栈

- **运行时**: Node.js
- **框架**: Express.js
- **数据库**: SQLite + Sequelize ORM
- **AI集成**: LangGraph, LangChain
- **语言**: TypeScript

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装

1. 克隆或下载本项目
2. 安装依赖：

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

服务器将在 http://localhost:3100 启动

### 构建生产版本

```bash
npm run build
npm start
```

## API端点

### 工作流管理

- `GET /api/workflows` - 获取所有工作流
- `POST /api/workflows` - 创建工作流
- `GET /api/workflows/:id` - 获取单个工作流
- `PUT /api/workflows/:id` - 更新工作流
- `DELETE /api/workflows/:id` - 删除工作流

### 智能体管理

- `GET /api/agents` - 获取所有智能体
- `POST /api/agents` - 创建智能体
- `GET /api/agents/:id` - 获取单个智能体
- `PUT /api/agents/:id` - 更新智能体
- `DELETE /api/agents/:id` - 删除智能体

### 技能管理

- `GET /api/skills` - 获取所有技能
- `POST /api/skills` - 创建技能
- `GET /api/skills/:id` - 获取单个技能
- `PUT /api/skills/:id` - 更新技能
- `DELETE /api/skills/:id` - 删除技能

### LLM配置

- `GET /api/llm-config` - 获取LLM配置
- `POST /api/llm-config` - 创建/更新LLM配置

### 工作流执行

- `POST /api/execute-workflow` - 执行工作流

### 系统

- `GET /health` - 健康检查
- `GET /` - API信息

## 数据模型

### Workflow（工作流）

```typescript
interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: string; // JSON string
  edges: string; // JSON string
  createdAt: Date;
  updatedAt: Date;
}
```

### Agent（智能体）

```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  instructions: string;
  workflowId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Skill（技能）

```typescript
interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### LLMConfig（LLM配置）

```typescript
interface LLMConfig {
  id: string;
  provider: 'openai' | 'anthropic' | 'azure' | 'qwen' | 'longcat';
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| PORT | 服务器端口 | 3100 |

## 开发指南

### 项目结构

```
src/
├── database/          # 数据库配置
├── models/           # 数据模型
├── routes/           # API路由
├── types/            # TypeScript类型定义
└── index.ts          # 应用入口
```

### 添加新路由

1. 在 `src/routes/` 目录下创建新的路由文件
2. 在 `src/index.ts` 中引入并注册路由

### 数据库迁移

本项目使用Sequelize的自动同步功能。在生产环境中，建议使用迁移脚本。

## 部署

### 使用PM2部署

```bash
npm install -g pm2
pm2 start dist/index.js --name "ai-agent-flow-server"
pm2 save
```

### Docker部署

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY dist/ ./dist/

EXPOSE 3100

CMD ["node", "dist/index.js"]
```

## 许可证

MIT License

## 支持

如有问题或建议，请提交Issue或联系开发者。