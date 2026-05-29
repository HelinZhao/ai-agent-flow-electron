export { SkillModel } from './Skill'
export { AgentModel } from './Agent'
export { WorkflowModel } from './Workflow'
export { LLMConfigModel } from './LLMConfig'
export { KnowledgeBaseModel } from './KnowledgeBase'
export { KnowledgeChunkModel } from './KnowledgeChunk'
export { TriggerModel } from './Trigger'
export { McpServerModel } from './McpServer'
export { EnvVarModel } from './EnvironmentVariable'
export { TemplateModel } from './Template'
export { UsageLogModel } from './UsageLog'
export type { SkillAttributes, SkillCreationAttributes } from './Skill'
export type { AgentAttributes, AgentCreationAttributes } from './Agent'
export type { WorkflowAttributes, WorkflowCreationAttributes } from './Workflow'
export type { LLMConfigAttributes, LLMConfigCreationAttributes } from './LLMConfig'
export type { KnowledgeBaseAttributes, KnowledgeBaseCreationAttributes } from './KnowledgeBase'
export type { KnowledgeChunkAttributes, KnowledgeChunkCreationAttributes } from './KnowledgeChunk'
export type { TriggerAttributes, TriggerCreationAttributes } from './Trigger'
export type { McpServerAttributes, McpServerCreationAttributes } from './McpServer'
export type { EnvVarAttributes, EnvVarCreationAttributes } from './EnvironmentVariable'
export type { TemplateAttributes, TemplateCreationAttributes } from './Template'

import { KnowledgeBaseModel } from './KnowledgeBase'
import { KnowledgeChunkModel } from './KnowledgeChunk'

KnowledgeBaseModel.hasMany(KnowledgeChunkModel, {
  foreignKey: 'knowledgeBaseId',
  as: 'chunks',
  onDelete: 'CASCADE'
})
KnowledgeChunkModel.belongsTo(KnowledgeBaseModel, {
  foreignKey: 'knowledgeBaseId',
  as: 'knowledgeBase'
})