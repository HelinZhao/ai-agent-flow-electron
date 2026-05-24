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
/**
 * 执行增量迁移：给 knowledge_bases 表添加新列（如不存在）
 */
async function migrateKnowledgeBaseColumns(): Promise<void> {
  try {
    const queryInterface = sequelize.getQueryInterface()
    const tableInfo = await queryInterface.describeTable('knowledge_bases') as Record<string, unknown>

    if (!tableInfo.provider) {
      console.log('[Migration] knowledge_bases 表缺少 provider 列，执行迁移...')
      await sequelize.query(`ALTER TABLE knowledge_bases ADD COLUMN provider TEXT NOT NULL DEFAULT 'generic';`)
      console.log('[Migration] provider 列添加成功')
    }

    if (!tableInfo.providerConfig) {
      console.log('[Migration] knowledge_bases 表缺少 providerConfig 列，执行迁移...')
      await sequelize.query(`ALTER TABLE knowledge_bases ADD COLUMN providerConfig TEXT;`)
      console.log('[Migration] providerConfig 列添加成功')
    }

    if (!tableInfo.vectorStore) {
      console.log('[Migration] knowledge_bases 表缺少 vectorStore 列，执行迁移...')
      await sequelize.query(`ALTER TABLE knowledge_bases ADD COLUMN vectorStore TEXT NOT NULL DEFAULT 'sqlite-vec';`)
      console.log('[Migration] vectorStore 列添加成功')
    }

    if (!tableInfo.vectorConfig) {
      console.log('[Migration] knowledge_bases 表缺少 vectorConfig 列，执行迁移...')
      await sequelize.query(`ALTER TABLE knowledge_bases ADD COLUMN vectorConfig TEXT;`)
      console.log('[Migration] vectorConfig 列添加成功')
    }
  } catch (error) {
    console.log('[Migration] 跳过 knowledge_bases 列迁移:', (error as Error).message)
  }
}

/**
 * 执行增量迁移：给 llm_configs 表添加新列（如不存在）
 */
async function migrateLLMConfigColumns(): Promise<void> {
  try {
    await sequelize.getQueryInterface().describeTable('llm_configs')
  } catch (error) {
    console.log('[Migration] 跳过 llm_configs 列迁移:', (error as Error).message)
  }
}

/**
 * 执行增量迁移：给 workflows 表添加 layoutDirection 列（如不存在）
 */
async function migrateWorkflowColumns(): Promise<void> {
  try {
    const queryInterface = sequelize.getQueryInterface()
    const tableInfo = await queryInterface.describeTable('workflows') as Record<string, unknown>

    if (!tableInfo.layoutDirection) {
      console.log('[Migration] workflows 表缺少 layoutDirection 列，执行迁移...')
      await sequelize.query(`ALTER TABLE workflows ADD COLUMN layoutDirection TEXT;`)
      console.log('[Migration] layoutDirection 列添加成功')
    }
    if (!tableInfo.envVars) {
      console.log('[Migration] workflows 表缺少 envVars 列，执行迁移...')
      await sequelize.query(`ALTER TABLE workflows ADD COLUMN envVars TEXT;`)
      console.log('[Migration] envVars 列添加成功')
    }
  } catch (error) {
    console.log('[Migration] 跳过 workflows 列迁移:', (error as Error).message)
  }
}

/**
 * 执行增量迁移：给 agents 表添加 isSystem 列（如不存在）
 */
async function migrateAgentColumns(): Promise<void> {
  try {
    const queryInterface = sequelize.getQueryInterface()
    const tableInfo = await queryInterface.describeTable('agents') as Record<string, unknown>
    if (!tableInfo.isSystem) {
      console.log('[Migration] agents 表缺少 isSystem 列，执行迁移...')
      await sequelize.query(`ALTER TABLE agents ADD COLUMN isSystem INTEGER DEFAULT 0;`)
      console.log('[Migration] isSystem 列添加成功')
    }
    if (!tableInfo.llmConfigId) {
      console.log('[Migration] agents 表缺少 llmConfigId 列，执行迁移...')
      await sequelize.query(`ALTER TABLE agents ADD COLUMN llmConfigId INTEGER DEFAULT 0;`)
      console.log('[Migration] llmConfigId 列添加成功')
    }
  } catch (error) {
    console.log('[Migration] 跳过 agents isSystem 列迁移:', (error as Error).message)
  }
}

/**
 * 执行增量迁移：创建 triggers 表（如不存在）
 */
async function migrateTriggerTable(): Promise<void> {
  try {
    const queryInterface = sequelize.getQueryInterface()
    await queryInterface.describeTable('triggers')
  } catch {
    console.log('[Migration] triggers 表不存在，创建中...')
    await sequelize.query(`
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
    `)
    console.log('[Migration] triggers 表创建成功')
  }
}

/**
 * 执行增量迁移：创建 mcp_servers 表（如不存在）
 */
async function migrateMcpServersTable(): Promise<void> {
  try {
    const queryInterface = sequelize.getQueryInterface()
    await queryInterface.describeTable('mcp_servers')
  } catch {
    console.log('[Migration] mcp_servers 表不存在，创建中...')
    await sequelize.query(`
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
    `)
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mcp_servers_name ON mcp_servers(name)
    `)
    console.log('[Migration] mcp_servers 表创建成功')
  }
}

async function migrateParamsColumn(): Promise<void> {
  try {
    const q = sequelize.getQueryInterface()
    const table = await q.describeTable('triggers') as Record<string, unknown>
    if (!table.params) {
      await sequelize.query('ALTER TABLE triggers ADD COLUMN params TEXT;')
      console.log('[Migration] triggers.params column added')
    }
  } catch { /* empty */ }
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
    await migrateLLMConfigColumns()
    await migrateWorkflowColumns()
    await migrateAgentColumns()
    await migrateTriggerTable()
    await seedTemplates()
    await migrateParamsColumn()
    await migrateMcpServersTable()
  } catch (error) {
    console.error('数据库连接失败:', error)
    throw error
  }
}

export default sequelize
