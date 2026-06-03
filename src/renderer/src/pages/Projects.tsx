import { useState, useCallback } from 'react'
import { useAppStore } from '@renderer/store/appStore'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomTextarea from '@renderer/components/ui/CustomTextarea'
import Modal from '@renderer/components/ui/Modal'
import type { Project } from '@renderer/types'

interface ProjectFormData {
  name: string
  description: string
  workDir: string
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: Project
  onEdit: (p: Project) => void
  onDelete: (id: string) => void
}) {
  const handleOpenDir = async () => {
    try {
      await window.api.shell.openPath(project.workDir)
    } catch (err) {
      console.error('打开目录失败:', err)
    }
  }

  const dirExists = project.workDir.length > 0

  return (
    <div className="group/project relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      <div className="h-1.5 rounded-t-xl bg-gradient-to-r from-blue-400 to-cyan-500" />
      <div className="p-4">
        <div className="flex items-start gap-2.5 mb-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 flex-shrink-0">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {project.name}
            </h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
              {project.description || '暂无描述'}
            </p>
          </div>
        </div>

        {/* 工作目录 */}
        <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-gray-100 dark:border-gray-700/30">
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1" title={project.workDir}>
            {project.workDir}
          </span>
          {dirExists && (
            <button
              onClick={handleOpenDir}
              title="在文件管理器中打开"
              className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-3 opacity-0 group-hover/project:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(project)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            编辑
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            删除
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Projects() {
  const { projects, addProject, updateProject, deleteProject } = useAppStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [form, setForm] = useState<ProjectFormData>({ name: '', description: '', workDir: '' })
  const [saving, setSaving] = useState(false)
  const [dirWarning, setDirWarning] = useState('')

  const resetForm = () => setForm({ name: '', description: '', workDir: '' })

  const openCreate = () => {
    resetForm()
    setDirWarning('')
    setShowCreate(true)
  }

  const openEdit = (p: Project) => {
    setForm({ name: p.name, description: p.description, workDir: p.workDir })
    setEditingProject(p)
    setDirWarning('')
  }

  const checkDir = async (dir: string) => {
    if (!dir) { setDirWarning(''); return }
    try {
      const res = await fetch(`file://${dir}`)
      // 如果不能访问，这里不会抛出错误但下面会 catch
      setDirWarning('')
    } catch {
      setDirWarning('⚠️ 目录不存在或无法访问')
    }
  }

  const handleSelectDir = async () => {
    try {
      const dir = await window.api.dialog.showOpen()
      if (dir) {
        setForm(prev => ({ ...prev, workDir: dir }))
        setDirWarning('')
      }
    } catch (err) {
      console.error('选择目录失败:', err)
    }
  }

  const handleOpenDir = async () => {
    if (form.workDir) {
      try {
        await window.api.shell.openPath(form.workDir)
      } catch (err) {
        console.error('打开目录失败:', err)
      }
    }
  }

  const handleSave = async () => {
    if (!form.name || !form.workDir) return
    setSaving(true)
    try {
      if (editingProject) {
        await updateProject(editingProject.id, form)
        setEditingProject(null)
      } else {
        await addProject(form)
        setShowCreate(false)
      }
      resetForm()
    } catch (err) {
      console.error('保存项目失败:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此项目？关联此项目的任务将保留项目ID但不再关联有效项目。')) return
    try {
      await deleteProject(id)
    } catch (err) {
      console.error('删除项目失败:', err)
    }
  }

  const isModalOpen = showCreate || !!editingProject
  const closeModal = () => { setShowCreate(false); setEditingProject(null); resetForm() }

  return (
    <div className="px-6 py-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            项目
          </h1>
          <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">
            管理项目工作目录，任务可关联项目并使用其工作目录作为执行上下文
          </p>
        </div>
        <CustomButton onClick={openCreate} variant="primary" size="sm">
          <span>＋</span>
          <span>创建项目</span>
        </CustomButton>
      </div>

      {/* Project Grid */}
      {projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 mb-6">
            <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            还没有项目
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-400 mb-6">
            创建项目并设置工作目录，任务执行时将以此目录作为上下文
          </p>
          <button
            onClick={openCreate}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 shadow-lg font-medium"
          >
            创建第一个项目
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
            </div>
            <div>
              <span className="text-base font-semibold">{editingProject ? '编辑项目' : '创建项目'}</span>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center gap-2 ml-auto">
            <CustomButton onClick={closeModal} variant="secondary" size="sm">取消</CustomButton>
            <CustomButton onClick={handleSave} variant="primary" loading={saving} size="sm" disabled={!form.name || !form.workDir}>
              {editingProject ? '保存' : '创建'}
            </CustomButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">项目名称 <span className="text-red-500">*</span></label>
            <CustomInput value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="输入项目名称" autoFocus size="sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">描述</label>
            <CustomTextarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="项目描述（可选）" rows={2} size="sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">工作目录 <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <CustomInput
                value={form.workDir}
                onChange={e => setForm(prev => ({ ...prev, workDir: e.target.value }))}
                placeholder="选择或输入工作目录路径"
                size="sm"
                className="flex-1"
                readOnly
              />
              <CustomButton onClick={handleSelectDir} variant="secondary" size="sm" className="flex-shrink-0">
                选择文件夹
              </CustomButton>
              {form.workDir && (
                <CustomButton onClick={handleOpenDir} variant="ghost" size="sm" className="flex-shrink-0" title="打开目录">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </CustomButton>
              )}
            </div>
            {dirWarning && (
              <p className="text-xs text-amber-500 mt-1">{dirWarning}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              团队执行关联此项目的任务时，将以此目录作为工作目录
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
