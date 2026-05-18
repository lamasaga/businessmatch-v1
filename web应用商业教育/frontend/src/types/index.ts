// ==================== 统一API响应类型 ====================

export interface ApiResponse<T> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ==================== 用户类型 ====================

export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  experience: number;
  level: number;
  created_at: string;
}

export interface UserPublic {
  id: number;
  username: string;
  avatar?: string;
  role: UserRole;
  level: number;
}

// ==================== 认证类型 ====================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

// ==================== 课程类型 ====================

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  original_price?: number;
  thumbnail?: string;
  category: string;
  tags: string[];
  instructor: string;
  rating: number;
  student_count: number;
  lesson_count: number;
  duration: number;
  level: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: number;
  type: 'video' | 'text' | 'quiz';
  content?: string;
  video_url?: string;
}

// ==================== 知识图谱类型 ====================

export interface KnowledgeCard {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  discipline: string;
  tags: string[];
  difficulty: number;
  definition?: string;
  explanation?: string;
  analogy?: string;
  examples?: string[];
  prerequisites?: string[];
  extensions?: string[];
  related_cards?: RelatedCard[];
}

export interface RelatedCard {
  id: string;
  title: string;
  discipline: string;
}

export interface KnowledgeNode {
  id: string;
  title: string;
  category: string;
  discipline: string;
  difficulty: number;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  type: string;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface DisciplineMap {
  [discipline: string]: string[];
}

// ==================== 商赛类型 ====================

export interface GameSession {
  id: string;
  name: string;
  status: 'waiting' | 'playing' | 'finished';
  game_type: string;
  current_round: number;
  total_rounds: number;
  participants: GameParticipant[];
  created_at: string;
}

export interface GameParticipant {
  user_id: string;
  username: string;
  team_id?: string;
  team_name?: string;
  is_ready: boolean;
  score?: number;
}

// ==================== 国富论游戏类型 ====================

export interface WorkshopWorker {
  id: number;
  name: string;
  wage: number;
  division_id: number | null;
  productivity: number;
}

export interface WorkshopDivision {
  id: number;
  name: string;
  stage: number;
  efficiency_bonus: number;
  workers: number[];
}

// ==================== UI 状态类型 ====================

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface ApiError {
  code: number;
  message: string;
}
