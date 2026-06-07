import { DataTypes, Model } from 'sequelize'
import sequelize from '../database'
import type { ModelCapability } from '../llm-capabilities'
import { safeJsonParse } from '../utils/shared'

export interface LLMConfigAttributes {
  id: string
  name: string
  provider: string
  apiKey: string
  model: string
  baseUrl?: string
  temperature?: number
  maxTokens?: number
  capabilities?: ModelCapability[]
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
  declare provider: string
  declare apiKey: string
  declare model: string
  declare baseUrl?: string
  declare temperature?: number
  declare maxTokens?: number
  declare capabilities?: ModelCapability[]
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
    // 数据库中存 JSON 字符串，通过 toJSON 转换（见下方 hook）
    capabilities: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '["text"]',
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
    timestamps: true,
    hooks: {
      beforeSave(instance) {
        const caps = instance.getDataValue('capabilities')
        if (caps && Array.isArray(caps)) {
          instance.setDataValue('capabilities', JSON.stringify(caps) as any)
        }
      }
    }
  }
)

// 返回给客户端时自动反序列化 capabilities JSON 字符串
const origToJSON = LLMConfigModel.prototype.toJSON
LLMConfigModel.prototype.toJSON = function () {
  const json: Record<string, unknown> = origToJSON ? origToJSON.call(this) as Record<string, unknown> : { ...this.get() }
  if (typeof json.capabilities === 'string') {
     json.capabilities = safeJsonParse(json.capabilities, ['text'])
  }
  return json
}
