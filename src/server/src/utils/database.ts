import { Sequelize } from 'sequelize'
import { safeJsonParse } from './shared'

export interface DatabaseConfig {
  dbType: 'sqlite' | 'postgres' | 'mysql' | 'mssql' | 'mongodb' | 'redis'
  connectionConfig?: string  // JSON string, e.g. {"path":"/data/db.db"} or {"connectionString":"postgresql://..."}
  sql?: string
  collection?: string
  operation?: string
  query?: string  // JSON filter for MongoDB
  mode: 'query' | 'execute'
  timeout: number
}

export async function executeDatabaseQuery(cfg: DatabaseConfig): Promise<string> {
  const timeoutMs = (cfg.timeout || 30) * 1000

  switch (cfg.dbType) {
    case 'sqlite':
    case 'postgres':
    case 'mysql':
    case 'mssql':
      return await executeSQL(cfg, timeoutMs)
    case 'mongodb':
      return await executeMongoDB(cfg, timeoutMs)
    case 'redis':
      return await executeRedis(cfg, timeoutMs)
    default:
      return `不支持的数据库类型: ${cfg.dbType}`
  }
}

async function executeSQL(cfg: DatabaseConfig, timeoutMs: number): Promise<string> {
  const raw = (cfg.connectionConfig || '').trim()
  let connConfig: Record<string, string> = {}
  if (raw.startsWith('{')) {
    connConfig = safeJsonParse<Record<string, string>>(raw, {})
  } else if (raw) {
    // 纯字符串：SQLite 当作 path，PostgreSQL 当作 connectionString
    if (cfg.dbType === 'sqlite') connConfig.path = raw
    else connConfig.connectionString = raw
  }
  const sql = (cfg.sql || '').trim()
  if (!sql) return 'SQL 为空'

  if (cfg.mode === 'query' && !/^\s*SELECT\b/i.test(sql)) {
    return 'query 模式仅允许 SELECT 语句'
  }

  let sequelize: Sequelize | null = null
  try {
    if (cfg.dbType === 'sqlite') {
      const dbPath = connConfig.path || ':memory:'
      sequelize = new Sequelize({ dialect: 'sqlite', storage: dbPath, logging: false })
    } else {
      const connStr = connConfig.connectionString
      if (!connStr) return `${({ mysql: 'MySQL', mssql: 'SQL Server', postgres: 'PostgreSQL' })[cfg.dbType] || '数据库'} 需要 connectionString`
      const dialect = cfg.dbType === 'mssql' ? 'mssql' : cfg.dbType === 'mysql' ? 'mysql' : 'postgres'
      sequelize = new Sequelize(connStr, { dialect, logging: false, dialectOptions: { connectionTimeoutMillis: timeoutMs } } as any)
    }

    await sequelize.authenticate({ retry: { max: 1 } } as any)

    if (cfg.mode === 'query') {
      const [results] = await sequelize.query(sql, { timeout: timeoutMs } as any)
      return JSON.stringify(results, null, 2)
    } else {
      const [, meta] = await sequelize.query(sql, { timeout: timeoutMs } as any)
      return `执行成功，影响行数: ${(meta as any)?.rowCount ?? '未知'}`
    }
  } catch (error) {
    return `查询失败: ${error instanceof Error ? error.message : String(error)}`
  } finally {
    if (sequelize) await sequelize.close()
  }
}

async function executeMongoDB(cfg: DatabaseConfig, timeoutMs: number): Promise<string> {
  const raw = (cfg.connectionConfig || '').trim()
  let connConfig: Record<string, string> = {}
  let uri = raw
  if (raw.startsWith('{')) {
    connConfig = safeJsonParse<Record<string, string>>(raw, {})
    uri = connConfig.uri || raw
  }
  if (!uri) return 'MongoDB 需要 uri 连接串'

  try {
    const { MongoClient } = await import('mongodb')
    const client = new (MongoClient as any)(uri, { serverSelectionTimeoutMS: timeoutMs, connectTimeoutMS: timeoutMs })
    await client.connect()
    // 从 URI 路径中提取数据库名，如 mongodb://host:27017/mydb → mydb
    const uriDbName = (uri.match(/\/([^/?]+)(\?|$)/) || [])[1]
    const dbName = connConfig.database || uriDbName || 'test'
    const db = client.db(dbName)
    const collection = cfg.collection || ''
    if (!collection) return 'MongoDB 需要指定 collection'

    const op = cfg.operation || 'find'
    let queryObj: any = {}
    try {
      queryObj = JSON.parse(cfg.query || '{}')
    } catch {
      try {
        const fixed = (cfg.query || '').replace(/:(\s*)(\{\{[^}]+\}\}|[^",}\s]+)(\s*[,}])/g, ':$1"$2"$3')
        queryObj = JSON.parse(fixed)
      } catch {
        return `JSON 解析失败: 查询条件不是合法 JSON。当前值: ${cfg.query?.substring(0, 200)}`
      }
    }

    let result: any
    switch (op) {
      case 'find':
        result = await db.collection(collection).find(queryObj).limit(100).toArray()
        break
      case 'aggregate':
        result = await db.collection(collection).aggregate(Array.isArray(queryObj) ? queryObj : []).toArray()
        break
      case 'findOne':
        result = await db.collection(collection).findOne(queryObj)
        break
      case 'insertOne':
        result = await db.collection(collection).insertOne(queryObj)
        return `插入成功, id: ${result.insertedId}`
      case 'updateOne':
        {
          const filter = safeJsonParse<any>(cfg.query, {})
          const update = safeJsonParse<any>(connConfig.update || '{}', {})
          result = await db.collection(collection).updateOne(filter, { $set: update })
        }
        return `更新成功, matched: ${result.matchedCount}, modified: ${result.modifiedCount}`
      case 'deleteOne':
        result = await db.collection(collection).deleteOne(queryObj)
        return `删除成功, deleted: ${result.deletedCount}`
      case 'count':
        result = await db.collection(collection).countDocuments(queryObj)
        return `文档数: ${result}`
      default:
        return `不支持的操作: ${op}`
    }

    return JSON.stringify(result, null, 2)
  } catch (error) {
    return `MongoDB 查询失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

async function executeRedis(cfg: DatabaseConfig, timeoutMs: number): Promise<string> {
  const raw = (cfg.connectionConfig || '').trim()
  let url = raw
  if (raw.startsWith('{')) {
    const parsed = safeJsonParse<Record<string, string>>(raw, {})
    url = parsed.url || raw
  }
  if (!url) url = 'redis://localhost:6379'

  const cmd = (cfg.sql || '').trim()
  if (!cmd) return 'Redis 命令为空'

  try {
    const { createClient } = await import('redis')
    const client = createClient({ url, socket: { connectTimeout: timeoutMs } })
    await client.connect()
    const parts = cmd.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || []
    if (parts.length === 0) return '无效的命令格式'
    const command = parts[0]!
    const args = parts.slice(1).map(a => a.replace(/^["']|["']$/g, ''))
    const result = await (client as any)[command.toLowerCase()](...args)
    await client.quit()
    return result !== undefined && result !== null
      ? (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result))
      : '(nil)'
  } catch (error) {
    return `Redis 执行失败: ${error instanceof Error ? error.message : String(error)}`
  }
}
