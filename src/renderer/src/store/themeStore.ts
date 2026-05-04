import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',

      setTheme: (theme: Theme) => {
        set({ theme })
        applyTheme(theme)
      }
    }),
    {
      name: 'theme-storage'
    }
  )
)

// 初始化主题
if (typeof document !== 'undefined') {
  const savedTheme = localStorage.getItem('theme-storage')
  if (savedTheme) {
    try {
      const parsed = JSON.parse(savedTheme)
      applyTheme(parsed.state.theme)
    } catch (e) {
      console.error('Failed to parse saved theme:', e)
      applyTheme('system')
    }
  } else {
    applyTheme('system')
  }

  // 监听系统主题变化（system模式时自动跟随）
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useThemeStore.getState()
    if (theme === 'system') applyTheme('system')
  })
}