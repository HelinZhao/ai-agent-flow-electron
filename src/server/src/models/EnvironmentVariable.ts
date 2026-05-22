import { DataTypes, Model } from 'sequelize'
import sequelize from '../database'

export interface EnvVarAttributes {
  id: string
  name: string
  value: string
  description: string
  createdAt: Date
  updatedAt: Date
}

export interface EnvVarCreationAttributes extends Omit<
  EnvVarAttributes,
  'id' | 'createdAt' | 'updatedAt'
> {}

export class EnvVarModel
  extends Model<EnvVarAttributes, EnvVarCreationAttributes>
  implements EnvVarAttributes
{
  declare id: string
  declare name: string
  declare value: string
  declare description: string
  declare createdAt: Date
  declare updatedAt: Date
}

EnvVarModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
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
    tableName: 'environment_variables',
    timestamps: true
  }
)
