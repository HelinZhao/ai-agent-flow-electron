import { ElectronAPI } from '@electron-toolkit/preload'

interface ServerAPI {
  start: (
    port?: number
  ) => Promise<{ success: boolean; port?: number; url?: string; error?: string }>
  stop: () => Promise<{ success: boolean; error?: string }>
  status: () => Promise<{ running: boolean; port: number | null; url: string | null }>
}

interface ChatRecordAPI {
  saveRecord: (agentId: string, agentName: string, messages: any[]) => Promise<any>
  loadRecord: (agentId: string) => Promise<any>
  getAllRecords: () => Promise<any>
  deleteRecord: (agentId: string) => Promise<any>
  clearAllRecords: () => Promise<any>
  getRecordDirectory: () => Promise<any>
}

interface NotifyAPI {
  flashFrame: () => Promise<boolean>
}

interface WindowAPI {
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
}

interface AppAPI {
  getAutoStart: () => Promise<boolean>
  setAutoStart: (openAtLogin: boolean) => Promise<boolean>
  restart: () => Promise<boolean>
}

interface SystemAPI {
  getResources: () => Promise<{ cpu: number; memory: number; systemMemoryTotal: number; systemMemoryFree: number }>
}

interface FileAPI {
  write: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>
}

interface DialogAPI {
  showSave: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>
}

interface CustomAPI {
  server: ServerAPI
  chatRecord: ChatRecordAPI
  notify: NotifyAPI
  window: WindowAPI
  app: AppAPI
  file: FileAPI
  dialog: DialogAPI
  system: SystemAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}