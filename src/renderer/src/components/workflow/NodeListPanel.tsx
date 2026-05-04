import { WorkflowNode } from "@renderer/types";
import { Panel, useReactFlow } from "@xyflow/react";
import { memo, useCallback } from "react";
import { NODE_DEFS, getNodeDefaultLabel } from "./nodes";
import { v4 as uuidv4 } from 'uuid';

const NodeListPanel = ():  React.JSX.Element => {
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

  return (
    <Panel position="top-left">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg space-y-2">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">添加节点</h3>
        <div className="grid grid-cols-2 gap-2">
          {NODE_DEFS.map(def => (
            <div
              key={def.type}
              draggable
              onDragStart={(e) => handleDragStart(e, def.type)}
              onClick={() => handleAddNode(def.type as WorkflowNode['type'])}
              className={`px-3 py-2 text-xs bg-${def.color}-100 text-${def.color}-800 rounded hover:bg-${def.color}-200 cursor-move`}
            >
              {def.shortLabel}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          点击添加或拖拽到画布
        </p>
      </div>
    </Panel>
  )
}
export default memo(NodeListPanel)