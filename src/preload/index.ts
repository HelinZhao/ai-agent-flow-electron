import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 为渲染器进程定制API
const api = {
  // 服务器控制API
  server: {
    start: (port?: number) => ipcRenderer.invoke('server:start', port),
    stop: () => ipcRenderer.invoke('server:stop'),
    status: () => ipcRenderer.invoke('server:status')
  },
  // 对话历史API
  chatHistory: {
    saveHistory: (agentId: string, agentName: string, messages: any[]) =>
      ipcRenderer.invoke('chat:saveHistory', agentId, agentName, messages),
    loadHistory: (agentId: string) => ipcRenderer.invoke('chat:loadHistory', agentId),
    getAllHistories: () => ipcRenderer.invoke('chat:getAllHistories'),
    deleteHistory: (agentId: string) => ipcRenderer.invoke('chat:deleteHistory', agentId),
    clearAllHistories: () => ipcRenderer.invoke('chat:clearAllHistories'),
    getHistoryDirectory: () => ipcRenderer.invoke('chat:getHistoryDirectory')
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
