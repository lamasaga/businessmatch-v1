import { create } from 'zustand';
import { api } from '../lib/api';
import type { ApiResponse, AuthResponse, User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  initialize: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isInitialized: true });
      return;
    }
    try {
      const res = await api.get<ApiResponse<User>>('/api/v1/auth/me');
      set({ user: res.data.data ?? null, isAuthenticated: true, isInitialized: true });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false, isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<ApiResponse<AuthResponse>>('/api/v1/auth/login', {
        email,
        password,
      });
      const auth = res.data.data!;
      localStorage.setItem('accessToken', auth.tokens.access_token);
      localStorage.setItem('refreshToken', auth.tokens.refresh_token);
      set({ user: auth.user, isAuthenticated: true });
    } catch (err: unknown) {
      const message = (err as { message?: string }).message || '登录失败';
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));
