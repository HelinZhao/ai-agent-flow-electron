import { DataTypes, Model } from 'sequelize'
import sequelize from '../database'
import { v4 as uuidv4 } from 'uuid'

export interface McpServerAttributes {
  id: string
  name: string
  transportType: 'stdio' | 'sse'
  command?: string
  args?: string
  url?: string
  enabled: boolean
  connectionStatus: 'connected' | 'disconnected' | 'error'
  toolsCount: number
  lastConnectedAt?: string
  settings?: string
}

export interface McpServerCreationAttributes extends Omit<McpServerAttributes, 'id' | 'connectionStatus' | 'toolsCount'> {}

export class McpServerModel extends Model<McpServerAttributes, McpServerCreationAttributes> implements McpServerAttributes {
  declare id: string
  declare name: string
  declare transportType: 'stdio' | 'sse'
  declare command?: string
  declare args?: string
  declare url?: string
  declare enabled: boolean
  declare connectionStatus: 'connected' | 'disconnected' | 'error'
  declare toolsCount: number
  declare lastConnectedAt?: string
  declare settings?: string
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

McpServerModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    transportType: {
      type: DataTypes.ENUM('stdio', 'sse'),
      allowNull: false,
    },
    command: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    args: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON 数组格式的命令参数',
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    connectionStatus: {
      type: DataTypes.STRING,
      defaultValue: 'disconnected',
    },
    toolsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastConnectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    settings: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON blob 扩展字段，存放额外配置',
    },
  },
  {
    sequelize,
    tableName: 'mcp_servers',
    timestamps: true,
  }
)
