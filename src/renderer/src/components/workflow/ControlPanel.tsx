import { Panel } from "@xyflow/react";
import { memo, useState } from "react";
import CustomButton from '../ui/CustomButton';
import VariableReferenceModal from './VariableReferenceModal';
import { LayoutDirection } from './LayoutDirectionContext';

interface ControlPanelProps {
    onRun: () => void
    onSave: () => void
    onAutoLayout: () => void
    isRunning: boolean
    layoutDirection: LayoutDirection
    onToggleDirection: () => void
}

const ControlPanel: React.FC<ControlPanelProps> = (props: ControlPanelProps) => {
    const [showVars, setShowVars] = useState(false)

    return (
        <>
            <Panel position="top-right">
                <div className="flex space-x-2">
                    <CustomButton
                        onClick={() => setShowVars(true)}
                        variant="ghost"
                        size="sm"
                    >
                        <svg className="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        变量
                    </CustomButton>
                    <CustomButton
                        onClick={props.onToggleDirection}
                        variant="secondary"
                        size="sm"
                    >
                        {props.layoutDirection === 'horizontal' ? '⇆ 水平' : '⇅ 垂直'}
                    </CustomButton>
                    <CustomButton
                        onClick={props.onAutoLayout}
                        variant="secondary"
                        size="sm"
                    >
                        布局
                    </CustomButton>
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
            <VariableReferenceModal isOpen={showVars} onClose={() => setShowVars(false)} />
        </>
    )
}
export default memo(ControlPanel)