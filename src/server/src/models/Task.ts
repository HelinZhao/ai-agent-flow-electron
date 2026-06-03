import { DataTypes, Model } from 'sequelize'
import sequelize from '../database'

export interface TaskAttributes {
  id: string
  title: string
  description: string
  status: string          // draft | pending | assigned | claimed | completed | failed
  priority: number        // 0=low 1=normal 2=high 3=urgent
  claimedBy?: string      // Team ID
  executionId?: string    // 关联的执行 ID
  result?: string         // 成功输出
  error?: string          // 失败消息
  restartedFrom?: string  // 重启前的执行快照（JSON）
  parentId?: string       // 父任务 ID（子任务）
  reviewComment?: string  // 审核意见（驳回时填写）
  projectId?: string      // 关联的项目 ID
  claimedAt?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface TaskCreationAttributes extends Omit<
  TaskAttributes,
  'id' | 'createdAt' | 'updatedAt'
> {}

export class TaskModel
  extends Model<TaskAttributes, TaskCreationAttributes>
  implements TaskAttributes
{
  declare id: string
  declare title: string
  declare description: string
  declare status: string
  declare priority: number
  declare claimedBy?: string
  declare executionId?: string
  declare result?: string
  declare error?: string
  declare restartedFrom?: string
  declare claimedAt?: Date
  declare parentId?: string
  declare reviewComment?: string
  declare projectId?: string
  declare completedAt?: Date
  declare createdAt: Date
  declare updatedAt: Date
}

TaskModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    claimedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    executionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    result: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    restartedFrom: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reviewComment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    claimedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
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
  },
  {
    sequelize,
    tableName: 'tasks',
    timestamps: true,
  },
)
