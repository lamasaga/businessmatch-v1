# 97 - 商赛设计引擎架构 PRD（CDE · Competition Design Engine）

> **文档定位**：定义从「单一赛制实现」跃迁到「元引擎 + 可视化编排 + AI 辅助设计」的完整架构。CDE 是 CyberCore 的上层抽象，目标让教师/教研无需写代码即可设计、测试、发布商业赛事。  
> **对齐**：[89-赛事工坊实现说明与使用指南](./89-赛事工坊实现说明与使用指南.md) · [87-商赛机制设计沙盒蓝图](./87-商赛机制设计沙盒蓝图.md) · [docs/archive/b/00-解耦声明式商业模拟框架总览](../docs/archive/b商赛界面展示/00-解耦声明式商业模拟框架总览.md) · `CyberCore` · `game-configs`  
> **状态**：[过程] · 架构蓝图，待评审后进入详细子系统 PRD  
> **最后更新**：2026-06-02

---

## 目录

1. [产品目标与定位](#一产品目标与定位)
2. [总体架构：四层模型](#二总体架构四层模型)
3. [Layer 2 核心：Formula VM（公式虚拟机）](#三layer-2-核心formula-vm公式虚拟机)
4. [Layer 2 核心：CitySim Protocol（城市模拟协议）](#四layer-2-核心citysim-protocol城市模拟协议)
5. [Layer 2 核心：Asset Pipeline（资产管线）](#五layer-2-核心asset-pipeline资产管线)
6. [Layer 2 核心：AI Opponent Runtime（AI 对手运行时）](#六layer-2-核心ai-opponent-runtimeai-对手运行时)
7. [Layer 3：Visual Orchestrator（可视化编排器）](#七layer-3visual-orchestrator可视化编排器)
8. [Layer 4：AI Design Assistant（AI 设计助手）](#八layer-4ai-design-assistantai-设计助手)
9. [赛事本体 Schema](#九赛事本体-schema)
10. [三层运行时](#十三层运行时)
11. [实现路线图](#十一实现路线图)

---

## 一、产品目标与定位

### 1.1 演进路径

```
Phase 1（已有）          Phase 2（当前）            Phase 3（目标）
┌─────────────┐        ┌─────────────┐          ┌─────────────────────────┐
│ 工程师写代码 │   →    │  YAML 配置   │    →     │  可视化编排 + AI 辅助设计  │
│ 每种赛制一套 │        │  一种赛制    │          │  教师自己设计赛事         │
└─────────────┘        └─────────────┘          └─────────────────────────┘
   硬编码                 声明式配置                元引擎 + 智能层
```

### 1.2 目标用户与使用场景

| 用户 | 场景 | CDE 提供的能力 |
|------|------|----------------|
| **主理人 / 教研** | 设计新赛制原型，快速验证机制可行性 | 沙盒环境 + 节点编排 + 千局模拟 |
| **教师** | 根据教学内容 DIY 自己的比赛 | 模板继承 + 参数调参 + 一键发布 |
| **AI Agent**（远期） | 将教师的自然语言描述转为可运行赛事 | MCP 接口 + Schema 约束 + 自动验证 |
| **学生** | **不直接使用** CDE；消费 CDE 产出的赛事 | — |

### 1.3 核心命题

> **N 种赛事 = 1 个 CDE 引擎 + N 份配置 + M 个资产包**

CDE 不是替代 CyberCore，而是**在其之上建立一层编排与生成能力**：
- CyberCore 负责「配置 → 运行」的执行层
- CDE 负责「设计 → 配置」的生产层

---

## 二、总体架构：四层模型

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Layer 4: AI Design Assistant                                               │
│  教师自然语言输入 → 赛事草案 → 自动验证 → 一键发布                              │
│  接口：MCP Tools（search / create / edit / simulate / export）              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 3: Visual Orchestrator                                               │
│  节点图编排赛事流程 + 画布编排空间与资产 + 属性面板配置参数                       │
│  输出：Competition Bundle（config + formulas + assets + ai_profiles）        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 2: CDE Core — Composition Kernel                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ Formula VM  │ │ CitySim     │ │ Asset       │ │ AI Opponent         │   │
│  │ 公式虚拟机   │ │ Protocol    │ │ Pipeline    │ │ Runtime             │   │
│  │             │ │ 城市模拟协议 │ │ 资产管线     │ │ AI 对手运行时        │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 1: CyberCore Runtime（已有）                                          │
│  FSM 引擎 + EventBus + Settlement 计算器 + 条件求值器                         │
│  输入：game-config YAML + 玩家决策 → 输出：新状态 + 事件流                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 0: Capability Atoms（已有）                                           │
│  决策原子（budget_allocate / route_select / bid_sealed...）                  │
│  结算原子（softmax_share / linear_scoring / ranking_elo...）                 │
│  社交原子（alliance_form / spy_reveal / negotiation_space...）               │
│  事件原子（random_crisis / timed_pressure / card_draw...）                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 各层职责

| 层级 | 职责 | 关键产出 |
|------|------|----------|
| **L4 AI 助手** | 理解教师意图，生成初稿配置，回答设计问题 | 赛事草案 JSON、修改建议 |
| **L3 编排器** | 可视化编辑赛事的所有维度，所见即所得 | Competition Bundle |
| **L2 核心** | 提供四个可组合的「能力引擎」，供 L3 调用 | 执行环境 + 协议实现 |
| **L1 CyberCore** | 解析配置、驱动状态机、执行结算、管理对局生命周期 | 运行中赛事实例 |
| **L0 原子库** | 复用的最小游戏机制单元 | 原子能力注册表 |

### 2.2 数据流

```
设计时：
  教师/AI ──► L3 编排器 ──► L2 核心（验证）──► Competition Bundle
                                                        │
                                                        ▼
测试时：                    L1 CyberCore（沙盒模式）◄─── 加载 Bundle
                                │
                                ▼
                        千局模拟 / 平衡性分析 ──► 调试报告
                                                        │
                                                        ▼
运行时：                    L1 CyberCore（完整模式）◄─── 发布 Bundle
                                │
                                ▼
                        Arena Server ◄──► WebSocket ◄──► 学生端
```

---

## 三、Layer 2 核心：Formula VM（公式虚拟机）

### 3.1 为什么需要 Formula VM

CyberCore 现有的结算逻辑写在引擎代码中。CDE 要让教师自由组合公式，必须提供一个**沙箱化的表达式执行环境**。

| 对比维度 | 现状（代码中硬编码） | Formula VM（目标） |
|----------|---------------------|-------------------|
| 修改结算 | 改代码 → 重启 → 测试 | 改配置 → 即时生效 |
| 教师使用 | 不可能 | 拖拽 + 属性面板 |
| 可验证性 | 依赖单元测试覆盖 | 表达式可静态分析 |
| 可回放性 | 依赖代码不变 | 表达式 + 输入 = 确定性输出 |
| AI 生成 | 代码难以 LLM 直接生成 | 结构化表达式 LLM 友好 |

### 3.2 表达式语言设计（CDEL：Competition Design Expression Language）

#### 3.2.1 类型系统

```
Scalar      → number | boolean | string | null
Vector      → Scalar[]                         # 同构数组
TimeSeries  → { tick: number, value: Scalar }[] # 时序数据
Graph       → { nodes: Node[], edges: Edge[] } # 图结构
Function    → λ(args) -> expr                  # 可复用函数
```

#### 3.2.2 标准库（按领域分类）

| 领域 | 函数名 | 签名 | 说明 |
|------|--------|------|------|
| **数学** | `add` / `sub` / `mul` / `div` | `(a: Scalar, b: Scalar) → Scalar` | 基础运算，div 保护除零 |
| **数学** | `sum` / `mean` / `max` / `min` | `(v: Vector) → Scalar` | 聚合函数 |
| **数学** | `clamp` | `(x: Scalar, min: Scalar, max: Scalar) → Scalar` | 截断 |
| **经济** | `softmax` | `(v: Vector, temp?: Scalar) → Vector` | 市场份额分配 |
| **经济** | `demand_curve` | `(price: Scalar, params: {...}) → quantity: Scalar` | 需求曲线计算 |
| **经济** | `marginal_utility` | `(x: Scalar, lambda: Scalar) → Scalar` | 边际效用递减 |
| **博弈** | `nash_equilibrium` | `(payoff_matrix: Matrix) → Strategy[]` | 纳什均衡求解（简化版） |
| **博弈** | `shapley_value` | `(coalition: Graph, contributions: Vector) → Vector` | 夏普利值分配 |
| **概率** | `random_uniform` | `(min: Scalar, max: Scalar) → Scalar` | 均匀分布（种子可控） |
| **概率** | `random_normal` | `(mu: Scalar, sigma: Scalar) → Scalar` | 正态分布（种子可控） |
| **概率** | `weighted_choice` | `(options: Vector, weights: Vector) → index: Scalar` | 加权随机选择 |
| **时间** | `lag` | `(ts: TimeSeries, n: Scalar) → Scalar` | 时序延迟取值 |
| **时间** | `moving_average` | `(ts: TimeSeries, window: Scalar) → Scalar` | 移动平均 |
| **图论** | `shortest_path` | `(g: Graph, from: Node, to: Node) → Path` | 最短路径 |
| **图论** | `page_rank` | `(g: Graph, damping?: Scalar) → Vector` | 节点重要性排序 |

#### 3.2.3 表达式示例

```cdel
# 市场份额计算（softmax + 路线加成）
def market_share(investments, routes, city) {
  let bonuses = routes.map(r => route_bonus(r, city.dominant_route));
  let weighted = zip(investments, bonuses).map(([inv, b]) => inv * b);
  let shares = softmax(weighted);
  return shares * city.demand * seasonality(city.climate, current_tick);
}

# 边际效用递减的定价影响
def price_impact(base_price, supply_delta, elasticity) {
  let ratio = clamp(supply_delta / base_price, -0.5, 0.5);
  return base_price * (1 + ratio * elasticity);
}

# 条件分支
def event_trigger(city, player) {
  if (city.unemployment > 0.15 && random_uniform(0, 1) < 0.3) {
    return { type: "CRISIS", severity: "HIGH", target: city.id };
  } else {
    return null;
  }
}
```

### 3.3 执行环境

```
┌─────────────────────────────────────────┐
│  Formula VM Execution Context           │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Pure Function Evaluator        │   │
│  │  - 无副作用                      │   │
│  │  - 确定性（相同输入 → 相同输出）   │   │
│  │  - 可序列化                      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  State Context (read-only)      │   │
│  │  - game_state: 当前对局状态      │   │
│  │  - player_state: 当前玩家状态    │   │
│  │  - tick: 当前 tick/round         │   │
│  │  - history: 历史状态（只读）      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Sandbox Limits                 │   │
│  │  - max_execution_time: 100ms    │   │
│  │  - max_memory: 64MB             │   │
│  │  - max_recursion_depth: 100     │   │
│  │  - no_network / no_file_io      │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 3.4 调试能力

| 功能 | 说明 |
|------|------|
| **表达式展开树** | 可视化一个结算公式的完整求值过程 |
| **中间结果探针** | 在任意子表达式上设置断点，查看中间值 |
| **敏感性分析** | 改变一个输入参数，观察输出变化曲线 |
| **对比运行** | 同时运行两个公式版本，对比结果差异 |

---

## 四、Layer 2 核心：CitySim Protocol（城市模拟协议）

### 4.1 设计哲学

> **赛事引擎不内置城市模拟，而是通过协议消费城市模拟能力。**

这让城市模拟可以独立演进，也可以按需替换实现（轻量预计算 ↔ 重模拟）。

### 4.2 协议接口

```typescript
interface CitySimProtocol {
  // ── 查询接口 ──
  getRegion(region_id: string): RegionSnapshot;
  getCity(city_id: string): CitySnapshot;
  getNetwork(): Graph<CityNode, EdgeAttrs>;
  getMarket(city_id: string, product_id: string, tick: number): MarketSnapshot;
  getPopulation(city_id: string): PopulationSnapshot;
  
  // ── 影响接口（玩家行为写回） ──
  applyTrade(
    city_id: string,
    product_id: string,
    volume: number,      // 正 = 买入（增加需求），负 = 卖出（增加供给）
    price: number
  ): MarketImpact;
  
  applyPolicy(
    city_id: string,
    policy: PolicyParams
  ): PolicyLagEffect;    // 返回延迟生效的描述
  
  // ── 订阅接口 ──
  subscribe(city_ids: string[], callback: (update: CityUpdate) => void): Subscription;
}

interface CitySnapshot {
  id: string;
  name: string;
  population: number;
  gdp_per_capita: number;
  climate: ClimateType;
  industries: IndustryMix[];
  sentiment: number;      // 0~1，市民满意度
  infrastructure: number; // 0~1，基础设施水平
}

interface MarketSnapshot {
  product_id: string;
  ask_curve: Curve;       // 供给曲线
  bid_curve: Curve;       // 需求曲线
  equilibrium_price: number;
  equilibrium_volume: number;
  last_tick_trades: Trade[];
}

interface MarketImpact {
  new_ask_curve: Curve;
  new_bid_curve: Curve;
  price_delta: number;
  volume_delta: number;
  persistence_ticks: number;  // 影响持续多少 tick
}
```

### 4.3 实现模式

```
┌─────────────────────────────────────────────────────────────┐
│                     CitySim 适配器层                         │
├───────────────┬───────────────────┬─────────────────────────┤
│  轻量模式      │   混合模式         │    重模拟模式            │
│  (默认)        │   (推荐)           │    (远期)               │
├───────────────┼───────────────────┼─────────────────────────┤
│ 预计算曲线     │ 关键城市重模拟      │ 完整城市模拟器           │
│ YAML 数据文件  │ 背景城市预计算      │ 复杂系统动力学           │
│ POP 聚合       │ 动态切换            │ 实时多智能体             │
├───────────────┼───────────────────┼─────────────────────────┤
│ 启动快        │ 平衡精度与性能      │ 最高真实度               │
│ 无运行时开销   │ 中等运行时开销      │ 高开销                   │
│ 适合 90% 场景  │ 适合深度赛事        │ 适合研究/展示            │
└───────────────┴───────────────────┴─────────────────────────┘
```

### 4.4 与赛事引擎的集成点

```
赛事配置中引用城市数据：

competition:
  space:
    type: "city_network"
    region_ref: "yangtze_6"           # 引用 world pack
    citysim_mode: "light"              # light / hybrid / heavy
    
  economy:
    pricing_engine:
      type: "citysim_market"
      formula: "citysim.get_market(city_id, product_id, tick).equilibrium_price"
      
    player_impact:
      type: "citysim_trade"
      writeback: true                   # 玩家交易是否写回城市模拟
      persistence: "formula"            # 影响持续时间 = VM 公式计算
```

---

## 五、Layer 2 核心：Asset Pipeline（资产管线）

### 5.1 资产引用模型

```yaml
# 资产引用示例
asset_ref:
  kind: "icon"                    # icon | sprite | map | sound | ui_theme | animation
  id: "product/grain"
  
  # 变体系统：同一资产在不同主题下的表现
  variants:
    default:
      path: "assets/icons/grain.svg"
      format: "svg"
    fushengji:
      path: "art-assets/fushengji/icons/grain.svg"
      format: "svg"
    spring_festival:
      path: "art-assets/themes/cny/grain.svg"
      format: "svg"
  
  # 运行时参数
  params:
    tintable: true                  # 是否支持染色
    animated: false                 # 是否带动画
    resolution: [64, 64]            # 默认渲染尺寸
    
  # 降级链
  fallback_chain:
    - "@2x"
    - "@1x"
    - "placeholder"
    - "text:粮食"                   # 最终回退到文字
```

### 5.2 资产包（Theme Pack）

```
主题包 = 一组资产的覆盖集合

fushengji-theme/
  manifest.yaml                    # 主题元数据、版本、依赖
  assets/
    icons/                         # 产品图标
    sprites/                       # 角色/商队精灵
    maps/                          # 地图资源
    ui/                            # UI 主题（颜色、字体、间距）
    sounds/                        # 音效
    animations/                    # 动画
```

赛事可以绑定一个主题包，实现「换肤」：

```yaml
competition:
  theme:
    base: "default"
    override: "fushengji-theme@v1.2"
```

### 5.3 加载策略

| 场景 | 加载策略 | 说明 |
|------|----------|------|
| 编排器编辑 | 缩略图 + 懒加载 | 编辑时只看预览，不加载全量 |
| 沙盒测试 | 按需加载 | 运行时按当前场景加载 |
| 正式发布 | 预加载清单 | manifest 声明预加载集合 |
| 离线模式 | 本地缓存 | Service Worker / 小程序分包 |

### 5.4 资产-逻辑绑定（互动能力）

```yaml
# 资产可以被赋予交互能力
asset_binding:
  target: "city_nanjing"
  asset: "city_badge_nanjing"
  
  interactions:
    on_hover:
      action: "show_tooltip"
      params:
        title: "{city.name}"
        content: "人口: {city.population}万 | GDP: {city.gdp}亿"
        
    on_click:
      action: "open_panel"
      params:
        panel: "city_detail"
        context: { city_id: "nanjing" }
        
    on_tick:
      condition: "city.grain_price > city.grain_price_avg * 1.5"
      actions:
        - action: "play_animation"
          params: { animation: "price_alert", loop: false }
        - action: "emit_sound"
          params: { sound: "alert_soft", volume: 0.5 }
```

---

## 六、Layer 2 核心：AI Opponent Runtime（AI 对手运行时）

### 6.1 AI 对手模型

```yaml
ai_opponent:
  # 外在表现
  persona:
    name: "李闯"
    avatar: "ai/avatars/merchant_01.svg"
    backstory: "从义乌小商品市场起家的年轻商人..."
    difficulty: 3                    # 1~5
    
  # 策略核心
  strategy:
    archetype: "arbitrageur"         # 见下表
    parameters:
      risk_tolerance: 0.6             # 0~1，高风险偏好
      lookahead_ticks: 8              # 前瞻 tick 数
      adaptivity_rate: 0.15           # 学习率
      greed_factor: 0.8               # 贪婪程度
      
    # 自定义启发式（Formula VM 表达式）
    heuristics:
      - name: "should_buy"
        condition: "city.ask_price < predicted_price_next_tick * 0.95"
        priority: 10
        
      - name: "should_move"
        condition: "max_neighbor_margin > current_city_margin * 1.2"
        priority: 8
        
  # 运行时引擎选择
  runtime:
    engine: "rule-based"              # rule-based | mcts | llm-agent
    # engine: "llm-agent" 时的配置
    llm_config:
      model: "claude-sonnet-4-6"
      temperature: 0.7
      system_prompt_ref: "ai/prompts/trading_expert.txt"
      max_tokens_per_decision: 500
```

### 6.2 策略原型（Archetypes）

| 原型 | 核心行为 | 适合场景 |
|------|----------|----------|
| **Arbitrageur（套利者）** | 低买高卖，跨城搬运 | 贸易类赛事 |
| **Hoarder（囤积者）** | 看好某个商品长期价值，大量买入持有 | 投资类赛事 |
| **Aggressor（侵略者）** | 抢占市场，打压对手 | 竞争激烈的赛事 |
| **Cooperator（合作者）** | 寻求联盟，互惠互利 | 需要团队合作的赛事 |
| **Learner（学习者）** | 观察对手行为，动态调整 | 高阶对手 |
| **Random（随机者）** | 近乎随机决策，用于基准测试 | 难度 1 |

### 6.3 运行时引擎对比

| 引擎 | 延迟 | 可解释性 | 复杂度 | 适用场景 |
|------|------|----------|--------|----------|
| **Rule-based** | <1ms | 高（规则透明） | 低 | 大多数场景 |
| **MCTS** | 50~200ms | 中（搜索树） | 中 | 策略深度高的赛事 |
| **LLM-Agent** | 500ms~2s | 低（黑盒） | 高 | 角色扮演、叙事赛事 |

### 6.4 AI 与 Formula VM 的交互

```
AI 决策流程：

  ┌─────────────────┐
  │  感知（Perceive） │  ← 通过 CitySim Protocol 获取市场状态
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  评估（Evaluate） │  ← 执行 heuristics（Formula VM 表达式）
  │  每个启发式打分   │     得到动作候选列表 + 分数
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  选择（Select）   │  ← Rule-based: 选最高分
  │                 │     MCTS: 模拟 + UCB
  │                 │     LLM: 自然语言推理
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  执行（Act）     │  ← 生成标准决策格式，提交给 CyberCore
  └─────────────────┘
```

---

## 七、Layer 3：Visual Orchestrator（可视化编排器）

### 7.1 三视图架构

编排器提供三种互补的编辑视图：

```
┌─────────────────────────────────────────────────────────────┐
│  View 1: 节点图（Node Graph）— 赛事流程编排                   │
│                                                             │
│  [Entry] ──► [Round 1] ──► [Crisis] ──► [Round 2] ──► [End]│
│                  │              │                           │
│                  ▼              ▼                           │
│             [Decision]    [Random Event]                    │
│                  │              │                           │
│                  ▼              ▼                           │
│             [Formula]     [Formula]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  View 2: 画布（Canvas）— 空间与资产编排                       │
│                                                             │
│         ┌──────┐          ┌──────┐                         │
│         │ CityA│◄────────►│ CityB│  ← 拖拽城市节点          │
│         └──┬───┘          └──┬───┘                         │
│            │  edge           │                              │
│         ┌──┴───┐          ┌──┴───┐                         │
│         │City C│          │City D│  ← 点击配置属性          │
│         └──┬───┘          └──┬───┘                         │
│            │                 │                              │
│  [资产面板] ► 拖拽图标绑定到节点                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  View 3: 层级大纲（Outline）— 结构化导航                      │
│                                                             │
│  ▼ 赛事本体                                                  │
│    ▼ 元信息（名称/版本/作者）                                │
│    ▼ 规则（阶段/转换/胜负条件）                              │
│    ▼ 经济（货币/资源/生产函数）                              │
│    ▼ 空间（拓扑/地点/移动规则）                              │
│    ▼ 智能体（玩家槽位/AI配置/NPC）                           │
│    ▼ 事件（触发器/随机表/叙事注入）                          │
│    ▼ 结算（公式/排行榜/徽章）                                │
│    ▼ 资产（主题包/UI 方案/地图包）                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 节点类型清单

| 节点类型 | 图标 | 功能 | 可配置属性 |
|----------|------|------|------------|
| **阶段（Phase）** | ⏱️ | FSM 状态节点 | 准入条件、超时、人数检查、并行/串行 |
| **决策（Decision）** | 🎯 | 玩家可执行的操作 | 操作列表、约束条件、UI 组件绑定 |
| **公式（Formula）** | 📐 | 结算逻辑 | CDEL 表达式、输入/输出定义 |
| **事件（Event）** | ⚡ | 触发器 | 触发条件、事件队列、概率表 |
| **分支（Branch）** | 🔀 | 条件路由 | if/else/switch 条件 |
| **资产（Asset）** | 🎨 | 美术资源绑定 | 资源引用、变体选择、交互配置 |
| **AI（Agent）** | 🤖 | AI 对手配置 | 原型选择、参数调参、启发式编辑 |
| **城市（City）** | 🏙️ | 城市节点 | CitySim 引用、属性覆盖 |
| **边（Edge）** | ──► | 连接关系 | 移动规则、距离、通行条件 |

### 7.3 属性面板设计原则

```
选中任意节点 → 右侧属性面板

┌─────────────────────────────┐
│  基础属性                     │
│  ├─ 名称                      │
│  ├─ ID（自动生成，可修改）     │
│  └─ 描述（给教师看的注释）     │
├─────────────────────────────┤
│  业务属性（节点类型相关）       │
│  ├─ [动态表单，基于 Schema]   │
│  ├─ [公式编辑器，内嵌 CDEL]   │
│  └─ [资产选择器，预览+搜索]   │
├─────────────────────────────┤
│  高级                         │
│  ├─ 条件表达式（可选）         │
│  ├─ 调试探针（开关）           │
│  └─ 自定义 Hook（可选，沙箱）  │
└─────────────────────────────┘
```

### 7.4 即时验证与预览

| 功能 | 实现方式 |
|------|----------|
| **Schema 校验** | 输入时即时检查类型/范围/必填 |
| **公式校验** | CDEL 语法检查 + 类型推断 |
| **循环检测** | 节点图拓扑检查，防止死循环 |
| **死分支检测** | 静态分析，标记不可达节点 |
| **UI 预览** | 根据 ui_schema 渲染学生端预览 |
| **单步模拟** | 推进一个 tick，观察状态变化 |

---

## 八、Layer 4：AI Design Assistant（AI 设计助手）

### 8.1 定位

AI 设计助手不是替代教师设计，而是**加速从「想法」到「可运行配置」的过程**。教师始终是最终决策者。

### 8.2 MCP 工具清单

```typescript
// AI Agent 通过 MCP 协议调用 CDE 的能力
interface CDEMcpTools {
  // ── 搜索与发现 ──
  search_templates(query: string, filters?: {...}): Template[];
    // 按教学主题搜索已有赛事模板
    // 例："供应链韧性" → 返回产业链角色扮演模板
    
  list_atoms(category?: AtomCategory): Atom[];
    // 列出可用的能力原子
    // 例：list_atoms("settlement") → 所有结算原子
    
  // ── 创建与编辑 ──
  create_competition(params: {
    name: string;
    from_template?: string;    // 基于模板继承
    description: string;
  }): CompetitionDraft;
    
  edit_phase(competition_id: string, phase_id: string, changes: object): void;
  add_formula(competition_id: string, formula: CDELExpression): void;
  bind_asset(competition_id: string, target: string, asset_ref: AssetRef): void;
  
  // ── 验证与测试 ──
  validate_config(competition_id: string): ValidationReport;
    // Schema 检查 + 公式检查 + 循环检测
    
  run_simulation(competition_id: string, params: {
    rounds: number;
    ai_players: number;
    seed?: number;
  }): SimulationResult;
    // 千局模拟，输出胜率分布、平均时长、数值分析
    
  balance_report(competition_id: string): BalanceAnalysis;
    // 策略多样性分析、最优策略检测、数值平衡建议
    
  // ── 发布 ──
  export_bundle(competition_id: string): CompetitionBundle;
    // 导出完整的赛事包（config + formulas + assets + ai_profiles）
    
  publish(competition_id: string, channel: "sandbox" | "staging" | "production"): void;
}
```

### 8.3 AI 辅助设计工作流

```
教师："我想做一个关于供应链韧性的比赛，
      3 个小组分别代表供应商、制造商、零售商"
       │
       ▼
┌──────────────────────────────┐
│  Step 1: 意图理解             │
│  AI 解析关键词：               │
│  - 主题：供应链韧性            │
│  - 角色：供应商/制造商/零售商   │
│  - 机制：产业链协作 + 风险事件   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  Step 2: 模板推荐             │
│  AI 调用 search_templates()   │
│  → 推荐「产业链角色扮演」模板   │
│  → 提供 3 个变体（轻/中/重度）  │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  Step 3: 生成草案             │
│  AI 调用 create_competition() │
│  → 生成骨架配置               │
│  → 自动填充合适的原子组合       │
│  → 生成 3 个 AI 对手原型       │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  Step 4: 教师审查             │
│  教师在编排器中查看/修改        │
│  AI 回答："如果改这个参数会怎样"│
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  Step 5: 自动验证             │
│  AI 调用 validate_config()    │
│  → 发现：某个决策节点不可达      │
│  → 建议：添加一条边连接         │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  Step 6: 沙盒测试             │
│  AI 调用 run_simulation()     │
│  → 1000 局模拟结果             │
│  → 发现：供应商胜率 68%，失衡   │
│  → 建议：增加制造商议价能力      │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  Step 7: 发布                 │
│  教师确认 → AI 调用 publish()  │
│  → 生成 game_config_id        │
│  → 注册到平台                  │
└──────────────────────────────┘
```

### 8.4 安全边界

| 约束 | 说明 |
|------|------|
| **AI 只生成草案** | 任何发布操作必须经教师人工确认 |
| **所有 AI 操作可撤销** | 版本历史记录，支持回滚 |
| **AI 建议带置信度** | 低置信度建议明确标注「仅供参考」 |
| **Schema 校验为硬门槛** | AI 生成的配置必须通过 validate_config 才能提交 |

---

## 九、赛事本体 Schema

### 9.1 顶层结构

```yaml
# Competition Bundle 顶层结构
competition_bundle:
  version: "1.0"
  
  # ── 元数据 ──
  meta:
    id: "supply-chain-resilience-v1"
    name: "供应链韧性挑战赛"
    description: "三角色协作应对供应链中断危机"
    author: "teacher_001"
    target_age: [14, 18]
    duration_range: { min_minutes: 20, max_minutes: 40 }
    tags: ["供应链", "协作", "风险管理", "产业链"]
    
  # ── 引擎依赖 ──
  engine:
    type: "cybercore-v2"
    required_atoms: ["budget_allocate", "negotiation_space", "random_crisis", "linear_scoring"]
    
  # ── 核心配置 ──
  rules:
    phases: [...]           # 阶段定义
    transitions: [...]      # 阶段转换
    win_conditions: [...]   # 胜利条件
    constraints: [...]      # 全局约束
    
  economy:
    currencies: [...]       # 货币定义
    resources: [...]        # 资源定义
    production_functions: [...]  # 生产函数（Formula VM 引用）
    
  space:
    type: "city_network"    # 空间类型
    region_ref: "generic_3" # 城市模拟引用
    citysim_mode: "light"   # 模拟模式
    
  agents:
    player_slots: 3         # 玩家槽位
    roles: [...]            # 角色定义
    ai_opponents: [...]     # AI 配置
    npcs: [...]             # NPC 配置
    
  events:
    triggers: [...]         # 触发器
    random_tables: [...]    # 随机表
    narrative_injects: [...]  # 叙事注入
    
  scoring:
    formulas: [...]         # 结算公式（CDEL）
    leaderboards: [...]     # 排行榜
    badges: [...]           # 徽章
    
  # ── 资产 ──
  assets:
    theme: "default"
    ui_schema: {...}        # UI 声明
    map_pack: {...}         # 地图包
    
  # ── 公式库 ──
  formula_library:
    - id: "profit_calc"
      expression: "..."
    - id: "crisis_impact"
      expression: "..."
    
  # ── AI 配置 ──
  ai_profiles:
    - id: "conservative_supplier"
      persona: {...}
      strategy: {...}
```

### 9.2 版本与继承

```yaml
# 继承机制：新赛事可以基于已有赛事做增量修改
competition_bundle:
  meta:
    id: "supply-chain-resilience-v2"
    extends: "supply-chain-resilience-v1"
    
  # 只覆盖需要修改的部分
  rules:
    phases:
      - id: "crisis_round"
        override: true
        duration_ticks: 15   # 从 10 改为 15
        
  economy:
    production_functions:
      - id: "manufacturer_output"
        override: true
        expression: "..."    # 新的生产函数
```

---

## 十、三层运行时

### 10.1 运行时模式对比

| 维度 | 设计时（Design-Time） | 测试时（Test-Time） | 运行时（Run-Time） |
|------|----------------------|---------------------|-------------------|
| **目标用户** | 教师/教研/AI | 教师/教研 | 学生 |
| **引擎模式** | 静态分析 + 预览 | CyberCore Headless | CyberCore Full |
| **Formula VM** | 语法检查 + 类型推断 | 完整执行 | 完整执行 |
| **CitySim** | Schema 检查 | CitySim Stub / Light | CitySim Full |
| **AI Runtime** | 配置预览 | 完整执行 | 完整执行 |
| **Asset** | 缩略图预览 | 按需加载 | 预加载 |
| **速度** | 即时 | 1000x 加速模拟 | 实时 |
| **持久化** | Draft | 临时 | 完整对局记录 |

### 10.2 运行时的关键设计

```
┌──────────────────────────────────────────────────────────────┐
│  同一套引擎核心，三种模式切换                                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   赛事配置 Bundle                                             │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────────────────────────────────────────┐           │
│   │         CDE Core Loader                      │           │
│   │  解析 Bundle → 构建执行计划 → 初始化子系统    │           │
│   └────────────────────┬────────────────────────┘           │
│                        │                                     │
│         ┌──────────────┼──────────────┐                     │
│         ▼              ▼              ▼                     │
│    ┌─────────┐   ┌─────────┐   ┌─────────┐                │
│    │ 设计时   │   │ 测试时   │   │ 运行时   │                │
│    │         │   │         │   │         │                │
│    │静态分析  │   │沙盒引擎  │   │Arena    │                │
│    │即时反馈  │   │千局模拟  │   │Server   │                │
│    │         │   │         │   │         │                │
│    │Formula   │   │Formula   │   │Formula   │                │
│    │VM: lint  │   │VM: exec  │   │VM: exec  │                │
│    │CitySim:  │   │CitySim:  │   │CitySim:  │                │
│    │  schema  │   │  stub    │   │  full    │                │
│    └─────────┘   └─────────┘   └─────────┘                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 十一、实现路线图

### 11.1 阶段划分

| 阶段 | 目标 | 核心交付物 | 时长估算 |
|------|------|-----------|----------|
| **P0: 奠基** | Formula VM 原型 + 赛事本体 Schema 定稿 | CDEL v0.1、Schema 规范、VM 原型 | 3~4 周 |
| **P1: 核心** | CitySim Protocol + Asset Pipeline + AI Runtime | 协议实现、资产加载器、AI 引擎 | 4~5 周 |
| **P2: 编排** | Visual Orchestrator v1 | 节点图编辑器、画布编辑器、属性面板 | 5~6 周 |
| **P3: 智能** | AI Design Assistant + MCP 接口 | MCP 工具实现、AI 工作流 | 4~5 周 |
| **P4: 打磨** | 整合测试 + 教师内测 + 迭代 | 稳定版本、文档、示例赛事 | 3~4 周 |

### 11.2 与现有项目的衔接

```
已有资产                       CDE 增量                         最终状态
─────────────────────────────────────────────────────────────────────────
CyberCore (L1)        +       Formula VM (L2)           →    可配置结算
赛事工坊 (89-)        +       可视化编排器 (L3)          →    完整设计环境
game-configs YAML     +       赛事本体 Schema            →    结构化配置
art-assets/           +       Asset Pipeline (L2)       →    主题化资产
AI 对手 PRD (90-91)   +       AI Runtime (L2)           →    可配置 AI
商域 AI 框架 (81-)     +       AI Design Assistant (L4)  →    智能设计助手
```

### 11.3 关键决策点（待讨论）

| # | 决策 | 选项 | 影响 |
|---|------|------|------|
| 1 | CDEL 语法 | 自研 vs 嵌入 Lua/JS 子集 | 自研可控但工作量大；嵌入快但沙箱复杂 |
| 2 | 编排器技术 | Web 组件 vs 桌面应用 | Web 易分发；桌面性能更好 |
| 3 | CitySim 首版 | Light 模式先做 vs 直接混合 | Light 降低复杂度；混合更真实 |
| 4 | AI Runtime 首版 | Rule-based only vs 含 MCTS | Rule-based 覆盖 80% 场景 |
| 5 | L4 AI 助手 | 先用 LLM prompt 工程 vs 训练微调 | Prompt 工程见效快；微调长期更好 |

---

## 附录

### A. 术语表

| 术语 | 英文 | 定义 |
|------|------|------|
| CDE | Competition Design Engine | 商赛设计引擎 |
| CDEL | Competition Design Expression Language | 赛事设计表达式语言 |
| CyberCore | — | 现有声明式赛事运行时 |
| Formula VM | Formula Virtual Machine | 公式虚拟机 |
| CitySim | City Simulation | 城市模拟协议/系统 |
| Competition Bundle | — | 完整的赛事配置包 |
| MCP | Model Context Protocol | AI 与工具交互的协议标准 |

### B. 参考文档

| 文档 | 关系 |
|------|------|
| [89-赛事工坊实现说明与使用指南](./89-赛事工坊实现说明与使用指南.md) | 现有沙盒实现，CDE 的编排器将替代/扩展 |
| [87-商赛机制设计沙盒蓝图](./87-商赛机制设计沙盒蓝图.md) | 产品蓝图，CDE 是实现该蓝图的引擎层 |
| [90-AI对手NPC化与成长演化系统PRD](./90-AI对手NPC化与成长演化系统PRD.md) | AI 对手设计，CDE AI Runtime 的消费方 |
| [81-商域AI赋能六支柱全景](./81-商域AI赋能六支柱全景.md) | AI 战略框架，CDE L4 是支柱之一的具体实现 |
| [docs/archive/b/00-解耦声明式商业模拟框架总览](../docs/archive/b商赛界面展示/00-解耦声明式商业模拟框架总览.md) | CyberCore 框架总览，CDE 的上层抽象 |
