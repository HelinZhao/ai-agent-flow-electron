import ClickSpark from "@renderer/components/ClickSpark";
import Layout from "@renderer/components/layout/Layout";
import '@renderer/assets/react-flow-custom.css';
import '@renderer/assets/iconfont.css';
import { useWorkflowStore } from "@renderer/store/workflowStore";
import { useEffect } from "react";
import Workflow from "./Workflow";
import Skills from "./Skills";
import Settings from "./Settings";
import Agents from "./Agents";
import Chat from "./Chat";
import Logs from "./Logs";

const pages: Record<string, React.ReactNode> = {
    '/': <Workflow />,
    '/agents': <Agents />,
    '/skills': <Skills />,
    '/settings': <Settings />,
    '/chat': <Chat />,
    '/logs': <Logs />,
};

let init = false
export default function App(): React.JSX.Element {
    const { initialize, currentPage, setCurrentPage } = useWorkflowStore();

    useEffect(() => {
        if (init) return
        initialize();
        init = true
    }, [initialize]);

    // 滚动检测：滚动时显示滚动条，停止滚动500ms后隐藏
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const onScroll = (e) => {
            e.target.setAttribute('data-scrolling', '');
            clearTimeout(timer);
            timer = setTimeout(() => {
                e.target.removeAttribute('data-scrolling');
            }, 500);
        };
        document.addEventListener('scroll', onScroll, true);
        return () => {
            document.removeEventListener('scroll', onScroll, true);
            clearTimeout(timer);
        };
    }, []);

    return (
        <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
            <ClickSpark />
            {Object.entries(pages).map(([path, component]) => (
                <div key={path} className={currentPage === path ? '' : 'hidden'} style={{ height: '100%' }}>
                    {component}
                </div>
            ))}
        </Layout>
    );
}