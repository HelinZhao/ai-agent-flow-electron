import { DataTypes, Model } from 'sequelize'
import sequelize from '../database'

export interface TriggerAttributes {
  id: string
  name: string
  type: 'cron' | 'webhook'
  cronExpression?: string
  targetType: 'workflow' | 'agent' | 'team'
  targetId: string
  input: string
  params?: string
  webhookToken?: string
  enabled: boolean
  nextRunAt?: Date
  lastRunAt?: Date
  lastRunStatus?: 'success' | 'failed' | 'running'
  createdAt: Date
  updatedAt: Date
}

export interface TriggerCreationAttributes extends Omit<
  TriggerAttributes,
  'id' | 'createdAt' | 'updatedAt'
> { }

export class TriggerModel
  extends Model<TriggerAttributes, TriggerCreationAttributes>
  implements TriggerAttributes {
  declare id: string
  declare name: string
  declare type: 'cron' | 'webhook'
  declare cronExpression?: string
  declare targetType: 'workflow' | 'agent'
  declare targetId: string
  declare input: string
  declare params?: string
  declare webhookToken?: string
  declare enabled: boolean
  declare nextRunAt?: Date
  declare lastRunAt?: Date
  declare lastRunStatus?: 'success' | 'failed' | 'running'
  declare createdAt: Date
  declare updatedAt: Date
}

TriggerModel.init(
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
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isIn: [['cron', 'webhook']] }
    },
    cronExpression: {
      type: DataTypes.STRING,
      allowNull: true
    },
    targetType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isIn: [['workflow', 'agent']] }
    },
    targetId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    input: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ''
    },
    params: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    webhookToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    nextRunAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastRunAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastRunStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isIn: [['success', 'failed', 'running']] }
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
    tableName: 'triggers',
    timestamps: true
  }
)
