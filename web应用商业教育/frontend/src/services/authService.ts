import api from '../lib/api';
import type { LoginRequest, RegisterRequest, AuthResponse, User, ApiResponse } from '../types';

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return response.data.data!;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return response.data.data!;
  },

  async getMe(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data.data!;
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const response = await api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh', {
      refreshToken,
    });
    return response.data.data!;
  },
};
