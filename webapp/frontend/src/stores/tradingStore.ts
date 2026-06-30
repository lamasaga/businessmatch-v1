import { create } from 'zustand';
import { api } from '../lib/api';
import type { GameState } from '../types';

export interface RtsActionResponse {
  accepted: boolean;
  message: string;
  game_state?: GameState;
}

interface TradingState {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;
  lastActionHint: string | null;

  fetchGameState: (eventId: number, options?: { silent?: boolean }) => Promise<GameState | null>;
  submitRtsAction: (
    eventId: number,
    actionType: string,
    payload: Record<string, unknown>
  ) => Promise<RtsActionResponse>;
  clearError: () => void;
  clearActionHint: () => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  gameState: null,
  loading: false,
  error: null,
  lastActionHint: null,

  fetchGameState: async (eventId, options) => {
    if (!options?.silent) {
      set({ loading: true, error: null });
    }
    try {
      const response = await api.get(`/api/v1/trading/events/${eventId}/state`);
      const gameState = response.data.data as GameState;
      set({ gameState, loading: false });
      return gameState;
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || '获取游戏状态失败';
      set({ error: msg, loading: false });
      return null;
    }
  },

  submitRtsAction: async (eventId, actionType, payload) => {
    set({ error: null });
    try {
      const response = await api.post(`/api/v1/trading/events/${eventId}/actions`, {
        action_type: actionType,
        payload,
      });
      const result = response.data.data as RtsActionResponse;
      if (result.game_state) {
        set({ gameState: result.game_state, lastActionHint: result.message || null });
      } else if (result.message) {
        set({ lastActionHint: result.message });
      }
      return result;
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || '操作失败';
      set({ error: msg });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
  clearActionHint: () => set({ lastActionHint: null }),
}));
