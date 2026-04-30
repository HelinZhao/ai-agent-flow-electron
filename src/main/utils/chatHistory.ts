import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { existsSync } from 'fs'

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

export interface ChatHistory {
  id: string
  agentId: string
  agentName: string
  title: string // 对话标题，通常是第一条用户消息的前20个字符
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export class ChatHistoryManager {
  private static instance: ChatHistoryManager
  private historyDir: string

  private constructor() {
    // 获取应用同级目录
    const appPath = app.getAppPath()
    const exeDir = app.isPackaged
      ? process.cwd() // 打包后使用当前工作目录
      : appPath // 开发环境使用应用目录

    this.historyDir = join(exeDir, 'chat_history')
    this.ensureHistoryDir()
  }

  public static getInstance(): ChatHistoryManager {
    if (!ChatHistoryManager.instance) {
      ChatHistoryManager.instance = new ChatHistoryManager()
    }
    return ChatHistoryManager.instance
  }

  private async ensureHistoryDir(): Promise<void> {
    try {
      if (!existsSync(this.historyDir)) {
        await fs.mkdir(this.historyDir, { recursive: true })
      }
    } catch (error) {
      console.error('创建历史记录目录失败:', error)
    }
  }

  private getHistoryFilePath(agentId: string): string {
    const safeAgentId = agentId.replace(/[^a-zA-Z0-9_-]/g, '_')
    return join(this.historyDir, `chat_${safeAgentId}.json`)
  }

  // 生成对话标题
  private generateChatTitle(firstUserMessage: string, attachments?: AttachmentMetadata[]): string {
    if (firstUserMessage === '(附件)' && attachments && attachments.length > 0) {
      const fileNames = attachments.map(a => a.name).join(', ')
      return fileNames.substring(0, 20) + (fileNames.length > 20 ? '...' : '')
    }
    return firstUserMessage.substring(0, 20) + (firstUserMessage.length > 20 ? '...' : '')
  }

  // 保存对话历史
  public async saveChatHistory(
    agentId: string,
    agentName: string,
    messages: ChatMessage[]
  ): Promise<void> {
    try {
      if (messages.length === 0) return
      const filePath = this.getHistoryFilePath(agentId)

      let existingHistory: ChatHistory

      try {
        const existingData = await fs.readFile(filePath, 'utf-8')
        existingHistory = JSON.parse(existingData)
      } catch {
        // 文件不存在或解析失败，创建新的历史记录
        existingHistory = {
          id: `chat_${agentId}_${Date.now()}`,
          agentId,
          agentName,
          title: '',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }

      // 更新消息（剥离previewUrl等大体积字段，避免JSON膨胀）
      existingHistory.messages = messages.map(msg => ({
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
      existingHistory.updatedAt = new Date().toISOString()

      // 如果有用户消息，生成标题
      if (!existingHistory.title && messages.length > 0) {
        const firstUserMessage = messages.find((msg) => msg.sender === 'user')
        if (firstUserMessage) {
          existingHistory.title = this.generateChatTitle(firstUserMessage.content, firstUserMessage.attachments)
        }
      }

      // 保存到文件
      await fs.writeFile(filePath, JSON.stringify(existingHistory, null, 2), 'utf-8')
      console.log(`对话历史已保存到: ${filePath}`)
    } catch (error) {
      console.error('保存对话历史失败:', error)
    }
  }

  // 读取对话历史
  public async loadChatHistory(agentId: string): Promise<ChatHistory | null> {
    try {
      const filePath = this.getHistoryFilePath(agentId)

      if (!existsSync(filePath)) {
        return null
      }

      const data = await fs.readFile(filePath, 'utf-8')
      const history: ChatHistory = JSON.parse(data)

      console.log(`从 ${filePath} 加载对话历史`)
      return history
    } catch (error) {
      console.error('读取对话历史失败:', error)
      return null
    }
  }

  // 获取所有对话历史列表
  public async getAllChatHistories(): Promise<ChatHistory[]> {
    try {
      if (!existsSync(this.historyDir)) {
        return []
      }

      const files = await fs.readdir(this.historyDir)
      const histories: ChatHistory[] = []

      for (const file of files) {
        if (file.startsWith('chat_') && file.endsWith('.json')) {
          try {
            const filePath = join(this.historyDir, file)
            const data = await fs.readFile(filePath, 'utf-8')
            const history: ChatHistory = JSON.parse(data)
            histories.push(history)
          } catch (error) {
            console.error(`解析对话历史文件失败 ${file}:`, error)
          }
        }
      }

      // 按更新时间排序
      histories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

      return histories
    } catch (error) {
      console.error('获取所有对话历史失败:', error)
      return []
    }
  }

  // 删除对话历史
  public async deleteChatHistory(agentId: string): Promise<boolean> {
    try {
      const filePath = this.getHistoryFilePath(agentId)

      if (existsSync(filePath)) {
        await fs.unlink(filePath)
        console.log(`对话历史已删除: ${filePath}`)
        return true
      }

      return false
    } catch (error) {
      console.error('删除对话历史失败:', error)
      return false
    }
  }

  // 清除所有对话历史
  public async clearAllChatHistories(): Promise<void> {
    try {
      if (existsSync(this.historyDir)) {
        await fs.rm(this.historyDir, { recursive: true })
        console.log('所有对话历史已清除')
      }
    } catch (error) {
      console.error('清除所有对话历史失败:', error)
    }
  }

  // 获取历史记录目录路径（用于调试）
  public getHistoryDirectory(): string {
    return this.historyDir
  }
}
