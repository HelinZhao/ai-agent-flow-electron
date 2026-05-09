import { Response } from 'express'
import { LOG_MAX_ENTRIES } from '../config'

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
}

class LogStreamManager {
  private logs: LogEntry[] = []
  private clients = new Set<Response>()
  private originals: {
    log: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
    debug: (...args: any[]) => void
  }

  constructor() {
    // 保存原始 console 方法引用，避免拦截后递归
    this.originals = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console)
    }
    this.interceptConsole()
    this.captureProcessErrors()
  }

  /** 将 console 参数格式化为字符串 */
  private formatArgs(args: any[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'object') {
          if (arg instanceof Error) {
            return `${arg.message}\n${arg.stack || ''}`
          }
          try {
            return JSON.stringify(arg, null, 2)
          } catch {
            return String(arg)
          }
        }
        return String(arg)
      })
      .join(' ')
  }

  /** 拦截 console.log/warn/error/debug */
  private interceptConsole(): void {
    const self = this

    console.log = (...args: any[]) => {
      self.originals.log(...args)
      self.addEntry('info', self.formatArgs(args))
    }

    console.warn = (...args: any[]) => {
      self.originals.warn(...args)
      self.addEntry('warn', self.formatArgs(args))
    }

    console.error = (...args: any[]) => {
      self.originals.error(...args)
      self.addEntry('error', self.formatArgs(args))
    }

    console.debug = (...args: any[]) => {
      self.originals.debug(...args)
      self.addEntry('debug', self.formatArgs(args))
    }
  }

  /** 捕获进程级异常 */
  private captureProcessErrors(): void {
    process.on('uncaughtException', (error) => {
      this.addEntry('error', `未捕获异常: ${error.message}\n${error.stack || ''}`)
    })
    process.on('unhandledRejection', (reason) => {
      this.addEntry(
        'error',
        `未处理的 Promise 拒绝: ${reason instanceof Error ? `${reason.message}\n${reason.stack || ''}` : String(reason)}`
      )
    })
  }

  /** 添加一条日志到环形缓冲区并广播 */
  addEntry(level: LogEntry['level'], message: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: message.substring(0, 5000)
    }
    this.logs.push(entry)
    if (this.logs.length > LOG_MAX_ENTRIES) {
      this.logs.shift()
    }
    this.broadcast(entry)
  }

  /** 注册 SSE 客户端，发送历史日志 */
  addClient(res: Response): void {
    this.clients.add(res)
    const initData = JSON.stringify({ type: 'init', logs: this.logs })
    res.write(`data: ${initData}\n\n`)
  }

  /** 移除 SSE 客户端 */
  removeClient(res: Response): void {
    this.clients.delete(res)
  }

  /** 向所有已连接客户端广播日志条目 */
  private broadcast(entry: LogEntry): void {
    const data = `data: ${JSON.stringify({ type: 'log', ...entry })}\n\n`
    for (const client of this.clients) {
      try {
        client.write(data)
      } catch {
        this.clients.delete(client)
      }
    }
  }

  /** 获取当前缓存的全部日志（用于调试） */
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /** 清空日志缓冲区 */
  clearLogs(): void {
    this.logs = []
  }
}

/** 单例导出 */
export const logStreamManager = new LogStreamManager()
