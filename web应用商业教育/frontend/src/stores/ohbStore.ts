import { create } from 'zustand';

export interface AIEmployee {
  id: number;
  codename: string;
  name: string;
  avatar_emoji: string;
  role_type: string;
  level: number;
  status: 'idle' | 'busy' | 'offline';
  tasks_completed: number;
  satisfaction_score: number;
  skills: { name: string; level: number; category: string }[];
}

export interface AITask {
  id: number;
  title: string;
  description: string;
  task_type: string;
  status: string;
  priority: string;
  progress: number;
  assignee_id: number;
  student_rating?: number;
  created_at: string;
}

export interface OneCompany {
  id: number;
  name: string;
  slug: string;
  description: string;
  stage: string;
  mode: string;
  total_revenue: number;
  total_cost: number;
  employee_count: number;
  task_stats: { pending: number; in_progress: number; completed: number };
  business_model_canvas?: Record<string, string>;
  created_at: string;
}

interface OHBState {
  company: OneCompany | null;
  employees: AIEmployee[];
  tasks: AITask[];
  loading: boolean;
  error: string | null;
  
  fetchCompany: (id: number) => Promise<void>;
  fetchEmployees: (companyId: number) => Promise<void>;
  fetchTasks: (companyId: number) => Promise<void>;
  hireEmployee: (companyId: number, data: Partial<AIEmployee>) => Promise<void>;
  createTask: (companyId: number, data: Partial<AITask> & { assignee_id: number }) => Promise<void>;
  updateTask: (taskId: number, data: Partial<AITask>) => Promise<void>;
  createCompany: (name: string, description?: string) => Promise<number>;
}

const API_BASE = 'http://localhost:8000/api/v1';

export const useOHBStore = create<OHBState>((set, get) => ({
  company: null,
  employees: [],
  tasks: [],
  loading: false,
  error: null,

  fetchCompany: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/ohb/companies/${id}`);
      const json = await res.json();
      if (json.code === 200) {
        set({ company: json.data, employees: json.data.employees || [], tasks: json.data.tasks || [] });
      }
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchEmployees: async (companyId: number) => {
    try {
      const res = await fetch(`${API_BASE}/ohb/companies/${companyId}/employees`);
      const json = await res.json();
      if (json.code === 200) set({ employees: json.data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchTasks: async (companyId: number) => {
    try {
      const res = await fetch(`${API_BASE}/ohb/companies/${companyId}/tasks`);
      const json = await res.json();
      if (json.code === 200) set({ tasks: json.data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  hireEmployee: async (companyId: number, data) => {
    const res = await fetch(`${API_BASE}/ohb/companies/${companyId}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.code === 200) {
      set((state) => ({ employees: [...state.employees, json.data] }));
    }
  },

  createTask: async (companyId, data) => {
    const res = await fetch(`${API_BASE}/ohb/companies/${companyId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.code === 200) {
      set((state) => ({ tasks: [json.data, ...state.tasks] }));
    }
  },

  updateTask: async (taskId, data) => {
    const res = await fetch(`${API_BASE}/ohb/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.code === 200) {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...data } : t)),
      }));
    }
  },

  createCompany: async (name, description) => {
    const res = await fetch(`${API_BASE}/ohb/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    const json = await res.json();
    if (json.code === 200) {
      set({ company: json.data });
      return json.data.id;
    }
    throw new Error(json.message || '创建失败');
  },
}));
