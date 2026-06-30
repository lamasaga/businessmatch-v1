# OPS 产销运营赛引擎指南

> 引擎标识：`engine: ops-sim` · 配置文件：`content/game-configs/ops-sim-v1.yaml` · 路径：`webapp/backend/app/games/ops_sim/`
> 玩法形态：**回合制产销运营 + 英式拍卖**，团队管理生产、定价、营销、研发，并通过拍卖获取产能/广告/折扣资产。

---

## 一、引擎定位与核心体验

OPS（产销运营赛）是一个**离散轮次、确定性结算、含英式拍卖**的制造业商业模拟器。

- **时间轴**：比赛分为 4 个运营轮次 + 1 个拍卖阶段。
- **玩家目标**：通过生产、定价、营销、研发决策最大化净资产和累计利润。
- **核心策略**：
  - 产品定位（品类 + 目标客群）
  - 生产计划（数量、成本、产能）
  - 定价与营销（市场份额 Softmax 竞争）
  - 拍卖投资（产能扩张、品牌广告、原材料折扣）
- **节奏感**：每轮先提交决策，结算后进入拍卖，拍卖结果影响后续轮次。

---

## 二、代码结构与核心文件

### 2.1 引擎层（`games/ops_sim/`）

| 文件 | 职责 | 关键函数/类 |
|------|------|------------|
| `engine.py` | **纯函数结算核心**：产量、成本、市场份额、财务结算 | `_compute_max_production`, `_compute_unit_cost`, `_compute_score`, `_softmax` |
| `settle.py` | **DB 结算编排**：组装数据、调用引擎、写回结果 | `settle_ops_round`, `final_ranking` |
| `auction.py` | **英式拍卖**：创建拍品、出价、结算 | `create_auction_items`, `place_bid`, `settle_auction` |
| `ai.py` | **AI 对手决策**：产品定位、运营决策、拍卖出价 | `generate_ai_positioning`, `generate_ai_decision`, `generate_ai_bid` |
| `config.py` | **配置读取工具**：YAML 默认值、Softmax、随机种子 | `V`, `softmax` |
| `models.py` | **ORM 模型**：`OpsTeamState`, `OpsRound`, `OpsSubmission`, `OpsSnapshot`, `OpsAuctionItem`, `OpsBid` | — |
| `enums.py` | 枚举：比赛阶段、产品品类、客群、AI 策略、拍品类型 | — |

### 2.2 API 与 Arena 层

| 文件 | 职责 |
|------|------|
| `api/ops.py` | 参赛端 + 组织端：提交决策、出价、推进阶段、查状态 |
| `api/practice.py` | 练习赛入口：`start_ops_practice` |

---

## 三、调用关系图

```
ops.py / practice.py
    ↓
创建 ArenaMatch + OpsTeamState
    ↓
定位阶段 positioning：提交 OpsProductCard
    ↓
自动进入 R1 → 提交运营决策 OpsSubmission
    ↓
组织者/练习赛自动 advance()
    ↓
settle.settle_ops_round()
    ↓
1. 确保 AI 已提交
2. 组装 match_state + decisions
3. 调用 engine.settle_round()
4. 写回 OpsTeamState + OpsSnapshot
5. 推进阶段
    ↓
R2 结算后 → auction.create_auction_items()
    ↓
拍卖阶段：place_bid → settle_auction
    ↓
更新 team_state（factories/ads/discount）
    ↓
R3 → R4 → finished → final_ranking()
```

---

## 四、功能实现详解

### 4.1 比赛创建与初始化

1. 创建 `ArenaMatch`，初始 `ops_phase = positioning`。
2. 初始化每队 `OpsTeamState`：
   - 现金 `cash = 100000`
   - 净资产 `net_assets = 100000`
   - AI 策略循环分配：`balanced / aggressive / conservative`
3. 进入定位阶段，等待提交产品卡。

### 4.2 比赛阶段状态机

```
positioning
    ↓ 收齐产品卡
operation_round_1 → settlement_1
    ↓
operation_round_2 → settlement_2
    ↓
auction（英式拍卖）
    ↓ 拍卖结算
operation_round_3 → settlement_3
    ↓
operation_round_4 → settlement_4
    ↓
finished
```

### 4.3 产品定位

`OpsProductCard`：

```python
{
    "category": "electronics" | "fast_moving" | "home",
    "target_segment": "geek" | "pragmatic" | "show",
    "product_name": str
}
```

### 4.4 每回合运营决策

`SubmitDecisionRequest`：

```python
{
    "production_quantity": int,      # 生产数量
    "unit_price": float,             # 单价
    "marketing_spend": float,        # 营销投入
    "rnd_spend": float,              # 研发投入
    "sales_force": int,              # 销售人员（0-10）
    "target_cities": list[str]       # 目标城市（最多3个）
}
```

预算约束：总支出 ≤ 当前现金。

### 4.5 结算流程

`settle_ops_round()`：

1. 确保所有 AI 已提交决策。
2. 从数据库组装 `team_states` + `decisions` + `match_state`。
3. 调用 `engine.settle_round()` 纯函数计算。
4. 写回数据库：
   - 更新 `OpsTeamState`：现金、库存、净资产、累计利润、属性、已开城市
   - 创建 `OpsSnapshot`：完整财务报表
5. 推进比赛阶段。

### 4.6 拍卖机制

**拍品类型**：

| 类型 | 例子 | 效果 |
|------|------|------|
| production | 标准/高端生产线 | 产能 + 品质 |
| advertising | 城市广告位 | 该城 show 属性 ×1.2 |
| discount | 原材料供应合同 | 原材料成本折扣 |

**规则**：

- R2 结算后系统自动创建拍品。
- `place_bid()`：出价必须高于当前最高价，且 ≤ 队伍现金。
- `settle_auction()`：最高价者获胜，扣现金，应用效果。

### 4.7 AI 决策

**运营决策**（按策略）：

| 策略 | 生产比例 | 营销比例 | 研发比例 | 定价 |
|------|---------|---------|---------|------|
| aggressive | 35% | 30% | 20% | 0.9×基准 |
| conservative | 25% | 15% | 30% | 1.1×基准 |
| balanced | 30% | 25% | 20% | 1.0×基准 |

**拍卖出价**：

```
估值 = base_price × max_mult × random(0.9, 1.1)
aggressive: max_mult=1.1
conservative: max_mult=0.6
balanced: max_mult=0.8

若当前价 ≥ 估值 或 当前价 ≥ 现金×60%：放弃
否则：出价 = current_price + max(5%×base_price, 500)，上限 min(估值, 现金×50%)
```

---

## 五、数学建模详解

### 5.1 生产与产能

**最大产能**：

```
max_production = base_capacity
                 + Σ capacity_bonus from factories
                 + sales_force × worker_productivity

默认值：base_capacity=200, worker_productivity=20
```

**实际产量**：

```
actual_prod = min(production_quantity, max_production)
```

**单位成本**：

```
unit_cost = raw_material + labor + overhead

raw_material = base_material_cost × material_cost_multiplier × (1 - discount_rate)
labor = base_labor_cost
overhead = base_overhead / max(actual_production, 1)
```

### 5.2 市场份额（核心 Softmax 模型）

**产品得分**：

```
score = w_tech × tech + w_fit × fit + w_show × show
        - 10 × (unit_price / avg_price) / price_sensitivity
```

- `w_tech, w_fit, w_show` 由城市主导客群决定。
- `avg_price` 是本回合所有队伍定价的平均值。

**市场份额**：

```
share_i = exp(beta × (score_i - max_score)) / Σ_j exp(beta × (score_j - max_score))

默认 beta = 2.0
```

**销量**：

```
market_demand_i = share_i × city_market_size
sales_i = min(market_demand_i, actual_prod + inventory)
```

### 5.3 财务结算

**收入与成本**：

```
revenue = sales × unit_price
cogs = sales × unit_cost
gross_profit = revenue - cogs
```

**运营费用**：

```
operating_expenses = marketing + rnd
                     + sales_force × wage
                     + fixed_overhead
                     + opening_fees
```

- `wage`：默认 1500/人。
- `opening_fees`：新城市开城费，按城市 tier 乘以系数（1线×2.0, 2线×1.5, 3线×1.0, 4线×0.6）。

**库存持有成本**：

```
ending_inventory = max(0, prev_inventory + actual_prod - sales)
holding_cost = ending_inventory × holding_cost_per_unit   # 默认 2
```

**净利润**：

```
operating_profit = gross_profit - operating_expenses - holding_cost
net_profit = operating_profit
```

**属性提升**：

```
tech += rnd_spend × tech_conversion_rate       # 默认 0.001
show += marketing_spend × show_conversion_rate  # 默认 0.0008
```

### 5.4 现金更新

```
cash = cash
       - raw_spend（原材料支出）
       - opening_fees
       - marketing
       - rnd
       - sales_force × wage
       + revenue
       - cogs
       - holding_cost
```

### 5.5 随机事件

触发条件：回合数 ≥ 3，50% 概率。

事件效果示例：

| 事件 | 效果 |
|------|------|
| 消费降级 | show 偏好 -0.05，价格敏感度 +0.05 |
| 原材料涨价 | 原材料成本 ×1.15 |
| 政策补贴 | 随机城市开城费减半 |

### 5.6 最终排名

```
final_score = net_assets × 0.70 + cumulative_profit × 0.30
```

按 `final_score` 降序排名。

---

## 六、关键配置参数（`ops-sim-v1.yaml`）

| 参数 | 典型值 | 含义 |
|------|--------|------|
| `initial_capital` | 100000 | 初始现金 |
| `base_capacity` | 200 | 基础产能 |
| `worker_productivity` | 20 | 每名销售产能加成 |
| `wage_per_head` | 1500 | 销售工资 |
| `holding_cost_per_unit` | 2 | 库存持有成本 |
| `fixed_overhead` | 3500 | 固定管理费用 |
| `beta` | 2.0 | Softmax 温度系数 |
| `tech_conversion_rate` | 0.001 | 研发→技术转化率 |
| `show_conversion_rate` | 0.0008 | 营销→展示转化率 |

---

## 七、扩展与修改建议

| 想做的事 | 应改的文件 |
|----------|-----------|
| 新增产品品类 | `ops-sim-v1.yaml` + `enums.py` |
| 调整市场份额公式 | `engine.py:_compute_score`, `_softmax` |
| 新增拍品类型 | `ops-sim-v1.yaml` + `auction.py` |
| 调整事件系统 | `ops-sim-v1.yaml` + `engine.py:_maybe_trigger_event` |
| 调整 AI 策略 | `ai.py` |
| 修改最终排名权重 | `settle.py:final_ranking` |

---

## 八、与 AI 沟通关键词

| 你想说的 | 关键词 |
|---------|--------|
| 回合制产销 | "turn-based ops simulation, production + pricing" |
| 市场份额 | "softmax discrete choice, product score" |
| 英式拍卖 | "English auction, ascending bid" |
| 产能扩张 | "max production, factory capacity bonus" |
| 随机事件 | "event state, material cost shock" |
| 净资产排名 | "net assets + cumulative profit weighted ranking" |

---

## 最后更新

2026-06-14
