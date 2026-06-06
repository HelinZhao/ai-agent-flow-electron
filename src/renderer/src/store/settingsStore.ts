import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type LayoutDirection = 'horizontal' | 'vertical'

interface SettingsState {
  layoutDirection: LayoutDirection
  autoSave: boolean
  autoSaveInterval: number // 秒
  autoStart: boolean
  showSystemAssistant: boolean
  gitEnabled: boolean
  userAvatar: string
  setLayoutDirection: (dir: LayoutDirection) => void
  setAutoSave: (on: boolean) => void
  setAutoSaveInterval: (sec: number) => void
  setAutoStart: (on: boolean) => void
  setShowSystemAssistant: (on: boolean) => void
  setGitEnabled: (on: boolean) => void
  setUserAvatar: (url: string) => void
  reset: () => void
}

const DEFAULTS = {
  layoutDirection: 'horizontal' as LayoutDirection,
  autoSave: false,
  autoSaveInterval: 30,
  autoStart: false,
  showSystemAssistant: true,
  gitEnabled: false,
  userAvatar: '',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setLayoutDirection: (layoutDirection) => set({ layoutDirection }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setAutoSaveInterval: (autoSaveInterval) => set({ autoSaveInterval }),
      setAutoStart: (autoStart) => set({ autoStart }),
      setShowSystemAssistant: (showSystemAssistant) => set({ showSystemAssistant }),
      setGitEnabled: (gitEnabled) => set({ gitEnabled }),
      setUserAvatar: (userAvatar) => set({ userAvatar }),
      reset: () => set(DEFAULTS),
    }),
    {
      name: 'settings-storage',
    }
  )
)
