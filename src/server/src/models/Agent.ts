import { DataTypes, Model } from 'sequelize'
import sequelize from '../database'

export interface AgentAttributes {
  id: string
  name: string
  description: string
  instructions: string
  type: string
  skillIds?: string
  enabledTools?: string
  workflowId?: string
  isSystem?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AgentCreationAttributes extends Omit<
  AgentAttributes,
  'id' | 'createdAt' | 'updatedAt'
> {}

export class AgentModel
  extends Model<AgentAttributes, AgentCreationAttributes>
  implements AgentAttributes
{
  declare id: string
  declare name: string
  declare description: string
  declare instructions: string
  declare type: string
  declare skillIds?: string
  declare enabledTools?: string
  declare workflowId?: string
  declare isSystem?: boolean
  declare createdAt: Date
  declare updatedAt: Date
}

AgentModel.init(
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
    type: {
      type: DataTypes.STRING,
      defaultValue: 'standard'
    },
    skillIds: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    enabledTools: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    workflowId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
