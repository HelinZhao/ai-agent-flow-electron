import { ipcMain } from 'electron'
import { ChatRecordManager, ChatMessage } from '../utils/chatRecord'

const chatRecordMgr = ChatRecordManager.getInstance()

export function setupChatRecordIPC(): void {
  // 保存对话记录
  ipcMain.handle(
    'chat:saveRecord',
    async (_event, agentId: string, agentName: string, messages: ChatMessage[]) => {
      try {
        await chatRecordMgr.saveChatRecord(agentId, agentName, messages)
        return { success: true }
      } catch (error) {
        console.error('IPC保存对话记录失败:', error)
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // 读取对话记录
  ipcMain.handle('chat:loadRecord', async (_event, agentId: string) => {
    try {
      const record = await chatRecordMgr.loadChatRecord(agentId)
      return { success: true, history: record }
    } catch (error) {
      console.error('IPC读取对话记录失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 获取所有对话记录
  ipcMain.handle('chat:getAllRecords', async () => {
    try {
      const histories = await chatRecordMgr.getAllChatRecords()
      return { success: true, histories }
    } catch (error) {
      console.error('IPC获取所有对话记录失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 删除对话记录
  ipcMain.handle('chat:deleteRecord', async (_event, agentId: string) => {
    try {
      const deleted = await chatRecordMgr.deleteChatRecord(agentId)
      return { success: true, deleted }
    } catch (error) {
      console.error('IPC删除对话记录失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 清除所有对话记录
  ipcMain.handle('chat:clearAllRecords', async () => {
    try {
      await chatRecordMgr.clearAllChatRecords()
      return { success: true }
    } catch (error) {
      console.error('IPC清除所有对话记录失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 获取历史记录目录路径
  ipcMain.handle('chat:getRecordDirectory', () => {
    try {
      const dir = chatRecordMgr.getRecordDirectory()
      return { success: true, directory: dir }
    } catch (error) {
      console.error('IPC获取历史记录目录失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })
}
