import { ElectronAPI } from '@electron-toolkit/preload'

interface ServerAPI {
  start: (
    port?: number
  ) => Promise<{ success: boolean; port?: number; url?: string; error?: string }>
  stop: () => Promise<{ success: boolean; error?: string }>
  status: () => Promise<{ running: boolean; port: number | null; url: string | null }>
}

interface ChatHistoryAPI {
  saveHistory: (agentId: string, agentName: string, messages: any[]) => Promise<any>
  loadHistory: (agentId: string) => Promise<any>
  getAllHistories: () => Promise<any>
  deleteHistory: (agentId: string) => Promise<any>
  clearAllHistories: () => Promise<any>
  getHistoryDirectory: () => Promise<any>
}

interface NotifyAPI {
  flashFrame: () => Promise<boolean>
}

interface CustomAPI {
  server: ServerAPI
  chatHistory: ChatHistoryAPI
  notify: NotifyAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}