import { create } from 'zustand';
import { Skill } from '../types';

interface SkillsState {
  skills: Skill[];
  registerSkill: (skill: Skill) => void;
  executeSkill: (id: string) => void;
}

export const useSkillsStore = create<SkillsState>((set) => ({
  skills: [],
  registerSkill: (skill) => set((state) => ({ skills: [...state.skills, skill] })),
  executeSkill: (id) => {
    console.log(`Executing skill: ${id}`);
    // Actual implementation to follow
  },
}));
