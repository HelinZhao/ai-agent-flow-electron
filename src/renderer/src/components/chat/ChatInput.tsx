import { ToolApprovalRequest } from '@renderer/types'
import type { AttachmentData } from '@renderer/lib/attachmentUtils'
import CustomButton from '@renderer/components/ui/CustomButton'
import AttachmentPreview from '@renderer/components/chat/AttachmentPreview'
import CustomFileUpload from '@renderer/components/ui/CustomFileUpload'

interface ChatInputProps {
  inputMessage: string
  onInputChange: (value: string) => void
  onSend: () => void
  disabled: boolean
  placeholder: string
  attachments: AttachmentData[]
  onAttachmentsChange: (attachments: AttachmentData[]) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  isLoading: boolean
  onTerminate: () => void
  pendingApproval: ToolApprovalRequest | null
  onApprove: (approved: boolean) => void
  onAutoApprove: (toolName: string) => void
  inputHeight: number
  onResizeStart: (e: React.MouseEvent) => void
  inputWrapperRef: React.RefObject<HTMLDivElement | null>
}

const TOOL_LABELS: Record<string, string> = {
  readFile: '读取文件',
  writeFile: '写入文件',
  listDirectory: '列出目录',
  executeCommand: '执行命令',
  httpRequest: 'HTTP请求',
  webSearch: '网页搜索',
}

export default function ChatInput({
  inputMessage,
  onInputChange,
  onSend,
  disabled,
  placeholder,
  attachments,
  onAttachmentsChange,
  onFileSelect,
  isLoading,
  onTerminate,
  pendingApproval,
  onApprove,
  onAutoApprove,
  inputHeight,
  onResizeStart,
  inputWrapperRef,
}: ChatInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (inputMessage.trim() || attachments.length > 0) onSend()
    }
  }

  return (
    <>
      {/* 拖拽分隔条 */}
      <div
        className="h-2 cursor-ns-resize relative flex items-center justify-center group hover:bg-blue-500/5 transition-colors shrink-0"
        onMouseDown={onResizeStart}
      >
        <div className="w-7 h-0.5 rounded-full bg-gray-300/70 dark:bg-gray-600/70 group-hover:bg-blue-400/60 transition-colors" />
      </div>

      {/* 输入区域 */}
      <div ref={inputWrapperRef} className="px-4 pb-4 pt-0 shrink-0" style={{ height: inputHeight, minHeight: 100 }}>
        <div className="bg-white dark:bg-gray-700/80 rounded-2xl border border-gray-200/50 dark:border-gray-600/40 overflow-hidden shadow-sm h-full flex flex-col">
          <div className="px-4 pt-3.5 pb-0 flex-1 flex flex-col min-h-0">
            {/* 审批请求 */}
            {pendingApproval && (
              <div className="mb-2 p-2.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/50">
                <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                  工具调用需要审批
                </div>
                <div className="space-y-1.5 mb-2">
                  {pendingApproval.actionRequests.map((action, i) => (
                    <div key={i} className="bg-gray-50/80 dark:bg-gray-600/40 rounded-lg p-2 text-xs border border-gray-100 dark:border-gray-600/30">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {TOOL_LABELS[action.name] || action.name}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 mt-1 max-h-[60px] overflow-auto font-mono text-[10px]">
                        {JSON.stringify(action.args, null, 2)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <CustomButton onClick={() => onApprove(true)} variant="primary" size="xs">允许</CustomButton>
                  <CustomButton onClick={() => onApprove(false)} variant="danger" size="xs">拒绝</CustomButton>
                  <CustomButton onClick={() => {
                    [...new Set(pendingApproval.actionRequests.map((a) => a.name))].forEach((n) => onAutoApprove(n))
                  }} variant="secondary" size="xs">本会话允许</CustomButton>
                </div>
              </div>
            )}

            <AttachmentPreview
              attachments={attachments}
              onRemove={(id) => onAttachmentsChange(attachments.filter((a) => a.id !== id))}
            />
            <textarea
              value={inputMessage}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              className="w-full resize-none bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm leading-relaxed flex-1 min-h-0"
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between px-3 pb-2.5 pt-1 shrink-0">
            <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
              <CustomFileUpload onChange={onFileSelect} multiple disabled={disabled} size="xs" variant="ghost">
                附件
              </CustomFileUpload>
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
    </>
  )
}
