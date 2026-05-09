import { spawn, ChildProcess } from 'child_process'
import { Embeddings } from '@langchain/core/embeddings'

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
  'llama3.1': 4096, // 部分用户用 llama 做 embedding
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
let ollamaHost = 'http://127.0.0.1:11434'
let ollamaBinaryPath: string | null = null
let ollamaRegistryMirror: string | null = null

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

/** 尝试启动 Ollama（仅在检测到 ollama 已安装时启动） */
export async function tryStartOllama(): Promise<boolean> {
  if (await isOllamaRunning()) return true

  return new Promise((resolve) => {
    try {
      ollamaProcess = spawn(ollamaBinaryPath || 'ollama', ['serve'], {
        stdio: 'ignore',
        detached: false,
        env: {
          ...process.env,
          ...(ollamaRegistryMirror ? { OLLAMA_REGISTRY_MIRROR: ollamaRegistryMirror } : {})
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
    } catch { /* ignore */ }
    ollamaProcess = null
  }
}

/** 拉取 Ollama 模型（等待流式响应完成） */
export async function pullOllamaModel(model: string): Promise<boolean> {
  try {
    console.log(`[Ollama] 拉取模型 ${model}...`)
    const res = await fetch(`${ollamaHost}/api/pull`, {
      method: 'POST',
      body: JSON.stringify({ name: model }),
    })
    if (!res.ok) throw new Error(`pull failed: ${res.status}`)

    // 消费完整响应体，等待拉取完成（/api/pull 返回 NDJSON 流）
    const body = await res.text()
    const lines = body.trim().split('\n').map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
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
      stdio: 'ignore', env
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
        stdio: 'ignore', env
      })
      proc.on('error', () => resolve(false))
      proc.on('close', (code) => resolve(code === 0))
    })
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
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
  mirror: string
): Promise<boolean> {
  const { mkdirSync } = await import('fs')
  const { rm } = await import('fs/promises')
  const { join } = await import('path')
  const { tmpdir } = await import('os')

  const tempDir = join(tmpdir(), 'ollama-import')
  mkdirSync(tempDir, { recursive: true })
  const ggufPath = join(tempDir, ggufFile)

  try {
    // 下载 GGUF（用 arrayBuffer 避免 Node/web stream 类型冲突）
    const url = `${mirror}/${ggufRepo}/resolve/main/${ggufFile}`
    console.log(`[Ollama] 从镜像下载 GGUF: ${url}`)
    const resp = await fetch(url, { signal: AbortSignal.timeout(600_000) })
    if (!resp.ok) throw new Error(`下载失败: HTTP ${resp.status}`)
    const buf = Buffer.from(await resp.arrayBuffer())
    await (await import('fs/promises')).writeFile(ggufPath, buf)
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
    try { await rm(tempDir, { recursive: true, force: true }) } catch {}
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
    const results: number[][] = []
    for (const text of texts) {
      const vec = await this.embedQuery(text)
      results.push(vec)
    }
    return results
  }

  async embedQuery(text: string): Promise<number[]> {
    const res = await fetch(`${this.host}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text }),
      signal: AbortSignal.timeout(60000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Ollama embedding 失败 (${res.status}): ${body || res.statusText}`)
    }

    const data = await res.json() as { embedding: number[] }
    return data.embedding
  }
}
