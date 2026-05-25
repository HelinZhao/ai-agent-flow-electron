import { useEffect, useState } from 'react'
import { Template } from '@renderer/types'
import { templateApi } from '@renderer/lib/api'
import Modal from '../ui/Modal'
import CustomButton from '../ui/CustomButton'

interface TemplatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'api' | 'code' | 'cli' | 'sql'
  onSelect: (template: Template) => void
}

const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({ isOpen, onClose, type, onSelect }) => {
  const [list, setList] = useState<Template[]>([])
  const [selected, setSelected] = useState<Template | null>(null)
  const [detailView, setDetailView] = useState<Template | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setSelected(null)
    setDetailView(null)
    templateApi.getAll(type).then(setList).catch(() => setList([]))
  }, [isOpen, type])

  const hasDetailView = type === 'cli' || type === 'sql'
  const TYPE_TITLE: Record<string, string> = { api: 'API 配置', cli: 'CLI 命令', sql: 'SQL 语句', code: '代码片段' }

  const pickCliCommand = (t: Template, command: string, extra: Record<string, any> = {}) => {
    const modified = { ...t, content: JSON.stringify({ command, ...extra }) }
    onSelect(modified)
    onClose()
  }

  const renderDetailContent = (t: Template) => {
    let content: Record<string, any> = {}
    try { content = JSON.parse(t.content) } catch { return null }

    const extraFields: Record<string, any> = {}
    if (content.dbType) extraFields.dbType = content.dbType
    if (content.connectionConfig) extraFields.connectionConfig = content.connectionConfig

    const items: { label: string; cmd: string }[] = []

    if (content.usage) {
      items.push({ label: '基本用法', cmd: content.usage })
    }

    if (content.examples?.length) {
      content.examples.forEach((ex: any) => {
        if (ex.command) items.push({ label: `示例: ${ex.description}`, cmd: ex.command })
      })
    }

    if (content.options?.length) {
      content.options.forEach((opt: any) => {
        const shortFlag = opt.flag.split(',')[0].trim()
        const cmd = `${content.command} ${shortFlag}`
        items.push({ label: `选项: ${opt.flag}  — ${opt.description}`, cmd })
      })
    }

    return (
      <div className="space-y-1">
        {items.map((item, i) => (
          <div
            key={i}
            onClick={() => pickCliCommand(t, item.cmd, extraFields)}
            className="flex flex-col gap-0.5 p-3 rounded-lg cursor-pointer border border-transparent hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
            <code className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">{item.cmd}</code>
          </div>
        ))}
      </div>
    )
  }
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        detailView
          ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDetailView(null)}
                className="p-1 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span>{type === 'sql' ? '选择 SQL' : '选择命令'} — {detailView.name}</span>
            </div>
          )
          : '从模板导入 — ' + (TYPE_TITLE[type] || '代码片段')
      }
      footer={
        detailView ? (
          <>
            <CustomButton onClick={onClose} variant="ghost" size="sm">取消</CustomButton>
            <CustomButton onClick={() => setDetailView(null)} variant="ghost" size="sm">返回</CustomButton>
          </>
        ) : (
          <>
            <CustomButton onClick={onClose} variant="ghost" size="sm">取消</CustomButton>
            <CustomButton
              variant="primary"
              size="sm"
              disabled={!selected}
              onClick={() => { if (selected) { onSelect(selected); onClose() } }}
            >
              应用
            </CustomButton>
          </>
        )
      }
    >
      {detailView ? (
        renderDetailContent(detailView)
      ) : list.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">暂无可用模板</div>
      ) : (
        <div className="space-y-1">
          {list.map(t => (
            <div
              key={t.id}
              onClick={() => {
                if (hasDetailView) {
                  setDetailView(t)
                } else {
                  setSelected(t)
                }
              }}
              className={'flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ' + (
                selected?.id === t.id
                  ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                  : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
              )}
            >
              <span className="text-lg shrink-0">{t.icon}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{t.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

export default TemplatePickerModal
