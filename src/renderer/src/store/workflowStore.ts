import { create } from 'zustand'
import { Workflow, Skill, Agent, LLMConfig } from '@renderer/types'
import { workflowApi, skillApi, agentApi, llmConfigApi } from '@renderer/lib/api'

interface WorkflowState {
  workflows: Workflow[]
  skills: Skill[]
  agents: Agent[]
  llmConfig: LLMConfig | null
  currentWorkflow: Workflow | null
  loading: boolean
  error: string | null

  // 初始化数据
  initialize: () => Promise<void>

  // Workflow actions
  addWorkflow: (workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Workflow>
  updateWorkflow: (id: string, updates: Partial<Workflow>) => Promise<void>
  deleteWorkflow: (id: string) => Promise<void>
  setCurrentWorkflow: (workflow: Workflow | null) => void

  // Skill actions
  addSkill: (skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateSkill: (id: string, updates: Partial<Skill>) => Promise<void>
  deleteSkill: (id: string) => Promise<void>

  // Agent actions
  addAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>
  deleteAgent: (id: string) => Promise<void>

  // LLM config actions
  setLLMConfig: (config: LLMConfig) => Promise<void>
  getLLMConfig: () => Promise<void>

  // Internal helper methods
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setWorkflows: (workflows: Workflow[]) => void
  setSkills: (skills: Skill[]) => void
  setAgents: (agents: Agent[]) => void
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  skills: [],
  agents: [],
  llmConfig: null,
  currentWorkflow: null,
  loading: false,
  error: null,

  initialize: async () => {
    const state = get()
    try {
      state.setLoading(true)
      state.setError(null)

      // 并行加载所有数据
      const [workflowsRes, skillsRes, agentsRes] = await Promise.all([
        workflowApi.getAll().catch(() => [] as Workflow[]),
        skillApi.getAll().catch(() => [] as Skill[]),
        agentApi.getAll().catch(() => [] as Agent[])
      ])

      set({ workflows: workflowsRes || [] })
      set({ skills: skillsRes || [] })
      set({ agents: agentsRes || [] })

      // 加载LLM配置
      await state.getLLMConfig()
    } catch (error) {
      console.error('初始化数据失败:', error)
      state.setError('初始化数据失败')
    } finally {
      state.setLoading(false)
    }
  },

  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  setWorkflows: (workflows: Workflow[]) => set({ workflows }),
  setSkills: (skills: Skill[]) => set({ skills }),
  setAgents: (agents: Agent[]) => set({ agents }),

  addWorkflow: async (workflow) => {
    const state = get()
    try {
      state.setLoading(true)
      state.setError(null)

      const newWorkflow = await workflowApi.create(workflow)
      set({ workflows: [newWorkflow, ...state.workflows] })

      return newWorkflow
    } catch (error) {
      console.error('创建工作流失败:', error)
      state.setError('创建工作流失败')
      throw error
    } finally {
      state.setLoading(false)
    }
  },

  updateWorkflow: async (id, updates) => {
    const state = get()
    try {
      state.setLoading(true)
      state.setError(null)

      const updatedWorkflow = await workflowApi.update(id, updates)

      set({ workflows: state.workflows.map((w) => (w.id === id ? updatedWorkflow : w)) })

      if (state.currentWorkflow?.id === id) {
        set({ currentWorkflow: updatedWorkflow })
      }
    } catch (error) {
      console.error('更新工作流失败:', error)
      state.setError('更新工作流失败')
      throw error
    } finally {
      state.setLoading(false)
    }
  },

  deleteWorkflow: async (id) => {
    const state = get()
    try {
      state.setLoading(true)
      state.setError(null)

      await workflowApi.delete(id)

      set({ workflows: state.workflows.filter((w) => w.id !== id) })

      if (state.currentWorkflow?.id === id) {
        set({ currentWorkflow: null })
      }
    } catch (error) {
      console.error('删除工作流失败:', error)
      state.setError('删除工作流失败')
      throw error
    } finally {
      state.setLoading(false)
    }
  },

  setCurrentWorkflow: (workflow) => {
    set({ currentWorkflow: workflow })
  },

  addSkill: async (skill) => {
    const state = get()
    try {
      state.setLoading(true)
      state.setError(null)

      const newSkill = await skillApi.create(skill)
      set({ skills: [newSkill, ...state.skills] })
    } catch (error) {
      console.error('创建技能失败:', error)
      state.setError('创建技能失败')
      throw error
    } finally {
      state.setLoading(false)
    }
  },

  updateSkill: async (id, updates) => {
    const state = get()
    try {
      state.setLoading(true)
      state.setError(null)

      const updatedSkill = await skillApi.update(id, updates)
      set({ skills: state.skills.map((s) => (s.id === id ? updatedSkill : s)) })
    } catch (error) {
      console.error('更新技能失败:', error)
      state.setError('更新技能失败')
      throw error
    } finally {
      state.setLoading(false)
    }
  },

  deleteSkill: async (id) => {
    const state = get()
    try {
      state.setLoading(true)
      state.setError(null)

      await skillApi.delete(id)
      set({ skills: state.skills.filter((s) => s.id !== id) })
    } catch (error) {
      console.error('删除技能失败:', error)
      state.setError('删除技能失败')
      throw error
    } finally {
      state.setLoading(false)
    }
  },

  addAgent: async (agent) => {
    const state = get()
    try {
      state.setLoading(true)
      state.setError(null)

      const newAgent = await agentApi.create(agent)
      set({ agents: [newAgent, ...state.agents] })
    } catch (error) {
      console.error('创建智能体失败:', error)
      state.setError('创建智能体失败')
      throw error
    } finally {
      state.setLoading(false)
    }
  },

  updateAgent: async (id, updates) => {
    const state = get()
    try {
      state.setLoading(true)
      state.setError(null)

      const updatedAgent = await agentApi.update(id, updates)
      set({ agents: state.agents.map((a) => (a.id === id ? updatedAgent : a)) })
    } catch (error) {
      console.error('更新智能体失败:', error)
      state.setError('更新智能体失败')
      throw error
    } finally {
      state.setLoading(false)
    }
  },

  deleteAgent: async (id) => {
    const state = get()
    try {
      state.setLoading(true)
      state.setError(null)

      await agentApi.delete(id)
      set({ agents: state.agents.filter((a) => a.id !== id) })
    } catch (error) {
      console.error('删除智能体失败:', error)
      state.setError('删除智能体失败')
      throw error
    } finally {
      state.setLoading(false)
    }
  },

  setLLMConfig: async (config) => {
    const state = get()
    try {
      state.setLoading(true)
      state.setError(null)

      const updatedConfig = await llmConfigApi.update(config)
      set({ llmConfig: updatedConfig })
    } catch (error) {
      console.error('更新LLM配置失败:', error)
      state.setError('更新LLM配置失败')
      throw error
    } finally {
      state.setLoading(false)
    }
  },

  getLLMConfig: async () => {
    const state = get()
    try {
      state.setLoading(true)
      state.setError(null)

      const config = await llmConfigApi.get()
      if (config && Object.keys(config).length > 0) {
        set({ llmConfig: config })
      }
    } catch (error) {
      console.error('获取LLM配置失败:', error)
      state.setError('获取LLM配置失败')
    } finally {
      state.setLoading(false)
    }
  }
}))
