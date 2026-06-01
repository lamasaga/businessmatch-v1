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

// ==================== 交易比赛类型 ====================

export interface CompetitionEvent {
  id: number;
  organizer_id: number;
  room_code: string;
  title: string;
  description?: string;
  game_type: string;
  game_config_id?: string;
  status: 'draft' | 'registration' | 'playing' | 'finished' | 'cancelled';
  config: CompetitionConfig;
  max_players: number;
  current_round: number;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
  participant_count?: number;
}

export interface CompetitionConfig {
  rounds: number;
  initial_capital: number;
  inventory_limit: number;
  inventory_limit_per_product?: number;
  move_cost: number;
  decision_time: number;
  cities: string[];
  products: string[];
}

export interface InventoryCapacity {
  limit_per_product: number;
  total_items: number;
  by_product: Record<string, { quantity: number; remaining?: number; volume_used?: number; volume_per_unit?: number }>;
  storage_capacity?: number;
  storage_used?: number;
  storage_remaining?: number;
  vehicles?: string[];
  max_vehicles?: number;
}

export interface Participant {
  id: number;
  event_id: number;
  user_id: number;
  username: string;
  avatar?: string;
  cash: number;
  inventory: Record<string, number>;
  current_city: string;
  total_assets: number;
  status: string;
  final_rank?: number;
  experience_earned: number;
  joined_at: string;
}

export interface TradingRound {
  id: number;
  event_id: number;
  round_number: number;
  status: string;
  events: GameEvent[];
  price_snapshot: Record<string, Record<string, number>>;
  started_at?: string;
  ended_at?: string;
}

export interface GameEvent {
  type: string;
  name: string;
  description: string;
  city: string;
  affected_products: string[];
  impact: number;
  target_category: string;
}

export interface ProductPrice {
  product_id: string;
  name: string;
  category: string;
  buy_price: number;
  sell_price: number;
  trend: string;
  trend_percent: number;
  volume?: number;
  pool_qty?: number;
  buy_qty?: number;
  sell_qty?: number;
  net_demand?: number;
  pressure?: number;
}

export interface CityMarket {
  city: string;
  city_name: string;
  city_type?: string;
  hub?: boolean;
  products: ProductPrice[];
}

export interface PlayerInventoryItem {
  product_id: string;
  name: string;
  quantity: number;
  avg_cost: number;
  current_value: number;
  volume?: number;
}

export interface GameState {
  event: CompetitionEvent;
  participant: Participant;
  current_round: TradingRound | null;
  markets: CityMarket[];
  inventory: PlayerInventoryItem[];
  standings: StandingsEntry[];
  time_remaining?: number;
  is_practice?: boolean;
  game_mode?: string;
  pricing_mode?: string;
  market_insights?: MarketInsight[];
  has_submitted_this_round?: boolean;
  can_submit_decision?: boolean;
  inventory_capacity?: InventoryCapacity;
  rts?: RtsMeta;
}

export interface RtsMeta {
  mode: string;
  tick: number;
  total_ticks: number;
  phase: string;
  tick_interval_sec: number;
  seconds_until_next_tick: number;
  duration_minutes?: number;
  duration_preset?: string;
  transit?: { from_city?: string; to_city?: string; arrival_tick?: number } | null;
  can_trade?: boolean;
  vehicles_available?: Record<string, { name?: string; cost?: number; capacity_bonus?: number; speed_bonus?: number }>;
  world?: WorldTradeSlice;
}

export interface WorldTradeSlice {
  region_id?: string;
  geo_pack_version?: string;
  hub_cities?: string[];
  cities?: Array<{
    city_id: string;
    name: string;
    hub?: boolean;
    geo?: { lng: number; lat: number; label_offset?: number[] };
  }>;
  routes?: Array<{
    edge_id: string;
    from_city: string;
    to_city: string;
    base_travel_ticks: number;
    move_cost: number;
  }>;
  geo?: {
    bbox?: number[];
    assets?: Record<string, string>;
  };
}

export interface SubmitDecisionResponse {
  practice_advanced?: boolean;
  event_finished?: boolean;
  has_submitted_this_round?: boolean;
  can_submit_decision?: boolean;
  current_round?: TradingRound | null;
}

export interface MarketInsight {
  city: string;
  city_name: string;
  product_id: string;
  product_name: string;
  buy_qty: number;
  sell_qty: number;
  net_demand: number;
  pressure: number;
}

export interface StandingsEntry {
  rank: number;
  user_id: number;
  username: string;
  avatar?: string;
  cash: number;
  inventory_value: number;
  total_assets: number;
  current_city: string;
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
