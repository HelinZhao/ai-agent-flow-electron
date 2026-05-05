import Database from 'better-sqlite3'
import { getLoadablePath } from 'sqlite-vec'
import fs from 'fs/promises'
import path from 'path'
import { Embeddings } from '@langchain/core/embeddings'
import { OpenAIEmbeddings } from '@langchain/openai'
import { getDataDir } from './file'
import { KnowledgeBaseModel, KnowledgeChunkModel } from '../models'
import { LLMConfigModel } from '../models'
import { getLLMEndpoint } from './llm'

// 提供商 → embedding 模型 → 向量维度 的映射
const PROVIDER_EMBEDDING: Record<string, { model: string; dims: number }> = {
  openai: { model: 'text-embedding-3-small', dims: 1536 },
  anthropic: { model: 'text-embedding-3-small', dims: 1536 },
  azure: { model: 'text-embedding-3-small', dims: 1536 },
  bailian: { model: 'text-embedding-v3', dims: 1024 },
  longcat: { model: 'text-embedding-3-small', dims: 1536 },
}

// 根据活跃 LLM 配置获取 embedding 信息
async function getActiveEmbeddingConfig(): Promise<{ model: string; dims: number; apiKey: string; baseURL: string }> {
  const activeConfig = await LLMConfigModel.findOne({ where: { isActive: true } })
  if (!activeConfig) throw new Error('未找到活跃的LLM配置')

  const config = PROVIDER_EMBEDDING[activeConfig.provider] || PROVIDER_EMBEDDING.openai
  console.log(`[Knowledge] 活跃提供商: ${activeConfig.provider}, embedding模型: ${config.model}, 维度: ${config.dims}`)

  return {
    model: config.model,
    dims: config.dims,
    apiKey: activeConfig.apiKey,
    baseURL: getLLMEndpoint(activeConfig),
  }
}

// 构建 Embeddings 实例（自动根据活跃提供商选择模型）
async function getEmbeddingsInstance(): Promise<{ embeddings: Embeddings; dims: number }> {
  const config = await getActiveEmbeddingConfig()

  const embeddings = new OpenAIEmbeddings({
    model: config.model,
    apiKey: config.apiKey,
    configuration: {
      baseURL: config.baseURL,
    }
  })

  return { embeddings, dims: config.dims }
}

// sqlite-vec 数据库实例
const dbPath = getDataDir('/knowledge.sqlite')
let vecDb: Database.Database | null = null

async function getVecDb(): Promise<Database.Database> {
  if (vecDb) return vecDb
  vecDb = new Database(dbPath)
  vecDb.loadExtension(getLoadablePath())
  return vecDb
}

// 创建向量虚拟表（仅用于摄取时创建，检索时不重建）
async function createVecTable(dims: number): Promise<void> {
  const db = await getVecDb()
  const existing = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vec_chunks'").get() as any
  if (existing) {
    try {
      const info = db.prepare("SELECT * FROM vec_chunks_info").get() as any
      if (info && info.dimension !== dims) {
        console.log(`[Knowledge] 维度变化 ${info.dimension} → ${dims}, 重建 vec_chunks 表`)
        db.exec('DROP TABLE vec_chunks')
        db.exec(`CREATE VIRTUAL TABLE vec_chunks USING vec0(chunk_id text PRIMARY KEY, embedding float[${dims}])`)
      }
    } catch {
      // vec_chunks_info 不存在，表可能损坏，重建
      console.log(`[Knowledge] vec_chunks_info 不可用，重建表`)
      db.exec('DROP TABLE IF EXISTS vec_chunks')
      db.exec(`CREATE VIRTUAL TABLE vec_chunks USING vec0(chunk_id text PRIMARY KEY, embedding float[${dims}])`)
    }
  } else {
    console.log(`[Knowledge] 创建 vec_chunks 表，维度: ${dims}`)
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(chunk_id text PRIMARY KEY, embedding float[${dims}])`)
  }
}

// 仅确保 vec 表存在（用于检索，不会重建表）
async function ensureVecTableExists(): Promise<void> {
  const db = await getVecDb()
  const existing = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vec_chunks'").get() as any
  if (!existing) {
    // 表不存在时才创建（用默认维度）
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(chunk_id text PRIMARY KEY, embedding float[1024])`)
  }
}

// 文档分块
function chunkText(text: string, chunkSize: number, chunkOverlap: number): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    start += chunkSize - chunkOverlap
    if (start >= text.length) break
    if (end === text.length) break
  }
  return chunks
}

// 读取文件内容
async function readFileContent(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.txt' || ext === '.md') {
    return await fs.readFile(filePath, 'utf-8')
  }
  throw new Error(`暂不支持 ${ext} 格式的文件，仅支持 txt/md`)
}

// 处理上传文档：分块 → embedding → 存储
export async function ingestDocument(
  knowledgeBaseId: string,
  filePath: string,
  fileName: string
): Promise<number> {
  const kb = await KnowledgeBaseModel.findByPk(knowledgeBaseId)
  if (!kb) throw new Error('知识库不存在')

  const content = await readFileContent(filePath)
  const chunks = chunkText(content, kb.chunkSize, kb.chunkOverlap)
  console.log(`[Knowledge] 文件 ${fileName} 分成 ${chunks.length} 个块，大小=${kb.chunkSize}，重叠=${kb.chunkOverlap}`)

  const { embeddings, dims } = await getEmbeddingsInstance()

  const db = await getVecDb()
  await createVecTable(dims)

  const chunkRecords: KnowledgeChunkModel[] = []
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const chunkRecord = await KnowledgeChunkModel.create({
      knowledgeBaseId,
      content: chunk,
      source: fileName,
      chunkIndex: i
    })
    chunkRecords.push(chunkRecord)
  }

  // 批量 embedding
  console.log(`[Knowledge] 开始生成 embedding 向量...`)
  const vectors = await embeddings.embedDocuments(chunks)
  console.log(`[Knowledge] embedding 完成，向量维度: ${vectors[0]?.length}，预期维度: ${dims}`)

  // 写入 sqlite-vec 虚拟表
  const insertStmt = db.prepare('INSERT INTO vec_chunks(chunk_id, embedding) VALUES (?, ?)')
  for (let i = 0; i < chunkRecords.length; i++) {
    const vectorBuffer = Buffer.from(new Float32Array(vectors[i]).buffer)
    insertStmt.run(chunkRecords[i].id, vectorBuffer)
  }
  console.log(`[Knowledge] ${chunkRecords.length} 条向量已写入 sqlite-vec`)

  return chunks.length
}

// 检索：query → embedding → 向量搜索 → 返回 top-K 上下文
export async function retrieveContext(
  knowledgeBaseId: string,
  query: string
): Promise<string> {
  const kb = await KnowledgeBaseModel.findByPk(knowledgeBaseId)
  if (!kb) throw new Error('知识库不存在')

  if (kb.type === 'external') {
    return await retrieveExternal(kb, query)
  }

  // 检查是否有分块数据
  const totalChunks = await KnowledgeChunkModel.count({ where: { knowledgeBaseId } })
  if (totalChunks === 0) {
    console.log(`[Knowledge] 知识库 ${kb.name} 无分块数据，跳过检索`)
    return ''
  }

  const { embeddings, dims } = await getEmbeddingsInstance()
  const queryVector = await embeddings.embedQuery(query)

  const db = await getVecDb()
  await ensureVecTableExists()

  const vecCount = db.prepare("SELECT count(*) as cnt FROM vec_chunks").get() as any
  console.log(`[Knowledge] vec_chunks 总向量数: ${vecCount?.cnt || 0}, 知识库分块数: ${totalChunks}, 查询维度: ${dims}`)

  const queryBuffer = Buffer.from(new Float32Array(queryVector).buffer)
  const rows = db.prepare(`
    SELECT chunk_id, distance
    FROM vec_chunks
    WHERE embedding MATCH ?
    ORDER BY distance ASC
    LIMIT ?
  `).all(queryBuffer, kb.topK) as { chunk_id: string; distance: number }[]

  console.log(`[Knowledge] 向量搜索返回 ${rows.length} 条结果, topK=${kb.topK}`)
  if (rows.length === 0) return ''

  const chunkIds = rows.map(r => r.chunk_id)
  const chunks = await KnowledgeChunkModel.findAll({
    where: {
      id: chunkIds,
      knowledgeBaseId
    }
  })

  const sortedChunks = rows.map(r => {
    const chunk = chunks.find(c => c.id === r.chunk_id)
    return chunk ? `[来源: ${chunk.source}]\n${chunk.content}` : ''
  }).filter(Boolean)

  return sortedChunks.join('\n\n---\n\n')
}

// 外部知识库检索：调用外部 API
async function retrieveExternal(kb: KnowledgeBaseModel, query: string): Promise<string> {
  const response = await fetch(kb.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(kb.apiKey ? { Authorization: `Bearer ${kb.apiKey}` } : {})
    },
    body: JSON.stringify({ query, topK: kb.topK }),
    signal: AbortSignal.timeout(30000)
  })

  if (!response.ok) {
    throw new Error(`外部知识库检索失败: ${response.status}`)
  }

  const data = await response.json()
  if (Array.isArray(data.results)) {
    return data.results.map((r: any) => r.content || r.text || String(r)).join('\n\n---\n\n')
  }
  if (Array.isArray(data.documents)) {
    return data.documents.map((d: any) => d.content || d.text || String(d)).join('\n\n---\n\n')
  }
  if (typeof data.context === 'string') return data.context
  return JSON.stringify(data)
}

// 删除文档的所有分块及其向量
export async function deleteDocumentChunks(knowledgeBaseId: string, source: string): Promise<void> {
  const chunks = await KnowledgeChunkModel.findAll({
    where: { knowledgeBaseId, source }
  })
  const chunkIds = chunks.map(c => c.id)

  const db = await getVecDb()
  await ensureVecTableExists()
  const deleteStmt = db.prepare('DELETE FROM vec_chunks WHERE chunk_id = ?')
  for (const id of chunkIds) {
    deleteStmt.run(id)
  }

  await KnowledgeChunkModel.destroy({
    where: { knowledgeBaseId, source }
  })
}

// 删除知识库的所有分块及其向量
export async function deleteAllChunks(knowledgeBaseId: string): Promise<void> {
  const chunks = await KnowledgeChunkModel.findAll({
    where: { knowledgeBaseId }
  })
  const chunkIds = chunks.map(c => c.id)

  const db = await getVecDb()
  await ensureVecTableExists()
  const deleteStmt = db.prepare('DELETE FROM vec_chunks WHERE chunk_id = ?')
  for (const id of chunkIds) {
    deleteStmt.run(id)
  }

  await KnowledgeChunkModel.destroy({
    where: { knowledgeBaseId }
  })
}

// 获取知识库的文档统计
export async function getDocumentStats(knowledgeBaseId: string): Promise<{ documents: string[]; totalChunks: number }> {
  const chunks = await KnowledgeChunkModel.findAll({
    where: { knowledgeBaseId },
    attributes: ['source']
  })
  const documents = [...new Set(chunks.map(c => c.source))]
  return { documents, totalChunks: chunks.length }
}