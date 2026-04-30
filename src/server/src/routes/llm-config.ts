import { Router } from 'express'
import { LLMConfigModel } from '../models'
import { LLMConfig } from '../types'
import { Op } from 'sequelize'
import { callLLM } from '../utils'

const router = Router()

// 获取所有LLM配置
router.get('/', async (_req, res) => {
  try {
    const configs = await LLMConfigModel.findAll({
      order: [
        ['isActive', 'DESC'],
        ['updatedAt', 'DESC']
      ]
    })
    return res.status(200).json(configs || [])
  } catch (error) {
    console.error('获取LLM配置错误:', error)

    // 如果是列不存在的错误，返回空数组
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      String(error.message).includes('no such column')
    ) {
      console.log('表结构不完整，返回空配置列表')
      return res.status(200).json([])
    }

    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 获取当前活跃的LLM配置
router.get('/active', async (_req, res) => {
  try {
    const activeConfig = await LLMConfigModel.findOne({
      where: { isActive: true }
    })
    return res.status(200).json(activeConfig || {})
  } catch (error) {
    console.error('获取活跃LLM配置错误:', error)

    // 如果是列不存在的错误，返回空对象
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      String(error.message).includes('no such column')
    ) {
      console.log('表结构不完整，返回空活跃配置')
      return res.status(200).json({})
    }

    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 创建新的LLM配置
router.post('/', async (req, res) => {
  try {
    const { name, provider, apiKey, model, baseUrl, temperature, maxTokens, isActive } = req.body

    if (!name || !provider || !apiKey || !model) {
      return res.status(400).json({ error: '配置名称、提供商、API密钥和模型不能为空' })
    }

    // 如果要设置为活跃配置，先将其他配置设为非活跃
    if (isActive) {
      await LLMConfigModel.update({ isActive: false }, { where: {} })
    }

    // 创建新的配置记录
    const newConfig = await LLMConfigModel.create({
      name,
      provider,
      apiKey,
      model,
      baseUrl,
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 2000,
      isActive: isActive || false
    })

    return res.status(201).json(newConfig)
  } catch (error) {
    console.error('创建LLM配置错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 更新LLM配置
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, provider, apiKey, model, baseUrl, temperature, maxTokens } = req.body

    const config = await LLMConfigModel.findByPk(id)
    if (!config) {
      return res.status(404).json({ error: '配置不存在' })
    }

    // isActive 只能通过专门的 activate 路径修改，更新时不覆盖
    await config.update({
      name,
      provider,
      apiKey,
      model,
      baseUrl,
      temperature,
      maxTokens
    })

    return res.status(200).json(config)
  } catch (error) {
    console.error('更新LLM配置错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 删除LLM配置
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const config = await LLMConfigModel.findByPk(id)
    if (!config) {
      return res.status(404).json({ error: '配置不存在' })
    }

    // 不能删除最后一个配置
    const configCount = await LLMConfigModel.count()
    if (configCount <= 1) {
      return res.status(400).json({ error: '不能删除最后一个配置' })
    }

    // 如果要删除的是活跃配置，自动激活最新的配置
    if (config.isActive) {
      const latestConfig = await LLMConfigModel.findOne({
        where: { id: { [Op.ne]: id } },
        order: [['updatedAt', 'DESC']]
      })
      if (latestConfig) {
        await latestConfig.update({ isActive: true })
      }
    }

    await config.destroy()
    return res.status(200).json({ message: '配置删除成功' })
  } catch (error) {
    console.error('删除LLM配置错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 切换活跃配置
router.post('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params

    const config = await LLMConfigModel.findByPk(id)
    if (!config) {
      return res.status(404).json({ error: '配置不存在' })
    }

    // 将所有配置设为非活跃
    await LLMConfigModel.update({ isActive: false }, { where: {} })

    // 将指定配置设为活跃
    await config.update({ isActive: true })

    return res.status(200).json({ message: '配置切换成功', config })
  } catch (error) {
    console.error('切换LLM配置错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 测试LLM连接
router.post('/test-connection', async (req, res) => {
  try {
    const { provider, apiKey, model } = req.body

    if (!apiKey || !model) {
      return res.status(400).json({ error: 'API Key和模型名称不能为空' })
    }

    // 验证API Key格式
    const validationRules = {
      openai: { prefix: 'sk-', message: 'OpenAI API Key必须以sk-开头' },
      anthropic: { prefix: 'sk-ant-', message: 'Anthropic API Key必须以sk-ant-开头' },
      azure: { prefix: '', message: '' },
      bailian: { prefix: 'sk-', message: 'Bailian API Key必须以sk-开头' },
      longcat: { prefix: 'ak_', message: 'LongCat API Key必须以ak_开头' }
    }

    const rule = validationRules[provider as keyof typeof validationRules]
    if (rule && rule.prefix && !apiKey.startsWith(rule.prefix)) {
      return res.status(400).json({ error: rule.message })
    }

    // 构建测试请求
    const llmConfig: LLMConfig = {
      model: model,
      temperature: 0.1,
      maxTokens: 10,
      provider,
      apiKey
    }

    const result = await callLLM('请回复"测试成功', llmConfig)
    if (result) {
      return res.status(200).json({
        success: true,
        message: '连接测试成功！API响应正常。',
        response: result
      })
    } else {
      return res.status(400).json({ error: 'API响应格式异常' })
    }
  } catch (error) {
    console.error('连接测试失败:', error)
    return res.status(500).json({
      error: `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`
    })
  }
})

export default router
