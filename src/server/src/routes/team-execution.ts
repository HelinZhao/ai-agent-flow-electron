import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { teamExecutionTracker } from '../utils/teamExecutionTracker'
import { logPath, LOG_DIR, safeFileName, findLatestExecutionByTeamId, listExecutionsByTeamId } from '../utils/teamExecutionFileStore'

const router = Router()

// ============================================================
//  SSE 实时流：监听指定 team execution 的事件
// ============================================================
router.get('/progress-sse/:executionId', (req, res) => {
  const { executionId } = req.params

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  // 发送初始连接确认
  res.write(`data: ${JSON.stringify({ type: 'connected', executionId })}\n\n`)

  // 注册 SSE 客户端
  teamExecutionTracker.addSSEClient(executionId, { res })

  // 客户端断开时清理
  req.on('close', () => {
    teamExecutionTracker.removeSSEClient(executionId, { res })
  })
})

// ============================================================
//  SSE 全局流：监听所有 team execution 的事件
// ============================================================
router.get('/progress-sse', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  teamExecutionTracker.addGlobalSSEClient({ res })

  // 连接后立即推送当前活跃状态（刷新重连后恢复现场）
  const state = teamExecutionTracker.getActiveState()
  res.write(`data: ${JSON.stringify({ type: 'sync_state', state })}\n\n`)

  req.on('close', () => {
    teamExecutionTracker.removeGlobalSSEClient({ res })
  })
})

// ============================================================
//  审批工具调用
// ============================================================
router.post('/approve-tool/:executionId', (req, res) => {
  const { executionId } = req.params
  const { decisions } = req.body

  if (!decisions || !Array.isArray(decisions)) {
    return res.status(400).json({ error: 'decisions 是必填的数组' })
  }

  const ok = teamExecutionTracker.approveToolCall(executionId, decisions)
  if (!ok) {
    return res.status(404).json({ error: '没有待审批的工具调用' })
  }

  return res.json({ success: true })
})

// ============================================================
//  设置自动审批
// ============================================================
router.post('/auto-approve/:executionId', (req, res) => {
  const { executionId } = req.params
  const { toolName } = req.body

  if (!toolName) {
    return res.status(400).json({ error: 'toolName 是必填的' })
  }

  teamExecutionTracker.setAutoApprove(executionId, toolName)
  return res.json({ success: true })
})

// ============================================================
//  活跃执行列表（供 TeamMonitor 页面轮询）
// ============================================================
router.get('/list', (_req, res) => {
  try {
    const executionIds = teamExecutionTracker.getActiveExecutionIds()
    const executions = executionIds
      .map(id => {
        const meta = teamExecutionTracker.getExecutionMeta(id)
        return { executionId: id, ...meta }
      })
      .filter(e => e.executionId.startsWith('task:'))

    return res.json({ executions, pendingApprovalCount: teamExecutionTracker.getPendingApprovalCount() })
  } catch {
    return res.status(500).json({ error: '获取执行列表失败' })
  }
})

// ============================================================
//  待审批队列
// ============================================================
router.get('/pending-approvals', (_req, res) => {
  try {
    const items = teamExecutionTracker.getPendingApprovalDetails()
    return res.json({ items, count: items.length })
  } catch {
    return res.status(500).json({ error: '获取待审批列表失败' })
  }
})

// ============================================================
//  历史记录
// ============================================================

/** 获取日志文件 URL（前端拿到后直接 fetch 解析） */
router.get('/history/:executionId', (req, res) => {
  try {
    const fp = logPath(req.params.executionId)
    if (!fs.existsSync(fp)) return res.json({ events: [] })
    return res.json({ url: `/team-execution/files/${safeFileName(req.params.executionId)}.jsonl` })
  } catch {
    return res.status(500).json({ error: '获取历史记录失败' })
  }
})

/** 按 teamId 查找最近的执行记录 */
router.get('/last-execution/:teamId', (req, res) => {
  try {
    const result = findLatestExecutionByTeamId(req.params.teamId)
    if (!result) return res.json({ executionId: null })
    return res.json({ executionId: result.executionId, lastEventAt: result.mtime })
  } catch {
    return res.status(500).json({ error: '查询失败' })
  }
})

/** 列出团队的所有历史执行 */
router.get('/history-by-team/:teamId', (req, res) => {
  try {
    const executions = listExecutionsByTeamId(req.params.teamId)
    return res.json({ executions })
  } catch {
    return res.status(500).json({ error: '获取历史列表失败' })
  }
})

/** 流式返回 .jsonl 文件内容 */
router.get('/files/:filename', (req, res) => {
  const fp = path.join(LOG_DIR, req.params.filename)
  if (!fp.startsWith(LOG_DIR)) return res.status(403).json({ error: '非法路径' })
  if (!fs.existsSync(fp)) return res.status(404).json({ error: '文件不存在' })
  res.type('text/plain')
  res.sendFile(fp)
})

export default router
