import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types';

/** Docker/Nginx 生产构建走同源 /api 代理；本地 dev 默认直连 8010 */
function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv;
  if (import.meta.env.PROD) return '';
  return 'http://localhost:8010';
}

const API_BASE_URL = resolveApiBaseUrl();

const refreshAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const apiData = response.data as ApiResponse<unknown>;
    if (apiData && typeof apiData === 'object' && 'success' in apiData && !apiData.success) {
      return Promise.reject({ message: apiData.message ?? '请求失败' });
    }
    return response;
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalConfig = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (!originalConfig) {
      return Promise.reject({ message: '网络异常' });
    }

    if (error.response?.status === 401 && !originalConfig._retry) {
      originalConfig._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        logoutAndRedirect();
        return Promise.reject({ message: '请重新登录' });
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((token) => {
            if (originalConfig.headers) {
              originalConfig.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalConfig));
          });
        });
      }

      isRefreshing = true;
      try {
        const res = await refreshAxios.post<ApiResponse<{ access_token: string }>>(
          '/api/v1/auth/refresh',
          { refresh_token: refreshToken }
        );
        const newToken = res.data.data?.access_token;
        if (!newToken) throw new Error('refresh failed');
        localStorage.setItem('accessToken', newToken);
        onTokenRefreshed(newToken);
        isRefreshing = false;
        if (originalConfig.headers) {
          originalConfig.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalConfig);
      } catch {
        isRefreshing = false;
        logoutAndRedirect();
        return Promise.reject({ message: '登录已过期' });
      }
    }

    const apiData = error.response?.data;
    return Promise.reject({
      message:
        (apiData && typeof apiData === 'object' && 'message' in apiData
          ? (apiData as ApiResponse<unknown>).message
          : null) || error.message || '请求失败',
    });
  }
);

export function logoutAndRedirect() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}
