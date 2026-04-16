import { DataTypes, Model } from 'sequelize'
import sequelize from '../database'

export interface LLMConfigAttributes {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'azure' | 'qwen' | 'longcat'
  apiKey: string
  model: string
  baseUrl?: string
  temperature?: number
  maxTokens?: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface LLMConfigCreationAttributes extends Omit<
  LLMConfigAttributes,
  'id' | 'createdAt' | 'updatedAt'
> {}

export class LLMConfigModel
  extends Model<LLMConfigAttributes, LLMConfigCreationAttributes>
  implements LLMConfigAttributes
{
  declare id: string
  declare name: string
  declare provider: 'openai' | 'anthropic' | 'azure' | 'qwen' | 'longcat'
  declare apiKey: string
  declare model: string
  declare baseUrl?: string
  declare temperature?: number
  declare maxTokens?: number
  declare isActive: boolean
  declare createdAt: Date
  declare updatedAt: Date
}

LLMConfigModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '默认配置'
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false
    },
    apiKey: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false
    },
    baseUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    temperature: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0.7
    },
    maxTokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 2000
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'llm_configs',
    timestamps: true
  }
)
