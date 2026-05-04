export function isVisionModel(model: string): boolean {
  const visionPatterns = [
    '4o', '4-turbo', 'vision', 'gpt-4-vision',
    'o1', 'o3', 'o4',
    'claude-3', 'claude-3.5', 'claude-4',
    'vl', 'qwen-vl', 'qwen2-vl',
    'gemini', 'grok-2', 'qwen3.6-plus'
  ]
  const lowerModel = model.toLowerCase()
  return visionPatterns.some(pattern => lowerModel.includes(pattern))
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