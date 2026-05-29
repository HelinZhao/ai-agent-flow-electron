import { DataTypes, Model } from 'sequelize'
import sequelize from '../database'
import { v4 as uuidv4 } from 'uuid'

export interface UsageLogAttributes {
  id: string
  executionId: string
  nodeId?: string
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  createdAt: Date
  updatedAt: Date
}

export interface UsageLogCreationAttributes extends Omit<UsageLogAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class UsageLogModel extends Model<UsageLogAttributes, UsageLogCreationAttributes> implements UsageLogAttributes {
  declare id: string
  declare executionId: string
  declare nodeId?: string
  declare provider: string
  declare model: string
  declare promptTokens: number
  declare completionTokens: number
  declare totalTokens: number
  declare createdAt: Date
  declare updatedAt: Date
}

UsageLogModel.init({
  id: { type: DataTypes.UUID, defaultValue: () => uuidv4(), primaryKey: true },
  executionId: { type: DataTypes.STRING, allowNull: false },
  nodeId: { type: DataTypes.STRING, allowNull: true },
  provider: { type: DataTypes.STRING, allowNull: false },
  model: { type: DataTypes.STRING, allowNull: false },
  promptTokens: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  completionTokens: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  totalTokens: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  createdAt: { type: DataTypes.DATE, allowNull: false },
  updatedAt: { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize,
  tableName: 'usage_logs',
  indexes: [
    { fields: ['executionId'] },
    { fields: ['provider', 'model'] },
    { fields: ['createdAt'] },
  ],
})
