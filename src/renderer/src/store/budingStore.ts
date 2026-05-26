import { create } from 'zustand'
import type { EditingContext } from '@renderer/lib/editingContext'

interface BudingStoreState {
  open: boolean
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  assistContext: EditingContext | null
  setAssistContext: (ctx: EditingContext | null) => void
}

export const useBudingStore = create<BudingStoreState>((set) => ({
  open: false,
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => {
    if (typeof open === 'function') {
      set(state => ({ open: open(state.open) }))
    } else {
      set({ open })
    }
  },
  assistContext: null,
  setAssistContext: (ctx: EditingContext | null) => set({ assistContext: ctx }),
}))
