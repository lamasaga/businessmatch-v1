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

export interface Announcement {
  id: number;
  teaching_group_id: number;
  title: string;
  content: string;
  created_by: number;
  is_pinned: boolean;
  created_at: string;
}

export interface MemberProgress {
  user_id: number;
  username: string;
  joined_at: string;
  match_count: number;
  total_xp: number;
  last_active_at: string | null;
  status: string;
}

export interface MemberProgressSummary {
  total: number;
  active: number;
  normal: number;
  attention: number;
  newcomer: number;
}

export interface CampDashboard {
  member_count: number;
  active_event_count: number;
  weekly_active_count: number;
  recent_announcements: Announcement[];
  recent_events: Array<{
    id: number;
    title: string;
    status: string;
    created_at: string | null;
  }>;
}

interface CampState {
  camps: TeachingGroup[];
  current: TeachingGroupDetail | null;
  announcements: Announcement[];
  memberProgress: MemberProgress[];
  progressSummary: MemberProgressSummary | null;
  dashboard: CampDashboard | null;
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
  fetchAnnouncements: (groupId: number) => Promise<void>;
  createAnnouncement: (groupId: number, data: { title: string; content: string }) => Promise<Announcement>;
  deleteAnnouncement: (groupId: number, announcementId: number) => Promise<void>;
  pinAnnouncement: (groupId: number, announcementId: number) => Promise<void>;
  fetchMemberProgress: (groupId: number) => Promise<void>;
  fetchDashboard: (groupId: number) => Promise<void>;
  clearError: () => void;
}

export const useCampStore = create<CampState>((set) => ({
  camps: [],
  current: null,
  announcements: [],
  memberProgress: [],
  progressSummary: null,
  dashboard: null,
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
        current: s.current?.id === id ? { ...s.current, ...camp, members: s.current.members } : s.current,
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

  fetchAnnouncements: async (groupId) => {
    try {
      const res = await api.get<ApiResponse<Announcement[]>>(`/api/v1/teaching-groups/${groupId}/announcements`);
      set({ announcements: res.data.data ?? [] });
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '加载公告失败' });
    }
  },

  createAnnouncement: async (groupId, data) => {
    try {
      const res = await api.post<ApiResponse<Announcement>>(`/api/v1/teaching-groups/${groupId}/announcements`, data);
      const announcement = res.data.data!;
      set((s) => ({
        announcements: [announcement, ...s.announcements],
      }));
      return announcement;
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '发布公告失败' });
      throw err;
    }
  },

  deleteAnnouncement: async (groupId, announcementId) => {
    try {
      await api.delete(`/api/v1/teaching-groups/${groupId}/announcements/${announcementId}`);
      set((s) => ({
        announcements: s.announcements.filter((a) => a.id !== announcementId),
      }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '删除公告失败' });
      throw err;
    }
  },

  pinAnnouncement: async (groupId, announcementId) => {
    try {
      const res = await api.patch<ApiResponse<Announcement>>(
        `/api/v1/teaching-groups/${groupId}/announcements/${announcementId}/pin`
      );
      const updated = res.data.data!;
      set((s) => ({
        announcements: s.announcements
          .map((a) => (a.id === announcementId ? updated : a))
          .sort((a, b) => {
            if (a.is_pinned === b.is_pinned) {
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            return a.is_pinned ? -1 : 1;
          }),
      }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '置顶操作失败' });
      throw err;
    }
  },

  fetchMemberProgress: async (groupId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<ApiResponse<{ members: MemberProgress[]; summary: MemberProgressSummary }>>(
        `/api/v1/teaching-groups/${groupId}/member-progress`
      );
      set({
        memberProgress: res.data.data?.members ?? [],
        progressSummary: res.data.data?.summary ?? null,
        loading: false,
      });
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '加载学员进度失败',
        loading: false,
      });
    }
  },

  fetchDashboard: async (groupId) => {
    try {
      const res = await api.get<ApiResponse<CampDashboard>>(`/api/v1/teaching-groups/${groupId}/dashboard`);
      set({ dashboard: res.data.data ?? null });
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '加载看板失败' });
    }
  },

  clearError: () => set({ error: null }),
}));
