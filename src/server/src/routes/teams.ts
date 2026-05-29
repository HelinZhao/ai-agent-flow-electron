import { Router } from 'express'
import { TeamModel } from '../models/Team'
import { changeNotifier } from '../utils/dataChangeNotifier'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const teams = await TeamModel.findAll({ order: [['updatedAt', 'DESC']] })
    res.json(teams)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, description, captainId, memberIds, mode } = req.body
    if (!name || !description) {
      res.status(400).json({ error: '名称和描述不能为空' })
      return
    }
    const team = await TeamModel.create({
      name,
      description,
      captainId: captainId || null,
      memberIds: JSON.stringify(memberIds || []),
      mode: mode || 'captain_distribute',
    })
    changeNotifier.emitChange('teams')
    res.status(201).json(team)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const team = await TeamModel.findByPk(req.params.id)
    if (!team) { res.status(404).json({ error: '团队不存在' }); return }
    res.json(team)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const team = await TeamModel.findByPk(req.params.id)
    if (!team) { res.status(404).json({ error: '团队不存在' }); return }
    const { name, description, captainId, memberIds, mode } = req.body
    if (name !== undefined) team.name = name
    if (description !== undefined) team.description = description
    if (captainId !== undefined) team.captainId = captainId || null
    if (memberIds !== undefined) team.memberIds = JSON.stringify(memberIds)
    if (mode !== undefined) team.mode = mode
    await team.save()
    changeNotifier.emitChange('teams')
    res.json(team)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const team = await TeamModel.findByPk(req.params.id)
    if (!team) { res.status(404).json({ error: '团队不存在' }); return }
    await team.destroy()
    changeNotifier.emitChange('teams')
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
