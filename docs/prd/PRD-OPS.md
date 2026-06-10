# OPS 引擎 PRD · 生产经营销售 / Operations & Sales

> **引擎简称**：OPS
> **引擎 ID**：`ops_sim`
> **配置 ID**：`ops-sim-v1`
> **中文名**：生产经营销售赛
> **英文名**：Operations & Sales Simulation
> **运行时**：`react-game`
> **设计模式**：`standalone`
> **版本**：`1.0.0`
> **最后更新**：2026-06-10

---

## 1. 元信息

| 字段 | 值 |
|------|-----|
| **引擎中文名** | 生产经营销售赛 |
| **引擎英文名** | Operations & Sales Simulation / OPS |
| **引擎 ID** | `ops_sim` |
| **配置包 ID** | `ops-sim-v1` |
| **版本** | `1.0.0` |
| **设计模式** | `standalone` |
| **运行时类型** | `react-game`（策略/面板/表格） |
| **表前缀** | `ops_` |
| **后端路由前缀** | `/api/v1/ops` |
| **前端路由** | `/games/:id/ops` |
| **参考赛事** | 阿思丹商业模拟（ASDAN Business Simulation） |
| **单局时长** | 45~75 分钟（课堂版可拆分两节课） |
| **队伍数量** | 4~20 队常规，扩展至 40 队 |
| **每队人数** | 2~6 人（系统不校验角色分工） |
| **标准轮次** | 4 轮运营决策 + 1 轮资源竞价 + 1 轮终局结算 |

---

## 2. 产品定位

### 2.1 一句话玩法

**OPS 是一场"建厂、生产、定价、抢市场"的回合制商业模拟赛**：每支队伍经营一家虚拟消费品公司，经历产品定位、四轮运营决策、一次资源竞价，最终以**净资产**排名决胜负。

### 2.2 核心教育目标

| # | 能力 | 说明 |
|---|------|------|
| 1 | **商业系统闭环** | 理解产品-生产-定价-销售-财务的完整链条 |
| 2 | **资源配置决策** | 在有限预算下权衡生产、营销、研发、扩张 |
| 3 | **市场竞争意识** | 通过供需、价格、份额感受竞争动态 |
| 4 | **财务健康观念** | 读懂损益表核心指标：收入、成本、利润、现金流 |
| 5 | **风险与不确定性** | 市场事件和竞价结果改变竞争格局 |
| 6 | **团队协作讨论** | 多人在有限时间内达成共识并提交决策 |

### 2.3 目标受众

| 维度 | 说明 |
|------|------|
| **目标年龄** | 14~18 岁（高中生为主，可扩展至初中生/大学生） |
| **适合学段** | 高中、国际高中、预科 |
| **单场人数** | 4~20 队常规，可扩展至 40 队 |
| **每队人数** | 2~6 人 |
| **决策类型** | 回合制策略 + 阶段性竞价 |
| **设备要求** | 每队至少 1 台设备，建议 1~2 台共用 |

### 2.4 单局节奏

```
┌─────────────────────────────────────────────────────────────────┐
│  0:00  开幕 + 规则讲解 + 组队（2 分钟）                            │
│  0:05  产品定位：选择品类与目标客群（5 分钟）                       │
│  0:10  R1 运营决策（8 分钟）                                       │
│  0:20  R1 结算 + 财务报表（2 分钟）                                │
│  0:25  R2 运营决策（8 分钟）                                       │
│  0:35  R2 结算                                                    │
│  0:40  资源竞价（8 分钟）                                          │
│  0:50  R3 运营决策（8 分钟）                                       │
│  1:00  R3 结算                                                    │
│  1:05  R4 终局决策（8 分钟）                                       │
│  1:15  最终结算 + 颁奖（5 分钟）                                   │
└─────────────────────────────────────────────────────────────────┘
```

**课堂拆分方案**：若 45 分钟课时不够，可在 R2 结算后保存，下节课从资源竞价继续。状态机支持 `paused`。

---

## 3. 核心循环

### 3.1 五大环节总览

OPS 区别于 FST（即时物流套利）和 TECH（属性竞争）的核心特征是：**运营决策是主线，资源竞价是拐点**。

| 环节 | 类型 | 触发时机 | 产出 |
|------|------|----------|------|
| **产品定位** | 一次性 | 开局 | 确定产品品类与目标客群，影响基础成本结构 |
| **运营决策** | 回合制（4 轮） | 每轮 8 分钟 | 生产、定价、营销、研发、城市布局 |
| **资源竞价** | 阶段性 | R2 结束后 | 获取稀缺产能/广告位/原材料折扣 |
| **最终结算** | 一次性 | R4 结束后 | 净资产排名，发放 XP/金币/钻石 |

### 3.2 完整流程图

```
创建 match
  ├── 读取 ops-sim-v1.yaml
  ├── 合并覆盖参数
  ├── 创建 ArenaMatch
  └── 创建 ArenaTeam（真人队 + AI 队）
      └── 初始资金：¥100,000
      ↓
环节 0：产品定位（Product Positioning）
  ├── 选择产品品类（3C / 快消 / 家居）
  ├── 设定目标客群（Geek / Pragmatic / Show）
  └── 提交定位卡
      ↓
环节 1~2：运营决策（Operation Rounds 1~2）
  ├── 每轮：生产、定价、营销、研发、城市
  └── 结算后生成简化财务报表
      ↓
环节 3：资源竞价（Auction）
  ├── 系统释放 3~5 件拍品
  ├── 英式拍卖：公开加价，价高者得
  └── 拍得者立即获得资产/效果
      ↓
环节 4~5：运营决策（Operation Rounds 3~4）
  ├── 拍得资产效果生效
  └── R4 为终局轮，结束后立即最终结算
      ↓
最终结算
  ├── 按净资产排名
  ├── 特殊奖项：最佳产品 / 最佳交易 / 最佳运营
  └── 发放 Career 资源奖励
```

### 3.3 状态机

#### 比赛生命周期状态

| 状态 | 说明 | 可执行操作 |
|------|------|-----------|
| `draft` | 刚创建 | 组织者配置参数 |
| `registration` | 开放加入 | 玩家输入房间码、选队 |
| `positioning` | 产品定位阶段 | 编辑定位卡、提交 |
| `operation_round_1` | R1 运营决策 | 提交决策表 |
| `settlement_1` | R1 结算中 | 只读 |
| `operation_round_2` | R2 运营决策 | 提交决策表 |
| `settlement_2` | R2 结算中 | 只读 |
| `auction` | 资源竞价 | 出价 |
| `operation_round_3` | R3 运营决策 | 提交决策表 |
| `settlement_3` | R3 结算中 | 只读 |
| `operation_round_4` | R4 终局决策 | 提交决策表 |
| `settlement_4` | 最终结算中 | 只读 |
| `finished` | 比赛结束 | 查看结果、复盘 |
| `paused` | 暂停（课堂拆分） | 组织者恢复后可继续 |

#### 轮次状态机

| 状态 | 说明 | 触发条件 |
|------|------|----------|
| `pending` | 待开放 | 轮次尚未开始 |
| `open` | 开放决策 | 组织者点击「开放」或系统自动 |
| `closed` | 决策截止 | 到达时间限制或组织者手动截止 |
| `settled` | 已结算 | 结算函数执行完毕 |

### 3.4 推进规则

- **回合制**：组织者手动开放每轮，系统自动倒计时；也可设置为自动推进。
- **练习赛**：玩家提交后自动触发 AI 决策 + 结算；正式赛需组织者手动触发结算。
- **并发安全**：仅 `advance` 时锁定 `competition_events` 一行，锁持有 < 100ms。
- **暂停支持**：课堂场景下，组织者可在任意结算后点击「暂停」，下节课继续。

---

## 4. 决策设计

### 4.1 环节 0：产品定位（Product Positioning）

每支队伍开局需要完成产品定位，这会**锁定基础成本结构和市场偏好系数**。

| 决策项 | 英文名 | 说明 |
|--------|--------|------|
| **产品品类** | `category` | `electronics` / `fast_moving` / `home` |
| **目标客群** | `target_segment` | `geek` / `pragmatic` / `show` |

**定位卡 Schema**：

```json
{
  "team_id": 1,
  "product_name": "智享台灯",
  "category": "home",
  "target_segment": "pragmatic",
  "submitted_at": "2026-06-10T09:15:00Z"
}
```

**品类影响**：

| 品类 | 基础原材料成本 | 基础人工成本 | 基础管理费用 | 市场规模乘数 | 品类特征 |
|------|---------------|-------------|-------------|------------|---------|
| `electronics`（3C电子） | ¥80 | ¥30 | ¥5,000 | 1.2 | Tech 敏感 |
| `fast_moving`（快消品） | ¥20 | ¥10 | ¥2,000 | 1.5 | 规模敏感 |
| `home`（家居用品） | ¥50 | ¥20 | ¥3,500 | 1.0 | 均衡 |

**客群影响**：

| 客群 | 对 Tech 权重 | 对 Fit 权重 | 对 Show 权重 | 定位一致性奖励 |
|------|------------|------------|-------------|--------------|
| `geek` | 0.55 | 0.30 | 0.15 | Tech 投入效率 +5% |
| `pragmatic` | 0.22 | 0.60 | 0.18 | Fit 投入效率 +5% |
| `show` | 0.18 | 0.22 | 0.60 | Show 投入效率 +5% |

### 4.2 环节 1~4：运营决策（Operation Decision）

每轮每队提交一张**决策表**，包含以下字段：

| 决策项 | 英文名 | 类型 | 默认值 | 说明 |
|--------|--------|------|--------|------|
| 生产量 | `production_quantity` | int | 0 | 本轮计划生产的产品数量 |
| 出厂定价 | `unit_price` | float | 品类基准价 | 每单位产品售价 |
| 市场营销投入 | `marketing_spend` | float | 0 | 广告投放、品牌推广 |
| 研发投入 | `rnd_spend` | float | 0 | 提升 Tech 属性 |
| 销售人员数 | `sales_force` | int | 0 | 影响各城市市场覆盖 |
| 目标城市 | `target_cities` | list[str] | [] | 选择进入的城市（最多 3 个） |

**决策表 Schema**：

```json
{
  "team_id": 1,
  "round_id": 5,
  "production_quantity": 200,
  "unit_price": 180.0,
  "marketing_spend": 8000.0,
  "rnd_spend": 5000.0,
  "sales_force": 3,
  "target_cities": ["hangzhou", "nanjing"]
}
```

**校验规则**：

1. `production_quantity >= 0`
2. `unit_price > 0`（允许低于成本，但会亏损）
3. `marketing_spend >= 0`，`rnd_spend >= 0`
4. `sales_force >= 0`，且 `sales_force <= max_sales_force`（默认 10）
5. `target_cities` 中每个城市必须在配置中存在
6. **总支出校验**：
   ```
   total_cost = marketing_spend + rnd_spend + sales_force * wage_per_head
              + production_quantity * raw_material_cost
              + city_opening_fees_for_new_cities
   total_cost <= cash
   ```
   > 注意：生产原材料费在提交时即扣除现金，未完成的生产不返还。

7. 每个新进入城市需支付**开城费**（首次进入时一次性）
8. 每队每轮只能提交一次决策

### 4.3 环节 3：资源竞价（Auction）

**触发条件**：R2 运营结算完成后。

**拍品种类**：

| 拍品 | 说明 | 效果 | 数量 |
|------|------|------|------|
| 生产线 A | 标准产能线 | 之后每轮产能上限 +150 | 1 件 |
| 生产线 B | 高端产能线 | 之后每轮产能上限 +80，产品品质 +10% | 1 件 |
| 城市广告位 | 某城市置顶展示 | 该城市 Show 效果 +20%（R3、R4 生效） | 2~3 城各 1 件 |
| 原材料折扣 | 供应商合同 | R3、R4 原材料成本 -15% | 1 件 |

**拍卖形式**：

统一采用**英式拍卖**：
- 公开当前最高价和领先队伍
- 每队可加价，加价幅度为当前价格的 5% 或固定最小加价（¥500 取高）
- 倒计时 30 秒，若最后 5 秒内有人出价，倒计时重置为 5 秒
- 时间结束时最高价者成交，立即扣款

**拍得效果**：
- 生产线/广告位：写入队伍资产，后续轮次自动生效
- 原材料折扣：R3、R4 结算时自动应用

**未拍得者**：继续按原规则运营，无惩罚。

### 4.4 特殊机制（Phase A 简化版）

#### 开城费

首次进入某城市需支付一次性开城费：

```
开城费 = base_open_cost * city_tier_multiplier
```

| 城市等级 | 乘数 | 示例城市 | base_open_cost |
|----------|------|---------|---------------|
| 一线城市 | 2.0x | 上海、北京 | ¥30,000 |
| 新一线 | 1.5x | 杭州、成都 | ¥22,500 |
| 二线 | 1.0x | 南京、武汉 | ¥15,000 |
| 三线 | 0.6x | 合肥、无锡 | ¥9,000 |

#### 市场事件（简化）

每轮结算后可能触发市场事件，R1 与 R2 不触发，R3、R4 各触发 0~1 个：

| 事件 | 触发概率 | 效果 |
|------|---------|------|
| 消费降级 | 15% | 所有城市 Show 偏好 -5%，价格敏感度 +5% |
| 原材料涨价 | 15% | 全行业原材料成本 +15% |
| 政策补贴 | 10% | 某随机城市开城费减半（仅对尚未进入者） |
| 竞品退出 | 10% | 随机一队（AI 优先）退出，释放市场份额 |
| 无事件 | 50% | 市场平稳 |

> **Phase A 边界**：路演、间谍、联盟、玩家间自由交易等机制不包含。若未来需要，在 Phase B 以独立扩展包形式加入。

---

## 5. 结算规则

### 5.1 核心结算函数

```python
def settle_round(
    match_state: dict[str, Any],
    decisions: dict[str, Any],      # {team_id: decision_payload}
    cfg: dict[str, Any],             # YAML 配置快照
) -> dict[str, Any]:
    """结算单轮运营决策。纯函数、幂等、不读写数据库。"""
```

### 5.2 单轮结算流程

1. **读取队伍资产与上一轮状态**
   - 现金、库存、Tech 属性、已开城市、已拍资产

2. **计算产能上限**
   ```
   max_production = base_capacity + factory_bonus
                  + hired_workers * worker_productivity
   ```
   默认 `base_capacity = 200`，`factory_bonus` 来自拍品。

3. **限制生产量并扣原材料费**
   - 实际产量 = min(`production_quantity`, `max_production`, 原材料可支持量)
   - 原材料成本 = 实际产量 × `raw_material_cost` × (1 - 折扣)
   - 现金 -= 原材料成本

4. **计算单位成本**
   ```
   unit_cost = raw_material_cost + labor_cost_per_unit + overhead_per_unit
   overhead_per_unit = fixed_cost / max(actual_production, 1)
   ```

5. **市场需求计算**

   对每个城市，计算各队的**有效属性得分**：
   ```
   score_i = w_tech * Tech_i + w_fit * Fit_i + w_show * Show_i - w_price * Price_i
   ```
   其中 `Price_i = unit_price_i / market_average_price`

   使用 Softmax 计算市场份额：
   ```
   market_share_i = exp(beta * score_i) / sum_j(exp(beta * score_j))
   ```

6. **销量计算**
   ```
   demand_i = market_share_i * city_market_size
   sales_i = min(demand_i, production_quantity_i + inventory_i)
   ```

7. **收入与利润**
   ```
   revenue_i = sales_i * unit_price_i
   cogs_i = sales_i * unit_cost_i
   gross_profit_i = revenue_i - cogs_i
   operating_expenses_i = marketing_spend + rnd_spend + sales_force * wage
   operating_profit_i = gross_profit_i - operating_expenses_i
   net_profit_i = operating_profit_i
   ```

8. **现金流更新**
   ```
   cash_i = cash_i + revenue_i - cogs_i - operating_expenses_i
   ```
   > Phase A 不包含贷款与分红机制，现金不允许为负；若决策导致超支，在校验阶段拒绝。

9. **库存结转**
   ```
   inventory_i = production_quantity_i + previous_inventory_i - sales_i
   inventory_holding_cost_i = inventory_i * holding_cost_per_unit
   cash_i -= inventory_holding_cost_i
   ```

10. **属性更新**
    ```
    Tech_i += rnd_spend * tech_conversion_rate
    Show_i += marketing_spend * show_conversion_rate
    Fit_i 在定位时确定，不随轮次变化（Phase A 简化）
    ```

11. **净资产计算**
    ```
    net_assets_i = cash_i + inventory_i * unit_cost_i
    ```

12. **生成简化财务报表和新闻事件**

### 5.3 财务报表结构（简化版）

每轮结算后，每支队伍收到**两张简化报表**：

#### 损益表（Income Statement）

| 项目 | 计算 |
|------|------|
| 营业收入 | 销量 × 单价 |
| 营业成本 | 销量 × 单位成本 |
| 毛利润 | 营业收入 - 营业成本 |
| 营销费用 | `marketing_spend` |
| 研发费用 | `rnd_spend` |
| 人力费用 | `sales_force × wage` |
| 管理费用 | `fixed_overhead` |
| 库存持有成本 | `inventory × holding_cost` |
| 运营利润 | 毛利润 - 各项费用 - 库存持有成本 |
| 净利润 | 运营利润（Phase A 无利息） |

#### 资产负债表（Balance Sheet）

| 资产 | 计算 |
|------|------|
| 现金 | `cash` |
| 存货 | `inventory × unit_cost` |
| 固定资产 | 生产线拍品价值 |
| **总资产** | 以上之和 |

| 所有者权益 | 计算 |
|------------|------|
| 初始资本 | 100,000 |
| 累计利润 | sum(net_profit) |
| **净资产** | 总资产（Phase A 无负债） |

> Phase A 不出现金流量表，避免信息过载；R4 结算后提供完整报表 PDF 导出预留接口。

### 5.4 市场事件触发

事件在结算 Step 12 中触发，仅改变下一轮的配置参数或市场状态：

```python
def maybe_trigger_event(round_no: int, rng: random.Random) -> Optional[Event]:
    if round_no < 3:
        return None
    if rng.random() < 0.5:
        return None
    return rng.choice([consumer_downgrade, raw_material_spike, ...])
```

### 5.5 最终排名

比赛结束时按 `净资产` 降序排名：

```
总得分 = 净资产 × 0.7 + 累计净利润 × 0.3
```

特殊奖项：
- **最佳产品设计**：定位选择与最终客群匹配度最高
- **最佳交易**：竞价阶段以最低溢价获得拍品（成交价/起拍价 最小）
- **最佳运营**：累计净利润最高

---

## 6. AI 对手

### 6.1 AI 配置

| 字段 | 默认值 |
|------|--------|
| 练习赛 AI 数量 | `practice_ai_count = 3` |
| AI 档位 | `[balanced, aggressive, conservative]` |

### 6.2 Balanced（均衡型）

- 生产量 = 预期需求的 90%
- 定价 = 行业平均价的 1.0 倍
- 营销与研发按固定比例（4:3:3）分配
- 稳健扩张，优先进入二线城市
- 竞价时：出价不超过估值的 80%

### 6.3 Aggressive（激进型）

- 生产量 = 预期需求的 120%（冒险库存）
- 定价 = 行业平均价的 0.90 倍（低价抢份额）
- 高营销投入，快速建立 Show 属性
- 优先进入一线城市
- 竞价时：激进出价，最高可达估值的 110%

### 6.4 Conservative（保守型）

- 生产量 = 预期需求的 70%
- 定价 = 行业平均价的 1.1 倍（溢价策略）
- 低营销，高研发
- 深耕单一城市
- 竞价时：保守，只出价估值的 60%

### 6.5 AI 决策函数

```python
def generate_ai_decision(
    team_state: dict[str, Any],
    market_state: dict[str, Any],
    cfg: dict[str, Any],
) -> dict[str, Any]:
    """零 Token 规则 AI。根据当前状态和市场信息生成决策。"""
    strategy = team_state["ai_strategy"]
    # ... 按策略类型分派到具体决策生成器
    return decision_payload
```

---

## 7. 状态与数据

### 7.1 数据库表

#### 通用 Arena 表

复用 `competition_events` 和 `competition_participants`。OPS 以队伍为单位决策，因此 `arena_teams` 也需要使用。

#### OPS 运行时表

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `ops_team_states` | 队伍运行时状态 | `id`, `event_id`, `team_id`, `cash`, `inventory`, `tech`, `fit`, `show`, `net_assets`, `factories`, `entered_cities` |
| `ops_rounds` | 轮次状态 | `id`, `event_id`, `round_number`, `status`, `market_snapshot`, `event_snapshot`, `started_at`, `ended_at` |
| `ops_submissions` | 每轮决策提交 | `id`, `round_id`, `team_id`, `decision_json`, `submitted_at`, `idempotency_key` |
| `ops_snapshots` | 结算快照 | `id`, `round_id`, `team_id`, `result_json`, `financial_statements` |
| `ops_products` | 产品定位卡 | `id`, `event_id`, `team_id`, `product_name`, `category`, `target_segment` |
| `ops_auction_items` | 拍卖品定义 | `id`, `event_id`, `item_key`, `name`, `base_price`, `effect_json`, `status` |
| `ops_auction_bids` | 拍卖出价记录 | `id`, `item_id`, `team_id`, `bid_amount`, `bid_at`, `is_winning` |
| `ops_auction_results` | 拍卖结果 | `id`, `item_id`, `winner_team_id`, `final_price`, `settled_at` |

### 7.2 队伍运行时状态

```json
{
  "team_id": 1,
  "cash": 95000,
  "inventory": 120,
  "tech": 32,
  "fit": 45,
  "show": 23,
  "net_assets": 98000,
  "factories": ["line_a"],
  "ads": ["hangzhou"],
  "discount_rate": 0.0,
  "entered_cities": ["hangzhou"],
  "cumulative_profit": -2000,
  "product": {
    "category": "home",
    "target_segment": "pragmatic"
  }
}
```

### 7.3 API 端点

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/v1/ops/events/{event_id}/state` | 获取当前比赛状态 |
| POST | `/api/v1/ops/events/{event_id}/product-positioning` | 提交产品定位 |
| POST | `/api/v1/ops/events/{event_id}/decisions` | 提交运营决策 |
| POST | `/api/v1/ops/events/{event_id}/auction/bid` | 拍卖出价 |
| GET | `/api/v1/ops/events/{event_id}/auction/state` | 获取拍卖实时状态 |
| GET | `/api/v1/ops/events/{event_id}/financials` | 获取财务报表 |
| GET | `/api/v1/ops/events/{event_id}/ranking` | 获取实时排名 |
| POST | `/api/v1/ops/events/{event_id}/advance` | 推进下一轮（组织者） |
| POST | `/api/v1/ops/events/{event_id}/pause` | 暂停比赛（组织者） |
| POST | `/api/v1/ops/events/{event_id}/resume` | 恢复比赛（组织者） |

### 7.4 大规模参赛设计（15~40 支队伍）

| 设计点 | 说明 |
|--------|------|
| **结算复杂度** | Softmax 份额计算 O(n)，40 队约 1ms，可接受 |
| **数据库设计** | 每轮每队一条 `ops_submissions` + `ops_snapshots`，4 轮 × 40 队 = 160 行/表 |
| **并发提交** | 决策提交各自写入，无锁竞争；`idempotency_key` 保证幂等 |
| **结算锁** | 仅 `advance` 时锁定 `competition_events` 一行，锁持有 < 100ms |
| **前端展示** | 排行榜使用 Top 10 + "我的排名" + 分页 |
| **拍卖并发** | 拍卖出价使用乐观锁：`ops_auction_items` 行级版本号 |
| **暂停支持** | `paused` 状态持久化到 `competition_events.status`，可随时恢复 |

---

## 8. 前端局内

### 8.1 运行时选型

OPS 选择 **`react-game`** 运行时，因为：
- 玩法以面板、表格、表单决策为主
- 需要展示财务报表、排行榜、市场数据
- 资源竞价阶段适合 React 组件实现
- 不需要地图/实时空间移动

### 8.2 组件清单

| 组件 | 说明 | 状态 |
|------|------|------|
| `OpsEntry` | Game Shell 挂载点 | 待实现 |
| `DashboardLayout` | 三栏布局：左侧状态 / 中部决策 / 右侧市场情报 | 待实现 |
| `ProductPositioningPanel` | 产品定位表单：品类、客群、产品名 | 待实现 |
| `DecisionForm` | 运营决策表：生产、定价、营销、研发、人力、城市 | 待实现 |
| `FinancialStatements` | 损益表/资产负债表 | 待实现 |
| `MarketOverview` | 市场份额、城市需求、竞争对手动态 | 待实现 |
| `AuctionHall` | 拍卖大厅：拍品列表、出价面板、倒计时 | 待实现 |
| `RankingPanel` | 排行榜 | 待实现 |
| `NewsTicker` | 市场事件滚动 | 待实现 |
| `PhaseIndicator` | 顶部阶段指示器 | 待实现 |

### 8.3 主要交互流程

1. **进入对局**：`/games/:id/ops` → `OpsEntry`
2. **产品定位**：选择品类、客群，输入产品名，提交
3. **运营决策**：每轮调整生产、定价、营销、研发、人力、城市
4. **查看报表**：结算后查看损益表、资产负债表
5. **资源竞价**：选择拍品，实时出价
6. **最终结算**：查看排名和奖项

### 8.4 状态管理

```ts
interface OpsState {
  gameState: OpsGameState | null;
  currentRound: number;
  phase: 'positioning' | 'operation' | 'auction' | 'settlement' | 'finished' | 'paused';
  loading: boolean;
  error: string | null;
  fetchGameState(eventId: number): Promise<void>;
  submitProductPositioning(eventId, payload): Promise<void>;
  submitDecision(eventId, roundId, payload): Promise<void>;
  placeBid(eventId, itemId, amount): Promise<void>;
  fetchAuctionState(eventId): Promise<void>;
}
```

### 8.5 素材需求

| 素材类型 | 说明 |
|----------|------|
| 产品品类图标 | 3C、快消、家居 |
| 城市图标 | 一线/新一线/二线/三线 |
| 角色头像 | CEO、CFO、CMO、COO（仅展示，不影响结算） |
| 财务报表模板 | 损益表、资产负债表 |
| 拍卖锤、倒计时 | 拍卖环节视觉 |
| 奖杯、奖牌 | 结算奖励 |

---

## 9. 配置规格

### 9.1 ops-sim-v1.yaml 完整结构

```yaml
id: ops-sim-v1
engine: ops_sim
meta:
  name: 生产经营销售赛
  description: 多轮商业模拟：产品定位、运营决策、资源竞价
  version: "1.0.0"
  author: BizSim Edu
  target_age: [14, 18]
  runtime: react-game
design_mode: standalone
defaults:
  rounds: 4
  teams: 8
  members_per_team: 4
  initial_capital: 100000
  initial_inventory: 0
  base_capacity: 200
  max_production_per_round: 500
  max_sales_force: 10
  decision_time_minutes: 8
  auction_time_minutes: 8
  practice_ai_count: 3
  practice_ai_slots: [balanced, aggressive, conservative]
  wage_per_head: 1500
  holding_cost_per_unit: 2
  beta: 2.0
  
product_categories:
  electronics:
    name: 3C电子
    base_material_cost: 80
    base_labor_cost: 30
    base_overhead: 5000
    market_size_multiplier: 1.2
    base_price: 220
  fast_moving:
    name: 快消品
    base_material_cost: 20
    base_labor_cost: 10
    base_overhead: 2000
    market_size_multiplier: 1.5
    base_price: 55
  home:
    name: 家居用品
    base_material_cost: 50
    base_labor_cost: 20
    base_overhead: 3500
    market_size_multiplier: 1.0
    base_price: 140

consumer_segments:
  geek:
    name: 技术爱好者
    tech_weight: 0.55
    fit_weight: 0.30
    show_weight: 0.15
  pragmatic:
    name: 实用主义者
    tech_weight: 0.22
    fit_weight: 0.60
    show_weight: 0.18
  show:
    name: 潮流追随者
    tech_weight: 0.18
    fit_weight: 0.22
    show_weight: 0.60

cities:
  shanghai:
    name: 上海
    tier: 1
    market_size: 10000
    opening_cost: 30000
    geek_ratio: 0.25
    pragmatic_ratio: 0.45
    show_ratio: 0.30
  beijing:
    name: 北京
    tier: 1
    market_size: 9500
    opening_cost: 30000
    geek_ratio: 0.30
    pragmatic_ratio: 0.40
    show_ratio: 0.30
  hangzhou:
    name: 杭州
    tier: 2
    market_size: 6000
    opening_cost: 15000
    geek_ratio: 0.45
    pragmatic_ratio: 0.30
    show_ratio: 0.25
  nanjing:
    name: 南京
    tier: 2
    market_size: 5500
    opening_cost: 15000
    geek_ratio: 0.20
    pragmatic_ratio: 0.50
    show_ratio: 0.30
  chengdu:
    name: 成都
    tier: 3
    market_size: 4500
    opening_cost: 9000
    geek_ratio: 0.15
    pragmatic_ratio: 0.35
    show_ratio: 0.50
  hefei:
    name: 合肥
    tier: 3
    market_size: 4000
    opening_cost: 9000
    geek_ratio: 0.35
    pragmatic_ratio: 0.35
    show_ratio: 0.30

event_types:
  consumer_downgrade:
    name: 消费降级
    desc: 消费者更加注重性价比，品牌溢价下降
    probability: 0.15
    effects:
      show_preference_delta: -0.05
      price_sensitivity_delta: 0.05
  raw_material_spike:
    name: 原材料涨价
    desc: 上游原材料供应紧张，成本上升
    probability: 0.15
    effects:
      material_cost_multiplier: 1.15
  policy_subsidy:
    name: 政策补贴
    desc: 某城市推出招商引资政策，开城费减半
    probability: 0.10
    effects:
      target_city_random: true
      opening_cost_multiplier: 0.5
  competitor_exit:
    name: 竞品退出
    desc: 某竞争对手因经营不善退出市场
    probability: 0.10
    effects:
      remove_random_ai: true

auction_items:
  line_a:
    name: 标准生产线
    type: production
    base_price: 20000
    effect:
      capacity_bonus: 150
  line_b:
    name: 高端生产线
    type: production
    base_price: 35000
    effect:
      capacity_bonus: 80
      quality_bonus: 0.10
  ad_shanghai:
    name: 上海广告位
    type: advertising
    base_price: 12000
    effect:
      city: shanghai
      show_multiplier: 1.20
  ad_hangzhou:
    name: 杭州广告位
    type: advertising
    base_price: 8000
    effect:
      city: hangzhou
      show_multiplier: 1.20
  raw_discount:
    name: 原材料供应合同
    type: discount
    base_price: 15000
    effect:
      material_cost_discount: 0.15

scoring_weights:
  net_assets: 0.70
  cumulative_profit: 0.30

rewards:
  official:
    participate: 150
    top50_bonus: 100
    top20_bonus: 200
    first_place_bonus: 600
  practice:
    participate: 50
    top50_bonus: 30
    top20_bonus: 60
    first_place_bonus: 120
```

### 9.2 关键参数说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `initial_capital` | 100,000 | 每队初始资金 |
| `rounds` | 4 | 运营决策轮数 |
| `decision_time_minutes` | 8 | 每轮决策时间 |
| `auction_time_minutes` | 8 | 竞价阶段时间 |
| `market_size` | 按城市 | 该城市总需求量 |
| `beta` | 2.0 | Softmax 选择锐度 |
| `holding_cost_per_unit` | 2 | 每单位存货每轮成本 |
| `wage_per_head` | 1,500 | 每销售人员每轮工资 |

---

## 10. 实现参考与 Checklist

### 10.1 关键参考文件

#### 项目内参考

| 路径 | 作用 |
|------|------|
| `inspire/a商赛主题与真题库/01-青少年层级赛事主题与真题/91-阿思丹ABS主题与真题.md` | 阿思丹赛制核心素材 |
| `inspire/a商赛主题与真题库/02-平台内置赛制主题库/03-拍卖交易大厅主题.md` | 拍卖机制设计参考 |
| `backend/app/games/techventure/v6_engine.py` | Softmax 份额计算参考 |
| `backend/app/games/techventure/settle.py` | DB 编排模式参考 |
| `backend/app/games/techventure/practice_flow.py` | 练习赛自动推进参考 |
| `backend/app/games/trading/rts_pricing.py` | 价格压力模型参考 |

#### 外部参考

- [ASDAN Business Simulation - AISG](https://www.aisgz.org.cn/news/asdan-business-simulation)
- [阿思丹模拟商赛 ASDAN｜上海双语学校美达菲专场](https://www.sohu.com/a/612757793_121273103)

### 10.2 Phase A 实施边界

| 机制 | Phase A | 说明 |
|------|---------|------|
| 产品定位 | 支持 | 品类 + 客群 |
| 4 轮运营决策 | 支持 | 生产、定价、营销、研发、城市、人力 |
| 资源竞价 | 支持 | 英式拍卖，3~5 件拍品 |
| 简化财务报表 | 支持 | 损益表 + 资产负债表 |
| 市场事件 | 支持 | R3、R4 各 0~1 个 |
| 暂停/恢复 | 支持 | 课堂拆分场景 |
| 融资路演 | 不支持 | Phase B1 扩展 |
| 玩家间交易 | 不支持 | Phase B1 扩展 |
| 间谍/联盟 | 不支持 | Phase B2 扩展 |
| 贷款/分红 | 不支持 | Phase B2 扩展 |
| 现金流量表 | 不支持 | Phase B2 扩展 |

### 10.3 实现 Checklist

- [ ] 完善 `ops-sim-v1.yaml`（城市、产品品类、拍卖品、事件库）
- [ ] 实现 `ops_sim/engine.py`：`settle_round` 结算函数
- [ ] 实现 `ops_sim/ai.py`：balanced / aggressive / conservative 三种 AI
- [ ] 实现 `ops_sim/auction.py`：英式拍卖出价与结算
- [ ] 定义 `ops_sim/models.py`：所有 SQLAlchemy 模型
- [ ] 新建 `api/ops.py`：注册所有 OPS API 路由
- [ ] 在 `main.py` 挂载 ops router
- [ ] 更新 `init_db.py` 导入 OPS 模型
- [ ] 前端 `games/ops-sim/`：实现 DashboardLayout、DecisionForm、FinancialStatements
- [ ] 前端：实现 ProductPositioningPanel
- [ ] 前端：实现 AuctionHall
- [ ] 前端：实现 RankingPanel、NewsTicker
- [ ] 前端：新建 `stores/opsStore.ts`
- [ ] 在 `App.tsx` 注册 `/games/:id/ops` 路由
- [ ] 手动测试：4 队完整一局
- [ ] 压力测试：40 队结算性能

### 10.4 性能红线

| 指标 | 目标 |
|------|------|
| 单轮结算延迟 | < 200ms（40 队） |
| 前端首屏加载 | < 3s |
| 决策提交并发 | 支持 40 队同时提交 |
| 财务报表生成 | < 100ms |
| 拍卖出价响应 | < 50ms |

---

## 11. 多视角审视与补充

### 11.1 比赛参与者（学生）视角

**核心诉求**：好玩、公平、能学到东西、不会被队友坑。

| 维度 | 学生反馈 | PRD 补充 |
|------|---------|---------|
| **理解成本** | "第一次玩看不懂财务报表" | 前端增加「新手模式」：首次进入显示工具提示；损益表增加红绿灯标记（盈利=绿/亏损=红） |
| **时间压力** | "8 分钟太短，6 个人讨论不完" | 支持队内「预提交」：队长可提前保存草稿，最后统一提交；练习赛延长至 10 分钟 |
| **竞价挫败** | "钱少永远拍不到东西" | 设置「保留价」：拍品有最低成交价，若无人达到则流拍，下轮重新释放；避免 ALL IN 垄断 |
| **结果可解释性** | "为什么我降价了销量还少了" | 结算面板展示「销量漏斗」：市场需求 → 份额 → 实际销量 → 库存影响，让学生看到因果链 |
| **参与感** | "我是 CFO，但系统不识别角色" | Phase A 不强制角色，但前端允许队员自选角色标签（CEO/CFO/CMO/COO/其他），仅展示 |

### 11.2 商赛组织者（教师/教练）视角

**核心诉求**：控场简单、教学效果明显、能应对课堂突发情况。

| 维度 | 组织者反馈 | PRD 补充 |
|------|-----------|---------|
| **时间控制** | "45 分钟课时做不完一轮" | 必须支持 `paused` 状态，可在任意结算后暂停，下节课恢复；倒计时可手动增减 |
| **观战视角** | "我想在大屏展示全场排名" | 增加 `/screen` 接口，返回大屏投影数据：排名、净资产趋势、市场份额饼图 |
| **干预能力** | "有队伍挂机影响全局" | 组织者可将挂机队转为 AI 托管；正式赛中组织者有权强制提交默认决策 |
| **教学辅助** | "结算后我想讲解一下" | 结算后增加「教师讲解模式」：大屏冻结在结算页面，教师可逐队展开数据 |
| **最小 viable 课堂** | "没有网络/设备不齐怎么办" | 支持「演示模式」：教师控制 4 支 AI 队运行，学生观看并分析，适合无设备课堂 |
| **赛后复盘** | "想让学生课后继续讨论" | 比赛结束后保留只读链接 7 天，学生可回看每轮决策和报表 |

### 11.3 程序运营者（开发/运维）视角

**核心诉求**：实现可控、运行稳定、问题可定位、便于回滚。

| 维度 | 运营者反馈 | PRD 补充 |
|------|-----------|---------|
| **实现范围控制** | "PRD 里融资路演、玩家交易太重" | 已明确 Phase A 不做路演、玩家间交易、贷款分红；用拍卖替代交易 |
| **并发安全** | "40 队同时提交会不会锁表" | 决策提交无锁；仅 advance 时锁 `competition_events` 一行；拍卖使用乐观锁 |
| **幂等性** | "学生手贱点了两次提交" | 所有写入使用 `idempotency_key`：`ops_decision:{match_id}:{round_id}:{team_id}` |
| **调试能力** | "结算结果和学生预期不一致时怎么查" | 每轮 `ops_snapshots.result_json` 完整记录中间变量；提供 `/admin/events/{id}/snapshot` 调试接口 |
| **回滚能力** | "结算后发现 bug 怎么办" | 结算函数幂等，可基于上一 round 状态重新执行；设计「重结算」管理员接口（只读验证，不自动写回） |
| **拍卖一致性** | "出价顺序冲突怎么处理" | 出价写入 `ops_auction_bids`，定时任务每秒扫描判定最高价；前端显示「当前领先」可能有 1 秒延迟 |
| **性能基线** | "4 轮结算数据库会膨胀吗" | 4 轮 × 40 队 = 160 行快照 + 160 行提交 + 少量拍卖记录；单场比赛数据 < 1MB |

---

## 12. 与其他商业模拟赛的差异

| 维度 | OPS（本平台） | 阿思丹 ABS | DECA | FBLA | BPA |
|------|-------------|-----------|------|------|-----|
| **核心机制** | 回合制运营 + 资源竞价 | 运营 + 路演 + 拍卖 | 角色扮演 + 案例 | 笔试 + 演讲 | 项目 + IT 技能 |
| **团队规模** | 2~6 人 | 6~8 人 | 1~2 人 | 1~3 人 | 2~4 人 |
| **决策周期** | 4 轮，每轮 8 分钟 | 5 轮，每轮 15~20 分钟 | 10 分钟准备 + 面试 | 笔试 + 演讲 | 长期项目 |
| **评分侧重** | 净资产 + 多维度奖项 | 净资产 + 路演 + 交易 | 演讲 + 商业分析 | 知识测试 + 演讲 | 项目交付 |
| **技术栈** | 全线上、实时结算 | 线下 IT 系统 + 线下路演 | 线下比赛 | 线下/线上混合 | 线下为主 |
| **独特优势** | 45 分钟可完成；支持课堂暂停；AI 对手；简化财务报表 | 品牌强、晋级体系完善 | 演讲训练强 | 知识面广 | 技术应用强 |

---

*商域 BizSim Edu · OPS 引擎 PRD v1.1*
*规范来源：`docs/engine-spec.md`、`docs/engine-design-intent.md`、`02-ARCHITECTURE.md`、`03-ENGINEERING.md`*
