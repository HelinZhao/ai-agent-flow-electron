import { useState, useEffect } from 'react'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomSwitch from '@renderer/components/ui/CustomSwitch'
import CustomInput from '@renderer/components/ui/CustomInput'
import MessageBanner from '@renderer/components/ui/MessageBanner'
import { useSettingsStore } from '@renderer/store/settingsStore'

const isElectron = Boolean(window.electron || window.api)

export default function SettingsGit() {
  const setGitEnabledStore = useSettingsStore(s => s.setGitEnabled)
  const [enabled, setEnabled] = useState(false)
  const [repoPath, setRepoPath] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [status, setStatus] = useState<{ total: number; unstaged: number; lastCommit: string | null } | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!isElectron) return
    window.api!.git.loadConfig().then(cfg => {
      setEnabled(cfg.enabled)
      setRepoPath(cfg.repoPath)
      setGitEnabledStore(cfg.enabled && !!cfg.repoPath)
      if (cfg.enabled && cfg.repoPath) {
        setInitialized(true)
        refreshStatus(cfg.repoPath)
      }
    })
  }, [])

  const refreshStatus = async (path: string) => {
    try {
      const s = await window.api!.git.status(path)
      setStatus(s)
    } catch { /* not ready yet */ }
  }

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked)
    setGitEnabledStore(checked && !!repoPath)
    if (checked && repoPath) {
      try {
        await window.api!.git.initRepo(repoPath)
        setInitialized(true)
        await window.api!.git.saveConfig({ enabled: true, repoPath })
        setMessage({ type: 'success', text: 'Git 仓库已初始化' })
        refreshStatus(repoPath)
      } catch (e: any) {
        setEnabled(false)
        setGitEnabledStore(false)
        setMessage({ type: 'error', text: '初始化 Git 仓库失败: ' + (e.message || e) })
      }
    } else {
      await window.api!.git.saveConfig({ enabled: false, repoPath }).catch(() => {})
    }
  }

  const handleSave = async () => {
    if (!repoPath) return
    setSaving(true)
    try {
      await window.api!.git.saveConfig({ enabled, repoPath })
      setGitEnabledStore(enabled && !!repoPath)
      if (enabled) {
        await window.api!.git.initRepo(repoPath)
        setInitialized(true)
        refreshStatus(repoPath)
      }
      setMessage({ type: 'success', text: '配置已保存' })
    } catch (e: any) {
      setMessage({ type: 'error', text: '保存失败: ' + (e.message || e) })
    } finally {
      setSaving(false)
    }
  }

  if (!isElectron) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Git 版本控制</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">仅在桌面端可用</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Git 版本控制</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">将工作流、Agent 和技能数据以 JSON 文件形式同步到 Git 仓库，通过 Git 面板手动暂存和提交</p>
      </div>

      {message && (
        <MessageBanner type={message.type} text={message.text} onClose={() => setMessage(null)} />
      )}

      <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">启用 Git 同步</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">保存数据时同步写入 JSON 文件到 Git 仓库，通过底部 Git 面板手动提交</p>
          </div>
          <CustomSwitch checked={enabled} onChange={handleToggle} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">仓库路径</label>
          <div className="flex gap-2">
            <CustomInput
              value={repoPath}
              onChange={e => setRepoPath(e.target.value)}
              placeholder="选择或输入 Git 仓库目录路径"
              className="flex-1"
              size="sm"
            />
            <CustomButton variant="secondary" size="sm" onClick={handleSave} loading={saving}>
              保存
            </CustomButton>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            指定一个本地目录用于存放 Git 仓库，会自动创建 <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[11px]">data/export/</code> 目录
          </p>
        </div>
      </div>

      {initialized && status && (
        <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">仓库状态</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{status.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">提交总数</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{status.unstaged}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">未提交变更</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white" title={status.lastCommit || ''}>
                {(status.total || status.lastCommit) ? '✔' : '—'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">最近提交</p>
            </div>
          </div>
          {status.lastCommit && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate font-mono">
              HEAD: {status.lastCommit}
            </p>
          )}
          <CustomButton variant="secondary" size="xs" onClick={() => refreshStatus(repoPath)}>
            刷新状态
          </CustomButton>
        </div>
      )}
    </div>
  )
}
