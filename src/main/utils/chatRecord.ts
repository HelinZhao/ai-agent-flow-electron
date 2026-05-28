import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { existsSync } from 'fs'
import { gzip, gunzip } from 'zlib'
import { promisify } from 'util'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

// 附件元数据（轻量，用于历史持久化）
export interface AttachmentMetadata {
  id: string
  name: string          // 文件名
  type: string          // MIME类型
  size: number          // 文件大小
  category: 'image' | 'text' | 'pdf' | 'binary'  // 分类
  url?: string          // Express服务URL（/api/attachments/:id/:filename，重启后仍可访问）
}

export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'agent'
  timestamp: string // ISO string
  agentId?: string
  attachments?: AttachmentMetadata[]
}

export interface ChatRecord {
  id: string
  agentId: string
  agentName: string
  title: string // 对话标题，通常是第一条用户消息的前20个字符
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export class ChatRecordManager {
  private static instance: ChatRecordManager
  private recordDir: string

  private constructor() {
    const base = app.isPackaged
      ? app.getPath('userData')
      : join(process.cwd(), 'data')
    this.recordDir = join(base, 'chat_records')
    this.ensureRecordDir()
  }

  public static getInstance(): ChatRecordManager {
    if (!ChatRecordManager.instance) {
      ChatRecordManager.instance = new ChatRecordManager()
    }
    return ChatRecordManager.instance
  }

  private async ensureRecordDir(): Promise<void> {
    try {
      if (!existsSync(this.recordDir)) {
        await fs.mkdir(this.recordDir, { recursive: true })
      }
    } catch (error) {
      console.error('创建历史记录目录失败:', error)
    }
  }

  private sanitizeAgentId(agentId: string): string {
    return agentId.replace(/[^a-zA-Z0-9_-]/g, '_')
  }

  private getRecordFilePath(agentId: string): string {
    return join(this.recordDir, `chat_${this.sanitizeAgentId(agentId)}.json.gz`)
  }

  private getOldRecordFilePath(agentId: string): string {
    return join(this.recordDir, `chat_${this.sanitizeAgentId(agentId)}.json`)
  }

  // 生成对话标题
  private generateChatTitle(firstUserMessage: string, attachments?: AttachmentMetadata[]): string {
    if (firstUserMessage === '(附件)' && attachments && attachments.length > 0) {
      const fileNames = attachments.map(a => a.name).join(', ')
      return fileNames.substring(0, 20) + (fileNames.length > 20 ? '...' : '')
    }
    return firstUserMessage.substring(0, 20) + (firstUserMessage.length > 20 ? '...' : '')
  }

  // 保存对话记录
  public async saveChatRecord(
    agentId: string,
    agentName: string,
    messages: ChatMessage[]
  ): Promise<void> {
    try {
      if (messages.length === 0) return
      const filePath = this.getRecordFilePath(agentId)

      let existingRecord: ChatRecord

      try {
        // 读取现有压缩文件
        const compressed = await fs.readFile(filePath)
        const data = await gunzipAsync(compressed)
        existingRecord = JSON.parse(data.toString('utf-8'))
      } catch {
        // 尝试读取旧格式（未压缩）文件
        const oldFilePath = this.getOldRecordFilePath(agentId)
        try {
          const existingData = await fs.readFile(oldFilePath, 'utf-8')
          existingRecord = JSON.parse(existingData)
        } catch {
          // 文件不存在或解析失败，创建新的历史记录
          existingRecord = {
            id: `chat_${agentId}_${Date.now()}`,
            agentId,
            agentName,
            title: '',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      }

      // 更新消息（剥离previewUrl等大体积字段，避免JSON膨胀）
      existingRecord.messages = messages.map(msg => ({
        ...msg,
        attachments: msg.attachments?.map(att => ({
          id: att.id,
          name: att.name,
          type: att.type,
          size: att.size,
          category: att.category,
          url: att.url,  // Express URL是小字符串，可持久化
          // previewUrl(base64)不存入历史文件，前端从Express URL加载图片
        }))
      }))
      existingRecord.updatedAt = new Date().toISOString()

      // 如果有用户消息，生成标题
      if (!existingRecord.title && messages.length > 0) {
        const firstUserMessage = messages.find((msg) => msg.sender === 'user')
        if (firstUserMessage) {
          existingRecord.title = this.generateChatTitle(firstUserMessage.content, firstUserMessage.attachments)
        }
      }

      // 保存为 Gzip 压缩格式
      const jsonStr = JSON.stringify(existingRecord)
      const compressed = await gzipAsync(jsonStr)
      await fs.writeFile(filePath, compressed)

      // 保存成功后，清理旧格式文件
      const oldFilePath = this.getOldRecordFilePath(agentId)
      if (existsSync(oldFilePath)) {
        await fs.unlink(oldFilePath).catch(() => {})
      }

      console.log(`对话记录已保存(Gzip压缩): ${filePath}`)
    } catch (error) {
      console.error('保存对话记录失败:', error)
    }
  }

  // 读取对话记录
  public async loadChatRecord(agentId: string): Promise<ChatRecord | null> {
    try {
      const filePath = this.getRecordFilePath(agentId)

      if (existsSync(filePath)) {
        const compressed = await fs.readFile(filePath)
        const data = await gunzipAsync(compressed)
        console.log(`从 ${filePath} 加载对话记录(Gzip解压)`)
        return JSON.parse(data.toString('utf-8'))
      }

      // 兼容旧格式：尝试加载未压缩的 .json 文件
      const oldFilePath = this.getOldRecordFilePath(agentId)
      if (existsSync(oldFilePath)) {
        const data = await fs.readFile(oldFilePath, 'utf-8')
        console.log(`从 ${oldFilePath} 加载对话记录(旧格式)`)
        return JSON.parse(data)
      }

      return null
    } catch (error) {
      console.error('读取对话记录失败:', error)
      return null
    }
  }

  // 获取所有对话记录列表
  public async getAllChatRecords(): Promise<ChatRecord[]> {
    try {
      if (!existsSync(this.recordDir)) {
        return []
      }

      const files = await fs.readdir(this.recordDir)
      const histories: ChatRecord[] = []

      for (const file of files) {
        const isGz = file.startsWith('chat_') && file.endsWith('.json.gz')
        const isJson = file.startsWith('chat_') && file.endsWith('.json') && !file.endsWith('.json.gz')

        if (!isGz && !isJson) continue

        try {
          const filePath = join(this.recordDir, file)
          let history: ChatRecord

          if (isGz) {
            const compressed = await fs.readFile(filePath)
            const data = await gunzipAsync(compressed)
            history = JSON.parse(data.toString('utf-8'))
          } else {
            const data = await fs.readFile(filePath, 'utf-8')
            history = JSON.parse(data)
          }

          histories.push(history)
        } catch (error) {
          console.error(`解析对话记录文件失败 ${file}:`, error)
        }
      }

      // 按更新时间排序
      histories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

      return histories
    } catch (error) {
      console.error('获取所有对话记录失败:', error)
      return []
    }
  }

  // 删除对话记录
  public async deleteChatRecord(agentId: string): Promise<boolean> {
    try {
      const filePath = this.getRecordFilePath(agentId)

      if (existsSync(filePath)) {
        await fs.unlink(filePath)
        console.log(`对话记录已删除: ${filePath}`)
        return true
      }

      // 尝试删除旧格式文件
      const oldFilePath = this.getOldRecordFilePath(agentId)
      if (existsSync(oldFilePath)) {
        await fs.unlink(oldFilePath)
        console.log(`对话记录已删除: ${oldFilePath}`)
        return true
      }

      return false
    } catch (error) {
      console.error('删除对话记录失败:', error)
      return false
    }
  }

  // 清除所有对话记录
  public async clearAllChatRecords(): Promise<void> {
    try {
      if (existsSync(this.recordDir)) {
        await fs.rm(this.recordDir, { recursive: true })
        console.log('所有对话记录已清除')
      }
    } catch (error) {
      console.error('清除所有对话记录失败:', error)
    }
  }

  // 获取历史记录目录路径（用于调试）
  public getRecordDirectory(): string {
    return this.recordDir
  }
}
