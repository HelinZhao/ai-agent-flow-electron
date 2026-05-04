import React from 'react'
import { AttachmentMetadata } from '@renderer/types'
import { formatFileSize } from '@renderer/lib/attachmentUtils'

const SERVER_URL = 'http://localhost:3100'

const CATEGORY_ICONS: Record<string, string> = {
  image: '🖼️',
  text: '📄',
  pdf: '📕',
  binary: '📦',
}

function getAttachmentUrl(att: AttachmentMetadata): string {
  // 优先用Express URL（磁盘文件），其次用previewUrl（内存base64）
  if (att.url) return att.url.startsWith('/') ? `${SERVER_URL}${att.url}` : att.url
  if (att.previewUrl) return att.previewUrl
  return `${SERVER_URL}/api/attachments/${att.id}/${encodeURIComponent(att.name)}`
}

function getAttachmentImageUrl(att: AttachmentMetadata): string | null {
  if (att.category !== 'image') return null
  return getAttachmentUrl(att)
}

interface AttachmentDisplayProps {
  attachments?: AttachmentMetadata[]
  sender: 'user' | 'agent'
  onAttachmentClick?: (att: AttachmentMetadata) => void
}

export default function AttachmentDisplay({ attachments, sender, onAttachmentClick }: AttachmentDisplayProps): React.JSX.Element {
  if (!attachments || attachments.length === 0) return <></>

  const isUser = sender === 'user'

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {attachments.map(att => {
        const imageUrl = getAttachmentImageUrl(att)
        const isImage = att.category === 'image'
        return (
          <div
            key={att.id}
            onClick={() => onAttachmentClick?.(att)}
            className={`flex items-center space-x-2 rounded-lg px-2 py-1.5 ${
              onAttachmentClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
            } ${
              isUser
                ? 'bg-blue-400/30 text-blue-100'
                : 'bg-gray-100 dark:bg-gray-600/50 text-gray-700 dark:text-gray-200'
            }`}
          >
            {imageUrl && isImage ? (
              <img
                src={imageUrl}
                alt={att.name}
                className="w-8 h-8 rounded object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                  const parent = (e.target as HTMLImageElement).parentElement
                  if (parent) {
                    const span = document.createElement('span')
                    span.className = 'text-lg'
                    span.textContent = '🖼️'
                    parent.insertBefore(span, e.target as Node)
                  }
                }}
              />
            ) : (
              <span className="text-lg">{CATEGORY_ICONS[att.category] || '📎'}</span>
            )}
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{att.name}</div>
              <div className="text-xs opacity-75">{formatFileSize(att.size)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}