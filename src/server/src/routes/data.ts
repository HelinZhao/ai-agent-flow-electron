import { Router } from 'express'
import Database from 'better-sqlite3'
import fs from 'fs/promises'
import { getUserDataDir } from '../utils/file'
import { DB_FILENAME, KB_DB_FILENAME } from '../config'

const router = Router()

// 获取数据库文件大小
router.get('/db-stats', async (_req, res) => {
  try {
    const dbPath = getUserDataDir(DB_FILENAME)
    const kbDbPath = getUserDataDir(KB_DB_FILENAME)

    let mainSize = 0
    let knowledgeSize = 0

    try { const stat = await fs.stat(dbPath); mainSize = stat.size } catch {}
    try { const stat = await fs.stat(kbDbPath); knowledgeSize = stat.size } catch {}

    return res.status(200).json({
      base: { path: dbPath, size: mainSize },
      knowledge: { path: kbDbPath, size: knowledgeSize },
      total: mainSize + knowledgeSize
    })
  } catch (error) {
    console.error('获取数据库统计错误:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : '服务器内部错误' })
  }
})

// VACUUM 数据库释放空闲空间
router.post('/vacuum', async (_req, res) => {
  try {
    const dbPath = getUserDataDir(DB_FILENAME)
    const kbDbPath = getUserDataDir(KB_DB_FILENAME)

    // VACUUM 主数据库
    try {
      const db = new Database(dbPath)
      db.exec('VACUUM')
      db.close()
    } catch (err) {
      console.error('VACUUM base 失败:', err)
    }

    // VACUUM 知识库数据库
    try {
      const kbDb = new Database(kbDbPath)
      kbDb.exec('VACUUM')
      kbDb.close()
    } catch (err) {
      console.error('VACUUM knowledge 失败:', err)
    }

    // 返回清理后的文件大小
    let mainSize = 0
    let knowledgeSize = 0

    try { const stat = await fs.stat(dbPath); mainSize = stat.size } catch {}
    try { const stat = await fs.stat(kbDbPath); knowledgeSize = stat.size } catch {}

    return res.status(200).json({
      message: '数据库空间清理完成',
      base: { size: mainSize },
      knowledge: { size: knowledgeSize },
      total: mainSize + knowledgeSize
    })
  } catch (error) {
    console.error('VACUUM 错误:', error)
    return res.status(500).json({ error: `清理失败: ${error instanceof Error ? error.message : '未知错误'}` })
  }
})

export default router