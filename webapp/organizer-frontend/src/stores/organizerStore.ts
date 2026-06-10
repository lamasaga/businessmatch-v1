import { create } from 'zustand';
import { api } from '../lib/api';
import type {
  ApiResponse,
  CompetitionEvent,
  OrganizerControl,
  OrganizerProfile,
  OrganizerStats,
} from '../types';

interface OrganizerState {
  profile: OrganizerProfile | null;
  stats: OrganizerStats | null;
  events: CompetitionEvent[];
  control: OrganizerControl | null;
  loading: boolean;
  error: string | null;

  fetchProfile: () => Promise<boolean>;
  applyOrganizer: (organization_name: string, contact_phone?: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchEvents: (teachingGroupId?: number) => Promise<void>;
  fetchControl: (eventId: number) => Promise<void>;
  createEvent: (data: {
    title: string;
    description?: string;
    max_players?: number;
    game_config_id?: string;
    game_type?: string;
    config?: Record<string, unknown>;
    teaching_group_id?: number;
  }) => Promise<CompetitionEvent>;
  startEvent: (eventId: number, gameConfigId?: string) => Promise<void>;
  endEvent: (eventId: number) => Promise<void>;
  clearError: () => void;
}

const DEFAULT_RTS_CONFIG = {
  mode: 'rts',
  duration_preset: 'standard' as const,
  initial_capital: 50000,
};

export const useOrganizerStore = create<OrganizerState>((set) => ({
  profile: null,
  stats: null,
  events: [],
  control: null,
  loading: false,
  error: null,

  fetchProfile: async () => {
    try {
      const res = await api.get<ApiResponse<OrganizerProfile>>('/api/v1/organizer/profile');
      set({ profile: res.data.data ?? null });
      return true;
    } catch {
      set({ profile: null });
      return false;
    }
  },

  applyOrganizer: async (organization_name, contact_phone) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post<ApiResponse<OrganizerProfile>>('/api/v1/organizer/apply', {
        organization_name,
        contact_phone,
      });
      set({ profile: res.data.data ?? null, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '申请失败',
        loading: false,
      });
      throw err;
    }
  },

  fetchStats: async () => {
    try {
      const res = await api.get<ApiResponse<OrganizerStats>>('/api/v1/organizer/stats');
      set({ stats: res.data.data ?? null });
    } catch {
      /* optional */
    }
  },

  fetchEvents: async (teachingGroupId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<ApiResponse<CompetitionEvent[]>>('/api/v1/organizer/events', {
        params: teachingGroupId != null ? { teaching_group_id: teachingGroupId } : undefined,
      });
      set({ events: res.data.data ?? [], loading: false });
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '加载赛事失败',
        loading: false,
      });
    }
  },

  fetchControl: async (eventId) => {
    try {
      const res = await api.get<ApiResponse<OrganizerControl>>(
        `/api/v1/organizer/events/${eventId}/control`
      );
      set({ control: res.data.data ?? null });
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '加载控场数据失败' });
    }
  },

  createEvent: async (data) => {
    set({ loading: true, error: null });
    try {
      const gameType = data.game_type || 'trading';
      const configId = data.game_config_id || 'fstrading';
      let mergedConfig: Record<string, unknown>;
      if (configId.startsWith('techventure')) {
        mergedConfig = data.config || {};
      } else if (configId.startsWith('ops')) {
        mergedConfig = { initial_capital: 100000, ...data.config };
      } else {
        mergedConfig = { ...DEFAULT_RTS_CONFIG, ...data.config };
      }
      const res = await api.post<ApiResponse<CompetitionEvent>>('/api/v1/competitions', {
        title: data.title,
        description: data.description,
        max_players: data.max_players,
        game_type: gameType,
        game_config_id: configId,
        config: mergedConfig,
        teaching_group_id: data.teaching_group_id,
      });
      const event = res.data.data!;
      set((s) => ({ events: [event, ...s.events], loading: false }));
      return event;
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '创建失败',
        loading: false,
      });
      throw err;
    }
  },

  startEvent: async (eventId, gameConfigId?: string) => {
    set({ loading: true, error: null });
    try {
      const isOps = gameConfigId?.startsWith('ops');
      const endpoint = isOps
        ? `/api/v1/ops/events/${eventId}/start`
        : `/api/v1/competitions/${eventId}/start`;
      const res = await api.post<ApiResponse<CompetitionEvent>>(endpoint);
      const event = res.data.data!;
      set((s) => ({
        events: s.events.map((e) => (e.id === eventId ? event : e)),
        control: s.control?.event.id === eventId
          ? { ...s.control, event }
          : s.control,
        loading: false,
      }));
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '开始失败',
        loading: false,
      });
      throw err;
    }
  },

  endEvent: async (eventId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post<ApiResponse<CompetitionEvent>>(
        `/api/v1/competitions/${eventId}/end`
      );
      const event = res.data.data!;
      set((s) => ({
        events: s.events.map((e) => (e.id === eventId ? event : e)),
        control: s.control?.event.id === eventId
          ? { ...s.control, event }
          : s.control,
        loading: false,
      }));
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '结束失败',
        loading: false,
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
