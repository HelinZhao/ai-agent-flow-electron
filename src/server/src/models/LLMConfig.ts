import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

export interface LLMConfigAttributes {
  id: string;
  provider: 'openai' | 'anthropic' | 'azure' | 'qwen' | 'longcat';
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LLMConfigCreationAttributes extends Omit<LLMConfigAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class LLMConfig extends Model<LLMConfigAttributes, LLMConfigCreationAttributes> implements LLMConfigAttributes {
  public id!: string;
  public provider!: 'openai' | 'anthropic' | 'azure' | 'qwen' | 'longcat';
  public apiKey!: string;
  public model!: string;
  public baseUrl?: string;
  public temperature?: number;
  public maxTokens?: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

LLMConfig.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  apiKey: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  baseUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  temperature: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0.7,
  },
  maxTokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 2000,
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
  tableName: 'llm_configs',
  timestamps: true,
});