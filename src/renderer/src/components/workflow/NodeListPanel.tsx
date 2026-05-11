import { WorkflowNode } from "@renderer/types";
import { useReactFlow } from "@xyflow/react";
import { memo, useCallback, useMemo } from "react";
import { NODE_DEFS, NODE_CATEGORIES, getNodeDefaultLabel } from "./nodes";
import { v4 as uuidv4 } from 'uuid';

const NodeListPanel = (): React.JSX.Element => {
  const { addNodes } = useReactFlow<WorkflowNode>();

  const handleAddNode = useCallback((type: WorkflowNode['type']) => {
    const newNode: WorkflowNode = {
      id: `node-${uuidv4()}`,
      type,
      position: { x: 300, y: 200 },
      data: {
        label: getNodeDefaultLabel(type),
      },
    };
    addNodes(newNode);
  }, [addNodes]);

  const handleDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/reactflow', nodeType);
  }, []);

  const groupedNodes = useMemo(() => {
    return NODE_CATEGORIES.map(cat => ({
      ...cat,
      nodes: NODE_DEFS.filter(n => n.category === cat.key),
    })).filter(g => g.nodes.length > 0)
  }, [])

  return (
    <div className="w-48 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center space-x-2">
          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4v16m8-8H4" />
          </svg>
          <span>添加节点</span>
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {groupedNodes.map(group => (
          <div key={group.key}>
            <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.nodes.map(def => (
                <div
                  key={def.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, def.type)}
                  onClick={() => handleAddNode(def.type as WorkflowNode['type'])}
                  className={`group/item flex items-center space-x-2.5 px-2.5 py-2 text-xs rounded-lg cursor-move transition-all duration-150 bg-${def.color}-50 text-${def.color}-700 hover:bg-${def.color}-100 hover:shadow-sm border border-transparent hover:border-gray-300 dark:hover:border-gray-600 active:scale-[0.97]`}
                  title={def.defaultLabel}
                >
                  <span className="text-sm flex-shrink-0">{def.icon}</span>
                  <span className="font-medium">{def.shortLabel}</span>
                  {!def.hasTargetHandle && (
                    <span className="ml-auto text-[9px] text-gray-400 dark:text-gray-500 opacity-0 group-hover/item:opacity-60 transition-opacity">起点</span>
                  )}
                  {!def.hasSourceHandle && (
                    <span className="ml-auto text-[9px] text-gray-400 dark:text-gray-500 opacity-0 group-hover/item:opacity-60 transition-opacity">终点</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center space-x-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <span>拖拽到画布</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>点击添加</span>
        </p>
      </div>
    </div>
  )
}
export default memo(NodeListPanel)