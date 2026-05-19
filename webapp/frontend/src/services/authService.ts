import api from '../lib/api';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  ApiResponse,
  RefreshTokenRequest,
} from '../types';

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/api/v1/auth/login', data);
    return response.data.data!;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/api/v1/auth/register', data);
    return response.data.data!;
  },

  async getMe(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/api/v1/auth/me');
    return response.data.data!;
  },

  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    const response = await api.post<ApiResponse<{ access_token: string }>>(
      '/api/v1/auth/refresh',
      { refresh_token: refreshToken } as RefreshTokenRequest
    );
    return response.data.data!;
  },
};
