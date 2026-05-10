import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs/promises'
import { initDatabase } from './database'
import workflowsRouter from './routes/workflows'
import agentsRouter from './routes/agents'
import skillsRouter from './routes/skills'
import llmConfigRouter from './routes/llm-config'
import knowledgeBaseRouter from './routes/knowledge-base'
import dataRouter from './routes/data'
import executeWorkflowRouter from './routes/execute-workflow'
import logsRouter from './routes/logs'
import { getResourcesDir } from './utils'
import {
  SERVER_PORT,
  BODY_SIZE_LIMIT,
  ATTACHMENT_DIR,
  ATTACHMENT_CONTENT_TYPES,
  API_VERSION,
  API_DISPLAY_NAME,
  OLLAMA_DEFAULT_MODEL
} from './config'
import {
  isOllamaRunning,
  tryStartOllama,
  pullOllamaModel,
  stopOllama,
  setOllamaBinaryPath,
  setOllamaRegistryMirror,
  downloadAndImportModel,
  importLocalGGUFModel,
  logGpuInfo
} from './utils/ollama'
import { app } from 'electron'

export class LocalServer {
  private app: express.Application
  private server: any = null
  private port: number = SERVER_PORT
  private ollamaBinaryPath: string | null = null
  private ollamaRegistryMirror: string | null = null
  private bundledModelPath: string | null = null

  constructor(options?: {
    ollamaBinaryPath?: string
    ollamaRegistryMirror?: string
    bundledModelPath?: string
  }) {
    this.app = express()
    this.ollamaBinaryPath = options?.ollamaBinaryPath || null
    this.ollamaRegistryMirror = options?.ollamaRegistryMirror || null
    this.bundledModelPath = options?.bundledModelPath || null
    this.setupMiddleware()
    this.setupRoutes()
  }

  // 中间件
  private setupMiddleware(): void {
    this.app.use(cors())
    this.app.use(express.json({ limit: BODY_SIZE_LIMIT }))
    this.app.use(express.urlencoded({ extended: true, limit: BODY_SIZE_LIMIT }))
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
    this.app.use('/api/knowledge-base', knowledgeBaseRouter)
    this.app.use('/api/data', dataRouter)
    this.app.use('/api/execute-workflow', executeWorkflowRouter)
    this.app.use('/api/logs', logsRouter)

    // 附件文件服务：/api/attachments/:id/:filename
    this.app.get('/api/attachments/:id/:filename', async (req, res) => {
      const { id, filename } = req.params
      const filePath = path.resolve(getResourcesDir(ATTACHMENT_DIR), `${id}-${filename}`)

      try {
        const data = await fs.readFile(filePath)
        const ext = path.extname(filename).toLowerCase()
        res.setHeader('Content-Type', ATTACHMENT_CONTENT_TYPES[ext] || 'application/octet-stream')
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
        res.end(data)
      } catch {
        res.status(404).json({ error: '附件文件不存在' })
      }
    })

    // 健康检查端点
    this.app.get('/health', (_req, res) => {
      res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() })
    })

    // 根路径
    this.app.get('/', (_req, res) => {
      res.status(200).json({
        message: API_DISPLAY_NAME,
        version: API_VERSION,
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

    // 错误处理中间件（Express 5 要求 4 个参数才能被识别为错误处理器）
    this.app.use((err: any, _req: express.Request, res: express.Response) => {
      console.error('Unhandled error:', err)
      res.status(500).json({ error: 'Internal server error' })
    })

    // 404处理
    this.app.use((_req, res) => {
      res.status(404).json({ error: 'Route not found' })
    })
  }

  /** 检查 Ollama 中指定模型是否已存在 */
  private async checkOllamaModel(model: string): Promise<boolean> {
    try {
      const res = await fetch('http://127.0.0.1:11434/api/tags', {
        signal: AbortSignal.timeout(5000)
      })
      if (!res.ok) return false
      const data = (await res.json()) as { models?: { name: string }[] }
      return data.models?.some((m: { name: string }) => m.name.startsWith(model)) ?? false
    } catch {
      return false
    }
  }

  private async initOllama(): Promise<void> {
    try {
      // 设置内嵌的 ollama 可执行文件路径（如有）
      setOllamaBinaryPath(this.ollamaBinaryPath)
      // 设置模型下载镜像源（国内加速）
      setOllamaRegistryMirror(this.ollamaRegistryMirror || 'https://ollama.modelscope.cn')

      if (await isOllamaRunning()) {
        console.log('[Ollama] 服务已就绪')
        await logGpuInfo()
        return
      }

      console.log('[Ollama] 尝试启动服务...')
      const started = await tryStartOllama()
      if (!started) {
        console.warn('[Ollama] 未能自动启动，请确保已安装 Ollama: https://ollama.com')
        return
      }

      // 检查 bge-m3 模型是否存在
      let hasModel = await this.checkOllamaModel(OLLAMA_DEFAULT_MODEL)
      if (!hasModel) {
        // 1. 优先导入打包的本地模型（最快）
        if (this.bundledModelPath) {
          console.log('[Ollama] 尝试导入打包的模型...')
          hasModel = await importLocalGGUFModel(OLLAMA_DEFAULT_MODEL, this.bundledModelPath)
          if (hasModel) {
            for (let i = 0; i < 10; i++) {
              if (await this.checkOllamaModel(OLLAMA_DEFAULT_MODEL)) break
              await new Promise((r) => setTimeout(r, 1000))
            }
          }
        }
        // 2. 打包模型不存在或导入失败，尝试 registry 拉取
        if (!hasModel) {
          console.log(`[Ollama] 尝试在线拉取 ${OLLAMA_DEFAULT_MODEL}...`)
          const pulled = await pullOllamaModel(OLLAMA_DEFAULT_MODEL)
          if (pulled) {
            for (let i = 0; i < 10; i++) {
              hasModel = await this.checkOllamaModel(OLLAMA_DEFAULT_MODEL)
              if (hasModel) break
              await new Promise((r) => setTimeout(r, 1000))
            }
          }
        }
        // 3. 最后尝试从 HF 镜像下载 GGUF 导入
        if (!hasModel) {
          console.log('[Ollama] 尝试从 HuggingFace 镜像下载...')
          hasModel = await downloadAndImportModel(
            OLLAMA_DEFAULT_MODEL,
            'gpustack/bge-m3-GGUF',
            'bge-m3-Q4_K_M.gguf',
            'https://hf-mirror.com'
          )
        }
        if (!hasModel) {
          console.warn(
            `[Ollama] 模型 ${OLLAMA_DEFAULT_MODEL} 下载失败，请手动执行: ollama pull bge-m3`
          )
        }
      }

      // 记录 GPU 信息
      await logGpuInfo()
    } catch (error) {
      console.warn('[Ollama] 初始化异常:', error)
    }
  }

  public async start(port?: number): Promise<number> {
    await initDatabase()

    // 初始化 Ollama 服务（知识库 embedding 依赖）
    await this.initOllama()

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
    // 清理 Ollama 进程
    stopOllama()

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
