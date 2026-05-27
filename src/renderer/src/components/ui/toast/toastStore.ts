export interface ToastItem {
  id: number
  type: string
  text: string
}

let toasts: ToastItem[] = []
let listeners: (() => void)[] = []

export function subscribe(listener: () => void) {
  listeners.push(listener)
  return () => { listeners = listeners.filter(l => l !== listener) }
}

export function getSnapshot() { return toasts }

export function addToast(item: ToastItem) {
  toasts = [...toasts, item]
  listeners.forEach(l => l())
}

export function removeToast(id: number) {
  toasts = toasts.filter(t => t.id !== id)
  listeners.forEach(l => l())
}
