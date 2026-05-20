import { create } from 'zustand';
import { api } from '../lib/api';
import type { GameState, SubmitDecisionResponse } from '../types';

interface TradingState {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;

  fetchGameState: (eventId: number) => Promise<GameState | null>;
  submitDecision: (
    roundId: number,
    actionType: string,
    actionData: Record<string, any>
  ) => Promise<SubmitDecisionResponse>;
  fetchRoundResult: (roundId: number) => Promise<void>;
  clearError: () => void;
}

export const useTradingStore = create<TradingState>((set, get) => ({
  gameState: null,
  loading: false,
  error: null,

  fetchGameState: async (eventId) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/api/v1/trading/events/${eventId}/state`);
      const gameState = response.data.data as GameState;
      set({ gameState, loading: false });
      return gameState;
    } catch (err: any) {
      set({ error: err.message || '获取游戏状态失败', loading: false });
      return null;
    }
  },

  submitDecision: async (roundId, actionType, actionData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/api/v1/trading/rounds/${roundId}/decide`, {
        action_type: actionType,
        action_data: actionData,
      });
      const result = response.data.data;
      const prev = get().gameState;
      if (prev && result?.current_round) {
        set({
          gameState: {
            ...prev,
            current_round: result.current_round,
            has_submitted_this_round: result.has_submitted_this_round,
            can_submit_decision: result.can_submit_decision,
          },
          loading: false,
        });
      } else {
        set({ loading: false });
      }
      return {
        practice_advanced: result?.practice_advanced,
        event_finished: result?.event_finished,
        has_submitted_this_round: result?.has_submitted_this_round,
        can_submit_decision: result?.can_submit_decision,
        current_round: result?.current_round,
      };
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
