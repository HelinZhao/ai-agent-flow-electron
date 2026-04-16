import { DataTypes, Model } from 'sequelize'
import sequelize from '../database'

export interface SkillAttributes {
  id: string
  name: string
  description: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface SkillCreationAttributes extends Omit<
  SkillAttributes,
  'id' | 'createdAt' | 'updatedAt'
> {}

export class SkillModel
  extends Model<SkillAttributes, SkillCreationAttributes>
  implements SkillAttributes
{
  declare id: string
  declare name: string
  declare description: string
  declare content: string
  declare createdAt: Date
  declare updatedAt: Date
}

SkillModel.init(
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
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
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
    tableName: 'skills',
    timestamps: true
  }
)
