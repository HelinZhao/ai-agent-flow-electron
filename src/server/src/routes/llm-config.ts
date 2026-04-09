import { Router } from 'express'
import { LLMConfig } from '../models'

const router = Router()

// 获取LLM配置
router.get('/', async (_req, res) => {
  try {
    const existingConfig = await LLMConfig.findOne({
      order: [['updatedAt', 'DESC']]
    })
    return res.status(200).json(existingConfig || {})
  } catch (error) {
    console.error('获取LLM配置错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 创建或更新LLM配置
router.post('/', async (req, res) => {
  try {
    const { provider, apiKey, model, baseUrl, temperature, maxTokens } = req.body

    if (!provider || !apiKey || !model) {
      return res.status(400).json({ error: '提供商、API密钥和模型不能为空' })
    }

    // 创建新的配置记录
    const newConfig = await LLMConfig.create({
      provider,
      apiKey,
      model,
      baseUrl,
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 2000
    })

    return res.status(200).json(newConfig)
  } catch (error) {
    console.error('创建LLM配置错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

export default router
