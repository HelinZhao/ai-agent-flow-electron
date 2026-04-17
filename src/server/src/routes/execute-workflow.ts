import { Router } from 'express'
import { Workflow, LLMConfig } from '../types'
import { AgentModel, WorkflowModel, LLMConfigModel } from '../models'
import { MonitoredLangGraphExecutor } from '../utils/monitoredExecutor'

const router = Router()

// 创建监控执行器实例
const monitoredExecutor = new MonitoredLangGraphExecutor()

// 执行工作流的路由（带监控）
router.post('/monitor', async (req, res) => {
  try {
    const { workflow, input, agentId, threadId } = req.body

    // 验证必要参数
    if (!workflow || !input) {
      return res.status(400).json({ error: 'Missing required parameters (workflow and input)' })
    }

    // 查找启用的 LLM 配置
    const activeLLMConfig = await LLMConfigModel.findOne({
      where: { isActive: true }
    })

    if (!activeLLMConfig) {
      return res.status(400).json({
        error: 'No active LLM configuration found',
        message: 'Please configure and activate an LLM configuration first'
      })
    }

    // 将数据库中的 LLM 配置转换为 LLM 配置对象
    const llmConfig: LLMConfig = {
      provider: activeLLMConfig.provider,
      apiKey: activeLLMConfig.apiKey,
      model: activeLLMConfig.model,
      baseUrl: activeLLMConfig.baseUrl,
      temperature: activeLLMConfig.temperature,
      maxTokens: activeLLMConfig.maxTokens
    }

    // 开始执行工作流（异步）
    const executionId = await monitoredExecutor.startExecution(
      workflow,
      input,
      llmConfig,
      agentId,
      threadId
    )

    return res.status(200).json({
      executionId,
      message: '工作流执行已开始'
    })
  } catch (error) {
    console.error('工作流执行错误:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : '工作流执行失败'
    })
  }
})

// 获取执行进度
router.get('/progress/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params

    const executionState = monitoredExecutor.getExecutionState(executionId)

    if (!executionState) {
      return res.status(404).json({
        error: '执行记录不存在',
        message: `找不到 executionId 为 ${executionId} 的执行记录`
      })
    }

    const workflow = executionState.workflow
    const nodeResults = Array.from(executionState.nodeResults.values())
    const executionPath = nodeResults
      .filter((result) => result.status === 'completed')
      .map((result) => result.metadata?.label || result.metadata?.nodeId)

    const response = {
      executionId: executionState.executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      currentNodeId: executionState.currentNodeId,
      currentNodeLabel: executionState.currentNodeId
        ? nodeResults.find((n) => n.nodeId === executionState.currentNodeId)?.metadata?.label
        : undefined,
      metrics: {
        executionId: executionState.executionId,
        startTime: executionState.startTime,
        endTime: executionState.endTime,
        duration: executionState.endTime
          ? executionState.endTime.getTime() - executionState.startTime.getTime()
          : undefined,
        status: executionState.status,
        totalNodes: workflow.nodes.length,
        completedNodes: nodeResults.filter((n) => n.status === 'completed').length,
        failedNodes: nodeResults.filter((n) => n.status === 'failed').length,
        progress: executionState.progress
      },
      nodeResults,
      executionPath,
      logs: executionState.logs
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('获取执行进度错误:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : '获取执行进度失败'
    })
  }
})

// 获取节点执行结果
router.get('/node-results/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params

    const executionState = monitoredExecutor.getExecutionState(executionId)

    if (!executionState) {
      return res.status(404).json({
        error: '执行记录不存在',
        message: `找不到 executionId 为 ${executionId} 的执行记录`
      })
    }

    const nodeResults = Array.from(executionState.nodeResults.values())

    return res.status(200).json(nodeResults)
  } catch (error) {
    console.error('获取节点执行结果错误:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : '获取节点执行结果失败'
    })
  }
})

// 停止执行
router.post('/stop/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params

    monitoredExecutor.stopExecution(executionId)

    return res.status(200).json({
      message: '执行已停止'
    })
  } catch (error) {
    console.error('停止执行错误:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : '停止执行失败'
    })
  }
})

// 暂停执行
router.post('/pause/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params

    monitoredExecutor.pauseExecution(executionId)

    return res.status(200).json({
      message: '执行已暂停'
    })
  } catch (error) {
    console.error('暂停执行错误:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : '暂停执行失败'
    })
  }
})

// 恢复执行
router.post('/resume/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params

    monitoredExecutor.resumeExecution(executionId)

    return res.status(200).json({
      message: '执行已恢复'
    })
  } catch (error) {
    console.error('恢复执行错误:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : '恢复执行失败'
    })
  }
})

// 原有的同步执行接口（保持向后兼容）
router.post('/', async (req, res) => {
  try {
    const { workflow, input, agentId, threadId } = req.body

    // 验证必要参数
    if (!workflow || !input) {
      return res.status(400).json({ error: 'Missing required parameters (workflow and input)' })
    }

    // 查找启用的 LLM 配置
    const activeLLMConfig = await LLMConfigModel.findOne({
      where: { isActive: true }
    })

    if (!activeLLMConfig) {
      return res.status(400).json({
        error: 'No active LLM configuration found',
        message: 'Please configure and activate an LLM configuration first'
      })
    }

    // 将数据库中的 LLM 配置转换为 LLM 配置对象
    const llmConfig: LLMConfig = {
      provider: activeLLMConfig.provider,
      apiKey: activeLLMConfig.apiKey,
      model: activeLLMConfig.model,
      baseUrl: activeLLMConfig.baseUrl,
      temperature: activeLLMConfig.temperature,
      maxTokens: activeLLMConfig.maxTokens
    }

    // 执行工作流
    const result = await monitoredExecutor.startExecution(
      workflow,
      input,
      llmConfig,
      agentId,
      threadId
    )

    // 等待执行完成（简化处理）
    let attempts = 0
    const maxAttempts = 100 // 最多等待50秒（100 * 500ms）

    while (attempts < maxAttempts) {
      const state = monitoredExecutor.getExecutionState(result)
      if (state && (state.status === 'completed' || state.status === 'failed')) {
        const nodeResults = Array.from(state.nodeResults.values())
        const executionPath = nodeResults
          .filter((r) => r.status === 'completed')
          .map((r) => r.metadata?.label || r.metadata?.nodeId)

        const finalResult = `工作流执行顺序：${executionPath.join(' → ')}\n\n工作流执行完成`

        return res.status(200).json({
          result: finalResult,
          llmConfigName: activeLLMConfig.name
        })
      }

      await new Promise((resolve) => setTimeout(resolve, 500))
      attempts++
    }

    return res.status(408).json({
      error: '执行超时',
      message: '工作流执行时间过长，请稍后查看执行状态'
    })
  } catch (error) {
    console.error('工作流执行错误:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : '工作流执行失败'
    })
  }
})

// AI Agent 对话 API（带监控）
router.post('/agent-chat-monitor', async (req, res) => {
  try {
    const { agentId, input, threadId } = req.body

    // 验证必要参数
    if (!agentId || !input) {
      return res.status(400).json({
        error: '缺少必要参数',
        message: '请提供 agentId 和 input 参数'
      })
    }

    // 查找 Agent
    const agent = await AgentModel.findByPk(agentId)
    if (!agent) {
      return res.status(404).json({
        error: 'Agent 不存在',
        message: `找不到 ID 为 ${agentId} 的 Agent，请检查 Agent ID 是否正确`
      })
    }

    // 检查 Agent 是否绑定了工作流
    if (!agent.workflowId) {
      return res.status(400).json({
        error: 'Agent 未绑定工作流',
        message: `Agent「${agent.name}」尚未绑定工作流，请先为该 Agent 配置工作流后再进行对话`
      })
    }

    // 查找绑定的工作流
    const workflow = await WorkflowModel.findByPk(agent.workflowId)
    if (!workflow) {
      return res.status(404).json({
        error: '工作流不存在',
        message: `Agent「${agent.name}」绑定的工作流不存在，请联系管理员检查配置`
      })
    }

    // 查找启用的 LLM 配置
    const activeLLMConfig = await LLMConfigModel.findOne({
      where: { isActive: true }
    })

    if (!activeLLMConfig) {
      return res.status(400).json({
        error: '未配置大模型',
        message: '请先配置并启用一个大模型配置，然后重试'
      })
    }

    // 将数据库中的工作流数据转换为工作流对象
    const workflowObj: Workflow = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      nodes: JSON.parse(workflow.nodes),
      edges: JSON.parse(workflow.edges),
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt
    }

    // 将数据库中的 LLM 配置转换为 LLM 配置对象
    const llmConfig: LLMConfig = {
      provider: activeLLMConfig.provider,
      apiKey: activeLLMConfig.apiKey,
      model: activeLLMConfig.model,
      baseUrl: activeLLMConfig.baseUrl,
      temperature: activeLLMConfig.temperature,
      maxTokens: activeLLMConfig.maxTokens
    }

    // 开始执行工作流
    const executionId = await monitoredExecutor.startExecution(
      workflowObj,
      input,
      llmConfig,
      agentId,
      threadId || agentId // 使用 agentId 作为默认 threadId
    )

    return res.status(200).json({
      executionId,
      success: true,
      message: 'Agent对话执行已开始',
      agentName: agent.name,
      workflowName: workflow.name
    })
  } catch (error) {
    console.error('AI Agent 对话执行错误:', error)
    return res.status(500).json({
      error: '对话执行失败',
      message: error instanceof Error ? error.message : '未知错误，请稍后重试'
    })
  }
})

export default router
