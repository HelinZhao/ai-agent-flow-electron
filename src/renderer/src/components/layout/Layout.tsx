import { useState, memo, Suspense } from 'react'
import ThemeToggle from './ThemeToggle'
import LLMConfigSwitcher from './LLMConfigSwitcher'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import WindowControls from './WindowControls'
import SystemAssistantChat from '@renderer/components/SystemAssistantChat'
import Footer from './Footer'

interface LayoutProps {
  children: React.ReactNode
  currentPage: string
  onNavigate: (page: string) => void
  navItems: { path: string; label: string; icon: React.ReactNode, page: React.ReactNode, keepAlive?: boolean }[]
}
const isElectron = Boolean(window.electron || window.api)

const PAGE_LOADING = (
  <div className="flex items-center justify-center h-full">
    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      加载中...
    </div>
  </div>
)


const MainArea = memo(function MainArea({ currentPage, children, navItems }: {
  currentPage: string
  children: React.ReactNode
  navItems: { path: string; label: string; icon: React.ReactNode, page: React.ReactNode, keepAlive?: boolean }[]
}) {
  // Keep-Alive: 白名单页面（keepAlive: true）首次访问后缓存 DOM，切换回来时瞬间恢复状态
  // 非白名单页面（配置/日志等）用完即卸载，节省内存
  // 使用 React 官方推荐的 render-phase 派生 state 模式
  const [cachedPaths, setCachedPaths] = useState(() => {
    return navItems.find(i => i.path === currentPage)?.keepAlive ? new Set([currentPage]) : new Set<string>()
  })
  const [prevPage, setPrevPage] = useState(currentPage)

  if (currentPage !== prevPage) {
    setPrevPage(currentPage)
    const isKeepAlive = navItems.find(i => i.path === currentPage)?.keepAlive
    if (isKeepAlive && !cachedPaths.has(currentPage)) {
      setCachedPaths(prev => {
        if (prev.has(currentPage)) return prev
        const next = new Set(prev)
        next.add(currentPage)
        if (next.size > 5) {
          const first = next.values().next().value as string | undefined
          if (first && first !== currentPage) next.delete(first)
        }
        return next
      })
    }
  }

  const currentItem = navItems.find(i => i.path === currentPage)
  const currentKeepAlive = currentItem?.keepAlive

  return (
    <main className="flex-1 overflow-auto relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10"></div>
      {children}
      <Suspense fallback={PAGE_LOADING}>
        {/* 白名单页面：缓存的全部渲染，非当前页 hidden */}
        {Array.from(cachedPaths).map(path => {
          const item = navItems.find(i => i.path === path)
          return item ? (
            <div key={path} className={`relative z-10 h-full${path === currentPage ? '' : ' hidden'}`}>
              {item.page}
            </div>
          ) : null
        })}
        {/* 非白名单页面：条件渲染，用完即卸载 */}
        {!currentKeepAlive && (
          <div className="relative z-10 h-full">
            {currentItem?.page}
          </div>
        )}
      </Suspense>
    </main>
  );
})

const Layout = memo(function Layout({ navItems, currentPage, onNavigate, children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const toggleSidebar = () => setSidebarCollapsed(v => !v)

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-800">
      {/* 顶部工具栏 */}
      <div className="hidden md:flex bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0 h-12 app-drag z-40">
        <div className="flex justify-between items-center px-4 flex-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Agent Flow
            </span>
          </div>
          <div className="flex items-center space-x-3 app-no-drag">
            <LLMConfigSwitcher />
            <ThemeToggle />
          </div>
        </div>
        {isElectron && <WindowControls />}
      </div>
      {/* 移动端导航 */}
      <MobileNav
        currentPage={currentPage}
        onNavigate={onNavigate}
        navItems={navItems}
        isElectron={isElectron}
      />

      {/* 下方内容区域：侧边栏 + 主内容 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧边栏导航 */}
        <Sidebar currentPage={currentPage} onNavigate={onNavigate} navItems={navItems} collapsed={sidebarCollapsed} />

        {/* 主内容区域 */}
        <MainArea currentPage={currentPage} navItems={navItems}>
          {children}
        </MainArea>
      </div>
      {currentPage !== '/chat' && <SystemAssistantChat />}
      <Footer collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
    </div>
  )
})

export default Layout