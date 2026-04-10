import { DataTypes } from 'sequelize'
import sequelize from './index'
import { LLMConfig } from '../models'

async function migrateDatabase() {
  try {
    console.log('开始数据库迁移...')

    // 检查表是否存在
    const tableExists = await sequelize.getQueryInterface().showAllTables()
    const llmConfigsExists = tableExists.includes('llm_configs')

    if (!llmConfigsExists) {
      console.log('llm_configs 表不存在，创建新表...')
      await LLMConfig.sync({ force: false })
      console.log('llm_configs 表创建成功')
      return
    }

    console.log('llm_configs 表已存在，检查并修复结构...')

    try {
      // 尝试查询现有结构
      const tableDescription = await sequelize.getQueryInterface().describeTable('llm_configs')
      const columns = Object.keys(tableDescription)
      console.log('现有列:', columns)

      // 添加缺失的列
      if (!columns.includes('name')) {
        console.log('添加 name 列...')
        await sequelize.getQueryInterface().addColumn('llm_configs', 'name', {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: '默认配置'
        })
      }

      if (!columns.includes('isActive')) {
        console.log('添加 isActive 列...')
        await sequelize.getQueryInterface().addColumn('llm_configs', 'isActive', {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        })
      }

      // 更新现有数据
      console.log('更新现有数据...')
      await sequelize.query(
        "UPDATE llm_configs SET name = '默认配置', isActive = CASE WHEN id = (SELECT id FROM llm_configs ORDER BY updatedAt DESC LIMIT 1) THEN 1 ELSE 0 END WHERE name IS NULL OR name = '' OR name = '默认配置'"
      )

    } catch (describeError) {
      console.log('describeTable 失败，可能是旧版本表结构，尝试重新创建...')

      // 备份现有数据
      try {
        const existingData = await sequelize.query(
          "SELECT id, provider, apiKey, model, baseUrl, temperature, maxTokens, createdAt, updatedAt FROM llm_configs",
          { type: sequelize.QueryTypes.SELECT }
        )

        console.log(`找到 ${existingData.length} 条现有配置`)

        // 删除旧表
        await sequelize.getQueryInterface().dropTable('llm_configs')

        // 创建新表
        await LLMConfig.sync({ force: true })

        // 恢复数据
        for (const row of existingData) {
          await LLMConfig.create({
            name: `${row.provider}配置`,
            provider: row.provider,
            apiKey: row.apiKey,
            model: row.model,
            baseUrl: row.baseUrl,
            temperature: row.temperature || 0.7,
            maxTokens: row.maxTokens || 2000,
            isActive: false
          })
        }

        // 设置最新的配置为活跃状态
        if (existingData.length > 0) {
          const latestConfig = await LLMConfig.findOne({
            order: [['createdAt', 'DESC']]
          })
          if (latestConfig) {
            await latestConfig.update({ isActive: true })
          }
        }

        console.log('✓ 数据迁移完成')
      } catch (backupError) {
        console.error('数据备份/恢复失败:', backupError)
        // 如果备份失败，至少确保表结构正确
        await LLMConfig.sync({ force: true })
        console.log('✓ 已创建新的空表结构')
      }
    }

    console.log('数据库迁移完成')
  } catch (error) {
    console.error('数据库迁移失败:', error)
    // 不要抛出错误，让应用继续运行
    console.log('尝试创建基础表结构...')
    try {
      await LLMConfig.sync({ force: true })
      console.log('✓ 基础表结构创建成功')
    } catch (finalError) {
      console.error('最终修复失败:', finalError)
    }
  }
}

export default migrateDatabase