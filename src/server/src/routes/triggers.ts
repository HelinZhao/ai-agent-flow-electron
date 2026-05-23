import { Router } from 'express'
import { Op } from 'sequelize'
import { v4 as uuidv4 } from 'uuid'
import { TriggerModel, AgentModel, WorkflowModel, LLMConfigModel } from '../models'
import { timingWheel, cronToNextTime } from '../utils/timingWheel'
import { monitoredExecutor } from './execute-workflow'
import { WEBHOOK_RATE_LIMIT, WEBHOOK_RATE_WINDOW } from '../config'
import { safeJsonParse, buildSkillsContext } from '../utils/shared'
import type { Workflow, LLMConfig } from '../types'

const router = Router()

// webhook 限流存储
const webhookRateMap = new Map<string, number[]>()

function checkWebhookRateLimit(token: string): boolean {
  const now = Date.now()
  const timestamps = webhookRateMap.get(token) || []
  const recent = timestamps.filter((t) => now - t < WEBHOOK_RATE_WINDOW)
  if (recent.length >= WEBHOOK_RATE_LIMIT) return false
  recent.push(now)
  webhookRateMap.set(token, recent)
  return true
}

// 获取 LLM 配置（抽取公共逻辑）
async function getActiveLLMConfig(): Promise<LLMConfig> {
  const activeLLMConfig = await LLMConfigModel.findOne({
    where: { isActive: true }
  })
  if (!activeLLMConfig) {
    throw new Error('未配置大模型，请先在设置中配置并启用一个 LLM 配置')
  }
  return {
    provider: activeLLMConfig.provider,
    apiKey: activeLLMConfig.apiKey,
    model: activeLLMConfig.model,
    baseUrl: activeLLMConfig.baseUrl,
    temperature: activeLLMConfig.temperature,
    maxTokens: activeLLMConfig.maxTokens
  }
}

// 执行触发器目标
async function fireTrigger(triggerId: string, payload?: { input?: string; params?: Record<string, any> }): Promise<string | null | undefined> {
  const trigger = await TriggerModel.findByPk(triggerId)
  if (!trigger || !trigger.enabled) return null

  // 防止重复触发：上次还在执行中
  if (trigger.lastRunStatus === 'running') {
    console.log(`[Trigger] ${trigger.name}: 上次执行未完成，跳过本次触发，重新调度下一次`)
    const nextTime = cronToNextTime(trigger.cronExpression || '')
    if (nextTime > 0) {
      timingWheel.schedule(trigger.id, nextTime)
      await trigger.update({ nextRunAt: new Date(nextTime) })
    }
    return null
  }

  try {
    // 标记为运行中
    await trigger.update({ lastRunStatus: 'running', lastRunAt: new Date() })

    const llmConfig = await getActiveLLMConfig()
    let executionId: string | null = null
    const input = payload?.input ?? trigger.input

    let triggerParams = payload?.params ?? safeJsonParse(trigger.params, {})
    const triggerInput = String(input || '')
    if (trigger.targetType === 'workflow') {
      const workflow = await WorkflowModel.findByPk(trigger.targetId)
      if (!workflow) throw new Error(`工作流 ${trigger.targetId} 不存在`)

      const workflowObj: Workflow = {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        nodes: safeJsonParse(workflow.nodes, []),
        edges: safeJsonParse(workflow.edges, []),
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt
      }

      await monitoredExecutor.startExecution(
        workflowObj,
        triggerInput,
        llmConfig,
        undefined,
        `trigger-${trigger.id}-${Date.now()}`,
        undefined,
        undefined,
        triggerParams
      )
    } else if (trigger.targetType === 'agent') {
      const agent = await AgentModel.findByPk(trigger.targetId)
      if (!agent) {
        throw new Error(`Agent ${trigger.targetId} 不存在`)
      }

      if (agent.workflowId) {
        const workflow = await WorkflowModel.findByPk(agent.workflowId)
        if (!workflow) throw new Error(`Agent 绑定的工作流 ${agent.workflowId} 不存在`)

        const workflowObj: Workflow = {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          nodes: safeJsonParse(workflow.nodes, []),
          edges: safeJsonParse(workflow.edges, []),
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt
        }

        await monitoredExecutor.startExecution(
          workflowObj,
          triggerInput,
          llmConfig,
          agent.id,
          `trigger-${trigger.id}-${Date.now()}`,
          undefined,
          undefined,
          triggerParams
        )
      } else {
        const skillIds = safeJsonParse<string[]>(agent.skillIds, [])
        const enabledTools = safeJsonParse<string[]>(agent.enabledTools, [])
        const { skillsContext, enabledTools: allEnabledTools } = await buildSkillsContext(skillIds, enabledTools)
        executionId = await monitoredExecutor.startDirectChat(
          input,
          llmConfig,
          { id: agent.id, name: agent.name, instructions: agent.instructions },
          agent.id,
          [],
          allEnabledTools,
          [],
          skillsContext
        )
      }
    }

    await trigger.update({ lastRunStatus: 'success' })
    console.log(`[Trigger] ${trigger.name}: 执行成功`)

    // 成功时也重新调度
    const successUpdated = await TriggerModel.findByPk(triggerId)
    if (successUpdated && successUpdated.type === 'cron' && successUpdated.enabled && successUpdated.cronExpression) {
      const st = cronToNextTime(successUpdated.cronExpression)
      if (st > 0) {
        timingWheel.schedule(successUpdated.id, st)
        await successUpdated.update({ nextRunAt: new Date(st) })
        console.log(`[Trigger] ${successUpdated.name}: 下次执行时间 ${new Date(st).toLocaleString()}`)
      }
    }

    return executionId
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误'
    console.error(`[Trigger] ${trigger.name}: 执行失败 -`, msg)
    await trigger.update({ lastRunStatus: 'failed' })
  }

  // 重新调度下一次执行（cron 类型的循环触发）
  const updated = await TriggerModel.findByPk(triggerId)
  if (updated && updated.type === 'cron' && updated.enabled && updated.cronExpression) {
    const nextTime = cronToNextTime(updated.cronExpression)
    if (nextTime > 0) {
      timingWheel.schedule(updated.id, nextTime)
      await updated.update({ nextRunAt: new Date(nextTime) })
      console.log(`[Trigger] ${updated.name}: 下次执行时间 ${new Date(nextTime).toLocaleString()}`)
    }
  }
}

// 注册时间轮回调
timingWheel.onFire = (id: string) => { fireTrigger(id); return Promise.resolve() }

// ===================== REST API =====================

// 获取所有触发器（支持 ?name= 按名称搜索）
router.get('/', async (req, res) => {
  try {
    const where: any = {}
    if (req.query.name) {
      where.name = { [Op.like]: `%${req.query.name}%` }
    }
    if (req.query.createdAfter || req.query.createdBefore) {
      where.createdAt = {}
      if (req.query.createdAfter) where.createdAt[Op.gte] = new Date(req.query.createdAfter as string)
      if (req.query.createdBefore) where.createdAt[Op.lte] = new Date(req.query.createdBefore as string)
    }
    if (req.query.updatedAfter || req.query.updatedBefore) {
      where.updatedAt = {}
      if (req.query.updatedAfter) where.updatedAt[Op.gte] = new Date(req.query.updatedAfter as string)
      if (req.query.updatedBefore) where.updatedAt[Op.lte] = new Date(req.query.updatedBefore as string)
    }
    const triggers = await TriggerModel.findAll({
      where,
      order: [['createdAt', 'DESC']]
    })
    return res.status(200).json(triggers)
  } catch (error) {
    console.error('获取触发器列表错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 创建触发器
router.post('/', async (req, res) => {
  try {
    const { name, type, cronExpression, targetType, targetId, input, params, enabled } = req.body

    if (!name || !type || !targetType || !targetId) {
      return res.status(400).json({ error: '缺少必要参数 (name, type, targetType, targetId)' })
    }

    if (type === 'cron' && !cronExpression) {
      return res.status(400).json({ error: 'cron 类型触发器需要提供 cronExpression' })
    }

    const webhookToken = type === 'webhook' ? uuidv4().replace(/-/g, '') : undefined

    const trigger = await TriggerModel.create({
      name,
      type,
      cronExpression: cronExpression || undefined,
      targetType,
      targetId,
      input: input || '',
      params: params || undefined,
      webhookToken: webhookToken || undefined,
      enabled: enabled !== false
    })

    // 如果是 cron 类型且启用，注册到时间轮
    if (trigger.type === 'cron' && trigger.enabled && trigger.cronExpression) {
      const nextTime = cronToNextTime(trigger.cronExpression)
      if (nextTime > 0) {
        timingWheel.schedule(trigger.id, nextTime)
        await trigger.update({ nextRunAt: new Date(nextTime) })
      }
    }

    return res.status(201).json(trigger.toJSON())
  } catch (error) {
    console.error('创建触发器错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 获取单个触发器
router.get('/:id', async (req, res) => {
  try {
    const trigger = await TriggerModel.findByPk(req.params.id)
    if (!trigger) return res.status(404).json({ error: '触发器不存在' })
    return res.status(200).json(trigger.toJSON())
  } catch (error) {
    console.error('获取触发器错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 更新触发器
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const trigger = await TriggerModel.findByPk(id)
    if (!trigger) return res.status(404).json({ error: '触发器不存在' })

    const { name, cronExpression, targetType, targetId, input, params, enabled } = req.body

    // 先取消时间轮中的旧任务
    timingWheel.cancel(id)

    await trigger.update({
      name: name ?? trigger.name,
      cronExpression: cronExpression !== undefined ? (cronExpression || undefined) : trigger.cronExpression,
      targetType: targetType ?? trigger.targetType,
      targetId: targetId ?? trigger.targetId,
      input: input !== undefined ? input : trigger.input,
      params: params !== undefined ? params : trigger.params,
      enabled: enabled !== undefined ? enabled : trigger.enabled,
      nextRunAt: undefined
    })

    // 如果仍是 cron 且启用，重新注册到时间轮
    const updated = await TriggerModel.findByPk(id)
    if (updated && updated.type === 'cron' && updated.enabled && updated.cronExpression) {
      const nextTime = cronToNextTime(updated.cronExpression)
      if (nextTime > 0) {
        timingWheel.schedule(updated.id, nextTime)
        await updated.update({ nextRunAt: new Date(nextTime) })
      }
    }

    return res.status(200).json(updated?.toJSON() || trigger.toJSON())
  } catch (error) {
    console.error('更新触发器错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 删除触发器
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const trigger = await TriggerModel.findByPk(id)
    if (!trigger) return res.status(404).json({ error: '触发器不存在' })

    timingWheel.cancel(id)
    await trigger.destroy()
    return res.status(204).send()
  } catch (error) {
    console.error('删除触发器错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 手动触发
router.post('/:id/run', async (req, res) => {
  try {
    const { id } = req.params
    const trigger = await TriggerModel.findByPk(id)
    if (!trigger) return res.status(404).json({ error: '触发器不存在' })

    const executionId = await fireTrigger(id)

    return res.status(200).json({ message: '触发器已手动触发', ...(executionId ? { executionId } : {}) })
  } catch (error) {
    console.error('手动触发错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// ===================== Webhook =====================

// Webhook 端点（公开，不挂载在 /api 下）
export const webhookRouter = Router()

webhookRouter.post('/:token', async (req, res) => {
  try {
    const { token } = req.params

    // 限流检查
    if (!checkWebhookRateLimit(token)) {
      return res.status(429).json({ error: '触发频率过高，请稍后重试' })
    }

    const trigger = await TriggerModel.findOne({
      where: { type: 'webhook', webhookToken: token, enabled: true }
    })
    if (!trigger) return res.status(404).json({ error: '触发器不存在或已禁用' })

    const input = req.body?.input || ''
    const params = req.body?.params || {}
    const payload = { input, params }
    const executionId = await fireTrigger(trigger.id, payload)
    return res.status(200).json({
      message: 'Webhook 触发成功',
      triggerName: trigger.name,
      ...(executionId ? { executionId } : {})
    })
  } catch (error) {
    console.error('Webhook 触发错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

export default router
