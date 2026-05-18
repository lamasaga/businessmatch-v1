import { create } from 'zustand';
import type { User, AuthResponse } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  setUser: (user: User | null) => void;
  setAuth: (auth: AuthResponse) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setAuth: (auth) => {
    localStorage.setItem('accessToken', auth.accessToken);
    localStorage.setItem('refreshToken', auth.refreshToken);
    set({ user: auth.user, isAuthenticated: true, error: null });
  },
  
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false, error: null });
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
