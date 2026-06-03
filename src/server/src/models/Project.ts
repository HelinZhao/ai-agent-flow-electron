import { DataTypes, Model } from 'sequelize'
import sequelize from '../database'

export interface ProjectAttributes {
  id: string
  name: string
  description: string
  workDir: string
  createdAt: Date
  updatedAt: Date
}

export interface ProjectCreationAttributes extends Omit<
  ProjectAttributes,
  'id' | 'createdAt' | 'updatedAt'
> {}

export class ProjectModel
  extends Model<ProjectAttributes, ProjectCreationAttributes>
  implements ProjectAttributes
{
  declare id: string
  declare name: string
  declare description: string
  declare workDir: string
  declare createdAt: Date
  declare updatedAt: Date
}

ProjectModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    workDir: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'projects',
    timestamps: true,
  },
)
