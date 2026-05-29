import { Router } from 'express'
import { EnvVarModel } from '../models'
import { changeNotifier } from '../utils/dataChangeNotifier'

const router = Router()

// 获取所有环境变量
router.get('/', async (_, res) => {
  try {
    const vars = await EnvVarModel.findAll({
      order: [['name', 'ASC']]
    })
    return res.status(200).json(vars)
  } catch (error) {
    console.error('获取环境变量列表错误:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : '服务器内部错误' })
  }
})

// 创建环境变量
router.post('/', async (req, res) => {
  try {
    const { name, value, description } = req.body
    if (!name || value === undefined || value === null) {
      return res.status(400).json({ error: '名称和值不能为空' })
    }

    const existing = await EnvVarModel.findOne({ where: { name } })
    if (existing) {
      return res.status(409).json({ error: `环境变量 "${name}" 已存在` })
    }

    const envVar = await EnvVarModel.create({
      name,
      value,
      description: description || ''
    })

    changeNotifier.emitChange('environment-variables')
    return res.status(201).json(envVar.toJSON())
  } catch (error) {
    console.error('创建环境变量错误:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : '服务器内部错误' })
  }
})

// 获取单个环境变量
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const envVar = await EnvVarModel.findByPk(id)

    if (!envVar) {
      return res.status(404).json({ error: '环境变量不存在' })
    }

    return res.status(200).json(envVar.toJSON())
  } catch (error) {
    console.error('获取环境变量错误:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : '服务器内部错误' })
  }
})

// 更新环境变量
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, value, description } = req.body

    const envVar = await EnvVarModel.findByPk(id)
    if (!envVar) {
      return res.status(404).json({ error: '环境变量不存在' })
    }

    await envVar.update({
      name: name ?? envVar.name,
      value: value ?? envVar.value,
      description: description ?? envVar.description
    })

    changeNotifier.emitChange('environment-variables')
    return res.status(200).json(envVar.toJSON())
  } catch (error) {
    console.error('更新环境变量错误:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : '服务器内部错误' })
  }
})

// 删除环境变量
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const envVar = await EnvVarModel.findByPk(id)

    if (!envVar) {
      return res.status(404).json({ error: '环境变量不存在' })
    }

    await envVar.destroy()
    changeNotifier.emitChange('environment-variables')
    return res.status(204).send()
  } catch (error) {
    console.error('删除环境变量错误:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : '服务器内部错误' })
  }
})

export default router
