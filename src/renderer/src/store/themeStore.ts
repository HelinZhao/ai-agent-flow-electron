import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',

      toggleTheme: () => {
        const currentTheme = get().theme
        const newTheme = currentTheme === 'light' ? 'dark' : 'light'
        set({ theme: newTheme })

        // 更新HTML类
        if (typeof document !== 'undefined') {
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
        }
      },

      setTheme: (theme: Theme) => {
        set({ theme })

        // 更新HTML类
        if (typeof document !== 'undefined') {
          if (theme === 'dark') {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
        }
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
      if (parsed.state.theme === 'dark') {
        document.documentElement.classList.add('dark')
      }
    } catch (e) {
      console.error('Failed to parse saved theme:', e)
    }
  }
}
