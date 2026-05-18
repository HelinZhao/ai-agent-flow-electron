import { spawn, ChildProcess } from 'child_process'
import { Embeddings } from '@langchain/core/embeddings'
import { OLLAMA_DEFAULT_HOST } from '../config'

// 常见 Ollama embedding 模型对应的向量维度
const OLLAMA_KNOWN_DIMS: Record<string, number> = {
  'bge-m3': 1024,
  'nomic-embed-text': 768,
  'bge-small': 384,
  'bge-small-zh-v1.5': 512,
  'bge-small-en-v1.5': 384,
  'all-minilm': 384,
  'mxbai-embed-large': 1024,
  'snowflake-arctic-embed': 1024,
  'llama3.1': 4096 // 部分用户用 llama 做 embedding
}

/** 获取 Ollama embedding 模型的向量维度（未知模型默认 768） */
export function getOllamaDim(model: string): number {
  for (const [key, dim] of Object.entries(OLLAMA_KNOWN_DIMS)) {
    if (model.startsWith(key) || model === key || model.startsWith(`x/${key}`)) {
      return dim
    }
  }
  return 768
}

// 全局 Ollama 进程引用
let ollamaProcess: ChildProcess | null = null
const ollamaHost = OLLAMA_DEFAULT_HOST
let ollamaBinaryPath: string | null = null
let ollamaRegistryMirror: string | null = null
let gpuInfoLogged = false
/** Ollama 启动时捕获的 stderr 日志，供 logGpuInfo() 解析 GPU 信息（Ollama < 0.5.3 时使用） */
let ollamaStartupStderr: string | null = null

/** 设置 Ollama 可执行文件路径（打包内嵌时使用） */
export function setOllamaBinaryPath(path: string | null): void {
  ollamaBinaryPath = path
}

/** 设置 Ollama 模型下载镜像源（拉取模型加速） */
export function setOllamaRegistryMirror(url: string | null): void {
  ollamaRegistryMirror = url
}

/** 检测 Ollama 是否正在运行 */
export async function isOllamaRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${ollamaHost}/api/tags`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

/** 检查 Ollama 中指定模型是否已存在 */
export async function checkOllamaModel(model: string): Promise<boolean> {
  try {
    const res = await fetch(`${ollamaHost}/api/tags`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return false
    const data = (await res.json()) as { models?: { name: string }[] }
    return data.models?.some((m) => m.name.startsWith(model)) ?? false
  } catch {
    return false
  }
}

/** 拉取 Ollama 模型（流式，逐行通过回调推送进度） */
export async function pullOllamaModelStream(
  model: string,
  onProgress?: (status: string, completed?: number, total?: number) => void
): Promise<boolean> {
  try {
    console.log(`[Ollama] 开始拉取模型 ${model}...`)
    const res = await fetch(`${ollamaHost}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model })
    })
    if (!res.ok) throw new Error(`pull failed: ${res.status}`)

    const reader = res.body?.getReader()
    if (!reader) throw new Error('no response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      // Buffer 保留最后一个不完整的行
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line)
          if (data.status && onProgress) {
            onProgress(data.status, data.completed, data.total)
          }
          if (data.status === 'success') {
            console.log(`[Ollama] 模型 ${model} 拉取完成`)
            return true
          }
        } catch {
          // 跳过解析失败的行
        }
      }
    }

    // 处理 buffer 中剩余的内容
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer)
        if (data.status === 'success') {
          console.log(`[Ollama] 模型 ${model} 拉取完成`)
          return true
        }
      } catch { /* ignore */ }
    }

    console.warn(`[Ollama] 模型拉取可能未完成`)
    return false
  } catch (error) {
    console.error(`[Ollama] 拉取模型失败:`, error)
    throw error // 让调用方处理错误
  }
}

/** 检测 Ollama 版本和 GPU 状态 */
export async function logGpuInfo(): Promise<void> {
  try {
    const binary = ollamaBinaryPath || 'ollama'

    // 版本信息
    try {
      const verRes = await fetch(`${ollamaHost}/api/version`, { signal: AbortSignal.timeout(2000) })
      if (verRes.ok) {
        const ver = (await verRes.json()) as any
        console.log(`[Ollama] 版本: ${ver.version || 'unknown'}`)
      }
    } catch {
      /* ignore */
    }

    // 通过 ollama ps 查看已加载模型的运行设备
    try {
      const { execSync } = await import('child_process')
      const psOut = execSync(`"${binary}" ps 2>&1`, { timeout: 5000, encoding: 'utf-8' }).trim()
      if (psOut) {
        // ollama ps 输出格式: NAME\tID\tSIZE\tPROCESSOR\tUNTIL
        const lines = psOut.split('\n')
        if (lines.length > 1) {
          console.log('[Ollama] 已加载模型:')
          for (const line of lines) {
            console.log(`  ${line}`)
          }
        } else {
          console.log('[Ollama] 当前无已加载模型（首次 embedding 后会自动加载）')
        }
      }
    } catch {
      /* ignore */
    }

    // 从 Ollama 启动日志中提取 GPU 信息
    if (ollamaStartupStderr) {
      const lines = ollamaStartupStderr.split('\n')
      const gpuLine = lines.find((l) => /\bmsg="inference compute"/.test(l))
      if (gpuLine) {
        const name = gpuLine.match(/\bdescription="([^"]+)"/)?.[1]
        const lib = gpuLine.match(/\blibrary=(\S+)/)?.[1]
        const compute = gpuLine.match(/\bcompute=([^\s"]+)/)?.[1]
        const driver = gpuLine.match(/\bdriver=([^\s"]+)/)?.[1]
        const total = gpuLine.match(/\btotal="([^"]+)"/)?.[1]
        const available = gpuLine.match(/\bavailable="([^"]+)"/)?.[1]
        console.log(
          `[Ollama] GPU: ${name || 'unknown'} | ${lib || ''} | compute ${compute || ''} | 驱动: ${driver || ''}`
        )
        if (total) console.log(`[Ollama] 显存: ${total}（可用 ${available || '?'}）`)
      } else {
        // fallback: 直接显示最后几行原始日志
        const summary = lines
          .filter((l) => l.trim())
          .slice(-10)
          .map((l) => l.replace(/^time=\S+\s+(level=\S+\s+)?(source=\S+\s+)?/, '').trim())
          .filter(Boolean)
        if (summary.length > 0) {
          console.log('[Ollama] 启动日志:')
          for (const line of summary) console.log(`  ${line}`)
        }
      }
    }
  } catch {
    /* ignore */
  }
}

/** 尝试启动 Ollama（仅在检测到 ollama 已安装时启动） */
export async function tryStartOllama(): Promise<boolean> {
  if (await isOllamaRunning()) return true

  return new Promise((resolve) => {
    try {
      ollamaProcess = spawn(ollamaBinaryPath || 'ollama', ['serve'], {
        stdio: ['ignore', 'ignore', 'pipe'],
        detached: false,
        env: {
          ...process.env,
          OLLAMA_VULKAN: '1',
          ...(ollamaRegistryMirror ? { OLLAMA_REGISTRY_MIRROR: ollamaRegistryMirror } : {})
        }
      })

      // 捕获 stderr 中的 GPU 检测信息
      let stderrBuf = ''
      ollamaProcess.stderr?.on('data', (chunk: Buffer) => {
        stderrBuf += chunk.toString()
        // 如果 stderr 超出 64KB，截断保留尾部
        if (stderrBuf.length > 65536) {
          stderrBuf = stderrBuf.slice(-32768)
        }
      })

      ollamaProcess.on('error', () => {
        ollamaProcess = null
        resolve(false)
      })

      // 等待就绪（最多 15 秒）
      let waited = 0
      const interval = setInterval(async () => {
        waited += 1000
        if (await isOllamaRunning()) {
          clearInterval(interval)
          console.log('[Ollama] 服务已启动')
          ollamaStartupStderr = stderrBuf
          resolve(true)
        } else if (waited >= 15000) {
          clearInterval(interval)
          console.log('[Ollama] 启动超时')
          resolve(false)
        }
      }, 1000)
    } catch {
      resolve(false)
    }
  })
}

/** 停止 Ollama 进程 */
export function stopOllama(): void {
  if (ollamaProcess) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(ollamaProcess.pid), '/f', '/t'])
      } else {
        ollamaProcess.kill('SIGTERM')
      }
    } catch {
      /* ignore */
    }
    ollamaProcess = null
  }
}

/** 拉取 Ollama 模型（等待流式响应完成） */
export async function pullOllamaModel(model: string): Promise<boolean> {
  try {
    console.log(`[Ollama] 拉取模型 ${model}...`)
    const res = await fetch(`${ollamaHost}/api/pull`, {
      method: 'POST',
      body: JSON.stringify({ name: model })
    })
    if (!res.ok) throw new Error(`pull failed: ${res.status}`)

    // 消费完整响应体，等待拉取完成（/api/pull 返回 NDJSON 流）
    const body = await res.text()
    const lines = body
      .trim()
      .split('\n')
      .map((l) => {
        try {
          return JSON.parse(l)
        } catch {
          return null
        }
      })
      .filter(Boolean)
    const lastLine = lines[lines.length - 1]
    if (lastLine?.status === 'success') {
      console.log(`[Ollama] 模型 ${model} 拉取完成`)
      return true
    }
    console.warn(`[Ollama] 模型拉取可能未完成: ${lastLine?.status || 'unknown'}`)
    return false
  } catch (error) {
    console.error(`[Ollama] 拉取模型失败:`, error)
    return false
  }
}

/**
 * 通过 ollama CLI 导入 GGUF 文件
 * 优先使用 ollama import（Ollama 0.5+ 专用 GGUF 导入命令），
 * 回退到临时 Modelfile + ollama create -f
 */
async function importGGUFViaCLI(model: string, ggufPath: string): Promise<boolean> {
  const normalizedPath = ggufPath.replace(/\\/g, '/')
  const binary = ollamaBinaryPath || 'ollama'
  const env = {
    ...process.env,
    ...(ollamaRegistryMirror ? { OLLAMA_REGISTRY_MIRROR: ollamaRegistryMirror } : {})
  }

  // 1. ollama import --model <name> <path> (Ollama 0.5+)
  const imported = await new Promise<boolean>((resolve) => {
    const proc = spawn(binary, ['import', '--model', model, normalizedPath], {
      stdio: 'ignore',
      env
    })
    proc.on('error', () => resolve(false))
    proc.on('close', (code) => resolve(code === 0))
  })
  if (imported) return true

  // 2. 回退：写临时 Modelfile + ollama create -f <Modelfile> <name>
  const { mkdtempSync } = await import('fs')
  const { writeFile, rm } = await import('fs/promises')
  const { join } = await import('path')
  const { tmpdir } = await import('os')

  const tmpDir = mkdtempSync(join(tmpdir(), 'ollama-create-'))
  const modelfilePath = join(tmpDir, 'Modelfile')
  await writeFile(modelfilePath, `FROM ${normalizedPath}\n`, 'utf-8')

  try {
    return await new Promise<boolean>((resolve) => {
      const proc = spawn(binary, ['create', '-f', modelfilePath, model], {
        stdio: 'ignore',
        env
      })
      proc.on('error', () => resolve(false))
      proc.on('close', (code) => resolve(code === 0))
    })
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => { })
  }
}

/**
 * 从 HuggingFace 镜像直接下载 GGUF 模型并导入到 Ollama
 * 当 registry pull 失败时作为备选方案
 */
export async function downloadAndImportModel(
  model: string,
  ggufRepo: string,
  ggufFile: string,
  mirror: string,
  onProgress?: (status: string, completed?: number, total?: number) => void
): Promise<boolean> {
  const { mkdirSync } = await import('fs')
  const { rm, writeFile } = await import('fs/promises')
  const { join } = await import('path')
  const { tmpdir } = await import('os')

  const tempDir = join(tmpdir(), 'ollama-import')
  mkdirSync(tempDir, { recursive: true })
  const ggufPath = join(tempDir, ggufFile)

  try {
    // 流式下载 GGUF，带进度汇报
    const url = `${mirror}/${ggufRepo}/resolve/main/${ggufFile}`
    console.log(`[Ollama] 从镜像下载 GGUF: ${url}`)
    onProgress?.('downloading', 0, 0)
    const resp = await fetch(url, { signal: AbortSignal.timeout(600_000) })
    if (!resp.ok) throw new Error(`下载失败: HTTP ${resp.status}`)

    const contentLength = resp.headers.get('content-length')
    const total = contentLength ? parseInt(contentLength, 10) : 0
    const chunks: Buffer[] = []
    let downloaded = 0

    for await (const chunk of resp.body as any) {
      chunks.push(Buffer.from(chunk))
      downloaded += chunk.length
      if (total > 0) {
        onProgress?.('downloading', downloaded, total)
      }
    }

    const buf = Buffer.concat(chunks)
    await writeFile(ggufPath, buf)
    onProgress?.('importing', 0, 0)
    console.log(`[Ollama] GGUF 下载完成 (${(buf.length / 1024 / 1024).toFixed(1)} MB)`)

    // 通过 CLI 导入
    console.log(`[Ollama] 导入模型 ${model}...`)
    const ok = await importGGUFViaCLI(model, ggufPath)
    if (ok) {
      console.log(`[Ollama] 模型 ${model} 导入成功`)
      return true
    }
    throw new Error('CLI 导入失败')
  } catch (error) {
    console.error(`[Ollama] 从镜像导入模型失败:`, error)
    return false
  } finally {
    // 清理临时文件
    try {
      await rm(tempDir, { recursive: true, force: true })
    } catch (e) {
      console.error(e)
    }
  }
}

/** 导入本地 GGUF 模型文件到 Ollama */
export async function importLocalGGUFModel(model: string, ggufPath: string): Promise<boolean> {
  const { existsSync } = await import('fs')
  if (!existsSync(ggufPath)) {
    console.error(`[Ollama] GGUF 文件不存在: ${ggufPath}`)
    return false
  }

  console.log(`[Ollama] 从本地文件导入模型 ${model}...`)
  const ok = await importGGUFViaCLI(model, ggufPath)
  if (ok) console.log(`[Ollama] 模型 ${model} 导入成功`)
  return ok
}

/** 记录已加载模型的运行设备信息（ollama ps，每个会话只执行一次） */
async function logLoadedModelInfo(): Promise<void> {
  if (gpuInfoLogged) return
  gpuInfoLogged = true
  try {
    const binary = ollamaBinaryPath || 'ollama'
    const { execSync } = await import('child_process')
    const psOut = execSync(`"${binary}" ps 2>&1`, { timeout: 5000, encoding: 'utf-8' }).trim()
    if (psOut) {
      const lines = psOut.split('\n')
      if (lines.length > 1) {
        console.log('[Ollama] 模型运行设备:')
        for (const line of lines) {
          console.log(`  ${line}`)
        }
      }
    }
  } catch {
    /* ignore */
  }
}

/** Ollama Embeddings 实现（兼容 LangChain Embeddings 接口） */
export class OllamaEmbeddingsInstance extends Embeddings {
  private model: string
  private host: string

  constructor(model: string, host?: string) {
    super({})
    this.model = model
    this.host = host || ollamaHost
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const batchSize = 64
    const results: number[][] = []
    const totalRequests = Math.ceil(texts.length / batchSize)
    console.log(`[Ollama] embedding ${texts.length} 个文本，分 ${totalRequests} 批请求`)

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const seq = i / batchSize + 1
      const start = Date.now()
      console.log(`[Ollama] 批量请求 ${seq}/${totalRequests} (${batch.length} 个文本)...`)

      const res = await fetch(`${this.host}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, input: batch }),
        // signal: AbortSignal.timeout(120000)
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Ollama 批量 embedding 失败 (${res.status}): ${body || res.statusText}`)
      }

      const data = (await res.json()) as { embeddings: number[][] }
      results.push(...data.embeddings)

      const elapsed = ((Date.now() - start) / 1000).toFixed(1)
      console.log(
        `[Ollama] 批量请求 ${seq} 完成 (${elapsed}s), 共 ${results.length}/${texts.length} 个向量`
      )
    }

    // 首次 embedding 后记录模型运行设备
    await logLoadedModelInfo()

    return results
  }

  async embedQuery(text: string): Promise<number[]> {
    const res = await fetch(`${this.host}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text }),
      signal: AbortSignal.timeout(60000)
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Ollama embedding 失败 (${res.status}): ${body || res.statusText}`)
    }

    const data = (await res.json()) as { embedding: number[] }
    return data.embedding
  }
}
