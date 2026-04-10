import { ipcMain } from 'electron'
import { ChatHistoryManager, ChatMessage } from '../utils/chatHistory'

const chatHistoryManager = ChatHistoryManager.getInstance()

export function setupChatHistoryIPC(): void {
    // 保存对话历史
    ipcMain.handle('chat:saveHistory', async (_event, agentId: string, agentName: string, messages: ChatMessage[]) => {
        try {
            await chatHistoryManager.saveChatHistory(agentId, agentName, messages)
            return { success: true }
        } catch (error) {
            console.error('IPC保存对话历史失败:', error)
            return { success: false, error: (error as Error).message }
        }
    })

    // 读取对话历史
    ipcMain.handle('chat:loadHistory', async (_event, agentId: string) => {
        try {
            const history = await chatHistoryManager.loadChatHistory(agentId)
            return { success: true, history }
        } catch (error) {
            console.error('IPC读取对话历史失败:', error)
            return { success: false, error: (error as Error).message }
        }
    })

    // 获取所有对话历史
    ipcMain.handle('chat:getAllHistories', async () => {
        try {
            const histories = await chatHistoryManager.getAllChatHistories()
            return { success: true, histories }
        } catch (error) {
            console.error('IPC获取所有对话历史失败:', error)
            return { success: false, error: (error as Error).message }
        }
    })

    // 删除对话历史
    ipcMain.handle('chat:deleteHistory', async (_event, agentId: string) => {
        try {
            const deleted = await chatHistoryManager.deleteChatHistory(agentId)
            return { success: true, deleted }
        } catch (error) {
            console.error('IPC删除对话历史失败:', error)
            return { success: false, error: (error as Error).message }
        }
    })

    // 清除所有对话历史
    ipcMain.handle('chat:clearAllHistories', async () => {
        try {
            await chatHistoryManager.clearAllChatHistories()
            return { success: true }
        } catch (error) {
            console.error('IPC清除所有对话历史失败:', error)
            return { success: false, error: (error as Error).message }
        }
    })

    // 获取历史记录目录路径
    ipcMain.handle('chat:getHistoryDirectory', () => {
        try {
            const dir = chatHistoryManager.getHistoryDirectory()
            return { success: true, directory: dir }
        } catch (error) {
            console.error('IPC获取历史记录目录失败:', error)
            return { success: false, error: (error as Error).message }
        }
    })
}