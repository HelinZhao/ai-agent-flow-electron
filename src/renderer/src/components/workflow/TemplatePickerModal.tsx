import { useEffect, useState } from 'react'
import { Template } from '@renderer/types'
import { templateApi } from '@renderer/lib/api'
import Modal from '../ui/Modal'
import CustomButton from '../ui/CustomButton'

interface TemplatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'api' | 'code'
  onSelect: (template: Template) => void
}

const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({ isOpen, onClose, type, onSelect }) => {
  const [list, setList] = useState<Template[]>([])
  const [selected, setSelected] = useState<Template | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setSelected(null)
    templateApi.getAll(type).then(setList).catch(() => setList([]))
  }, [isOpen, type])

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={'从模板导入 — ' + (type === 'api' ? 'API 配置' : '代码片段')}
    >
      {list.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">暂无可用模板</div>
      ) : (
        <div className="space-y-1">
          {list.map(t => (
            <div
              key={t.id}
              onClick={() => setSelected(t)}
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

      <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700 mt-4">
        <CustomButton onClick={onClose} variant="ghost" size="sm">取消</CustomButton>
        <CustomButton
          variant="primary"
          size="sm"
          disabled={!selected}
          onClick={() => { if (selected) { onSelect(selected); onClose() } }}
        >
          应用
        </CustomButton>
      </div>
    </Modal>
  )
}

export default TemplatePickerModal
