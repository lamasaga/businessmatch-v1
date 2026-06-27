import { create } from 'zustand';
import { api } from '../lib/api';
import type {
  OpsGameState,
  OpsPositioningPayload,
  OpsDecisionPayload,
  OpsRankingEntry,
  OpsAuctionItemState,
  OpsSnapshot,
} from '../types/ops';

interface OpsState {
  gameState: OpsGameState | null;
  ranking: OpsRankingEntry[];
  snapshots: OpsSnapshot[];
  loading: boolean;
  error: string | null;

  startPractice: (configId?: string) => Promise<{ event_id: number; team_id: number }>;
  fetchState: (eventId: number) => Promise<void>;
  submitPositioning: (eventId: number, payload: OpsPositioningPayload) => Promise<void>;
  submitDecision: (eventId: number, payload: OpsDecisionPayload) => Promise<void>;
  placeBid: (eventId: number, itemId: number, amount: number) => Promise<void>;
  advancePractice: (eventId: number) => Promise<void>;
  fetchRanking: (eventId: number) => Promise<void>;
  fetchAuctionState: (eventId: number) => Promise<OpsAuctionItemState[]>;
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

export const useOpsStore = create<OpsState>((set) => ({
  gameState: null,
  ranking: [],
  snapshots: [],
  loading: false,
  error: null,

  startPractice: async (configId = 'ops-sim-v1') => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/api/v1/practice/ops/start', {
        game_config_id: configId,
      });
      set({ loading: false });
      return res.data.data;
    } catch (err) {
      set({ error: extractErrorMessage(err, '创建练习失败'), loading: false });
      throw err;
    }
  },

  fetchState: async (eventId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/api/v1/ops/events/${eventId}/state`);
      const gameState = res.data.data as OpsGameState;
      set((state) => {
        const nextSnapshots = [...state.snapshots];
        const snap = gameState.last_snapshot;
        if (snap) {
          const round = snap.result?.round_number;
          const exists = nextSnapshots.some(
            (s) => s.result?.round_number === round && round != null
          );
          if (!exists) {
            nextSnapshots.push(snap);
            nextSnapshots.sort((a, b) => (a.result?.round_number || 0) - (b.result?.round_number || 0));
          }
        }
        return { gameState, snapshots: nextSnapshots, loading: false };
      });
    } catch (err) {
      set({ error: extractErrorMessage(err, '获取状态失败'), loading: false });
      throw err;
    }
  },

  submitPositioning: async (eventId, payload) => {
    set({ loading: true, error: null });
    try {
      const posRes = await api.post(`/api/v1/ops/events/${eventId}/product-positioning`, payload);
      const res = await api.get(`/api/v1/ops/events/${eventId}/state`);
      const nextState = res.data.data;
      const advancedPhase = posRes.data.data?.phase;
      if (advancedPhase && nextState) {
        nextState.phase = advancedPhase;
      }
      set({ gameState: nextState, loading: false });
    } catch (err) {
      set({ error: extractErrorMessage(err, '提交定位失败'), loading: false });
      throw err;
    }
  },

  submitDecision: async (eventId, payload) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/api/v1/ops/events/${eventId}/decisions`, payload);
      const res = await api.get(`/api/v1/ops/events/${eventId}/state`);
      set({ gameState: res.data.data, loading: false });
    } catch (err) {
      set({ error: extractErrorMessage(err, '提交决策失败'), loading: false });
      throw err;
    }
  },

  placeBid: async (eventId, itemId, amount) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/api/v1/ops/events/${eventId}/auction/bid?item_id=${itemId}`, { amount });
      const res = await api.get(`/api/v1/ops/events/${eventId}/state`);
      set({ gameState: res.data.data, loading: false });
    } catch (err) {
      set({ error: extractErrorMessage(err, '出价失败'), loading: false });
      throw err;
    }
  },

  advancePractice: async (eventId) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/api/v1/ops/events/${eventId}/practice/advance`);
      const res = await api.get(`/api/v1/ops/events/${eventId}/state`);
      set({ gameState: res.data.data, loading: false });
    } catch (err) {
      set({ error: extractErrorMessage(err, '推进失败'), loading: false });
      throw err;
    }
  },

  fetchRanking: async (eventId) => {
    try {
      const res = await api.get(`/api/v1/ops/events/${eventId}/ranking`);
      set({ ranking: res.data.data });
    } catch {
      /* silent */
    }
  },

  fetchAuctionState: async (eventId) => {
    try {
      const res = await api.get(`/api/v1/ops/events/${eventId}/auction/state`);
      const items = res.data.data as OpsAuctionItemState[];
      set((s) => {
        if (!s.gameState) return {};
        return { gameState: { ...s.gameState, auction_items: items } };
      });
      return items;
    } catch {
      return [];
    }
  },

  clearError: () => set({ error: null }),
}));
