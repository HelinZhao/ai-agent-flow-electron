import { Router } from 'express'
import { loadProxyConfig, saveProxyConfig } from '../utils/proxy'

const router = Router()

// 获取代理配置
router.get('/proxy', async (_req, res) => {
  try {
    const config = await loadProxyConfig()
    return res.status(200).json(config)
  } catch (error) {
    console.error('获取代理配置错误:', error)
    return res.status(500).json({ error: '获取代理配置失败' })
  }
})

// 保存代理配置
router.put('/proxy', async (req, res) => {
  try {
    const config = req.body
    if (!config || typeof config.enabled !== 'boolean') {
      return res.status(400).json({ error: '无效的代理配置' })
    }
    await saveProxyConfig(config)
    return res.status(200).json({ success: true, message: '代理配置已保存' })
  } catch (error) {
    console.error('保存代理配置错误:', error)
    return res.status(500).json({ error: '保存代理配置失败' })
  }
})

export default router
