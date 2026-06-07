import { Sequelize } from 'sequelize'
import { getUserDataDir } from '../utils/file'
import { DB_FILENAME } from '../config'
import fs from 'fs'
import path from 'path'
import { SEED_TEMPLATES } from '../seeds/templates'
const datPath = getUserDataDir(DB_FILENAME)  // 数据库文件存储路径
fs.mkdirSync(path.dirname(datPath), { recursive: true })

// 创建Sequelize实例，使用SQLite数据库
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: datPath,
  logging: false // 禁用SQL日志，生产环境中可以设置为false
})
// ---------------------------------------------------------------------------
// 通用迁移工具方法
// ---------------------------------------------------------------------------

type ColumnDef = { name: string; definition: string }

/**
 * 给指定表批量添加缺失的列
 * 自动检测列是否存在，只添加不存在的列
 */
async function addMissingColumns(tableName: string, columns: ColumnDef[]): Promise<void> {
  try {
    const q = sequelize.getQueryInterface()
    const table = await q.describeTable(tableName) as Record<string, unknown>
    for (const col of columns) {
      if (!table[col.name]) {
        console.log(`[Migration] ${tableName} 表缺少 ${col.name} 列，执行迁移...`)
        await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.definition};`)
        console.log(`[Migration] ${tableName}.${col.name} 列添加成功`)
      }
    }
  } catch (error) {
    console.log(`[Migration] 跳过 ${tableName} 列迁移:`, (error as Error).message)
  }
}

/**
 * 创建表（如不存在）并在成功后执行额外回调（如建索引）
 */
async function createTableIfMissing(
  tableName: string,
  createSql: string,
  after?: () => Promise<unknown>,
): Promise<void> {
  try {
    await sequelize.getQueryInterface().describeTable(tableName)
  } catch {
    console.log(`[Migration] ${tableName} 表不存在，创建中...`)
    await sequelize.query(createSql)
    if (after) await after()
    console.log(`[Migration] ${tableName} 表创建成功`)
  }
}

// ---------------------------------------------------------------------------
// 具体迁移定义（纯声明式）
// ---------------------------------------------------------------------------

const migrateKnowledgeBaseColumns = () =>
  addMissingColumns('knowledge_bases', [
    { name: 'provider', definition: "TEXT NOT NULL DEFAULT 'generic'" },
    { name: 'providerConfig', definition: 'TEXT' },
    { name: 'vectorStore', definition: "TEXT NOT NULL DEFAULT 'sqlite-vec'" },
    { name: 'vectorConfig', definition: 'TEXT' },
  ])

const migrateWorkflowColumns = () =>
  addMissingColumns('workflows', [
    { name: 'layoutDirection', definition: 'TEXT' },
    { name: 'envVars', definition: 'TEXT' },
  ])

const migrateAgentColumns = () =>
  addMissingColumns('agents', [
    { name: 'isSystem', definition: 'INTEGER DEFAULT 0' },
    { name: 'llmConfigId', definition: 'INTEGER DEFAULT 0' },
    { name: 'avatarUrl', definition: 'TEXT' },
  ])

const migrateTaskColumns = () =>
  addMissingColumns('tasks', [
    { name: 'restartedFrom', definition: 'TEXT' },
    { name: 'parentId', definition: 'TEXT' },
    { name: 'reviewComment', definition: 'TEXT' },
    { name: 'projectId', definition: 'TEXT' },
  ])

const migrateTeamColumns = () =>
  addMissingColumns('teams', [
    { name: 'autoClaimEnabled', definition: 'INTEGER DEFAULT 0' },
    { name: 'autoClaimInterval', definition: 'INTEGER DEFAULT 60' },
    { name: 'autoApproveTools', definition: 'INTEGER DEFAULT 0' },
  ])

/** llm_configs 加 capabilities 字段（JSON 数组） */
const migrateLLMCapabilities = () =>
  addMissingColumns('llm_configs', [
    { name: 'capabilities', definition: "TEXT DEFAULT '[\"text\", \"tool_use\", \"streaming\"]'" },
  ])

const migrateTriggerTable = () =>
  createTableIfMissing(
    'triggers',
    `
      CREATE TABLE IF NOT EXISTS triggers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('cron', 'webhook')),
        cronExpression TEXT,
        targetType TEXT NOT NULL CHECK(targetType IN ('workflow', 'agent')),
        targetId TEXT NOT NULL,
        input TEXT NOT NULL DEFAULT '',
        webhookToken TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        nextRunAt TEXT,
        lastRunAt TEXT,
        lastRunStatus TEXT CHECK(lastRunStatus IN ('success', 'failed')),
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `,
  )

const migrateMcpServersTable = () =>
  createTableIfMissing(
    'mcp_servers',
    `
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        transportType TEXT NOT NULL CHECK(transportType IN ('stdio', 'sse')),
        command TEXT,
        args TEXT,
        url TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        connectionStatus TEXT NOT NULL DEFAULT 'disconnected',
        toolsCount INTEGER NOT NULL DEFAULT 0,
        lastConnectedAt TEXT,
        settings TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `,
    () => sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_mcp_servers_name ON mcp_servers(name)'),
  )

/** 给 triggers 表追加 params 列（在表创建后单独迁移） */
const migrateParamsColumn = () =>
  addMissingColumns('triggers', [
    { name: 'params', definition: 'TEXT' },
  ])

async function resetStaleTasks(): Promise<void> {
  try {
    const { TaskModel } = await import('../models/Task')
    const [affected] = await TaskModel.update(
      { status: 'pending' },
      { where: { status: 'claimed' } },
    )
    if (affected > 0) {
      console.log(`[Startup] 已将 ${affected} 个未完成的任务重置为待处理状态`)
    }
  } catch { /* tasks 表可能还不存在 */ }
}

// 测试数据库连接
async function seedTemplates(): Promise<void> {
  try {
    const { TemplateModel } = await import("../models/Template")
    const allFields = ['name', 'description', 'type', 'category', 'icon', 'content', 'author', 'version']
    await TemplateModel.bulkCreate(SEED_TEMPLATES as any, {
      updateOnDuplicate: allFields as any,
    })
    console.log(`[Seed] ${SEED_TEMPLATES.length} templates synced`)
  } catch (error: any) {
    console.log("[Seed] skip:", error.message)
  }
}

export const initDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate()
    console.log('数据库连接成功')
    // 同步所有模型到数据库
    await sequelize.sync({ force: false }) // 使用force: false安全同步
    console.log('数据库同步成功')
    // 执行增量迁移
    await migrateKnowledgeBaseColumns()
    await migrateWorkflowColumns()
    await migrateLLMCapabilities()
    await migrateAgentColumns()
    await migrateTriggerTable()
    await seedTemplates()
    await migrateParamsColumn()
    await migrateMcpServersTable()
    await migrateTeamColumns()
    await migrateTaskColumns()
    await resetStaleTasks()
  } catch (error) {
    console.error('数据库连接失败:', error)
    throw error
  }
}

export default sequelize
