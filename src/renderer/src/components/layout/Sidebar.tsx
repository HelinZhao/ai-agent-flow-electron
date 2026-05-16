import { useState } from 'react'

interface NavItem {
  path: string
  label: string
  icon: string
}

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
  navItems: NavItem[]
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, navItems } : SidebarProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
   <nav className={`hidden md:block bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm border-r border-gray-200/50 dark:border-gray-700/50 flex-shrink-0 overflow-visible z-30 transition-all duration-300 w-16 ${!sidebarCollapsed ? 'xl:w-52' : ''}`}>
          <div className="flex flex-col h-full">
            {/* 侧边栏收起/展开按钮 - 仅在大屏显示 */}
            <div className="hidden xl:flex items-center justify-center p-3 border-b border-gray-200/50 dark:border-gray-700/50">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-700/50 dark:text-white transition-colors duration-200"
                title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
              >
                <svg className={`w-4 h-4 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center xl:items-stretch py-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`group relative p-3 ${sidebarCollapsed ? 'mx-1.5' : 'xl:mx-3'} rounded-xl transition-all duration-200 focus:outline-none flex items-center space-x-3 ${currentPage === item.path
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
                    }`}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <span className={`text-sm font-medium truncate transition-opacity duration-200 hidden xl:block ${sidebarCollapsed ? 'xl:opacity-0' : 'xl:opacity-100'}`}>{item.label}</span>

                  {/* 悬浮提示 - 在小屏幕或侧边栏收起时显示 */}
                  <div className={`absolute left-16 top-1/2 transform -translate-y-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none ${sidebarCollapsed ? 'xl:block' : 'xl:hidden'}`}>
                    <div className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded-lg whitespace-nowrap shadow-xl ">
                      {item.label}
                      <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-3 h-3 bg-white dark:bg-gray-700 rotate-45"></div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </nav>
  )
}

export default Sidebar