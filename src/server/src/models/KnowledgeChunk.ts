import { DataTypes, Model } from 'sequelize'
import sequelize from '../database'

export interface KnowledgeChunkAttributes {
  id: string
  knowledgeBaseId: string
  content: string
  source: string
  chunkIndex: number
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgeChunkCreationAttributes extends Omit<
  KnowledgeChunkAttributes,
  'id' | 'createdAt' | 'updatedAt'
> {}

// embedding 向量存储在 sqlite-vec 虚拟表中，不在 Sequelize 模型里
export class KnowledgeChunkModel
  extends Model<KnowledgeChunkAttributes, KnowledgeChunkCreationAttributes>
  implements KnowledgeChunkAttributes
{
  declare id: string
  declare knowledgeBaseId: string
  declare content: string
  declare source: string
  declare chunkIndex: number
  declare createdAt: Date
  declare updatedAt: Date
}

KnowledgeChunkModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    knowledgeBaseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'knowledge_bases',
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false
    },
    chunkIndex: {
      type: DataTypes.INTEGER,
      allowNull: false
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
    tableName: 'knowledge_chunks',
    timestamps: true
  }
)