import { useState } from 'react'
import type { AttachmentData } from '@renderer/lib/attachmentUtils'
import CustomButton from '@renderer/components/ui/CustomButton'
import AttachmentPreview from '@renderer/components/chat/AttachmentPreview'

interface ChatInputProps {
  inputMessage: string
  onInputChange: (value: string) => void
  onSend: () => void
  disabled: boolean
  placeholder: string
  attachments: AttachmentData[]
  onAttachmentsChange: (attachments: AttachmentData[]) => void
  isLoading: boolean
  onTerminate: () => void
  sentHistory: string[]
}

export default function ChatInput({
  inputMessage,
  onInputChange,
  onSend,
  disabled,
  placeholder,
  attachments,
  onAttachmentsChange,
  isLoading,
  onTerminate,
  sentHistory,
}: ChatInputProps) {
  const [historyIdx, setHistoryIdx] = useState(-1)

  const historyPlaceholder = historyIdx >= 0 && historyIdx < sentHistory.length
    ? sentHistory[sentHistory.length - 1 - historyIdx]
    : ''

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (inputMessage.trim() || attachments.length > 0) onSend()
      return
    }

    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !inputMessage && sentHistory.length > 0) {
      e.preventDefault()
      if (e.key === 'ArrowUp') {
        setHistoryIdx((prev) => Math.min(prev + 1, sentHistory.length - 1))
      } else {
        setHistoryIdx((prev) => Math.max(prev - 1, -1))
      }
      return
    }

    if (e.key === 'Tab' && historyIdx >= 0 && historyPlaceholder) {
      e.preventDefault()
      onInputChange(historyPlaceholder)
      setHistoryIdx(-1)
      return
    }

    if (historyIdx >= 0 && e.key.length === 1) {
      setHistoryIdx(-1)
    }
  }

  return (
    <div className="px-4 pb-3 shrink-0 flex flex-col min-h-0 flex-1">
      <div className="bg-white dark:bg-gray-700/80 rounded-2xl border border-gray-200/50 dark:border-gray-600/40 overflow-hidden shadow-sm flex flex-col flex-1 min-h-0">
        <div className="p-2.5 pb-0 flex-1 flex flex-col min-h-0 relative">
          <AttachmentPreview
            attachments={attachments}
            onRemove={(id) => onAttachmentsChange(attachments.filter((a) => a.id !== id))}
          />
          <textarea
            value={inputMessage}
            onChange={(e) => {
              onInputChange(e.target.value)
              if (historyIdx >= 0) setHistoryIdx(-1)
            }}
            onKeyDown={handleKeyPress}
            placeholder={historyPlaceholder || placeholder}
            className="w-full resize-none bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm leading-relaxed flex-1 min-h-0"
            disabled={disabled}
          />
          {historyIdx >= 0 && (
            <div className="absolute bottom-1 right-2 text-[10px] text-blue-400 font-medium bg-white/90 dark:bg-gray-800/90 px-1.5 py-0.5 rounded shadow-sm border border-gray-100 dark:border-gray-700">
              {historyIdx + 1}/{sentHistory.length} · Tab 填入
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-3 pb-2.5 pt-1 shrink-0">
          <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-600/60 rounded text-[10px] font-medium">Enter</kbd>
              <span>发送</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-600/60 rounded text-[10px] font-medium">Shift+Enter</kbd>
              <span>换行</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
              {inputMessage.length}/2000
            </span>
            {isLoading ? (
              <CustomButton onClick={onTerminate} variant="danger" size="xs" className="flex items-center gap-1.5">
                <span>⏹</span>
                <span>终止</span>
              </CustomButton>
            ) : (
              <CustomButton
                onClick={onSend}
                disabled={!inputMessage.trim() && attachments.length === 0}
                variant="primary"
                size="xs"
                className="flex items-center gap-1.5"
              >
                <span>发送</span>
              </CustomButton>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
