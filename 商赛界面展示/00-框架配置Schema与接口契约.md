# 框架配置 Schema 与接口契约

> **文档定位**：为声明式商业模拟框架提供精确的类型定义、配置校验 Schema 和模块间接口契约，供前后端开发参考。
>
> **对应文档**：[00-解耦声明式商业模拟框架总览.md](./00-解耦声明式商业模拟框架总览.md)
>
> **最后更新**：2026-05-16

---

## 目录

1. [核心类型系统（TypeScript）](#一核心类型系统typescript)
2. [GameConfig JSON Schema](#二gameconfig-json-schema)
3. [状态树 Schema](#三状态树-schema)
4. [UI Schema 规范](#四ui-schema-规范)
5. [原子能力接口契约](#五原子能力接口契约)
6. [引擎 API 契约](#六引擎-api-契约)
7. [事件协议定义](#七事件协议定义)
8. [校验规则汇总](#八校验规则汇总)

---

## 一、核心类型系统（TypeScript）

### 1.1 基础类型

```typescript
// ==================== 标识符与元数据 ====================

type UUID = string;                    // UUID v4
type SemVer = string;                  // 语义化版本，如 "2.1.0"
type GameModeId = string;              // 赛制唯一标识，如 "turn_based_strategy"
type AtomId = string;                  // 原子能力标识，如 "budget_allocate"
type Locale = 'zh-CN' | 'en-US';       // 支持的语言

// ==================== 枚举类型 ====================

enum GameLifecycleState {
  CREATED = 'CREATED',
  SETUP = 'SETUP',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
  ARCHIVED = 'ARCHIVED',
}

enum AtomCategory {
  DECISION = 'decision',       // 决策类
  SETTLEMENT = 'settlement',   // 结算类
  SOCIAL = 'social',           // 社交类
  EVENT = 'event',             // 事件类
  SCORING = 'scoring',         // 评分类
}

enum DecisionPhaseStatus {
  PENDING = 'PENDING',         // 等待开始
  ACTIVE = 'ACTIVE',           // 进行中
  SUBMITTED = 'SUBMITTED',     // 已提交
  CLOSED = 'CLOSED',           // 已关闭
}

// ==================== 通用数据结构 ====================

interface TimeRange {
  start: number;                // Unix 时间戳（毫秒）
  end?: number;
  duration: number;             // 持续时间（秒）
}

interface Money {
  amount: number;
  currency: 'CNY' | 'USD' | 'VIRTUAL';
  unit?: 'yuan' | 'wan' | 'million';  // 显示单位
}

interface WeightedMetric {
  id: string;
  name: string;
  weight: number;               // 0.0 ~ 1.0，所有权重之和应为1
  source: string;               // 状态树中的数据路径
  normalize?: 'min_max' | 'z_score' | 'rank';  // 归一化方式
}
```

### 1.2 GameConfig 类型

```typescript
// ==================== 赛制配置根对象 ====================

interface GameConfig {
  id: GameModeId;
  version: SemVer;
  name: string;
  description?: string;
  
  engine_compat: {
    min_version: SemVer;
    max_version?: SemVer;
  };
  
  dependencies: {
    atoms: AtomDependency[];
  };
  
  target_audience: TargetAudience;
  capabilities: GameCapabilities;
  
  flow: GameFlow;
  atoms: Record<AtomId, AtomConfig>;
  ui: UISchema;
  events?: CustomEventDefinition[];
  hooks?: HookReference[];
  
  i18n?: Record<Locale, I18nBundle>;
}

interface AtomDependency {
  atom_id: AtomId;
  version: string;              // semver 范围，如 "^1.0.0"
}

interface TargetAudience {
  min_age: number;
  max_age: number;
  recommended_team_size: number[];  // 如 [4, 6, 8]
}

interface GameCapabilities {
  realtime: boolean;
  team_required: boolean;
  ai_opponent: boolean;
  spectator_mode: boolean;
  mobile_optimized: boolean;
}

// ==================== 流程定义 ====================

interface GameFlow {
  rounds: number | 'dynamic';   // 固定回合数或动态判定
  phases_per_round: PhaseDefinition[];
  intermission?: IntermissionConfig;
  realtime?: RealtimeConfig;
  termination?: TerminationCondition[];
}

interface PhaseDefinition {
  id: string;
  name: string;
  duration: number;             // 秒，0 表示无限制
  atoms: AtomId[];              // 该阶段激活的原子
  auto_advance?: boolean;       // 时间到是否自动推进
  sequential?: boolean;         // 是否顺序执行（true）或并行（false）
}

interface IntermissionConfig {
  duration: number;             // 秒
  auto_advance: boolean;
  show_settlement: boolean;     // 是否展示结算结果
}

interface RealtimeConfig {
  enabled: true;
  tick_interval: number;        // 毫秒
  decision_window: number;      // 秒
  auto_advance: boolean;
}

interface TerminationCondition {
  type: 'all_rounds_complete' | 'player_eliminated' | 'score_threshold' | 'time_limit' | 'custom';
  params?: Record<string, unknown>;
}
```

### 1.3 原子配置类型

```typescript
// ==================== 原子配置（各原子自定义） ====================

type AtomConfig =
  | BudgetAllocateConfig
  | RouteSelectConfig
  | CityOccupyConfig
  | SoftmaxShareConfig
  | LinearScoringConfig
  | SpyRevealConfig
  | AllianceFormConfig
  | RandomCrisisConfig
  | TimedPressureConfig
  | BidSealedConfig
  | BidAscendingConfig
  | VoteMajorityConfig
  | NegotiationSpaceConfig
  | CardDrawConfig
  | GenericAtomConfig;

// --- 预算分配原子 ---
interface BudgetAllocateConfig {
  initial_budget: number;
  budget_carry_rate?: number;   // 预算结转率
  budget_interest_rate?: number; // 预算利息
  dimensions: BudgetDimension[];
}

interface BudgetDimension {
  id: string;
  name: string;
  scope: 'global' | 'per_city' | 'per_player';
  min?: number;
  max: number;
  step?: number;
  default?: number;
}

// --- 路线选择原子 ---
interface RouteSelectConfig {
  options: RouteOption[];
  exclusive: boolean;           // 是否单选
  allow_change?: boolean;       // 是否允许后续变更
  change_penalty?: number;
}

interface RouteOption {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  bonus: Record<string, number>;
  tags?: string[];
}

// --- 城市占领原子 ---
interface CityOccupyConfig {
  cities: CityDefinition[];
  max_cities: number;
  min_cities?: number;
  exclusive?: boolean;          // 城市是否互斥（一家独占）
  adjacency_rule?: boolean;     // 是否要求相邻
}

interface CityDefinition {
  id: string;
  name: string;
  population?: number;
  geek_ratio?: number;
  show_ratio?: number;
  base_cost?: number;
  special_traits?: string[];
}

// --- Softmax份额计算原子 ---
interface SoftmaxShareConfig {
  temperature: number;          // >0，越大分布越均匀
  market_size_source: string;   // 状态树路径
  decay_factor?: number;        // 投资衰减因子
  minimum_share?: number;       // 最低保障份额
}

// --- 线性评分原子 ---
interface LinearScoringConfig {
  metrics: WeightedMetric[];
  tie_breaker?: 'random' | 'first_mover' | 'consistency';
}

// --- 间谍机制原子 ---
interface SpyRevealConfig {
  enabled: boolean;
  unlock_round: number;
  cost: number;
  max_per_round?: number;
  targets: 'all_opponents' | 'leading_team' | 'adjacent_teams';
  reveal: string[];             // 披露的信息项
  counter_spy_probability?: number;
}

// --- 联盟系统原子 ---
interface AllianceFormConfig {
  enabled: boolean;
  min_round: number;
  max_allies: number;
  shared_attribute: string;
  synergy_bonus?: number;
  betrayal_enabled: boolean;
  betrayal_penalty?: number;
  betrayal_detection_round?: number;
}

// --- 密封投标原子 ---
interface BidSealedConfig {
  items: AuctionItem[];
  reserve_price?: number;
  winner_rule: 'highest' | 'second_price' | 'all_pay';
  reveal_timing: 'immediately' | 'round_end' | 'game_end';
}

interface AuctionItem {
  id: string;
  name: string;
  base_value: number;
  quantity?: number;
}

// --- 随机危机原子 ---
interface RandomCrisisConfig {
  event_pool: CrisisEvent[];
  trigger_mode: 'per_tick' | 'per_round' | 'probability_gate';
  probability?: number;
  max_per_game?: number;
}

interface CrisisEvent {
  id: string;
  name: string;
  description: string;
  probability_weight: number;
  effects: CrisisEffect[];
}

interface CrisisEffect {
  target: string;               // 状态树路径
  operation: 'multiply' | 'add' | 'set';
  value: number;
}

// --- 通用原子配置（兜底） ---
interface GenericAtomConfig {
  [key: string]: unknown;
}
```

### 1.4 UI Schema 类型

```typescript
// ==================== UI Schema 类型系统 ====================

interface UISchema {
  version: '2.0';
  layout: LayoutType;
  theme?: UITheme;
  regions: Record<string, UIRegion>;
  responsive?: ResponsiveConfig;
}

type LayoutType = 'single_column' | 'two_column' | 'three_column' | 'tabs' | 'accordion' | 'custom';

interface UIRegion {
  title?: string;
  title_i18n_key?: string;
  components: UIComponent[];
  hidden?: string;              // 条件表达式
}

interface UIComponent {
  id?: string;
  type: ComponentType;
  data_source?: string;         // 状态树路径
  config?: Record<string, unknown>;
  display?: DisplayConfig;
  conditional?: string;         // 显示条件
  children?: UIComponent[];     // 复合组件
}

type ComponentType =
  // 布局
  | 'composite'
  // 数据展示
  | 'info_card' | 'currency_display' | 'rank_badge' | 'progress_bar'
  | 'data_table' | 'chart_line' | 'chart_pie' | 'chart_bar'
  // 输入
  | 'slider' | 'slider_group' | 'number_input' | 'select' | 'multi_select'
  | 'button' | 'action_group' | 'text_input' | 'textarea'
  // 游戏专用
  | 'round_indicator' | 'city_list' | 'city_map' | 'spy_panel'
  | 'market_feed' | 'rank_prediction' | 'timer_countdown'
  | 'negotiation_table' | 'order_book' | 'card_drawer' | 'chat_panel'
  // 容器
  | 'accordion_panel' | 'tab_panel' | 'modal' | 'popover';

interface DisplayConfig {
  icon?: string;
  color?: string;
  font?: 'sans' | 'mono' | 'serif';
  font_size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  prefix?: string;
  suffix?: string;
  decimals?: number;
  unit?: string;
  highlight?: boolean;
  animate?: boolean;
  [key: string]: unknown;
}

interface ResponsiveConfig {
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
  layout_adapters: Record<string, string>;
}
```

### 1.5 状态树类型

```typescript
// ==================== 运行时状态树 ====================

interface GameState {
  meta: GameMeta;
  config_snapshot: GameConfig;      // 对局创建时的配置快照
  lifecycle: LifecycleState;
  players: PlayerState[];
  teams: TeamState[];
  market?: MarketState;
  social?: SocialState;
  events: EventState;
  computed: ComputedState;
  history?: StateSnapshot[];        // 历史状态（可选，用于快速回溯）
}

interface GameMeta {
  game_id: UUID;
  mode_id: GameModeId;
  mode_version: SemVer;
  created_at: number;
  started_at?: number;
  finished_at?: number;
  host_id: UUID;                    // 创建者（教师）
  class_id?: UUID;
}

interface LifecycleState {
  current_state: GameLifecycleState;
  current_sub_state?: string;
  round: number;
  total_rounds: number;
  phase: string;
  phase_status: DecisionPhaseStatus;
  phase_deadline?: number;          // 阶段截止时间戳
}

interface PlayerState {
  player_id: UUID;
  team_id?: string;
  user_id: UUID;
  status: 'ACTIVE' | 'DISCONNECTED' | 'ELIMINATED' | 'SPECTATOR';
  connected_at: number;
  last_activity: number;
  profile_snapshot: UserProfileSnapshot;
}

interface UserProfileSnapshot {
  nickname: string;
  avatar?: string;
  level?: number;
  badges?: string[];
}

interface TeamState {
  team_id: string;
  name: string;
  members: UUID[];
  route?: string;
  cities?: string[];
  budget?: BudgetState;
  investments?: Record<string, number | Record<string, number>>;
  score?: number;
  rank?: number;
  history?: RoundHistory[];
  custom_data?: Record<string, unknown>;  // 赛制自定义数据
}

interface BudgetState {
  total: number;
  used: number;
  remaining: number;
  allocations?: Record<string, number>;
}

interface RoundHistory {
  round: number;
  state_snapshot: Partial<TeamState>;
  decision: Record<string, unknown>;
  settlement: SettlementEntry;
}

interface SettlementEntry {
  score_change: number;
  rank_change: number;
  events_triggered: string[];
  notes?: string[];
}

interface MarketState {
  cities?: CityMarketState[];
  global_indicators?: Record<string, number>;
  trends?: MarketTrend[];
}

interface CityMarketState {
  city_id: string;
  total_invest_tech: number;
  total_invest_fit: number;
  total_invest_show: number;
  demand_index?: number;
  supply_index?: number;
  price_index?: number;
}

interface MarketTrend {
  indicator: string;
  values: number[];                 // 最近N个回合的值
  direction: 'up' | 'down' | 'stable';
}

interface SocialState {
  alliances?: AllianceState[];
  spy_logs?: SpyLogEntry[];
  messages?: MessageEntry[];
  negotiations?: NegotiationState[];
}

interface AllianceState {
  id: string;
  members: string[];                // team_id 列表
  formed_at_round: number;
  shared_attribute: string;
  status: 'ACTIVE' | 'BROKEN';
  broken_at_round?: number;
  betrayed_by?: string;
}

interface SpyLogEntry {
  round: number;
  phase: string;
  source: string;                   // team_id
  target: string;                   // team_id
  cost: number;
  revealed: string[];
  timestamp: number;
}

interface MessageEntry {
  id: string;
  sender: string;
  channel: 'global' | 'team' | 'alliance' | 'private';
  recipients?: string[];
  content: string;
  timestamp: number;
}

interface NegotiationState {
  id: string;
  participants: string[];
  topic: string;
  status: 'PENDING' | 'ACTIVE' | 'AGREED' | 'REJECTED' | 'EXPIRED';
  offers: Record<string, unknown>;
  deadline?: number;
}

interface EventState {
  pending: GameEvent[];
  history: GameEvent[];
}

interface GameEvent {
  id: string;
  type: string;
  timestamp: number;
  round: number;
  phase: string;
  payload: Record<string, unknown>;
  handled: boolean;
}

interface ComputedState {
  rankings: RankingEntry[];
  predictions?: PredictionEntry[];
  analytics?: AnalyticsData;
}

interface RankingEntry {
  rank: number;
  team_id: string;
  score: number;
  previous_rank?: number;
  trend?: 'up' | 'down' | 'stable';
}

interface PredictionEntry {
  team_id: string;
  predicted_rank: number;
  confidence: number;               // 0.0 ~ 1.0
  factors: Record<string, number>;
}

interface AnalyticsData {
  market_concentration?: number;    // 市场集中度（HHI）
  decision_entropy?: number;        // 决策多样性
  alliance_stability?: number;
}

interface StateSnapshot {
  snapshot_id: string;
  timestamp: number;
  round: number;
  phase: string;
  state_hash: string;               // 状态树哈希
  state_data: GameState;            // 完整状态（或增量引用）
}
```

---

## 二、GameConfig JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://cybercore.bizsim/game-config.schema.json",
  "title": "GameConfig",
  "type": "object",
  "required": ["id", "version", "name", "engine_compat", "dependencies", "target_audience", "capabilities", "flow", "atoms", "ui"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9_]*$",
      "description": "赛制唯一标识，小写字母开头，可含数字和下划线"
    },
    "version": {
      "type": "string",
      "pattern": "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-([a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*))?(?:\\+([a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*))?$"      "description": "语义化版本号"
    },
    "name": { "type": "string", "minLength": 1, "maxLength": 100 },
    "description": { "type": "string", "maxLength": 500 },
    "engine_compat": {
      "type": "object",
      "required": ["min_version"],
      "properties": {
        "min_version": { "type": "string", "pattern": "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$" },
        "max_version": { "type": "string", "pattern": "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$" }
      }
    },
    "dependencies": {
      "type": "object",
      "required": ["atoms"],
      "properties": {
        "atoms": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["atom_id", "version"],
            "properties": {
              "atom_id": { "type": "string", "pattern": "^[a-z][a-z0-9_]*$" },
              "version": { "type": "string", "pattern": "^[\\^~]?[0-9]+\\.[0-9]+(\\.[0-9]+)?$" }
            }
          }
        }
      }
    },
    "target_audience": {
      "type": "object",
      "required": ["min_age", "max_age", "recommended_team_size"],
      "properties": {
        "min_age": { "type": "integer", "minimum": 6, "maximum": 100 },
        "max_age": { "type": "integer", "minimum": 6, "maximum": 100 },
        "recommended_team_size": {
          "type": "array",
          "items": { "type": "integer", "minimum": 1 },
          "minItems": 1
        }
      }
    },
    "capabilities": {
      "type": "object",
      "required": ["realtime", "team_required", "ai_opponent", "spectator_mode"],
      "properties": {
        "realtime": { "type": "boolean" },
        "team_required": { "type": "boolean" },
        "ai_opponent": { "type": "boolean" },
        "spectator_mode": { "type": "boolean" },
        "mobile_optimized": { "type": "boolean" }
      }
    },
    "flow": {
      "type": "object",
      "required": ["rounds", "phases_per_round"],
      "properties": {
        "rounds": {
          "oneOf": [
            { "type": "integer", "minimum": 1 },
            { "type": "string", "enum": ["dynamic"] }
          ]
        },
        "phases_per_round": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["id", "name", "duration", "atoms"],
            "properties": {
              "id": { "type": "string", "pattern": "^[a-z][a-z0-9_]*$" },
              "name": { "type": "string" },
              "duration": { "type": "integer", "minimum": 0 },
              "atoms": {
                "type": "array",
                "items": { "type": "string" }
              },
              "auto_advance": { "type": "boolean" },
              "sequential": { "type": "boolean" }
            }
          },
          "minItems": 1
        },
        "intermission": {
          "type": "object",
          "properties": {
            "duration": { "type": "integer", "minimum": 0 },
            "auto_advance": { "type": "boolean" },
            "show_settlement": { "type": "boolean" }
          }
        },
        "realtime": {
          "type": "object",
          "properties": {
            "enabled": { "type": "boolean" },
            "tick_interval": { "type": "integer", "minimum": 100 },
            "decision_window": { "type": "integer", "minimum": 1 },
            "auto_advance": { "type": "boolean" }
          }
        },
        "termination": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["type"],
            "properties": {
              "type": {
                "type": "string",
                "enum": ["all_rounds_complete", "player_eliminated", "score_threshold", "time_limit", "custom"]
              },
              "params": { "type": "object" }
            }
          }
        }
      }
    },
    "atoms": {
      "type": "object",
      "description": "原子配置映射，key为atom_id",
      "additionalProperties": { "type": "object" }
    },
    "ui": {
      "$ref": "#/definitions/ui_schema"
    },
    "events": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "description": { "type": "string" },
          "trigger": { "type": "string" },
          "effects": { "type": "array" }
        }
      }
    },
    "hooks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["hook_point", "file"],
        "properties": {
          "hook_point": {
            "type": "string",
            "enum": ["onBeforeRound", "onAfterSettlement", "onPlayerDecision", "onStateChange", "onGameFinish"]
          },
          "file": { "type": "string" }
        }
      }
    }
  },
  "definitions": {
    "ui_schema": {
      "type": "object",
      "required": ["version", "layout", "regions"],
      "properties": {
        "version": { "type": "string", "enum": ["2.0"] },
        "layout": {
          "type": "string",
          "enum": ["single_column", "two_column", "three_column", "tabs", "accordion", "custom"]
        },
        "theme": {
          "type": "object",
          "properties": {
            "primary_color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
            "secondary_color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
            "background": { "type": "string" },
            "font_family": { "type": "string" }
          }
        },
        "regions": {
          "type": "object",
          "additionalProperties": {
            "type": "object",
            "required": ["components"],
            "properties": {
              "title": { "type": "string" },
              "title_i18n_key": { "type": "string" },
              "hidden": { "type": "string" },
              "components": {
                "type": "array",
                "items": { "$ref": "#/definitions/ui_component" }
              }
            }
          }
        },
        "responsive": {
          "type": "object",
          "properties": {
            "breakpoints": {
              "type": "object",
              "properties": {
                "mobile": { "type": "string" },
                "tablet": { "type": "string" },
                "desktop": { "type": "string" }
              }
            },
            "layout_adapters": {
              "type": "object",
              "additionalProperties": { "type": "string" }
            }
          }
        }
      }
    },
    "ui_component": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "id": { "type": "string" },
        "type": {
          "type": "string",
          "enum": [
            "composite", "info_card", "currency_display", "rank_badge", "progress_bar",
            "data_table", "chart_line", "chart_pie", "chart_bar",
            "slider", "slider_group", "number_input", "select", "multi_select",
            "button", "action_group", "text_input", "textarea",
            "round_indicator", "city_list", "city_map", "spy_panel",
            "market_feed", "rank_prediction", "timer_countdown",
            "negotiation_table", "order_book", "card_drawer", "chat_panel",
            "accordion_panel", "tab_panel", "modal", "popover"
          ]
        },
        "data_source": { "type": "string" },
        "config": { "type": "object" },
        "display": {
          "type": "object",
          "properties": {
            "icon": { "type": "string" },
            "color": { "type": "string" },
            "font": { "type": "string", "enum": ["sans", "mono", "serif"] },
            "font_size": { "type": "string", "enum": ["xs", "sm", "base", "lg", "xl", "2xl", "3xl"] },
            "prefix": { "type": "string" },
            "suffix": { "type": "string" },
            "decimals": { "type": "integer", "minimum": 0 },
            "unit": { "type": "string" },
            "highlight": { "type": "boolean" },
            "animate": { "type": "boolean" }
          }
        },
        "conditional": { "type": "string" },
        "children": {
          "type": "array",
          "items": { "$ref": "#/definitions/ui_component" }
        }
      }
    }
  }
}
```

---

## 三、状态树 Schema

### 3.1 状态树校验规则

| 路径 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `meta.game_id` | UUID | 是 | 全局唯一 |
| `meta.mode_id` | string | 是 | 已注册的赛制ID |
| `meta.mode_version` | SemVer | 是 | 与引擎兼容 |
| `lifecycle.current_state` | enum | 是 | 必须在状态机定义内 |
| `lifecycle.round` | integer | 是 | >= 0 |
| `players` | array | 是 | length >= 1 |
| `players[].player_id` | UUID | 是 | 唯一 |
| `players[].status` | enum | 是 | ACTIVE/DISCONNECTED/ELIMINATED |
| `teams` | array | 是 | length >= 1 |
| `teams[].team_id` | string | 是 | 唯一 |
| `teams[].members` | array | 是 | length >= 1 |
| `computed.rankings` | array | 是 | 排名连续（1,2,3...无跳跃） |

### 3.2 状态不变性约束

```
约束1: 状态树一旦创建，任何修改必须产生新对象（不可变更新）
约束2: 结算计算不得修改输入状态，必须返回新状态
约束3: 历史快照中的状态必须与当时的实际状态一致（通过哈希校验）
约束4: 玩家决策一旦提交不可修改（可在提交前撤回）
约束5: 联盟状态变更必须通过事件广播，不得静默修改
```

---

## 四、UI Schema 规范

### 4.1 数据绑定语法

```yaml
# 简单路径绑定
data_source: "teams[my_team].score"

# 条件表达式（用于 conditional）
conditional: "lifecycle.round >= 3"
conditional: "teams[my_team].budget.remaining > 0"
conditional: "social.alliances.length > 0"

# 聚合绑定
data_source: "computed.rankings[0].team_id"   # 第一名队伍
```

### 4.2 组件配置速查

| 组件 | 必需 config | 常用 display | 数据类型 |
|------|------------|-------------|----------|
| `slider` | `min`, `max`, `step` | `color`, `prefix` | number |
| `slider_group` | `sliders[]`, `budget_source` | `warning_threshold` | object |
| `currency_display` | - | `prefix`, `decimals`, `unit`, `font` | number |
| `rank_badge` | - | `highlight_top3` | integer |
| `round_indicator` | `total_rounds` | `completed_color`, `current_color` | integer |
| `progress_bar` | - | `color`, `warning_threshold` | number (0-1) |
| `data_table` | `columns[]` | `striped`, `hover` | array |
| `chart_line` | `x_axis`, `y_axis` | `color` | array |
| `spy_panel` | `cost`, `enabled_round` | `gradient` | object |
| `timer_countdown` | `deadline` | `color`, `warning_at` | number |

### 4.3 布局模板参数

```yaml
# three_column 布局
layout: "three_column"
regions:
  left:        # 左侧栏，默认宽度 25%
  center:      # 中间栏，默认宽度 50%
  right:       # 右侧栏，默认宽度 25%

# two_column 布局
layout: "two_column"
regions:
  main:        # 主区域，默认宽度 70%
  sidebar:     # 侧边栏，默认宽度 30%

# tabs 布局
layout: "tabs"
regions:
  tab1:        # 每个 region 对应一个 tab
  tab2:
  tab3:
```

---

## 五、原子能力接口契约

### 5.1 原子执行上下文

```typescript
interface AtomContext {
  // 输入
  config: AtomConfig;                // 该原子的配置
  gameConfig: GameConfig;            // 完整赛制配置
  currentState: GameState;           // 当前状态树
  decisions: PlayerDecision[];       // 当前决策
  round: number;
  phase: string;
  
  // 工具
  random: SeededRandom;              // 种子化随机数生成器
  logger: Logger;
  
  // 辅助数据
  customData: Record<string, unknown>; // 该原子持久化的自定义数据
}

interface AtomResult {
  // 状态变更（增量）
  statePatches: StatePatch[];
  
  // 触发的事件
  events: GameEvent[];
  
  // 计算日志
  logs: ComputationLog[];
  
  // 是否阻断流程
  block?: boolean;
  blockReason?: string;
}

interface StatePatch {
  op: 'add' | 'remove' | 'replace' | 'move';
  path: string;                      // JSON Pointer 格式
  value?: unknown;
}

interface SeededRandom {
  random(): number;                  // [0, 1)
  randomInt(min: number, max: number): number;
  shuffle<T>(array: T[]): T[];
  choice<T>(array: T[]): T;
}
```

### 5.2 原子注册表接口

```typescript
interface AtomRegistry {
  // 注册原子
  register(atom: CapabilityAtom): void;
  
  // 获取原子
  get(atomId: AtomId): CapabilityAtom;
  
  // 检查原子是否存在
  has(atomId: AtomId): boolean;
  
  // 列出某分类的所有原子
  listByCategory(category: AtomCategory): CapabilityAtom[];
  
  // 校验配置是否合法
  validateConfig(atomId: AtomId, config: unknown): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  path: string;
  message: string;
  code: string;
}
```

---

## 六、引擎 API 契约

### 6.1 游戏生命周期 API

```typescript
// ==================== 游戏管理 ====================

interface GameManager {
  // 创建对局
  createGame(config: CreateGameRequest): Promise<GameCreatedResponse>;
  
  // 开始游戏
  startGame(gameId: UUID): Promise<GameState>;
  
  // 暂停/恢复
  pauseGame(gameId: UUID, reason: string): Promise<GameState>;
  resumeGame(gameId: UUID): Promise<GameState>;
  
  // 强制结束
  forceEndGame(gameId: UUID, reason: string): Promise<GameState>;
  
  // 获取状态
  getState(gameId: UUID): Promise<GameState>;
  
  // 获取快照
  getSnapshot(gameId: UUID, round?: number): Promise<StateSnapshot>;
  
  // 重放
  replay(gameId: UUID, fromRound?: number): AsyncGenerator<GameState>;
}

interface CreateGameRequest {
  mode_id: GameModeId;
  mode_version?: SemVer;
  host_id: UUID;
  class_id?: UUID;
  config_override?: Partial<GameConfig>;  // 教师自定义参数
  players?: UUID[];
  scheduled_start?: number;
}

interface GameCreatedResponse {
  game_id: UUID;
  invite_code: string;
  state: GameState;
}

// ==================== 玩家操作 ====================

interface PlayerOperations {
  // 加入游戏
  joinGame(gameId: UUID, playerId: UUID, teamId?: string): Promise<PlayerState>;
  
  // 准备就绪
  readyUp(gameId: UUID, playerId: UUID): Promise<void>;
  
  // 提交决策
  submitDecision(
    gameId: UUID,
    playerId: UUID,
    phaseId: string,
    decision: PlayerDecision
  ): Promise<DecisionSubmittedResponse>;
  
  // 撤回决策（在阶段截止前）
  withdrawDecision(gameId: UUID, playerId: UUID, phaseId: string): Promise<void>;
  
  // 获取当前可决策项
  getDecisionSchema(gameId: UUID, playerId: UUID): Promise<DecisionSchema>;
}

interface PlayerDecision {
  phase_id: string;
  round: number;
  timestamp: number;
  data: Record<string, unknown>;
  signature?: string;            // 防篡改签名
}

interface DecisionSubmittedResponse {
  accepted: boolean;
  confirmation_id: string;
  estimated_settlement_time?: number;
}

interface DecisionSchema {
  phase_id: string;
  round: number;
  deadline: number;
  fields: DecisionField[];
}

interface DecisionField {
  id: string;
  type: 'slider' | 'number' | 'select' | 'multi_select' | 'text' | 'boolean';
  label: string;
  required: boolean;
  constraints?: FieldConstraints;
  default_value?: unknown;
  help_text?: string;
}

interface FieldConstraints {
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{label: string; value: unknown}>;
  pattern?: string;
  max_length?: number;
}

// ==================== 社交操作 ====================

interface SocialOperations {
  // 发送消息
  sendMessage(gameId: UUID, message: MessageRequest): Promise<MessageEntry>;
  
  // 发起联盟
  proposeAlliance(gameId: UUID, proposerTeamId: string, targetTeamId: string, terms: AllianceTerms): Promise<AllianceProposal>;
  
  // 响应联盟
  respondToAlliance(gameId: UUID, proposalId: string, accept: boolean): Promise<AllianceState>;
  
  // 背叛联盟
  betrayAlliance(gameId: UUID, teamId: string, allianceId: string): Promise<AllianceState>;
  
  // 使用间谍
  useSpy(gameId: UUID, teamId: string, targetTeamId: string): Promise<SpyResult>;
}

interface MessageRequest {
  channel: 'global' | 'team' | 'alliance' | 'private';
  content: string;
  recipients?: string[];
}

interface AllianceTerms {
  shared_attribute: string;
  duration_rounds?: number;
  exclusivity?: boolean;
}

interface AllianceProposal {
  proposal_id: string;
  proposer: string;
  target: string;
  terms: AllianceTerms;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  expires_at: number;
}

interface SpyResult {
  success: boolean;
  cost: number;
  revealed_data?: Record<string, unknown>;
  detected?: boolean;
}
```

### 6.2 实时推送接口（WebSocket）

```typescript
// 客户端订阅的事件流
interface GameEventStream {
  // 连接建立
  connect(gameId: UUID, playerId: UUID, token: string): WebSocket;
  
  // 订阅频道
  subscribe(channel: string): void;
  
  // 接收消息
  onMessage(callback: (event: PushEvent) => void): void;
}

interface PushEvent {
  type: PushEventType;
  timestamp: number;
  game_id: UUID;
  payload: unknown;
}

type PushEventType =
  | 'STATE_UPDATE'           // 状态更新（增量）
  | 'PHASE_CHANGE'           // 阶段变更
  | 'ROUND_ADVANCE'          // 回合推进
  | 'DECISION_RECEIVED'      // 有玩家提交决策
  | 'SETTLEMENT_COMPLETED'   // 结算完成
  | 'PLAYER_JOINED'          // 玩家加入
  | 'PLAYER_LEFT'            // 玩家离开
  | 'CHAT_MESSAGE'           // 聊天消息
  | 'ALLIANCE_EVENT'         // 联盟事件
  | 'SPY_EVENT'              // 间谍事件
  | 'CRISIS_EVENT'           // 危机事件
  | 'GAME_FINISHED'          // 游戏结束
  | 'ERROR';                 // 错误通知
```

---

## 七、事件协议定义

### 7.1 核心事件规范

| 事件类型 | 触发时机 | payload | 广播范围 |
|----------|----------|---------|----------|
| `GAME_CREATED` | 对局创建 | `{game_id, mode_id, host_id}` | 仅创建者 |
| `PLAYER_JOINED` | 玩家加入 | `{player_id, team_id, nickname}` | 全房间 |
| `PLAYER_READY` | 玩家准备 | `{player_id}` | 全房间 |
| `GAME_STARTED` | 游戏开始 | `{started_at, first_phase}` | 全房间 |
| `PHASE_STARTED` | 阶段开始 | `{round, phase_id, deadline}` | 全房间 |
| `DECISION_SUBMITTED` | 决策提交 | `{player_id, phase_id, timestamp}` | 全房间（匿名化） |
| `PHASE_ENDED` | 阶段结束 | `{round, phase_id, submissions_count}` | 全房间 |
| `SETTLEMENT_STARTED` | 结算开始 | `{round}` | 全房间 |
| `SETTLEMENT_COMPLETED` | 结算完成 | `{round, results_preview}` | 全房间 |
| `ROUND_ENDED` | 回合结束 | `{round, rankings}` | 全房间 |
| `GAME_PAUSED` | 游戏暂停 | `{reason, paused_by}` | 全房间 |
| `GAME_RESUMED` | 游戏恢复 | `{resumed_by}` | 全房间 |
| `GAME_FINISHED` | 游戏结束 | `{final_rankings, achievements}` | 全房间 |

### 7.2 自定义事件规范

```yaml
# 赛制自定义事件必须在 GameConfig 中声明
custom_events:
  - id: "SPY_USED"
    name: "间谍使用"
    trigger: "atom:spy_reveal.execute"
    payload_schema:
      type: object
      properties:
        source_team: { type: string }
        target_team: { type: string }
        cost: { type: number }
        revealed_fields: { type: array }
    broadcast_scope: "source_team_only"   # 间谍行为只对使用者可见
    
  - id: "ALLIANCE_FORMED"
    name: "联盟建立"
    trigger: "atom:alliance_form.execute"
    payload_schema:
      type: object
      properties:
        alliance_id: { type: string }
        members: { type: array }
        shared_attribute: { type: string }
    broadcast_scope: "all"               # 联盟建立所有人可见
    
  - id: "ALLIANCE_BETRAYED"
    name: "联盟背叛"
    trigger: "atom:alliance_form.betray"
    payload_schema:
      type: object
      properties:
        alliance_id: { type: string }
        betrayed_by: { type: string }
        penalty: { type: number }
    broadcast_scope: "all"               # 背叛行为所有人可见
```

### 7.3 事件持久化格式

```typescript
interface PersistedEvent {
  event_id: UUID;
  game_id: UUID;
  sequence_number: number;       // 严格递增，用于重放排序
  type: string;
  timestamp: number;
  round: number;
  phase: string;
  payload: Record<string, unknown>;
  
  // 完整性校验
  prev_hash: string;             // 前一个事件的哈希
  hash: string;                  // 本事件的哈希（包含 prev_hash）
}
```

---

## 八、校验规则汇总

### 8.1 配置校验清单

```
□ package.json 格式正确
□ id 符合命名规范（小写字母开头）
□ version 为有效 SemVer
□ engine_compat.min_version <= engine 当前版本
□ 所有依赖的原子在原子市场中存在
□ 所有原子的 config 通过对应 configSchema 校验
□ flow.phases_per_round 非空
□ flow.phases_per_round[*].atoms 中的 atom_id 在 atoms 配置中有定义
□ ui.layout 为有效值
□ ui.regions 非空
□ ui 中引用的所有组件 type 在标准组件注册表中
□ data_source 路径语法有效（可选：运行时校验存在性）
□ conditional 表达式语法有效
□ i18n 包含至少一种语言
□ 所有文案 key 在 i18n 中有定义
```

### 8.2 运行时校验清单

```
□ 对局创建时 config_snapshot 深度克隆
□ 玩家数量在 min_players 和 max_players 之间
□ 决策提交在对应阶段内
□ 决策数据通过 decision_schema 校验
□ 预算分配不超过总额
□ 联盟成员数不超过 max_allies
□ 间谍使用在 unlock_round 之后
□ 结算计算不使用非种子化随机
□ 结算结果不修改输入状态
□ 状态更新产生新对象（不可变性校验）
□ 事件序列号连续无跳跃
□ 快照哈希与状态内容匹配
```

### 8.3 性能约束

| 指标 | 约束值 | 说明 |
|------|--------|------|
| 配置校验耗时 | < 100ms | 注册时一次性 |
| 运行时构建耗时 | < 200ms | 对局创建时 |
| 结算计算耗时 | < 500ms | 单局单回合 |
| 状态序列化耗时 | < 50ms | 快照时 |
| 事件广播延迟 | < 100ms | P99 |
| 前端首屏渲染 | < 1s | 从获取 UI Schema 到可交互 |

---

## 附录

### A. 错误码定义

| 错误码 | 含义 | HTTP 状态 | 场景 |
|--------|------|-----------|------|
| `GAME_NOT_FOUND` | 对局不存在 | 404 | 查询/操作不存在的对局 |
| `GAME_ALREADY_STARTED` | 对局已开始 | 409 | 尝试修改已开始对局的配置 |
| `PHASE_NOT_ACTIVE` | 阶段未激活 | 400 | 在非当前阶段提交决策 |
| `DECISION_INVALID` | 决策无效 | 400 | 决策数据未通过校验 |
| `BUDGET_EXCEEDED` | 预算超支 | 400 | 分配总额超过预算 |
| `SPY_NOT_AVAILABLE` | 间谍不可用 | 400 | 未解锁或已用完次数 |
| `ALLIANCE_LIMIT_REACHED` | 联盟人数超限 | 400 | 超过 max_allies |
| `ATOM_NOT_FOUND` | 原子不存在 | 500 | 依赖的原子未加载 |
| `CONFIG_INVALID` | 配置无效 | 400 | 注册时校验失败 |
| `STATE_CORRUPTED` | 状态损坏 | 500 | 状态哈希校验失败 |

### B. 版本兼容性矩阵

| 引擎版本 | 支持配置版本 | 备注 |
|----------|-------------|------|
| 2.0.x | 2.0 | 初始版本 |
| 2.1.x | 2.0, 2.1 | 新增实时模式支持 |
| 3.0.x | 2.0, 2.1, 3.0 | 可能有不兼容变更 |

---

*文档版本：v1.0 | 框架版本：CyberCore 2.0 | 最后更新：2026-05-16*
