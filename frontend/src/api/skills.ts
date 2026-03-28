import { api } from './client'

export interface Skill {
  id: string
  name: string
  display_name: string
  description: string
  type: 'builtin' | 'custom_python' | 'custom_http' | 'mcp_tool'
  source: 'builtin' | 'user_defined' | 'marketplace' | 'github'
  input_schema: Record<string, unknown>
  output_schema?: Record<string, unknown>
  github_url?: string
  github_ref?: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface GitHubInstallRequest {
  url: string
  subdir?: string
  token?: string
}

export interface SkillCreate {
  name: string
  display_name: string
  description: string
  type: string
  source?: string
  input_schema: Record<string, unknown>
  output_schema?: Record<string, unknown>
  implementation?: string
  http_config?: Record<string, unknown>
  is_public?: boolean
}

export const skillsApi = {
  list: () => api.get<Skill[]>('/skills'),
  get: (id: string) => api.get<Skill>(`/skills/${id}`),
  create: (data: SkillCreate) => api.post<Skill>('/skills', data),
  update: (id: string, data: Partial<SkillCreate>) => api.put<Skill>(`/skills/${id}`, data),
  delete: (id: string) => api.delete(`/skills/${id}`),
  test: (id: string, input: Record<string, unknown>) =>
    api.post<{ result: unknown }>(`/skills/${id}/test`, { input }),
  installFromGithub: (data: GitHubInstallRequest) =>
    api.post<Skill>('/skills/install/github', data),
}
