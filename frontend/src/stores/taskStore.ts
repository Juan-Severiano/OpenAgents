import { create } from 'zustand'
import type { Task } from '../api/tasks'
import type { Message } from '../api/agents'
import { tasksApi } from '../api/tasks'

interface TaskStore {
  tasks: Task[]
  activeTaskId: string | null
  messages: Record<string, Message[]>
  loading: boolean
  fetchTasks: () => Promise<void>
  setActiveTask: (id: string | null) => void
  fetchMessages: (taskId: string) => Promise<void>
  updateTaskStatus: (id: string, status: Task['status']) => void
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  activeTaskId: null,
  messages: {},
  loading: false,

  fetchTasks: async () => {
    set({ loading: true })
    try {
      const tasks = await tasksApi.list()
      set({ tasks, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  setActiveTask: (id) => set({ activeTaskId: id }),

  fetchMessages: async (taskId) => {
    const msgs = await tasksApi.getMessages(taskId)
    set((state) => ({ messages: { ...state.messages, [taskId]: msgs } }))
  },

  updateTaskStatus: (id, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    })),
}))
