import { useState, useRef } from 'react'
import { useAppStore } from '@renderer/store/appStore'
import { triggerApi } from '@renderer/lib/api'
import MessageBanner from '@renderer/components/ui/MessageBanner'

export default function SettingsBackup() {
  const {
    workflows, skills, agents, llmConfigs, triggers, knowledgeBases,
    addWorkflow, addSkill, addAgent, addLLMConfig, addKnowledgeBase, fetchTriggers
  } = useAppStore()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    if (!window.api?.dialog) {
      setMessage({ type: 'error', text: '导出功能仅在桌面客户端可用' })
      return
    }
    const defaultName = `agent-flow-backup-${new Date().toISOString().slice(0, 10)}.json`
    const filePath = await window.api.dialog.showSave({
      defaultPath: defaultName,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (!filePath) return
    const data = { workflows, skills, agents, llmConfigs, triggers, knowledgeBases }
    const result = await window.api.file.write(filePath, JSON.stringify(data, null, 2))
    if (result.success) {
      setMessage({ type: 'success', text: '数据导出成功' })
    } else {
      setMessage({ type: 'error', text: result.error || '导出失败' })
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setMessage(null)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.workflows && !data.skills && !data.agents && !data.llmConfigs && !data.triggers && !data.knowledgeBases) {
        setMessage({ type: 'error', text: '无效的备份文件格式' })
        return
      }
      let count = 0
      if (data.workflows) for (const w of data.workflows) { await addWorkflow(w); count++ }
      if (data.skills) for (const s of data.skills) { await addSkill(s); count++ }
      if (data.agents) for (const a of data.agents) { await addAgent(a); count++ }
      if (data.llmConfigs) for (const c of data.llmConfigs) { await addLLMConfig(c); count++ }
      if (data.triggers) for (const t of data.triggers) { await triggerApi.create(t); count++ }
      if (data.knowledgeBases) for (const kb of data.knowledgeBases) { await addKnowledgeBase(kb); count++ }
      // 刷新数据
      await fetchTriggers()
      setMessage({ type: 'success', text: `导入完成，共处理 ${count} 条数据` })
    } catch {
      setMessage({ type: 'error', text: '导入失败，请检查文件格式' })
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">数据备份</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">导出或导入工作流、技能、Agent、LLM 配置、触发器和知识库</p>
      </div>

      {message && (
        <MessageBanner type={message.type} text={message.text} onClose={() => setMessage(null)} autoCloseMs={3000} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={handleExport}
          className="flex items-start gap-4 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-md transition-all text-left">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m14-7l-5 5-5-5m5 5V3" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">导出备份</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              将所有工作流、技能、Agent、LLM 配置、触发器和知识库导出为 JSON 文件
            </p>
          </div>
        </button>

        <div onClick={() => fileRef.current?.click()}
          className={`flex items-start gap-4 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-green-300 dark:hover:border-green-600/50 hover:shadow-md transition-all cursor-pointer text-left ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5m-5 5V3" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{importing ? '导入中...' : '导入备份'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              从 JSON 备份文件恢复数据（将追加导入，不会覆盖现有数据）
            </p>
          </div>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-5">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">备份内容</h4>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>工作流：{workflows.length} 个</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>技能：{skills.length} 个</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Agent：{agents.length} 个</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>LLM 配置：{llmConfigs.length} 个</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>触发器：{triggers.length} 个</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>知识库：{knowledgeBases.length} 个</span>
          </div>
        </div>
      </div>
    </div>
  )
}
