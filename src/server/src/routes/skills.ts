import { Router } from 'express'
import { SkillModel } from '../models'

const router = Router()

// 获取所有技能
router.get('/', async (_req, res) => {
  try {
    const skills = await SkillModel.findAll({
      order: [['updatedAt', 'DESC']]
    })
    return res.status(200).json(skills)
  } catch (error) {
    console.error('获取技能列表错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 创建技能
router.post('/', async (req, res) => {
  try {
    const { name, description, content } = req.body
    if (!name || !description || !content) {
      return res.status(400).json({ error: '名称、描述和内容不能为空' })
    }

    const skill = await SkillModel.create({
      name,
      description,
      content
    })

    return res.status(201).json(skill.toJSON())
  } catch (error) {
    console.error('创建技能错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 获取单个技能
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const skill = await SkillModel.findByPk(id)

    if (!skill) {
      return res.status(404).json({ error: '技能不存在' })
    }

    return res.status(200).json(skill.toJSON())
  } catch (error) {
    console.error('获取技能错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 更新技能
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, content } = req.body

    const skill = await SkillModel.findByPk(id)
    if (!skill) {
      return res.status(404).json({ error: '技能不存在' })
    }

    await skill.update({
      name: name || skill.name,
      description: description || skill.description,
      content: content || skill.content
    })

    return res.status(200).json(skill.toJSON())
  } catch (error) {
    console.error('更新技能错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 删除技能
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const skill = await SkillModel.findByPk(id)

    if (!skill) {
      return res.status(404).json({ error: '技能不存在' })
    }

    await skill.destroy()
    return res.status(204).send()
  } catch (error) {
    console.error('删除技能错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

export default router
