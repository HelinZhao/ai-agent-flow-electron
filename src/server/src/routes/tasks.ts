import { Router } from 'express'
import { TaskModel } from '../models'
import { changeNotifier } from '../utils/dataChangeNotifier'

const router = Router()

// 列表
router.get('/', async (_req, res) => {
  try {
    const { status } = _req.query
    const where = status ? { status: String(status) } : {}
    const tasks = await TaskModel.findAll({ where, order: [['priority', 'DESC'], ['createdAt', 'ASC']] })
    return res.json(tasks)
  } catch (error) {
    return res.status(500).json({ error: '获取任务列表失败' })
  }
})

// 创建
router.post('/', async (req, res) => {
  try {
    const { title, description, priority } = req.body
    if (!title || !description) {
      return res.status(400).json({ error: '标题和描述不能为空' })
    }
    const task = await TaskModel.create({ title, description, priority: priority ?? 1, status: 'pending' } as any)
    changeNotifier.emitChange('tasks')
    return res.status(201).json(task)
  } catch (error) {
    return res.status(500).json({ error: '创建任务失败' })
  }
})

// 详情
router.get('/:id', async (req, res) => {
  try {
    const task = await TaskModel.findByPk(req.params.id)
    if (!task) return res.status(404).json({ error: '任务不存在' })
    return res.json(task)
  } catch (error) {
    return res.status(500).json({ error: '获取任务失败' })
  }
})

// 更新
router.put('/:id', async (req, res) => {
  try {
    const task = await TaskModel.findByPk(req.params.id)
    if (!task) return res.status(404).json({ error: '任务不存在' })
    if (task.status !== 'pending') {
      return res.status(400).json({ error: '只能修改待处理的任务' })
    }
    const { title, description, priority } = req.body
    if (title !== undefined) task.title = title
    if (description !== undefined) task.description = description
    if (priority !== undefined) task.priority = priority
    await task.save()
    changeNotifier.emitChange('tasks')
    return res.json(task)
  } catch (error) {
    return res.status(500).json({ error: '更新任务失败' })
  }
})

// 删除
router.delete('/:id', async (req, res) => {
  try {
    const task = await TaskModel.findByPk(req.params.id)
    if (!task) return res.status(404).json({ error: '任务不存在' })
    await task.destroy()
    changeNotifier.emitChange('tasks')
    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: '删除任务失败' })
  }
})

// 认领下一个待办
router.post('/claim-next', async (req, res) => {
  try {
    const { claimedBy, executionId } = req.body
    const task = await TaskModel.findOne({
      where: { status: 'pending' },
      order: [['priority', 'DESC'], ['createdAt', 'ASC']],
    })
    if (!task) return res.json({ claimed: false, task: null })

    const [affectedCount] = await TaskModel.update(
      { status: 'claimed', claimedAt: new Date(), claimedBy, executionId },
      { where: { id: task.id, status: 'pending' } },
    )
    if (affectedCount === 0) return res.json({ claimed: false, task: null })

    changeNotifier.emitChange('tasks')
    return res.json({ claimed: true, task })
  } catch (error) {
    return res.status(500).json({ error: '认领任务失败' })
  }
})

// 指派任务给团队（仅写入数据，调度器负责执行）
router.post('/:id/assign', async (req, res) => {
  try {
    const task = await TaskModel.findByPk(req.params.id)
    if (!task) return res.status(404).json({ error: '任务不存在' })
    if (task.status !== 'pending') return res.status(400).json({ error: '只能指派待处理的任务' })

    const { teamId } = req.body
    if (!teamId) return res.status(400).json({ error: '缺少 teamId' })

    task.status = 'assigned'
    task.claimedBy = teamId
    task.claimedAt = new Date()
    task.executionId = `assign-${teamId}-${Date.now()}`
    await task.save()
    changeNotifier.emitChange('tasks')

    return res.json(task)
  } catch (error) {
    return res.status(500).json({ error: '指派任务失败' })
  }
})

// 完成任务
router.post('/:id/complete', async (req, res) => {
  try {
    const task = await TaskModel.findByPk(req.params.id)
    if (!task) return res.status(404).json({ error: '任务不存在' })
    task.status = 'completed'
    task.result = req.body.result || ''
    task.completedAt = new Date()
    await task.save()
    changeNotifier.emitChange('tasks')
    return res.json(task)
  } catch (error) {
    return res.status(500).json({ error: '完成任务失败' })
  }
})

// 标记失败
router.post('/:id/fail', async (req, res) => {
  try {
    const task = await TaskModel.findByPk(req.params.id)
    if (!task) return res.status(404).json({ error: '任务不存在' })
    task.status = 'failed'
    task.error = req.body.error || ''
    task.completedAt = new Date()
    await task.save()
    changeNotifier.emitChange('tasks')
    return res.json(task)
  } catch (error) {
    return res.status(500).json({ error: '标记失败失败' })
  }
})

export default router
