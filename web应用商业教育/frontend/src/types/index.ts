// User types
export interface User {
  id: string;
  email: string;
  username: string;
  role: 'student' | 'teacher' | 'admin';
  avatar?: string;
  createdAt: string;
}

export interface Profile {
  userId: string;
  bio?: string;
  experience: number;
  level: number;
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Course types
export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  thumbnail?: string;
  category: string;
  tags: string[];
  lessons: Lesson[];
  instructor: string;
  rating: number;
  studentCount: number;
  createdAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: number;
  type: 'video' | 'text' | 'quiz';
  content?: string;
  videoUrl?: string;
}

// Order types
export interface Order {
  id: string;
  userId: string;
  courseId: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
}

// Wiki types
export interface WikiArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  parentId?: string;
  relatedIds: string[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WikiRelation {
  fromId: string;
  toId: string;
  relationType: string;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface KnowledgeNode {
  id: string;
  label: string;
  category: string;
  x?: number;
  y?: number;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  label?: string;
}

// Game types
export interface GameSession {
  id: string;
  name: string;
  status: 'waiting' | 'playing' | 'finished';
  gameType: string;
  config: GameConfig;
  createdBy: string;
  participants: GameParticipant[];
  currentRound: number;
  totalRounds: number;
  createdAt: string;
}

export interface GameConfig {
  gameType: string;
  maxPlayers: number;
  totalRounds: number;
  timePerRound: number;
  parameters: Record<string, any>;
}

export interface GameParticipant {
  userId: string;
  username: string;
  teamId?: string;
  teamName?: string;
  role?: string;
  isReady: boolean;
  score?: number;
}

export interface GameRound {
  roundNumber: number;
  status: 'waiting' | 'decision' | 'settled';
  decisions: Record<string, RoundDecision>;
  result?: RoundResult;
  startedAt?: string;
  endedAt?: string;
}

export interface RoundDecision {
  userId: string;
  teamId: string;
  allocations: Record<string, number>;
  timestamp: string;
}

export interface RoundResult {
  scores: Record<string, number>;
  rankings: string[];
  details: Record<string, any>;
}

// Wealth of Nations game types
export interface WorkshopState {
  id: string;
  day: number;
  workers: Worker[];
  divisions: Division[];
  inventory: number;
  cash: number;
  totalRevenue: number;
  totalCosts: number;
  marketPrice: number;
  marketDemand: number;
  capital: number;
}

export interface Worker {
  id: string;
  name: string;
  wage: number;
  divisionId?: string;
  productivity: number;
}

export interface Division {
  id: string;
  name: string;
  stage: number;
  efficiencyBonus: number;
  workerCount: number;
}

export interface WONGameAction {
  type: 'hire' | 'fire' | 'divide' | 'invest' | 'produce' | 'sell';
  payload: Record<string, any>;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
