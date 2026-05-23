import { useEffect, useState } from 'react'
import { Template } from '@renderer/types'
import { useWorkflowStore } from '@renderer/store/workflowStore'
import { mcpApi } from '@renderer/lib/mcpApi'
import Modal from '@renderer/components/ui/Modal'
import CustomButton from '@renderer/components/ui/CustomButton'

const TABS = [
  { key: '', label: '全部' },
  { key: 'api', label: 'API 模板' },
  { key: 'mcp', label: 'MCP 配置' },
  { key: 'code', label: '代码片段' },
]

const TYPE_LABELS: Record<string, string> = { api: 'API 模板', mcp: 'MCP 配置', code: '代码片段' }

export default function Marketplace(): React.JSX.Element {
  const templates = useWorkflowStore(s => s.templates)
  const fetchTemplates = useWorkflowStore(s => s.fetchTemplates)
  const mcpServers = useWorkflowStore(s => s.mcpServers)
  const [activeTab, setActiveTab] = useState('')
  const [selected, setSelected] = useState<Template | null>(null)

  useEffect(() => { fetchTemplates() }, [])

  const isInstalled = (t: Template) => t.type === 'mcp' && mcpServers.some(s => s.name === (JSON.parse(t.content).name || t.name))

  const filtered = activeTab ? templates.filter(t => t.type === activeTab) : templates

  return (
    <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-6xl">
      {/* 标题 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          模板市场
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          浏览并使用预构建的集成能力，快速扩展工作流
        </p>
      </div>

      {/* 分类 tab */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ' + (
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
          selected && selected.type === 'mcp' ? (
            <div className="flex gap-2">
              <CustomButton onClick={() => setSelected(null)} variant="ghost" size="sm">关闭</CustomButton>
              <CustomButton
                variant="primary"
                size="sm"
                disabled={isInstalled(selected)}
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
          ) : (
            <div className="flex gap-2">
              <CustomButton onClick={() => setSelected(null)} variant="ghost" size="sm">关闭</CustomButton>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{selected.description}</p>
            {selected.type !== 'mcp' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                在 {selected.type === 'api' ? 'API' : 'Code'} 节点的配置面板中点击「从模板导入」使用此模板
              </div>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>类型: {TYPE_LABELS[selected.type]}</span>
              <span>分类: {selected.category}</span>
              <span>版本: v{selected.version}</span>
            </div>
            <pre className="p-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/50 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words max-h-[300px] overflow-auto">
              {JSON.stringify(JSON.parse(selected.content), null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  )
}
