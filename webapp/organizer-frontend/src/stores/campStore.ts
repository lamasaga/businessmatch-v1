import { create } from 'zustand';
import { api } from '../lib/api';
import type { ApiResponse } from '../types';
import type {
  CampAgendaItem, CampTask, TaskSubmission, SubmissionReview,
  CampCompany, RoleTemplate, CampCoinTransaction, CampCoinRule,
  CampShopItem, CoinLeaderboardEntry, CampAward, AwardWinner,
  CompanyRole, SubmitterType,
} from '../types/camp';

export interface TeachingGroup {
  id: number;
  name: string;
  description?: string | null;
  invite_code: string;
  teacher_user_id: number;
  status: string;
  member_count: number;
  event_count: number;
  created_at: string;
}

export interface GroupMember {
  user_id: number;
  username: string;
  role: string;
  joined_at: string;
}

export interface TeachingGroupDetail extends TeachingGroup {
  members: GroupMember[];
}

export interface Announcement {
  id: number;
  teaching_group_id: number;
  title: string;
  content: string;
  created_by: number;
  is_pinned: boolean;
  created_at: string;
}

export interface MemberProgress {
  user_id: number;
  username: string;
  joined_at: string;
  match_count: number;
  total_xp: number;
  last_active_at: string | null;
  status: string;
}

export interface MemberProgressSummary {
  total: number;
  active: number;
  normal: number;
  attention: number;
  newcomer: number;
}

export interface CampDashboard {
  member_count: number;
  active_event_count: number;
  weekly_active_count: number;
  recent_announcements: Announcement[];
  recent_events: Array<{
    id: number;
    title: string;
    status: string;
    created_at: string | null;
  }>;
  current_day: number;
  company_count: number;
  active_task_count: number;
  today_agenda: Array<{
    id: number;
    time: string;
    title: string;
    status: string;
    location?: string;
  }>;
  quick_actions: {
    has_ongoing_match: boolean;
    has_pending_reviews: number;
    unscored_tasks: number;
  };
}

interface CampState {
  camps: TeachingGroup[];
  current: TeachingGroupDetail | null;
  announcements: Announcement[];
  memberProgress: MemberProgress[];
  progressSummary: MemberProgressSummary | null;
  dashboard: CampDashboard | null;
  loading: boolean;
  error: string | null;

  // 夏令营扩展状态
  agenda: CampAgendaItem[];
  tasks: CampTask[];
  currentTask: CampTask | null;
  submissions: TaskSubmission[];
  currentSubmission: TaskSubmission | null;
  submissionReviews: SubmissionReview[];
  pendingReviewCount: number;
  companies: CampCompany[];
  roleTemplates: RoleTemplate[];
  coinTransactions: CampCoinTransaction[];
  coinRules: CampCoinRule[];
  shopItems: CampShopItem[];
  coinLeaderboard: CoinLeaderboardEntry[];
  awards: CampAward[];
  awardWinners: AwardWinner[];


  fetchMine: () => Promise<void>;
  fetchDetail: (id: number) => Promise<void>;
  createCamp: (data: {
    name: string;
    description?: string;
    camp_start_at?: string;
    camp_end_at?: string;
  }) => Promise<TeachingGroup>;
  updateCamp: (
    id: number,
    data: { name?: string; description?: string; status?: string; reset_invite_code?: boolean }
  ) => Promise<TeachingGroup>;
  fetchAnnouncements: (groupId: number) => Promise<void>;
  createAnnouncement: (groupId: number, data: { title: string; content: string }) => Promise<Announcement>;
  deleteAnnouncement: (groupId: number, announcementId: number) => Promise<void>;
  pinAnnouncement: (groupId: number, announcementId: number) => Promise<void>;
  fetchMemberProgress: (groupId: number) => Promise<void>;
  fetchDashboard: (groupId: number) => Promise<void>;
  clearError: () => void;

  // 夏令营扩展 action
  fetchAgenda: (groupId: number, day?: number) => Promise<void>;
  createAgendaItem: (groupId: number, data: Partial<CampAgendaItem>) => Promise<void>;
  updateAgendaItem: (groupId: number, itemId: number, data: Partial<CampAgendaItem>) => Promise<void>;
  deleteAgendaItem: (groupId: number, itemId: number) => Promise<void>;
  fetchTasks: (groupId: number, filters?: Record<string, unknown>) => Promise<void>;
  createTask: (groupId: number, data: Partial<CampTask>) => Promise<void>;
  updateTask: (groupId: number, taskId: number, data: Partial<CampTask>) => Promise<void>;
  deleteTask: (groupId: number, taskId: number) => Promise<void>;
  publishTask: (groupId: number, taskId: number) => Promise<void>;
  closeTask: (groupId: number, taskId: number) => Promise<void>;
  fetchSubmissions: (groupId: number, filters?: Record<string, unknown>) => Promise<void>;
  reviewSubmission: (groupId: number, subId: number, dimensions: Array<{ dimension_id: number; score: number; comment?: string }>) => Promise<void>;
  featureSubmission: (groupId: number, subId: number, featured: boolean) => Promise<void>;
  fetchPendingReviewCount: (groupId: number) => Promise<void>;
  fetchCompanies: (groupId: number) => Promise<void>;
  updateCompanyRoles: (groupId: number, companyId: number, roles: Array<{ user_id: number; role: CompanyRole }>) => Promise<void>;
  grantCoins: (groupId: number, targets: Array<{ entity_type: SubmitterType; entity_id: number }>, amount: number, reason: string) => Promise<void>;
  deductCoins: (groupId: number, targets: Array<{ entity_type: SubmitterType; entity_id: number }>, amount: number, reason: string) => Promise<void>;
  fetchCoinTransactions: (groupId: number) => Promise<void>;
  fetchCoinRules: (groupId: number) => Promise<void>;
  updateCoinRule: (groupId: number, ruleId: number, data: Partial<CampCoinRule>) => Promise<void>;
  fetchShopItems: (groupId: number) => Promise<void>;
  createShopItem: (groupId: number, data: Partial<CampShopItem>) => Promise<void>;
  updateShopItem: (groupId: number, itemId: number, data: Partial<CampShopItem>) => Promise<void>;
  deleteShopItem: (groupId: number, itemId: number) => Promise<void>;
  fetchCoinLeaderboard: (groupId: number, type: string) => Promise<void>;
  fetchAwards: (groupId: number) => Promise<void>;
  createAward: (groupId: number, data: Partial<CampAward>) => Promise<void>;
  updateAward: (groupId: number, awardId: number, data: Partial<CampAward>) => Promise<void>;
  deleteAward: (groupId: number, awardId: number) => Promise<void>;
  calculateWinners: (groupId: number) => Promise<void>;
  announceWinner: (groupId: number, awardId: number, data: { winner_type: SubmitterType; winner_id: number }) => Promise<void>;
}

export const useCampStore = create<CampState>((set) => ({
  camps: [],
  current: null,
  announcements: [],
  memberProgress: [],
  progressSummary: null,
  dashboard: null,
  loading: false,
  error: null,

  // 夏令营扩展初始值
  agenda: [],
  tasks: [],
  currentTask: null,
  submissions: [],
  currentSubmission: null,
  submissionReviews: [],
  pendingReviewCount: 0,
  companies: [],
  roleTemplates: [],
  coinTransactions: [],
  coinRules: [],
  shopItems: [],
  coinLeaderboard: [],
  awards: [],
  awardWinners: [],

  fetchMine: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<ApiResponse<TeachingGroup[]>>('/api/v1/teaching-groups/mine');
      set({ camps: res.data.data ?? [], loading: false });
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '加载失败',
        loading: false,
      });
    }
  },

  fetchDetail: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<ApiResponse<TeachingGroupDetail>>(`/api/v1/teaching-groups/${id}`);
      set({ current: res.data.data ?? null, loading: false });
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '加载失败',
        loading: false,
      });
      throw err;
    }
  },

  createCamp: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post<ApiResponse<TeachingGroup>>('/api/v1/teaching-groups', data);
      const camp = res.data.data!;
      set((s) => ({ camps: [camp, ...s.camps], loading: false }));
      return camp;
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '创建失败',
        loading: false,
      });
      throw err;
    }
  },

  updateCamp: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.patch<ApiResponse<TeachingGroup>>(`/api/v1/teaching-groups/${id}`, data);
      const camp = res.data.data!;
      set((s) => ({
        camps: s.camps.map((c) => (c.id === id ? camp : c)),
        current: s.current?.id === id ? { ...s.current, ...camp, members: s.current.members } : s.current,
        loading: false,
      }));
      return camp;
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '更新失败',
        loading: false,
      });
      throw err;
    }
  },

  fetchAnnouncements: async (groupId) => {
    try {
      const res = await api.get<ApiResponse<Announcement[]>>(`/api/v1/teaching-groups/${groupId}/announcements`);
      set({ announcements: res.data.data ?? [] });
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '加载公告失败' });
    }
  },

  createAnnouncement: async (groupId, data) => {
    try {
      const res = await api.post<ApiResponse<Announcement>>(`/api/v1/teaching-groups/${groupId}/announcements`, data);
      const announcement = res.data.data!;
      set((s) => ({
        announcements: [announcement, ...s.announcements],
      }));
      return announcement;
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '发布公告失败' });
      throw err;
    }
  },

  deleteAnnouncement: async (groupId, announcementId) => {
    try {
      await api.delete(`/api/v1/teaching-groups/${groupId}/announcements/${announcementId}`);
      set((s) => ({
        announcements: s.announcements.filter((a) => a.id !== announcementId),
      }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '删除公告失败' });
      throw err;
    }
  },

  pinAnnouncement: async (groupId, announcementId) => {
    try {
      const res = await api.patch<ApiResponse<Announcement>>(
        `/api/v1/teaching-groups/${groupId}/announcements/${announcementId}/pin`
      );
      const updated = res.data.data!;
      set((s) => ({
        announcements: s.announcements
          .map((a) => (a.id === announcementId ? updated : a))
          .sort((a, b) => {
            if (a.is_pinned === b.is_pinned) {
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            return a.is_pinned ? -1 : 1;
          }),
      }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '置顶操作失败' });
      throw err;
    }
  },

  fetchMemberProgress: async (groupId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<ApiResponse<{ members: MemberProgress[]; summary: MemberProgressSummary }>>(
        `/api/v1/teaching-groups/${groupId}/member-progress`
      );
      set({
        memberProgress: res.data.data?.members ?? [],
        progressSummary: res.data.data?.summary ?? null,
        loading: false,
      });
    } catch (err: unknown) {
      set({
        error: (err as { message?: string }).message || '加载学员进度失败',
        loading: false,
      });
    }
  },

  fetchDashboard: async (groupId) => {
    try {
      const res = await api.get<ApiResponse<CampDashboard>>(`/api/v1/teaching-groups/${groupId}/dashboard`);
      set({ dashboard: res.data.data ?? null });
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '加载看板失败' });
    }
  },

  clearError: () => set({ error: null }),

  // ─── 议程 ───
  fetchAgenda: async (groupId, day) => {
    try {
      const params = day ? `?day=${day}` : '';
      const res = await api.get<ApiResponse<CampAgendaItem[]>>(`/api/v1/teaching-groups/${groupId}/agenda${params}`);
      set({ agenda: res.data.data ?? [] });
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '加载议程失败' });
    }
  },
  createAgendaItem: async (groupId, data) => {
    try {
      const res = await api.post<ApiResponse<CampAgendaItem>>(`/api/v1/teaching-groups/${groupId}/agenda`, data);
      set((s) => ({ agenda: [...s.agenda, res.data.data!] }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '创建议程失败' });
      throw err;
    }
  },
  updateAgendaItem: async (groupId, itemId, data) => {
    try {
      const res = await api.put<ApiResponse<CampAgendaItem>>(`/api/v1/teaching-groups/${groupId}/agenda/${itemId}`, data);
      set((s) => ({ agenda: s.agenda.map((i) => (i.id === itemId ? res.data.data! : i)) }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '更新议程失败' });
      throw err;
    }
  },
  deleteAgendaItem: async (groupId, itemId) => {
    try {
      await api.delete(`/api/v1/teaching-groups/${groupId}/agenda/${itemId}`);
      set((s) => ({ agenda: s.agenda.filter((i) => i.id !== itemId) }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '删除议程失败' });
      throw err;
    }
  },

  // ─── 任务 ───
  fetchTasks: async (groupId, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v != null) params.append(k, String(v)); });
      const res = await api.get<ApiResponse<CampTask[]>>(`/api/v1/teaching-groups/${groupId}/tasks?${params}`);
      set({ tasks: res.data.data ?? [], loading: false });
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '加载任务失败', loading: false });
    }
  },
  createTask: async (groupId, data) => {
    try {
      const res = await api.post<ApiResponse<CampTask>>(`/api/v1/teaching-groups/${groupId}/tasks`, data);
      set((s) => ({ tasks: [res.data.data!, ...s.tasks] }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '创建任务失败' });
      throw err;
    }
  },
  updateTask: async (groupId, taskId, data) => {
    try {
      const res = await api.put<ApiResponse<CampTask>>(`/api/v1/teaching-groups/${groupId}/tasks/${taskId}`, data);
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? res.data.data! : t)) }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '更新任务失败' });
      throw err;
    }
  },
  deleteTask: async (groupId, taskId) => {
    try {
      await api.delete(`/api/v1/teaching-groups/${groupId}/tasks/${taskId}`);
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '删除任务失败' });
      throw err;
    }
  },
  publishTask: async (groupId, taskId) => {
    try {
      const res = await api.post<ApiResponse<CampTask>>(`/api/v1/teaching-groups/${groupId}/tasks/${taskId}/publish`);
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? res.data.data! : t)) }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '发布任务失败' });
      throw err;
    }
  },
  closeTask: async (groupId, taskId) => {
    try {
      const res = await api.post<ApiResponse<CampTask>>(`/api/v1/teaching-groups/${groupId}/tasks/${taskId}/close`);
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? res.data.data! : t)) }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '关闭任务失败' });
      throw err;
    }
  },

  // ─── 提交/作品 ───
  fetchSubmissions: async (groupId, filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v != null) params.append(k, String(v)); });
      const res = await api.get<ApiResponse<TaskSubmission[]>>(`/api/v1/teaching-groups/${groupId}/submissions?${params}`);
      set({ submissions: res.data.data ?? [] });
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '加载作品失败' });
    }
  },
  reviewSubmission: async (groupId, subId, dimensions) => {
    try {
      const res = await api.post<ApiResponse<TaskSubmission>>(`/api/v1/teaching-groups/${groupId}/submissions/${subId}/review`, { dimensions });
      set((s) => ({ submissions: s.submissions.map((sub) => (sub.id === subId ? res.data.data! : sub)) }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '评分失败' });
      throw err;
    }
  },
  featureSubmission: async (groupId, subId, featured) => {
    try {
      const res = await api.put<ApiResponse<TaskSubmission>>(`/api/v1/teaching-groups/${groupId}/submissions/${subId}/feature`, { featured });
      set((s) => ({ submissions: s.submissions.map((sub) => (sub.id === subId ? res.data.data! : sub)) }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '设置精选失败' });
      throw err;
    }
  },
  fetchPendingReviewCount: async (groupId) => {
    try {
      const res = await api.get<ApiResponse<number>>(`/api/v1/teaching-groups/${groupId}/submissions/pending-count`);
      set({ pendingReviewCount: res.data.data ?? 0 });
    } catch {
      set({ pendingReviewCount: 0 });
    }
  },

  // ─── 公司 ───
  fetchCompanies: async (groupId) => {
    try {
      // 复用 camp_groups API 构建公司数据
      const res = await api.get<ApiResponse<CampCompany[]>>(`/api/v1/teaching-groups/${groupId}/companies`);
      set({ companies: res.data.data ?? [] });
    } catch {
      set({ companies: [] });
    }
  },
  updateCompanyRoles: async (groupId, companyId, roles) => {
    try {
      await api.put(`/api/v1/teaching-groups/${groupId}/companies/${companyId}/roles`, { roles });
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '更新角色失败' });
      throw err;
    }
  },

  // ─── 营币 ───
  grantCoins: async (groupId, targets, amount, reason) => {
    try {
      await api.post(`/api/v1/teaching-groups/${groupId}/coins/grant`, { targets, amount, reason });
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '发放营币失败' });
      throw err;
    }
  },
  deductCoins: async (groupId, targets, amount, reason) => {
    try {
      await api.post(`/api/v1/teaching-groups/${groupId}/coins/deduct`, { targets, amount, reason });
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '扣除营币失败' });
      throw err;
    }
  },
  fetchCoinTransactions: async (groupId) => {
    try {
      const res = await api.get<ApiResponse<CampCoinTransaction[]>>(`/api/v1/teaching-groups/${groupId}/coins/transactions`);
      set({ coinTransactions: res.data.data ?? [] });
    } catch {
      set({ coinTransactions: [] });
    }
  },
  fetchCoinRules: async (groupId) => {
    try {
      const res = await api.get<ApiResponse<CampCoinRule[]>>(`/api/v1/teaching-groups/${groupId}/coin-rules`);
      set({ coinRules: res.data.data ?? [] });
    } catch {
      set({ coinRules: [] });
    }
  },
  updateCoinRule: async (groupId, ruleId, data) => {
    try {
      await api.put(`/api/v1/teaching-groups/${groupId}/coin-rules/${ruleId}`, data);
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '更新规则失败' });
      throw err;
    }
  },
  fetchShopItems: async (groupId) => {
    try {
      const res = await api.get<ApiResponse<CampShopItem[]>>(`/api/v1/teaching-groups/${groupId}/shop-items`);
      set({ shopItems: res.data.data ?? [] });
    } catch {
      set({ shopItems: [] });
    }
  },
  createShopItem: async (groupId, data) => {
    try {
      await api.post(`/api/v1/teaching-groups/${groupId}/shop-items`, data);
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '创建商品失败' });
      throw err;
    }
  },
  updateShopItem: async (groupId, itemId, data) => {
    try {
      await api.put(`/api/v1/teaching-groups/${groupId}/shop-items/${itemId}`, data);
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '更新商品失败' });
      throw err;
    }
  },
  deleteShopItem: async (groupId, itemId) => {
    try {
      await api.delete(`/api/v1/teaching-groups/${groupId}/shop-items/${itemId}`);
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '删除商品失败' });
      throw err;
    }
  },
  fetchCoinLeaderboard: async (groupId, type) => {
    try {
      const res = await api.get<ApiResponse<CoinLeaderboardEntry[]>>(`/api/v1/teaching-groups/${groupId}/coins/leaderboard?type=${type}`);
      set({ coinLeaderboard: res.data.data ?? [] });
    } catch {
      set({ coinLeaderboard: [] });
    }
  },

  // ─── 奖项 ───
  fetchAwards: async (groupId) => {
    try {
      const res = await api.get<ApiResponse<CampAward[]>>(`/api/v1/teaching-groups/${groupId}/awards`);
      set({ awards: res.data.data ?? [] });
    } catch {
      set({ awards: [] });
    }
  },
  createAward: async (groupId, data) => {
    try {
      const res = await api.post<ApiResponse<CampAward>>(`/api/v1/teaching-groups/${groupId}/awards`, data);
      set((s) => ({ awards: [...s.awards, res.data.data!] }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '创建奖项失败' });
      throw err;
    }
  },
  updateAward: async (groupId, awardId, data) => {
    try {
      const res = await api.put<ApiResponse<CampAward>>(`/api/v1/teaching-groups/${groupId}/awards/${awardId}`, data);
      set((s) => ({ awards: s.awards.map((a) => (a.id === awardId ? res.data.data! : a)) }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '更新奖项失败' });
      throw err;
    }
  },
  deleteAward: async (groupId, awardId) => {
    try {
      await api.delete(`/api/v1/teaching-groups/${groupId}/awards/${awardId}`);
      set((s) => ({ awards: s.awards.filter((a) => a.id !== awardId) }));
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '删除奖项失败' });
      throw err;
    }
  },
  calculateWinners: async (groupId) => {
    try {
      const res = await api.post<ApiResponse<AwardWinner[]>>(`/api/v1/teaching-groups/${groupId}/awards/calculate`);
      set({ awardWinners: res.data.data ?? [] });
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '计算获奖名单失败' });
      throw err;
    }
  },
  announceWinner: async (groupId, awardId, data) => {
    try {
      await api.post(`/api/v1/teaching-groups/${groupId}/awards/${awardId}/announce`, data);
    } catch (err: unknown) {
      set({ error: (err as { message?: string }).message || '宣布获奖失败' });
      throw err;
    }
  },
}));
