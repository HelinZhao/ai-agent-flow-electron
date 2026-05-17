import { Router } from 'express'
import { AgentModel } from '../models'
import { monitoredExecutor } from './execute-workflow'

const router = Router()

// 获取所有智能体
router.get('/', async (_req, res) => {
  try {
    const agents = await AgentModel.findAll({
      order: [['updatedAt', 'DESC']]
    })
    return res.status(200).json(agents)
  } catch (error) {
    console.error('获取智能体列表错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 创建智能体
router.post('/', async (req, res) => {
  try {
    const { name, description, instructions, workflowId } = req.body

    if (!name || !description || !instructions) {
      return res.status(400).json({ error: '名称、描述和指令不能为空' })
    }

    const agent = await AgentModel.create({
      name,
      description,
      instructions,
      workflowId
    })

    return res.status(201).json(agent.toJSON())
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

    return res.status(200).json(agent.toJSON())
  } catch (error) {
    console.error('获取智能体错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 更新智能体
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, instructions, workflowId } = req.body

    const agent = await AgentModel.findByPk(id)
    if (!agent) {
      return res.status(404).json({ error: '智能体不存在' })
    }

    await agent.update({
      name: name || agent.name,
      description: description || agent.description,
      instructions: instructions || agent.instructions,
      workflowId: workflowId || agent.workflowId
    })

    return res.status(200).json(agent.toJSON())
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

export default router
