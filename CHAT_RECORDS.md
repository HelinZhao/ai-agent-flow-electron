# 💬 Agent对话历史功能

## 功能概述

Agent对话历史功能允许用户保存和加载与不同Agent的对话记录。所有对话历史以Gzip压缩的JSON文件格式（`.json.gz`）保存在应用同级目录下，支持持久化存储和跨会话访问。

## 🚀 主要特性

### 1. 自动保存
- ✅ 每次发送消息后自动保存对话历史
- ✅ 无需手动操作，完全自动化
- ✅ 实时同步到本地文件

### 2. 智能加载
- ✅ 选择Agent时自动加载该Agent的历史对话
- ✅ 保持对话的连续性
- ✅ 支持跨会话访问历史记录
- ✅ **分页加载**：默认仅加载最近50条消息，减少加载时间

### 3. 文件存储
- ✅ 以Gzip压缩的JSON格式存储，大幅减小磁盘占用
- ✅ 按Agent ID分别存储
- ✅ 保存在应用同级目录，便于管理
- ✅ 兼容旧版未压缩的 .json 文件（自动识别并读取）

### 4. 历史管理
- ✅ 支持删除单个Agent的对话历史
- ✅ 支持清除所有对话历史
- ✅ 新对话功能可重置当前对话

### 5. 文件压缩
- ✅ Gzip压缩支持，大幅减小磁盘占用
- ✅ 使用 Node.js 内置 zlib 模块，无需额外依赖
- ✅ 兼容旧版未压缩的 .json 文件（自动识别并读取）

## 📁 存储结构

### 文件位置（Gzip压缩，扩展名 .json.gz）
```
应用同级目录/
├── ai-agent-flow-electron.exe (或应用文件)
└── chat_records/
    ├── chat_agent-id-1.json.gz
    ├── chat_agent-id-2.json.gz
    └── chat_agent-id-3.json.gz
```

### JSON文件格式（内部结构，文件以 Gzip 压缩存储）
```json
{
  "id": "chat_agent-id-1_1640995200000",
  "agentId": "agent-id-1",
  "agentName": "智能助手",
  "title": "用户的第一条消息...",
  "messages": [
    {
      "id": "msg-1640995200000",
      "content": "你好，请帮我分析这个问题",
      "sender": "user",
      "timestamp": "2022-01-01T00:00:00.000Z",
      "agentId": "agent-id-1"
    },
    {
      "id": "msg-1640995201000",
      "content": "好的，我来帮你分析这个问题...",
      "sender": "agent",
      "timestamp": "2022-01-01T00:00:01.000Z",
      "agentId": "agent-id-1"
    }
  ],
  "createdAt": "2022-01-01T00:00:00.000Z",
  "updatedAt": "2022-01-01T00:30:00.000Z"
}
```

## 🔧 技术实现

### 主进程实现 (`src/main/utils/chatHistory.ts`)
- `ChatHistoryManager` 类管理所有对话历史操作
- 支持保存、加载、删除、清空等操作
- 自动处理文件系统和JSON序列化

### IPC通信 (`src/main/ipc/chatHistory.ts`)
- 提供安全的进程间通信接口
- 封装所有文件操作，避免渲染进程直接访问文件系统
- 完善的错误处理机制

### 预加载脚本 (`src/preload/index.ts`)
- 暴露安全的API接口给渲染进程
- 类型安全的API调用

### 渲染进程集成 (`src/renderer/src/pages/Chat.tsx`)
- 自动保存对话历史
- 选择Agent时自动加载历史
- 支持手动重置对话

## 🎯 使用方法

### 1. 基本使用
1. 启动应用
2. 选择Agent开始对话
3. 发送消息，历史自动保存
4. 下次选择同一Agent时，历史对话自动加载

### 2. 管理对话历史
- **新对话**：点击"新对话"按钮重置当前Agent的对话
- **切换Agent**：选择不同Agent会自动加载对应的历史
- **查看历史文件**：在应用同级目录的`chat_history`文件夹中查看

### 3. 备份和恢复
1. **备份**：复制`chat_history`文件夹到其他位置
2. **恢复**：将备份的文件夹复制回应用同级目录
3. **选择性恢复**：只复制特定的Agent对话文件

## 🔒 安全考虑

### 数据保护
- 所有数据保存在本地，不上传到服务器
- JSON文件格式，用户可以随时查看和编辑
- 支持完全删除所有历史数据

### 隐私保护
- 对话内容仅保存在用户本地
- 不收集任何用户数据
- 用户可以随时清除所有对话历史

## 🛠️ 开发指南

### 扩展功能

#### 添加导出功能
```typescript
// 在ChatHistoryManager中添加
exportChatHistory(agentId: string): Promise<string> {
  // 导出指定Agent的对话历史
}

exportAllHistories(): Promise<string> {
  // 导出所有对话历史
}
```

#### 添加导入功能
```typescript
importChatHistory(jsonData: string): Promise<boolean> {
  // 导入对话历史
}
```

#### 添加搜索功能
```typescript
searchInHistories(keyword: string): Promise<ChatMessage[]> {
  // 在所有历史中搜索关键词
}
```

### 配置选项

#### 自动保存间隔
```typescript
// 可以添加配置来控制保存频率
interface ChatHistoryConfig {
  autoSave: boolean
  saveInterval: number // 毫秒
  maxHistorySize: number // 最大消息数量
}
```

#### 存储位置自定义
```typescript
// 允许用户自定义存储目录
setCustomHistoryDirectory(path: string): void
```

## 🐛 故障排除

### 常见问题

#### 1. 历史记录没有保存
- 检查应用是否有写入权限
- 确认`chat_history`目录是否存在
- 查看开发者工具控制台是否有错误信息

#### 2. 历史记录没有加载
- 检查对应Agent的历史文件是否存在
- 确认JSON文件格式是否正确
- 查看控制台是否有解析错误

#### 3. 文件过大问题
- 定期清理不需要的历史记录
- 使用"新对话"功能重置特定Agent的历史
- 手动删除历史文件

### 调试信息

#### 查看存储位置
```typescript
// 在开发者工具中执行
window.api.chatHistory.getHistoryDirectory()
```

#### 查看所有历史
```typescript
// 在开发者工具中执行
window.api.chatHistory.getAllHistories()
```

## 📈 性能考虑

### 优化策略
1. **懒加载**：只在需要时加载历史记录
2. **分页加载**：✅ 已实现，默认仅加载最近50条消息，支持点击"加载更早消息"按钮查看更多
3. **文件压缩**：✅ 已实现 Gzip 压缩支持
4. **缓存机制**：内存中缓存最近访问的历史

### 存储限制
- 建议定期清理历史记录
- 单个文件过大时考虑分割
- 支持导出和归档旧的历史记录

## 🔄 版本兼容性

### 数据迁移
- 未来版本升级时会保持JSON格式兼容
- 提供数据迁移工具（如需要）
- 支持旧版本数据导入

### 备份策略
- 建议定期备份重要对话
- 支持选择性备份特定Agent
- 可以集成云存储（未来功能）

---

**对话历史功能让每一次交流都有迹可循，让AI助手更加智能和个性化！** 🎯