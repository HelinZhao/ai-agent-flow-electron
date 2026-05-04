export interface NodeDef {
  type: string
  shortLabel: string
  defaultLabel: string
  color: string
  category: 'basic' | 'logic' | 'integration'
  hasTargetHandle: boolean
  hasSourceHandle: boolean
}

export const NODE_DEFS: NodeDef[] = [
  { type: 'start', shortLabel: '开始', defaultLabel: '开始节点', color: 'green', category: 'basic', hasTargetHandle: false, hasSourceHandle: true },
  { type: 'skill', shortLabel: '技能', defaultLabel: '技能节点', color: 'blue', category: 'logic', hasTargetHandle: true, hasSourceHandle: true },
  { type: 'branch', shortLabel: '分支', defaultLabel: '分支节点', color: 'yellow', category: 'logic', hasTargetHandle: true, hasSourceHandle: true },
  { type: 'llm', shortLabel: 'LLM', defaultLabel: 'LLM节点', color: 'indigo', category: 'logic', hasTargetHandle: true, hasSourceHandle: true },
  { type: 'api', shortLabel: 'API', defaultLabel: 'API节点', color: 'purple', category: 'integration', hasTargetHandle: true, hasSourceHandle: true },
  { type: 'agent', shortLabel: 'Agent', defaultLabel: 'Agent节点', color: 'red', category: 'integration', hasTargetHandle: true, hasSourceHandle: true },
  { type: 'cli', shortLabel: 'CLI', defaultLabel: 'CLI节点', color: 'orange', category: 'integration', hasTargetHandle: true, hasSourceHandle: true },
  { type: 'end', shortLabel: '结束', defaultLabel: '结束节点', color: 'gray', category: 'basic', hasTargetHandle: true, hasSourceHandle: false },
]

export const NODE_DEFS_MAP: Record<string, NodeDef> = Object.fromEntries(NODE_DEFS.map(n => [n.type, n]))

export const NODE_CATEGORIES = [
  { key: 'basic', label: '基础节点' },
  { key: 'logic', label: '逻辑节点' },
  { key: 'integration', label: '集成节点' },
]

export const COLOR_CLASSES: Record<string, Record<string, string>> = {
  green:   { bg: 'bg-green-100', text: 'text-green-800', textSm: 'text-green-600', textXs: 'text-green-500', textXxs: 'text-green-400', hover: 'hover:bg-green-200' },
  blue:    { bg: 'bg-blue-100',   text: 'text-blue-800',  textSm: 'text-blue-600',  textXs: 'text-blue-500',  textXxs: 'text-blue-400',  hover: 'hover:bg-blue-200' },
  yellow:  { bg: 'bg-yellow-100', text: 'text-yellow-800', textSm: 'text-yellow-600', textXs: 'text-yellow-500', textXxs: 'text-yellow-400', hover: 'hover:bg-yellow-200' },
  indigo:  { bg: 'bg-indigo-100', text: 'text-indigo-800', textSm: 'text-indigo-600', textXs: 'text-indigo-500', textXxs: 'text-indigo-400', hover: 'hover:bg-indigo-200' },
  purple:  { bg: 'bg-purple-100', text: 'text-purple-800', textSm: 'text-purple-600', textXs: 'text-purple-500', textXxs: 'text-purple-400', hover: 'hover:bg-purple-200' },
  red:     { bg: 'bg-red-100',    text: 'text-red-800',   textSm: 'text-red-600',   textXs: 'text-red-500',   textXxs: 'text-red-400',   hover: 'hover:bg-red-200' },
  orange:  { bg: 'bg-orange-100', text: 'text-orange-800', textSm: 'text-orange-600', textXs: 'text-orange-500', textXxs: 'text-orange-400', hover: 'hover:bg-orange-200' },
  gray:    { bg: 'bg-gray-100',   text: 'text-gray-800',  textSm: 'text-gray-600',  textXs: 'text-gray-500',  textXxs: 'text-gray-400',  hover: 'hover:bg-gray-200' },
}

export const getNodeDefaultLabel = (type: string): string => NODE_DEFS_MAP[type]?.defaultLabel ?? '未知节点'