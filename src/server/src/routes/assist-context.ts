import { Router } from 'express'

const router = Router()

// 前端协助上下文（AI 通过 tool 按需获取）
let assistContext: Record<string, any> | null = null

export function getAssistContext(): Record<string, any> | null {
  return assistContext
}

export function clearAssistContext(): void {
  assistContext = null
}

router.post('/', (req, res) => {
  assistContext = req.body || null
  res.json({ success: true })
})

router.get('/', (_req, res) => {
  res.json(assistContext || {})
})

router.delete('/', (_req, res) => {
  assistContext = null
  res.json({ success: true })
})

export default router
