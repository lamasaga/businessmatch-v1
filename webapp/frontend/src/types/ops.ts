export type OpsCategory = 'electronics' | 'fast_moving' | 'home';
export type OpsSegment = 'geek' | 'pragmatic' | 'show';
export type OpsPhase =
  | 'positioning'
  | 'operation_round_1'
  | 'operation_round_2'
  | 'operation_round_3'
  | 'operation_round_4'
  | 'auction'
  | 'finished'
  | 'paused';

export interface OpsCityConfig {
  name: string;
  tier: number;
  market_size: number;
  opening_cost: number;
  geek_ratio: number;
  pragmatic_ratio: number;
  show_ratio: number;
}

export interface OpsCategoryConfig {
  name: string;
  base_material_cost: number;
  base_labor_cost: number;
  base_overhead: number;
  market_size_multiplier: number;
  base_price: number;
}

export interface OpsSegmentConfig {
  name: string;
  tech_weight: number;
  fit_weight: number;
  show_weight: number;
}

export interface OpsTeamState {
  team_id: number;
  team_name: string;
  product_name: string;
  category: OpsCategory | null;
  target_segment: OpsSegment | null;
  cash: number;
  inventory: number;
  cumulative_profit: number;
  net_assets: number;
  tech: number;
  fit: number;
  show: number;
  entered_cities: string[];
  factories: Record<string, any>[];
  ads: Record<string, any>[];
  discount_rate: number;
}

export interface OpsRound {
  id: number;
  round_number: number;
  status: 'pending' | 'open' | 'settled';
  opened_at: string | null;
  settled_at: string | null;
}

export interface OpsAuctionItemState {
  id: number;
  item_key: string;
  name: string;
  item_type: 'production' | 'advertising' | 'discount';
  base_price: number;
  current_price: number;
  leading_team_id: number | null;
  leading_team_name: string | null;
  status: string;
  effect: Record<string, any>;
}

export interface OpsSnapshot {
  result: Record<string, any>;
  financial_statements: {
    income_statement: Record<string, number>;
    balance_sheet: Record<string, number>;
  };
}

export interface OpsGameState {
  match_status: string;
  phase: OpsPhase;
  team: OpsTeamState;
  rounds: OpsRound[];
  current_round: OpsRound | null;
  has_submitted: boolean;
  last_snapshot: OpsSnapshot | null;
  auction_items: OpsAuctionItemState[];
  config: {
    product_categories: Record<string, OpsCategoryConfig>;
    consumer_segments: Record<string, OpsSegmentConfig>;
    cities: Record<string, OpsCityConfig>;
    defaults: Record<string, any>;
  };
}

export interface OpsPositioningPayload {
  product_name: string;
  category: OpsCategory;
  target_segment: OpsSegment;
}

export interface OpsDecisionPayload {
  production_quantity: number;
  unit_price: number;
  marketing_spend: number;
  rnd_spend: number;
  sales_force: number;
  target_cities: string[];
}

export interface OpsRankingEntry {
  team_id: number;
  team_name: string;
  net_assets: number;
  cumulative_profit: number;
  score: number;
  rank: number;
}
