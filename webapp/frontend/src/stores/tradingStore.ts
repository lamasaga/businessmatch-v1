import { create } from 'zustand';
import { api } from '../lib/api';
import type { GameState } from '../types';

interface TradingState {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchGameState: (eventId: number) => Promise<void>;
  submitDecision: (roundId: number, actionType: string, actionData: Record<string, any>) => Promise<void>;
  fetchRoundResult: (roundId: number) => Promise<void>;
  clearError: () => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  gameState: null,
  loading: false,
  error: null,

  fetchGameState: async (eventId) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/api/v1/trading/events/${eventId}/state`);
      set({ gameState: response.data.data, loading: false });
    } catch (err: any) {
      set({ error: err.message || '获取游戏状态失败', loading: false });
    }
  },

  submitDecision: async (roundId, actionType, actionData) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/api/v1/trading/rounds/${roundId}/decide`, {
        action_type: actionType,
        action_data: actionData,
      });
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message || '提交决策失败', loading: false });
      throw err;
    }
  },

  fetchRoundResult: async (roundId) => {
    set({ loading: true, error: null });
    try {
      await api.get(`/api/v1/trading/rounds/${roundId}/result`);
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message || '获取回合结果失败', loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
