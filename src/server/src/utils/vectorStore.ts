/**
 * VectorStoreProvider 接口 & 各引擎实现
 *
 * 内部知识库的向量存储层抽象，每个引擎独立实现。
 * 外部引擎 SDK 采用 lazy import，没用到的引擎即使未安装也不报错。
 */
import Database from 'better-sqlite3'
import { getLoadablePath } from 'sqlite-vec'
import { getResourcesDir } from './file'
import { KB_DB_FILENAME, VEC_TABLE_NAME, DEFAULT_VECTOR_DIMS } from '../config'

// ────────────────────────────────────────
// 接口定义
// ────────────────────────────────────────

export interface VectorStoreProvider {
  /** 初始化向量存储（建表/建集合），首次写入前调用 */
  init(dims: number, config?: Record<string, any>): Promise<void>

  /** 确保就绪（用于检索，不重建已有表/集合） */
  ensureReady(dims: number): Promise<void>

  /** 批量插入向量 */
  insert(chunks: { id: string; vector: Float32Array }[]): Promise<void>

  /** 向量相似度搜索，返回 chunkId + distance */
  search(vector: Float32Array, topK: number): Promise<{ chunkId: string; distance: number }[]>

  /** 删除指定 chunk 的向量 */
  delete(chunkIds: string[]): Promise<void>

  /** 清空当前 KB 的所有向量 */
  clearAll(): Promise<void>
}

// ────────────────────────────────────────
// SqliteVecStore — 内嵌 sqlite-vec（默认）
// ────────────────────────────────────────

export class SqliteVecStore implements VectorStoreProvider {
  private dbPath = getResourcesDir(KB_DB_FILENAME)
  private db: Database.Database | null = null

  private async getDb(): Promise<Database.Database> {
    if (this.db) return this.db
    this.db = new Database(this.dbPath)
    this.db.loadExtension(getLoadablePath())
    return this.db
  }

  async init(dims: number): Promise<void> {
    const db = await this.getDb()
    const existing = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${VEC_TABLE_NAME}'`).get() as any
    if (existing) {
      try {
        const info = db.prepare(`SELECT * FROM ${VEC_TABLE_NAME}_info`).get() as any
        if (info && info.dimension !== dims) {
          db.exec(`DROP TABLE ${VEC_TABLE_NAME}`)
          db.exec(`CREATE VIRTUAL TABLE ${VEC_TABLE_NAME} USING vec0(chunk_id text PRIMARY KEY, embedding float[${dims}])`)
        }
      } catch {
        db.exec(`DROP TABLE IF EXISTS ${VEC_TABLE_NAME}`)
        db.exec(`CREATE VIRTUAL TABLE ${VEC_TABLE_NAME} USING vec0(chunk_id text PRIMARY KEY, embedding float[${dims}])`)
      }
    } else {
      db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS ${VEC_TABLE_NAME} USING vec0(chunk_id text PRIMARY KEY, embedding float[${dims}])`)
    }
  }

  async ensureReady(_dims: number): Promise<void> {
    const db = await this.getDb()
    const existing = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${VEC_TABLE_NAME}'`).get() as any
    if (!existing) {
      db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS ${VEC_TABLE_NAME} USING vec0(chunk_id text PRIMARY KEY, embedding float[${DEFAULT_VECTOR_DIMS}])`)
    }
  }

  async insert(chunks: { id: string; vector: Float32Array }[]): Promise<void> {
    const db = await this.getDb()
    const stmt = db.prepare(`INSERT INTO ${VEC_TABLE_NAME}(chunk_id, embedding) VALUES (?, ?)`)
    for (const c of chunks) {
      stmt.run(c.id, Buffer.from(c.vector.buffer))
    }
  }

  async search(vector: Float32Array, topK: number): Promise<{ chunkId: string; distance: number }[]> {
    const db = await this.getDb()
    const rows = db.prepare(`
      SELECT chunk_id, distance
      FROM ${VEC_TABLE_NAME}
      WHERE embedding MATCH ?
      ORDER BY distance ASC
      LIMIT ?
    `).all(Buffer.from(vector.buffer), topK) as { chunk_id: string; distance: number }[]
    return rows.map(r => ({ chunkId: r.chunk_id, distance: r.distance }))
  }

  async delete(chunkIds: string[]): Promise<void> {
    const db = await this.getDb()
    const stmt = db.prepare(`DELETE FROM ${VEC_TABLE_NAME} WHERE chunk_id = ?`)
    for (const id of chunkIds) {
      stmt.run(id)
    }
  }

  async clearAll(): Promise<void> {
    const db = await this.getDb()
    db.exec(`DELETE FROM ${VEC_TABLE_NAME}`)
  }
}

// ────────────────────────────────────────
// LanceDbStore — 内嵌 LanceDB
// ────────────────────────────────────────

export class LanceDbStore implements VectorStoreProvider {
  private config: Record<string, any>
  private table: any = null
  private tableName = 'vec_chunks'

  constructor(config: Record<string, any>) {
    this.config = config
    this.tableName = config.tableName || 'vec_chunks'
  }

  async getTable(): Promise<any> {
    if (this.table) return this.table
    const lancedb = await import('@lancedb/lancedb').catch(() => { throw new Error('请安装 @lancedb/lancedb: npm install @lancedb/lancedb') })
    const dbDir = this.config.dataDir || getResourcesDir('/lancedb')
    const db = await lancedb.connect(dbDir)
    const tblNames = await db.tableNames()
    if (tblNames.includes(this.tableName)) {
      this.table = await db.openTable(this.tableName)
    }
    return this.table
  }

  async init(dims: number): Promise<void> {
    const lancedb = await import('@lancedb/lancedb').catch(() => { throw new Error('请安装 @lancedb/lancedb: npm install @lancedb/lancedb') })
    const dbDir = this.config.dataDir || getResourcesDir('/lancedb')
    const db = await lancedb.connect(dbDir)
    const tblNames = await db.tableNames()
    if (tblNames.includes(this.tableName)) {
      try {
        this.table = await db.openTable(this.tableName)
      } catch {
        // 维度变化或 schema 不兼容，删除重建
        try { await db.dropTable(this.tableName) } catch { /* ignore */ }
        this.table = await db.createTable(this.tableName, [
          { id: 'init', vector: new Array(dims).fill(0) }
        ])
      }
    } else {
      this.table = await db.createTable(this.tableName, [
        { id: 'init', vector: new Array(dims).fill(0) }
      ])
    }
  }

  async ensureReady(_dims: number): Promise<void> {
    const lancedb = await import('@lancedb/lancedb').catch(() => { throw new Error('请安装 @lancedb/lancedb: npm install @lancedb/lancedb') })
    const dbDir = this.config.dataDir || getResourcesDir('/lancedb')
    const db = await lancedb.connect(dbDir)
    const tblNames = await db.tableNames()
    if (!tblNames.includes(this.tableName)) {
      this.table = await db.createTable(this.tableName, [
        { id: 'init', vector: new Array(_dims).fill(0) }
      ])
    } else {
      try {
        this.table = await db.openTable(this.tableName)
      } catch {
        try { await db.dropTable(this.tableName) } catch { /* ignore */ }
        this.table = await db.createTable(this.tableName, [
          { id: 'init', vector: new Array(_dims).fill(0) }
        ])
      }
    }
  }

  async insert(chunks: { id: string; vector: Float32Array }[]): Promise<void> {
    const table = await this.getTable()
    await table.add(chunks.map(c => ({
      id: c.id,
      vector: Array.from(c.vector)
    })))
  }

  async search(vector: Float32Array, topK: number): Promise<{ chunkId: string; distance: number }[]> {
    const table = await this.getTable()
    if (!table) return []
    const results = await table.search(Array.from(vector)).limit(topK).toArray()
    return results.map((r: any) => ({ chunkId: r.id, distance: r._distance || 0 }))
  }

  async delete(chunkIds: string[]): Promise<void> {
    const table = await this.getTable()
    if (!table) return
    for (const id of chunkIds) {
      await table.delete(`id = '${id}'`)
    }
    // 优化存储：删除 tombstone 记录，回收磁盘空间
    await table.optimize({ cleanupOlderThan: new Date() }).catch((err: any) =>
      console.warn(`[LanceDb] optimize 失败: ${err}`)
    )
  }

  async clearAll(): Promise<void> {
    const lancedb = await import('@lancedb/lancedb').catch(() => { throw new Error('请安装 @lancedb/lancedb: npm install @lancedb/lancedb') })
    const dbDir = this.config.dataDir || getResourcesDir('/lancedb')
    const db = await lancedb.connect(dbDir)
    try { await db.dropTable(this.tableName) } catch { /* ignore */ }
    this.table = null
  }
}

// ────────────────────────────────────────
// QdrantStore — 外部 Qdrant 服务
// ────────────────────────────────────────

export class QdrantStore implements VectorStoreProvider {
  private config: Record<string, any>
  private client: any = null
  private collectionName: string

  constructor(config: Record<string, any>) {
    this.config = config
    this.collectionName = config.collectionName || 'knowledge_chunks'
  }

  async getClient(): Promise<any> {
    if (this.client) return this.client
    const { QdrantClient } = await import('@qdrant/js-client-rest').catch(() => {
      throw new Error('请安装 @qdrant/js-client-rest: npm install @qdrant/js-client-rest')
    })
    this.client = new QdrantClient({
      url: this.config.url || 'http://localhost:6333',
      apiKey: this.config.apiKey,
    })
    return this.client
  }

  async init(dims: number): Promise<void> {
    const client = await this.getClient()
    const collections = await client.getCollections()
    const exists = collections.collections.some((c: any) => c.name === this.collectionName)
    if (!exists) {
      await client.createCollection(this.collectionName, {
        vectors: { size: dims, distance: 'Cosine' }
      })
    }
  }

  async ensureReady(_dims: number): Promise<void> {
    // Qdrant 不需要在检索前特别准备
  }

  async insert(chunks: { id: string; vector: Float32Array }[]): Promise<void> {
    const client = await this.getClient()
    await client.upsert(this.collectionName, {
      points: chunks.map(c => ({
        id: c.id,
        vector: Array.from(c.vector),
        payload: {}
      }))
    })
  }

  async search(vector: Float32Array, topK: number): Promise<{ chunkId: string; distance: number }[]> {
    const client = await this.getClient()
    const results = await client.search(this.collectionName, {
      vector: Array.from(vector),
      limit: topK,
      with_payload: false
    })
    return results.map((r: any) => ({ chunkId: r.id, distance: r.score || 0 }))
  }

  async delete(chunkIds: string[]): Promise<void> {
    const client = await this.getClient()
    await client.delete(this.collectionName, {
      points: chunkIds
    })
  }

  async clearAll(): Promise<void> {
    const client = await this.getClient()
    try { await client.deleteCollection(this.collectionName) } catch { /* ignore */ }
  }
}

// ────────────────────────────────────────
// PineconeStore — 外部 Pinecone 服务
// ────────────────────────────────────────

export class PineconeStore implements VectorStoreProvider {
  private config: Record<string, any>
  private index: any = null
  private indexName: string

  constructor(config: Record<string, any>) {
    this.config = config
    this.indexName = config.indexName || 'knowledge'
  }

  async getIndex(): Promise<any> {
    if (this.index) return this.index
    const { Pinecone } = await import('@pinecone-database/pinecone').catch(() => {
      throw new Error('请安装 @pinecone-database/pinecone: npm install @pinecone-database/pinecone')
    })
    const pc = new Pinecone({ apiKey: this.config.apiKey })
    this.index = pc.index(this.indexName)
    return this.index
  }

  async init(_dims: number): Promise<void> {
    // Pinecone index 通过控制台或 CLI 创建，不自动创建
    await this.getIndex()
  }

  async ensureReady(_dims: number): Promise<void> {
    await this.getIndex()
  }

  async insert(chunks: { id: string; vector: Float32Array }[]): Promise<void> {
    const idx = await this.getIndex()
    await idx.upsert(chunks.map(c => ({
      id: c.id,
      values: Array.from(c.vector)
    })))
  }

  async search(vector: Float32Array, topK: number): Promise<{ chunkId: string; distance: number }[]> {
    const idx = await this.getIndex()
    const results = await idx.query({
      vector: Array.from(vector),
      topK,
      includeValues: false
    })
    return (results.matches || []).map((r: any) => ({ chunkId: r.id, distance: r.score || 0 }))
  }

  async delete(chunkIds: string[]): Promise<void> {
    const idx = await this.getIndex()
    await idx.deleteMany(chunkIds)
  }

  async clearAll(): Promise<void> {
    const idx = await this.getIndex()
    await idx.deleteAll()
  }
}

// ────────────────────────────────────────
// WeaviateStore — 外部 Weaviate 服务
// ────────────────────────────────────────

export class WeaviateStore implements VectorStoreProvider {
  private config: Record<string, any>
  private client: any = null
  private className: string

  constructor(config: Record<string, any>) {
    this.config = config
    this.className = config.className || 'KnowledgeChunk'
  }

  async getClient(): Promise<any> {
    if (this.client) return this.client
    const weaviate = await import('weaviate-ts-client').catch(() => {
      throw new Error('请安装 weaviate-ts-client: npm install weaviate-ts-client')
    })
    const url = new URL(this.config.url || 'http://localhost:8080')
    this.client = weaviate.client({
      scheme: url.protocol.replace(':', ''),
      host: url.host,
      apiKey: this.config.apiKey ? new weaviate.ApiKey(this.config.apiKey) : undefined
    })
    return this.client
  }

  async init(_dims: number): Promise<void> {
    // Weaviate class 通常在 schema 中预定义
  }

  async ensureReady(_dims: number): Promise<void> {
    // 不需要
  }

  async insert(chunks: { id: string; vector: Float32Array }[]): Promise<void> {
    const client = await this.getClient()
    const batcher = client.batch.objectsBatcher()
    for (const c of chunks) {
      batcher.withObject({
        class: this.className,
        id: c.id,
        vector: Array.from(c.vector),
        properties: {}
      })
    }
    await batcher.do()
  }

  async search(vector: Float32Array, topK: number): Promise<{ chunkId: string; distance: number }[]> {
    const client = await this.getClient()
    const result = await client.graphql
      .get()
      .withClassName(this.className)
      .withNearVector({ vector: Array.from(vector) })
      .withLimit(topK)
      .withFields('_additional { id distance }')
      .do()
    const items = result?.data?.Get?.[this.className] || []
    return items.map((r: any) => ({
      chunkId: r._additional.id,
      distance: r._additional.distance || 0
    }))
  }

  async delete(chunkIds: string[]): Promise<void> {
    const client = await this.getClient()
    for (const id of chunkIds) {
      try { await client.data.deleter().withClassName(this.className).withId(id).do() } catch { /* ignore */ }
    }
  }

  async clearAll(): Promise<void> {
    const client = await this.getClient()
    try {
      await client.schema.classDeleter().withClassName(this.className).do()
    } catch { /* ignore */ }
  }
}

// ────────────────────────────────────────
// MilvusStore — 外部 Milvus 服务
// ────────────────────────────────────────

export class MilvusStore implements VectorStoreProvider {
  private config: Record<string, any>
  private client: any = null
  private collectionName: string

  constructor(config: Record<string, any>) {
    this.config = config
    this.collectionName = config.collectionName || 'knowledge_chunks'
  }

  async getClient(): Promise<any> {
    if (this.client) return this.client
    const { MilvusClient } = await import('@zilliz/milvus2-sdk-node').catch(() => {
      throw new Error('请安装 @zilliz/milvus2-sdk-node: npm install @zilliz/milvus2-sdk-node')
    })
    this.client = new MilvusClient({
      address: this.config.address || 'localhost:19530',
      username: this.config.username,
      password: this.config.password,
    })
    return this.client
  }

  async init(dims: number): Promise<void> {
    const client = await this.getClient()
    const exists = await client.hasCollection({ collection_name: this.collectionName })
    if (!exists.value) {
      await client.createCollection({
        collection_name: this.collectionName,
        fields: [
          { name: 'id', data_type: 'VarChar', is_primary_key: true, max_length: 64 },
          { name: 'vector', data_type: 'FloatVector', dims },
        ]
      })
    }
  }

  async ensureReady(_dims: number): Promise<void> {
    // 不需要
  }

  async insert(chunks: { id: string; vector: Float32Array }[]): Promise<void> {
    const client = await this.getClient()
    await client.insert({
      collection_name: this.collectionName,
      data: chunks.map(c => ({
        id: c.id,
        vector: Array.from(c.vector)
      }))
    })
  }

  async search(vector: Float32Array, topK: number): Promise<{ chunkId: string; distance: number }[]> {
    const client = await this.getClient()
    const results = await client.search({
      collection_name: this.collectionName,
      vector: Array.from(vector),
      limit: topK,
      output_fields: []
    })
    return (results.results || []).map((r: any) => ({
      chunkId: r.id,
      distance: r.score || 0
    }))
  }

  async delete(chunkIds: string[]): Promise<void> {
    const client = await this.getClient()
    await client.deleteEntities({
      collection_name: this.collectionName,
      expr: `id in [${chunkIds.map(id => `'${id}'`).join(',')}]`
    })
  }

  async clearAll(): Promise<void> {
    const client = await this.getClient()
    try { await client.dropCollection({ collection_name: this.collectionName }) } catch { /* ignore */ }
  }
}

// ────────────────────────────────────────
// PgvectorStore — 外部 PostgreSQL + pgvector
// ────────────────────────────────────────

export class PgvectorStore implements VectorStoreProvider {
  private config: Record<string, any>
  private pool: any = null
  private tableName: string

  constructor(config: Record<string, any>) {
    this.config = config
    this.tableName = config.tableName || 'knowledge_vectors'
  }

  async getPool(): Promise<any> {
    if (this.pool) return this.pool
    const pg = await import('pg').catch(() => { throw new Error('请安装 pg: npm install pg') })
    this.pool = new pg.Pool({ connectionString: this.config.connectionString })
    return this.pool
  }

  async init(dims: number): Promise<void> {
    const pool = await this.getPool()
    await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        embedding vector(${dims})
      )
    `)
  }

  async ensureReady(_dims: number): Promise<void> {
    const pool = await this.getPool()
    await pool.query(`SELECT 1 FROM ${this.tableName} LIMIT 1`).catch(() => {})
  }

  async insert(chunks: { id: string; vector: Float32Array }[]): Promise<void> {
    const pool = await this.getPool()
    for (const c of chunks) {
      await pool.query(
        `INSERT INTO ${this.tableName} (id, embedding) VALUES ($1, $2::vector) ON CONFLICT (id) DO NOTHING`,
        [c.id, `[${Array.from(c.vector).join(',')}]`]
      )
    }
  }

  async search(vector: Float32Array, topK: number): Promise<{ chunkId: string; distance: number }[]> {
    const pool = await this.getPool()
    const result = await pool.query(
      `SELECT id, embedding <=> $1::vector AS distance FROM ${this.tableName} ORDER BY distance ASC LIMIT $2`,
      [`[${Array.from(vector).join(',')}]`, topK]
    )
    return result.rows.map((r: any) => ({ chunkId: r.id, distance: r.distance }))
  }

  async delete(chunkIds: string[]): Promise<void> {
    const pool = await this.getPool()
    const placeholders = chunkIds.map((_, i) => `$${i + 1}`).join(',')
    await pool.query(`DELETE FROM ${this.tableName} WHERE id IN (${placeholders})`, chunkIds)
  }

  async clearAll(): Promise<void> {
    const pool = await this.getPool()
    await pool.query(`DROP TABLE IF EXISTS ${this.tableName}`)
  }
}

// ────────────────────────────────────────
// MongoDBStore — 外部 MongoDB Atlas Vector Search
// ────────────────────────────────────────

export class MongoDBStore implements VectorStoreProvider {
  private config: Record<string, any>
  private client: any = null
  private collection: any = null
  private indexName: string

  constructor(config: Record<string, any>) {
    this.config = config
    this.indexName = config.indexName || 'vector_index'
  }

  async getCollection(): Promise<any> {
    if (this.collection) return this.collection
    const { MongoClient } = await import('mongodb').catch(() => {
      throw new Error('请安装 mongodb: npm install mongodb')
    })
    this.client = new MongoClient(this.config.connectionString)
    await this.client.connect()
    const db = this.client.db(this.config.dbName || 'knowledge')
    this.collection = db.collection(this.config.collectionName || 'vectors')
    return this.collection
  }

  async init(_dims: number): Promise<void> {
    const coll = await this.getCollection()
    // 确保索引存在（需用户在 Atlas 控制台创建或通过 createIndexes）
    try {
      await coll.createIndex(
        { embedding: 1 },
        { name: this.indexName }
      )
    } catch { /* 索引可能由 Atlas 管理 */ }
    // 注意：Atlas Vector Search index 通常通过 Atlas UI 或 API 创建
  }

  async ensureReady(_dims: number): Promise<void> {
    // 不需要
  }

  async insert(chunks: { id: string; vector: Float32Array }[]): Promise<void> {
    const coll = await this.getCollection()
    await coll.insertMany(chunks.map(c => ({
      _id: c.id,
      embedding: Array.from(c.vector)
    })))
  }

  async search(vector: Float32Array, topK: number): Promise<{ chunkId: string; distance: number }[]> {
    const coll = await this.getCollection()
    const results = await coll.aggregate([
      {
        $vectorSearch: {
          queryVector: Array.from(vector),
          path: 'embedding',
          numCandidates: topK * 10,
          limit: topK,
          index: this.indexName,
        }
      }
    ]).toArray()
    return results.map((r: any) => ({ chunkId: r._id, distance: r.score || 0 }))
  }

  async delete(chunkIds: string[]): Promise<void> {
    const coll = await this.getCollection()
    await coll.deleteMany({ _id: { $in: chunkIds } })
  }

  async clearAll(): Promise<void> {
    const coll = await this.getCollection()
    await coll.deleteMany({})
  }
}

// ────────────────────────────────────────
// RedisStore — 外部 Redis + RedisSearch
// ────────────────────────────────────────

export class RedisStore implements VectorStoreProvider {
  private config: Record<string, any>
  private client: any = null
  private indexName: string

  constructor(config: Record<string, any>) {
    this.config = config
    this.indexName = config.indexName || 'idx:knowledge'
  }

  async getClient(): Promise<any> {
    if (this.client) return this.client
    const redis = await import('redis').catch(() => { throw new Error('请安装 redis: npm install redis') })
    const url = this.config.url || 'redis://localhost:6379'
    this.client = redis.createClient({ url, password: this.config.password })
    await this.client.connect()
    return this.client
  }

  async init(dims: number): Promise<void> {
    const client = await this.getClient()
    try {
      await client.ft.create(this.indexName, {
        '$.vector': {
          type: 'VECTOR',
          ALGORITHM: 'FLAT',
          DIM: dims,
          DISTANCE_METRIC: 'COSINE',
          TYPE: 'FLOAT32'
        }
      }, { ON: 'JSON', PREFIX: 'knowledge:' })
    } catch (err: any) {
      // Index already exists is OK
      if (!err.message?.includes('already exists')) throw err
    }
  }

  async ensureReady(_dims: number): Promise<void> {
    // 不需要
  }

  async insert(chunks: { id: string; vector: Float32Array }[]): Promise<void> {
    const client = await this.getClient()
    for (const c of chunks) {
      await client.json.set(`knowledge:${c.id}`, '$', {
        id: c.id,
        vector: Array.from(c.vector)
      })
    }
  }

  async search(vector: Float32Array, topK: number): Promise<{ chunkId: string; distance: number }[]> {
    const client = await this.getClient()
    const vecStr = Buffer.from(vector.buffer).toString('binary')
    const results = await client.ft.search(
      this.indexName,
      `*=>[KNN ${topK} @$.vector $vec AS distance]`,
      {
        PARAMS: { vec: vecStr },
        SORTBY: 'distance',
        DIALECT: 2,
        RETURN: ['$.id', 'distance']
      }
    )
    return (results.documents || []).map((r: any) => ({
      chunkId: r.value?.id || '',
      distance: r.value?.distance || 0
    }))
  }

  async delete(chunkIds: string[]): Promise<void> {
    const client = await this.getClient()
    for (const id of chunkIds) {
      await client.del(`knowledge:${id}`)
    }
  }

  async clearAll(): Promise<void> {
    const client = await this.getClient()
    try {
      const keys = await client.keys('knowledge:*')
      if (keys.length > 0) await client.del(keys)
    } catch { /* ignore */ }
  }
}

// ────────────────────────────────────────
// ElasticsearchStore — 外部 Elasticsearch
// ────────────────────────────────────────

export class ElasticsearchStore implements VectorStoreProvider {
  private config: Record<string, any>
  private client: any = null
  private indexName: string

  constructor(config: Record<string, any>) {
    this.config = config
    this.indexName = config.indexName || 'knowledge_vectors'
  }

  async getClient(): Promise<any> {
    if (this.client) return this.client
    const { Client } = await import('@elastic/elasticsearch').catch(() => {
      throw new Error('请安装 @elastic/elasticsearch: npm install @elastic/elasticsearch')
    })
    this.client = new Client({
      node: this.config.url || 'http://localhost:9200',
      auth: this.config.apiKey ? { apiKey: this.config.apiKey } : undefined
    })
    return this.client
  }

  async init(dims: number): Promise<void> {
    const client = await this.getClient()
    const exists = await client.indices.exists({ index: this.indexName })
    if (!exists) {
      await client.indices.create({
        index: this.indexName,
        mappings: {
          properties: {
            embedding: { type: 'dense_vector', dims, index: true, similarity: 'cosine' }
          }
        }
      })
    }
  }

  async ensureReady(_dims: number): Promise<void> {
    // 不需要
  }

  async insert(chunks: { id: string; vector: Float32Array }[]): Promise<void> {
    const client = await this.getClient()
    const operations = chunks.flatMap(c => [
      { index: { _index: this.indexName, _id: c.id } },
      { embedding: Array.from(c.vector) }
    ])
    await client.bulk({ operations, refresh: false })
  }

  async search(vector: Float32Array, topK: number): Promise<{ chunkId: string; distance: number }[]> {
    const client = await this.getClient()
    const result = await client.search({
      index: this.indexName,
      knn: {
        field: 'embedding',
        query_vector: Array.from(vector),
        k: topK,
        num_candidates: topK * 2
      },
      size: topK
    })
    return (result.hits?.hits || []).map((r: any) => ({
      chunkId: r._id,
      distance: r._score || 0
    }))
  }

  async delete(chunkIds: string[]): Promise<void> {
    const client = await this.getClient()
    const operations = chunkIds.flatMap(id => [
      { delete: { _index: this.indexName, _id: id } }
    ])
    if (operations.length > 0) {
      await client.bulk({ operations, refresh: false })
    }
  }

  async clearAll(): Promise<void> {
    const client = await this.getClient()
    try { await client.indices.delete({ index: this.indexName }) } catch { /* ignore */ }
  }
}

// ────────────────────────────────────────
// 工厂函数
// ────────────────────────────────────────

const STORE_CLASSES: Record<string, new (config: Record<string, any>) => VectorStoreProvider> = {
  'sqlite-vec': SqliteVecStore,
  'lancedb': LanceDbStore,
  'qdrant': QdrantStore,
  'pinecone': PineconeStore,
  'weaviate': WeaviateStore,
  'milvus': MilvusStore,
  'pgvector': PgvectorStore,
  'mongodb-atlas': MongoDBStore,
  'redis': RedisStore,
  'elasticsearch': ElasticsearchStore,
}

export function getVectorStore(type: string, vectorConfig?: string): VectorStoreProvider {
  let config: Record<string, any> = {}
  if (vectorConfig) {
    try { config = JSON.parse(vectorConfig) } catch { /* ignore */ }
  }
  const Cls = STORE_CLASSES[type]
  if (!Cls) {
    throw new Error(`不支持的向量引擎: ${type}，可用: ${Object.keys(STORE_CLASSES).join(', ')}`)
  }
  return new Cls(config)
}
