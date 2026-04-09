import ClickSqark from "@renderer/components/ClickSqark";
import Layout from "@renderer/components/Layout";
import { Outlet } from "react-router-dom";
import '@renderer/assets/react-flow-custom.css';
import '@renderer/assets/iconfont.css';
import { useWorkflowStore } from "@renderer/store/workflowStore";
import { useEffect } from "react";

let init = false
export default function App(): React.JSX.Element {
    const { initialize } = useWorkflowStore();

    // 组件挂载时自动加载数据（仅在客户端执行）
    useEffect(() => {
        if (init) return
        initialize();
        init = true
    }, [initialize]);
    
    return (
        <Layout>
            <ClickSqark />
            <Outlet />
        </Layout>
    )
}
