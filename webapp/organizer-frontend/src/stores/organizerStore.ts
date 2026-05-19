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
  fetchEvents: () => Promise<void>;
  fetchControl: (eventId: number) => Promise<void>;
  createEvent: (data: {
    title: string;
    description?: string;
    max_players?: number;
    config?: Record<string, unknown>;
  }) => Promise<CompetitionEvent>;
  startEvent: (eventId: number) => Promise<void>;
  endEvent: (eventId: number) => Promise<void>;
  nextRound: (roundId: number) => Promise<void>;
  clearError: () => void;
}

const DEFAULT_CONFIG = {
  rounds: 10,
  initial_capital: 50000,
  inventory_limit: 20,
  move_cost: 1000,
  decision_time: 60,
  cities: ['jingcheng', 'hushi', 'shenshi', 'rongcheng', 'bingcheng', 'gangcheng'],
  products: [
    'fruit', 'vegetable', 'daily', 'electronics', 'clothing',
    'cosmetics', 'jewelry', 'antique', 'art', 'snack',
  ],
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

  fetchEvents: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<ApiResponse<CompetitionEvent[]>>('/api/v1/organizer/events');
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
      const res = await api.post<ApiResponse<CompetitionEvent>>('/api/v1/competitions', {
        ...data,
        game_type: 'trading',
        config: { ...DEFAULT_CONFIG, ...data.config },
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

  startEvent: async (eventId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post<ApiResponse<CompetitionEvent>>(
        `/api/v1/competitions/${eventId}/start`
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

  nextRound: async (roundId) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/api/v1/trading/rounds/${roundId}/next`);
      set({ loading: false });
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '推进回合失败',
        loading: false,
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
