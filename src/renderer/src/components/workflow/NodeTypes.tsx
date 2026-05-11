import { Handle, Position } from '@xyflow/react';
import { NODE_DEFS_MAP } from './nodes';
import { useContext } from 'react';
import { LayoutDirectionContext } from './LayoutDirectionContext';

export function StartNode({ data }: { data: any }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['start']
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  return (
    <div className={`react-flow__node node-start group relative px-4 py-3 min-w-[120px] bg-gradient-to-br from-${def.color}-500 to-${def.color}-600 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300  border border-${def.color}-300`}>
      <Handle type="source" position={sourcePos} className={`!w-3 !h-3 !bg-white !border-2 !border-${def.color}-500 !rounded-full`} />
      <div className="text-center">
        <div className="text-black text-lg mb-1">{def.icon}</div>
        <div className="font-bold text-gray-800 text-sm">{def.shortLabel}</div>
        <div className="text-xs text-gray-700 font-medium mt-1">{data.label}</div>
      </div>
      <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 rounded-lg`}></div>
    </div>
  );
}

export function SkillNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['skill']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  return (
    <div className={`react-flow__node node-skill group relative px-4 py-3 min-w-[160px] bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300  border border-slate-600 ${selected ? 'ring-2 ring-' + def.color + '-400 shadow-2xl' : ''}`}>
      <Handle type="target" position={targetPos} className={`!w-3 !h-3 !bg-${def.color}-400 !border-2 !border-white !rounded-full`} />
      <Handle type="source" position={sourcePos} className={`!w-3 !h-3 !bg-${def.color}-400 !border-2 !border-white !rounded-full`} />
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 bg-gradient-to-br from-${def.color}-400 to-${def.color}-600 rounded-lg flex items-center justify-center shadow-lg border border-${def.color}-300`}>
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-black/90 font-medium mt-0.5">{data.label}</div>
          {data.config?.skillName && (
            <div className="text-xs text-gray-700 font-medium mt-1 px-2 py-0.5 bg-white/30 rounded border border-white/40">
              技能: {data.config.skillName}
            </div>
          )}
        </div>
      </div>
      <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-${def.color}-400/10 to-transparent opacity-0 transition-opacity duration-300 rounded-lg`}></div>
    </div>
  );
}

export function BranchNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['branch']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  const branches = data.config?.branches || [
    { id: 'branch1', label: '条件1', condition: '' },
    { id: 'branch2', label: '条件2', condition: '' }
  ];

  return (
    <div className={`react-flow__node node-branch group relative px-4 py-3 min-w-[160px] bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300  border border-amber-400 ${selected ? 'ring-2 ring-amber-300 shadow-2xl' : ''}`}>
      <Handle type="target" position={targetPos} className="!w-3 !h-3 !bg-white !border-2 !border-amber-500 !rounded-full" />
      <Handle type="source" position={sourcePos} className="!w-3 !h-3 !bg-white !border-2 !border-amber-500 !rounded-full" />
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-300 to-orange-400 rounded-lg flex items-center justify-center shadow-lg border border-amber-200">
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
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 rounded-lg"></div>
    </div>
  );
}

export function ApiNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['api']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  return (
    <div className={`react-flow__node node-api group relative px-4 py-3 min-w-[160px] bg-gradient-to-br from-purple-600 to-indigo-700 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300  border border-purple-500 ${selected ? 'ring-2 ring-purple-300 shadow-2xl' : ''}`}>
      <Handle type="target" position={targetPos} className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-white !rounded-full" />
      <Handle type="source" position={sourcePos} className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-white !rounded-full" />
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center shadow-lg border border-purple-300">
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-gray-700 font-medium mt-0.5">{data.label}</div>
          {data.config?.apiConfig?.url && (
            <div className="text-xs text-gray-700 font-medium mt-1 px-2 py-0.5 bg-white/30 rounded border border-white/40 max-w-[140px] truncate">
              {data.config.apiConfig.method} {data.config.apiConfig.url}
            </div>
          )}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent opacity-0 transition-opacity duration-300 rounded-lg"></div>
    </div>
  );
}

export function LLMNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['llm']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  return (
    <div className={`react-flow__node node-llm group relative px-4 py-3 min-w-[160px] bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300  border border-violet-500 ${selected ? 'ring-2 ring-violet-300 shadow-2xl' : ''}`}>
      <Handle type="target" position={targetPos} className="!w-3 !h-3 !bg-fuchsia-400 !border-2 !border-white !rounded-full" />
      <Handle type="source" position={sourcePos} className="!w-3 !h-3 !bg-fuchsia-400 !border-2 !border-white !rounded-full" />
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg border border-indigo-300">
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-gray-700 font-medium mt-0.5">{data.label}</div>
          {data.config?.prompt && (
            <div className="text-xs text-gray-700 font-medium mt-1 px-2 py-0.5 bg-white/30 rounded border border-white/40 max-w-[140px] truncate">
              提示词: {data.config.prompt.substring(0, 20)}...
            </div>
          )}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-fuchsia-400/10 to-transparent opacity-0 transition-opacity duration-300 rounded-lg"></div>
    </div>
  );
}

export function AgentNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['agent']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  return (
    <div className={`react-flow__node node-agent group relative px-4 py-3 min-w-[160px] bg-gradient-to-br from-red-600 to-rose-700 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300  border border-red-500 ${selected ? 'ring-2 ring-red-300 shadow-2xl' : ''}`}>
      <Handle type="target" position={targetPos} className="!w-3 !h-3 !bg-orange-400 !border-2 !border-white !rounded-full" />
      <Handle type="source" position={sourcePos} className="!w-3 !h-3 !bg-orange-400 !border-2 !border-white !rounded-full" />
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center shadow-lg border border-orange-300">
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-gray-700 font-medium mt-0.5">{data.label}</div>
          {data.config?.agentName && (
            <div className="text-xs text-gray-700 font-medium mt-1 px-2 py-0.5 bg-white/30 rounded border border-white/40">
              Agent: {data.config.agentName}
            </div>
          )}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/10 to-transparent opacity-0 transition-opacity duration-300 rounded-lg"></div>
    </div>
  );
}

export function CliNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['cli']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  return (
    <div className={`react-flow__node node-cli group relative px-4 py-3 min-w-[160px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300  border border-slate-700 ${selected ? 'ring-2 ring-slate-500 shadow-2xl' : ''}`}>
      <Handle type="target" position={targetPos} className="!w-3 !h-3 !bg-green-400 !border-2 !border-white !rounded-full" />
      <Handle type="source" position={sourcePos} className="!w-3 !h-3 !bg-green-400 !border-2 !border-white !rounded-full" />
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-lg border border-orange-300">
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-gray-700 font-medium mt-0.5">{data.label}</div>
          {data.config?.cliConfig?.command && (
            <div className="text-xs text-gray-700 font-medium mt-1 px-2 py-0.5 bg-white/30 rounded border border-white/40 max-w-[140px] truncate font-mono">
              {data.config.cliConfig.command.substring(0, 25)}...
            </div>
          )}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/10 to-transparent opacity-0 transition-opacity duration-300 rounded-lg"></div>
    </div>
  );
}

export function TextNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['text']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  const sourcePos = direction === 'vertical' ? Position.Bottom : Position.Right
  return (
    <div className={`react-flow__node node-text group relative px-4 py-3 min-w-[160px] bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300  border border-teal-400 ${selected ? 'ring-2 ring-teal-300 shadow-2xl' : ''}`}>
      <Handle type="target" position={targetPos} className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white !rounded-full" />
      <Handle type="source" position={sourcePos} className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white !rounded-full" />
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg border border-blue-300">
          <span className="text-black text-base">{def.icon}</span>
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-gray-800">{def.shortLabel}</div>
          <div className="text-xs text-gray-700 font-medium mt-0.5">{data.label}</div>
          {data.config?.text && (
            <div className="text-xs text-gray-700 font-medium mt-1 px-2 py-0.5 bg-white/30 rounded border border-white/40 max-w-[140px] truncate">
              文本: {data.config.text.substring(0, 20)}...
            </div>
          )}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent opacity-0 transition-opacity duration-300 rounded-lg"></div>
    </div>
  );
}

export function EndNode({ data }: { data: any }): React.JSX.Element {
  const direction = useContext(LayoutDirectionContext)
  const def = NODE_DEFS_MAP['end']
  const targetPos = direction === 'vertical' ? Position.Top : Position.Left
  return (
    <div className={`react-flow__node node-end group relative px-4 py-3 min-w-[120px] bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300  border border-gray-500`}>
      <Handle type="target" position={targetPos} className="!w-3 !h-3 !bg-white !border-2 !border-gray-500 !rounded-full" />
      <div className="text-center">
        <div className="text-black text-lg mb-1">{def.icon}</div>
        <div className="font-bold text-gray-800 text-sm">{def.shortLabel}</div>
        <div className="text-xs text-gray-700 font-medium mt-1">{data.label}</div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 rounded-lg"></div>
    </div>
  );
}