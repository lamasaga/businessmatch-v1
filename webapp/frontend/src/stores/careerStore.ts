import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CareerState {
  careerActive: boolean;
  demoMode: boolean;
  completedQuests: string[];
  startCareer: () => void;
  enableDemoMode: () => void;
  completeQuest: (id: string) => void;
  resetDemo: () => void;
}

export const useCareerStore = create<CareerState>()(
  persist(
    (set, get) => ({
      careerActive: false,
      demoMode: false,
      completedQuests: ['q1'],
      startCareer: () => set({ careerActive: true }),
      enableDemoMode: () =>
        set({ demoMode: true, careerActive: true, completedQuests: ['q1'] }),
      completeQuest: (id) => {
        const { completedQuests } = get();
        if (!completedQuests.includes(id)) {
          set({ completedQuests: [...completedQuests, id] });
        }
      },
      resetDemo: () =>
        set({ careerActive: false, demoMode: false, completedQuests: [] }),
    }),
    { name: 'bizsim-career-mvp' }
  )
);
