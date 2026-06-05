import { useState } from 'react'
import { useAppStore } from '@renderer/store/appStore'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomTextarea from '@renderer/components/ui/CustomTextarea'
import Modal from '@renderer/components/ui/Modal'
import ProjectCard from '@renderer/components/projects/ProjectCard'
import ProjectDetail from '@renderer/components/projects/ProjectDetail'
import type { Project } from '@renderer/types'

export default function Projects() {
  const { projects, tasks, addProject, updateProject, deleteProject } = useAppStore()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [form, setForm] = useState({ name: '', description: '', workDir: '' })
  const [saving, setSaving] = useState(false)

  const resetForm = () => setForm({ name: '', description: '', workDir: '' })

  const openCreate = () => { resetForm(); setShowCreate(true) }

  const openEdit = (p: Project) => {
    setForm({ name: p.name, description: p.description, workDir: p.workDir })
    setEditingProject(p)
  }

  const handleSelectDir = async () => {
    try {
      const dir = await window.api.dialog.showOpen()
      if (dir) setForm(prev => ({ ...prev, workDir: dir }))
    } catch { /* ignore */ }
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
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此项目？关联此任务的ID将保留。')) return
    try { await deleteProject(id) } catch { /* ignore */ }
  }

  const editModal = (
    <Modal
      open={!!editingProject}
      onClose={() => setEditingProject(null)}
      title={
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          </div>
          <span className="text-base font-semibold">编辑项目</span>
        </div>
      }
      footer={
        <div className="flex items-center gap-2 ml-auto">
          <CustomButton onClick={() => setEditingProject(null)} variant="secondary" size="sm">取消</CustomButton>
          <CustomButton onClick={handleSave} variant="primary" loading={saving} size="sm" disabled={!form.name || !form.workDir}>保存</CustomButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">项目名称</label>
          <CustomInput value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} size="sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">描述</label>
          <CustomTextarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} size="sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">工作目录</label>
          <div className="flex gap-2">
            <CustomInput value={form.workDir} onChange={e => setForm(p => ({ ...p, workDir: e.target.value }))} size="sm" className="flex-1" readOnly />
            <CustomButton onClick={handleSelectDir} variant="secondary" size="sm">选择文件夹</CustomButton>
          </div>
        </div>
      </div>
    </Modal>
  )

  if (selectedProject) {
    return (
      <div className="px-6 py-4 h-full flex flex-col">
        <ProjectDetail
          project={selectedProject}
          allTasks={tasks}
          onBack={() => setSelectedProject(null)}
          onEdit={(p) => { openEdit(p) }}
        />
        {editModal}
      </div>
    )
  }

  return (
    <div className="px-6 py-4 h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">项目</h1>
          <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">
            管理项目工作目录，任务可关联项目并使用其工作目录作为执行上下文
          </p>
        </div>
        <CustomButton onClick={openCreate} variant="primary" size="sm">
          <span>＋</span>
          <span>创建项目</span>
        </CustomButton>
      </div>

      {projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 mb-6">
            <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">还没有项目</h3>
          <p className="text-sm text-gray-700 dark:text-gray-400 mb-6">
            创建项目并设置工作目录，任务执行时将以此目录作为上下文
          </p>
          <button onClick={openCreate} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 shadow-lg font-medium">
            创建第一个项目
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onSelect={setSelectedProject} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); resetForm() }}
        title={
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
            </div>
            <div><span className="text-base font-semibold">创建项目</span></div>
          </div>
        }
        footer={
          <div className="flex items-center gap-2 ml-auto">
            <CustomButton onClick={() => { setShowCreate(false); resetForm() }} variant="secondary" size="sm">取消</CustomButton>
            <CustomButton onClick={handleSave} variant="primary" loading={saving} size="sm" disabled={!form.name || !form.workDir}>创建</CustomButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">项目名称 <span className="text-red-500">*</span></label>
            <CustomInput value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="输入项目名称" autoFocus size="sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">描述</label>
            <CustomTextarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="项目描述（可选）" rows={2} size="sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">工作目录 <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <CustomInput value={form.workDir} onChange={e => setForm(p => ({ ...p, workDir: e.target.value }))} placeholder="选择或输入工作目录路径" size="sm" className="flex-1" readOnly />
              <CustomButton onClick={handleSelectDir} variant="secondary" size="sm">选择文件夹</CustomButton>
            </div>
          </div>
        </div>
      </Modal>

      {editModal}
    </div>
  )
}
