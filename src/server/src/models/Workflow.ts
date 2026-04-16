import { DataTypes, Model } from 'sequelize'
import sequelize from '../database'

export interface WorkflowAttributes {
  id: string
  name: string
  description: string
  nodes: string // JSON string
  edges: string // JSON string
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowCreationAttributes extends Omit<
  WorkflowAttributes,
  'id' | 'createdAt' | 'updatedAt'
> {}

export class WorkflowModel
  extends Model<WorkflowAttributes, WorkflowCreationAttributes>
  implements WorkflowAttributes {
  declare id: string
  declare name: string
  declare description: string
  declare nodes: string
  declare edges: string
  declare createdAt: Date
  declare updatedAt: Date
}

WorkflowModel.init(
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
    nodes: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    edges: {
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
    tableName: 'workflows',
    timestamps: true
  }
)
