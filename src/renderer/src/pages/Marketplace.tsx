import { useEffect, useState } from 'react'
import { Template } from '@renderer/types'
import { useWorkflowStore } from '@renderer/store/workflowStore'
import { mcpApi } from '@renderer/lib/mcpApi'
import Modal from '@renderer/components/ui/Modal'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomInput from '@renderer/components/ui/CustomInput'

const TABS = [
  { key: '', label: '全部' },
  { key: 'workflow', label: '工作流' },
  { key: 'agent', label: 'Agent' },
  { key: 'skill', label: '技能' },
  { key: 'api', label: 'API 模板' },
  { key: 'mcp', label: 'MCP 配置' },
  { key: 'code', label: '代码片段' },
  { key: 'cli', label: 'CLI 模板' },
  { key: 'sql', label: 'SQL 模板' },
]

const TYPE_LABELS: Record<string, string> = { workflow: '工作流', agent: 'Agent', skill: '技能', api: 'API 模板', mcp: 'MCP 配置', code: '代码片段', cli: 'CLI 模板', sql: 'SQL 模板' }

export default function Marketplace(): React.JSX.Element {
  const templates = useWorkflowStore(s => s.templates)
  const fetchTemplates = useWorkflowStore(s => s.fetchTemplates)
  const addWorkflow = useWorkflowStore(s => s.addWorkflow)
  const addAgent = useWorkflowStore(s => s.addAgent)
  const addSkill = useWorkflowStore(s => s.addSkill)
  const mcpServers = useWorkflowStore(s => s.mcpServers)
  const [activeTab, setActiveTab] = useState('')
  const [selected, setSelected] = useState<Template | null>(null)
  const [importing, setImporting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => { fetchTemplates() }, [])

  const isInstalled = (t: Template) => t.type === 'mcp' && mcpServers.some(s => s.name === (JSON.parse(t.content).name || t.name))

  const filtered = (activeTab ? templates.filter(t => t.type === activeTab) : templates).filter(t =>
    !searchTerm || t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleImportWorkflow = async (t: Template) => {
    setImporting(true)
    try {
      const content = JSON.parse(t.content)
      const wf = { name: t.name, description: t.description, nodes: content.nodes || [], edges: content.edges || [], layoutDirection: content.layoutDirection || 'horizontal' as const }
      await addWorkflow(wf)
      setSelected(null)
    } catch (e: any) {
      alert('导入失败: ' + (e?.response?.data?.error || e.message))
    } finally {
      setImporting(false)
    }
  }

  const handleImportAgent = async (t: Template) => {
    setImporting(true)
    try {
      const content = JSON.parse(t.content)
      await addAgent({ name: t.name, description: t.description, instructions: content.instructions || '', type: content.type || 'assistant', skillIds: content.skillIds || [], enabledTools: content.enabledTools || [] })
      setSelected(null)
    } catch (e: any) {
      alert('导入失败: ' + (e?.response?.data?.error || e.message))
    } finally {
      setImporting(false)
    }
  }

  const handleImportSkill = async (t: Template) => {
    setImporting(true)
    try {
      const content = JSON.parse(t.content)
      await addSkill({ name: t.name, description: t.description, content: content.content || '' })
      setSelected(null)
    } catch (e: any) {
      alert('导入失败: ' + (e?.response?.data?.error || e.message))
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="py-4 px-6">
      {/* 标题 */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            模板市场
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            浏览并使用预构建的集成能力，快速扩展工作流
          </p>
        </div>
        <CustomInput
          type="text"
          placeholder="搜索模板..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          size="sm"
          clearable
          className="max-w-[240px] rounded-xl"
          leftIcon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>}
        />
      </div>

      {/* 分类 tab */}
      <div className="flex gap-1 flex-nowrap overflow-x-auto scrollbar-hide mb-6 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ' + (
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 卡片网格 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <p className="text-sm font-medium">暂无模板</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(t => (
            <div
              key={t.id}
              onClick={() => { setSelected(t) }}
              className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-lg transition-all duration-200 cursor-pointer p-4"
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center text-lg shadow-sm shrink-0">
                  {t.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{t.name}</div>
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                    {TYPE_LABELS[t.type] || t.type}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{t.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* 详情弹窗 */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{selected?.icon}</span>
            <div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{selected?.name}</div>
              <div className="text-xs text-gray-400">{selected?.category} · v{selected?.version}</div>
            </div>
          </div>
        }
        footer={
          (() => {
            if (!selected) return null
            const type = selected.type
            if (type === 'mcp') {
              return (
                <div className="flex gap-2">
                  <CustomButton onClick={() => setSelected(null)} variant="ghost" size="sm">关闭</CustomButton>
                  <CustomButton variant="primary" size="sm" disabled={isInstalled(selected)} loading={importing}
                    onClick={async () => {
                      try {
                        const t = selected
                        const content = JSON.parse(t.content)
                        await mcpApi.create({
                          name: t.name,
                          transportType: content.transportType || 'stdio',
                          command: content.command || '',
                          args: content.args ? JSON.parse(content.args) : [],
                        })
                        alert('MCP 服务器「' + t.name + '」已添加，请前往 MCP 服务页面连接')
                      } catch (e: any) {
                        alert('添加失败: ' + (e?.response?.data?.error || e.message))
                      }
                      setSelected(null)
                    }}
                  >
                    {isInstalled(selected) ? '已添加' : '添加'}
                  </CustomButton>
                </div>
              )
            }
            if (type === 'workflow') {
              return (
                <div className="flex gap-2">
                  <CustomButton onClick={() => setSelected(null)} variant="ghost" size="sm">关闭</CustomButton>
                  <CustomButton variant="primary" size="sm" loading={importing} onClick={() => handleImportWorkflow(selected)}>导入工作流</CustomButton>
                </div>
              )
            }
            if (type === 'agent') {
              return (
                <div className="flex gap-2">
                  <CustomButton onClick={() => setSelected(null)} variant="ghost" size="sm">关闭</CustomButton>
                  <CustomButton variant="primary" size="sm" loading={importing} onClick={() => handleImportAgent(selected)}>导入 Agent</CustomButton>
                </div>
              )
            }
            if (type === 'skill') {
              return (
                <div className="flex gap-2">
                  <CustomButton onClick={() => setSelected(null)} variant="ghost" size="sm">关闭</CustomButton>
                  <CustomButton variant="primary" size="sm" loading={importing} onClick={() => handleImportSkill(selected)}>导入技能</CustomButton>
                </div>
              )
            }
            return (
              <div className="flex gap-2">
                <CustomButton onClick={() => setSelected(null)} variant="ghost" size="sm">关闭</CustomButton>
              </div>
            )
          })()
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{selected.description}</p>
            {selected.type === 'api' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                在 API 节点的配置面板中点击「从模板导入」使用此模板
              </div>
            )}
            {selected.type === 'code' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                在 Code 节点的配置面板中点击「从模板导入」使用此模板
              </div>
            )}
            {selected.type === 'cli' && (
              <div className="p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/50 rounded-lg text-xs text-teal-700 dark:text-teal-300">
                在 CLI 节点的配置面板中点击「从模板导入」使用此模板
              </div>
            )}
            {selected.type === 'sql' && (
              <div className="p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/50 rounded-lg text-xs text-violet-700 dark:text-violet-300">
                在数据库节点的配置面板中点击「从模板导入」使用此模板
              </div>
            )}
            {selected.type === 'workflow' && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg text-xs text-green-700 dark:text-green-300">
                导入后将创建一个新的工作流，包含预设的节点和连线
              </div>
            )}
            {selected.type === 'agent' && (
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-lg text-xs text-purple-700 dark:text-purple-300">
                导入后将创建一个新的 Agent，包含预设的指令和工具配置
              </div>
            )}
            {selected.type === 'skill' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                导入后将创建一个新的技能，可在 LLM 节点中绑定使用
              </div>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>类型: {TYPE_LABELS[selected.type]}</span>
              <span>分类: {selected.category}</span>
              <span>版本: v{selected.version}</span>
            </div>
            {selected.type !== 'workflow' && selected.type !== 'agent' && (
              <pre className="p-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/50 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words max-h-[300px] overflow-auto">
                {JSON.stringify(JSON.parse(selected.content), null, 2)}
              </pre>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
