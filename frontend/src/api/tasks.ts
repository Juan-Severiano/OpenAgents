import { api } from './client'
import type { Message } from './agents'

export interface Task {
  id: string
  title: string
  description: string
  orchestrator_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: string
  error?: string
  created_at: string
  started_at?: string
  completed_at?: string
  task_metadata?: Record<string, unknown>
}

export interface TaskCreate {
  title: string
  description: string
  orchestrator_id: string
  metadata?: Record<string, unknown>
}

export const tasksApi = {
  list: (skip = 0, limit = 50) => api.get<Task[]>(`/tasks?skip=${skip}&limit=${limit}`),
  get: (id: string) => api.get<Task>(`/tasks/${id}`),
  create: (data: TaskCreate) => api.post<Task>('/tasks', data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  getMessages: (id: string) => api.get<Message[]>(`/tasks/${id}/messages`),
}
