import { DataTypes } from 'sequelize'
import sequelize from './index'

// 直接执行SQL来修复表结构
async function initLLMConfigsTable() {
  try {
    console.log('初始化llm_configs表...')

    // 检查表是否存在
    const [results] = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='llm_configs'"
    )

    if (results.length === 0) {
      // 表不存在，创建新表
      console.log('创建llm_configs表...')
      await sequelize.query(`
        CREATE TABLE llm_configs (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL DEFAULT '默认配置',
          provider TEXT NOT NULL,
          apiKey TEXT NOT NULL,
          model TEXT NOT NULL,
          baseUrl TEXT,
          temperature REAL DEFAULT 0.7,
          maxTokens INTEGER DEFAULT 2000,
          isActive INTEGER DEFAULT 0 NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✓ llm_configs表创建成功')
    } else {
      // 表存在，检查并添加缺失的列
      console.log('检查表结构...')

      try {
        // 测试查询看是否有问题
        await sequelize.query("SELECT name, isActive FROM llm_configs LIMIT 1")
        console.log('✓ 表结构正常')
      } catch (queryError) {
        console.log('表结构有问题，开始修复...')

        // 添加name列（如果不存在）
        try {
          await sequelize.query("ALTER TABLE llm_configs ADD COLUMN name TEXT DEFAULT '默认配置' NOT NULL")
          console.log('✓ 添加name列成功')
        } catch (addNameError) {
          console.log('name列可能已存在或添加失败:', addNameError.message)
        }

        // 添加isActive列（如果不存在）
        try {
          await sequelize.query("ALTER TABLE llm_configs ADD COLUMN isActive INTEGER DEFAULT 0 NOT NULL")
          console.log('✓ 添加isActive列成功')
        } catch (addActiveError) {
          console.log('isActive列可能已存在或添加失败:', addActiveError.message)
        }

        // 更新现有数据
        try {
          await sequelize.query("UPDATE llm_configs SET name = '默认配置' WHERE name IS NULL OR name = ''")
          console.log('✓ 更新name字段成功')
        } catch (updateNameError) {
          console.log('更新name字段失败:', updateNameError.message)
        }
      }
    }

    // 确保至少有一个活跃配置
    const [activeResults] = await sequelize.query("SELECT COUNT(*) as count FROM llm_configs WHERE isActive = 1")
    if (activeResults[0].count === 0) {
      await sequelize.query("UPDATE llm_configs SET isActive = 1 ORDER BY updatedAt DESC LIMIT 1")
      console.log('✓ 设置了默认活跃配置')
    }

    console.log('✓ llm_configs表初始化完成')
  } catch (error) {
    console.error('初始化llm_configs表失败:', error)
  }
}

export default initLLMConfigsTable