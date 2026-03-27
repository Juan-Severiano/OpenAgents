import { api } from './client'

export interface Agent {
  id: string
  name: string
  description?: string
  role: 'orchestrator' | 'specialist'
  system_prompt: string
  llm_config_id: string
  max_iterations: number
  memory_enabled: boolean
  status: 'idle' | 'busy' | 'error' | 'disabled'
  created_at: string
  updated_at: string
}

export interface AgentCreate {
  name: string
  description?: string
  role: string
  system_prompt: string
  llm_config_id: string
  max_iterations?: number
  memory_enabled?: boolean
}

export interface Message {
  id: string
  task_id: string
  from_agent_id?: string
  to_agent_id?: string
  role: string
  content: string
  tokens_used?: number
  created_at: string
}

export const agentsApi = {
  list: () => api.get<Agent[]>('/agents'),
  get: (id: string) => api.get<Agent>(`/agents/${id}`),
  create: (data: AgentCreate) => api.post<Agent>('/agents', data),
  update: (id: string, data: Partial<AgentCreate>) => api.put<Agent>(`/agents/${id}`, data),
  delete: (id: string) => api.delete(`/agents/${id}`),
  getMessages: (id: string) => api.get<Message[]>(`/agents/${id}/messages`),
  test: (id: string, message: string) =>
    api.post<{ content: string; model: string; tokens: number }>(`/agents/${id}/test`, { message }),
  assignSkill: (id: string, skill_id: string, config?: Record<string, unknown>) =>
    api.post(`/agents/${id}/skills`, { skill_id, config }),
  removeSkill: (id: string, skill_id: string) => api.delete(`/agents/${id}/skills/${skill_id}`),
  assignCapability: (id: string, capability_id: string, config?: Record<string, unknown>) =>
    api.post(`/agents/${id}/capabilities`, { capability_id, config }),
  removeCapability: (id: string, capability_id: string) =>
    api.delete(`/agents/${id}/capabilities/${capability_id}`),
  assignMCPServer: (id: string, mcp_server_id: string) =>
    api.post(`/agents/${id}/mcp-servers`, { mcp_server_id }),
  removeMCPServer: (id: string, mcp_id: string) =>
    api.delete(`/agents/${id}/mcp-servers/${mcp_id}`),
}
