import { api } from './client'

export interface LLMProvider {
  id: string
  name: string
  provider: 'anthropic' | 'openai' | 'google' | 'ollama'
  model: string
  api_key?: string
  base_url?: string
  extra_params?: Record<string, unknown>
  created_at: string
}

export interface LLMProviderCreate {
  name: string
  provider: string
  model: string
  api_key?: string
  base_url?: string
  extra_params?: Record<string, unknown>
}

export interface ProviderModel {
  id: string
  name: string
}

export const providersApi = {
  list: () => api.get<LLMProvider[]>('/providers'),
  get: (id: string) => api.get<LLMProvider>(`/providers/${id}`),
  create: (data: LLMProviderCreate) => api.post<LLMProvider>('/providers', data),
  update: (id: string, data: Partial<LLMProviderCreate>) =>
    api.put<LLMProvider>(`/providers/${id}`, data),
  delete: (id: string) => api.delete(`/providers/${id}`),
  test: (id: string) => api.post<{ ok: boolean; error?: string }>(`/providers/${id}/test`, {}),
  listModels: (provider: string, base_url?: string) => {
    const params = new URLSearchParams({ provider })
    if (base_url) params.set('base_url', base_url)
    return api.get<{ models: ProviderModel[] }>(`/providers/models?${params}`)
  },
}
