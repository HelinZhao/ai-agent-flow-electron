import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs/promises'
import { EventEmitter } from 'events'
import { initDatabase } from './database'
import workflowsRouter from './routes/workflows'
import agentsRouter from './routes/agents'
import skillsRouter from './routes/skills'
import llmConfigRouter from './routes/llm-config'
import knowledgeBaseRouter from './routes/knowledge-base'
import dataRouter from './routes/data'
import executeWorkflowRouter from './routes/execute-workflow'
import triggersRouter, { webhookRouter } from './routes/triggers'
import logsRouter from './routes/logs'
import proxyRouter from './routes/proxy'
import mcpServersRouter from './routes/mcp-servers'
import { mcpConnectionManager } from './mcp'
import { getUserDataDir, migrateOldDataDir } from './utils'
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
  stopOllama,
  setOllamaBinaryPath,
  setOllamaRegistryMirror,
  checkOllamaModel,
  importLocalGGUFModel,
  downloadAndImportModel,
  logGpuInfo
} from './utils/ollama'
import { timingWheel, cronToNextTime } from './utils/timingWheel'
import { changeNotifier } from './utils/dataChangeNotifier'
import { TriggerModel, AgentModel, AgentAttributes } from './models'
import { app } from 'electron'

export class LocalServer {
  private app: express.Application
  private server: any = null
  private port: number = SERVER_PORT
  private ollamaBinaryPath: string | null = null
  private ollamaRegistryMirror: string | null = null
  private bundledModelPath: string | null = null
  private modelExists = false
  private isPulling = false
  private pullEmitter = new EventEmitter()
  private mcpManager = mcpConnectionManager

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
    this.app.use('/api/triggers', triggersRouter)
    this.app.use('/webhook', webhookRouter)
    this.app.use('/api/logs', logsRouter)
    this.app.use('/api', proxyRouter)
    this.app.use('/api/mcp-servers', mcpServersRouter)

    // Ollama 模型状态与拉取路由
    this.app.get('/api/ollama/status', async (_req, res) => {
      const running = await isOllamaRunning().catch(() => false)
      res.json({
        ollamaRunning: running,
        modelExists: running ? this.modelExists : false,
        pulling: this.isPulling
      })
    })

    this.app.post('/api/ollama/pull', (_req, res) => {
      if (this.isPulling) {
        res.json({ success: false, message: '正在拉取中，请勿重复操作' })
        return
      }
      this.isPulling = true

      // 后台从镜像下载 GGUF 并导入（不阻塞响应）
      downloadAndImportModel(
        OLLAMA_DEFAULT_MODEL,
        'OllmOne/bge-m3-GGUF',
        'bge-m3-q8_0.gguf',
        process.env.MODEL_MIRROR || 'https://www.modelscope.cn',
        (status, completed, total) => {
          this.pullEmitter.emit('progress', { status, completed, total })
        }
      )
        .then((success) => {
          this.isPulling = false
          this.modelExists = success
          this.pullEmitter.emit('progress', {
            status: success ? 'success' : 'error',
            message: success ? '模型下载并导入完成' : '模型下载或导入失败'
          })
        })
        .catch((error) => {
          this.isPulling = false
          this.pullEmitter.emit('progress', {
            status: 'error',
            message: error?.message || '模型下载出错'
          })
        })

      res.json({ success: true })
    })

    this.app.get('/api/ollama/pull-progress', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      })

      const onProgress = (data: any): void => {
        res.write(`data: ${JSON.stringify(data)}\n\n`)
        if (data.status === 'success' || data.status === 'error') {
          res.end()
        }
      }

      this.pullEmitter.on('progress', onProgress)

      req.on('close', () => {
        this.pullEmitter.off('progress', onProgress)
      })
    })

    // 数据变更 SSE 事件流：前端通过此端点实时获知数据变更
    this.app.get('/api/events', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      })

      const onChange = (resource: string): void => {
        res.write(`data: ${JSON.stringify({ resource })}\n\n`)
      }

      changeNotifier.on('change', onChange)

      req.on('close', () => {
        changeNotifier.off('change', onChange)
      })
    })

    // 附件文件服务：/api/attachments/:id/:filename
    this.app.get('/api/attachments/:id/:filename', async (req, res) => {
      const { id, filename } = req.params
      const filePath = path.resolve(getUserDataDir(ATTACHMENT_DIR), `${id}-${filename}`)

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

  /** 初始化 Ollama 服务：启动进程 + 检查模型（不阻塞拉取） */
  private async initOllama(): Promise<void> {
    try {
      // 设置内嵌的 ollama 可执行文件路径（如有）
      setOllamaBinaryPath(this.ollamaBinaryPath)
      // 设置模型下载镜像源（国内加速）
      setOllamaRegistryMirror(this.ollamaRegistryMirror || 'https://ollama.modelscope.cn')

      if (await isOllamaRunning()) {
        console.log('[Ollama] 服务已就绪')
      } else {
        console.log('[Ollama] 尝试启动服务...')
        const started = await tryStartOllama()
        if (!started) {
          console.warn('[Ollama] 未能自动启动，请确保已安装 Ollama: https://ollama.com')
          return
        }
      }

      // 检查 bge-m3 模型是否存在
      this.modelExists = await checkOllamaModel(OLLAMA_DEFAULT_MODEL)
      if (this.modelExists) {
        console.log(`[Ollama] 模型 ${OLLAMA_DEFAULT_MODEL} 已就绪`)
      } else {
        // 有打包的本地模型文件时直接导入（快速，不需要下载）
        if (this.bundledModelPath) {
          console.log('[Ollama] 尝试导入打包的本地模型...')
          const imported = await importLocalGGUFModel(OLLAMA_DEFAULT_MODEL, this.bundledModelPath)
          if (imported) {
            for (let i = 0; i < 10; i++) {
              if (await checkOllamaModel(OLLAMA_DEFAULT_MODEL)) break
              await new Promise((r) => setTimeout(r, 1000))
            }
          }
          this.modelExists = await checkOllamaModel(OLLAMA_DEFAULT_MODEL)
        }
        if (!this.modelExists) {
          console.log(`[Ollama] 模型 ${OLLAMA_DEFAULT_MODEL} 未安装，等待用户在线下载`)
        }
      }

      // 记录 GPU 信息
      await logGpuInfo()
    } catch (error) {
      console.warn('[Ollama] 初始化异常:', error)
    }
  }

  public async start(port?: number): Promise<number> {
    await migrateOldDataDir()
    await initDatabase()

    // 种子系统助手 Agent（不存在则创建）
    const SYSTEM_AGENT_ID = '00000000-0000-0000-0000-000000000001'
    const existingSystemAgent = await AgentModel.findByPk(SYSTEM_AGENT_ID)
    if (!existingSystemAgent) {
      const agent = AgentModel.build({
        id: SYSTEM_AGENT_ID,
        name: '布丁',
        description: 'Agent Flow 内置 AI 助手，帮助你了解和使用本应用',
        instructions: `你是布丁（Buding），Agent Flow 的内置 AI 助手。

你的职责是帮助用户了解和使用 Agent Flow 这个 AI 工作流编排平台。

你可以回答以下方面的问题：
1. 工作流创建和编辑（节点类型、连线、布局）
2. Agent 配置（标准 Agent 和工作流 Agent 的区别）
3. 技能管理（创建和绑定技能）
4. 知识库使用（内部/外部知识库、RAG 检索）
5. 触发器设置（Cron 定时触发和 Webhook）
6. LLM 配置（支持哪些提供商、如何切换）
7. 工具调用和人工审批（HITL）
8. 应用常见问题排查

回答要求：
- 使用中文，简洁明了
- 如果问题超出你的知识范围，诚实地告诉用户你不确定
- 对于操作类问题，给出清晰的步骤指引
- 保持友好和耐心的语气`,
        type: 'standard',
        isSystem: true,
        enabledTools: JSON.stringify([
          'readFile', 'writeFile', 'listDirectory', 'executeCommand',
          'httpRequest', 'webSearch',
          'workflowsApi', 'agentsSkillsApi', 'knowledgeApi', 'configApi',
          'readSkill',
        ]),
      } as AgentAttributes)
      await agent.save()
      console.log('[SystemAgent] 布丁创建成功')
    }

    // 加载所有启用的 cron 触发器并注册到时间轮
    const enabledCronTriggers = await TriggerModel.findAll({
      where: { type: 'cron', enabled: true }
    })
    for (const trigger of enabledCronTriggers) {
      if (trigger.cronExpression) {
        const nextTime = cronToNextTime(trigger.cronExpression)
        if (nextTime > 0) {
          timingWheel.schedule(trigger.id, nextTime)
          await trigger.update({ nextRunAt: new Date(nextTime) })
        }
      }
    }
    timingWheel.start()
    console.log(`[TriggerScheduler] 已加载 ${enabledCronTriggers.length} 个定时触发器`)

    // 初始化 Ollama 服务（知识库 embedding 依赖）
    await this.initOllama()

    // 初始化 MCP 连接（后台异步，不阻塞服务启动）
    this.mcpManager.initialize()

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

  public async stop(): Promise<void> {
    // 停止时间轮
    timingWheel.stop()

    // 清理 Ollama 进程
    stopOllama()

    // 关闭 MCP 连接
    await this.mcpManager.shutdown()

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
