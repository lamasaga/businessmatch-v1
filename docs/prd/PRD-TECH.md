# TECH 引擎 PRD · 创想大赢家 / TechVenture

> **引擎简称**：TECH（创想大赢家 / TechVenture）
> **引擎 ID**：`techventure`
> **配置 ID**：`techventure-v1`
> **版本**：`1.0.0`
> **运行时**：`react-game`
> **设计模式**：`standalone`
> **最后更新**：2026-06-15

---

## 1. 元信息

| 字段 | 值 |
|------|-----|
| **引擎中文名** | 创想大赢家 |
| **引擎英文名** | TechVenture |
| **引擎 ID** | `techventure` |
| **配置包 ID** | `techventure-v1` |
| **版本** | `1.0.0` |
| **设计模式** | `standalone` |
| **运行时类型** | `react-game`（策略面板/表格，无地图） |
| **表前缀** | `tv_` |
| **后端路由前缀** | `/api/v1/techventure`（参赛端）· `/api/v1/techventure/admin`（组织端） |
| **前端路由** | `/games/:id/techventure` |
| **单局时长** | 30~50 分钟 |
| **队伍数量** | 4~20 队常规，扩展至 40 队 |
| **每队人数** | 2~6 人 |
| **标准轮次** | 4 轮决策 + 结算 |

---

## 2. 产品定位

### 2.1 一句话玩法

**4 轮策略商赛——三城布局、四线择一、三维投入、BQI 评分**：每支队伍经营一款科技产品，在「南京·合肥·杭州」三城中选择战略布局路线（技术驱动 / 用户深耕 / 品牌传播 / 破局奇兵），每轮将预算分配到 Tech（研发）、Fit（用户匹配）、Show（品牌展示）三个维度，最终以**加权累计市场声量**排名决胜负。

### 2.2 核心教育目标

| # | 能力 | 说明 |
|---|------|------|
| 1 | **战略路线选择与取舍** | 理解四种商业模式路线的差异与适用场景 |
| 2 | **资源分配与投入产出** | 在预算约束下权衡 Tech/Fit/Show 的投入比例 |
| 3 | **市场竞争与博弈** | 通过 Softmax 份额机制感受竞争动态与拥挤效应 |
| 4 | **宣言-行动一致性** | 产品宣言与资金分配的方向匹配获得 BQI 奖励 |
| 5 | **多城布局决策** | 理解不同城市的客群结构与规模差异 |
| 6 | **风险与不确定性** | 随机噪声、突发事件对结果的影响 |

### 2.3 目标受众

| 维度 | 说明 |
|------|------|
| **目标年龄** | 14~22 岁 |
| **适合学段** | 高中、国际高中、大学低年级 |
| **单场人数** | 4~20 队常规，可扩展至 40 队 |
| **每队人数** | 2~6 人 |
| **决策类型** | 回合制策略 + 资源分配 + 宣言撰写 |

### 2.4 单局节奏

```
┌─────────────────────────────────────────────────────────────────┐
│  0:00  开幕 + 规则讲解 + 组队/角色分配 + 产品起名                  │
│  0:10  R1 开放决策（8 分钟）                                      │
│  0:20  R1 结算 + 新闻播报（2 分钟）                               │
│  0:25  R2 开放决策（8 分钟）                                      │
│  0:35  R2 结算 + 新闻播报                                         │
│  0:40  R3 开放决策（8 分钟）← 可能触发突发事件                      │
│  0:50  R3 结算 + 新闻播报                                         │
│  0:55  R4 开放决策（8 分钟）                                      │
│  1:05  R4 最终结算 + 颁奖 + 复盘                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 核心循环

### 3.1 流程图

```
创建 match
  ├── 读取 techventure-v1.yaml
  ├── 合并覆盖参数
  ├── 创建 ArenaMatch
  └── 创建 ArenaTeam（真人队 + AI 队）
      └── 初始化 TvTeamState（预算、属性、城市）
      ↓
玩家加入（正式赛）
  └── 输入房间码 → 选择队伍 → 设置产品名
      ↓
组织者开赛
  ├── 校验组队完成
  ├── match.status = playing
  └── 不自动开轮（组织者手动开放 R1）
      ↓
R1~R4 循环
  ├── 组织者开放轮次（可选择 R3 事件）
  ├── 玩家决策（路线 + 城市 + 资金分配 + 宣言）
  ├── 练习赛：玩家提交后自动触发 AI 决策 + 结算
  ├── 正式赛：组织者手动结算
  ├── 结算引擎执行（Step 0-9）
  ├── 生成新闻、更新排名
  └── 资金结转（剩余 + 利息 + 津贴 + follow_on）
      ↓
最终结算
  ├── 按 weighted_total 排名
  ├── settle_match_rewards()
  └── match.status = finished
```

### 3.2 状态机

| 状态 | 说明 | 可执行操作 |
|------|------|-----------|
| `draft` | 刚创建 | 组织者配置、创建队伍 |
| `registration` | 开放加入 | 玩家输入房间码加入、选队 |
| `playing` | 比赛中 | 提交决策、查看状态 |
| `finished` | 比赛结束 | 查看结果、复盘、排行榜 |

### 3.3 轮次状态机

| 状态 | 说明 | 触发条件 |
|------|------|----------|
| `pending` | 待开放 | 轮次尚未开始 |
| `open` | 开放决策 | 组织者点击「开放下一轮」 |
| `settled` | 已结算 | 组织者点击「结算」或练习赛自动结算 |

---

## 4. 决策设计

### 4.1 每轮决策内容

每支队伍每轮提交一张**决策表**，包含以下字段：

| 决策项 | 英文名 | 类型 | 说明 |
|--------|--------|------|------|
| **战略路线** | `route` | enum | `TECH` / `USER` / `BRAND` / `PATHFINDER` |
| **开拓城市** | `opened_cities` | list[str] | 选择布局的城市（最多 3 城：南京、合肥、杭州） |
| **Tech 研发** | `invest_tech` | float | 技术研发投入（万） |
| **Fit 用户匹配** | `invest_fit_by_city` | dict[str, float] | 按城的用户调研/体验投入 |
| **Show 品牌展示** | `invest_show_by_city` | dict[str, float] | 按城的品牌/营销投入 |
| **产品宣言** | `declaration` | string | ≤60 字的策略宣言 |

**决策表 Schema**：

```json
{
  "route": "TECH",
  "opened_cities": ["南京", "杭州"],
  "invest_tech": 15.0,
  "invest_fit_by_city": { "南京": 8.0, "杭州": 5.0 },
  "invest_show_by_city": { "南京": 3.0, "杭州": 4.0 },
  "declaration": "我们将以技术创新驱动产品突破，关注用户需求与体验。"
}
```

### 4.2 费用计算

```
total_cost = invest_tech + sum(invest_fit) + sum(invest_show)
           + route_switch_cost（若切换路线）
           + city_expand_cost × 新开拓城市数

校验：total_cost ≤ budget + 0.01
```

| 费用项 | 默认值 | 说明 |
|--------|--------|------|
| 路线切换成本 | 5 万 | 若本轮路线与上轮不同 |
| 城市开拓成本 | 10 万/城 | 首次进入某城市一次性费用 |

### 4.3 四路线说明

| 路线 | 标签 | 核心加成 | 特殊机制 |
|------|------|----------|----------|
| **TECH** | 技术驱动型 | Tech 增长率 ×1.25，Tech 投入 ×1.30 | 技术壁垒路线 |
| **USER** | 用户深耕型 | Fit 增长率 ×1.20 | Fit 阈值奖励门槛更低（t1=4.5, t2=6.5） |
| **BRAND** | 品牌传播型 | Show 增长率 ×1.25 | 可触发 Hot Pulse（热度脉冲） |
| **PATHFINDER** | 破局奇兵 | 无属性加成 | 独占红利曲线：1队×1.285 → 人多衰减至×0.30 |

### 4.4 产品宣言机制

宣言文本通过关键词匹配与投入结构校验，影响 BQI（品牌质量指数）：

- **关键词库**：`tech`（技术/研发/算法…）、`fit`（用户/体验/场景…）、`show`（品牌/营销/展示…）、`vision`（愿景/使命/未来…）
- **方向奖励**：宣言提到某方向 + 该方向投入占比达标 → BQI 加成
- **三重命中**：+0.09，**双重命中**：+0.06，**单一命中**：+0.04
- **愿景 bonus**：命中 vision 关键词 +0.03
- **偏差惩罚**：口号喊得响但投入不足 → -0.03

### 4.5 校验规则

1. `route` 必须为四路线之一
2. `opened_cities` 必须为已布局城市子集 + 新开拓城市
3. 所有投入之和 + 切换成本 + 开拓成本 ≤ 当前预算
4. `declaration` ≤ 60 字
5. 每队每轮只能提交一次决策

---

## 5. 结算规则

### 5.1 结算函数签名

```python
def settle_round(
    ctx: SettlementContext,
    config_id: str = "techventure-v1",
) -> dict[str, Any]:
    """v6.0 结算主函数。纯函数、幂等、不读写数据库。
    返回 SettlementOutput，包含 results、city_pies、news。
    """
```

### 5.2 九步结算流程

#### Step 0：准备
- 读取 YAML 配置
- 统计各路线队伍数
- 计算全场 Tech 投入排名、Fit 总投入排名
- 计算各城 Fit/Show 投入排名

#### Step 1~3：属性增长

**Tech 增长**：
```
g_tech = growth_rate(current_tech)  # 查表：2.0→1.20, 4.0→1.08... 12.0→0.02
i_tech_eff = tech_i_eff(invest_tech × boost)  # 过载衰减分段积分
f_bonus = 1 + fit_threshold_bonus_sum()  # Fit 达标城市奖励
m_crowd = pathfinder_m_crowd(n) if PATHFINDER else 1.0  # 独占红利
delta_tech = g_tech × √(i_tech_eff / 10) × r_tech × m_crowd × f_bonus
tech_after = clamp(tech + delta_tech, 0, a_hard=12)
```

**Fit 增长（按城）**：
```
g_fit = growth_rate(current_fit)
b_fit = max(0, 1 - (rank - 1) / k)  # 投入排名奖励
delta_fit = g_fit × (0.5×√(inv_fit/10) + 0.5×b_fit) × r_fit × m_crowd × eta_fit × 2.0
fit_after = clamp(fit + delta_fit, 0, 12)
```

**Show 增长（按城）**：
```
halo = 1 + 0.10 × (show_max - current_show) / show_max  # 短板补强光环
g_show = growth_rate(current_show)
b_show = max(0, 2.5 - 2.5×(rank - 1)/k)  # 排名奖励，上限 2.5
delta_show = g_show × (0.9×b_show + 0.1×√(inv_show/5)) × halo × r_show × m_crowd × eta_show
show_after = clamp(show + delta_show, 0, 12)
```

#### Step 4~6：城市份额、Ceiling、Attention

**消费者群体占比**（可能受 R3 事件偏移）：
```
南京: geek=0.12, pragmatic=0.58, trendy=0.30
合肥: geek=0.18, pragmatic=0.30, trendy=0.52
杭州: geek=0.25, pragmatic=0.42, trendy=0.33
```

**效用计算**（Softmax）：
```
对每个客群：
  utility = w_tech×tech_after×tau_tech + w_fit×fit_after + w_show×show_after
  crowd_tax = max(0, 1 - rcu×(route_count - 1)/(N - 1))  # 路线拥挤税
  最终效用 = utility × crowd_tax

raw_share_by_group = softmax(beta=0.5, utilities)
raw_share = Σ(group_share × group_weight)
```

**Ceiling（可触达上限）**：
```
avg_q = 同城各队 (tech+fit+show)/3 的平均
sum_show_inv = 同城 Show 投入总和
base = 0.10 + 0.10×avg_q
maturity = 0.70 + 0.30×(k-1)/(N-1)
crowd_lift = 0.10×(k-1)/(N-1)
show_lift = 0.18×(1 - exp(-sum_show_inv/30))
ceiling = min(0.95, base×maturity + crowd_lift + show_lift)
```

**Attention Raw**：
```
slice = raw_share × ceiling
attention_raw = slice × 100 × market_scale
```

#### Step 7：Momentum、Hot Pulse、Total Raw

```
momentum = 0 (R1) else 0.4 × base_momentum[last_rank]
  # base_momentum: 第1名=0.6, 第2名=0.3, 第3名=0.1

hotpulse (仅 BRAND 路线):
  sum_show_delta ≥ 0.5 → +0.5 "上了本地热搜"
  sum_show_delta ≥ 1.5 → +1.2 "登上全国热榜"
  sum_show_delta ≥ 2.5 → +2.0 "现象级爆款全网刷屏"
  sum_show_delta ≥ 4.5 → +2.5 "超级爆款连续霸榜"

total_raw = attention_raw + momentum + hotpulse
```

#### Step 8：BQI + Noise → EffAttention

**BQI（品牌质量指数）规则**：

| 规则 | 触发条件 | 默认 delta |
|------|----------|-----------|
| `techLastThird` | Tech 排名末 4 位 | -0.10 |
| `fitLastThird` | Fit 投入排名末 4 位 | -0.10 |
| `marketingOver` | 某城 Show 最高且 Show > Tech + 2 | -0.15（合规事件×1.5） |
| `allRound` | Tech/Fit/Show 均进前 1/3 | +0.12 |
| `declarationReward` | 宣言方向与投入匹配 | +0.04~+0.09 |
| `declarationDeviation` | 宣言方向与投入偏差 | -0.03 |

```
bqi_raw = 1.0 + Σ(delta)
bqi = clamp(bqi_raw, 0.60, 1.20)
noise = uniform(-0.05, +0.05)
eff_attention = total_raw × bqi × (1 + noise)
```

#### Step 9：排名、加权累计、Follow-on

```
按 eff_attention 降序排名
weight = round_weights[round_no]  # R1=0.15, R2=0.20, R3=0.25, R4=0.40
weighted_round_score = eff_attention × weight
weighted_total += weighted_round_score
attention_total += eff_attention

follow_on_next_round = max(3, 15 - rank)  # 第1名=14, 第10名=3
```

### 5.3 资金结转

```
reserved = budget - total_spent  # 本轮剩余
interest = reserved × 0.15       # 资金利息
allowance = 20                   # 每轮固定津贴
follow_on = max(3, 15 - rank)    # 排名奖励（最后一轮为 0）

next_round_budget = reserved + interest + allowance + follow_on
```

### 5.4 最终排名

比赛结束时按 `weighted_total` 降序排名：

```
总得分 = Σ(eff_attention_r × round_weight_r)
```

---

## 6. AI 对手

### 6.1 AI 配置

| 字段 | 默认值 |
|------|--------|
| 练习赛 AI 数量 | `practice_ai_count = 5` |
| AI 策略 | 统一纯规则策略（无档位区分） |

### 6.2 AI 决策规则

```python
def generate_ai_decision(state, round_no):
    # 15% 概率切换路线（R2 起）
    route = random_switch(0.15) if round_no >= 2 else current_route

    # 40% 概率开拓新城（R2 起，预算足够）
    new_cities = random_expand(0.40) if round_no >= 2 else []

    # 预算分配
    tech_pct = random.uniform(0.25, 0.50)
    fit_total_pct = random.uniform(0.3, 0.6)
    # 剩余平分到各城 Fit/Show
```

**AI 行为特征**：
- 随机分配 Tech/Fit/Show 投入比例
- 随机选择是否切换路线、开拓新城
- 宣言从 6 条模板中随机选择
- 无复杂策略计算，提供基础竞争扰动

---

## 7. 状态与数据

### 7.1 数据库表

#### 通用 Arena 表

复用 `competition_events`、`competition_participants`、`arena_teams`。

#### TECH 运行时表

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `tv_team_states` | 队伍运行时状态 | `id`, `team_id`, `event_id`, `route`, `home_city`, `opened_cities`, `tech`, `fit_by_city`, `show_by_city`, `budget`, `weighted_total`, `attention_total`, `last_rank` |
| `tv_rounds` | 轮次状态 | `id`, `event_id`, `round_no`, `status`, `event_id_r3`, `opened_at`, `settled_at` |
| `tv_submissions` | 每轮决策提交 | `id`, `round_id`, `team_id`, `route`, `opened_cities`, `invest_tech`, `invest_fit_by_city`, `invest_show_by_city`, `declaration`, `switch_cost_paid`, `expand_cost_paid` |
| `tv_snapshots` | 结算快照 | `id`, `round_id`, `team_id`, `result_json` |
| `tv_news` | 结算新闻 | `id`, `round_id`, `kind`, `headline`, `body`, `team_ids` |

### 7.2 队伍运行时状态

```json
{
  "team_id": 1,
  "route": "TECH",
  "home_city": "南京",
  "opened_cities": ["南京", "杭州"],
  "tech": 5.32,
  "fit_by_city": { "南京": 4.10, "合肥": 2.00, "杭州": 3.85 },
  "show_by_city": { "南京": 3.20, "合肥": 2.00, "杭州": 2.95 },
  "budget": 87.5,
  "weighted_total": 45.20,
  "attention_total": 128.50,
  "last_rank": 3
}
```

### 7.3 API 端点

#### 参赛端（`/api/v1/techventure`）

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/events/{event_id}/lobby` | 大厅：队伍列表、本人所在队伍 |
| POST | `/events/{event_id}/join-team` | 选择/切换队伍 |
| GET | `/events/{event_id}/state` | 获取完整状态（轮次、快照、配置） |
| GET | `/events/{event_id}/poll` | 轻量轮询（预算、排名、提交状态） |
| POST | `/events/{event_id}/profile` | 设置产品名 |
| POST | `/events/{event_id}/submit` | 提交本轮决策 |
| GET | `/events/{event_id}/leaderboard` | 公开排行榜 |
| GET | `/events/{event_id}/news` | 获取所有新闻 |

#### 组织端（`/api/v1/techventure/admin`）

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/events/{event_id}/state` | 组织者完整状态 |
| POST | `/events/{event_id}/teams` | 批量创建队伍 |
| PATCH | `/events/{event_id}/teams/{team_id}` | 更新队伍信息 |
| POST | `/events/{event_id}/start` | 开始比赛（结束报名） |
| POST | `/events/{event_id}/rounds/open` | 开放下一轮 |
| POST | `/events/{event_id}/rounds/settle` | 结算当前轮 |
| GET | `/events/{event_id}/screen` | 大屏投影数据 |
| GET | `/judge/events/{event_id}/state` | 评委视角详细快照 |

#### 练习赛（`/api/v1/practice`）

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/techventure/start` | 创建 TechVenture 日常练习 |

### 7.4 大规模参赛设计（15~40 支队伍）

| 设计点 | 说明 |
|--------|------|
| **结算复杂度** | Softmax O(n) 每城，3 城 × 3 客群 = 9 次，40 队约 < 10ms |
| **数据库设计** | 每轮每队一条 `tv_submissions` + `tv_snapshots`，4 轮 × 40 队 = 160 行/表 |
| **并发提交** | 决策提交各自写入，无锁竞争 |
| **结算锁** | 仅 `settle` 时锁定，锁持有 < 200ms |
| **前端展示** | 排行榜 Top 6 + "我的排名"，新闻按轮次分页 |
| **练习赛自动推进** | 玩家提交后自动触发 AI 决策 + 结算，响应 < 500ms |

---

## 8. 前端局内

### 8.1 运行时选型

TECH 选择 **`react-game`** 运行时，因为：
- 玩法以面板决策、数据展示为主
- 无需地图/实时空间移动
- 需要展示 KPI 卡片、排行榜、新闻、历史快照
- 三栏布局（左：战略选择 / 中：概览反馈 / 右：排行榜+新闻）

### 8.2 组件清单

| 组件 | 路径 | 状态 | 说明 |
|------|------|------|------|
| `TechVenturePlayPage` | `pages/Games/TechVenturePlayPage.tsx` | ✅ 已实现 | 主对局页面容器 |
| `TechVentureLobbyPage` | `pages/Games/TechVentureLobbyPage.tsx` | ✅ 已实现 | 等候区/选队页面 |
| `TvHud` | `components/techventure/TvHud.tsx` | ✅ 已实现 | 顶部 HUD（队名、预算、排名） |
| `TvStrategySelector` | `components/techventure/TvStrategySelector.tsx` | ✅ 已实现 | 四路线选择 + 三城开拓 |
| `TvKpiCards` | `components/techventure/TvKpiCards.tsx` | ✅ 已实现 | Tech/声量/BQI/排名/热点 |
| `TvLeaderboardPanel` | `components/techventure/TvLeaderboardPanel.tsx` | ✅ 已实现 | 排行榜 |
| `TvNewsPanel` | `components/techventure/TvNewsPanel.tsx` | ✅ 已实现 | 新闻滚动 |
| `TvStrategyMapPanel` | `components/techventure/TvStrategyMapPanel.tsx` | ✅ 已实现 | 策略地图（预留） |
| `TechVentureEntry` | `games/techventure/index.tsx` | 🟡 占位 | Phaser 全屏入口（预留） |
| `GameHUD` | `games/techventure/components/GameHUD.tsx` | 🟡 占位 | Phaser HUD（预留） |
| `GameScene` | `games/techventure/scenes/GameScene.ts` | 🟡 占位 | Phaser 场景（预留） |

### 8.3 主要交互流程

1. **进入对局**：`/games/:id/techventure` → `TechVenturePlayPage`
2. **获取状态**：`GET /state` → 加载队伍信息、轮次、配置
3. **战略选择**：点击四路线卡片选择主策略
4. **城市开拓**：勾选/取消三城布局
5. **资金分配**：滑块调整 Tech/Fit/Show 投入
6. **撰写宣言**：输入 ≤60 字策略宣言
7. **提交决策**：点击「提交本轮决策」
8. **等待结算**：轮询 `poll` 查看状态变化
9. **查看反馈**：KPI 卡片、BQI 因素、排名变化
10. **浏览新闻**：每轮结算后生成的新闻事件

### 8.4 状态管理

```ts
interface TechVentureState {
  gameState: TvGameState | null;
  leaderboard: TvLeaderboardEntry[];
  news: TvNewsItem[];
  loading: boolean;
  error: string | null;

  fetchState(eventId: number): Promise<void>;
  poll(eventId: number): Promise<TvPollData | null>;
  submitDecision(eventId: number, payload: TvSubmitPayload): Promise<void>;
  setProductName(eventId: number, name: string): Promise<void>;
  fetchLeaderboard(eventId: number): Promise<void>;
  fetchNews(eventId: number): Promise<void>;
  startPractice(configId?: string): Promise<{ event_id; team_id }>;
}
```

### 8.5 素材需求

| 素材类型 | 说明 |
|----------|------|
| 路线图标 | TECH(Cpu)、USER(Users)、BRAND(Megaphone)、PATHFINDER(Compass) |
| 城市标识 | 南京（区域中心）、合肥（网红金融）、杭州（科技中心） |
| KPI 图表 | Tech 蓝色、声量绿色、BQI 紫色 |
| 新闻图标 | 按 kind 分类的图标 |
| 奖杯奖牌 | 结算奖励展示 |

---

## 9. 配置规格

### 9.1 techventure-v1.yaml 完整结构

```yaml
id: techventure-v1
engine: techventure
design_mode: standalone
version: "1.0.0"
meta:
  name: 创想大赢家 · TechVenture
  description: 4轮策略商赛——三城布局、三维投入、BQI评分
  theme: techventure
  education_focus:
    - 战略路线选择与取舍
    - 资源分配与投入产出
    - 市场竞争与博弈
    - 宣言-行动一致性

defaults:
  rounds: 4
  seed_budget: 100
  round_allowance: 20
  interest_rate: 0.15
  route_switch_cost: 5
  city_expand_cost: 10
  submit_timeout_minutes: 8
  practice_ai_count: 5
  round_weights: [0.15, 0.20, 0.25, 0.40]
  beta: 0.5
  sigma: 0.05
  a_init: 2.0
  a_hard: 12.0
  bqi_last_count: 4

cities:
  南京:
    label: 南京市 · 区域中心
    scale: 1.00
    eta_fit: 1.10
    eta_show: 0.90
    tau_tech: 0.85
    consumers: { geek: 0.12, pragmatic: 0.58, trendy: 0.30 }
  合肥:
    label: 合肥市 · 网红金融
    scale: 0.85
    eta_fit: 0.90
    eta_show: 1.15
    tau_tech: 0.90
    consumers: { geek: 0.18, pragmatic: 0.30, trendy: 0.52 }
  杭州:
    label: 杭州市 · 科技中心
    scale: 1.15
    eta_fit: 1.00
    eta_show: 1.00
    tau_tech: 1.00
    consumers: { geek: 0.25, pragmatic: 0.42, trendy: 0.33 }

routes:
  TECH:
    label: 技术驱动型
    tagline: 埋头研发 · 技术为本
    brief: 聚焦研发与产品落地，以技术能力建立长期壁垒。
    r_tech: 1.25
    r_fit: 1.00
    r_show: 1.00
    tech_invest_boost: 1.30
  USER:
    label: 用户深耕型
    tagline: 听懂用户 · 精准击中
    brief: 围绕真实场景与关键需求做深做细，把体验与口碑变成增长。
    r_tech: 1.00
    r_fit: 1.20
    fit_t1: 4.5
    fit_t2: 6.5
  BRAND:
    label: 品牌传播型
    tagline: 品牌起势 · 声量登顶
    brief: 以品牌与传播打开声量，更容易在舆论与渠道侧形成破圈。
    r_tech: 1.00
    r_fit: 1.00
    r_show: 1.25
    can_trigger_hot_pulse: true
  PATHFINDER:
    label: 破局奇兵
    tagline: 小众路线 · 独占红利
    brief: 走差异化/细分竞争路线，在格局更有利时更容易把优势滚大。
    r_tech: 1.00
    r_fit: 1.00
    r_show: 1.00
    crowd_curve: { 1: 1.285, 2: 1.200, 3: 0.80, 4: 0.70, 5: 0.60, 6: 0.50, 8: 0.40, 12: 0.30 }

consumer_weights:
  geek:      { tech: 0.55, fit: 0.30, show: 0.15 }
  pragmatic: { tech: 0.22, fit: 0.60, show: 0.18 }
  trendy:    { tech: 0.18, fit: 0.22, show: 0.60 }

growth_rate_table:
  - { upto: 2.0,  rate: 1.20 }
  - { upto: 4.0,  rate: 1.08 }
  - { upto: 5.5,  rate: 0.95 }
  - { upto: 7.0,  rate: 0.80 }
  - { upto: 8.0,  rate: 0.60 }
  - { upto: 9.0,  rate: 0.38 }
  - { upto: 9.5,  rate: 0.20 }
  - { upto: 10.0, rate: 0.10 }
  - { upto: 10.5, rate: 0.05 }
  - { upto: 12.0, rate: 0.02 }

# 属性增长权重
fit_weights:   { investment: 0.50, rank: 0.50 }
show_weights:  { investment: 0.10, rank: 0.90 }
show_b_max: 2.5
fit_growth_scale: 2.0
show_halo_weight: 0.10

# Ceiling 参数
ceiling_city:
  base_const: 0.10
  q_coeff: 0.10
  cap: 0.95
  maturity_min: 0.70
  maturity_range: 0.30
  crowd_lift: 0.10
  show_lift: 0.18
  show_lift_ref: 30

# BQI 规则
bqi_rules:
  tech_last_third: -0.10
  fit_last_third: -0.10
  marketing_over: -0.15
  all_round: 0.12
  declaration_direction_base: 0.04
  declaration_direction_double: 0.06
  declaration_direction_triple: 0.09
  declaration_vision_bonus: 0.03
  declaration_reward_cap: 0.10
  declaration_deviation_minor: -0.03
  floor: 0.60
  ceil: 1.20

# Momentum
momentum:
  decay: 0.40
  r1: 0.60
  r2: 0.30
  r3: 0.10

# Hot Pulse（仅 BRAND 路线）
hot_pulse:
  eligible_routes: [BRAND]
  tiers:
    - { threshold: 0.5, bonus: 0.5, label: 上了本地热搜 }
    - { threshold: 1.5, bonus: 1.2, label: 登上全国热榜 }
    - { threshold: 2.5, bonus: 2.0, label: 现象级爆款全网刷屏 }
    - { threshold: 4.5, bonus: 2.5, label: 超级爆款连续霸榜 }

# Follow-on 资金
follow_on:
  max_base: 15
  floor: 3

# 宣言关键词库
declaration_keywords:
  tech: [技术, 研发, 算法, 性能, 功能, 升级, 核心, 突破, 创新, 工程, 架构, 智能, 模型, 传感, 精度]
  fit:  [用户, 调研, 需求, 体验, 交互, 实用, 场景, 痛点, 人性化, 反馈, 问卷, 贴心, 易用, 陪伴, 定制]
  show: [展示, 设计, 外观, 包装, 品牌, 故事, 营销, 传播, 颜值, 视觉, 风格, 形象, 叙事, 口碑, 推广]
  vision: [愿景, 使命, 改变, 未来, 梦想, 初心, 解决, 普惠, 赋能, 创业, 坚持, 迭代, 挑战, 成长, 学习, 探索, 勇气, 信任, 责任, 公平, 环保, 可持续, 守护, 关怀, 温度, 真诚]

declaration_min_investment:
  tech: 0.30
  fit: 0.25
  show: 0.20

# 突发事件（R3 可选）
event_types:
  - { id: none,           label: 无事件,      desc: 平稳回合，市场无特殊变化。 }
  - { id: pragmaticWave,  label: 用户口味大变, desc: 三城 Pragmatic 群体占比 +10pp，用户匹配身价暴涨。 }
  - { id: geekWave,       label: 技术突破浪潮, desc: 三城 Geek 群体占比 +15pp，技术力成为焦点。 }
  - { id: trendyWave,     label: 社交媒体爆发, desc: 三城 Trendy 群体占比 +10pp，展示力话题连天。 }
  - { id: investorBoom,   label: 投资狂潮,    desc: 全场投资热情飙升：所有队伍额外获得追加投资。 }
  - { id: compliance,     label: 政策合规,    desc: 营销过度罚则 ×1.5，品牌过火者被加倍打击。 }
  - { id: influencerBoom, label: 网红崛起,    desc: 合肥市场规模 0.85 → 1.10，潮流之城含金量飙升。 }

rewards:
  official:
    participate: 150
    top50_bonus: 150
    top20_bonus: 250
    first_place_bonus: 600
  practice:
    participate: 50
    top50_bonus: 50
    top20_bonus: 80
    first_place_bonus: 150
```

### 9.2 关键参数说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `seed_budget` | 100 | 每队初始资金（万） |
| `rounds` | 4 | 决策轮数 |
| `round_allowance` | 20 | 每轮固定津贴（万） |
| `interest_rate` | 0.15 | 剩余资金利息率 |
| `route_switch_cost` | 5 | 路线切换成本（万） |
| `city_expand_cost` | 10 | 城市开拓成本（万/城） |
| `round_weights` | [0.15, 0.20, 0.25, 0.40] | 各轮成绩权重（越往后越重要） |
| `beta` | 0.5 | Softmax 选择锐度 |
| `sigma` | 0.05 | 随机噪声幅度 |
| `a_init` | 2.0 | 属性初始值 |
| `a_hard` | 12.0 | 属性上限 |

---

## 10. 实现参考与 Checklist

### 10.1 关键代码文件路径

#### 后端

| 路径 | 作用 |
|------|------|
| `backend/content/game-configs/techventure-v1.yaml` | 完整赛制配置 |
| `backend/app/games/techventure/v6_engine.py` | v6.0 结算引擎（九步结算） |
| `backend/app/games/techventure/settle.py` | DB 编排：构造输入 → 调用引擎 → 写回结果 |
| `backend/app/games/techventure/config.py` | 配置读取 + 辅助函数（growth_rate、softmax、pathfinder_m_crowd） |
| `backend/app/games/techventure/models.py` | TvTeamState / TvRound / TvSubmission / TvSnapshot / TvNews |
| `backend/app/games/techventure/enums.py` | StrategyRoute / TvRoundStatus / TvEventId / TvNewsKind |
| `backend/app/games/techventure/ai_team.py` | AI 决策生成（纯规则） |
| `backend/app/games/techventure/practice_flow.py` | 练习赛自动推进（AI 决策 + 结算 + 开下一轮） |
| `backend/app/api/techventure.py` | 参赛端 HTTP API |
| `backend/app/api/techventure_admin.py` | 组织端 / 大屏 / 评委 API |
| `backend/app/api/practice.py` | 练习赛创建接口 |

#### 前端

| 路径 | 作用 |
|------|------|
| `frontend/src/pages/Games/TechVenturePlayPage.tsx` | 主对局页面 |
| `frontend/src/pages/Games/TechVentureLobbyPage.tsx` | 等候区/选队页面 |
| `frontend/src/components/techventure/TvHud.tsx` | 顶部 HUD |
| `frontend/src/components/techventure/TvStrategySelector.tsx` | 路线+城市选择 |
| `frontend/src/components/techventure/TvKpiCards.tsx` | KPI 卡片 |
| `frontend/src/components/techventure/TvLeaderboardPanel.tsx` | 排行榜 |
| `frontend/src/components/techventure/TvNewsPanel.tsx` | 新闻面板 |
| `frontend/src/stores/techventureStore.ts` | Zustand store |
| `frontend/src/types/techventure.ts` | TypeScript 类型定义 |
| `frontend/src/App.tsx` | 路由注册 |

### 10.2 TECH 交付 Checklist

- [x] 后端 `games/techventure/` 目录结构完整
- [x] `v6_engine.py` 九步结算引擎
- [x] `settle.py` DB 编排模式
- [x] `config.py` 配置读取 + 辅助函数
- [x] `models.py` 所有运行时表
- [x] `enums.py` 枚举定义
- [x] `ai_team.py` 纯规则 AI
- [x] `practice_flow.py` 练习赛自动推进
- [x] 参赛端 API (`techventure.py`)
- [x] 组织端 API (`techventure_admin.py`)
- [x] 练习赛创建接口 (`practice.py`)
- [x] `techventure-v1.yaml` 配置完整
- [x] 前端主对局页面 (`TechVenturePlayPage`)
- [x] 前端组件（HUD、策略选择、KPI、排行榜、新闻）
- [x] Zustand store (`techventureStore`)
- [x] TypeScript 类型定义
- [ ] Phaser 场景接入（B 阶段）
- [ ] AI 策略档位区分（B 阶段）
- [ ] 完整 40 队排行榜优化（B 阶段）

### 10.3 性能红线

| 指标 | 目标 | 当前状态 |
|------|------|----------|
| 单轮结算延迟 | < 200ms | 40 队约 50~100ms |
| 前端首屏加载 | < 3s | 依赖网络 |
| 决策提交响应 | < 100ms | 纯写入 < 50ms |
| 练习赛自动推进 | < 500ms | AI 决策 + 结算 < 300ms |
| 排行榜查询 | < 50ms | 已索引 |

---

## 11. 与其他引擎的差异

| 维度 | TECH（创想大赢家） | FST（浮生记） | OPS（生产经营） |
|------|-------------------|--------------|----------------|
| **核心机制** | 回合制属性竞争 + 路线选择 | 即时制物流套利 | 回合制运营 + 路演 + 竞价 |
| **决策周期** | 4 轮，每轮 8 分钟 | 5 秒 tick，8~20 分钟 | 5 轮 + 特殊事件，60~120 分钟 |
| **空间维度** | 3 城布局（无移动） | 6 城实时移动 | 多城市场（无移动） |
| **评分侧重** | 加权累计声量 | 最终总资产 | 净资产 + 多维度奖项 |
| **独特元素** | BQI 评分、产品宣言、路线拥挤税、Hot Pulse | 仓储约束、运力投资、价差套利 | 财务报表、路演、拍卖 |
| **技术栈** | React 面板（无地图） | Phaser 预留（当前 React+SVG） | React 面板 |
| **AI 复杂度** | 纯规则随机策略 | chaotic + advanced 两档 | balanced/aggressive/conservative |

---

*商识唯智 · TECH 引擎 PRD v1.1*
*规范来源：`docs/ENGINE.md`、`02-ARCHITECTURE.md`、`03-ENGINEERING.md`*
*引擎实现：`backend/app/games/techventure/v6_engine.py`*
