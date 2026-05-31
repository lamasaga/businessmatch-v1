import { create } from 'zustand';
import { api } from '../lib/api';
import type {
  SandboxTemplate,
  SandboxSessionSummary,
  SandboxWorldState,
  DebugLog,
  StepResult,
} from '../types/sandbox';

interface SandboxState {
  // 数据
  templates: SandboxTemplate[];
  sessions: SandboxSessionSummary[];
  currentSession: SandboxSessionSummary | null;
  worldState: SandboxWorldState | null;
  configYaml: string;
  debugLogs: DebugLog[];
  debugSummary: { total_logs: number; by_type: Record<string, number> } | null;
  lastStepResult: StepResult | null;

  // UI 状态
  loading: boolean;
  error: string | null;
  activeTab: 'editor' | 'preview' | 'debug';
  selectedTemplate: string | null;

  // Actions
  fetchTemplates: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  createSession: (configId: string) => Promise<string>;
  createSessionFromYaml: (yaml: string) => Promise<string>;
  loadSession: (sessionId: string) => Promise<void>;
  updateConfig: (yaml: string) => Promise<void>;
  startRun: () => Promise<void>;
  stepRun: () => Promise<void>;
  pauseRun: () => Promise<void>;
  resetRun: () => Promise<void>;
  fetchDebugData: (stepType?: string) => Promise<void>;
  publishConfig: (configId: string, version?: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  setActiveTab: (tab: 'editor' | 'preview' | 'debug') => void;
  setSelectedTemplate: (id: string | null) => void;
  setConfigYaml: (yaml: string) => void;
  clearError: () => void;
}

export const useSandboxStore = create<SandboxState>((set, get) => ({
  templates: [],
  sessions: [],
  currentSession: null,
  worldState: null,
  configYaml: '',
  debugLogs: [],
  debugSummary: null,
  lastStepResult: null,
  loading: false,
  error: null,
  activeTab: 'editor',
  selectedTemplate: null,

  fetchTemplates: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/api/v1/sandbox/templates');
      set({ templates: response.data.data || [], loading: false });
    } catch (err: any) {
      set({ error: err.message || '获取模板失败', loading: false });
    }
  },

  fetchSessions: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/api/v1/sandbox/sessions');
      set({ sessions: response.data.data || [], loading: false });
    } catch (err: any) {
      set({ error: err.message || '获取会话列表失败', loading: false });
    }
  },

  createSession: async (configId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/api/v1/sandbox/sessions', {
        config_id: configId,
      });
      const data = response.data.data;
      set({
        currentSession: data.summary,
        configYaml: data.config_yaml || '',
        loading: false,
      });
      return data.session_id;
    } catch (err: any) {
      set({ error: err.message || '创建会话失败', loading: false });
      throw err;
    }
  },

  createSessionFromYaml: async (yaml: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/api/v1/sandbox/sessions', {
        config_yaml: yaml,
      });
      const data = response.data.data;
      set({
        currentSession: data.summary,
        configYaml: yaml,
        loading: false,
      });
      return data.session_id;
    } catch (err: any) {
      set({ error: err.message || '创建会话失败', loading: false });
      throw err;
    }
  },

  loadSession: async (sessionId: string) => {
    set({ loading: true, error: null });
    try {
      const [sessionRes, stateRes] = await Promise.all([
        api.get(`/api/v1/sandbox/sessions/${sessionId}`),
        api.get(`/api/v1/sandbox/sessions/${sessionId}/state`),
      ]);
      set({
        currentSession: sessionRes.data.data.summary,
        worldState: stateRes.data.data,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message || '加载会话失败', loading: false });
    }
  },

  updateConfig: async (yaml: string) => {
    const { currentSession } = get();
    if (!currentSession) return;
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/api/v1/sandbox/sessions/${currentSession.session_id}/config`, {
        config_yaml: yaml,
      });
      const data = response.data.data;
      set({
        currentSession: data.summary,
        configYaml: yaml,
        worldState: null,
        debugLogs: [],
        lastStepResult: null,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message || '更新配置失败', loading: false });
    }
  },

  startRun: async () => {
    const { currentSession } = get();
    if (!currentSession) return;
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/api/v1/sandbox/sessions/${currentSession.session_id}/start`);
      const result = response.data.data;
      set({
        currentSession: { ...currentSession, run_state: result.run_state },
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message || '启动失败', loading: false });
    }
  },

  stepRun: async () => {
    const { currentSession } = get();
    if (!currentSession) return;
    set({ loading: true, error: null });
    try {
      const [stepRes, stateRes] = await Promise.all([
        api.post(`/api/v1/sandbox/sessions/${currentSession.session_id}/step`),
        api.get(`/api/v1/sandbox/sessions/${currentSession.session_id}/state`),
      ]);
      const result = stepRes.data.data;
      set({
        currentSession: {
          ...currentSession,
          run_state: result.finished ? 'finished' : currentSession.run_state,
          current_step: result.step,
        },
        worldState: stateRes.data.data,
        lastStepResult: result,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message || '推进失败', loading: false });
    }
  },

  pauseRun: async () => {
    const { currentSession } = get();
    if (!currentSession) return;
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/api/v1/sandbox/sessions/${currentSession.session_id}/pause`);
      const result = response.data.data;
      set({
        currentSession: { ...currentSession, run_state: result.run_state },
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message || '暂停失败', loading: false });
    }
  },

  resetRun: async () => {
    const { currentSession } = get();
    if (!currentSession) return;
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/api/v1/sandbox/sessions/${currentSession.session_id}/reset`);
      const data = response.data.data;
      set({
        currentSession: data.summary,
        worldState: null,
        debugLogs: [],
        lastStepResult: null,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message || '重置失败', loading: false });
    }
  },

  fetchDebugData: async (stepType?: string) => {
    const { currentSession } = get();
    if (!currentSession) return;
    set({ loading: true, error: null });
    try {
      const url = stepType
        ? `/api/v1/sandbox/sessions/${currentSession.session_id}/debug?step_type=${stepType}`
        : `/api/v1/sandbox/sessions/${currentSession.session_id}/debug`;
      const response = await api.get(url);
      const data = response.data.data;
      set({
        debugLogs: data.logs || [],
        debugSummary: data.summary,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message || '获取调试数据失败', loading: false });
    }
  },

  publishConfig: async (configId: string, version = '1.0.0') => {
    const { currentSession } = get();
    if (!currentSession) return;
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/api/v1/sandbox/sessions/${currentSession.session_id}/publish`, {
        config_id: configId,
        version,
      });
      set({ loading: false });
      return response.data.data;
    } catch (err: any) {
      set({ error: err.message || '发布失败', loading: false });
      throw err;
    }
  },

  deleteSession: async (sessionId: string) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/api/v1/sandbox/sessions/${sessionId}`);
      const { currentSession } = get();
      if (currentSession?.session_id === sessionId) {
        set({ currentSession: null, worldState: null, configYaml: '', debugLogs: [] });
      }
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message || '删除失败', loading: false });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedTemplate: (id) => set({ selectedTemplate: id }),
  setConfigYaml: (yaml) => set({ configYaml: yaml }),
  clearError: () => set({ error: null }),
}));
