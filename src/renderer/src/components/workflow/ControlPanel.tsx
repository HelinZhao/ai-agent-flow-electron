import { Panel } from "@xyflow/react";
import { memo } from "react";
import CustomButton from '../ui/CustomButton';

interface ControlPanelProps {
    onRun: () => void
    onSave: () => void
    isRunning: boolean
}

const ControlPanel: React.FC<ControlPanelProps> = (props: ControlPanelProps) => {

    return (
        <Panel position="top-right">
            <div className="flex space-x-2">
                <CustomButton
                    onClick={props.onSave}
                    variant="primary"
                    size="sm"
                >
                    保存
                </CustomButton>
                <CustomButton
                    onClick={props.onRun}
                    variant="success"
                    size="sm"
                    disabled={props.isRunning}
                >
                    {props.isRunning ? '运行中...' : '运行'}
                </CustomButton>
            </div>
        </Panel>
    )
}
export default memo(ControlPanel)