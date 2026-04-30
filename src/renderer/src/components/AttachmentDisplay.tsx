import React from 'react'
import { AttachmentMetadata } from '@renderer/types'
import { formatFileSize } from '@renderer/lib/attachmentUtils'

const CATEGORY_ICONS: Record<string, string> = {
  image: '🖼️',
  text: '📄',
  pdf: '📕',
  binary: '📦',
}

interface AttachmentDisplayProps {
  attachments?: AttachmentMetadata[]
  sender: 'user' | 'agent'
}

export default function AttachmentDisplay({ attachments, sender }: AttachmentDisplayProps): React.JSX.Element {
  if (!attachments || attachments.length === 0) return <></>

  const isUser = sender === 'user'

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {attachments.map(att => (
        <div
          key={att.id}
          className={`flex items-center space-x-2 rounded-lg px-2 py-1.5 ${
            isUser
              ? 'bg-blue-400/30 text-blue-100'
              : 'bg-gray-100 dark:bg-gray-600/50 text-gray-700 dark:text-gray-200'
          }`}
        >
          <span className="text-lg">{CATEGORY_ICONS[att.category] || '📎'}</span>
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{att.name}</div>
            <div className="text-xs opacity-75">{formatFileSize(att.size)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}