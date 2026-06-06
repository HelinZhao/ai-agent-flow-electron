import { memo, useRef } from 'react'

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
  group?: string
}

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
  navItems: NavItem[]
  collapsed: boolean
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, navItems, collapsed: sidebarCollapsed }) => {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const tooltipTextRef = useRef<HTMLSpanElement>(null)

  const showTooltip = (text: string, button: HTMLButtonElement) => {
    if (!sidebarCollapsed && window.innerWidth >= 1280) return
    const el = tooltipRef.current
    const textEl = tooltipTextRef.current
    if (!el || !textEl) return
    const rect = button.getBoundingClientRect()
    textEl.textContent = text
    el.style.top = `${rect.top + rect.height / 2}px`
    el.style.left = `${rect.right + 10}px`
    el.style.display = 'block'
  }

  const hideTooltip = () => {
    const el = tooltipRef.current
    if (el) el.style.display = 'none'
  }

  return (
    <>
      <nav className={`hidden md:block bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm border-r border-gray-200/50 dark:border-gray-700/50 flex-shrink-0 z-30 transition-[width] duration-300 ${sidebarCollapsed ? 'w-[4.1rem]' : 'w-52'}`}>
        <div className="flex flex-col h-full">
          <div className="flex-1 flex flex-col pt-4 pb-2 overflow-y-auto [scrollbar-gutter:stable]">
            {navItems.reduce<{ group: string; items: typeof navItems }[]>((acc, item) => {
              const g = item.group || ''
              const existing = acc.find(x => x.group === g)
              if (existing) existing.items.push(item)
              else acc.push({ group: g, items: [item] })
              return acc
            }, []).map(group => (
              <div key={group.group || '__root'}>
                {group.group && (
                  <div className={`pl-6 mt-2 mb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider transition-all duration-200 ${sidebarCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                    {group.group}
                  </div>
                )}
                <div className="space-y-1 pl-2.5">
                  {group.items.map(item => (
                    <button
                      key={item.path}
                      onClick={() => onNavigate(item.path)}
                      onMouseEnter={(e) => showTooltip(item.label, e.currentTarget)}
                      onMouseLeave={hideTooltip}
                      className={`flex items-center h-10 rounded-xl transition-[background-color] duration-200 focus:outline-none px-1.5 space-x-3 flex-shrink-0 w-full
                        ${currentPage === item.path
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
                        }`}
                    >
                      <span className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-xl">
                        {item.icon}
                      </span>
                      <span className={`text-sm font-medium truncate transition-all duration-200 ${sidebarCollapsed ? 'invisible w-0' : 'visible opacity-100'}`}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* 直接 DOM 操作，避免 React 重渲染 */}
      <div
        ref={tooltipRef}
        className="fixed z-50 pointer-events-none px-3 py-2 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded-lg whitespace-nowrap shadow-xl"
        style={{ display: 'none', transform: 'translateY(-50%)' }}
      >
        <span ref={tooltipTextRef}></span>
        <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-3 h-3 bg-white dark:bg-gray-700 rotate-45"></div>
      </div>
    </>
  )
}

export default memo(Sidebar)
