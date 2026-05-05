import { Sequelize } from 'sequelize'
import Database from 'better-sqlite3'
import { getDataDir } from '../utils/file'

// 创建Sequelize实例，使用SQLite数据库
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: getDataDir('/database.sqlite'), // 数据库文件存储路径
  logging: false // 禁用SQL日志，生产环境中可以设置为false
})

// 为已有表添加新列（Sequelize sync 不会自动添加新列到已存在的表）
const migrateNewColumns = () => {
  const dbPath = getDataDir('/knowledge.sqlite')
  try {
    const db = new Database(dbPath)
    const columns = db.pragma('table_info(knowledge_chunks)') as { name: string }[]
    const columnNames = columns.map((c) => c.name)
    if (!columnNames.includes('enabled')) {
      db.exec('ALTER TABLE knowledge_chunks ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT 1')
      console.log('迁移: 已添加 knowledge_chunks.enabled 列')
    }
    db.close()
  } catch (e: unknown) {
    console.warn('迁移检查失败（首次启动时表不存在是正常的）:', e instanceof Error ? e.message : String(e))
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
    // 运行列迁移
    migrateNewColumns()
  } catch (error) {
    console.error('数据库连接失败:', error)
    throw error
  }
}

export default sequelize
