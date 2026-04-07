import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 为渲染器进程定制API
const api = {}

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
