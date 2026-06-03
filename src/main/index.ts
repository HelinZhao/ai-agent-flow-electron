import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { existsSync, writeFile } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { LocalServer } from '../server/src'
import { setupChatRecordIPC } from './ipc/chatRecord'
import dotenv from 'dotenv'
import os from 'os'
import {
  loadConfig as loadGitConfig,
  saveConfig as saveGitConfig,
  initRepo,
  writeEntityJson,
  deleteEntityJson,
  getHistory,
  getCommitFiles,
  getDiff,
  getCommitFileDiff,
  readFileAtCommit,
  restoreFile,
  getStatus,
  getDetailedStatus,
  commitWithMessage,
  getWorkingTreeDiff,
  stageFile,
  unstageFile,
  stageAllFiles,
} from './git/versionControl'
dotenv.config()

// 禁止应用多开 — 第二次启动时聚焦已有窗口并退出
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

function createWindow(): void {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    resizable: true,
    frame: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 基于 electron-vite cli 的渲染器热模块替换(HMR)
  // 开发环境加载远程URL，生产环境加载本地HTML文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 解析内嵌的 Ollama 可执行文件路径
function resolveOllamaBinary(): string | undefined {
  const binaryName = process.platform === 'win32' ? 'ollama.exe' : 'ollama'
  const candidates: string[] = []
  if (is.dev) {
    candidates.push(join(__dirname, '../../resources/ollama', binaryName))
  }
  candidates.push(join(process.resourcesPath, 'resources/ollama', binaryName))
  candidates.push(join(process.resourcesPath, 'ollama', binaryName))
  candidates.push(join(process.cwd(), 'ollama', binaryName))
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return undefined
}

// 解析打包的 bge-m3 GGUF 模型文件路径（用于本地快速导入）
function resolveBundledModelPath(): string | undefined {
  const modelFile = 'bge-m3-q8_0.gguf'
  const candidates: string[] = []
  if (is.dev) {
    candidates.push(join(__dirname, '../../resources/models', modelFile))
  }
  candidates.push(join(process.resourcesPath, 'resources/models', modelFile))
  candidates.push(join(process.resourcesPath, 'models', modelFile))
  candidates.push(join(process.cwd(), 'models', modelFile))
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return undefined
}

// 当Electron完成初始化并准备好创建浏览器窗口时，将调用此方法
// 某些API只能在此事件发生后使用
app.whenReady().then(() => {
  // 尝试启动第二个实例时，聚焦已有窗口
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  // 设置IPC处理程序
  setupChatRecordIPC()

  // 为Windows设置应用程序用户模型ID
  electronApp.setAppUserModelId('com.electron')

  // 开发环境中默认通过F12打开或关闭开发者工具
  // 生产环境中忽略CommandOrControl + R快捷键
  // 参见 https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC测试
  ipcMain.on('ping', () => console.log('pong'))

  // 本地服务器IPC处理
  let localServer: LocalServer | null = null

  const createServer = (): LocalServer => new LocalServer({
    ollamaBinaryPath: resolveOllamaBinary(),
    bundledModelPath: resolveBundledModelPath(),
    ollamaRegistryMirror: process.env.MODEL_MIRROR || undefined
  })

  ipcMain.handle('server:start', async (_, port?: number) => {
    try {
      if (!localServer) {
        localServer = createServer()
      }
      const actualPort = await localServer.start(port)
      return { success: true, port: actualPort, url: localServer.getServerUrl() }
    } catch (error) {
      console.error('Failed to start server:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('server:stop', async () => {
    try {
      if (localServer) {
        await localServer.stop()
        localServer = null
      }
      return { success: true }
    } catch (error) {
      console.error('Failed to stop server:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('server:status', () => {
    return {
      running: localServer !== null,
      port: localServer?.getPort() || null,
      url: localServer?.getServerUrl() || null
    }
  })

  // 通知提醒IPC处理 — 窗口未聚焦时任务栏闪烁
  ipcMain.handle('notify:flashFrame', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isFocused()) {
      win.once('focus', () => win.flashFrame(false))
      win.flashFrame(true)
    }
    return true
  })

  // 窗口控制IPC处理
  ipcMain.handle('window:minimize', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) win.minimize()
  })
  ipcMain.handle('window:maximize', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
  })
  ipcMain.handle('window:close', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) win.close()
  })
  ipcMain.handle('window:isMaximized', () => {
    const win = BrowserWindow.getAllWindows()[0]
    return win ? win.isMaximized() : false
  })

  // 开机自启 IPC（跨平台：Windows/macOS/Linux）
  ipcMain.handle('app:getAutoStart', () => {
    return app.getLoginItemSettings().openAtLogin
  })
  ipcMain.handle('app:setAutoStart', (_, openAtLogin: boolean) => {
    app.setLoginItemSettings({ openAtLogin })
    return true
  })

  // 重启应用 IPC
  ipcMain.handle('app:restart', () => {
    app.relaunch()
    app.exit(0)
    return true
  })

  // 原生文件保存对话框
  ipcMain.handle('dialog:showSave', async (_, options) => {
    const win = BrowserWindow.getAllWindows()[0]
    const result = await dialog.showSaveDialog(win, {
      defaultPath: options?.defaultPath,
      filters: options?.filters || [{ name: 'JSON', extensions: ['json'] }],
    })
    return result.canceled ? null : result.filePath
  })

  // 原生文件夹选择对话框
  ipcMain.handle('dialog:showOpen', async () => {
    const win = BrowserWindow.getAllWindows()[0]
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    })
    return result.canceled ? null : result.filePaths[0] || null
  })

  // 在文件管理器中打开路径
  ipcMain.handle('shell:openPath', async (_, filePath: string) => {
    return await shell.openPath(filePath)
  })

  // 写入文件
  ipcMain.handle('file:write', async (_, filePath: string, data: string) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      writeFile(filePath, data, 'utf-8', (err) => {
        if (err) resolve({ success: false, error: err.message })
        else resolve({ success: true })
      })
    })
  })

  // 系统资源占用
  ipcMain.handle('system:getResources', async () => {
    const cpuUsage = process.getCPUUsage()
    const mem = process.memoryUsage()
    return {
      cpu: Math.round(cpuUsage.percentCPUUsage),
      memory: Math.round(mem.rss / 1024 / 1024),
      systemMemoryTotal: Math.round(os.totalmem() / 1024 / 1024),
      systemMemoryFree: Math.round(os.freemem() / 1024 / 1024),
    }
  })

  // Git 版本控制
  ipcMain.handle('git:loadConfig', () => loadGitConfig())
  ipcMain.handle('git:saveConfig', (_, config) => {
    saveGitConfig(config)
    return true
  })
  ipcMain.handle('git:initRepo', async (_, repoPath: string) => {
    await initRepo(repoPath)
    return true
  })

  // 写入单个实体 JSON（不提交）
  ipcMain.handle('git:writeEntity', async (_, opts: { repoPath: string; type: string; entity: any }) => {
    return writeEntityJson(opts.repoPath, opts.type, opts.entity)
  })
  // 删除单个实体 JSON
  ipcMain.handle('git:deleteEntity', async (_, opts: { repoPath: string; type: string; id: string }) => {
    return deleteEntityJson(opts.repoPath, opts.type, opts.id)
  })
  // 提交所有变更
  ipcMain.handle('git:commit', async (_, opts: { repoPath: string; message: string }) => {
    await commitWithMessage(opts.repoPath, opts.message)
    return true
  })
  // 详细状态（文件列表）
  ipcMain.handle('git:detailedStatus', async (_, repoPath: string) => {
    return getDetailedStatus(repoPath)
  })
  // 暂存/取消暂存文件
  ipcMain.handle('git:stage', async (_, opts: { repoPath: string; file: string }) => {
    await stageFile(opts.repoPath, opts.file)
    return true
  })
  ipcMain.handle('git:unstage', async (_, opts: { repoPath: string; file: string }) => {
    await unstageFile(opts.repoPath, opts.file)
    return true
  })
  ipcMain.handle('git:stageAll', async (_, repoPath: string) => {
    await stageAllFiles(repoPath)
    return true
  })
  // 读取某次提交中的文件内容
  ipcMain.handle('git:showFile', async (_, opts: { repoPath: string; hash: string; filePath: string }) => {
    return readFileAtCommit(opts.repoPath, opts.hash, opts.filePath)
  })
  // 查看某次提交中文件的变更
  ipcMain.handle('git:commitFileDiff', async (_, opts: { repoPath: string; hash: string; filePath: string }) => {
    return getCommitFileDiff(opts.repoPath, opts.hash, `data/export/${opts.filePath}`)
  })
  // 工作目录 diff（未暂存变更 / 已暂存变更）
  ipcMain.handle('git:workingTreeDiff', async (_, opts: { repoPath: string; filePath: string }) => {
    return getWorkingTreeDiff(opts.repoPath, opts.filePath)
  })
  // 提交历史
  ipcMain.handle('git:history', async (_, opts: { repoPath: string; filePath?: string }) => {
    return getHistory(opts.repoPath, opts.filePath)
  })
  // 提交包含的文件
  ipcMain.handle('git:commitFiles', async (_, opts: { repoPath: string; hash: string }) => {
    return getCommitFiles(opts.repoPath, opts.hash)
  })
  // 历史 diff
  ipcMain.handle('git:diff', async (_, opts: { repoPath: string; hash1: string; hash2: string; filePath?: string }) => {
    return getDiff(opts.repoPath, opts.hash1, opts.hash2, opts.filePath)
  })
  // 恢复文件
  ipcMain.handle('git:restore', async (_, opts: { repoPath: string; hash: string; filePath: string }) => {
    await restoreFile(opts.repoPath, opts.hash, opts.filePath)
    return true
  })
  // 概要状态
  ipcMain.handle('git:status', async (_, repoPath: string) => {
    return getStatus(repoPath)
  })

  // 自动启动服务器
  localServer = createServer()
  localServer
    .start()
    .then((port) => {
      console.log(`Local server auto-started on port ${port}`)
    })
    .catch((error) => {
      console.error('Failed to auto-start local server:', error)
      localServer = null
    })

  createWindow()

  app.on('activate', function () {
    // 在macOS上，当点击dock图标且没有其他窗口打开时
    // 通常会在应用程序中重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 所有窗口关闭时退出应用程序（macOS除外）。在macOS上
// 应用程序及其菜单栏通常会保持活动状态，直到用户使用Cmd + Q明确退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 在此文件中，您可以包含应用程序主进程的其余特定代码
// 您也可以将它们放在单独的文件中并在此处引入
