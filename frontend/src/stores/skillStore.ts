import { create } from 'zustand'
import type { Skill } from '../api/skills'
import { skillsApi } from '../api/skills'

interface SkillStore {
  skills: Skill[]
  loading: boolean
  fetchSkills: () => Promise<void>
}

export const useSkillStore = create<SkillStore>((set) => ({
  skills: [],
  loading: false,

  fetchSkills: async () => {
    set({ loading: true })
    try {
      const skills = await skillsApi.list()
      set({ skills, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
