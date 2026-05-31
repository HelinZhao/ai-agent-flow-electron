import fs from 'fs'
import path from 'path'
import { getUserDataDir } from './file'

export const LOG_DIR = getUserDataDir('team-exec-logs')

function ensureDir(): void {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
}

/** 将 executionId 转为安全的文件名 */
export function safeFileName(executionId: string): string {
  return executionId.replace(/[/:]/g, '_')
}

/** 事件日志文件路径 */
export function logPath(executionId: string): string {
  return path.join(LOG_DIR, `${safeFileName(executionId)}.jsonl`)
}

/**
 * 追加一条事件到 execution 的日志文件。
 * 每条事件一行 JSON，append-only。
 */
export function appendEvent(executionId: string, event: Record<string, any>): void {
  ensureDir()
  const line = JSON.stringify({ ...event, _persistedAt: new Date().toISOString() }) + '\n'
  try {
    fs.appendFileSync(logPath(executionId), line, 'utf-8')
  } catch (err) {
    console.error(`[FileStore] 写入日志失败 ${executionId}:`, err)
  }
}

/**
 * 读取 execution 的全部历史事件（按写入顺序）。
 */
export function readEvents(executionId: string): Record<string, any>[] {
  const fp = logPath(executionId)
  if (!fs.existsSync(fp)) return []
  try {
    const content = fs.readFileSync(fp, 'utf-8')
    return content.split('\n').filter(Boolean).map(line => JSON.parse(line))
  } catch (err) {
    console.error(`[FileStore] 读取日志失败 ${executionId}:`, err)
    return []
  }
}

/**
 * 按 teamId 查找最近的执行文件名。
 * 遍历所有 .jsonl 文件，读第一行提取 teamId，匹配后按修改时间取最新。
 */
export function findLatestExecutionByTeamId(teamId: string): { executionId: string; mtime: Date } | null {
  ensureDir()
  try {
    const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.jsonl'))
    let latest: { executionId: string; mtime: Date } | null = null
    for (const file of files) {
      const fp = path.join(LOG_DIR, file)
      const firstLine = fs.readFileSync(fp, 'utf-8').split('\n')[0]
      if (!firstLine) continue
      try {
        const firstEvent = JSON.parse(firstLine)
        if (firstEvent.teamId === teamId) {
          const stat = fs.statSync(fp)
          const originalExId = firstEvent.executionId || file.slice(0, -6)
          if (!latest || stat.mtime > latest.mtime) {
            latest = { executionId: originalExId, mtime: stat.mtime }
          }
        }
      } catch { /* skip malformed */ }
    }
    return latest
  } catch {
    return null
  }
}

/** 列出团队的所有历史执行（按时间倒序） */
export function listExecutionsByTeamId(teamId: string): { executionId: string; taskTitle?: string; lastEventAt: Date; eventCount: number }[] {
  ensureDir()
  const result: { executionId: string; taskTitle?: string; lastEventAt: Date; eventCount: number }[] = []
  try {
    const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.jsonl'))
    for (const file of files) {
      const fp = path.join(LOG_DIR, file)
      const content = fs.readFileSync(fp, 'utf-8')
      const lines = content.split('\n').filter(Boolean)
      if (lines.length === 0) continue
      try {
        const firstEvent = JSON.parse(lines[0])
        if (firstEvent.teamId === teamId) {
          const stat = fs.statSync(fp)
          const originalExId = firstEvent.executionId || file.slice(0, -6)
          result.push({
            executionId: originalExId,
            taskTitle: firstEvent.taskTitle,
            lastEventAt: stat.mtime,
            eventCount: lines.length,
          })
        }
      } catch { /* skip */ }
    }
    result.sort((a, b) => b.lastEventAt.getTime() - a.lastEventAt.getTime())
    return result
  } catch {
    return result
  }
}

