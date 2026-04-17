import { Panel } from "@xyflow/react";
import { memo } from "react";
interface ControlPanelProps {
    onRun: () => void
    onSave: () => void
    isRunning: boolean
}

const ControlPanel: React.FC<ControlPanelProps> = (props: ControlPanelProps) => {

    return (
        <Panel position="top-right">
            <div className="flex space-x-2">
                <button
                    onClick={props.onSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    保存
                </button>
                <button
                    onClick={props.onRun}
                    disabled={props.isRunning}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                    {props.isRunning ? '运行中...' : '运行'}
                </button>
            </div>
        </Panel>
    )
}
export default memo(ControlPanel)