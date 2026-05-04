import { Handle, Position } from '@xyflow/react';
import { NODE_DEFS_MAP, COLOR_CLASSES } from './nodes';

export function StartNode({ data }: { data: any }): React.JSX.Element {
  const def = NODE_DEFS_MAP['start']
  const c = COLOR_CLASSES[def.color]
  return (
    <div className={`react-flow__node node-start px-4 py-2 min-w-[120px]`}>
      <Handle type="source" position={Position.Right} />
      <div className="text-center">
        <div className={`font-medium ${c.text}`}>{def.shortLabel}</div>
        <div className={`text-xs ${c.textSm} mt-1`}>{data.label}</div>
      </div>
    </div>
  );
}

export function SkillNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const def = NODE_DEFS_MAP['skill']
  const c = COLOR_CLASSES[def.color]
  return (
    <div className={`react-flow__node node-skill px-4 py-2 min-w-[140px] ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="text-center">
        <div className={`font-medium ${c.text}`}>{def.defaultLabel}</div>
        <div className={`text-xs ${c.textSm} mt-1`}>{data.label}</div>
        {data.config?.skillName && (
          <div className={`text-xs ${c.textXs} mt-1`}>技能: {data.config.skillName}</div>
        )}
      </div>
    </div>
  );
}

export function BranchNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const def = NODE_DEFS_MAP['branch']
  const c = COLOR_CLASSES[def.color]
  const branches = data.config?.branches || [
    { id: 'branch1', label: '条件1', condition: '' },
    { id: 'branch2', label: '条件2', condition: '' }
  ];

  return (
    <div className={`react-flow__node node-branch px-4 py-2 min-w-[140px] ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="text-center">
        <div className={`font-medium ${c.text}`}>{def.defaultLabel}</div>
        <div className={`text-xs ${c.textSm} mt-1`}>{data.label}</div>
        <div className={`text-xs ${c.textXs} mt-1`}>
          {branches.length} 个分支
        </div>
        {branches.length > 0 && (
          <div className={`text-xs ${c.textXxs} mt-1`}>
            可配置分支条件
          </div>
        )}
      </div>
    </div>
  );
}

export function ApiNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const def = NODE_DEFS_MAP['api']
  const c = COLOR_CLASSES[def.color]
  return (
    <div className={`react-flow__node node-api px-4 py-2 min-w-[140px] ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="text-center">
        <div className={`font-medium ${c.text}`}>{def.defaultLabel}</div>
        <div className={`text-xs ${c.textSm} mt-1`}>{data.label}</div>
        {data.config?.apiConfig?.url && (
          <div className={`text-xs ${c.textXs} mt-1 max-w-[120px] truncate`}>
            {data.config.apiConfig.method} {data.config.apiConfig.url}
          </div>
        )}
      </div>
    </div>
  );
}

export function LLMNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const def = NODE_DEFS_MAP['llm']
  const c = COLOR_CLASSES[def.color]
  return (
    <div className={`react-flow__node node-llm px-4 py-2 min-w-[140px] ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="text-center">
        <div className={`font-medium ${c.text}`}>{def.defaultLabel}</div>
        <div className={`text-xs ${c.textSm} mt-1`}>{data.label}</div>
        {data.config?.prompt && (
          <div className={`text-xs ${c.textXs} mt-1 max-w-[120px] truncate`}>
            提示词: {data.config.prompt.substring(0, 20)}...
          </div>
        )}
      </div>
    </div>
  );
}

export function AgentNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const def = NODE_DEFS_MAP['agent']
  const c = COLOR_CLASSES[def.color]
  return (
    <div className={`react-flow__node node-agent px-4 py-2 min-w-[140px] ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="text-center">
        <div className={`font-medium ${c.text}`}>{def.defaultLabel}</div>
        <div className={`text-xs ${c.textSm} mt-1`}>{data.label}</div>
        {data.config?.agentName && (
          <div className={`text-xs ${c.textXs} mt-1`}>Agent: {data.config.agentName}</div>
        )}
      </div>
    </div>
  );
}

export function CliNode({ data, selected }: { data: any; selected: boolean }): React.JSX.Element {
  const def = NODE_DEFS_MAP['cli']
  const c = COLOR_CLASSES[def.color]
  return (
    <div className={`react-flow__node node-cli px-4 py-2 min-w-[140px] ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="text-center">
        <div className={`font-medium ${c.text}`}>{def.defaultLabel}</div>
        <div className={`text-xs ${c.textSm} mt-1`}>{data.label}</div>
        {data.config?.cliConfig?.command && (
          <div className={`text-xs ${c.textXs} mt-1 max-w-[120px] truncate`}>
            {data.config.cliConfig.command.substring(0, 25)}...
          </div>
        )}
      </div>
    </div>
  );
}

export function EndNode({ data }: { data: any }): React.JSX.Element {
  const def = NODE_DEFS_MAP['end']
  const c = COLOR_CLASSES[def.color]
  return (
    <div className={`react-flow__node node-end px-4 py-2 min-w-[120px]`}>
      <Handle type="target" position={Position.Left} />
      <div className="text-center">
        <div className={`font-medium ${c.text}`}>{def.shortLabel}</div>
        <div className={`text-xs ${c.textSm} mt-1`}>{data.label}</div>
      </div>
    </div>
  );
}