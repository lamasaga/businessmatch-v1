import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';
import { DEMO_CAREER } from '../data/mockPlatform';

export interface CareerUser {
  id: number;
  username: string;
  avatar: string | null;
  level: number;
  experience: number;
  next_level_xp: number;
  gold: number;
  diamond: number;
}

export interface CareerProfileData {
  title: string;
  season: string;
  is_started: boolean;
  started_at: string;
}

export interface CareerRadar {
  financial: number;
  marketing: number;
  strategic: number;
  collaborative: number;
  ethical: number;
}

export interface CareerResources {
  gold_total_earned: number;
  diamond_total_earned: number;
  total_earned_7d: number;
  total_matches_7d: number;
}

export interface CareerHomestead {
  unlocked_slots: number;
  total_slots: number;
  status: 'locked' | 'unlocked';
  unlock_hint: string;
}

export interface CareerStats {
  total_matches: number;
  total_xp_earned: number;
  practice_count: number;
  official_count: number;
}

export interface CareerApiProfile {
  user: CareerUser;
  profile: CareerProfileData;
  radar: CareerRadar;
  resources: CareerResources;
  homestead: CareerHomestead;
  stats: CareerStats;
}

interface CareerState {
  profile: CareerApiProfile | null;
  loading: boolean;
  error: string | null;
  // 本地状态：标记是否已进入生涯模式（未登录用户也可本地体验）
  careerActive: boolean;
  // 兼容旧组件的本地 demo 字段（DemoBanner / DailyActivitiesPage / ShowcasePage）
  demoMode: boolean;
  completedQuests: string[];
  // actions
  fetchProfile: () => Promise<void>;
  startCareer: () => Promise<boolean>;
  setCareerActive: (active: boolean) => void;
  resetDemo: () => void;
  enableDemoMode: () => void;
  completeQuest: (id: string) => void;
}

const isAuth = () => Boolean(localStorage.getItem('accessToken'));

export const useCareerStore = create<CareerState>()(
  persist(
    (set, get) => ({
      profile: null,
      loading: false,
      error: null,
      careerActive: false,
      demoMode: false,
      completedQuests: ['q1'],

      fetchProfile: async () => {
        set({ loading: true, error: null });

        // 未登录：保持本地 demo 模式
        if (!isAuth()) {
          console.warn('[career] 未登录，使用本地演示数据');
          set({
            profile: buildFallbackProfile(),
            loading: false,
            careerActive: get().careerActive || false,
          });
          return;
        }

        try {
          const res = await api.get('/api/v1/career/profile');
          const payload = res.data?.data as CareerApiProfile | undefined;
          if (payload) {
            set({
              profile: payload,
              careerActive: true,
              loading: false,
              error: null,
            });
          } else {
            throw new Error('接口未返回数据');
          }
        } catch (err: any) {
          console.warn('[career] 读取生涯档案失败，降级到本地数据：', err?.message || err);
          set({
            profile: buildFallbackProfile(),
            loading: false,
            error: err?.message || '数据同步中',
            careerActive: get().careerActive || false,
          });
        }
      },

      startCareer: async () => {
        set({ careerActive: true });
        if (!isAuth()) {
          // 未登录仅本地标记，不调用后端
          set({
            profile: buildFallbackProfile(),
          });
          return true;
        }
        try {
          await api.post('/api/v1/career/start');
          await get().fetchProfile();
          return true;
        } catch (err: any) {
          console.warn('[career] 开启生涯失败：', err?.message || err);
          set({ error: err?.message || '开启生涯失败' });
          return false;
        }
      },

      setCareerActive: (active: boolean) => {
        set({ careerActive: active });
      },

      enableDemoMode: () => {
        set({ demoMode: true, careerActive: true, completedQuests: ['q1'] });
      },

      completeQuest: (id: string) => {
        const { completedQuests } = get();
        if (!completedQuests.includes(id)) {
          set({ completedQuests: [...completedQuests, id] });
        }
      },

      resetDemo: () => {
        set({
          profile: null,
          careerActive: false,
          demoMode: false,
          completedQuests: [],
          error: null,
          loading: false,
        });
      },
    }),
    {
      name: 'bizsim-career-mvp',
      partialize: (state) => ({ careerActive: state.careerActive }),
    }
  )
);

/**
 * 构建 fallback 数据（API 失败或未登录时使用）
 * 保留原有 DEMO_CAREER 的体验，但结构对齐 CareerApiProfile
 */
function buildFallbackProfile(): CareerApiProfile {
  const c = DEMO_CAREER;
  return {
    user: {
      id: 0,
      username: '访客',
      avatar: null,
      level: c.level,
      experience: c.xp,
      next_level_xp: c.nextLevelXp,
      gold: 500,
      diamond: 10,
    },
    profile: {
      title: c.title,
      season: c.season,
      is_started: true,
      started_at: new Date().toISOString(),
    },
    radar: {
      financial: c.abilities.financial,
      marketing: c.abilities.marketing,
      strategic: c.abilities.strategic,
      collaborative: c.abilities.collaborative,
      ethical: c.abilities.ethical,
    },
    resources: {
      gold_total_earned: 500,
      diamond_total_earned: 10,
      total_earned_7d: 0,
      total_matches_7d: 0,
    },
    homestead: {
      unlocked_slots: 0,
      total_slots: 5,
      status: 'locked',
      unlock_hint: 'B2 阶段开放家园系统',
    },
    stats: {
      total_matches: 0,
      total_xp_earned: c.xp,
      practice_count: 0,
      official_count: 0,
    },
  };
}
