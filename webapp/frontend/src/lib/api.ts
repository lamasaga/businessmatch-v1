import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types';

/** Docker/Nginx 生产构建走同源 /api 代理；本地 dev 默认直连 8000 */
function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv;
  if (import.meta.env.PROD) return '';
  return 'http://localhost:8000';
}

const API_BASE_URL = resolveApiBaseUrl();

// 用于刷新token的独立axios实例，避免拦截器循环
const refreshAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// 正在刷新token的标志和等待队列
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 统一错误处理、token刷新
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<any>>) => {
    // 后端格式：统一包装在 data 中 { success, code, message, data }
    const apiData = response.data;
    if (apiData && typeof apiData === 'object' && 'success' in apiData) {
      if (!apiData.success) {
        return Promise.reject({
          code: apiData.code ?? 1,
          message: apiData.message ?? '请求失败',
          response,
        });
      }
    }
    return response;
  },
  async (error: AxiosError<ApiResponse<any>>) => {
    const originalConfig = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalConfig) {
      return Promise.reject({
        code: 5000,
        message: '网络请求异常，请检查网络连接',
      });
    }

    // 401 未授权 - 尝试刷新token
    if (error.response?.status === 401 && !originalConfig._retry) {
      originalConfig._retry = true;

      if (isRefreshing) {
        // 等待token刷新完成
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            if (originalConfig.headers) {
              originalConfig.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalConfig));
          });
        });
      }

      isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        isRefreshing = false;
        logoutAndRedirect();
        return Promise.reject({
          code: 1002,
          message: '登录已过期，请重新登录',
        });
      }

      try {
        const res = await refreshAxios.post<ApiResponse<{ access_token: string }>>(
          '/api/v1/auth/refresh',
          { refresh_token: refreshToken }
        );
        const apiData = res.data;
        if (!apiData.success || !apiData.data?.access_token) {
          throw new Error('刷新失败');
        }

        const newAccessToken = apiData.data.access_token;
        localStorage.setItem('accessToken', newAccessToken);
        onTokenRefreshed(newAccessToken);
        isRefreshing = false;

        // 重试原请求
        if (originalConfig.headers) {
          originalConfig.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalConfig);
      } catch {
        isRefreshing = false;
        logoutAndRedirect();
        return Promise.reject({
          code: 1002,
          message: '登录已过期，请重新登录',
        });
      }
    }

    // 其他错误统一处理
    const apiData = error.response?.data;
    if (apiData && typeof apiData === 'object') {
      return Promise.reject({
        code: apiData.code ?? error.response?.status ?? 500,
        message: apiData.message ?? '请求失败',
      });
    }

    return Promise.reject({
      code: error.response?.status ?? 5000,
      message: error.message || '网络请求异常',
    });
  }
);

function logoutAndRedirect() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  // 避免在刷新页面时触发跳转
  if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
    window.location.href = '/login';
  }
}

export { api, logoutAndRedirect };
export default api;
