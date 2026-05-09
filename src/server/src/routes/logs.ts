import { Router } from 'express'
import { logStreamManager } from '../utils/logStream'

const router = Router()

/** SSE 端点：实时服务端日志流 */
router.get('/stream', (req, res) => {
  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.setHeader('Access-Control-Allow-Origin', '*')

  // 注册客户端（自动发送历史日志）
  logStreamManager.addClient(res)

  // 客户端断开时自动清理
  req.on('close', () => {
    logStreamManager.removeClient(res)
  })
})

export default router
