# TechVenture 引擎指南

> 引擎标识：`engine: techventure` · 配置文件：`content/game-configs/techventure-v1.yaml` · 路径：`webapp/backend/app/games/techventure/`
> 玩法形态：**回合制科技公司竞争**，团队通过研发、用户匹配、品牌营销三属性争夺市场注意力。

---

## 一、引擎定位与核心体验

TechVenture 是一个**回合制、离散决策、基于 Softmax 市场份额**的科技创业模拟器。

- **时间轴**：比赛分为固定轮数（默认 6 轮）。
- **玩家目标**：通过资源分配提升 Tech/Fit/Show 三属性，争夺消费者注意力。
- **核心策略**：
  - 选择战略路线（TECH / USER / BRAND / PATHFINDER）
  - 选择开放城市
  - 分配预算到研发、用户匹配、品牌营销
  - 撰写宣言获取 BQI 加成
- **竞争感**：每轮结算后公布排名，后期轮次权重更高。

---

## 二、代码结构与核心文件

### 2.1 引擎层（`games/techventure/`）

| 文件 | 职责 | 关键函数/类 |
|------|------|------------|
| `v6_engine.py` | **核心结算引擎**：所有数学公式、属性增长、市场份额、排名 | `settle_round`, `_compute_tech_growth`, `_compute_fit_growth`, `_compute_show_growth`, `_compute_bqi` |
| `settle.py` | **DB 结算编排**：读表、构造输入、调用引擎、写回结果 | `settle_tv_round` |
| `ai_team.py` | **AI 队伍决策**：纯规则生成 AI 每轮决策 | `generate_ai_decision` |
| `practice_flow.py` | **练习赛流程**：自动为 AI 生成决策并结算 | `run_ai_decisions_and_settle` |
| `config.py` | **配置工具**：增长率查表、投入过载衰减、Softmax | `growth_rate`, `tech_i_eff`, `softmax` |
| `models.py` | **ORM 模型**：`TvTeamState`, `TvRound`, `TvSubmission`, `TvSnapshot`, `TvNews` | — |
| `enums.py` | 枚举：路线、城市、事件、新闻类型 | — |

### 2.2 API 与 Arena 层

| 文件 | 职责 |
|------|------|
| `api/techventure.py` | 参赛端：提交决策、查状态 |
| `api/techventure_admin.py` | 组织端：创建队伍、开关轮次、结算 |
| `api/practice.py` | 练习赛入口：`start_techventure_practice` |

---

## 三、调用关系图

```
practice.py / techventure_admin.py
    ↓
创建 ArenaMatch + ArenaTeam + TvTeamState
    ↓
开启第一轮 TvRound(round_no=1, status=open)
    ↓
玩家提交决策 → techventure.py:submit_decision()
    ↓
练习赛：practice_flow.run_ai_decisions_and_settle()
正式赛：组织者调用 settle_current_round()
    ↓
settle.settle_tv_round()
    ↓
1. 读取 TvTeamState + TvSubmission
2. 构造 SettlementContext
3. 调用 v6_engine.settle_round()
4. 写回 TvSnapshot / TvTeamState / TvNews
5. 创建下一轮 TvRound
```

---

## 四、功能实现详解

### 4.1 比赛创建与初始化

1. 创建 `ArenaMatch`（`game_type=techventure`）。
2. 创建玩家队伍 + 5 支 AI 队伍。
3. 每队初始化 `TvTeamState`：
   - 路线：玩家默认 `TECH`，AI 循环分配
   - 城市：南京
   - 属性：`tech=2.0, fit_by_city={三城:2.0}, show_by_city={三城:2.0}`
   - 预算：`budget=100`
4. 创建 `TvRound(round_no=1, status=open)`。

### 4.2 回合推进流程

```
pending → open → settled → open → settled → ... → finished
```

- 练习赛：玩家提交后自动触发 AI 决策 + 结算 + 开下一轮。
- 正式赛：组织者手动 `open_round()` 和 `settle_current_round()`。

### 4.3 玩家每轮决策

`SubmitDecisionRequest`：

```python
{
    "route": "TECH" | "USER" | "BRAND" | "PATHFINDER",
    "opened_cities": ["南京", "杭州"],
    "invest_tech": float,
    "invest_fit_by_city": {"南京": float, "合肥": float, "杭州": float},
    "invest_show_by_city": {"南京": float, "合肥": float, "杭州": float},
    "declaration": str
}
```

预算约束：

```
总投入 + 路线切换费(5) + 城市扩张费(10×新城市数) ≤ budget
```

### 4.4 AI 队伍决策

`ai_team.generate_ai_decision()` 纯规则：

1. 15% 概率切换路线。
2. 40% 概率扩张城市（需预算 ≥ 20）。
3. 按策略分配预算：
   - Tech：25%-50%
   - Fit：30%-60%（剩余部分）
   - Show：剩余
4. 宣言从 6 条模板随机选。

### 4.5 结算流程

`settle_tv_round()`：

1. 读取所有队伍状态和提交。
2. 构造 `SettlementContext`。
3. 调用 `v6_engine.settle_round()` 纯函数计算。
4. 写回数据库：
   - `TvSnapshot`：每队每轮完整结果
   - `TvTeamState`：更新属性、预算、排名
   - `TvNews`：新闻事件
5. 若未满最后一轮，创建下一轮。

---

## 五、数学建模详解

### 5.1 城市消费者结构

`techventure-v1.yaml` 定义三城的客群比例：

| 城市 | Geek | Pragmatic | Trendy | 规模系数 |
|------|------|-----------|--------|----------|
| 南京 | 12% | 58% | 30% | 1.00 |
| 合肥 | 18% | 30% | 52% | 0.85 |
| 杭州 | 25% | 42% | 33% | 1.15 |

客群偏好权重：

| 客群 | Tech | Fit | Show |
|------|------|-----|------|
| Geek | 0.55 | 0.30 | 0.15 |
| Pragmatic | 0.22 | 0.60 | 0.18 |
| Trendy | 0.18 | 0.22 | 0.60 |

### 5.2 属性增长公式

#### Tech 增长

```
g(v) = 增长率查表（v 越高增长越慢）
       v≤2:1.20, v≤4:1.08, v≤5.5:0.95, ..., v≤12:0.02

i_tech_eff = 投入经过载衰减后的有效值
            ≤20:全额, ≤30:×0.80, ≤45:×0.50, ≤65:×0.30, >65:×0.15

delta_tech = g(tech) × sqrt(i_tech_eff / 10) × r_tech × m_crowd × f_bonus
```

- `r_tech`：路线加成（TECH:1.25，其他:1.00）。
- `m_crowd`：PATHFINDER 独占红利。
- `f_bonus`：Fit 阈值奖励（某城 fit 达标 +5%/+8%）。

#### Fit 增长

```
b_fit = max(0, 1 - (rank-1)/k)   # 同城投入排名越高越大
eta_fit = 城市效率（南京1.10, 合肥0.90, 杭州1.00）

delta_fit = g(fit) × (0.5×sqrt(inv_fit/10) + 0.5×b_fit)
            × r_fit × m_crowd × eta_fit × 2.0
```

#### Show 增长

```
b_show = max(0, 2.5 - 2.5×(rank-1)/k)   # Show 排名奖励
halo = 1 + 0.10 × (show_max - curr_show)/show_max  # 强城带动弱城
eta_show = 城市效率（南京0.90, 合肥1.15, 杭州1.00）

delta_show = g(show) × (0.9×b_show + 0.1×sqrt(inv_show/5))
             × halo × r_show × m_crowd × eta_show
```

属性上限：`a_hard = 12.0`。

### 5.3 市场份额与注意力

#### 效用函数

```
U = (w_tech × tech_after × tau_tech + w_fit × fit_after + w_show × show_after)
    × crowd_tax
```

- `tau_tech`：城市技术折扣（南京0.85, 合肥0.90, 杭州1.00）。
- `crowd_tax`：路线拥挤税，同路线队伍越多惩罚越大。

#### Softmax 份额

```
share_team = exp(beta × U_team) / Σ exp(beta × U_all)
beta = 0.5
```

#### 可触达上限

```
ceiling = min(0.95, base × maturity + crowd_lift + show_lift)
base = 0.10 + 0.10 × avg_quality
maturity = 0.70 + 0.30 × (k-1)/(N-1)
crowd_lift = 0.10 × (k-1)/(N-1)
show_lift = 0.18 × (1 - exp(-sum_show_inv/30))
```

#### 原始注意力

```
attention_raw = share × ceiling × 100 × market_scale
```

### 5.4 回合总分

```
total_raw = raw_attention + momentum + hotpulse

momentum = 0.4 × 上轮排名基数   # 第1名0.6, 第2名0.3, 第3名+0.1
hotpulse = BRAND 路线专属爆款奖励
```

### 5.5 BQI（品牌质量指数）

```
bqi_raw = 1.0 + Σ delta
bqi = clamp(bqi_raw, 0.60, 1.20)
```

主要规则：

| 条件 | delta |
|------|-------|
| Tech 末 4 位 | -0.10 |
| Fit 投入末 4 位 | -0.10 |
| 营销过度（Show最高城 > Tech+2） | -0.15 |
| 三项全能（Tech/Fit/Show 均前 1/3） | +0.12 |
| 宣言命中方向 | +0.04~+0.09 |
| 宣言含愿景关键词 | +0.03 |
| 宣言与投入偏差 | -0.03 |

### 5.6 最终有效注意力

```
eff_attention = total_raw × bqi × (1 + noise)
noise ~ Uniform(-0.05, +0.05)
```

### 5.7 轮次权重与最终排名

```
round_weights = [0.08, 0.10, 0.14, 0.18, 0.22, 0.28]
weighted_total = Σ eff_attention × round_weight
```

最终按 `weighted_total` 降序排名。越往后轮次越重要。

### 5.8 预算结转

```
reserved = budget - 总投入
interest = reserved × 0.15
follow_on = 根据排名追加投资（第1名最多15）
next_budget = reserved + interest + 20(每轮津贴) + follow_on
```

---

## 六、关键配置参数（`techventure-v1.yaml`）

| 参数 | 典型值 | 含义 |
|------|--------|------|
| `rounds` | 6 | 总轮数 |
| `seed_budget` | 100 | 初始预算 |
| `route_switch_cost` | 5 | 路线切换费 |
| `city_open_cost` | 10 | 单城开拓费 |
| `a_hard` | 12 | 属性硬上限 |
| `beta` | 0.5 | Softmax 温度 |
| `round_weights` | [0.08,0.10,0.14,0.18,0.22,0.28] | 轮次权重 |

---

## 七、扩展与修改建议

| 想做的事 | 应改的文件 |
|----------|-----------|
| 新增城市 | `techventure-v1.yaml` + `v6_engine.py` 城市相关硬编码 |
| 调整属性增长曲线 | `config.py:growth_rate` + `v6_engine.py` |
| 新增路线 | `enums.py` + `v6_engine.py` 路线加成 |
| 调整 BQI 规则 | `v6_engine.py:_compute_bqi` |
| 新增随机事件 | `techventure-v1.yaml` + `v6_engine.py:_build_city_shift` |
| 调整轮次权重 | `techventure-v1.yaml` |

---

## 八、与 AI 沟通关键词

| 你想说的 | 关键词 |
|---------|--------|
| 回合制推进 | "turn-based settlement, open_round + settle" |
| 三属性竞争 | "tech/fit/show attributes, softmax market share" |
| 战略路线 | "route strategy, TECH/USER/BRAND/PATHFINDER" |
| 品牌质量 | "BQI, declaration alignment" |
| 注意力经济 | "attention score, effective attention" |
| 后期轮次更重要 | "round weights increasing" |

---

## 最后更新

2026-06-14
