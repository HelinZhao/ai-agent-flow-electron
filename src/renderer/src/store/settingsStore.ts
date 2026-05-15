import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type LayoutDirection = 'horizontal' | 'vertical'

interface SettingsState {
  layoutDirection: LayoutDirection
  autoSave: boolean
  autoSaveInterval: number // 秒
  autoStart: boolean
  setLayoutDirection: (dir: LayoutDirection) => void
  setAutoSave: (on: boolean) => void
  setAutoSaveInterval: (sec: number) => void
  setAutoStart: (on: boolean) => void
  reset: () => void
}

const DEFAULTS = {
  layoutDirection: 'horizontal' as LayoutDirection,
  autoSave: true,
  autoSaveInterval: 30,
  autoStart: false,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setLayoutDirection: (layoutDirection) => set({ layoutDirection }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setAutoSaveInterval: (autoSaveInterval) => set({ autoSaveInterval }),
      setAutoStart: (autoStart) => set({ autoStart }),
      reset: () => set(DEFAULTS),
    }),
    {
      name: 'settings-storage',
    }
  )
)
