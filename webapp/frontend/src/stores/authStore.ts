import { create } from 'zustand';
import type { User, AuthResponse } from '../types';
import { authService } from '../services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setAuth: (auth: AuthResponse) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Async Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; password: string }) => Promise<void>;
}

function persistTokens(tokens: { access_token: string; refresh_token: string }) {
  localStorage.setItem('accessToken', tokens.access_token);
  localStorage.setItem('refreshToken', tokens.refresh_token);
}

function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setAuth: (auth) => {
    persistTokens(auth.tokens);
    set({ user: auth.user, isAuthenticated: true, error: null });
  },

  logout: () => {
    clearTokens();
    set({ user: null, isAuthenticated: false, error: null });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  initialize: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isInitialized: true });
      return;
    }

    set({ isLoading: true });
    try {
      const user = await authService.getMe();
      set({ user, isAuthenticated: true, isInitialized: true });
    } catch (err: any) {
      // 如果getMe失败，清除token但保持初始化完成状态
      clearTokens();
      set({ user: null, isAuthenticated: false, isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const auth = await authService.login({ email, password });
      persistTokens(auth.tokens);
      set({ user: auth.user, isAuthenticated: true, error: null });
    } catch (err: any) {
      const message = err.message || '登录失败，请检查邮箱和密码';
      set({ error: message, isAuthenticated: false, user: null });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const auth = await authService.register(data);
      persistTokens(auth.tokens);
      set({ user: auth.user, isAuthenticated: true, error: null });
    } catch (err: any) {
      const message = err.message || '注册失败，请稍后重试';
      set({ error: message, isAuthenticated: false, user: null });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },
}));
