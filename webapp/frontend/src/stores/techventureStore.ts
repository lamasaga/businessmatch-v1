import { create } from 'zustand';
import { api } from '../lib/api';
import type {
  TvGameState,
  TvPollData,
  TvSubmitPayload,
  TvLeaderboardEntry,
  TvNewsItem,
} from '../types/techventure';

interface TechVentureState {
  gameState: TvGameState | null;
  leaderboard: TvLeaderboardEntry[];
  news: TvNewsItem[];
  snapshots: Record<string, unknown>[];
  loading: boolean;
  error: string | null;

  fetchState: (eventId: number) => Promise<void>;
  poll: (eventId: number) => Promise<TvPollData | null>;
  submitDecision: (eventId: number, payload: TvSubmitPayload) => Promise<void>;
  setProductName: (eventId: number, name: string) => Promise<void>;
  fetchLeaderboard: (eventId: number) => Promise<void>;
  fetchNews: (eventId: number) => Promise<void>;
  startPractice: (configId?: string) => Promise<{ event_id: number; team_id: number }>;
  clearError: () => void;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
    return axiosErr.response?.data?.message || axiosErr.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export const useTechVentureStore = create<TechVentureState>((set) => ({
  gameState: null,
  leaderboard: [],
  news: [],
  snapshots: [],
  loading: false,
  error: null,

  fetchState: async (eventId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/api/v1/techventure/events/${eventId}/state`);
      const gameState = res.data.data as TvGameState;
      set((state) => {
        const nextSnapshots = [...state.snapshots];
        const snap = gameState.last_snapshot;
        if (snap) {
          const roundNo = snap.round_no ?? gameState.current_round?.round_no;
          const exists = nextSnapshots.some((s) => (s.round_no ?? s.round_number) === (snap.round_no ?? snap.round_number));
          if (!exists) {
            nextSnapshots.push({ ...snap, round_no: snap.round_no ?? snap.round_number ?? roundNo });
            nextSnapshots.sort((a, b) => ((a.round_no as number) || 0) - ((b.round_no as number) || 0));
          }
        }
        return { gameState, snapshots: nextSnapshots, loading: false };
      });
    } catch (err) {
      set({ error: extractErrorMessage(err, '获取状态失败'), loading: false });
    }
  },

  poll: async (eventId) => {
    try {
      const res = await api.get(`/api/v1/techventure/events/${eventId}/poll`);
      const data = res.data.data as TvPollData;
      set((s) => {
        if (!s.gameState) return {};
        return {
          gameState: {
            ...s.gameState,
            match_status: data.match_status,
            current_round: data.current_round,
            has_submitted: data.has_submitted,
            team: { ...s.gameState.team, budget: data.budget, last_rank: data.last_rank },
          },
        };
      });
      return data;
    } catch {
      return null;
    }
  },

  submitDecision: async (eventId, payload) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/api/v1/techventure/events/${eventId}/submit`, payload);
      set({ loading: false });
    } catch (err) {
      set({ error: extractErrorMessage(err, '提交失败'), loading: false });
      throw err;
    }
  },

  setProductName: async (eventId, name) => {
    try {
      await api.post(`/api/v1/techventure/events/${eventId}/profile`, { product_name: name });
      set((s) => {
        if (!s.gameState) return {};
        return {
          gameState: {
            ...s.gameState,
            team: { ...s.gameState.team, product_name: name },
          },
        };
      });
    } catch (err) {
      set({ error: extractErrorMessage(err, '设置产品名失败') });
    }
  },

  fetchLeaderboard: async (eventId) => {
    try {
      const res = await api.get(`/api/v1/techventure/events/${eventId}/leaderboard`);
      set({ leaderboard: res.data.data });
    } catch { /* silent */ }
  },

  fetchNews: async (eventId) => {
    try {
      const res = await api.get(`/api/v1/techventure/events/${eventId}/news`);
      set({ news: res.data.data });
    } catch { /* silent */ }
  },

  startPractice: async (configId = 'techventure-v1') => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/api/v1/practice/techventure/start', {
        game_config_id: configId,
      });
      set({ loading: false });
      return res.data.data;
    } catch (err) {
      set({ error: extractErrorMessage(err, '创建练习失败'), loading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
