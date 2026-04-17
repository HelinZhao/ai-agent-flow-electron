# 工作流执行性能监控与实时反馈

本文档介绍如何在AI Agent Flow Electron项目中实现和使用工作流执行性能监控功能。

## 功能概述

### 1. 核心功能
- **实时执行进度监控**：跟踪工作流的执行状态和进度
- **节点级别监控**：监控每个节点的执行状态、耗时和结果
- **性能指标收集**：收集执行时间、成功率等关键指标
- **实时反馈界面**：在UI中实时显示执行进度和状态
- **执行控制**：支持暂停、恢复和停止执行

### 2. 技术实现
- **前端监控Hook**：`useWorkflowExecution` 提供完整的执行状态管理
- **后端监控执行器**：`MonitoredLangGraphExecutor` 实现带监控的工作流执行
- **实时API接口**：提供执行进度查询和控制接口
- **可视化组件**：`ExecutionProgressPanel` 提供直观的进度显示

## 文件结构

```
src/renderer/src/
├── types/index.ts                    # 类型定义
├── lib/workflowExecution.ts          # 执行监控API
├── hooks/useWorkflowExecution.ts     # 执行监控Hook
└── components/workflow/
    ├── ExecutionProgressPanel.tsx     # 进度显示组件
    └── WorkflowDesigner.tsx          # 集成监控功能

src/server/src/
├── routes/execute-workflow.ts        # 执行监控路由
└── utils/monitoredExecutor.ts        # 监控执行器

test-execution-monitor.js            # 测试脚本
```

## 类型定义

### WorkflowExecutionProgress

```typescript
interface WorkflowExecutionProgress {
  executionId: string
  workflowId: string
  workflowName: string
  currentNodeId?: string
  currentNodeLabel?: string
  metrics: WorkflowExecutionMetrics
  nodeResults: NodeExecutionResult[]
  executionPath: string[]
  estimatedTimeRemaining?: number
  logs: ExecutionLog[]
}
```

### NodeExecutionResult

```typescript
interface NodeExecutionResult {
  nodeId: string
  nodeType: string
  nodeLabel: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: Date
  endTime?: Date
  duration?: number
  input?: any
  output?: any
  error?: string
  metadata?: Record<string, any>
}
```

## API接口

### 1. 开始执行（异步监控）

```bash
POST /api/execute-workflow/monitor

请求体:
{
  "workflow": Workflow,
  "input": "执行输入",
  "agentId": "agent-123",
  "threadId": "thread-456"
}

响应:
{
  "executionId": "exec-uuid",
  "message": "工作流执行已开始"
}
```

### 2. 获取执行进度

```bash
GET /api/execute-workflow/progress/{executionId}

响应:
{
  "executionId": "exec-uuid",
  "workflowId": "workflow-123",
  "workflowName": "测试工作流",
  "currentNodeId": "node-456",
  "currentNodeLabel": "LLM处理",
  "metrics": {
    "executionId": "exec-uuid",
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-01-01T00:00:05.000Z",
    "duration": 5000,
    "status": "completed",
    "totalNodes": 3,
    "completedNodes": 3,
    "failedNodes": 0,
    "progress": 100
  },
  "nodeResults": [...],
  "executionPath": ["开始", "LLM处理", "结束"],
  "logs": [...]
}
```

### 3. 执行控制

```bash
# 暂停执行
POST /api/execute-workflow/pause/{executionId}

# 恢复执行
POST /api/execute-workflow/resume/{executionId}

# 停止执行
POST /api/execute-workflow/stop/{executionId}
```

## 前端使用

### 1. 使用useWorkflowExecution Hook

```typescript
import { useWorkflowExecution } from '@renderer/hooks/useWorkflowExecution'

function MyComponent() {
  const {
    executionId,
    progress,
    isRunning,
    error,
    executeWorkflow,
    stopExecution
  } = useWorkflowExecution({
    onProgress: (progress) => {
      console.log('进度更新:', progress.metrics.progress + '%')
    },
    onNodeComplete: (nodeResult) => {
      console.log('节点完成:', nodeResult.nodeLabel)
    },
    onComplete: (finalProgress) => {
      console.log('执行完成')
    },
    onError: (errorMsg) => {
      console.error('执行错误:', errorMsg)
    }
  })

  const handleRun = async () => {
    try {
      await executeWorkflow(workflow, '输入内容')
    } catch (error) {
      console.error('执行失败:', error)
    }
  }

  return (
    <div>
      <button onClick={handleRun} disabled={isRunning}>
        {isRunning ? '执行中...' : '开始执行'}
      </button>

      {progress && (
        <ExecutionProgressPanel
          progress={progress}
          isRunning={isRunning}
          onStop={stopExecution}
        />
      )}
    </div>
  )
}
```

### 2. 在WorkflowDesigner中使用

```typescript
// WorkflowDesigner组件已集成监控功能
// 执行时会自动显示进度面板

const handleRun = useCallback(async () => {
  try {
    await executeWorkflow(workflow, '执行测试，你好')
    // 进度面板会自动显示
  } catch (error) {
    console.error('工作流执行失败:', error)
  }
}, [workflow, executeWorkflow])
```

## 后端实现

### MonitoredLangGraphExecutor

```typescript
// 创建监控执行器
const monitoredExecutor = new MonitoredLangGraphExecutor()

// 开始执行
const executionId = await monitoredExecutor.startExecution(
  workflow,
  input,
  llmConfig,
  agentId,
  threadId
)

// 获取执行状态
const state = monitoredExecutor.getExecutionState(executionId)

// 控制执行
monitoredExecutor.pauseExecution(executionId)
monitoredExecutor.resumeExecution(executionId)
monitoredExecutor.stopExecution(executionId)
```

## 性能特点

1. **实时更新**：每2秒自动获取最新执行状态
2. **低开销**：异步执行不影响主流程性能
3. **完整追踪**：记录每个节点的详细执行信息
4. **错误恢复**：支持执行中断和恢复
5. **内存优化**：执行完成后自动清理状态

## 测试

运行测试脚本验证功能：

```bash
node test-execution-monitor.js
```

测试脚本将验证：
- ✅ 执行开始和进度获取
- ✅ 实时进度更新
- ✅ 执行控制（暂停/恢复/停止）
- ✅ 错误处理和超时控制
- ✅ 完整的执行链路追踪

## 集成建议

1. **UI集成**：在需要的地方添加`ExecutionProgressPanel`组件
2. **错误处理**：实现适当的错误提示和重试机制
3. **性能监控**：定期清理完成的执行记录
4. **用户体验**：根据执行状态调整界面交互

## 故障排除

### 常见问题

1. **执行状态不更新**
   - 检查API服务是否正常运行
   - 验证executionId是否正确
   - 查看浏览器控制台错误

2. **进度显示延迟**
   - 调整轮询间隔（默认为2秒）
   - 检查网络连接
   - 优化后端响应时间

3. **控制功能失效**
   - 确认执行状态支持控制操作
   - 检查权限和认证
   - 查看后端日志

### 调试技巧

```typescript
// 启用详细日志
const { progress, isRunning } = useWorkflowExecution({
  onProgress: (p) => console.log('Progress:', p),
  onNodeComplete: (n) => console.log('Node Complete:', n),
  onError: (e) => console.error('Error:', e)
})
```

## 未来改进

1. **WebSocket支持**：实现真正的实时推送
2. **历史记录**：保存执行历史供后续分析
3. **性能分析**：提供详细的性能报告
4. **批量执行**：支持多个工作流的批量监控
5. **自定义指标**：支持用户定义的性能指标