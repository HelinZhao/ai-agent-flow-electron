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
import { PROVIDER_EMBEDDING_MODEL, PROVIDER_EMBEDDING_DIMS, KB_DB_FILENAME, VEC_TABLE_NAME, DEFAULT_VECTOR_DIMS, EXTERNAL_KB_TIMEOUT, EXTERNAL_KB_PROVIDERS } from '../config'

// 根据活跃 LLM 配置获取 embedding 信息
async function getActiveEmbeddingConfig(): Promise<{ model: string; dims: number; apiKey: string; baseURL: string }> {
  const activeConfig = await LLMConfigModel.findOne({ where: { isActive: true } })
  if (!activeConfig) throw new Error('未找到活跃的LLM配置')

  const modelName = PROVIDER_EMBEDDING_MODEL[activeConfig.provider] || PROVIDER_EMBEDDING_MODEL.openai
  const dims = PROVIDER_EMBEDDING_DIMS[activeConfig.provider] || PROVIDER_EMBEDDING_DIMS.openai
  console.log(`[Knowledge] 活跃提供商: ${activeConfig.provider}, embedding模型: ${modelName}, 维度: ${dims}`)

  return {
    model: modelName,
    dims,
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
const dbPath = getDataDir(KB_DB_FILENAME)
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
  const existing = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${VEC_TABLE_NAME}'`).get() as any
  if (existing) {
    try {
      const info = db.prepare(`SELECT * FROM ${VEC_TABLE_NAME}_info`).get() as any
      if (info && info.dimension !== dims) {
        console.log(`[Knowledge] 维度变化 ${info.dimension} → ${dims}, 重建 ${VEC_TABLE_NAME} 表`)
        db.exec(`DROP TABLE ${VEC_TABLE_NAME}`)
        db.exec(`CREATE VIRTUAL TABLE ${VEC_TABLE_NAME} USING vec0(chunk_id text PRIMARY KEY, embedding float[${dims}])`)
      }
    } catch {
      console.log(`[Knowledge] ${VEC_TABLE_NAME}_info 不可用，重建表`)
      db.exec(`DROP TABLE IF EXISTS ${VEC_TABLE_NAME}`)
      db.exec(`CREATE VIRTUAL TABLE ${VEC_TABLE_NAME} USING vec0(chunk_id text PRIMARY KEY, embedding float[${dims}])`)
    }
  } else {
    console.log(`[Knowledge] 创建 ${VEC_TABLE_NAME} 表，维度: ${dims}`)
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS ${VEC_TABLE_NAME} USING vec0(chunk_id text PRIMARY KEY, embedding float[${dims}])`)
  }
}

// 仅确保 vec 表存在（用于检索，不会重建表）
async function ensureVecTableExists(): Promise<void> {
  const db = await getVecDb()
  const existing = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${VEC_TABLE_NAME}'`).get() as any
  if (!existing) {
    // 表不存在时才创建（用默认维度）
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS ${VEC_TABLE_NAME} USING vec0(chunk_id text PRIMARY KEY, embedding float[${DEFAULT_VECTOR_DIMS}])`)
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
      chunkIndex: i,
      enabled: true
    })
    chunkRecords.push(chunkRecord)
  }

  // 批量 embedding
  console.log(`[Knowledge] 开始生成 embedding 向量...`)
  const vectors = await embeddings.embedDocuments(chunks)
  console.log(`[Knowledge] embedding 完成，向量维度: ${vectors[0]?.length}，预期维度: ${dims}`)

  // 写入 sqlite-vec 虚拟表
  const insertStmt = db.prepare(`INSERT INTO ${VEC_TABLE_NAME}(chunk_id, embedding) VALUES (?, ?)`)
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

  const vecCount = db.prepare(`SELECT count(*) as cnt FROM ${VEC_TABLE_NAME}`).get() as any
  console.log(`[Knowledge] ${VEC_TABLE_NAME} 总向量数: ${vecCount?.cnt || 0}, 知识库分块数: ${totalChunks}, 查询维度: ${dims}`)

  const queryBuffer = Buffer.from(new Float32Array(queryVector).buffer)
  const rows = db.prepare(`
    SELECT chunk_id, distance
    FROM ${VEC_TABLE_NAME}
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
      knowledgeBaseId,
      enabled: true
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
  const providerName = kb.provider || 'generic'
  const adapter = EXTERNAL_KB_PROVIDERS[providerName] || EXTERNAL_KB_PROVIDERS.generic

  const response = await fetch(kb.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(kb.apiKey ? { Authorization: `Bearer ${kb.apiKey}` } : {})
    },
    body: JSON.stringify(adapter.buildBody(query, kb.topK)),
    signal: AbortSignal.timeout(EXTERNAL_KB_TIMEOUT)
  })

  if (!response.ok) {
    throw new Error(`外部知识库检索失败: ${response.status}`)
  }

  const data = await response.json()
  return adapter.parseResponse(data)
}

// 删除文档的所有分块及其向量
export async function deleteDocumentChunks(knowledgeBaseId: string, source: string): Promise<void> {
  const chunks = await KnowledgeChunkModel.findAll({
    where: { knowledgeBaseId, source }
  })
  const chunkIds = chunks.map(c => c.id)

  const db = await getVecDb()
  await ensureVecTableExists()
  const deleteStmt = db.prepare(`DELETE FROM ${VEC_TABLE_NAME} WHERE chunk_id = ?`)
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
  const deleteStmt = db.prepare(`DELETE FROM ${VEC_TABLE_NAME} WHERE chunk_id = ?`)
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

// 获取指定文档的所有分块
export async function getChunksByDocument(knowledgeBaseId: string, docName: string): Promise<KnowledgeChunkModel[]> {
  return KnowledgeChunkModel.findAll({
    where: { knowledgeBaseId, source: docName },
    order: [['chunkIndex', 'ASC']]
  })
}

// 新增单个分块（手动添加）
export async function addChunk(knowledgeBaseId: string, docName: string, content: string): Promise<KnowledgeChunkModel> {
  // 获取该文档当前最大 chunkIndex
  const existingChunks = await KnowledgeChunkModel.findAll({
    where: { knowledgeBaseId, source: docName },
    attributes: ['chunkIndex']
  })
  const maxIndex = existingChunks.length > 0
    ? Math.max(...existingChunks.map(c => c.chunkIndex))
    : -1

  const { embeddings, dims } = await getEmbeddingsInstance()
  const vector = await embeddings.embedQuery(content)

  const chunkRecord = await KnowledgeChunkModel.create({
    knowledgeBaseId,
    content,
    source: docName,
    chunkIndex: maxIndex + 1,
    enabled: true
  })

  const db = await getVecDb()
  await createVecTable(dims)
  const vectorBuffer = Buffer.from(new Float32Array(vector).buffer)
  db.prepare(`INSERT INTO ${VEC_TABLE_NAME}(chunk_id, embedding) VALUES (?, ?)`).run(chunkRecord.id, vectorBuffer)

  console.log(`[Knowledge] 手动新增分块: ${chunkRecord.id}, 文档: ${docName}`)
  return chunkRecord
}

// 更新分块内容（删除旧向量 → 重新 embedding → 写入新向量）
export async function updateChunkContent(chunkId: string, newContent: string): Promise<void> {
  const chunk = await KnowledgeChunkModel.findByPk(chunkId)
  if (!chunk) throw new Error('分块不存在')

  const { embeddings, dims } = await getEmbeddingsInstance()

  // 删除旧向量
  const db = await getVecDb()
  await ensureVecTableExists()
  db.prepare(`DELETE FROM ${VEC_TABLE_NAME} WHERE chunk_id = ?`).run(chunkId)

  // 重新 embedding
  const vector = await embeddings.embedQuery(newContent)
  await createVecTable(dims)
  const vectorBuffer = Buffer.from(new Float32Array(vector).buffer)
  db.prepare(`INSERT INTO ${VEC_TABLE_NAME}(chunk_id, embedding) VALUES (?, ?)`).run(chunkId, vectorBuffer)

  // 更新内容
  await chunk.update({ content: newContent })
  console.log(`[Knowledge] 更新分块: ${chunkId}`)
}

// 删除单个分块及其向量
export async function deleteSingleChunk(chunkId: string): Promise<void> {
  const chunk = await KnowledgeChunkModel.findByPk(chunkId)
  if (!chunk) throw new Error('分块不存在')

  const db = await getVecDb()
  await ensureVecTableExists()
  db.prepare(`DELETE FROM ${VEC_TABLE_NAME} WHERE chunk_id = ?`).run(chunkId)

  await chunk.destroy()
  console.log(`[Knowledge] 删除单个分块: ${chunkId}`)
}

// 切换分块启用/停用状态
export async function toggleChunkEnabled(chunkId: string): Promise<KnowledgeChunkModel> {
  const chunk = await KnowledgeChunkModel.findByPk(chunkId)
  if (!chunk) throw new Error('分块不存在')

  await chunk.update({ enabled: !chunk.enabled })
  console.log(`[Knowledge] 分块 ${chunkId} 状态切换为: ${chunk.enabled ? '启用' : '停用'}`)
  return chunk
}

// 从分块拼接重建文档内容
export async function reconstructDocumentFromChunks(knowledgeBaseId: string, docName: string): Promise<string> {
  const kb = await KnowledgeBaseModel.findByPk(knowledgeBaseId)
  if (!kb) throw new Error('知识库不存在')

  const chunks = await KnowledgeChunkModel.findAll({
    where: { knowledgeBaseId, source: docName },
    order: [['chunkIndex', 'ASC']]
  })

  if (chunks.length === 0) throw new Error('文档无分块数据')

  if (kb.chunkOverlap > 0 && chunks.length > 1) {
    // 有重叠：每个分块取前 (chunkSize - chunkOverlap) 字符，最后一个取完整
    const effectiveLen = kb.chunkSize - kb.chunkOverlap
    const parts: string[] = []
    for (let i = 0; i < chunks.length - 1; i++) {
      parts.push(chunks[i].content.slice(0, effectiveLen))
    }
    parts.push(chunks[chunks.length - 1].content)
    return parts.join('')
  }

  // 无重叠：直接拼接
  return chunks.map(c => c.content).join('')
}