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

interface GitCommitOpts { repoPath: string; type: string; entity: any; message: string }
interface GitDeleteOpts { repoPath: string; type: string; id: string; message: string }
interface GitHistoryOpts { repoPath: string; filePath?: string }
interface GitDiffOpts { repoPath: string; hash1: string; hash2: string; filePath?: string }
interface GitRestoreOpts { repoPath: string; hash: string; filePath: string }
interface GitStatusResult { total: number; unstaged: number; lastCommit: string | null }
interface GitConfig { enabled: boolean; repoPath: string }

interface GitAPI {
  loadConfig: () => Promise<GitConfig>
  saveConfig: (config: GitConfig) => Promise<boolean>
  initRepo: (repoPath: string) => Promise<boolean>
  commit: (opts: GitCommitOpts) => Promise<string>
  delete: (opts: GitDeleteOpts) => Promise<boolean>
  history: (opts: GitHistoryOpts) => Promise<{ hash: string; date: string; message: string }[]>
  diff: (opts: GitDiffOpts) => Promise<string>
  restore: (opts: GitRestoreOpts) => Promise<boolean>
  status: (repoPath: string) => Promise<GitStatusResult>
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
  git: GitAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}