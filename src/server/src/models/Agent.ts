import { DataTypes, Model } from 'sequelize'
import sequelize from '../database'

export interface AgentAttributes {
  id: string
  name: string
  description: string
  instructions: string
  workflowId?: string
  createdAt: Date
  updatedAt: Date
}

export interface AgentCreationAttributes extends Omit<
  AgentAttributes,
  'id' | 'createdAt' | 'updatedAt'
> {}

export class Agent
  extends Model<AgentAttributes, AgentCreationAttributes>
  implements AgentAttributes
{
  declare id: string
  declare name: string
  declare description: string
  declare instructions: string
  declare workflowId?: string
  declare createdAt: Date
  declare updatedAt: Date
}

Agent.init(
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
    instructions: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    workflowId: {
      type: DataTypes.UUID,
      allowNull: true
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
    tableName: 'agents',
    timestamps: true
  }
)
