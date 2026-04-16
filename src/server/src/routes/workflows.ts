import { Router } from 'express'
import { WorkflowModel } from '../models'

const router = Router()

// 安全JSON解析函数
const safeJsonParse = <T>(str: string, defaultValue: T): T => {
  if (!str) return defaultValue
  try {
    return JSON.parse(str)
  } catch (error) {
    console.error('JSON解析失败:', error)
    return defaultValue
  }
}

// 获取所有工作流
router.get('/', async (_req, res) => {
  try {
    const workflows = await WorkflowModel.findAll({
      order: [['updatedAt', 'DESC']]
    })
    const result = workflows.map((item) => {
      const jsonItem = item.toJSON()
      return {
        ...jsonItem,
        nodes: safeJsonParse(jsonItem.nodes, []),
        edges: safeJsonParse(jsonItem.edges, [])
      }
    })

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    return res.status(200).send(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('获取工作流列表错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 创建工作流
router.post('/', async (req, res) => {
  try {
    const { name, description, nodes, edges } = req.body
    if (!name) {
      return res.status(400).json({ error: '名称为空' })
    }
    const workflow = await WorkflowModel.create({
      name,
      description,
      nodes: JSON.stringify(nodes || []),
      edges: JSON.stringify(edges || [])
    })
    const json = workflow.toJSON()
    return res.status(201).json({
      ...json,
      nodes: safeJsonParse(json.nodes, []),
      edges: safeJsonParse(json.edges, [])
    })
  } catch (error) {
    console.error('创建工作流错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 获取单个工作流
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const workflow = await WorkflowModel.findByPk(id)

    if (!workflow) {
      return res.status(404).json({ error: '工作流不存在' })
    }
    console.log(workflow)
    return res.status(200).json({
      ...workflow.toJSON(),
      nodes: safeJsonParse(workflow.nodes, []),
      edges: safeJsonParse(workflow.edges, [])
    })
  } catch (error) {
    console.error('获取工作流错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 更新工作流
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, nodes, edges } = req.body

    const workflow = await WorkflowModel.findByPk(id)
    if (!workflow) {
      return res.status(404).json({ error: '工作流不存在' })
    }

    await workflow.update({
      name: name || workflow.name,
      description: description || workflow.description,
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges)
    })

    return res.status(200).json({
      ...workflow.toJSON(),
      nodes: safeJsonParse(workflow.nodes, []),
      edges: safeJsonParse(workflow.edges, [])
    })
  } catch (error) {
    console.error('更新工作流错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 删除工作流
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const workflow = await WorkflowModel.findByPk(id)

    if (!workflow) {
      return res.status(404).json({ error: '工作流不存在' })
    }

    await workflow.destroy()
    return res.status(204).send()
  } catch (error) {
    console.error('删除工作流错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

export default router
