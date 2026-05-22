import { Handle, Position } from '@xyflow/react';
import { NODE_DEFS_MAP } from './nodes';
import { useContext } from 'react';
import { LayoutDirectionContext } from './LayoutDirectionContext';

// -- 节点颜色片段（集中拼装，避免各节点重复计算） --

function nodeBg(def: { color: string }) {
  return `bg-${def.color}-100`
}
function nodeBorder(def: { color: string }) {
  return `border border-${def.color}-300`
}
function nodeRing(def: { color: string }) {
  return `ring-2 ring-${def.color}-400 shadow-glow-lg dark:shadow-glow-lg-w`
}
function handleClass(def: { color: string }) {
  return `!w-3 !h-3 !bg-${def.color}-400 !border-2 !border-white !rounded-full`
}
function iconBox(def: { color: string }) {
  return `w-10 h-10 bg-gradient-to-br from-${def.color}-400 to-${def.color}-600 rounded-lg flex items-center justify-center shadow-lg border border-${def.color}-300`
}

// ============================================================
//  StartNode
// ============================================================
export function StartNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['start']
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  const paramsCount = data.config?.params?.length || 0
  return (
    <div className={`node-start group relative px-4 py-3 min-w-[160px] ${nodeBg(def)} rounded-lg transition-shadowduration-300 ${nodeBorder(def)} ${selected ? nodeRing(def) : 'hover:shadow-glow-md dark:hover:shadow-glow-md-w'}`}>
      <Handle type="source" position={sourcePos} className={handleClass(def)} />
      <div className="flex items-center space-x-3">
        <div className={iconBox(def)}>
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-gray-700 font-medium mt-0.5">{data.label}</div>
          {paramsCount > 0 && (
            <div className="inline-block text-xs text-green-700 font-medium mt-1 bg-green-100/50 rounded">{paramsCount} 个参数</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  SkillNode
// ============================================================
export function SkillNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['skill']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  return (
    <div className={`node-skill group relative px-4 py-3 min-w-[160px] ${nodeBg(def)} rounded-lg transition-shadowduration-300 ${nodeBorder(def)} ${selected ? nodeRing(def) : 'hover:shadow-glow-md dark:hover:shadow-glow-md-w'}`}>
      <Handle type="target" position={targetPos} className={handleClass(def)} />
      <Handle type="source" position={sourcePos} className={handleClass(def)} />
      <div className="flex items-center space-x-3">
        <div className={iconBox(def)}>
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-black/90 font-medium mt-0.5">{data.label}</div>
          {data.config?.skillName && (
            <div className="text-xs text-gray-700 font-medium mt-1 bg-white/30 rounded border border-white/40 max-w-[140px] truncate">
              技能: {data.config.skillName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  BranchNode
// ============================================================
export function BranchNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['branch']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  const branches = data.config?.branches || [
    { id: 'branch1', label: '条件1', condition: 'hover:shadow-glow-md dark:hover:shadow-glow-md-w' },
    { id: 'branch2', label: '条件2', condition: 'hover:shadow-glow-md dark:hover:shadow-glow-md-w' }
  ];

  return (
    <div className={`node-branch group relative px-4 py-3 min-w-[160px] ${nodeBg(def)} rounded-lg transition-shadowduration-300 ${nodeBorder(def)} ${selected ? nodeRing(def) : 'hover:shadow-glow-md dark:hover:shadow-glow-md-w'}`}>
      <Handle type="target" position={targetPos} className={handleClass(def)} />
      <Handle type="source" position={sourcePos} className={handleClass(def)} />
      <div className="flex items-center space-x-3">
        <div className={iconBox(def)}>
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-black/90 font-medium mt-0.5">{data.label}</div>
          <div className="text-xs text-gray-700 font-medium mt-1">
            {branches.length} 个分支
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  ApiNode
// ============================================================
export function ApiNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['api']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  return (
    <div className={`node-api group relative px-4 py-3 min-w-[160px] ${nodeBg(def)} rounded-lg transition-shadowduration-300 ${nodeBorder(def)} ${selected ? nodeRing(def) : 'hover:shadow-glow-md dark:hover:shadow-glow-md-w'}`}>
      <Handle type="target" position={targetPos} className={handleClass(def)} />
      <Handle type="source" position={sourcePos} className={handleClass(def)} />
      <div className="flex items-center space-x-3">
        <div className={iconBox(def)}>
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-gray-700 font-medium mt-0.5">{data.label}</div>
          {data.config?.apiConfig?.url && (
            <div className="text-xs text-gray-700 font-medium mt-1 bg-white/30 rounded border border-white/40 max-w-[140px] truncate">
              {data.config.apiConfig.method} {data.config.apiConfig.url}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  McpNode
// ============================================================
export function McpNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['mcp']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  return (
    <div className={`node-mcp group relative px-4 py-3 min-w-[160px] ${nodeBg(def)} rounded-lg transition-shadowduration-300 ${nodeBorder(def)} ${selected ? nodeRing(def) : 'hover:shadow-glow-md dark:hover:shadow-glow-md-w'}`}>
      <Handle type="target" position={targetPos} className={handleClass(def)} />
      <Handle type="source" position={sourcePos} className={handleClass(def)} />
      <div className="flex items-center space-x-3">
        <div className={iconBox(def)}>
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-gray-700 font-medium mt-0.5">{data.label}</div>
          {data.config?.mcpConfig?.toolName && (
            <div className="text-xs text-gray-700 font-medium mt-1 bg-white/30 rounded border border-white/40 max-w-[140px] truncate">
              {data.config.mcpConfig.serverName || data.config.mcpConfig.serverId}: {data.config.mcpConfig.toolName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  LLMNode
// ============================================================
export function LLMNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['llm']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  return (
    <div className={`node-llm group relative px-4 py-3 min-w-[160px] ${nodeBg(def)} rounded-lg transition-shadowduration-300 ${nodeBorder(def)} ${selected ? nodeRing(def) : 'hover:shadow-glow-md dark:hover:shadow-glow-md-w'}`}>
      <Handle type="target" position={targetPos} className={handleClass(def)} />
      <Handle type="source" position={sourcePos} className={handleClass(def)} />
      <div className="flex items-center space-x-3">
        <div className={iconBox(def)}>
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-gray-700 font-medium mt-0.5">{data.label}</div>
          {data.config?.prompt && (
            <div className="text-xs text-gray-700 font-medium mt-1 bg-white/30 rounded border border-white/40 max-w-[140px] truncate">
              提示词: {data.config.prompt.substring(0, 20)}...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  AgentNode
// ============================================================
export function AgentNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['agent']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  return (
    <div className={`node-agent group relative px-4 py-3 min-w-[160px] ${nodeBg(def)} rounded-lg transition-shadowduration-300 ${nodeBorder(def)} ${selected ? nodeRing(def) : 'hover:shadow-glow-md dark:hover:shadow-glow-md-w'}`}>
      <Handle type="target" position={targetPos} className={handleClass(def)} />
      <Handle type="source" position={sourcePos} className={handleClass(def)} />
      <div className="flex items-center space-x-3">
        <div className={iconBox(def)}>
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-gray-700 font-medium mt-0.5">{data.label}</div>
          {data.config?.agentName && (
            <div className="text-xs text-gray-700 font-medium mt-1 bg-white/30 rounded border border-white/40">
              Agent: {data.config.agentName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  SubWorkflow
// ============================================================
export function SubWorkflow({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['subWorkflow']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  return (
    <div className={`node-subworkflow group relative px-4 py-3 min-w-[160px] ${nodeBg(def)} rounded-lg transition-shadowduration-300 ${nodeBorder(def)} ${selected ? nodeRing(def) : 'hover:shadow-glow-md dark:hover:shadow-glow-md-w'}`}>
      <Handle type="target" position={targetPos} className={handleClass(def)} />
      <Handle type="source" position={sourcePos} className={handleClass(def)} />
      <div className="flex items-center space-x-3">
        <div className={iconBox(def)}>
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-gray-700 font-medium mt-0.5">{data.label}</div>
          {data.config?.workflowName && (
            <div className="text-xs text-gray-700 font-medium mt-1 bg-white/30 rounded border border-white/40 max-w-[140px] truncate">
              工作流: {data.config.workflowName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  CliNode
// ============================================================
export function CliNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['cli']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  return (
    <div className={`node-cli group relative px-4 py-3 min-w-[160px] ${nodeBg(def)} rounded-lg transition-shadowduration-300 ${nodeBorder(def)} ${selected ? nodeRing(def) : 'hover:shadow-glow-md dark:hover:shadow-glow-md-w'}`}>
      <Handle type="target" position={targetPos} className={handleClass(def)} />
      <Handle type="source" position={sourcePos} className={handleClass(def)} />
      <div className="flex items-center space-x-3">
        <div className={iconBox(def)}>
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-gray-700 font-medium mt-0.5">{data.label}</div>
          {data.config?.cliConfig?.command && (
            <div className="text-xs text-gray-700 font-medium mt-1 bg-white/30 rounded border border-white/40 max-w-[140px] truncate font-mono">
              {data.config.cliConfig.command.substring(0, 25)}...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  TextNode
// ============================================================
export function TextNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['text']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  return (
    <div className={`node-text group relative px-4 py-3 min-w-[160px] ${nodeBg(def)} rounded-lg transition-shadowduration-300 ${nodeBorder(def)} ${selected ? nodeRing(def) : 'hover:shadow-glow-md dark:hover:shadow-glow-md-w'}`}>
      <Handle type="target" position={targetPos} className={handleClass(def)} />
      <Handle type="source" position={sourcePos} className={handleClass(def)} />
      <div className="flex items-center space-x-3">
        <div className={iconBox(def)}>
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-gray-700 font-medium mt-0.5">{data.label}</div>
          {data.config?.text && (
            <div className="text-xs text-gray-700 font-medium mt-1 bg-white/30 rounded border border-white/40 max-w-[140px] truncate">
              文本: {data.config.text.substring(0, 20)}...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  CodeNode
// ============================================================
export function CodeNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['code']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  const codePreview = data.config?.code
    ? data.config.code.split('\n').slice(0, 2).join('\n')
    : undefined

  return (
    <div className={`node-code group relative px-4 py-3 min-w-[160px] ${nodeBg(def)} rounded-lg transition-shadowduration-300 ${nodeBorder(def)} ${selected ? nodeRing(def) : 'hover:shadow-glow-md dark:hover:shadow-glow-md-w'}`}>
      <Handle type="target" position={targetPos} className={handleClass(def)} />
      <Handle type="source" position={sourcePos} className={handleClass(def)} />
      <div className="flex items-center space-x-3">
        <div className={iconBox(def)}>
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-black/90 font-medium mt-0.5">{data.label}</div>
          {codePreview && (
            <div className="text-xs text-gray-700 font-medium mt-1 bg-white/30 rounded border border-white/40 max-w-[140px] truncate font-mono">
              {codePreview}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  LoopNode
// ============================================================
export function LoopNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['loop']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  const maxIter = data.config?.maxIterations || 100
  const wfName = data.config?.workflowName
  return (
    <div className={`node-loop group relative px-4 py-3 min-w-[160px] ${nodeBg(def)} rounded-lg transition-shadowduration-300 ${nodeBorder(def)} ${selected ? nodeRing(def) : 'hover:shadow-glow-md dark:hover:shadow-glow-md-w'}`}>
      <Handle type="target" position={targetPos} className={handleClass(def)} />
      <Handle type="source" position={sourcePos} className={handleClass(def)} />
      <div className="flex items-center space-x-3">
        <div className={iconBox(def)}>
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-gray-700 font-medium mt-0.5">{data.label}</div>
          {wfName ? (
            <div className="text-xs text-gray-700 font-medium mt-1 bg-white/30 rounded border border-white/40 max-w-[140px] truncate">
              工作流: {wfName}
            </div>
          ) : (
            <div className="text-xs text-gray-500 font-medium mt-1">最多 {maxIter} 次迭代</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  EndNode
// ============================================================
export function EndNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['end']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  return (
    <div className={`node-end group relative px-4 py-3 min-w-[160px] ${nodeBg(def)} rounded-lg transition-shadowduration-300 ${nodeBorder(def)} ${selected ? nodeRing(def) : 'hover:shadow-glow-md dark:hover:shadow-glow-md-w'}`}>
      <Handle type="target" position={targetPos} className={handleClass(def)} />
      <div className="flex items-center space-x-3">
        <div className={iconBox(def)}>
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-gray-700 font-medium mt-0.5">{data.label}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  CatchNode
// ============================================================
export function CatchNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['catch']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  return (
    <div className={`node-catch group relative px-4 py-3 min-w-[160px] ${nodeBg(def)} rounded-lg transition-shadowduration-300 ${nodeBorder(def)} ${selected ? nodeRing(def) : 'hover:shadow-glow-md dark:hover:shadow-glow-md-w'}`}>
      <Handle type="target" position={targetPos} className={handleClass(def)} />
      <Handle type="source" position={sourcePos} className={handleClass(def)} />
      <div className="flex items-center space-x-3">
        <div className={iconBox(def)}>
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-gray-700 font-medium mt-0.5">{data.label}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  NoteNode
// ============================================================
export function NoteNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const content = data.config?.content || ''
  const preview = content.split('\n').slice(0, 3).join('\n')
  return (
    <div className={`node-note group relative px-4 py-3 min-w-[180px] max-w-[260px] bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700/50 rounded-lg transition-shadowduration-300 ${selected ? 'ring-2 ring-amber-400 shadow-glow-lg dark:shadow-glow-lg-w' : 'hover:shadow-glow-md dark:hover:shadow-glow-md-w'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">📌</span>
        <span className="font-bold text-sm text-amber-800 dark:text-amber-200">{data.label || '注释'}</span>
      </div>
      {preview ? (
        <div className="text-xs text-amber-700 dark:text-amber-300/80 leading-relaxed whitespace-pre-wrap break-words">
          {preview}
          {content.split('\n').length > 3 && <span className="text-amber-500 dark:text-amber-400 font-medium">…</span>}
        </div>
      ) : (
        <div className="text-xs text-amber-400 dark:text-amber-500 italic">双击或右键编辑注释内容</div>
      )}
    </div>
  );
}

