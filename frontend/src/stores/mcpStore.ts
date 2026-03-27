import { create } from 'zustand'
import type { MCPServer } from '../api/mcpServers'
import { mcpServersApi } from '../api/mcpServers'

interface MCPStore {
  servers: MCPServer[]
  loading: boolean
  fetchServers: () => Promise<void>
  updateServerStatus: (id: string, status: MCPServer['status']) => void
}

export const useMCPStore = create<MCPStore>((set) => ({
  servers: [],
  loading: false,

  fetchServers: async () => {
    set({ loading: true })
    try {
      const servers = await mcpServersApi.list()
      set({ servers, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  updateServerStatus: (id, status) =>
    set((state) => ({
      servers: state.servers.map((s) => (s.id === id ? { ...s, status } : s)),
    })),
}))
