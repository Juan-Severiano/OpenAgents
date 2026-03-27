import { create } from 'zustand'
import type { Agent } from '../api/agents'
import { agentsApi } from '../api/agents'

interface AgentStore {
  agents: Agent[]
  selectedAgentId: string | null
  loading: boolean
  error: string | null
  fetchAgents: () => Promise<void>
  setSelectedAgent: (id: string | null) => void
  updateAgentStatus: (id: string, status: Agent['status']) => void
  removeAgent: (id: string) => void
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: [],
  selectedAgentId: null,
  loading: false,
  error: null,

  fetchAgents: async () => {
    set({ loading: true, error: null })
    try {
      const agents = await agentsApi.list()
      set({ agents, loading: false })
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  setSelectedAgent: (id) => set({ selectedAgentId: id }),

  updateAgentStatus: (id, status) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, status } : a)),
    })),

  removeAgent: (id) =>
    set((state) => ({ agents: state.agents.filter((a) => a.id !== id) })),
}))
