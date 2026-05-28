import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 为渲染器进程定制API
const api = {
  // 文件操作
  file: {
    write: (filePath: string, data: string) => ipcRenderer.invoke('file:write', filePath, data),
  },
  // 文件对话框
  dialog: {
    showSave: (options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) =>
      ipcRenderer.invoke('dialog:showSave', options),
  },
  // 服务器控制API
  server: {
    start: (port?: number) => ipcRenderer.invoke('server:start', port),
    stop: () => ipcRenderer.invoke('server:stop'),
    status: () => ipcRenderer.invoke('server:status')
  },
  // 对话记录API
  chatRecord: {
    saveRecord: (agentId: string, agentName: string, messages: any[]) =>
      ipcRenderer.invoke('chat:saveRecord', agentId, agentName, messages),
    loadRecord: (agentId: string) => ipcRenderer.invoke('chat:loadRecord', agentId),
    getAllRecords: () => ipcRenderer.invoke('chat:getAllRecords'),
    deleteRecord: (agentId: string) => ipcRenderer.invoke('chat:deleteRecord', agentId),
    clearAllRecords: () => ipcRenderer.invoke('chat:clearAllRecords'),
    getRecordDirectory: () => ipcRenderer.invoke('chat:getRecordDirectory')
  },
  // 通知提醒API
  notify: {
    flashFrame: () => ipcRenderer.invoke('notify:flashFrame')
  },
  // 窗口控制API
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  },
  // 应用控制API
  app: {
    getAutoStart: () => ipcRenderer.invoke('app:getAutoStart'),
    setAutoStart: (openAtLogin: boolean) => ipcRenderer.invoke('app:setAutoStart', openAtLogin),
    restart: () => ipcRenderer.invoke('app:restart')
  },
  // 系统资源API
  system: {
    getResources: () => ipcRenderer.invoke('system:getResources')
  },
  // Git 版本控制API
  git: {
    loadConfig: () => ipcRenderer.invoke('git:loadConfig'),
    saveConfig: (config: { enabled: boolean; repoPath: string }) => ipcRenderer.invoke('git:saveConfig', config),
    initRepo: (repoPath: string) => ipcRenderer.invoke('git:initRepo', repoPath),
    writeEntity: (opts: { repoPath: string; type: string; entity: any }) => ipcRenderer.invoke('git:writeEntity', opts),
    deleteEntity: (opts: { repoPath: string; type: string; id: string }) => ipcRenderer.invoke('git:deleteEntity', opts),
    commit: (opts: { repoPath: string; message: string }) => ipcRenderer.invoke('git:commit', opts),
    stage: (opts: { repoPath: string; file: string }) => ipcRenderer.invoke('git:stage', opts),
    unstage: (opts: { repoPath: string; file: string }) => ipcRenderer.invoke('git:unstage', opts),
    stageAll: (repoPath: string) => ipcRenderer.invoke('git:stageAll', repoPath),
    detailedStatus: (repoPath: string) => ipcRenderer.invoke('git:detailedStatus', repoPath),
    workingTreeDiff: (opts: { repoPath: string; filePath: string }) => ipcRenderer.invoke('git:workingTreeDiff', opts),
    history: (opts: { repoPath: string; filePath?: string }) => ipcRenderer.invoke('git:history', opts),
    commitFiles: (opts: { repoPath: string; hash: string }) => ipcRenderer.invoke('git:commitFiles', opts),
    showFile: (opts: { repoPath: string; hash: string; filePath: string }) => ipcRenderer.invoke('git:showFile', opts),
    commitFileDiff: (opts: { repoPath: string; hash: string; filePath: string }) => ipcRenderer.invoke('git:commitFileDiff', opts),
    diff: (opts: { repoPath: string; hash1: string; hash2: string; filePath?: string }) => ipcRenderer.invoke('git:diff', opts),
    restore: (opts: { repoPath: string; hash: string; filePath: string }) => ipcRenderer.invoke('git:restore', opts),
    status: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
  }
}

// 如果启用了上下文隔离，使用`contextBridge` API将Electron API暴露给渲染器
// 否则直接添加到DOM全局对象
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (在dts中定义)
  window.electron = electronAPI
  // @ts-ignore (在dts中定义)
  window.api = api
}
