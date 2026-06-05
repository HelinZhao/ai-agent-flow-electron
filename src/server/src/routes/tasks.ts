import { Router } from 'express'
import { TaskModel, TeamModel } from '../models'
import { changeNotifier } from '../utils/dataChangeNotifier'
import { freeTeam, cancelExecution } from '../utils/autoClaimScheduler'
import { teamExecutionTracker } from '../utils/teamExecutionTracker'

const router = Router()

// 列表
router.get('/', async (_req, res) => {
  try {
    const { status } = _req.query
    const where = status ? { status: String(status) } : {}
    const tasks = await TaskModel.findAll({ where, order: [['createdAt', 'DESC']] })
    return res.json(tasks)
  } catch {
    return res.status(500).json({ error: '获取任务列表失败' })
  }
})

// 创建
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, status, parentId, projectId } = req.body
    if (!title || !description) {
      return res.status(400).json({ error: '标题和描述不能为空' })
    }
    const taskStatus = (status === 'draft' || status === 'pending') ? status : 'pending'
    // 子任务继承父任务的 projectId
    let resolvedProjectId = projectId || undefined
    if (parentId && !resolvedProjectId) {
      const parent = await TaskModel.findByPk(parentId)
      if (parent?.projectId) resolvedProjectId = parent.projectId
    }
    const task = await TaskModel.create({
      title, description,
      priority: priority ?? 1,
      status: taskStatus,
      parentId: parentId || undefined,
      projectId: resolvedProjectId,
    } as any)
    changeNotifier.emitChange('tasks')
    return res.status(201).json(task)
  } catch {
    return res.status(500).json({ error: '创建任务失败' })
  }
})

// 详情
router.get('/:id', async (req, res) => {
  try {
    const task = await TaskModel.findByPk(req.params.id)
    if (!task) return res.status(404).json({ error: '任务不存在' })
    return res.json(task)
  } catch {
    return res.status(500).json({ error: '获取任务失败' })
  }
})

// 更新（按状态控制可编辑字段 + 原子条件防竞态）
router.put('/:id', async (req, res) => {
  try {
    const task = await TaskModel.findByPk(req.params.id)
    if (!task) return res.status(404).json({ error: '任务不存在' })

    const { title, description, priority, status, projectId } = req.body
    const updates: Record<string, any> = {}

    switch (task.status) {
      case 'draft': {
        // 草稿：全字段可改，包括状态
        if (title !== undefined) updates.title = title
        if (description !== undefined) updates.description = description
        if (priority !== undefined) updates.priority = priority
        if (status !== undefined && (status === 'draft' || status === 'pending')) updates.status = status
        if (projectId !== undefined) updates.projectId = projectId || null
        if (Object.keys(updates).length === 0) return res.json(task)
        const [affected] = await TaskModel.update(updates, { where: { id: task.id, status: 'draft' } })
        if (affected === 0) return res.status(409).json({ error: '任务状态已变更，请刷新后重试' })
        changeNotifier.emitChange('tasks')
        return res.json({ ...task.toJSON(), ...updates })
      }

      case 'pending': {
        // 待处理：全字段可改 + 状态可改为 draft，原子条件确保未被调度器中途认领
        if (title !== undefined) updates.title = title
        if (description !== undefined) updates.description = description
        if (priority !== undefined) updates.priority = priority
        if (status !== undefined && (status === 'draft' || status === 'pending')) updates.status = status
        if (projectId !== undefined) updates.projectId = projectId || null
        if (Object.keys(updates).length === 0) return res.json(task)
        const [affected] = await TaskModel.update(updates, { where: { id: task.id, status: 'pending' } })
        if (affected === 0) return res.status(409).json({ error: '任务状态已变更，请刷新后重试' })
        changeNotifier.emitChange('tasks')
        return res.json({ ...task.toJSON(), ...updates })
      }

      case 'assigned': {
        // 已指派：仅可改标题，原子条件防中途执行
        if (title === undefined) return res.status(400).json({ error: '已指派的任务只能修改标题' })
        const [affected] = await TaskModel.update({ title }, { where: { id: task.id, status: 'assigned' } })
        if (affected === 0) return res.status(409).json({ error: '任务已开始执行，无法修改' })
        changeNotifier.emitChange('tasks')
        return res.json({ ...task.toJSON(), title })
      }

      case 'pending_review':
      case 'completed':
      case 'failed': {
        // 待验收 / 终端状态：可改标题和描述（不影响执行结果）
        if (title !== undefined) updates.title = title
        if (description !== undefined) updates.description = description
        if (Object.keys(updates).length === 0) return res.json(task)
        await TaskModel.update(updates, { where: { id: task.id } })
        changeNotifier.emitChange('tasks')
        return res.json({ ...task.toJSON(), ...updates })
      }

      case 'claimed':
        return res.status(400).json({ error: '任务正在执行中，无法编辑' })

      default:
        return res.status(400).json({ error: '当前状态不允许编辑' })
    }
  } catch {
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
  } catch {
    return res.status(500).json({ error: '删除任务失败' })
  }
})

// 获取子任务列表
router.get('/:id/subtasks', async (req, res) => {
  try {
    const subtasks = await TaskModel.findAll({
      where: { parentId: req.params.id },
      order: [['createdAt', 'ASC']],
    })
    return res.json(subtasks)
  } catch {
    return res.status(500).json({ error: '获取子任务列表失败' })
  }
})

// 认领下一个待办（跳过草稿任务）
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
  } catch {
    return res.status(500).json({ error: '认领任务失败' })
  }
})

// 指派任务给团队（仅写入数据，调度器负责执行）
router.post('/:id/assign', async (req, res) => {
  try {
    const task = await TaskModel.findByPk(req.params.id)
    if (!task) return res.status(404).json({ error: '任务不存在' })
    if (task.status === 'draft') return res.status(400).json({ error: '草稿任务不可指派' })
    if (task.status === 'pending_review') return res.status(400).json({ error: '待验收任务不可指派' })
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
  } catch {
    return res.status(500).json({ error: '指派任务失败' })
  }
})

// 完成任务（agent 执行完后进入「待验收」状态）
router.post('/:id/complete', async (req, res) => {
  try {
    const task = await TaskModel.findByPk(req.params.id)
    if (!task) return res.status(404).json({ error: '任务不存在' })
    task.status = 'pending_review'
    task.result = req.body.result || ''
    task.completedAt = new Date()
    await task.save()
    changeNotifier.emitChange('tasks')
    return res.json(task)
  } catch {
    return res.status(500).json({ error: '完成任务失败' })
  }
})

// 验收通过（待验收 → 已完成，清空审核意见）
router.post('/:id/approve', async (req, res) => {
  try {
    const task = await TaskModel.findByPk(req.params.id)
    if (!task) return res.status(404).json({ error: '任务不存在' })
    if (task.status !== 'pending_review') {
      return res.status(400).json({ error: '只能验收待验收状态的任务' })
    }
    task.status = 'completed'
    task.reviewComment = ''
    await task.save()
    changeNotifier.emitChange('tasks')
    return res.json(task)
  } catch {
    return res.status(500).json({ error: '验收失败' })
  }
})

// 驳回（待验收 → 已指派，自动派回原团队重新执行）
router.post('/:id/reject', async (req, res) => {
  try {
    const task = await TaskModel.findByPk(req.params.id)
    if (!task) return res.status(404).json({ error: '任务不存在' })
    if (task.status !== 'pending_review') {
      return res.status(400).json({ error: '只能驳回待验收状态的任务' })
    }

    const comment = (req.body.comment || '').trim()
    const oldClaimedBy = task.claimedBy || ''

    // 追加审核意见到描述末尾，团队重新执行时能看到
    const reviewBlock = comment
      ? `\n\n【审核意见】\n${comment}`
      : ''

    // 检查原团队是否还存在
    const teamExists = oldClaimedBy ? await TeamModel.findByPk(oldClaimedBy) : null

    if (oldClaimedBy && !teamExists) {
      // 原团队已删除 → 标记为失败
      task.status = 'failed'
      task.description = task.description + reviewBlock
      task.reviewComment = comment || ''
      task.error = '原团队已删除，无法重新执行'
      task.completedAt = new Date()
    } else {
      // 原团队存在 → 直接设为 assigned，调度器下一 tick 立即执行
      task.status = 'assigned'
      task.description = task.description + reviewBlock
      task.reviewComment = comment || ''
      task.executionId = `reject-${oldClaimedBy}-${Date.now()}`
      task.claimedAt = new Date()
      task.completedAt = undefined
    }
    await task.save()
    // 释放团队忙碌状态
    freeTeam(oldClaimedBy)
    changeNotifier.emitChange('tasks')
    return res.json(task)
  } catch {
    return res.status(500).json({ error: '驳回失败' })
  }
})

// 重启任务（仅 completed / failed / pending_review 可重启）
router.post('/:id/restart', async (req, res) => {
  try {
    const task = await TaskModel.findByPk(req.params.id)
    if (!task) return res.status(404).json({ error: '任务不存在' })
    if (task.status !== 'completed' && task.status !== 'failed' && task.status !== 'pending_review') {
      return res.status(400).json({ error: '只能重启已完成、失败或待验收的任务' })
    }

    // 保存快照
    task.restartedFrom = JSON.stringify({
      status: task.status,
      result: task.result,
      error: task.error,
      completedAt: task.completedAt,
      claimedBy: task.claimedBy,
    })
    task.status = 'pending'
    task.result = ''
    task.error = ''
    task.claimedBy = ''
    task.executionId = ''
    task.claimedAt = undefined
    task.completedAt = undefined
    await task.save()
    changeNotifier.emitChange('tasks')
    return res.json(task)
  } catch {
    return res.status(500).json({ error: '重启任务失败' })
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
  } catch {
    return res.status(500).json({ error: '标记失败失败' })
  }
})

// 终止任务（仅 claimed / assigned / pending_review 可终止）
router.post('/:id/cancel', async (req, res) => {
  try {
    const task = await TaskModel.findByPk(req.params.id)
    if (!task) return res.status(404).json({ error: '任务不存在' })
    if (task.status !== 'claimed' && task.status !== 'assigned' && task.status !== 'pending_review') {
      return res.status(400).json({ error: '只能终止处理中、已指派或待验收的任务' })
    }
    const teamId = task.claimedBy || ''
    const executionId = `task:${task.id}`

    // 通知 tracker 执行已终止（广播 SSE + resolve 待审批 + 清理状态）
    teamExecutionTracker.pushExecutionComplete(executionId, { status: 'failed', error: '用户终止' })
    // 立即清理 tracker 状态（不做延时等待，因为不会重连）
    teamExecutionTracker.cleanup(executionId)

    // 中断 LLM 请求
    cancelExecution(task.id)

    task.status = 'failed'
    task.error = '用户终止'
    task.claimedBy = ''
    task.executionId = ''
    task.claimedAt = undefined
    task.completedAt = new Date()
    await task.save()
    freeTeam(teamId)
    changeNotifier.emitChange('tasks')
    return res.json(task)
  } catch {
    return res.status(500).json({ error: '终止任务失败' })
  }
})

export default router
