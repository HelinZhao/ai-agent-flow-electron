import ClickSpark from "@renderer/components/ClickSpark";
import Layout from "@renderer/components/layout/Layout";
import '@renderer/assets/react-flow-custom.css';
import '@renderer/assets/iconfont.css';
import { useWorkflowStore } from "@renderer/store/workflowStore";
import { useEffect, useState } from "react";
import { ollamaApi } from "@renderer/lib/api";
import OllamaInstallDialog from "@renderer/components/OllamaInstallDialog";
import ModelDownloadDialog from "@renderer/components/ModelDownloadDialog";
import Workflow from "./Workflow";
import Skills from "./Skills";
import Settings from "./Settings";
import Agents from "./Agents";
import Chat from "./Chat";
import Logs from "./Logs";
import ExecutionMonitor from "./ExecutionMonitor";
import Triggers from "./Triggers";
import Knowledge from "./Knowledge";
import McpServers from "./McpServers";
import Marketplace from "./Marketplace";
import ToastContainer from '@renderer/components/ui/toast/ToastContainer';
import {
  ChatIcon, WorkflowIcon, AgentIcon, SkillsIcon, KnowledgeIcon,
  TriggersIcon, McpIcon, MarketplaceIcon, MonitorIcon, SettingsIcon, LogsIcon
} from '@renderer/components/icons/NavIcons';

const navItems = [
  { path: '/chat', label: 'AI对话', icon: <ChatIcon />, page: <Chat /> },
  { path: '/', label: '工作流', icon: <WorkflowIcon />, page: <Workflow /> },
  { path: '/agents', label: 'Agent', icon: <AgentIcon />, page: <Agents /> },
  { path: '/skills', label: '技能', icon: <SkillsIcon />, page: <Skills /> },
  { path: '/knowledge', label: '知识库', icon: <KnowledgeIcon />, page: <Knowledge /> },
  { path: '/triggers', label: '触发器', icon: <TriggersIcon />, page: <Triggers /> },
  { path: '/mcp', label: 'MCP服务', icon: <McpIcon />, page: <McpServers /> },
  { path: '/marketplace', label: '模板市场', icon: <MarketplaceIcon />, page: <Marketplace /> },
  { path: '/monitor', label: '执行监控', icon: <MonitorIcon />, page: <ExecutionMonitor /> },
  { path: '/settings', label: '设置', icon: <SettingsIcon />, page: <Settings /> },
  { path: '/logs', label: '日志', icon: <LogsIcon />, page: <Logs /> }
]

let init = false

export default function App(): React.JSX.Element {
  const { initialize, currentPage, setCurrentPage, error, loading } = useWorkflowStore();
  const [initializing, setInitializing] = useState(true);
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [showOllamaDialog, setShowOllamaDialog] = useState(false);

  const handleRefresh = () => {
    init = false
    initialize().finally(() => setInitializing(false))
  }

  useEffect(() => {
    if (init) return
    init = true
    initialize().finally(() => setInitializing(false))
  }, [initialize]);

  // 初始化完成后检查 Ollama 服务及模型状态
  useEffect(() => {
    if (initializing) return

    ollamaApi.getStatus().then(status => {
      if (!status.ollamaRunning) {
        const dismissed = localStorage.getItem('ollama-dismissed')
        if (dismissed !== 'true') setShowOllamaDialog(true)
        return
      }
      if (!status.modelExists) {
        const dismissed = localStorage.getItem('ollama-model-dismissed')
        if (dismissed !== 'true') setShowModelDialog(true)
      }
    }).catch(() => {
      const dismissed = localStorage.getItem('ollama-dismissed')
      if (dismissed !== 'true') setShowOllamaDialog(true)
    })
  }, [initializing]);

  const handleOllamaDismissOnce = () => setShowOllamaDialog(false)
  const handleOllamaDismissPermanently = () => {
    setShowOllamaDialog(false)
    localStorage.setItem('ollama-dismissed', 'true')
  }

  const handleDismissPermanently = () => {
    setShowModelDialog(false)
    localStorage.setItem('ollama-model-dismissed', 'true')
  }

  const handleDismissOnce = () => {
    setShowModelDialog(false)
  }

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

  if (initializing) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-800 flex items-center justify-center z-50">
        <div className="flex flex-col items-center space-y-6">
          {/* Logo */}
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-white font-bold text-2xl">AI</span>
          </div>
          {/* 加载动画 */}
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          {/* 文字 */}
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
              {error ? '服务启动失败' : '正在启动服务...'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {error
                ? '服务器未能及时响应，请检查网络连接后重试'
                : '正在初始化数据库和服务组件，请稍候'}
            </p>
          </div>
          {/* 错误重试按钮 */}
          {error && (
            <button
              onClick={() => {
                init = false
                setInitializing(true)
                initialize().finally(() => setInitializing(false))
              }}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              重新连接
            </button>
          )}
        </div>
      </div>
    )
  }


  return (
    <>
      {showModelDialog && (
        <ModelDownloadDialog
          onDismissOnce={handleDismissOnce}
          onDismissPermanently={handleDismissPermanently}
        />
      )}

      {showOllamaDialog && (
        <OllamaInstallDialog
          onDismissOnce={handleOllamaDismissOnce}
          onDismissPermanently={handleOllamaDismissPermanently}
        />
      )}

      <Layout currentPage={currentPage} onNavigate={setCurrentPage} navItems={navItems} loading={loading} onRefresh={handleRefresh}>
        <ClickSpark />
        <ToastContainer />
      </Layout>
    </>
  );
}