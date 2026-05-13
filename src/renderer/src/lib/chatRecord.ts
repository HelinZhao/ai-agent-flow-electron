import { chatRecord, ChatMessage } from '@renderer/types'

// 对话记录API封装
export const chatRecordApi = {
  // 保存对话记录
  saveRecord: async (agentId: string, agentName: string, messages: ChatMessage[]) => {
    try {
      if (!(window as any).api?.chatRecord) {
        console.warn('对话记录API不可用')
        return { success: false, error: 'API不可用' }
      }

      return await (window.api as any).chatRecord.saveRecord(agentId, agentName, messages)
    } catch (error) {
      console.error('保存对话记录失败:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  // 加载对话记录
  loadRecord: async (agentId: string) => {
    try {
      if (!(window as any).api?.chatRecord) {
        console.warn('对话记录API不可用')
        return { success: false, history: null }
      }

      return await (window.api as any).chatRecord.loadRecord(agentId)
    } catch (error) {
      console.error('加载对话记录失败:', error)
      return { success: false, history: null }
    }
  },

  // 获取所有对话记录
  getAllRecords: async () => {
    try {
      if (!(window as any).api?.chatRecord) {
        console.warn('对话记录API不可用')
        return { success: false, histories: [] }
      }

      return await (window.api as any).chatRecord.getAllRecords()
    } catch (error) {
      console.error('获取所有对话记录失败:', error)
      return { success: false, histories: [] }
    }
  },

  // 删除对话记录
  deleteRecord: async (agentId: string) => {
    try {
      if (!(window as any).api?.chatRecord) {
        console.warn('对话记录API不可用')
        return { success: false, deleted: false }
      }

      return await (window.api as any).chatRecord.deleteRecord(agentId)
    } catch (error) {
      console.error('删除对话记录失败:', error)
      return { success: false, deleted: false }
    }
  },

  // 清除所有对话记录
  clearAllRecords: async () => {
    try {
      if (!(window as any).api?.chatRecord) {
        console.warn('对话记录API不可用')
        return { success: false }
      }

      return await (window.api as any).chatRecord.clearAllRecords()
    } catch (error) {
      console.error('清除所有对话记录失败:', error)
      return { success: false }
    }
  },

  // 获取历史记录目录
  getRecordDirectory: async () => {
    try {
      if (!(window as any).api?.chatRecord) {
        console.warn('对话记录API不可用')
        return { success: false, directory: null }
      }

      return await (window.api as any).chatRecord.getRecordDirectory()
    } catch (error) {
      console.error('获取历史记录目录失败:', error)
      return { success: false, directory: null }
    }
  }
}

// 导出类型
export type { chatRecord, ChatMessage }
