import { Sequelize } from 'sequelize'
import { getResourcesDir } from '../utils/file'
import { DB_FILENAME } from '../config'
import fs from 'fs'
import path from 'path'
const datPath = getResourcesDir(DB_FILENAME)  // 数据库文件存储路径
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
  } catch (error) {
    console.log('[Migration] 跳过 workflows 列迁移:', (error as Error).message)
  }
}

// 测试数据库连接
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
  } catch (error) {
    console.error('数据库连接失败:', error)
    throw error
  }
}

export default sequelize
