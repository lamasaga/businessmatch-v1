export interface ApiResponse<T> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
}

export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  experience: number;
  level: number;
}

export interface AuthResponse {
  user: User;
  tokens: { access_token: string; refresh_token: string };
}

export interface OrganizerProfile {
  id: number;
  user_id: number;
  organization_name: string;
  contact_phone?: string;
  verified: boolean;
  total_events_hosted: number;
  total_participants: number;
}

export interface OrganizerStats {
  total_events_hosted: number;
  total_participants: number;
  active_events: number;
  finished_events: number;
}

export interface CompetitionEvent {
  id: number;
  room_code: string;
  title: string;
  description?: string;
  game_type?: string;
  game_config_id?: string;
  status: string;
  config: Record<string, unknown>;
  max_players: number;
  current_round: number;
  participant_count?: number;
  created_at: string;
}

export interface Participant {
  id: number;
  username: string;
  cash: number;
  total_assets: number;
  current_city: string;
  status: string;
  final_rank?: number;
}

export interface TradingRound {
  id: number;
  round_number: number;
  status: string;
}

export interface StandingsEntry {
  rank: number;
  user_id: number;
  username: string;
  total_assets: number;
  cash: number;
  current_city?: string;
  inventory_value?: number;
}

export interface OrganizerControl {
  event: CompetitionEvent;
  current_round: TradingRound | null;
  standings: StandingsEntry[];
  participants: Participant[];
  decisions_submitted: number;
}
