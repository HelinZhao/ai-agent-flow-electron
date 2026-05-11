import fsp from 'fs/promises'
import path from 'path'
import { app } from 'electron'
import { AttachmentPayload } from './shared'

// 获取Resources目录，目录不存在时自动创建
export const getResourcesDir = (subPath?: string): string => {
  let dir: string
  if (app.isPackaged) {
    dir = path.join(path.dirname(process.execPath), `resources${subPath}`)
  } else {
    dir = path.join(`./resources${subPath}`) // 开发时
  }
  return dir
}

// 将附件数据保存到磁盘文件
export async function saveAttachmentToDisk(att: AttachmentPayload): Promise<string> {
  const attachDir = getResourcesDir('/attachments')
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