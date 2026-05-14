import { VISION_MODEL_PATTERNS } from '../config'

export function isVisionModel(model: string): boolean {
  const lowerModel = model.toLowerCase()
  return VISION_MODEL_PATTERNS.some(pattern => lowerModel.includes(pattern))
}

export interface AttachmentPayload {
  id: string
  name: string
  type: string
  size: number
  category: 'image' | 'text' | 'pdf' | 'binary'
  dataUrl?: string        // base64 data URI（仅临时传输，不持久化）
  textContent?: string    // 文本内容（仅临时传输，不持久化）
  filePath?: string       // 磁盘文件路径（持久化）
}


// 安全JSON解析函数
export const safeJsonParse = <T>(str: string, defaultValue: T): T => {
  if (!str) return defaultValue
  try {
    return JSON.parse(str)
  } catch (error) {
    console.error('JSON解析失败:', error)
    return defaultValue
  }
}