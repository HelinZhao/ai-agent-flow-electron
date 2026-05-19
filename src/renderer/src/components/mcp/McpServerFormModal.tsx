import { useState } from 'react'
import Modal from '@renderer/components/ui/Modal'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomSelect from '@renderer/components/ui/CustomSelect'
import CustomSwitch from '@renderer/components/ui/CustomSwitch'
import { McpServer } from '@renderer/lib/mcpApi'

interface McpServerFormModalProps {
  open: boolean
  editingServer: McpServer | null
  onClose: () => void
  onSave: (data: McpServerFormData) => Promise<void>
}

export interface McpServerFormData {
  name: string
  transportType: 'stdio' | 'sse'
  command: string
  args: string
  url: string
  enabled: boolean
}

export default function McpServerFormModal({ open, editingServer, onClose, onSave }: McpServerFormModalProps) {
  const [formName, setFormName] = useState(editingServer?.name || '')
  const [formTransport, setFormTransport] = useState<'stdio' | 'sse'>(editingServer?.transportType || 'stdio')
  const [formCommand, setFormCommand] = useState(editingServer?.command || 'npx')
  const [formArgs, setFormArgs] = useState(
    editingServer?.args ? editingServer.args.join('\n') : ''
  )
  const [formUrl, setFormUrl] = useState(editingServer?.url || '')
  const [formEnabled, setFormEnabled] = useState(editingServer?.enabled ?? true)
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setFormName(editingServer?.name || '')
    setFormTransport(editingServer?.transportType || 'stdio')
    setFormCommand(editingServer?.command || 'npx')
    setFormArgs(editingServer?.args ? editingServer.args.join('\n') : '')
    setFormUrl(editingServer?.url || '')
    setFormEnabled(editingServer?.enabled ?? true)
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    if (formTransport === 'sse' && !formUrl.trim()) return
    if (formTransport === 'stdio' && !formCommand.trim()) return

    setSaving(true)
    try {
      const args = formArgs.trim()
        ? formArgs
            .split('\n')
            .map(a => a.trim())
            .filter(a => a.length > 0)
        : []

      await onSave({
        name: formName.trim(),
        transportType: formTransport,
        command: formCommand.trim(),
        args: args.length > 0 ? JSON.stringify(args) : '',
        url: formUrl.trim(),
        enabled: formEnabled,
      })
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={editingServer ? '编辑 MCP 服务器' : '添加 MCP 服务器'}
      footer={
        <>
          <CustomButton variant="secondary" onClick={handleClose} size="sm">取消</CustomButton>
          <CustomButton
            onClick={handleSave}
            loading={saving}
            disabled={!formName.trim() || (formTransport === 'sse' && !formUrl.trim()) || (formTransport === 'stdio' && !formCommand.trim())}
            size="sm"
          >
            {editingServer ? '保存' : '添加'}
          </CustomButton>
        </>
      }
    >
      {/* 名称 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">名称 <span className="text-red-500">*</span></label>
        <CustomInput size="sm" value={formName} onChange={e => setFormName(e.target.value)} placeholder="例如：小红书 MCP" />
      </div>

      {/* 传输类型 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">传输类型</label>
        <CustomSelect
          size="sm"
          value={formTransport}
          onChange={v => setFormTransport(v as 'stdio' | 'sse')}
          options={[
            { value: 'stdio', label: 'Stdio（命令行启动）' },
            { value: 'sse', label: 'SSE（HTTP URL）' },
          ]}
        />
      </div>

      {/* stdio 字段 */}
      {formTransport === 'stdio' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">命令 <span className="text-red-500">*</span></label>
            <CustomInput size="sm" value={formCommand} onChange={e => setFormCommand(e.target.value)} placeholder="npx" />
            <p className="text-xs text-gray-400 mt-1">用于启动 MCP 服务器的命令，如 npx、node、python 等</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">参数（每行一个）</label>
            <textarea
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors resize-none"
              value={formArgs}
              onChange={e => setFormArgs(e.target.value)}
              placeholder={'-y\n@modelcontextprotocol/server-filesystem\n/tmp'}
              rows={4}
            />
            <p className="text-xs text-gray-400 mt-1">每行一个参数，如 -y、包名、路径等</p>
          </div>
        </>
      )}

      {/* SSE 字段 */}
      {formTransport === 'sse' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">URL <span className="text-red-500">*</span></label>
          <CustomInput size="sm" value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="http://localhost:3001/mcp" />
          <p className="text-xs text-gray-400 mt-1">MCP 服务器的 SSE 端点地址</p>
        </div>
      )}

      {/* 启用开关 */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">启用</label>
          <p className="text-xs text-gray-400">添加后自动连接并发现工具</p>
        </div>
        <CustomSwitch checked={formEnabled} onChange={setFormEnabled} />
      </div>
    </Modal>
  )
}
