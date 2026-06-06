import { create } from 'zustand'

const PAGE_STORAGE_KEY = 'workflow-current-page'

interface PageState {
  currentPage: string
  setCurrentPage: (page: string) => void
}

// 应用初始化时从 localStorage 恢复上次访问的页面
const savedPage = typeof localStorage !== 'undefined'
  ? localStorage.getItem(PAGE_STORAGE_KEY)
  : null

export const usePageStore = create<PageState>()((set) => ({
  currentPage: savedPage || '/',
  setCurrentPage: (page) => {
    localStorage.setItem(PAGE_STORAGE_KEY, page)
    set({ currentPage: page })
  },
}))
