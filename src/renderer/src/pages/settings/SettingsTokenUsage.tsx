import { useEffect, useState } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import { tokenUsageApi } from '@renderer/lib/api'
import type { ModelTokenUsage } from '@renderer/types'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
]

const SettingsTokenUsage = () => {
  const [data, setData] = useState<ModelTokenUsage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    tokenUsageApi.getSummary().then((rows) => {
      if (!cancelled) setData(rows)
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const totalTokens = data.reduce((s, r) => s + r.totalTokens, 0)
  const labels = data.map(r => r.model)
  const totalPerModel = data.map(r => r.totalTokens)
  const promptPerModel = data.map(r => r.promptTokens)
  const completionPerModel = data.map(r => r.completionTokens)

  const doughnutData = {
    labels,
    datasets: [{
      data: totalPerModel,
      backgroundColor: COLORS.slice(0, labels.length),
      borderWidth: 0,
    }],
  }

  const barData = {
    labels,
    datasets: [
      { label: '输入 tokens', data: promptPerModel, backgroundColor: '#3b82f6', borderRadius: 4 },
      { label: '输出 tokens', data: completionPerModel, backgroundColor: '#8b5cf6', borderRadius: 4 },
    ],
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Token 用量统计</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">各模型 Token 消耗汇总，数据从 usage_logs 表实时获取</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">
          <svg className="w-5 h-5 animate-spin mr-2" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          加载中...
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
          <svg className="w-10 h-10 mb-2 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <p className="text-sm">暂无 Token 用量数据</p>
          <p className="text-xs mt-1">执行工作流后会自动记录</p>
        </div>
      ) : (
        <>
          {/* 总计卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: '总调用次数', value: data.reduce((s, r) => s + r.callCount, 0).toLocaleString(), color: 'text-blue-600' },
              { label: '总 Tokens', value: totalTokens.toLocaleString(), color: 'text-purple-600' },
              { label: '输入 Tokens', value: data.reduce((s, r) => s + r.promptTokens, 0).toLocaleString(), color: 'text-cyan-600' },
              { label: '输出 Tokens', value: data.reduce((s, r) => s + r.completionTokens, 0).toLocaleString(), color: 'text-green-600' },
            ].map((card, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4 shadow-sm">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{card.label}</div>
                <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* 图表 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">各模型 Token 占比</h3>
              <div className="flex justify-center" style={{ maxHeight: 280 }}>
                <Doughnut data={doughnutData} options={{ cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } } }} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">输入 / 输出对比</h3>
              <div style={{ height: 260 }}>
                <Bar data={barData} options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { ticks: { font: { size: 11 } } }, y: { beginAtZero: true } },
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } },
              }} />
              </div>
            </div>
          </div>

          {/* 明细表格 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  <th className="text-left px-4 py-3 font-medium">提供商</th>
                  <th className="text-left px-4 py-3 font-medium">模型</th>
                  <th className="text-right px-4 py-3 font-medium">调用次数</th>
                  <th className="text-right px-4 py-3 font-medium">输入 Tokens</th>
                  <th className="text-right px-4 py-3 font-medium">输出 Tokens</th>
                  <th className="text-right px-4 py-3 font-medium">总计 Tokens</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.provider}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.model}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.callCount}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.promptTokens.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.completionTokens.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{row.totalTokens.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default SettingsTokenUsage
