import { api } from './client'

export interface Capability {
  id: string
  name: string
  display_name: string
  description: string
  type: 'memory' | 'output_format' | 'reasoning' | 'perception' | 'action'
  config_schema: Record<string, unknown>
  system_prompt_injection?: string
  is_builtin: boolean
  created_at: string
}

export const capabilitiesApi = {
  list: () => api.get<Capability[]>('/capabilities'),
  get: (id: string) => api.get<Capability>(`/capabilities/${id}`),
}
