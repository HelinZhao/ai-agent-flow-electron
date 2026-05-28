import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
  width?: string   // Tailwind max-w class, e.g. 'max-w-4xl', 'max-w-5xl'
}

const INITIAL_POS = { x: 0, y: 0 }

export default function Modal({ open, onClose, title, children, footer, wide, width }: ModalProps): React.ReactElement | null {
  const mouseDownRef = useRef(false)
  const [offset, setOffset] = useState(INITIAL_POS)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  if (!open) return null

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y }
    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      setOffset({ x: d.origX + ev.clientX - d.startX, y: d.origY + ev.clientY - d.startY })
    }
    const onUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[8vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) mouseDownRef.current = true }}
      onMouseUp={(e) => {
        if (e.target === e.currentTarget && mouseDownRef.current) {
          mouseDownRef.current = false
          setOffset(INITIAL_POS)
          onClose()
        }
        mouseDownRef.current = false
      }}
    >
      <div
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full mx-4 max-h-[calc(100vh-4rem)] flex flex-col ${width || (wide ? 'max-w-3xl' : 'max-w-lg')}`}
        onClick={e => e.stopPropagation()}
      >

        {/* header — 拖拽手柄 */}
        <div
          onMouseDown={handleHeaderMouseDown}
          className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 cursor-move select-none"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
          <button onClick={() => { setOffset(INITIAL_POS); onClose() }} className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* scrollable content */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {children}
        </div>

        {/* footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
