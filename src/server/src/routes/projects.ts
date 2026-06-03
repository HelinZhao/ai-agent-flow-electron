import { Router } from 'express'
import { ProjectModel } from '../models'
import { changeNotifier } from '../utils/dataChangeNotifier'

const router = Router()

// 列表
router.get('/', async (_req, res) => {
  try {
    const projects = await ProjectModel.findAll({
      order: [['createdAt', 'DESC']],
    })
    return res.json(projects)
  } catch {
    return res.status(500).json({ error: '获取项目列表失败' })
  }
})

// 创建
router.post('/', async (req, res) => {
  try {
    const { name, description, workDir } = req.body
    if (!name || !workDir) {
      return res.status(400).json({ error: '名称和工作目录不能为空' })
    }
    const project = await ProjectModel.create({
      name,
      description: description || '',
      workDir,
    } as any)
    changeNotifier.emitChange('projects')
    return res.status(201).json(project)
  } catch {
    return res.status(500).json({ error: '创建项目失败' })
  }
})

// 详情
router.get('/:id', async (req, res) => {
  try {
    const project = await ProjectModel.findByPk(req.params.id)
    if (!project) return res.status(404).json({ error: '项目不存在' })
    return res.json(project)
  } catch {
    return res.status(500).json({ error: '获取项目失败' })
  }
})

// 更新
router.put('/:id', async (req, res) => {
  try {
    const project = await ProjectModel.findByPk(req.params.id)
    if (!project) return res.status(404).json({ error: '项目不存在' })

    const { name, description, workDir } = req.body
    if (name !== undefined) project.name = name
    if (description !== undefined) project.description = description
    if (workDir !== undefined) project.workDir = workDir
    await project.save()
    changeNotifier.emitChange('projects')
    return res.json(project)
  } catch {
    return res.status(500).json({ error: '更新项目失败' })
  }
})

// 删除
router.delete('/:id', async (req, res) => {
  try {
    const project = await ProjectModel.findByPk(req.params.id)
    if (!project) return res.status(404).json({ error: '项目不存在' })
    await project.destroy()
    changeNotifier.emitChange('projects')
    return res.json({ success: true })
  } catch {
    return res.status(500).json({ error: '删除项目失败' })
  }
})

export default router
