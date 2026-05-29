import { DataTypes, Model } from 'sequelize'
import sequelize from '../database'

export interface TeamAttributes {
  id: string
  name: string
  description: string
  captainId?: string       // Agent ID as captain
  memberIds: string        // JSON array of Agent IDs
  mode: string             // 'captain_distribute' | 'discuss' | 'pipeline'
  createdAt: Date
  updatedAt: Date
}

export interface TeamCreationAttributes extends Omit<
  TeamAttributes,
  'id' | 'createdAt' | 'updatedAt'
> {}

export class TeamModel
  extends Model<TeamAttributes, TeamCreationAttributes>
  implements TeamAttributes
{
  declare id: string
  declare name: string
  declare description: string
  declare captainId?: string
  declare memberIds: string
  declare mode: string
  declare createdAt: Date
  declare updatedAt: Date
}

TeamModel.init(
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
    captainId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    memberIds: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '[]'
    },
    mode: {
      type: DataTypes.STRING,
      defaultValue: 'captain_distribute'
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
    tableName: 'teams',
    timestamps: true
  }
)
