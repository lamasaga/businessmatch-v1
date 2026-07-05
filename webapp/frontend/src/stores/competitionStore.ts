import { create } from 'zustand';
import { api } from '../lib/api';
import type { CompetitionEvent, Participant, JoinCompetitionResult } from '../types';

interface CompetitionState {
  events: CompetitionEvent[];
  currentEvent: CompetitionEvent | null;
  myParticipant: Participant | null;
  isOrganizer: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  fetchEvents: () => Promise<void>;
  createEvent: (data: {
    title: string;
    description?: string;
    max_players?: number;
    config?: {
      rounds?: number;
      initial_capital?: number;
      inventory_limit?: number;
      move_cost?: number;
      decision_time?: number;
    };
  }) => Promise<CompetitionEvent>;
  joinEvent: (roomCode: string) => Promise<JoinCompetitionResult>;
  getMyStatus: (eventId: number) => Promise<boolean>;
  startEvent: (eventId: number) => Promise<void>;
  endEvent: (eventId: number) => Promise<void>;
  startPractice: () => Promise<CompetitionEvent>;
  clearError: () => void;
}

export const useCompetitionStore = create<CompetitionState>((set) => ({
  events: [],
  currentEvent: null,
  myParticipant: null,
  isOrganizer: false,
  loading: false,
  error: null,

  fetchEvents: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/api/v1/competitions');
      set({ events: response.data.data || [], loading: false });
    } catch (err: any) {
      set({ error: err.message || '获取比赛列表失败', loading: false });
    }
  },

  createEvent: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/api/v1/competitions', {
        ...data,
        game_type: 'trading',
        config: {
          rounds: 10,
          initial_capital: 50000,
          inventory_limit: 20,
          move_cost: 1000,
          decision_time: 60,
          cities: ['nanjing', 'suzhou', 'shanghai', 'nantong', 'hangzhou', 'changzhou'],
          products: ['fruit', 'vegetable', 'daily', 'electronics', 'clothing', 'cosmetics', 'jewelry', 'antique', 'art', 'snack'],
          ...data.config,
        },
      });
      const event = response.data.data;
      set({ currentEvent: event, loading: false });
      return event;
    } catch (err: any) {
      set({ error: err.message || '创建比赛失败', loading: false });
      throw err;
    }
  },

  joinEvent: async (roomCode) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/api/v1/competitions/join', { room_code: roomCode });
      const result = response.data.data as JoinCompetitionResult;
      set({ myParticipant: result.participant, loading: false });
      return result;
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || '加入比赛失败';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  getMyStatus: async (eventId) => {
    try {
      const response = await api.get(`/api/v1/competitions/${eventId}/my-status`);
      const data = response.data.data;
      set({
        currentEvent: data.event,
        myParticipant: data.participant,
        isOrganizer: data.is_organizer,
        error: null,
      });
      return true;
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || '加载比赛状态失败';
      set({ error: msg });
      return false;
    }
  },

  startEvent: async (eventId) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/api/v1/competitions/${eventId}/start`);
      set({ currentEvent: response.data.data, loading: false });
    } catch (err: any) {
      set({ error: err.message || '开始比赛失败', loading: false });
      throw err;
    }
  },

  endEvent: async (eventId) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/api/v1/competitions/${eventId}/end`);
      set({ currentEvent: response.data.data, loading: false });
    } catch (err: any) {
      set({ error: err.message || '结束比赛失败', loading: false });
      throw err;
    }
  },

  startPractice: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/api/v1/practice/trading/start', {
        game_config_id: 'fstrading',
        title: 'FStrading · 日常练习',
      });
      const event = response.data.data as CompetitionEvent;
      set({ currentEvent: event, loading: false });
      return event;
    } catch (err: any) {
      set({ error: err.message || '创建练习局失败', loading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
