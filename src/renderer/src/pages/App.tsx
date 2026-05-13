import ClickSpark from "@renderer/components/ClickSpark";
import Layout from "@renderer/components/layout/Layout";
import '@renderer/assets/react-flow-custom.css';
import '@renderer/assets/iconfont.css';
import { useWorkflowStore } from "@renderer/store/workflowStore";
import { useEffect, useState } from "react";
import { ollamaApi, PullProgress } from "@renderer/lib/api";
import Workflow from "./Workflow";
import Skills from "./Skills";
import Settings from "./Settings";
import Agents from "./Agents";
import Chat from "./Chat";
import Logs from "./Logs";
import ExecutionMonitor from "./ExecutionMonitor";
import Knowledge from "./Knowledge";

const pages: Record<string, React.ReactNode> = {
    '/': <Workflow />,
    '/agents': <Agents />,
    '/skills': <Skills />,
    '/settings': <Settings />,
    '/chat': <Chat />,
    '/logs': <Logs />,
    '/monitor': <ExecutionMonitor />,
    '/knowledge': <Knowledge />,
};

let init = false
let subCancel: (() => void) | null = null

export default function App(): React.JSX.Element {
    const { initialize, currentPage, setCurrentPage, error } = useWorkflowStore();
    const [initializing, setInitializing] = useState(true);
    const [showModelDialog, setShowModelDialog] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const [pullProgress, setPullProgress] = useState<PullProgress | null>(null);

    useEffect(() => {
        if (init) return
        init = true
        initialize().finally(() => setInitializing(false))
    }, [initialize]);

    // 初始化完成后检查 Ollama 模型状态
    useEffect(() => {
        if (initializing) return
        const dismissed = localStorage.getItem('ollama-model-dismissed')
        if (dismissed === 'true') return

        ollamaApi.getStatus().then(status => {
            if (status.ollamaRunning && !status.modelExists) {
                setShowModelDialog(true)
            }
        }).catch(() => { })
    }, [initializing]);

    const handlePullModel = () => {
        setIsPulling(true)
        setPullProgress(null)
        ollamaApi.pullModel().then(res => {
            if (res.success) {
                subCancel = ollamaApi.subscribePullProgress(progress => {
                    setPullProgress(progress)
                    if (progress.status === 'success' || progress.status === 'error') {
                        setIsPulling(false)
                    }
                })
            } else {
                setIsPulling(false)
                setPullProgress({ status: 'error', message: res.message || '拉取失败' })
            }
        }).catch(() => {
            setIsPulling(false)
            setPullProgress({ status: 'error', message: '请求拉取失败' })
        })
    }

    const handleDismissPermanently = () => {
        if (subCancel) { subCancel(); subCancel = null }
        setShowModelDialog(false)
        setIsPulling(false)
        setPullProgress(null)
        localStorage.setItem('ollama-model-dismissed', 'true')
    }

    const handleDismissOnce = () => {
        if (subCancel) { subCancel(); subCancel = null }
        setShowModelDialog(false)
        setIsPulling(false)
        setPullProgress(null)
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

    // 计算进度百分比
    const progressPercent = pullProgress?.total && pullProgress?.completed
        ? Math.round((pullProgress.completed / pullProgress.total) * 100)
        : null

    return (
        <>
            {/* Ollama 模型缺失提示对话框 */}
            {showModelDialog && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 mx-4 max-w-md w-full">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">需要下载 Embedding 模型</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">知识库功能依赖的组件</p>
                                </div>
                            </div>
                            <button
                                onClick={handleDismissOnce}
                                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            内部知识库需要使用 <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 text-xs font-mono">bge-m3-q8_0</code> embedding 模型将文档转换为向量。
                            是否立即下载？<span className="text-gray-400 dark:text-gray-500">（下载后可在设置页管理）</span>
                        </p>

                        {/* 拉取进度 */}
                        {isPulling && (
                            <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-blue-700 dark:text-blue-300 font-medium">
                                        {pullProgress?.status === 'pulling'
                                            ? '正在下载...'
                                            : pullProgress?.status === 'downloading digest'
                                                ? '正在下载模型文件...'
                                                : pullProgress?.status || '准备中...'}
                                    </span>
                                    {progressPercent !== null && (
                                        <span className="text-blue-600 dark:text-blue-400 font-mono text-xs">{progressPercent}%</span>
                                    )}
                                </div>
                                <div className="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                                        style={{ width: `${progressPercent || 0}%` }}
                                    />
                                </div>
                                <button
                                    onClick={handleDismissOnce}
                                    className="mt-2 w-full text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                >
                                    后台下载，关闭此窗口
                                </button>
                            </div>
                        )}

                        {/* 错误提示 */}
                        {pullProgress?.status === 'error' && (
                            <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                <p className="text-xs text-red-600 dark:text-red-400">
                                    {pullProgress.message || '下载失败，请检查网络连接后重试'}
                                </p>
                            </div>
                        )}

                        {/* 下载成功 */}
                        {pullProgress?.status === 'success' && (
                            <div className="mt-3 p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    模型下载完成，知识库功能已就绪
                                </p>
                            </div>
                        )}

                        {/* 操作按钮（仅首次展示） */}
                        {!pullProgress && !isPulling && (
                            <div className="mt-5 flex flex-col gap-2">
                                <button
                                    onClick={handlePullModel}
                                    className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
                                >
                                    下载模型
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleDismissOnce}
                                        className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        稍后再说
                                    </button>
                                    <button
                                        onClick={handleDismissPermanently}
                                        className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        不再提示
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 拉取失败后的重试 */}
                        {pullProgress?.status === 'error' && (
                            <div className="mt-4">
                                <button
                                    onClick={handlePullModel}
                                    className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
                                >
                                    重新下载
                                </button>
                                <button
                                    onClick={handleDismissOnce}
                                    className="w-full mt-2 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    稍后再说
                                </button>
                            </div>
                        )}

                        {/* 下载成功后自动关闭 */}
                        {pullProgress?.status === 'success' && (
                            <button
                                onClick={() => setShowModelDialog(false)}
                                className="mt-4 w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                开始使用
                            </button>
                        )}
                    </div>
                </div>
            )}

            <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
                <ClickSpark />
                {Object.entries(pages).map(([path, component]) => (
                    <div key={path} className={currentPage === path ? '' : 'hidden'} style={{ height: '100%' }}>
                        {component}
                    </div>
                ))}
            </Layout>
        </>
    );
}