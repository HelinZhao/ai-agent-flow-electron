import { Router } from 'express'
import { Op } from 'sequelize'
import { UsageLogModel } from '../models'

const router = Router()

// 获取按 executionId 汇总的 token 用量
router.get('/by-execution/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params
    const rows = await UsageLogModel.findAll({ where: { executionId } })
    const summary = rows.reduce(
      (acc, r) => {
        acc.promptTokens += r.promptTokens
        acc.completionTokens += r.completionTokens
        acc.totalTokens += r.totalTokens
        return acc
      },
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    )
    return res.status(200).json({ details: rows, summary })
  } catch (error) {
    console.error('获取 token 用量错误:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : '服务器内部错误' })
  }
})

// 获取按模型聚合的总用量
router.get('/summary', async (_req, res) => {
  try {
    const rows = await UsageLogModel.findAll({
      attributes: [
        'provider',
        'model',
        [UsageLogModel.sequelize!.fn('SUM', UsageLogModel.sequelize!.col('promptTokens')), 'promptTokens'],
        [UsageLogModel.sequelize!.fn('SUM', UsageLogModel.sequelize!.col('completionTokens')), 'completionTokens'],
        [UsageLogModel.sequelize!.fn('SUM', UsageLogModel.sequelize!.col('totalTokens')), 'totalTokens'],
        [UsageLogModel.sequelize!.fn('COUNT', UsageLogModel.sequelize!.col('id')), 'callCount'],
      ],
      group: ['provider', 'model'],
      order: [['totalTokens', 'DESC']],
      raw: true,
    })
    return res.status(200).json(rows)
  } catch (error) {
    console.error('获取 token 汇总错误:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : '服务器内部错误' })
  }
})

export default router
