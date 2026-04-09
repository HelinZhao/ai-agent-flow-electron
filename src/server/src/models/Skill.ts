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

export class Skill
  extends Model<SkillAttributes, SkillCreationAttributes>
  implements SkillAttributes
{
  public id!: string
  public name!: string
  public description!: string
  public content!: string
  public createdAt!: Date
  public updatedAt!: Date
}

Skill.init(
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
