import { Sequelize } from 'sequelize'
import { getDataDir } from '../utils/file'

// 创建Sequelize实例，使用SQLite数据库
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: getDataDir('/database.sqlite'), // 数据库文件存储路径
  logging: false // 禁用SQL日志，生产环境中可以设置为false
})

// 测试数据库连接
export const initDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate()
    console.log('数据库连接成功')
    // 同步所有模型到数据库
    await sequelize.sync({ force: false }) // 使用force: false安全同步
    console.log('数据库同步成功')
  } catch (error) {
    console.error('数据库连接失败:', error)
    throw error
  }
}

export default sequelize
