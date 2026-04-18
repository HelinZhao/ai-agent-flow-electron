import express from 'express'
import cors from 'cors'
import { initDatabase } from './database'
import workflowsRouter from './routes/workflows'
import agentsRouter from './routes/agents'
import skillsRouter from './routes/skills'
import llmConfigRouter from './routes/llm-config'
import executeWorkflowRouter from './routes/execute-workflow'
import { app } from 'electron'

export class LocalServer {
  private app: express.Application
  private server: any = null
  private port: number = 3100

  constructor() {
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  // 中间件
  private setupMiddleware(): void {
    this.app.use(cors())
    this.app.use(express.json({ limit: '50mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }))
    this.app.use(express.static('public'))
  }

  private setupRoutes(): void {
    // 健康检查端点
    this.app.get('/api/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    // 获取服务器信息
    this.app.get('/api/info', (_req, res) => {
      res.json({
        appName: app.getName(),
        appVersion: app.getVersion(),
        platform: process.platform,
        nodeVersion: process.version,
        electronVersion: process.versions.electron
      })
    })

    // 路由
    this.app.use('/api/workflows', workflowsRouter)
    this.app.use('/api/agents', agentsRouter)
    this.app.use('/api/skills', skillsRouter)
    this.app.use('/api/llm-config', llmConfigRouter)
    this.app.use('/api/execute-workflow', executeWorkflowRouter)

    // 健康检查端点
    this.app.get('/health', (_req, res) => {
      res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() })
    })

    // 根路径
    this.app.get('/', (_req, res) => {
      res.status(200).json({
        message: 'AI Agent Flow Designer API Server',
        version: '1.0.0',
        endpoints: {
          workflows: '/api/workflows',
          agents: '/api/agents',
          skills: '/api/skills',
          llmConfig: '/api/llm-config',
          executeWorkflow: '/api/execute-workflow',
          health: '/health'
        }
      })
    })

    // 错误处理中间件
    this.app.use((err: any, _req: express.Request, res: express.Response) => {
      console.error('Unhandled error:', err)
      res.status(500).json({ error: 'Internal server error' })
    })

    // 404处理
    this.app.use((_req, res) => {
      res.status(404).json({ error: 'Route not found' })
    })
  }

  public async start(port?: number): Promise<number> {
    await initDatabase()
    return new Promise((resolve, reject) => {
      if (port) {
        this.port = port
      }
      this.server = this.app.listen(this.port, () => {
        console.log(`Local server started on port ${this.port}`)
        console.log(`🚀 AI Agent Flow Designer API Server is running on port ${this.port}`)
        console.log(`📋 API Documentation available at http://localhost:${this.port}`)
        console.log(`🏥 Health check at http://localhost:${this.port}/health`)
        resolve(this.port)
      })

      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          // 如果端口被占用，尝试下一个端口
          this.port += 1
          this.start().then(resolve).catch(reject)
        } else {
          reject(error)
        }
      })
    })
  }

  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err: any) => {
          if (err) {
            reject(err)
          } else {
            console.log('Local server stopped')
            this.server = null
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
  }

  public getPort(): number {
    return this.port
  }

  public getServerUrl(): string {
    return `http://localhost:${this.port}`
  }
}
