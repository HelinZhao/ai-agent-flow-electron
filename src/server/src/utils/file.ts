import fs from 'fs/promises'
import path from 'path'
import { app } from 'electron'
import { AttachmentPayload } from './shared'

// 获取数据目录
export const getDataDir = (subPath?: string): string => {
  if (app.isPackaged) {
    return path.join(path.dirname(process.execPath), `data${subPath}`)
  } else {
    return path.join(`./data${subPath}`) // 开发时
  }
}

// 将附件数据保存到磁盘文件
export async function saveAttachmentToDisk(att: AttachmentPayload): Promise<string> {
  const attachDir = getDataDir('/attachments')
  await fs.mkdir(attachDir, { recursive: true })
  const filePath = path.join(attachDir, `${att.id}-${att.name}`)

  if (att.dataUrl) {
    const base64Data = att.dataUrl.replace(/^data:[^;]+;base64,/, '')
    await fs.writeFile(filePath, Buffer.from(base64Data, 'base64'))
  } else if (att.textContent) {
    await fs.writeFile(filePath, att.textContent, 'utf-8')
  } else {
    throw new Error(`附件 ${att.name} 无内容可保存`)
  }

  return filePath
}

// 从磁盘文件读取并生成 data URI（用于发送给LLM）
export async function loadAttachmentAsDataUrl(filePath: string, mimeType: string): Promise<string> {
  const buffer = await fs.readFile(filePath)
  const base64 = buffer.toString('base64')
  return `data:${mimeType};base64,${base64}`
}

// 从磁盘文件读取文本内容
export async function loadAttachmentAsText(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8')
}