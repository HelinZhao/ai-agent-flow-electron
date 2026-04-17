# 工作流执行监控快速开始指南

## 🚀 5分钟快速上手

### 1. 基本使用

```typescript
// 1. 导入Hook
import { useWorkflowExecution } from '@renderer/hooks/useWorkflowExecution'

// 2. 在组件中使用
function MyWorkflowComponent() {
  const { executeWorkflow, progress, isRunning } = useWorkflowExecution()

  // 3. 执行工作流
  const handleRun = async () => {
    await executeWorkflow(workflow, '输入内容')
  }

  return (
    <div>
      <button onClick={handleRun}>开始执行</button>
      {progress && (
        <div>进度: {progress.metrics.progress}%</div>
      )}
    </div>
  )
}
```

### 2. 在WorkflowDesigner中

WorkflowDesigner组件已经集成了监控功能，无需额外配置：

- 点击