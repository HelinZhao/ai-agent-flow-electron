import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { LocalServer } from '../server/src'
import { setupChatHistoryIPC } from './ipc/chatHistory'

function createWindow(): void {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800, // 最小宽度
    minHeight: 600, // 最小高度
    show: false,
    autoHideMenuBar: true,
    resizable: true, // 允许用户调整窗口大小
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      webSecurity: false // 允许加载本地资源和字体
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

// 当Electron完成初始化并准备好创建浏览器窗口时，将调用此方法
// 某些API只能在此事件发生后使用
app.whenReady().then(() => {
  // 设置IPC处理程序
  setupChatHistoryIPC()

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

  ipcMain.handle('server:start', async (_, port?: number) => {
    try {
      if (!localServer) {
        localServer = new LocalServer()
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

  // 自动启动服务器
  const server = new LocalServer()
  server
    .start()
    .then((port) => {
      console.log(`Local server auto-started on port ${port}`)
      localServer = server
    })
    .catch((error) => {
      console.error('Failed to auto-start local server:', error)
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
