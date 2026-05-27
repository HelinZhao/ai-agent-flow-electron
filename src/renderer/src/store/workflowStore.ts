import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Workflow, Skill, Agent, LLMConfig, KnowledgeBase, Trigger, EnvVar, Template } from '@renderer/types'
import type { McpServer } from '@renderer/lib/mcpApi'
import { mcpApi } from '@renderer/lib/mcpApi'
import { workflowApi, skillApi, agentApi, llmConfigApi, knowledgeBaseApi, triggerApi, envVarApi, templateApi, waitForServer } from '@renderer/lib/api'
import { STORAGE_KEY, STORAGE_PERSIST_FIELDS, API_BASE_URL } from '@renderer/config'
import { gitAutoCommit } from '@renderer/lib/gitAutoCommit'

interface WorkflowState {
  workflows: Workflow[]
  skills: Skill[]
  agents: Agent[]
  llmConfigs: LLMConfig[]
  activeLLMConfig: LLMConfig | null
  currentPage: string
  loading: boolean
  error: string | null

  // 初始化数据
  initialize: () => Promise<void>

  // Workflow actions
  addWorkflow: (workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Workflow>
  updateWorkflow: (id: string, updates: Partial<Workflow>) => Promise<void>
  deleteWorkflow: (id: string) => Promise<void>
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

  // Knowledge base actions
  knowledgeBases: KnowledgeBase[]
  getKnowledgeBases: () => Promise<void>
  addKnowledgeBase: (data: Partial<KnowledgeBase>) => Promise<void>
  updateKnowledgeBase: (id: string, updates: Partial<KnowledgeBase>) => Promise<void>
  deleteKnowledgeBase: (id: string) => Promise<void>
  uploadDocumentToKB: (id: string, file: File) => Promise<void>
  deleteDocumentFromKB: (id: string, docName: string) => Promise<void>
  setKnowledgeBases: (kbs: KnowledgeBase[]) => void

  // Trigger data
  triggers: Trigger[]
  setTriggers: (triggers: Trigger[]) => void
  fetchTriggers: () => Promise<void>

  // Templates
  templates: Template[]
  setTemplates: (vars: Template[]) => void
  fetchTemplates: () => Promise<void>

  // MCP servers (shared between pages)
  mcpServers: McpServer[]
  setMcpServers: (servers: McpServer[]) => void
  fetchMcpServers: () => Promise<void>

  // Environment variables
  envVars: EnvVar[]
  setEnvVars: (vars: EnvVar[]) => void
  fetchEnvVars: () => Promise<void>

  // SSE 事件流
  eventSource: EventSource | null
  connectEventStream: () => void
  disconnectEventStream: () => void

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
      knowledgeBases: [],
      triggers: [],
      templates: [],
      mcpServers: [],
      envVars: [],
      currentPage: '/',
      loading: false,
      error: null,

      initialize: async () => {
        const state = get()
        try {
          state.setLoading(true)
          state.setError(null)

          // 等待服务器就绪
          await waitForServer()

          // 并行加载所有数据
          const [workflowsRes, skillsRes, agentsRes, triggersRes] = await Promise.all([
            workflowApi.getAll().catch(() => [] as Workflow[]),
            skillApi.getAll().catch(() => [] as Skill[]),
            agentApi.getAll().catch(() => [] as Agent[]),
            triggerApi.getAll().catch(() => [] as Trigger[])
          ])

          set({ workflows: workflowsRes || [] })
          set({ skills: skillsRes || [] })
          set({ agents: agentsRes || [] })
          set({ triggers: triggersRes || [] })

          // 加载知识库和LLM配置
          await Promise.all([
            state.getKnowledgeBases().catch(() => { }),
            state.getLLMConfigs()
          ])

          // 连接 SSE 事件流，监听数据变更
          state.connectEventStream()
        } catch (error: any) {
          console.error('初始化失败:', error)
          state.setError(error?.message || '初始化数据失败')
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
      setKnowledgeBases: (kbs: KnowledgeBase[]) => set({ knowledgeBases: kbs }),

      setTriggers: (triggers: Trigger[]) => set({ triggers }),
      setEnvVars: (vars: EnvVar[]) => set({ envVars: vars }),
      setMcpServers: (servers: McpServer[]) => set({ mcpServers: servers }),
      fetchMcpServers: async () => {
        const state = get()
        state.setLoading(true)
        try {
          const servers = await mcpApi.getAll()
          set({ mcpServers: servers })
        } catch {
          set({ mcpServers: [] })
        } finally {
          state.setLoading(false)
        }
      },
      setTemplates: (vars: Template[]) => set({ templates: vars }),
      fetchTemplates: async () => {
        const state = get()
        state.setLoading(true)
        try {
          const vars = await templateApi.getAll()
          set({ templates: vars })
        } catch {
          set({ templates: [] })
        } finally {
          state.setLoading(false)
        }
      },

      fetchTriggers: async () => {
        const triggers = await triggerApi.getAll().catch(() => [] as Trigger[])
        set({ triggers })
      },
      fetchEnvVars: async () => {
        const vars = await envVarApi.getAll().catch(() => [] as EnvVar[])
        set({ envVars: vars })
      },
      addWorkflow: async (workflow) => {
        const state = get()
        try {
          state.setLoading(true)
          state.setError(null)

          const newWorkflow = await workflowApi.create(workflow)
          set({ workflows: [newWorkflow, ...state.workflows] })

          gitAutoCommit('workflows', newWorkflow, 'create')

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

          gitAutoCommit('workflows', updatedWorkflow, 'update')
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

          const deleted = state.workflows.find(w => w.id === id)
          await workflowApi.delete(id)

          set({ workflows: state.workflows.filter((w) => w.id !== id) })

          if (deleted) gitAutoCommit('workflows', deleted, 'delete')
        } catch (error) {
          console.error('删除工作流失败:', error)
          state.setError('删除工作流失败')
          throw error
        } finally {
          state.setLoading(false)
        }
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

          gitAutoCommit('skills', newSkill, 'create')
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

          gitAutoCommit('skills', updatedSkill, 'update')
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

          const deleted = state.skills.find(s => s.id === id)
          await skillApi.delete(id)
          set({ skills: state.skills.filter((s) => s.id !== id) })

          if (deleted) gitAutoCommit('skills', deleted, 'delete')
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

          gitAutoCommit('agents', newAgent, 'create')
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

          gitAutoCommit('agents', updatedAgent, 'update')
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

          const deleted = state.agents.find(a => a.id === id)
          await agentApi.delete(id)
          set({ agents: state.agents.filter((a) => a.id !== id) })

          if (deleted) gitAutoCommit('agents', deleted, 'delete')
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
      },

      // Knowledge base CRUD
      getKnowledgeBases: async () => {
        const state = get()
        try {
          state.setLoading(true)
          state.setError(null)
          const kbs = await knowledgeBaseApi.getAll()
          state.setKnowledgeBases(kbs)
        } catch (error) {
          console.error('获取知识库列表失败:', error)
          state.setError('获取知识库列表失败')
        } finally {
          state.setLoading(false)
        }
      },

      addKnowledgeBase: async (data) => {
        const state = get()
        try {
          state.setLoading(true)
          state.setError(null)
          const newKB = await knowledgeBaseApi.create(data)
          set({ knowledgeBases: [newKB, ...state.knowledgeBases] })
        } catch (error) {
          console.error('创建知识库失败:', error)
          state.setError('创建知识库失败')
          throw error
        } finally {
          state.setLoading(false)
        }
      },

      updateKnowledgeBase: async (id, updates) => {
        const state = get()
        try {
          state.setLoading(true)
          state.setError(null)
          const updated = await knowledgeBaseApi.update(id, updates)
          set({ knowledgeBases: state.knowledgeBases.map(kb => kb.id === id ? updated : kb) })
        } catch (error) {
          console.error('更新知识库失败:', error)
          state.setError('更新知识库失败')
          throw error
        } finally {
          state.setLoading(false)
        }
      },

      deleteKnowledgeBase: async (id) => {
        const state = get()
        try {
          state.setLoading(true)
          state.setError(null)
          await knowledgeBaseApi.delete(id)
          set({ knowledgeBases: state.knowledgeBases.filter(kb => kb.id !== id) })
        } catch (error) {
          console.error('删除知识库失败:', error)
          state.setError('删除知识库失败')
          throw error
        } finally {
          state.setLoading(false)
        }
      },

      uploadDocumentToKB: async (id, file) => {
        const state = get()
        try {
          state.setLoading(true)
          state.setError(null)
          await knowledgeBaseApi.uploadDocument(id, file)
          // 重新获取列表以更新文档统计
          await state.getKnowledgeBases()
        } catch (error) {
          console.error('上传文档失败:', error)
          state.setError('上传文档失败')
          throw error
        } finally {
          state.setLoading(false)
        }
      },

      deleteDocumentFromKB: async (id, docName) => {
        const state = get()
        try {
          state.setLoading(true)
          state.setError(null)
          await knowledgeBaseApi.deleteDocument(id, docName)
          await state.getKnowledgeBases()
        } catch (error) {
          console.error('删除文档失败:', error)
          state.setError('删除文档失败')
          throw error
        } finally {
          state.setLoading(false)
        }
      },

      eventSource: null,

      connectEventStream: () => {
        const state = get()
        state.eventSource?.close()

        const es = new EventSource(`${API_BASE_URL}/events`)
        es.onmessage = async (e) => {
          try {
            state.setLoading(true)
            const { resource } = JSON.parse(e.data)
            switch (resource) {
              case 'workflows': {
                const workflows = await workflowApi.getAll().catch(() => [] as Workflow[])
                set({ workflows })
                break
              }
              case 'agents': {
                const agents = await agentApi.getAll().catch(() => [] as Agent[])
                set({ agents })
                break
              }
              case 'skills': {
                const skills = await skillApi.getAll().catch(() => [] as Skill[])
                set({ skills })
                break
              }
              case 'llm-config':
                get().getLLMConfigs()
                break
              case 'knowledge-base':
                get().getKnowledgeBases()
                break
              case 'triggers': {
                const triggers = await triggerApi.getAll().catch(() => [] as Trigger[])
                set({ triggers })
                break
              }
              case 'mcp-servers': {
                const servers = await mcpApi.getAll().catch(() => [] as McpServer[])
                set({ mcpServers: servers })
                break
              }
              case 'environment-variables': {
                const envVars = await envVarApi.getAll().catch(() => [] as EnvVar[])
                set({ envVars })
                break
              }
            }
          } catch (err) {
            console.error('[EventStream] 解析事件失败:', err)
          } finally {
            state.setLoading(false)
          }
        }
        es.onerror = () => {
          console.warn('[EventStream] 连接异常，等待重连...')
        }
        set({ eventSource: es })
      },

      disconnectEventStream: () => {
        const state = get()
        state.eventSource?.close()
        set({ eventSource: null })
      }
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => {
        const partial = STORAGE_PERSIST_FIELDS.reduce((res, key) => {
          res[key] = state[key]
          return res
        }, {} as Record<string, unknown>)
        return partial;
      }
    }
  )
)
