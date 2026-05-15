import fsp from 'fs/promises'
import path from 'path'
import { app } from 'electron'
import { AttachmentPayload } from './shared'

/** 获取运行时数据目录（用户数据，非静态资源） */
export const getUserDataDir = (subPath?: string): string => {
  const base = app.isPackaged
    ? app.getPath('userData')
    : path.join(process.cwd(), 'data')
  return path.join(base, subPath || '')
}

/** 迁移旧的运行时数据到新的 userData 目录 */
export async function migrateOldDataDir(): Promise<void> {
  const subPaths = ['/data', '/attachments', '/uploads', '/lancedb', '/proxy-config.json']
  for (const sub of subPaths) {
    const oldPath = app.isPackaged
      ? path.join(path.dirname(process.execPath), 'resources', sub)
      : path.join(process.cwd(), 'resources', sub)
    await moveIfExists(oldPath, getUserDataDir(sub))
  }

  // 迁移旧版 chat_records（之前存在项目根目录下）
  const oldChatRecords = app.isPackaged
    ? path.join(process.cwd(), 'chat_records')
    : path.join(process.cwd(), 'chat_records')
  await moveIfExists(oldChatRecords, getUserDataDir('/chat_records'))
}

async function moveIfExists(oldPath: string, newPath: string): Promise<void> {
  try {
    await fsp.access(oldPath)
  } catch {
    return // 旧路径不存在，跳过
  }
  try {
    await fsp.access(newPath)
    return // 新路径已存在，跳过
  } catch {
    // 新路径不存在，执行迁移
  }
  try {
    await fsp.mkdir(path.dirname(newPath), { recursive: true })
    await fsp.rename(oldPath, newPath)
    console.log(`[迁移] ${oldPath} → ${newPath}`)
  } catch (err) {
    console.error(`[迁移] 失败: ${oldPath} → ${newPath}:`, err)
  }
}

// 将附件数据保存到磁盘文件
export async function saveAttachmentToDisk(att: AttachmentPayload): Promise<string> {
  const attachDir = getUserDataDir('/attachments')
  await fsp.mkdir(attachDir, { recursive: true })
  const filePath = path.join(attachDir, `${att.id}-${att.name}`)

  if (att.dataUrl) {
    const base64Data = att.dataUrl.replace(/^data:[^;]+;base64,/, '')
    await fsp.writeFile(filePath, Buffer.from(base64Data, 'base64'))
  } else if (att.textContent) {
    await fsp.writeFile(filePath, att.textContent, 'utf-8')
  } else {
    throw new Error(`附件 ${att.name} 无内容可保存`)
  }

  return filePath
}

// 从磁盘文件读取并生成 data URI（用于发送给LLM）
export async function loadAttachmentAsDataUrl(filePath: string, mimeType: string): Promise<string> {
  const buffer = await fsp.readFile(filePath)
  const base64 = buffer.toString('base64')
  return `data:${mimeType};base64,${base64}`
}

// 从磁盘文件读取文本内容
export async function loadAttachmentAsText(filePath: string): Promise<string> {
  return await fsp.readFile(filePath, 'utf-8')
}