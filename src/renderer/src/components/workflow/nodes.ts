export interface NodeDef {
  type: string
  shortLabel: string
  defaultLabel: string
  color: string
  category: 'basic' | 'flow' | 'processing' | 'integration'
  hasTargetHandle: boolean
  hasSourceHandle: boolean
  icon: string
}

export const NODE_DEFS: NodeDef[] = [
  // ── 基础节点 ──
  { type: 'start', shortLabel: '开始', defaultLabel: '开始节点', color: 'green', category: 'basic', hasTargetHandle: false, hasSourceHandle: true, icon: '▶️' },
  { type: 'note', shortLabel: '注释', defaultLabel: '注释节点', color: 'yellow', category: 'basic', hasTargetHandle: false, hasSourceHandle: false, icon: '📌' },
  { type: 'end', shortLabel: '结束', defaultLabel: '结束节点', color: 'gray', category: 'basic', hasTargetHandle: true, hasSourceHandle: false, icon: '⏹️' },

  // ── 流程控制 ──
  { type: 'branch', shortLabel: '分支', defaultLabel: '分支节点', color: 'yellow', category: 'flow', hasTargetHandle: true, hasSourceHandle: true, icon: '🔀' },
  { type: 'if', shortLabel: '条件', defaultLabel: '条件节点', color: 'sky', category: 'flow', hasTargetHandle: true, hasSourceHandle: true, icon: '🚦' },
  { type: 'split', shortLabel: '拆分', defaultLabel: '拆分节点', color: 'amber', category: 'flow', hasTargetHandle: true, hasSourceHandle: true, icon: '✂️' },
  { type: 'merge', shortLabel: '聚合', defaultLabel: '聚合节点', color: 'blue', category: 'flow', hasTargetHandle: true, hasSourceHandle: true, icon: '⊞' },
  { type: 'loop', shortLabel: '循环', defaultLabel: '循环节点', color: 'violet', category: 'flow', hasTargetHandle: true, hasSourceHandle: true, icon: '🔄' },
  { type: 'sleep', shortLabel: '睡眠', defaultLabel: '睡眠节点', color: 'slate', category: 'flow', hasTargetHandle: true, hasSourceHandle: true, icon: '⏳' },
  { type: 'catch', shortLabel: '错误处理', defaultLabel: '错误处理节点', color: 'red', category: 'flow', hasTargetHandle: true, hasSourceHandle: true, icon: '🛡️' },

  // ── 数据处理 ──
  { type: 'llm', shortLabel: 'LLM', defaultLabel: 'LLM 节点', color: 'indigo', category: 'processing', hasTargetHandle: true, hasSourceHandle: true, icon: '🧠' },
  { type: 'skill', shortLabel: '技能', defaultLabel: '技能节点', color: 'blue', category: 'processing', hasTargetHandle: true, hasSourceHandle: true, icon: '📋' },
  { type: 'code', shortLabel: '代码', defaultLabel: '代码节点', color: 'rose', category: 'processing', hasTargetHandle: true, hasSourceHandle: true, icon: '💻' },
  { type: 'transform', shortLabel: '转换', defaultLabel: '数据转换节点', color: 'emerald', category: 'processing', hasTargetHandle: true, hasSourceHandle: true, icon: '🔧' },
  { type: 'text', shortLabel: '文本', defaultLabel: '文本节点', color: 'teal', category: 'processing', hasTargetHandle: true, hasSourceHandle: true, icon: '📝' },
  { type: 'variable', shortLabel: '变量', defaultLabel: '变量节点', color: 'slate', category: 'processing', hasTargetHandle: true, hasSourceHandle: true, icon: '📦' },

  // ── 集成节点 ──
  { type: 'api', shortLabel: 'API', defaultLabel: 'API 节点', color: 'purple', category: 'integration', hasTargetHandle: true, hasSourceHandle: true, icon: '🌐' },
  { type: 'mcp', shortLabel: 'MCP', defaultLabel: 'MCP 节点', color: 'purple', category: 'integration', hasTargetHandle: true, hasSourceHandle: true, icon: '🔌' },
  { type: 'cli', shortLabel: 'CLI', defaultLabel: 'CLI 节点', color: 'orange', category: 'integration', hasTargetHandle: true, hasSourceHandle: true, icon: '🖥️' },
  { type: 'database', shortLabel: '数据库', defaultLabel: '数据库查询节点', color: 'violet', category: 'integration', hasTargetHandle: true, hasSourceHandle: true, icon: '🗄️' },
  { type: 'knowledge', shortLabel: '知识库', defaultLabel: '知识库检索节点', color: 'emerald', category: 'integration', hasTargetHandle: true, hasSourceHandle: true, icon: '📚' },
  { type: 'agent', shortLabel: 'Agent', defaultLabel: 'Agent 节点', color: 'red', category: 'integration', hasTargetHandle: true, hasSourceHandle: true, icon: '🤖' },
  { type: 'subWorkflow', shortLabel: '子工作流', defaultLabel: '子工作流节点', color: 'cyan', category: 'integration', hasTargetHandle: true, hasSourceHandle: true, icon: '🔗' },
  { type: 'team', shortLabel: '团队', defaultLabel: '团队协作节点', color: 'indigo', category: 'integration', hasTargetHandle: true, hasSourceHandle: true, icon: '👥' },
]

export const NODE_DEFS_MAP: Record<string, NodeDef> = Object.fromEntries(NODE_DEFS.map(n => [n.type, n]))

export const NODE_CATEGORIES = [
  { key: 'basic', label: '基础节点' },
  { key: 'flow', label: '流程控制' },
  { key: 'processing', label: '数据处理' },
  { key: 'integration', label: '集成节点' },
]

export const getNodeDefaultLabel = (type: string): string => NODE_DEFS_MAP[type]?.defaultLabel ?? '未知节点'