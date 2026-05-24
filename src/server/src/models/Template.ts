import { DataTypes, Model } from 'sequelize'
import sequelize from '../database'
import { v4 as uuidv4 } from 'uuid'

export interface TemplateAttributes {
  id: string
  name: string
  description: string
  type: 'api' | 'mcp' | 'code' | 'workflow' | 'agent' | 'skill'
  category: string
  icon: string
  content: string
  author: string
  version: string
  createdAt: Date
  updatedAt: Date
}

export interface TemplateCreationAttributes extends Omit<TemplateAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export class TemplateModel extends Model<TemplateAttributes, TemplateCreationAttributes> implements TemplateAttributes {
  declare id: string
  declare name: string
  declare description: string
  declare type: 'api' | 'mcp' | 'code' | 'workflow' | 'agent' | 'skill'
  declare category: string
  declare icon: string
  declare content: string
  declare author: string
  declare version: string
  declare createdAt: Date
  declare updatedAt: Date
}

TemplateModel.init({
  id: { type: DataTypes.UUID, defaultValue: () => uuidv4(), primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  icon: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  author: { type: DataTypes.STRING, allowNull: false, defaultValue: 'system' },
  version: { type: DataTypes.STRING, allowNull: false, defaultValue: '1.0.0' },
  createdAt: { type: DataTypes.DATE, allowNull: false },
  updatedAt: { type: DataTypes.DATE, allowNull: false },
}, {
  sequelize,
  tableName: 'templates',
  indexes: [{ unique: true, fields: ['name', 'type'] }],
})
