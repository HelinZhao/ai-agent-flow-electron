import React from 'react'
import { ChatMessage as ChatMessageType, AttachmentMetadata } from '@renderer/types'
import MarkdownPreview from '@renderer/components/MarkdownPreview'
import Avatar from '@renderer/components/ui/Avatar'
import AttachmentDisplay from '@renderer/components/chat/AttachmentDisplay'

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

interface ChatMessageProps {
  message: ChatMessageType
  agentName: string
  agentAvatarUrl?: string
  onAttachmentClick: (att: AttachmentMetadata) => void
  isLastAgent?: boolean
  onRegenerate?: () => void
}

import CopyButton from '../ui/CopyButton'

const ChatMessage = React.memo(function ChatMessage({
  message,
  agentName,
  agentAvatarUrl,
  onAttachmentClick,
  isLastAgent,
  onRegenerate,
}: ChatMessageProps) {
  const isUser = message.sender === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse max-w-[72%]' : 'max-w-[80%]'}`}>
        {/* 头像 */}
        {isUser ? (
          <Avatar
            name={'User'}
            size="sm"
            fallbackIcon={
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
            className="mt-0.5 shadow-sm"
            shape="circle"
          />
        ) : (
          <Avatar
            src={agentAvatarUrl}
            name={agentName}
            size="sm"
            fallbackIcon="🤖"
            className="mt-0.5 shadow-sm"
            shape="circle"
          />
        )}

        <div className="flex flex-col gap-1">
          {/* 消息气泡 */}
          <div
            className={`px-4 py-2.5 min-w-0 ${isUser
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md shadow-sm shadow-blue-500/15'
              : 'bg-white dark:bg-gray-700/80 text-gray-900 dark:text-white border border-gray-200/50 dark:border-gray-600/40 rounded-2xl rounded-bl-md shadow-sm'
              }`}
          >
            <AttachmentDisplay
              attachments={message.attachments}
              sender={message.sender}
              onAttachmentClick={onAttachmentClick}
            />
            {isUser
              ? <div className="text-sm leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
              : <div className="text-sm leading-relaxed">
                <MarkdownPreview content={message.content} />
              </div>
            }
            <div className={`text-[11px] mt-1.5 flex items-center gap-1 ${isUser ? 'text-blue-100/80' : 'text-gray-400 dark:text-gray-500'
              }`}>
              <span>{formatTime(message.timestamp)}</span>
              {!isUser && (
                <>
                  <span>·</span>
                  <span>{agentName}</span>
                </>
              )}
            </div>
          </div>

          {/* 底部操作按钮（hover 显示） */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
            <CopyButton text={message.content} iconSize="w-3.5 h-3.5" />
            {isLastAgent && onRegenerate && (
              <button
                onClick={onRegenerate}
                title="重新生成"
                className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

export default ChatMessage
