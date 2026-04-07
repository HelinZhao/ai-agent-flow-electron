import { Panel } from "@xyflow/react";
import { memo, useState } from "react";
interface ControlPanelProps {
    onRun: () => Promise<void>;
    onSave: () => void
}


const ControlPanel: React.FC<ControlPanelProps> = (props: ControlPanelProps) => {
    const [isRunning, setIsRunning] = useState(false);

    const handleRun = async (): Promise<void> => {
        setIsRunning(true);
        try {
            await props.onRun();
        } finally {
            setIsRunning(false);
        }
    };

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
                    onClick={handleRun}
                    disabled={isRunning}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                    {isRunning ? '运行中...' : '运行'}
                </button>
            </div>
        </Panel>
    )
}
export default memo(ControlPanel)