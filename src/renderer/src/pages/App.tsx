import ClickSpark from "@renderer/components/ClickSpark";
import Layout from "@renderer/components/layout/Layout";
import '@renderer/assets/react-flow-custom.css';
import '@renderer/assets/iconfont.css';
import { useAppStore } from "@renderer/store/appStore";
import { lazy, useEffect, useState } from "react";
import { ollamaApi } from "@renderer/lib/api";
import OllamaInstallDialog from "@renderer/components/OllamaInstallDialog";
import ModelDownloadDialog from "@renderer/components/ModelDownloadDialog";
import ToastContainer from '@renderer/components/ui/toast/ToastContainer';
import ToolApprovalSidebar from '@renderer/components/tasks/ToolApprovalSidebar';
import { useTeamExecutionStore } from '@renderer/store/teamExecutionStore';
import {
  ChatIcon, WorkflowIcon, AgentIcon, TeamIcon, SkillsIcon, KnowledgeIcon,
  TriggersIcon, McpIcon, MarketplaceIcon, MonitorIcon, SettingsIcon, LogsIcon, TicketIcon, FolderIcon
} from '@renderer/components/icons/NavIcons';

const Workflow = lazy(() => import("./Workflow"));
const Skills = lazy(() => import("./Skills"));
const Settings = lazy(() => import("./Settings"));
const Agents = lazy(() => import("./Agents"));
const Chat = lazy(() => import("./Chat"));
const Logs = lazy(() => import("./Logs"));
const ExecutionMonitor = lazy(() => import("./ExecutionMonitor"));
const Triggers = lazy(() => import("./Triggers"));
const Knowledge = lazy(() => import("./Knowledge"));
const McpServers = lazy(() => import("./McpServers"));
const Teams = lazy(() => import("./Teams"));
const Tasks = lazy(() => import("./Tasks"));
const Projects = lazy(() => import("./Projects"));
const TeamMonitor = lazy(() => import("./TeamMonitor"));
const Marketplace = lazy(() => import("./Marketplace"));

const navItems = [
  { path: '/chat', label: 'AI对话', icon: <ChatIcon />, page: <Chat />, group: '核心' },
  { path: '/', label: '工作流', icon: <WorkflowIcon />, page: <Workflow />, group: '核心' },
  { path: '/agents', label: 'Agent', icon: <AgentIcon />, page: <Agents />, group: '核心' },
  { path: '/teams', label: '团队', icon: <TeamIcon />, page: <Teams />, group: '核心' },
  { path: '/tasks', label: '任务池', icon: <TicketIcon />, page: <Tasks />, group: '核心' },
  { path: '/projects', label: '项目', icon: <FolderIcon />, page: <Projects />, group: '核心' },
  { path: '/skills', label: '技能', icon: <SkillsIcon />, page: <Skills />, group: '能力' },
  { path: '/knowledge', label: '知识库', icon: <KnowledgeIcon />, page: <Knowledge />, group: '能力' },
  { path: '/triggers', label: '触发器', icon: <TriggersIcon />, page: <Triggers />, group: '能力' },
  { path: '/mcp', label: 'MCP服务', icon: <McpIcon />, page: <McpServers />, group: '能力' },
  { path: '/marketplace', label: '模板市场', icon: <MarketplaceIcon />, page: <Marketplace />, group: '资源' },
  { path: '/monitor', label: '执行监控', icon: <MonitorIcon />, page: <ExecutionMonitor />, group: '运维' },
  { path: '/team-monitor', label: '团队执行', icon: <TeamIcon />, page: <TeamMonitor />, group: '运维' },
  { path: '/settings', label: '设置', icon: <SettingsIcon />, page: <Settings />, group: '系统' },
  { path: '/logs', label: '日志', icon: <LogsIcon />, page: <Logs />, group: '系统' }
]

let init = false

export default function App(): React.JSX.Element {
  const initialize = useAppStore(state => state.initialize);
  const currentPage = useAppStore(state => state.currentPage);
  const setCurrentPage = useAppStore(state => state.setCurrentPage);
  const error = useAppStore(state => state.error);
  const [initializing, setInitializing] = useState(true);
  const [showModelDialog, setShowModelDialog] = useState(false);
  const initTeamExecStore = useTeamExecutionStore(s => s.init);
  const [showOllamaDialog, setShowOllamaDialog] = useState(false);

  useEffect(() => {
    if (init) return
    init = true
    initialize()
      .then(() => initTeamExecStore())
      .finally(() => setInitializing(false))
  }, [initialize, initTeamExecStore]);

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

      <Layout currentPage={currentPage} onNavigate={setCurrentPage} navItems={navItems}>
        <ClickSpark />
        <ToastContainer />
        <ToolApprovalSidebar />
      </Layout>
    </>
  );
}