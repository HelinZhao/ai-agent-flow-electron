import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Workflow, Skill, Agent, LLMConfig } from '@renderer/types'
import { workflowApi, skillApi, agentApi, llmConfigApi } from '@renderer/lib/api'

interface WorkflowState {
  workflows: Workflow[]
  skills: Skill[]
  agents: Agent[]
  llmConfigs: LLMConfig[]
  activeLLMConfig: LLMConfig | null
  currentWorkflow: Workflow | null
  currentPage: string
  loading: boolean
  error: string | null

  // 初始化数据
  initialize: () => Promise<void>

  // Workflow actions
  addWorkflow: (workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Workflow>
  updateWorkflow: (id: string, updates: Partial<Workflow>) => Promise<void>
  deleteWorkflow: (id: string) => Promise<void>
  setCurrentWorkflow: (workflow: Workflow | null) => void
  setCurrentPage: (page: string) => void

  // Skill actions
  addSkill: (skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateSkill: (id: string, updates: Partial<Skill>) => Promise<void>
  deleteSkill: (id: string) => Promise<void>

  // Agent actions
  addAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>
  deleteAgent: (id: string) => Promise<void>

  // LLM config actions
  addLLMConfig: (config: Omit<LLMConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateLLMConfig: (id: string, updates: Partial<LLMConfig>) => Promise<void>
  deleteLLMConfig: (id: string) => Promise<void>
  activateLLMConfig: (id: string) => Promise<void>
  getLLMConfigs: () => Promise<void>
  getActiveLLMConfig: () => Promise<void>

  // Internal helper methods
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setWorkflows: (workflows: Workflow[]) => void
  setSkills: (skills: Skill[]) => void
  setAgents: (agents: Agent[]) => void
  setLLMConfigs: (configs: LLMConfig[]) => void
  setActiveLLMConfig: (config: LLMConfig | null) => void
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      workflows: [],
      skills: [],
      agents: [],
      llmConfigs: [],
      activeLLMConfig: null,
      currentWorkflow: null,
      currentPage: '/',
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
          await state.getLLMConfigs()
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
      setLLMConfigs: (configs: LLMConfig[]) => set({ llmConfigs: configs }),
      setActiveLLMConfig: (config: LLMConfig | null) => set({ activeLLMConfig: config }),
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
      setCurrentPage: (page) => {
        set({ currentPage: page })
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

      addLLMConfig: async (config) => {
        const state = get()
        try {
          state.setLoading(true)
          state.setError(null)

          const newConfig = await llmConfigApi.create(config)
          set({ llmConfigs: [newConfig, ...state.llmConfigs] })

          // 如果是第一个配置或者设置为活跃，则更新活跃配置
          if (state.llmConfigs.length === 0 || config.isActive) {
            state.setActiveLLMConfig(newConfig)
          }
        } catch (error) {
          console.error('创建LLM配置失败:', error)
          state.setError('创建LLM配置失败')
          throw error
        } finally {
          state.setLoading(false)
        }
      },

      updateLLMConfig: async (id, updates) => {
        const state = get()
        try {
          state.setLoading(true)
          state.setError(null)

          const updatedConfig = await llmConfigApi.update(id, updates)
          set({
            llmConfigs: state.llmConfigs.map((c) => (c.id === id ? updatedConfig : c))
          })

          // 如果更新的是活跃配置，也更新活跃配置
          if (state.activeLLMConfig?.id === id) {
            state.setActiveLLMConfig(updatedConfig)
          }
        } catch (error) {
          console.error('更新LLM配置失败:', error)
          state.setError('更新LLM配置失败')
          throw error
        } finally {
          state.setLoading(false)
        }
      },

      deleteLLMConfig: async (id) => {
        const state = get()
        try {
          state.setLoading(true)
          state.setError(null)

          await llmConfigApi.delete(id)

          const newConfigs = state.llmConfigs.filter((c) => c.id !== id)
          set({ llmConfigs: newConfigs })

          // 如果删除的是活跃配置，需要重新获取活跃配置
          if (state.activeLLMConfig?.id === id) {
            const activeConfig = newConfigs.find((c) => c.isActive) || newConfigs[0] || null
            state.setActiveLLMConfig(activeConfig)
          }
        } catch (error) {
          console.error('删除LLM配置失败:', error)
          state.setError('删除LLM配置失败')
          throw error
        } finally {
          state.setLoading(false)
        }
      },

      activateLLMConfig: async (id) => {
        const state = get()
        try {
          state.setLoading(true)
          state.setError(null)

          const result = await llmConfigApi.activate(id)

          // 更新配置列表中的活跃状态
          const updatedConfigs = state.llmConfigs.map((config) => ({
            ...config,
            isActive: config.id === id
          }), { name: "workflow-storage", partialize: (state) => ({ currentPage: state.currentPage }), })

          set({
            llmConfigs: updatedConfigs,
            activeLLMConfig: result.config
          })
        } catch (error) {
          console.error('切换LLM配置失败:', error)
          state.setError('切换LLM配置失败')
          throw error
        } finally {
          state.setLoading(false)
        }
      },

      getLLMConfigs: async () => {
        const state = get()
        try {
          state.setLoading(true)
          state.setError(null)

          const configs = await llmConfigApi.getAll()
          set({ llmConfigs: configs })

          // 设置活跃配置
          const activeConfig = configs.find((c) => c.isActive) || configs[0] || null
          if (activeConfig) {
            state.setActiveLLMConfig(activeConfig)
          }
        } catch (error) {
          console.error('获取LLM配置失败:', error)
          state.setError('获取LLM配置失败')
        } finally {
          state.setLoading(false)
        }
      },

      getActiveLLMConfig: async () => {
        const state = get()
        try {
          state.setLoading(true)
          state.setError(null)

          const config = await llmConfigApi.getActive()
          if (config && Object.keys(config).length > 0) {
            state.setActiveLLMConfig(config)
          }
        } catch (error) {
          console.error('获取活跃LLM配置失败:', error)
          state.setError('获取活跃LLM配置失败')
        } finally {
          state.setLoading(false)
        }
      }
    }),
    {
      name: "workflow-storage",
      partialize: (state) => ({
        currentPage: state.currentPage
      })
    }
  )
)
