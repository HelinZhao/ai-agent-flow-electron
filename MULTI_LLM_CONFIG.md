# 多LLM配置管理系统

## 功能概述

本系统支持管理多个大语言模型配置，可以随时在不同配置之间切换，类似 CCswitch 的功能。这是 AI Agent Flow Designer v1.1.0 的核心新功能。

## 🚀 主要特性

### 1. 多配置管理
- ✅ 支持创建多个LLM配置
- ✅ 每个配置包含：名称、提供商、API Key、模型、Base URL、温度、最大Token数
- ✅ 支持编辑和删除配置
- ✅ 不能删除最后一个配置

### 2. 配置切换
- ✅ 一键切换活跃配置
- ✅ 顶部导航栏显示当前活跃配置
- ✅ 快速切换组件支持3个常用配置的快速切换
- ✅ 配置列表显示活跃状态

### 3. 支持的提供商
- OpenAI
- Anthropic
- Azure OpenAI
- Bailian (阿里百炼)
- Longcat

### 4. 数据持久化
- ✅ 配置保存在SQLite数据库中
- ✅ 自动记住活跃配置
- ✅ 应用重启后保持配置状态

## 数据库结构

### LLMConfig 表
```sql
CREATE TABLE llm_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL DEFAULT '默认配置',
  provider VARCHAR(50) NOT NULL,
  apiKey TEXT NOT NULL,
  model VARCHAR(100) NOT NULL,
  baseUrl TEXT,
  temperature FLOAT DEFAULT 0.7,
  maxTokens INTEGER DEFAULT 2000,
  isActive BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API 接口

### 获取所有配置
```
GET /api/llm-config
```

### 获取活跃配置
```
GET /api/llm-config/active
```

### 创建配置
```
POST /api/llm-config
```

### 更新配置
```
PUT /api/llm-config/:id
```

### 删除配置
```
DELETE /api/llm-config/:id
```

### 切换活跃配置
```
POST /api/llm-config/:id/activate
```

## 前端组件

### 1. Settings 页面 (`src/renderer/src/pages/Settings.tsx`)
- 配置列表显示
- 新建/编辑配置表单
- 删除配置功能
- 切换活跃配置

### 2. LLMConfigSwitcher 组件 (`src/renderer/src/components/LLMConfigSwitcher.tsx`)
- 顶部导航栏的下拉切换器
- 显示当前活跃配置
- 快速切换到其他配置

### 3. QuickConfigSwitch 组件 (`src/renderer/src/components/QuickConfigSwitch.tsx`)
- 快速切换按钮组
- 显示前3个配置的快捷切换按钮
- 适合在需要频繁切换的场景使用

## 使用方法

### 创建配置
1. 进入 "API设置" 页面
2. 点击 "新建配置" 按钮
3. 填写配置信息：
   - 配置名称（必填）
   - 提供商（必填）
   - API Key（必填）
   - 模型名称
   - Base URL（可选，用于代理或自定义端点）
   - 温度和最大Token数
4. 点击 "创建配置"

### 切换配置
1. 在顶部导航栏点击当前配置名称
2. 从下拉列表中选择要切换的配置
3. 或者使用快速切换按钮直接切换

### 编辑配置
1. 在 "API设置" 页面找到要编辑的配置
2. 点击 "编辑" 按钮
3. 修改配置信息
4. 点击 "更新配置"

### 删除配置
1. 在 "API设置" 页面找到要删除的配置
2. 点击 "删除" 按钮
3. 确认删除操作

## 注意事项

1. **API Key 安全**: API Key 以加密形式存储在本地数据库中
2. **配置验证**: 系统会根据提供商验证API Key格式
3. **活跃配置**: 任何时候只能有一个活跃配置
4. **删除保护**: 不能删除最后一个配置
5. **自动切换**: 删除活跃配置时会自动切换到其他配置

## 🛠️ 技术实现

### 后端
- 使用 Sequelize ORM 管理数据库
- Express.js 提供 RESTful API
- 支持配置的版本管理和状态管理
- 自动数据库迁移和表结构修复

### 前端
- 使用 Zustand 管理全局状态
- React Hook Form 处理表单验证
- 响应式设计，支持深色模式
- 实时更新配置状态
- 组件化设计，易于扩展

## 扩展性

系统架构支持轻松扩展：
- 添加新的LLM提供商
- 增加配置模板功能
- 支持配置导入/导出
- 添加配置测试功能
- 支持配置的批量操作