import { create } from 'zustand';
import { api } from '../lib/api';

export interface TeachingGroup {
  id: number;
  name: string;
  description?: string | null;
  invite_code: string;
  teacher_user_id: number;
  teacher_username?: string | null;
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

export interface CampEvent {
  id: number;
  room_code: string;
  title: string;
  status: string;
  game_config_id: string;
  participant_count: number;
  teaching_group_id?: number | null;
}

export interface CampAnnouncement {
  id: number;
  teaching_group_id: number;
  title: string;
  content: string;
  created_by: number;
  is_pinned: boolean;
  created_at: string;
}

interface CampState {
  joined: TeachingGroup[];
  current: TeachingGroupDetail | null;
  events: CampEvent[];
  announcements: CampAnnouncement[];
  loading: boolean;
  error: string | null;

  fetchJoined: () => Promise<void>;
  fetchGroup: (id: number) => Promise<void>;
  fetchGroupEvents: (id: number) => Promise<void>;
  fetchAnnouncements: (id: number) => Promise<void>;
  joinCamp: (inviteCode: string) => Promise<TeachingGroup>;
  clearError: () => void;
}

export const useCampStore = create<CampState>((set) => ({
  joined: [],
  current: null,
  events: [],
  announcements: [],
  loading: false,
  error: null,

  fetchJoined: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<{ data: TeachingGroup[] }>('/api/v1/teaching-groups/joined');
      set({ joined: res.data.data ?? [], loading: false });
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '加载失败',
        loading: false,
      });
    }
  },

  fetchGroup: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<{ data: TeachingGroupDetail }>(`/api/v1/teaching-groups/${id}`);
      set({ current: res.data.data ?? null, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '加载失败',
        loading: false,
      });
      throw err;
    }
  },

  fetchGroupEvents: async (id) => {
    try {
      const res = await api.get<{ data: CampEvent[] }>(`/api/v1/teaching-groups/${id}/events`);
      set({ events: res.data.data ?? [] });
    } catch {
      set({ events: [] });
    }
  },

  fetchAnnouncements: async (id) => {
    try {
      const res = await api.get<{ data: CampAnnouncement[] }>(`/api/v1/teaching-groups/${id}/announcements`);
      set({ announcements: res.data.data ?? [] });
    } catch {
      set({ announcements: [] });
    }
  },

  joinCamp: async (inviteCode) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post<{ data: TeachingGroup }>('/api/v1/teaching-groups/join', {
        invite_code: inviteCode.trim().toUpperCase(),
      });
      const group = res.data.data!;
      set((s) => ({
        joined: s.joined.some((g) => g.id === group.id) ? s.joined : [...s.joined, group],
        loading: false,
      }));
      return group;
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '加入失败',
        loading: false,
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
