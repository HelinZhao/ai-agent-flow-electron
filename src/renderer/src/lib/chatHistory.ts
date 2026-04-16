import { ChatHistory, ChatMessage } from '@renderer/types'

// 对话历史API封装
export const chatHistoryApi = {
  // 保存对话历史
  saveHistory: async (agentId: string, agentName: string, messages: ChatMessage[]) => {
    try {
      if (!(window as any).api?.chatHistory) {
        console.warn('对话历史API不可用')
        return { success: false, error: 'API不可用' }
      }

      return await (window.api as any).chatHistory.saveHistory(agentId, agentName, messages)
    } catch (error) {
      console.error('保存对话历史失败:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  // 加载对话历史
  loadHistory: async (agentId: string) => {
    try {
      if (!(window as any).api?.chatHistory) {
        console.warn('对话历史API不可用')
        return { success: false, history: null }
      }

      return await (window.api as any).chatHistory.loadHistory(agentId)
    } catch (error) {
      console.error('加载对话历史失败:', error)
      return { success: false, history: null }
    }
  },

  // 获取所有对话历史
  getAllHistories: async () => {
    try {
      if (!(window as any).api?.chatHistory) {
        console.warn('对话历史API不可用')
        return { success: false, histories: [] }
      }

      return await (window.api as any).chatHistory.getAllHistories()
    } catch (error) {
      console.error('获取所有对话历史失败:', error)
      return { success: false, histories: [] }
    }
  },

  // 删除对话历史
  deleteHistory: async (agentId: string) => {
    try {
      if (!(window as any).api?.chatHistory) {
        console.warn('对话历史API不可用')
        return { success: false, deleted: false }
      }

      return await (window.api as any).chatHistory.deleteHistory(agentId)
    } catch (error) {
      console.error('删除对话历史失败:', error)
      return { success: false, deleted: false }
    }
  },

  // 清除所有对话历史
  clearAllHistories: async () => {
    try {
      if (!(window as any).api?.chatHistory) {
        console.warn('对话历史API不可用')
        return { success: false }
      }

      return await (window.api as any).chatHistory.clearAllHistories()
    } catch (error) {
      console.error('清除所有对话历史失败:', error)
      return { success: false }
    }
  },

  // 获取历史记录目录
  getHistoryDirectory: async () => {
    try {
      if (!(window as any).api?.chatHistory) {
        console.warn('对话历史API不可用')
        return { success: false, directory: null }
      }

      return await (window.api as any).chatHistory.getHistoryDirectory()
    } catch (error) {
      console.error('获取历史记录目录失败:', error)
      return { success: false, directory: null }
    }
  }
}

// 导出类型
export type { ChatHistory, ChatMessage }
