import { create } from 'zustand';
import { api } from '../lib/api';
import type { CompetitionEvent, Participant } from '../types';

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
  joinEvent: (roomCode: string) => Promise<number>;
  getMyStatus: (eventId: number) => Promise<void>;
  startEvent: (eventId: number) => Promise<void>;
  endEvent: (eventId: number) => Promise<void>;
  nextRound: (roundId: number) => Promise<void>;
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
      set({ error: err.message || '????????', loading: false });
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
          cities: ['nanjing', 'suzhou', 'shanghai', 'nantong', 'wuxi', 'changzhou'],
          products: ['fruit', 'vegetable', 'daily', 'electronics', 'clothing', 'cosmetics', 'jewelry', 'antique', 'art', 'snack'],
          ...data.config,
        },
      });
      const event = response.data.data;
      set({ currentEvent: event, loading: false });
      return event;
    } catch (err: any) {
      set({ error: err.message || '??????', loading: false });
      throw err;
    }
  },

  joinEvent: async (roomCode) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/api/v1/competitions/join', { room_code: roomCode });
      const participant = response.data.data;
      set({ myParticipant: participant, loading: false });
      return participant.event_id as number;
    } catch (err: any) {
      set({ error: err.message || '??????', loading: false });
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
      });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  startEvent: async (eventId) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/api/v1/competitions/${eventId}/start`);
      set({ currentEvent: response.data.data, loading: false });
    } catch (err: any) {
      set({ error: err.message || '??????', loading: false });
      throw err;
    }
  },

  endEvent: async (eventId) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/api/v1/competitions/${eventId}/end`);
      set({ currentEvent: response.data.data, loading: false });
    } catch (err: any) {
      set({ error: err.message || '??????', loading: false });
      throw err;
    }
  },

  nextRound: async (roundId) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/api/v1/trading/rounds/${roundId}/next`);
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message || '??????', loading: false });
      throw err;
    }
  },

  startPractice: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/api/v1/practice/trading/start', {
        game_config_id: 'fstrading',
        title: 'FStrading · ????',
      });
      const event = response.data.data as CompetitionEvent;
      set({ currentEvent: event, loading: false });
      return event;
    } catch (err: any) {
      set({ error: err.message || '???????', loading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
