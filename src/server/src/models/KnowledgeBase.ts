import { DataTypes, Model } from 'sequelize'
import sequelize from '../database'

export interface KnowledgeBaseAttributes {
  id: string
  name: string
  description: string
  type: 'internal' | 'external'
  // 内部知识库配置
  embeddingModel: string
  chunkSize: number
  chunkOverlap: number
  topK: number
  // 外部知识库配置
  provider: string
  apiUrl: string
  apiKey: string
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgeBaseCreationAttributes extends Omit<
  KnowledgeBaseAttributes,
  'id' | 'createdAt' | 'updatedAt'
> {}

export class KnowledgeBaseModel
  extends Model<KnowledgeBaseAttributes, KnowledgeBaseCreationAttributes>
  implements KnowledgeBaseAttributes
{
  declare id: string
  declare name: string
  declare description: string
  declare type: 'internal' | 'external'
  declare embeddingModel: string
  declare chunkSize: number
  declare chunkOverlap: number
  declare topK: number
  declare provider: string
  declare apiUrl: string
  declare apiKey: string
  declare createdAt: Date
  declare updatedAt: Date
}

KnowledgeBaseModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ''
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'internal'
    },
    embeddingModel: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'text-embedding-3-small'
    },
    chunkSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 500
    },
    chunkOverlap: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50
    },
    topK: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'generic'
    },
    apiUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
    },
    apiKey: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
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
    tableName: 'knowledge_bases',
    timestamps: true
  }
)