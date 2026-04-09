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

export class Workflow
  extends Model<WorkflowAttributes, WorkflowCreationAttributes>
  implements WorkflowAttributes
{
  public id!: string
  public name!: string
  public description!: string
  public nodes!: string
  public edges!: string
  public createdAt!: Date
  public updatedAt!: Date
}

Workflow.init(
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
