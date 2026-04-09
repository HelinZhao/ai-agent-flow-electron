import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

export interface AgentAttributes {
  id: string;
  name: string;
  description: string;
  instructions: string;
  workflowId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentCreationAttributes extends Omit<AgentAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Agent extends Model<AgentAttributes, AgentCreationAttributes> implements AgentAttributes {
  public id!: string;
  public name!: string;
  public description!: string;
  public instructions!: string;
  public workflowId?: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Agent.init({
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
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  workflowId: {
    type: DataTypes.UUID,
    allowNull: true,
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
}, {
  sequelize,
  tableName: 'agents',
  timestamps: true,
});