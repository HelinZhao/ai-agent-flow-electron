import React from 'react'
import { AttachmentData, formatFileSize } from '@renderer/lib/attachmentUtils'

const CATEGORY_ICONS: Record<string, string> = {
  image: '🖼️',
  text: '📄',
  pdf: '📕',
  binary: '📦',
}

interface AttachmentPreviewProps {
  attachments: AttachmentData[]
  onRemove: (id: string) => void
}

export default function AttachmentPreview({ attachments, onRemove }: AttachmentPreviewProps): React.JSX.Element {
  if (attachments.length === 0) return <></>

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-gray-200/30 dark:border-gray-600/30">
      {attachments.map(att => (
        <div
          key={att.id}
          className="flex items-center space-x-2 bg-gray-100/80 dark:bg-gray-600/50 rounded-lg px-3 py-1.5 group"
        >
          {att.category === 'image' && att.previewUrl ? (
            <img
              src={att.previewUrl}
              alt={att.name}
              className="w-8 h-8 rounded object-cover"
            />
          ) : (
            <span className="text-lg">{CATEGORY_ICONS[att.category] || '📎'}</span>
          )}
          <div className="min-w-0 max-w-[120px]">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
              {att.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(att.size)}
            </div>
          </div>
          <button
            onClick={() => onRemove(att.id)}
            className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors text-sm leading-none opacity-0 group-hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}