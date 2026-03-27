import { api } from './client'

export interface MCPServer {
  id: string
  name: string
  display_name: string
  description: string
  transport: 'stdio' | 'sse'
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  discovered_tools?: unknown[]
  last_connected_at?: string
  created_at: string
  updated_at: string
}

export interface MCPServerCreate {
  name: string
  display_name: string
  description?: string
  transport: string
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
}

export const mcpServersApi = {
  list: () => api.get<MCPServer[]>('/mcp-servers'),
  get: (id: string) => api.get<MCPServer>(`/mcp-servers/${id}`),
  create: (data: MCPServerCreate) => api.post<MCPServer>('/mcp-servers', data),
  update: (id: string, data: Partial<MCPServerCreate>) =>
    api.put<MCPServer>(`/mcp-servers/${id}`, data),
  delete: (id: string) => api.delete(`/mcp-servers/${id}`),
  connect: (id: string) => api.post<{ status: string }>(`/mcp-servers/${id}/connect`, {}),
  disconnect: (id: string) => api.post<{ status: string }>(`/mcp-servers/${id}/disconnect`, {}),
  getTools: (id: string) => api.get<{ tools: unknown[] }>(`/mcp-servers/${id}/tools`),
}
