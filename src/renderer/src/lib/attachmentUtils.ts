import { AttachmentMetadata } from '@renderer/types'

// 运行时附件数据（含完整内容，用于发送给server）
export interface AttachmentData extends AttachmentMetadata {
  dataUrl?: string       // base64 data URL（图片/PDF）
  textContent?: string   // 文本内容（代码/文本文件）
}

// 判断文件分类
export function classifyFile(mimeType: string, fileName: string): AttachmentMetadata['category'] {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  const textTypes = [
    'text/', 'application/json', 'application/xml',
    'application/javascript', 'application/x-yaml',
  ]
  const codeExtensions = [
    '.py', '.js', '.ts', '.jsx', '.tsx', '.css', '.html',
    '.sh', '.bat', '.sql', '.go', '.rs', '.java',
    '.c', '.cpp', '.h', '.rb', '.php', '.swift', '.kt',
    '.md', '.yaml', '.yml', '.toml', '.ini', '.conf',
    '.log', '.csv', '.env',
  ]
  if (textTypes.some(t => mimeType.startsWith(t)) || codeExtensions.some(ext => fileName.toLowerCase().endsWith(ext))) {
    return 'text'
  }
  return 'binary'
}

// 读取文件并生成AttachmentData
export async function processFileAttachment(file: File): Promise<AttachmentData> {
  const category = classifyFile(file.type || 'application/octet-stream', file.name)
  const id = `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const base: AttachmentMetadata = {
    id,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    category,
  }

  const attachment: AttachmentData = { ...base }

  if (category === 'image') {
    attachment.dataUrl = await readFileAsDataUrl(file)
    attachment.previewUrl = attachment.dataUrl
  } else if (category === 'text') {
    attachment.textContent = await readFileAsText(file)
  } else if (category === 'pdf') {
    attachment.dataUrl = await readFileAsDataUrl(file)
  }

  return attachment
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

// 去除大体积字段，仅保留轻量元数据用于历史持久化
export function stripAttachmentForHistory(att: AttachmentData): AttachmentMetadata {
  return {
    id: att.id,
    name: att.name,
    type: att.type,
    size: att.size,
    category: att.category,
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}