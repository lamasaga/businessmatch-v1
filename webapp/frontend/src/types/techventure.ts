export type RouteId = 'TECH' | 'USER' | 'BRAND' | 'PATHFINDER';
export type CityId = string;

export interface TvTeamState {
  team_id: number;
  team_name: string;
  product_name: string;
  route: RouteId;
  opened_cities: string[];
  tech: number;
  fit_by_city: Record<string, number>;
  show_by_city: Record<string, number>;
  budget: number;
  weighted_total: number;
  attention_total: number;
  last_rank: number | null;
}

export interface TvRound {
  id: number;
  round_no: number;
  status: 'pending' | 'open' | 'settled';
  event_id_r3: string;
  opened_at: string | null;
  settled_at: string | null;
}

export interface TvRouteConfig {
  label: string;
  tagline: string;
  brief: string;
  r_tech: number;
  r_fit: number;
  r_show: number;
  tech_invest_boost?: number;
  fit_t1?: number;
  fit_t2?: number;
  can_trigger_hot_pulse?: boolean;
  crowd_curve?: Record<string, number>;
}

export interface TvCityConfig {
  label: string;
  scale: number;
  eta_fit: number;
  eta_show: number;
  tau_tech: number;
  consumers: Record<string, number>;
}

export interface TvGameState {
  match_status: string;
  team: TvTeamState;
  rounds: TvRound[];
  current_round: TvRound | null;
  has_submitted: boolean;
  last_snapshot: Record<string, any> | null;
  routes: Record<string, TvRouteConfig>;
  cities: Record<string, TvCityConfig>;
  defaults: Record<string, any>;
}

export interface TvPollData {
  match_status: string;
  current_round: TvRound | null;
  has_submitted: boolean;
  budget: number;
  last_rank: number | null;
}

export interface TvSubmitPayload {
  route: RouteId;
  opened_cities: string[];
  invest_tech: number;
  invest_fit_by_city: Record<string, number>;
  invest_show_by_city: Record<string, number>;
  declaration: string;
}

export interface TvLeaderboardEntry {
  team_id: number;
  team_name: string;
  product_name: string;
  weighted_total: number;
  attention_total: number;
  last_rank: number | null;
  route: string;
}

export interface TvNewsItem {
  id: number;
  round_id: number;
  kind: string;
  headline: string;
  body: string;
  team_ids: number[];
}
