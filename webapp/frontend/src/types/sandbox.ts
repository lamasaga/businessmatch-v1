// ==================== 赛事工坊（Sandbox）类型 ====================

export interface SandboxTemplate {
  id: string;
  engine: string;
  design_mode: string;
  name: string;
}

export interface SandboxSessionSummary {
  session_id: string;
  config_id: string | null;
  engine: string;
  run_state: 'idle' | 'running' | 'paused' | 'finished';
  current_step: number;
  total_steps: number;
  step_label: string;
  created_at: string;
  updated_at: string;
}

export interface SandboxWorldState {
  mode?: string;
  phase?: string;
  current_step?: number;
  prices?: Record<string, Record<string, number>>;
  cities_order?: string[];
  products?: string[];
  participants_count?: number;
  player?: {
    name: string;
    cash: number;
    total_assets: number;
    city: string;
  } | null;
  standings?: SandboxStanding[];
  history_length?: number;
}

export interface SandboxStanding {
  rank: number;
  name: string;
  is_ai: boolean;
  cash: number;
  total_assets: number;
  city: string;
}

export interface DebugLog {
  index: number;
  step_type: string;
  step_number: number;
  timestamp: string;
  data: Record<string, any>;
}

export interface DebugSummary {
  total_logs: number;
  by_type: Record<string, number>;
}

export interface StepResult {
  step: number;
  tick?: number;
  phase?: string;
  prices: Record<string, Record<string, number>>;
  events: any[];
  standings: SandboxStanding[];
  finished: boolean;
}

export interface AiDecisionLog {
  ai_name: string;
  ai_level: string;
  strategy_name?: string;
  strategy_type?: string;
  decision: {
    action: string;
    product_id?: string;
    quantity?: number;
    target_city?: string;
  };
  reasoning: string;
  city: string;
  cash: number;
  inventory: Record<string, number>;
  expected_profit: number;
  confidence: number;
}
