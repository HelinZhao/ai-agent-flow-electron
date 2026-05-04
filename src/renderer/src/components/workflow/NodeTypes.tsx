import { Handle, Position } from '@xyflow/react';
import { NODE_DEFS_MAP } from './nodes';

export function StartNode({ data }: { data: any }): React.JSX.Element {
  const def = NODE_DEFS_MAP['start']
  return (
    <div className={`react-flow__node node-start px-4 py-2 min-w-[120px] bg-${def.color}-100`}>
      <Handle type="source" position={Position.Right} />
      <div className="text-center">
        <div className={`font-medium text-${def.color}-800`}>{def.shortLabel}</div>
        <div className={`text-xs text-${def.color}-600 mt-1`}>{data.label}</div>
      </div>
    </div>
  );
}

export function SkillNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const def = NODE_DEFS_MAP['skill']
  return (
    <div className={`react-flow__node node-skill px-4 py-2 min-w-[140px] bg-${def.color}-100 ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="text-center">
        <div className={`font-medium text-${def.color}-800`}>{def.defaultLabel}</div>
        <div className={`text-xs text-${def.color}-600 mt-1`}>{data.label}</div>
        {data.config?.skillName && (
          <div className={`text-xs text-${def.color}-500 mt-1`}>技能: {data.config.skillName}</div>
        )}
      </div>
    </div>
  );
}

export function BranchNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const def = NODE_DEFS_MAP['branch']
  const branches = data.config?.branches || [
    { id: 'branch1', label: '条件1', condition: '' },
    { id: 'branch2', label: '条件2', condition: '' }
  ];

  return (
    <div className={`react-flow__node node-branch px-4 py-2 min-w-[140px] bg-${def.color}-100 ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="text-center">
        <div className={`font-medium text-${def.color}-800`}>{def.defaultLabel}</div>
        <div className={`text-xs text-${def.color}-600 mt-1`}>{data.label}</div>
        <div className={`text-xs text-${def.color}-500 mt-1`}>
          {branches.length} 个分支
        </div>
        {branches.length > 0 && (
          <div className={`text-xs text-${def.color}-400 mt-1`}>
            可配置分支条件
          </div>
        )}
      </div>
    </div>
  );
}

export function ApiNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const def = NODE_DEFS_MAP['api']
  return (
    <div className={`react-flow__node node-api px-4 py-2 min-w-[140px] bg-${def.color}-100 ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="text-center">
        <div className={`font-medium text-${def.color}-800`}>{def.defaultLabel}</div>
        <div className={`text-xs text-${def.color}-600 mt-1`}>{data.label}</div>
        {data.config?.apiConfig?.url && (
          <div className={`text-xs text-${def.color}-500 mt-1 max-w-[120px] truncate`}>
            {data.config.apiConfig.method} {data.config.apiConfig.url}
          </div>
        )}
      </div>
    </div>
  );
}

export function LLMNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const def = NODE_DEFS_MAP['llm']
  return (
    <div className={`react-flow__node node-llm px-4 py-2 min-w-[140px] bg-${def.color}-100 ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="text-center">
        <div className={`font-medium text-${def.color}-800`}>{def.defaultLabel}</div>
        <div className={`text-xs text-${def.color}-600 mt-1`}>{data.label}</div>
        {data.config?.prompt && (
          <div className={`text-xs text-${def.color}-500 mt-1 max-w-[120px] truncate`}>
            提示词: {data.config.prompt.substring(0, 20)}...
          </div>
        )}
      </div>
    </div>
  );
}

export function AgentNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const def = NODE_DEFS_MAP['agent']
  return (
    <div className={`react-flow__node node-agent px-4 py-2 min-w-[140px] bg-${def.color}-100 ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="text-center">
        <div className={`font-medium text-${def.color}-800`}>{def.defaultLabel}</div>
        <div className={`text-xs text-${def.color}-600 mt-1`}>{data.label}</div>
        {data.config?.agentName && (
          <div className={`text-xs text-${def.color}-500 mt-1`}>Agent: {data.config.agentName}</div>
        )}
      </div>
    </div>
  );
}

export function CliNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const def = NODE_DEFS_MAP['cli']
  return (
    <div className={`react-flow__node node-cli px-4 py-2 min-w-[140px] bg-${def.color}-100 ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="text-center">
        <div className={`font-medium text-${def.color}-800`}>{def.defaultLabel}</div>
        <div className={`text-xs text-${def.color}-600 mt-1`}>{data.label}</div>
        {data.config?.cliConfig?.command && (
          <div className={`text-xs text-${def.color}-500 mt-1 max-w-[120px] truncate`}>
            {data.config.cliConfig.command.substring(0, 25)}...
          </div>
        )}
      </div>
    </div>
  );
}

export function EndNode({ data }: { data: any }): React.JSX.Element {
  const def = NODE_DEFS_MAP['end']
  return (
    <div className={`react-flow__node node-end px-4 py-2 min-w-[120px] bg-${def.color}-100`}>
      <Handle type="target" position={Position.Left} />
      <div className="text-center">
        <div className={`font-medium text-${def.color}-800`}>{def.shortLabel}</div>
        <div className={`text-xs text-${def.color}-600 mt-1`}>{data.label}</div>
      </div>
    </div>
  );
}