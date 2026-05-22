export interface NodeDef {
  type: string
  shortLabel: string
  defaultLabel: string
  color: string
  category: 'basic' | 'logic' | 'integration'
  hasTargetHandle: boolean
  hasSourceHandle: boolean
  icon: string
}

export const NODE_DEFS: NodeDef[] = [
  { type: 'start', shortLabel: '开始', defaultLabel: '开始节点', color: 'green', category: 'basic', hasTargetHandle: false, hasSourceHandle: true, icon: '▶️' },
  { type: 'skill', shortLabel: '技能', defaultLabel: '技能节点', color: 'blue', category: 'logic', hasTargetHandle: true, hasSourceHandle: true, icon: '📋' },
  { type: 'branch', shortLabel: '分支', defaultLabel: '分支节点', color: 'yellow', category: 'logic', hasTargetHandle: true, hasSourceHandle: true, icon: '🔀' },
  { type: 'llm', shortLabel: 'LLM', defaultLabel: 'LLM节点', color: 'indigo', category: 'logic', hasTargetHandle: true, hasSourceHandle: true, icon: '🧠' },
  { type: 'api', shortLabel: 'API', defaultLabel: 'API节点', color: 'purple', category: 'integration', hasTargetHandle: true, hasSourceHandle: true, icon: '🌐' },
  { type: 'mcp', shortLabel: 'MCP', defaultLabel: 'MCP节点', color: 'purple', category: 'integration', hasTargetHandle: true, hasSourceHandle: true, icon: '🔌' },
  { type: 'code', shortLabel: '代码', defaultLabel: '代码节点', color: 'rose', category: 'logic', hasTargetHandle: true, hasSourceHandle: true, icon: '💻' },
  { type: 'note', shortLabel: '注释', defaultLabel: '注释节点', color: 'yellow', category: 'basic', hasTargetHandle: false, hasSourceHandle: false, icon: '📌' },
  { type: 'agent', shortLabel: 'Agent', defaultLabel: 'Agent节点', color: 'red', category: 'integration', hasTargetHandle: true, hasSourceHandle: true, icon: '🤖' },
  { type: 'subWorkflow', shortLabel: '子工作流', defaultLabel: '子工作流节点', color: 'cyan', category: 'integration', hasTargetHandle: true, hasSourceHandle: true, icon: '🔗' },
  { type: 'cli', shortLabel: 'CLI', defaultLabel: 'CLI节点', color: 'orange', category: 'integration', hasTargetHandle: true, hasSourceHandle: true, icon: '💻' },
  { type: 'text', shortLabel: '文本', defaultLabel: '文本节点', color: 'teal', category: 'logic', hasTargetHandle: true, hasSourceHandle: true, icon: '📝' },
  { type: 'end', shortLabel: '结束', defaultLabel: '结束节点', color: 'gray', category: 'basic', hasTargetHandle: true, hasSourceHandle: false, icon: '⏹️' },
]

export const NODE_DEFS_MAP: Record<string, NodeDef> = Object.fromEntries(NODE_DEFS.map(n => [n.type, n]))

export const NODE_CATEGORIES = [
  { key: 'basic', label: '基础节点' },
  { key: 'logic', label: '逻辑节点' },
  { key: 'integration', label: '集成节点' },
]

export const getNodeDefaultLabel = (type: string): string => NODE_DEFS_MAP[type]?.defaultLabel ?? '未知节点'