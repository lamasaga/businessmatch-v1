// 夏令营扩展类型定义
// ─────────────────────────────────────────────

// ========== 议程 ==========
export interface CampAgendaItem {
  id: number;
  group_id: number;
  day_number: number;
  start_time: string;
  end_time: string;
  title: string;
  location?: string;
  description?: string;
  task_id?: number;
  sort_order: number;
}

// ========== 任务 ==========
export type TaskType = 'text' | 'image' | 'video' | 'file' | 'vote' | 'match' | 'lecture' | 'practice_match' | 'formal_match' | 'debrief' | 'assignment' | 'discussion' | 'survey' | 'prototype' | 'pitch';
export type TaskStatus = 'draft' | 'published' | 'closed' | 'scored' | 'archived';
export type SubmitterType = 'user' | 'group';

export interface ScoringDimension {
  id: number;
  task_id: number;
  name: string;
  weight: number;
  max_score: number;
  sort_order: number;
}

export interface CampTask {
  id: number;
  group_id: number;
  day_number: number;
  title: string;
  description?: string;
  task_type: TaskType;
  submit_type: SubmitterType;
  due_at?: string;
  config_json?: Record<string, unknown>;
  status: TaskStatus;
  dimensions?: ScoringDimension[];
  created_by: number;
  created_at: string;
  updated_at?: string;
}

// ========== 提交/作品 ==========
export interface TaskSubmission {
  id: number;
  task_id: number;
  submitter_type: SubmitterType;
  submitter_id: number;
  submitter_name?: string;
  content?: string;
  attachments?: string;
  submitted_at: string;
  status: 'pending' | 'reviewed' | 'featured';
  score?: number;
  feedback?: string;
}

export interface SubmissionReview {
  id: number;
  submission_id: number;
  dimension_id: number;
  scorer_id: number;
  score: number;
  comment?: string;
  created_at: string;
}

// ========== 公司 ==========
export type CompanyRole = 'ceo' | 'product' | 'marketing' | 'finance' | 'research' | 'design';

export interface CompanyMember {
  user_id: number;
  username: string;
  avatar?: string;
  role: CompanyRole;
}

export interface CampCompany {
  id: number;
  group_id: number;
  camp_group_id: number;
  name: string;
  logo_url?: string;
  slogan?: string;
  members: CompanyMember[];
  coin_balance: number;
  total_score: number;
  work_count: number;
  created_at: string;
}

export interface RoleTemplate {
  role_type: CompanyRole;
  name: string;
  description: string;
  icon: string;
  is_enabled: boolean;
}

// ========== 营币 ==========
export interface CampCoinTransaction {
  id: number;
  group_id: number;
  entity_type: SubmitterType;
  entity_id: number;
  entity_name?: string;
  amount: number;
  balance_after: number;
  tx_type: 'earn' | 'spend' | 'transfer';
  source_type: string;
  description?: string;
  created_at: string;
}

export interface CampCoinRule {
  id: number;
  group_id: number;
  name: string;
  trigger_type: string;
  amount: number;
  is_active: boolean;
}

export interface CampShopItem {
  id: number;
  group_id: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  effect_type: string;
  effect_config?: string;
  is_active: boolean;
}

export interface CoinLeaderboardEntry {
  rank: number;
  entity_type: SubmitterType;
  entity_id: number;
  entity_name: string;
  balance: number;
}

// ========== 评分/奖项 ==========
export interface CampAward {
  id: number;
  group_id: number;
  name: string;
  description?: string;
  icon: string;
  criteria?: string;
  sort_order: number;
}

export interface AwardWinner {
  award_id: number;
  award_name: string;
  winner_type: SubmitterType;
  winner_id: number;
  winner_name: string;
  score_value?: number;
  announced_at?: string;
}

// ========== API 辅助 ==========
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
