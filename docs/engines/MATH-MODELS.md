# 三赛事引擎 · 数学建模公式总表

> **最后更新**：2026-06-28  
> **定位**：FST / TECH / OPS 三套引擎的**公式速查与调参入口**。修改公式时优先改本文档对应节，再同步代码与 YAML。  
> **代码真身**：以 `webapp/backend/app/games/{trading|techventure|ops_sim}/` 为准；本文是归纳层。

---

## 使用说明

| 列/标记 | 含义 |
|---------|------|
| **实现** | 当前 `engine` / `rts_*` 代码已落地 |
| **契约** | 写在 SPEC/PRD，实现可能滞后（见 OPS Gap 表） |
| **YAML** | 参数来自 `webapp/backend/content/game-configs/<id>.yaml` |

　　各引擎分章：符号表 → 核心公式 → 排名/结算 → 关键参数 → 代码落点。

---

# 一、FST · 浮生记（实时贸易套利）

> `engine: trading` · 配置：`fstrading.yaml` · 代码：`games/trading/rts_pricing.py` 等

## 1.1 符号表

| 符号 | 含义 |
|------|------|
| `c` | 城市 |
| `p` | 商品 |
| `t` | tick |
| `Pool_{c,p,t}` | 城市商品池存量 |
| `Tgt_{c,p}` | 目标池量 |
| `Prod_{c,p}`, `Cons_{c,p}` | 城市对该品的生产/消费（可被事件乘子修正） |
| `Mid_{c,p}` | 结构性中价 |
| `Press_{c,p,t}` | 池压 |
| `Ask`, `Bid` | 买入价 / 卖出价 |
| `B_{c,p,t}`, `S_{c,p,t}` | 当 tick 玩家净买/卖量 |

## 1.2 目标池量

```text
Tgt_{c,p} = max(20, Ref × 0.5 + Cons_{c,p} × 0.8 + Prod_{c,p} × 0.3)
```

- `Ref` = `pricing.reference_pool`（默认 100）

## 1.3 结构性中价（供需基准价）

```text
surplus = Prod_{c,p} - Cons_{c,p}
factor  = 1 - 0.04 × (surplus / max(Cons_{c,p}, 1))
factor  = factor × demand_mult_{c,p}^0.25
Mid_{c,p} = clamp(BasePrice_p × factor, lo_p, hi_p)
```

- `demand_mult` 来自城市 `demand_profile`
- `lo_p, hi_p` 来自商品 `price_range`（默认 `base×0.5` ~ `base×2`）

## 1.4 池压（价格扰动）

```text
ratio = Pool / Tgt

若 ratio > 1.5:  Press = -0.25 - 0.08 × min(2, ratio - 1.5)
若 ratio < 0.5:  Press = +0.25 + 0.08 × min(2, 0.5 - ratio) × 2
否则:            Press = (1 - ratio) × 0.35

net = B - S   （当 tick 玩家净买入）
Press += clamp(net / Tgt × 0.1, -0.15, +0.15)
Press = clamp(Press, -0.45, +0.45)
```

## 1.5 Ask / Bid（做市价差）

```text
half = spread / 2                    # spread 默认 0.08
Ask  = Mid × (1 + half + Press × ε)
Bid  = Mid × (1 - half + Press × ε × 0.6)
Bid  = min(Bid, Ask × (1 - spread))
```

- `ε` = `pricing.elasticity`（默认 0.12）
- Ask 对池压更敏感；Bid 阻尼系数 0.6

**示例**：`Mid=100, spread=0.08, ε=0.12, Press=0` → Ask≈104, Bid≈96

## 1.6 池量动态（每 tick）

```text
structural = (Prod - Cons) × flow_scale     # flow_scale 默认 0.20
reversion  = (Tgt - Pool) × rev_rate        # rev_rate 默认 0.03
ΔPool      = structural + reversion - B + S
Pool_{t+1} = max(Tgt × min_ratio, Pool_t + ΔPool)   # min_ratio 默认 0.10
```

## 1.7 供需缺口状态（展示用）

```text
available_per_tick = Pool / cover_ticks     # cover_ticks 默认 6
gap = Cons - Prod - available_per_tick

severe_shortage: gap > max(4, Cons×0.35)
shortage:        gap > max(1.5, Cons×0.12)
surplus:         gap < -max(2, Cons×0.18)
否则: balanced
```

## 1.8 物流与仓储

```text
Capacity = BaseCap + Σ vehicle.capacity_bonus
UsedVol  = Σ (qty_p × volume_p)
TravelTicks = max(min_travel, base_route_ticks - speed_bonus)
MoveCost    = edge_cost 或 move_cost_per_edge（默认 800）
```

## 1.9 资产与排名

```text
InventoryValue = Σ (Bid_{current_city,p} × qty_p)
TotalAssets    = Cash + InventoryValue
```

- 比赛结束按 `TotalAssets` 降序排名

## 1.10 FST 关键 YAML 参数

| 参数 | 默认 | 文件节 |
|------|------|--------|
| `reference_pool` | 100 | `pricing` |
| `min_spread` | 0.08 | `pricing` |
| `elasticity` | 0.12 | `pricing` |
| `natural_flow_scale` | 0.20 | `pricing` |
| `pool_reversion_rate` | 0.03 | `pricing` |
| `min_pool_ratio` | 0.10 | `pricing` |
| `storage_capacity_base` | 99 | 根级 |
| `move_cost_per_edge` | 800 | `logistics` |

## 1.11 FST 代码落点

| 公式块 | 文件 |
|--------|------|
| 池量/中价/池压/Ask-Bid | `rts_pricing.py` |
| 自然池 tick | `rts_actions.py:natural_pool_tick` |
| 仓储/行程 | `rts_logistics.py` |
| 市场事件乘子 | `rts_events.py:production_demand_multipliers` |
| 参数默认值 | `rts_config.py:pricing_config` |

---

# 二、TECH · 创想大赢家（回合制品牌竞争）

> `engine: techventure` · 配置：`techventure-v1.yaml` · 代码：`games/techventure/v6_engine.py`, `config.py`

## 2.1 符号表

| 符号 | 含义 |
|------|------|
| `i` | 队伍 |
| `r` | 回合（1…4） |
| `c` | 城市（南京/合肥/杭州） |
| `g` | 客群（geek / pragmatic / trendy） |
| `Tech`, `Fit`, `Show` | 三属性（城市维度 Fit/Show） |
| `I^tech`, `I^fit_c`, `I^show_c` | 本回合投入 |
| `U_{i,c}` | 城市内效用 |
| `Share_{i,c}` | 原始份额 |
| `Ceil_c` | 城市可触达上限 |
| `Attn^{raw}` | 原始注意力 |
| `BQI` | 品牌质量指数 |
| `EffAttn` | 有效市场声量 |

## 2.2 增长率查表 g(V)

```text
g(V) = growth_rate_table 分段查表
示例（以 YAML 为准）:
  V ≤ 2   → 1.20
  V ≤ 4   → 1.08
  V ≤ 5.5 → 0.95
  …
  V ≤ 12  → 0.02
```

## 2.3 Tech 投入过载衰减 I_eff

```text
I ≤ 20:  I_eff = I
20 < I ≤ 30:  I_eff = 20 + 0.80×(I-20)
30 < I ≤ 45:  I_eff = 28 + 0.50×(I-30)
45 < I ≤ 65:  I_eff = 35.5 + 0.30×(I-45)
I > 65:       I_eff = 41.5 + 0.15×(I-65)
```

## 2.4 属性增长

### Tech

```text
ΔTech = g(Tech) × √(I_eff/10) × r_tech × m_crowd × f_bonus
Tech' = clamp(Tech + ΔTech, 0, a_hard)     # a_hard 默认 12
```

- `r_tech`：路线加成（如 TECH 路线 1.25）
- `m_crowd`：PATHFINDER 独占红利曲线（`pathfinder_m_crowd(n)`）
- `f_bonus`：Fit 阈值奖励，某城 Fit≥t1 +5%，≥t2 +8%

### Fit（按城）

```text
b_fit = max(0, 1 - (rank_fit - 1) / k_fit)    # 同城 Fit 投入排名

ΔFit_c = g(Fit_c) × (w_inv×√(I^fit_c/10) + w_rank×b_fit)
         × r_fit × m_crowd × η_fit_c × fit_growth_scale
```

- 默认 `w_inv=0.5, w_rank=0.5, fit_growth_scale=2.0`

### Show（按城）

```text
b_show = max(0, show_b_max - show_b_max×(rank_show-1)/k_show)

halo = 1 + w_halo × (Show_max - Show_c)/Show_max    # w_halo 默认 0.10

ΔShow_c = g(Show_c) × (w_rank_s×b_show + w_inv_s×√(I^show_c/5))
          × halo × r_show × m_crowd × η_show_c
```

- 默认 `w_rank_s=0.9, w_inv_s=0.1, show_b_max=2.5`

## 2.5 城市份额（Softmax）

### 客群权重混合

```text
对每个客群 g，消费者权重 (w^Tech_g, w^Fit_g, w^Show_g)
城市 c 的客群比例 → 混合得到有效权重用于效用（事件可平移客群比例）
```

### 效用与拥挤税

```text
U_{i,c} = (w^T×Tech'×τ_tech_c + w^F×Fit'_c + w^S×Show'_c) × crowd_tax

crowd_tax = max(0, 1 - rcu_route,g × (n_route - 1) / max(N-1, 1))
```

### Softmax

```text
Share_{i,c,g} = exp(β × U_{i,c}) / Σ_j exp(β × U_{j,c})     # 数值稳定：减 max(U)

Share_{i,c} = Σ_g (group_share_g × Share_{i,c,g})
```

- `β` 默认 0.5

## 2.6 可触达上限 Ceiling

```text
avg_q = mean((Tech' + Fit'_c + Show'_c)/3)  over 同城队伍

base      = base_const + q_coeff × avg_q          # 0.10 + 0.10×avg_q
maturity  = maturity_min + maturity_range×(k-1)/(N-1)
crowd_lift= crowd_lift_coeff × (k-1)/(N-1)
show_lift = show_lift_coeff × (1 - exp(-Σ I^show / show_lift_ref))

Ceil_c = min(cap, base×maturity + crowd_lift + show_lift)    # cap 默认 0.95
```

## 2.7 注意力与回合得分

```text
Attn^{raw}_{i,c} = Share_{i,c} × Ceil_c × 100 × market_scale_c
Attn^{raw}_i     = Σ_c Attn^{raw}_{i,c}

momentum_i = decay × momentum_base(last_rank)     # R1 为 0；decay 默认 0.4
hotpulse_i = BRAND 路线 Show 增量阶梯奖励

TotalRaw_i = Attn^{raw}_i + momentum_i + hotpulse_i
```

## 2.8 BQI（品牌质量指数）

```text
BQI_raw = 1.0 + Σ δ_k
BQI     = clamp(BQI_raw, floor, ceil)    # 默认 [0.60, 1.20]
```

| 规则 | δ（默认） |
|------|-----------|
| Tech 全场末 4 位 | -0.10 |
| Fit 投入全场末 4 位 | -0.10 |
| 营销过度（某城 Show 最高且 > Tech+2） | -0.15（合规事件 ×1.5） |
| Tech/Fit/Show 均前 1/3 | +0.12 |
| 宣言方向命中 + 投入占比达标 | +0.04 ~ +0.09 |
| 宣言含愿景词 | +0.03 |
| 宣言与投入偏差 | -0.03 |

## 2.9 有效声量与最终排名

```text
noise ~ Uniform(-σ, +σ)              # σ 默认 0.05
EffAttn_i = TotalRaw_i × BQI_i × (1 + noise)

weighted_round_score = EffAttn_i × w_r
weighted_total      += weighted_round_score

round_weights 默认 [0.15, 0.20, 0.25, 0.40]
```

- 每回合按 `EffAttn` 降序排名；全程按 `weighted_total` 定胜负

## 2.10 预算结转（简）

```text
interest   = reserved × 0.15
follow_on  = f(rank)                 # 第 1 名最多 +15
next_budget = reserved + interest + round_allowance + follow_on
```

## 2.11 TECH 代码落点

| 公式块 | 文件 |
|--------|------|
| 结算主流程 Step 1–9 | `v6_engine.py:settle_round` |
| g(V), I_eff, Softmax, PATHFINDER 曲线 | `config.py` |
| 客群/城市/路线参数 | `content/game-configs/techventure-v1.yaml` |

---

# 三、OPS · 生产经营销售赛（6 轮运营 + 2 轮拍卖）

> `engine: ops_sim` · 配置：`ops-sim-v1.yaml`  
> 代码：`games/ops_sim/engine.py`（**实现**）  
> 契约：`docs/engines/ops/SPEC-ECONOMY.md`（**完整目标模型**）

## 3.1 符号表

| 符号 | 含义 |
|------|------|
| `i` | 队伍 |
| `r` | 运营轮 1…6 |
| `c` | 城市 |
| `k` | 产品品类 |
| `P` | 单价 |
| `Q^plan`, `Q` | 计划/实际产量 |
| `Cap` | 产能 |
| `Tech`, `Fit`, `Show` | 产品属性存量 |
| `U_{i,c}` | 城市效用 |
| `Share_{i,c}` | 市场份额 |
| `D`, `Sales` | 需求/销量 |
| `NA` | 净资产 |

## 3.2 产能与生产

```text
Cap = BaseCap + Σ CapacityBonus + ChannelCapBonus + WorkerProductivity × SalesForce

Q = min(max(Q^plan, 0), Cap, MaxProductionPerRound)
```

## 3.3 单位成本

```text
RawCost = BaseMaterial_k × MaterialMultiplier_r × (1 - DiscountRate_i)
UnitCost = RawCost + BaseLabor_k + BaseOverhead_k / max(Q, 1)

RawSpend = Q × RawCost
COGS     = Sales × UnitCost
```

## 3.4 研发与营销（对数响应 · 实现）

```text
Tech' = (1-δ_Tech)×Tech + α_Tech×ln(1 + RnD/Scale_Tech) + QualityBonus + TechBonus

Fit'  = min(FitMax, Fit + α_Fit×ln(1 + RnD/Scale_Fit))        # P0 可选

Show' = (1-δ_Show)×Show + α_Show×ln(1 + Mkt/Scale_Show) + ShowBonus

EffectiveShow_{i,c} = Show' × Π show_multiplier_{ads,c}
```

## 3.5 城市属性权重（实现）

```text
w^Tech_c = Σ_s (ratio_{c,s} / Σratio) × w^Tech_s
w^Fit_c, w^Show_c 同理
```

- `ratio` 来自城市 `geek_ratio / pragmatic_ratio / show_ratio`
- 客群权重来自 `consumer_segments`

## 3.6 价格参考与惩罚（实现）

```text
PriceRef = λ × BasePrice_k + (1-λ) × AvgPrice_{c,r}     # λ 默认 0.65

PricePenalty = γ_c × ln(P / PriceRef)

P ∈ [BasePrice×min_mult, BasePrice×max_mult]            # 默认 [0.5, 2.5]×
```

## 3.7 效用与市场份额（实现）

```text
norm(x) = x / 20

U_{i,c} = w^Tech_c×norm(Tech') + w^Fit_c×norm(Fit') + w^Show_c×norm(EffectiveShow_{i,c})
          - PricePenalty + Σ utility_bonus_{resources,c}

Share_{i,c} = exp(β×U_{i,c}) / Σ_j exp(β×U_{j,c})       # β 默认 0.25
```

## 3.8 需求与销量（实现）

```text
M_{c} = BaseMarketSize_c × CategoryMultiplier_k × EventMult

D_{i,c} = floor(M_c × Share_{i,c} × ChannelDemandMult_{i,c} × EventMult)
D_i     = Σ_c D_{i,c}

Available = Inv_{r-1} + Q
Sales     = min(D_i, Available)
Inv_r     = Available - Sales
```

## 3.9 期间费用与利润（实现）

```text
Revenue      = Sales × P
GrossProfit  = Revenue - COGS

LaborExp     = SalesForce × WagePerHead
OpExpense    = Marketing + RnD + LaborExp + FixedOverhead + OpeningFees + HoldingCost
HoldingCost  = Inv_r × HoldingCostPerUnit

NetProfit    = GrossProfit - OpExpense
CumProfit   += NetProfit
```

## 3.10 现金与净资产（实现 · 注意口径）

```text
Cash = Cash_{r-1} - RawSpend - Marketing - RnD - LaborExp - FixedOverhead
       - OpeningFees - HoldingCost + Revenue

InvValue = Inv_r × UnitCost
NA       = Cash + InvValue
```

　　**纪律**：`COGS` 只进利润表，**不再**从现金扣减（原材料已在 `RawSpend` 支出）。

## 3.11 开城费

```text
OpeningFee_{i,c} = BaseOpening_c × TierMult_tier × EventMult × (1 - ChannelDiscount_{i,c})
```

| Tier | 乘数（默认） |
|------|--------------|
| 1 | 2.0 |
| 2 | 1.5 |
| 3 | 1.0 |
| 4 | 0.6 |

## 3.12 拍卖（英式）

```text
Bid > CurrentPrice  且  Bid ≤ Cash  且  Bid ≥ CurrentPrice + MinIncrement
MinIncrement = max(BasePrice_item × 0.05, 500)
Winner = argmax Bid ;  Cash_winner -= FinalPrice
```

## 3.13 最终得分

```text
Score_i = w_NA × NA_{i,6} + w_Profit × CumProfit_{i,6}
默认 w_NA=0.70, w_Profit=0.30
```

## 3.14 OPS 实现 vs SPEC 契约 Gap

| # | 当前实现 | SPEC-ECONOMY 目标 |
|---|----------|-------------------|
| E1 | `norm(x)=x/20` 已用 | 一致 |
| E2 | `γ×ln(P/Ref)` 已用 | 一致 |
| E3 | 城市客群比例已混合权重 | 一致 |
| E4 | 对数响应 Tech/Show | Fit 可选增强 |
| E5 | `brand_by_city` 简化为 `EffectiveShow` 乘子 | 完整 Nerlove-Arrow 分城 Brand |
| E6 | 现金公式已分离 RawSpend/COGS | 一致 |
| E7 | R3/R5 固定种子事件 | 一致 |
| E8 | `competitor_exit` → 市场容量 +5% | 不删 AI |

　　完整 21 节公式与 P0 最小公式包见 [ops/SPEC-ECONOMY.md](./ops/SPEC-ECONOMY.md)。

## 3.15 OPS 代码落点

| 公式块 | 文件 |
|--------|------|
| 产能/成本/属性/效用/结算 | `engine.py` |
| 拍卖 | `auction.py` |
| AI 出价与决策 | `ai.py` |
| 最终排名 | `settle.py:final_ranking` |
| Softmax / 工具 | `config.py` |

---

# 四、跨引擎对照

| 维度 | FST | TECH | OPS |
|------|-----|------|-----|
| 时间模型 | 连续 tick（5s） | 离散回合（4 轮） | 离散回合（6+2 拍卖） |
| 竞争分配 | 池压调价（非份额） | Softmax 注意力份额 | Softmax 市场份额 |
| 核心状态 | 现金+库存+池量 | Tech/Fit/Show+预算 | 现金+库存+三属性+拍品 |
| 投入响应 | 直接买卖 | √投入 + 排名奖励 | ln(1+投入/Scale) |
| 排名依据 | 期末总资产 | 加权有效声量 | 0.7×净资产+0.3×累计利润 |
| 随机性 | 市场事件种子 | BQI 后 ±5% noise | 事件/拍卖种子 |

---

# 五、修改公式时的检查清单

1. 更新本章对应公式与符号说明  
2. 改 `games/<engine>/` 实现（保持纯函数可单测）  
3. 改 `content/game-configs/*.yaml` 默认参数  
4. 若改变对外契约：同步 `docs/engines/<id>/PRD.md` 或 `SPEC-ECONOMY.md`  
5. 跑相关引擎练习局回归（FST tick、TECH 四回合、OPS 6 轮）

---

## 相关文档

- [engines/README.md](./README.md) — 三引擎总导航  
- [fst/GUIDE.md](./fst/GUIDE.md) · [tech/GUIDE.md](./tech/GUIDE.md) · [ops/GUIDE.md](./ops/GUIDE.md)  
- [ops/SPEC-ECONOMY.md](./ops/SPEC-ECONOMY.md) — OPS 完整经济契约  
- [../ENGINE.md](../ENGINE.md) — 运行时与结算纪律

---

*商识唯智 · 三引擎数学建模总表 v1.0*
