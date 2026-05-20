import { create } from 'zustand';
import { api } from '../lib/api';
import type { GameState, SubmitDecisionResponse } from '../types';

export interface RtsActionResponse {
  accepted: boolean;
  message: string;
  game_state?: GameState;
}

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
  submitRtsAction: (
    eventId: number,
    actionType: string,
    payload: Record<string, unknown>
  ) => Promise<RtsActionResponse>;
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

  submitRtsAction: async (eventId, actionType, payload) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/api/v1/trading/events/${eventId}/actions`, {
        action_type: actionType,
        payload,
      });
      const result = response.data.data as RtsActionResponse;
      if (result.game_state) {
        set({ gameState: result.game_state, loading: false });
      } else {
        set({ loading: false });
      }
      return result;
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || '提交失败';
      set({ error: msg, loading: false });
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
