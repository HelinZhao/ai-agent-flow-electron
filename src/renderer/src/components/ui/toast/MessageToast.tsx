import { addToast, removeToast } from './toastStore'

type ToastType = 'success' | 'warning' | 'info' | 'error'

export interface ToastOptions {
  type: ToastType
  text: string
  duration?: number
}

if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `@keyframes slide-down{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}`
  document.head.appendChild(style)
}

export function showToast(options: ToastOptions) {
  const id = Date.now() + Math.random()
  addToast({ id, type: options.type, text: options.text })

  const duration = options.duration ?? 3000
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration)
  }
}
