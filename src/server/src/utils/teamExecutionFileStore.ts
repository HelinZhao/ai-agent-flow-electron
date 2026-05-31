import fs from 'fs'
import path from 'path'
import { getUserDataDir } from './file'

export const LOG_DIR = getUserDataDir('team-exec-logs')

function ensureDir(subDir?: string): string {
  const dir = subDir ? path.join(LOG_DIR, subDir) : LOG_DIR
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** 将 executionId 转为安全的文件名 */
export function safeFileName(executionId: string): string {
  return executionId.replace(/[/:]/g, '_')
}

/**
 * 事件日志文件路径（基于 teamId 的子目录）。
 * 格式: logs/<teamId>/<safeExecutionId>.jsonl
 * 这样按 teamId 查找时无需扫描全部文件。
 */
export function logPath(teamId: string, executionId: string): string {
  const subDir = safeFileName(teamId || 'unknown')
  return path.join(LOG_DIR, subDir, `${safeFileName(executionId)}.jsonl`)
}

/**
 * 追加一条事件到 execution 的日志文件。
 * 每条事件一行 JSON，append-only。
 */
export function appendEvent(teamId: string | undefined, executionId: string, event: Record<string, any>): void {
  const subDir = safeFileName(teamId || 'unknown')
  ensureDir(subDir)
  const line = JSON.stringify(event) + '\n'
  try {
    fs.appendFileSync(logPath(teamId || 'unknown', executionId), line, 'utf-8')
  } catch (err) {
    console.error(`[FileStore] 写入日志失败 ${executionId}:`, err)
  }
}

/**
 * 读取 execution 的全部历史事件（按写入顺序）。
 */
export function readEvents(teamId: string, executionId: string): Record<string, any>[] {
  const fp = logPath(teamId, executionId)
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
 * 按 teamId 查找最近的执行记录。
 * 现在只需读对应子目录，无需全量扫描。
 */
export function findLatestExecutionByTeamId(teamId: string): { executionId: string; mtime: Date } | null {
  const subDir = safeFileName(teamId)
  const dir = path.join(LOG_DIR, subDir)
  if (!fs.existsSync(dir)) return null
  try {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'))
    let latest: { executionId: string; mtime: Date } | null = null
    for (const file of files) {
      const fp = path.join(dir, file)
      const stat = fs.statSync(fp)
      if (stat.size === 0) continue
      const originalExId = file.replace(/\.jsonl$/, '')
      // 只读前 2KB 获取第一行
      const fd = fs.openSync(fp, 'r')
      const buf = Buffer.alloc(Math.min(stat.size, 2048))
      fs.readSync(fd, buf, 0, buf.length, 0)
      fs.closeSync(fd)
      const firstLine = buf.toString('utf-8').split('\n')[0]
      const originalId = firstLine ? (() => { try { return JSON.parse(firstLine).executionId } catch { return null } })() : null
      const exId = originalId || originalExId.replace(/_/g, ':')
      if (!latest || stat.mtime > latest.mtime) {
        latest = { executionId: exId, mtime: stat.mtime }
      }
    }
    return latest
  } catch {
    return null
  }
}

/** 列出团队的所有历史执行（按时间倒序） */
export function listExecutionsByTeamId(teamId: string): { executionId: string; taskTitle?: string; lastEventAt: Date; eventCount: number }[] {
  const subDir = safeFileName(teamId)
  const dir = path.join(LOG_DIR, subDir)
  if (!fs.existsSync(dir)) return []
  const result: { executionId: string; taskTitle?: string; lastEventAt: Date; eventCount: number }[] = []
  try {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'))
    for (const file of files) {
      const fp = path.join(dir, file)
      const stat = fs.statSync(fp)
      if (stat.size === 0) continue
      // 只读第一行获取元信息，不加载全部内容
      const fd = fs.openSync(fp, 'r')
      const buf = Buffer.alloc(Math.min(stat.size, 2048)) // 前 2KB 足够读完第一行
      fs.readSync(fd, buf, 0, buf.length, 0)
      fs.closeSync(fd)
      const firstLine = buf.toString('utf-8').split('\n')[0]
      if (!firstLine) continue
      try {
        const firstEvent = JSON.parse(firstLine)
        const originalExId = firstEvent.executionId || file.replace(/\.jsonl$/, '').replace(/_/g, ':')
        result.push({
          executionId: originalExId,
          taskTitle: firstEvent.taskTitle || firstEvent.tt,
          lastEventAt: stat.mtime,
          eventCount: Math.max(0, Math.floor(stat.size / 80)), // 估算：每行约 80 字节
        })
      } catch { /* skip */ }
    }
    result.sort((a, b) => b.lastEventAt.getTime() - a.lastEventAt.getTime())
    return result
  } catch {
    return result
  }
}

/**
 * 获取日志文件的完整路径（供前端 fetch）。
 */
export function logFileUrl(teamId: string, executionId: string): string {
  const subDir = safeFileName(teamId || 'unknown')
  return `/team-execution/files/${subDir}/${safeFileName(executionId)}.jsonl`
}

/** 检查日志文件是否存在 */
export function logFileExists(teamId: string, executionId: string): boolean {
  return fs.existsSync(logPath(teamId, executionId))
}

/** 清除指定 execution 的历史日志文件（任务重启时调用，避免新旧事件混淆） */
export function resetLogFile(teamId: string, executionId: string): void {
  const fp = logPath(teamId, executionId)
  if (fs.existsSync(fp)) {
    try { fs.unlinkSync(fp) } catch { /* ignore */ }
  }
}
