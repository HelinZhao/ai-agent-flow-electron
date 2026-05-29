import { Router } from 'express'
import { TemplateModel } from '../models'

const router = Router()

// 获取所有模板（可按类型过滤）
router.get('/', async (req, res) => {
  try {
    const { type } = req.query
    const where = type ? { type: String(type) } : {}
    const templates = await TemplateModel.findAll({
      where,
      order: [['category', 'ASC'], ['name', 'ASC']],
    })
    return res.status(200).json(templates)
  } catch (error) {
    console.error('获取模板列表错误:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : '服务器内部错误' })
  }
})

// 获取单个模板
router.get('/:id', async (req, res) => {
  try {
    const template = await TemplateModel.findByPk(req.params.id)
    if (!template) return res.status(404).json({ error: '模板不存在' })
    return res.status(200).json(template)
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : '服务器内部错误' })
  }
})

export default router
