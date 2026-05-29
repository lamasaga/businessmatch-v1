import { create } from 'zustand';
import { api } from '../lib/api';
import type { ApiResponse } from '../types';

export interface TeachingGroup {
  id: number;
  name: string;
  description?: string | null;
  invite_code: string;
  teacher_user_id: number;
  status: string;
  member_count: number;
  event_count: number;
  created_at: string;
}

export interface GroupMember {
  user_id: number;
  username: string;
  role: string;
  joined_at: string;
}

export interface TeachingGroupDetail extends TeachingGroup {
  members: GroupMember[];
}

interface CampState {
  camps: TeachingGroup[];
  current: TeachingGroupDetail | null;
  loading: boolean;
  error: string | null;

  fetchMine: () => Promise<void>;
  fetchDetail: (id: number) => Promise<void>;
  createCamp: (data: {
    name: string;
    description?: string;
    camp_start_at?: string;
    camp_end_at?: string;
  }) => Promise<TeachingGroup>;
  updateCamp: (
    id: number,
    data: { name?: string; description?: string; status?: string; reset_invite_code?: boolean }
  ) => Promise<TeachingGroup>;
  clearError: () => void;
}

export const useCampStore = create<CampState>((set) => ({
  camps: [],
  current: null,
  loading: false,
  error: null,

  fetchMine: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<ApiResponse<TeachingGroup[]>>('/api/v1/teaching-groups/mine');
      set({ camps: res.data.data ?? [], loading: false });
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '加载失败',
        loading: false,
      });
    }
  },

  fetchDetail: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<ApiResponse<TeachingGroupDetail>>(`/api/v1/teaching-groups/${id}`);
      set({ current: res.data.data ?? null, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '加载失败',
        loading: false,
      });
      throw err;
    }
  },

  createCamp: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post<ApiResponse<TeachingGroup>>('/api/v1/teaching-groups', data);
      const camp = res.data.data!;
      set((s) => ({ camps: [camp, ...s.camps], loading: false }));
      return camp;
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '创建失败',
        loading: false,
      });
      throw err;
    }
  },

  updateCamp: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.patch<ApiResponse<TeachingGroup>>(`/api/v1/teaching-groups/${id}`, data);
      const camp = res.data.data!;
      set((s) => ({
        camps: s.camps.map((c) => (c.id === id ? camp : c)),
        current: s.current?.id === id ? { ...s.current, ...camp } : s.current,
        loading: false,
      }));
      return camp;
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '更新失败',
        loading: false,
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
