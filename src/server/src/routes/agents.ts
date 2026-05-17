import { Router } from 'express'
import { Op } from 'sequelize'
import { AgentModel } from '../models'
import { monitoredExecutor } from './execute-workflow'
import { safeJsonParse } from '../utils/shared'

const router = Router()

// 获取所有智能体（支持 ?name= 按名称搜索）
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
    const agents = await AgentModel.findAll({
      where,
      order: [['updatedAt', 'DESC']]
    })
    return res.status(200).json(agents.map(a => formatAgent(a.toJSON())))
  } catch (error) {
    console.error('获取智能体列表错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 创建智能体
router.post('/', async (req, res) => {
  try {
    const { name, description, instructions, type, skillIds, enabledTools, workflowId } = req.body

    if (!name || !description || !instructions) {
      return res.status(400).json({ error: '名称、描述和指令不能为空' })
    }

    const agent = await AgentModel.create({
      name,
      description,
      instructions,
      type: type || 'standard',
      skillIds: skillIds ? JSON.stringify(skillIds) : undefined,
      enabledTools: enabledTools ? JSON.stringify(enabledTools) : undefined,
      workflowId: type === 'workflow' ? workflowId : undefined
    })

    return res.status(201).json(formatAgent(agent.toJSON()))
  } catch (error) {
    console.error('创建智能体错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 获取单个智能体
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const agent = await AgentModel.findByPk(id)

    if (!agent) {
      return res.status(404).json({ error: '智能体不存在' })
    }

    return res.status(200).json(formatAgent(agent.toJSON()))
  } catch (error) {
    console.error('获取智能体错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 更新智能体
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, instructions, type, skillIds, enabledTools, workflowId } = req.body

    const agent = await AgentModel.findByPk(id)
    if (!agent) {
      return res.status(404).json({ error: '智能体不存在' })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (instructions !== undefined) updateData.instructions = instructions
    if (type !== undefined) updateData.type = type
    if (skillIds !== undefined) updateData.skillIds = skillIds ? JSON.stringify(skillIds) : null
    if (enabledTools !== undefined) updateData.enabledTools = enabledTools ? JSON.stringify(enabledTools) : null
    if (workflowId !== undefined) updateData.workflowId = type === 'workflow' ? workflowId : null

    await agent.update(updateData)

    return res.status(200).json(formatAgent(agent.toJSON()))
  } catch (error) {
    console.error('更新智能体错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 删除智能体
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const agent = await AgentModel.findByPk(id)

    if (!agent) {
      return res.status(404).json({ error: '智能体不存在' })
    }

    // 清理内存中的附件缓存
    monitoredExecutor.deleteThread(id).catch(() => {})
    await agent.destroy()
    return res.status(204).send()
  } catch (error) {
    console.error('删除智能体错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 将 DB 原始数据中的 JSON 字符串字段解析为数组
function formatAgent(raw: any) {
  if (!raw) return raw
  return {
    ...raw,
    skillIds: safeJsonParse<string[]>(raw.skillIds, []),
    enabledTools: safeJsonParse<string[]>(raw.enabledTools, []),
  }
}

export default router
