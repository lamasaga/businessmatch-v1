# OPS 引擎 PRD · 生产经营销售 / Operations & Sales

> **引擎简称**：OPS
> **引擎 ID**：`ops_sim`
> **配置 ID**：`ops-sim-v1`
> **中文名**：生产经营销售赛
> **英文名**：Operations & Sales Simulation
> **运行时**：`react-game`
> **设计模式**：`standalone`
> **最后更新**：2026-06-07

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
| **单局时长** | 60~120 分钟 |
| **队伍数量** | 4~20 队常规，扩展至 40 队 |
| **每队人数** | 4~6 人 |
| **标准轮次** | 5 轮运营决策 + 1 轮路演 + 1 轮竞价 + 1 轮产品设计 |

---

## 2. 产品定位

### 2.1 一句话玩法

**OPS 是一场"建公司、做产品、抢市场、比利润"的多轮商业模拟赛**：每支队伍经营一家虚拟公司，经历产品设计、生产运营、市场销售、融资路演、资源竞价五大环节，以最终**净资产**排名决胜负。

### 2.2 核心教育目标

| # | 能力 | 说明 |
|---|------|------|
| 1 | **商业系统设计** | 理解产品-生产-销售-财务的完整闭环 |
| 2 | **资源配置决策** | 在有限预算下权衡生产、营销、人力、研发 |
| 3 | **市场竞争意识** | 通过供需、价格、份额感受竞争动态 |
| 4 | **财务健康观念** | 读懂损益表、资产负债表、现金流量表 |
| 5 | **团队协作与角色分工** | CEO/CFO/CMO/COO 各司其职 |
| 6 | **路演与表达** | 用商业计划书向"投资人"争取资源 |
| 7 | **谈判与博弈** | 在竞价和交易中理解信息不对称 |

### 2.3 目标受众

| 维度 | 说明 |
|------|------|
| **目标年龄** | 14~18 岁（高中生为主，可扩展至大学生） |
| **适合学段** | 高中、国际高中、预科 |
| **单场人数** | 4~20 队常规，可扩展至 40 队 |
| **每队人数** | 4~6 人 |
| **决策类型** | 回合制策略 + 阶段性事件（路演/竞价/产品设计） |

### 2.4 单局节奏

```
┌─────────────────────────────────────────────────────────────────┐
│  0:00  开幕 + 规则讲解 + 组队/角色分配                            │
│  0:15  产品设计提交（15 分钟）                                    │
│  0:30  R1 运营决策（15 分钟）                                     │
│  0:50  R1 结算 + 财务报表（5 分钟）                               │
│  0:55  R2 运营决策（15 分钟）                                     │
│  1:15  R2 结算                                                    │
│  1:20  融资路演（20 分钟）                                        │
│  1:40  R3 运营决策                                                │
│  2:00  资源竞价（15 分钟）                                        │
│  2:15  R4 运营决策                                                │
│  2:35  R5 终局决策                                                │
│  2:55  最终结算 + 颁奖                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 核心循环

### 3.1 五大环节总览

OPS 区别于 FST（纯 RTS 贸易）和 TECH（纯回合制属性竞争）的核心特征是：**混合赛制**——运营决策是主线，但穿插三类特殊事件。

| 环节 | 类型 | 触发时机 | 产出 |
|------|------|----------|------|
| **产品设计** | 一次性 | 开局 | 产品属性卡，影响后续市场需求和价格弹性 |
| **运营决策** | 回合制（5 轮） | 每轮 15 分钟 | 生产、定价、营销、人力、城市布局 |
| **融资路演** | 阶段性 | R2 结束后 | 评委打分 →  bonus 资金 |
| **资源竞价** | 阶段性 | R3 结束后 | 获取稀缺机器/原材料/广告位 |
| **最终结算** | 一次性 | R5 结束后 | 净资产排名，发放 XP/金币/钻石 |

### 3.2 完整流程图

```
创建 match
  ├── 读取 ops-sim-v1.yaml
  ├── 分配队伍和角色
  └── 初始资金：¥100,000
      ↓
环节 0：产品设计（Product Design）
  ├── 选择产品品类（3C / 快消 / 家居）
  ├── 设定目标客群（Geek / Pragmatic / Show）
  ├── 分配设计点数到 Tech / Fit / Show / Price
  └── 提交产品卡
      ↓
环节 1~5：运营决策（Operation Rounds）
  ├── R1：建立 baseline
  ├── R2：初见竞争格局
  ├── R2 后：融资路演（Roadshow）
  ├── R3：引入外部资源
  ├── R3 后：资源竞价（Auction）
  ├── R4：中期竞争白热化
  └── R5：终局冲刺
      ↓
最终结算
  ├── 按净资产排名
  ├── 特殊奖项：最佳路演 / 最佳交易 / 最佳产品
  └── 发放 Career 资源奖励
```

### 3.3 状态机

| 状态 | 说明 | 可执行操作 |
|------|------|-----------|
| `product_design` | 产品设计阶段 | 编辑产品卡、提交 |
| `operation_round_{1~5}` | 运营决策轮 | 提交决策表 |
| `roadshow` | 融资路演 | 上传 PPT/海报、评委评分 |
| `auction` | 资源竞价 | 出价、交易 |
| `settlement` | 结算中 | 只读 |
| `finished` | 比赛结束 | 查看结果、复盘 |

---

## 4. 决策设计

### 4.1 环节 0：产品设计（Product Design）

每支队伍开局获得 **100 设计点数**，分配到四个维度：

| 维度 | 英文名 | 效果 |
|------|--------|------|
| **技术创新** | Tech | 提升 Geek 客群偏好，降低生产成本 |
| **用户匹配** | Fit | 提升 Pragmatic 客群偏好，提高复购率 |
| **品牌影响力** | Show | 提升 Show 客群偏好，提高溢价能力 |
| **价格竞争力** | Price | 降低单位成本，提升价格弹性 |

**产品卡 Schema**：

```json
{
  "team_id": 1,
  "product_name": "智享台灯",
  "category": "home",
  "target_segment": "pragmatic",
  "tech_points": 30,
  "fit_points": 40,
  "show_points": 20,
  "price_points": 10,
  "slogan": "为孩子视力护航",
  "submitted_at": "2026-06-07T09:15:00Z"
}
```

**设计评分（自动）**：
- 总分 = Tech + Fit + Show + Price = 100（强制）
- 一致性 bonus：若 target_segment 与最高分配维度匹配，+5% 后续市场效率
  - Geek 客群 → Tech 最高
  - Pragmatic 客群 → Fit 最高
  - Show 客群 → Show 最高

### 4.2 环节 1~5：运营决策（Operation Decision）

每轮每队提交一张**决策表**，包含以下字段：

| 决策项 | 英文名 | 类型 | 说明 |
|--------|--------|------|------|
| 生产量 | `production_quantity` | int | 本轮计划生产的产品数量 |
| 出厂定价 | `unit_price` | float | 每单位产品售价 |
| 市场营销投入 | `marketing_spend` | float | 广告投放、品牌推广 |
| 研发投入 | `rnd_spend` | float | 提升 Tech/Fit 属性 |
| 销售人员数 | `sales_force` | int | 影响各城市市场覆盖 |
| 目标城市 | `target_cities` | list[str] | 选择进入的城市（最多 3 个） |
| 员工工资 | `wage_level` | enum | `low` / `medium` / `high`，影响产能利用率 |
| 融资申请 | `loan_request` | float | 可向银行申请贷款（有利息） |
| 分红 | `dividend` | float | 向股东分红（减少现金） |

**校验规则**：

1. `production_quantity >= 0`
2. `unit_price >= unit_cost`（不得低于可变成本）
3. `marketing_spend + rnd_spend + sales_force * wage_per_head <= available_cash`
4. 每个 `target_city` 必须已支付**开城费**（首次进入该城市需一次性费用）
5. `loan_request <= max_loan = net_assets * 0.5`
6. `dividend <= net_profit_last_round`

### 4.3 环节 R2 后：融资路演（Roadshow）

**触发条件**：R2 运营结算完成后

**提交物**：
1. 产品海报（image）
2. 路演 PPT（PDF 或 slide 数据）
3. 3 分钟演讲稿（text）
4. 团队分工说明

**评分维度**（参考阿思丹 ABS 路演）：

| 维度 | 权重 | 评审要点 |
|------|------|----------|
| 商业逻辑清晰度 | 25% | 商业模式自洽、市场机会真实 |
| 数据支撑力度 | 20% | 使用财务预测、市场调研数据 |
| 团队说服力 | 20% | 演讲表达、问答应对、团队协作 |
| 创新性与差异化 | 20% | 与竞争对手的差异化优势 |
| 可行性 | 15% | 执行计划现实、时间表合理 |

**评分者**：
- 正式赛：教师/组织者 + 学生互评
- 练习赛：AI 评委（规则模板，B 阶段）

**奖励**：
- 路演得分前 30% 队伍获得 bonus 资金
- `bonus = base_bonus * (1 + rank_coefficient)`
- base_bonus = ¥20,000

### 4.4 环节 R3 后：资源竞价（Auction）

**触发条件**：R3 运营结算完成后

**拍品种类**：

| 拍品 | 说明 | 效果 |
|------|------|------|
| 生产线 A | 原材料生产线 | 每轮自动产出 500 单位原材料 |
| 生产线 B | 高端生产线 | 每轮产出 300 单位，但品质 +20% |
| 城市广告位 | 某城市置顶展示 | 该城市 Show 属性 +15% |
| 原材料包 | 一次性 1000 单位 | 直接补充库存 |
| 技术专利 | 一次性 | Tech 属性 +10 |

**拍卖形式**：
- 英式拍卖：公开加价，价高者得
- 密封一价拍卖：同时出价，最高价成交
- 荷兰式拍卖：价格从高往低降，首个接受者得

**交易系统**：
- 未拍得生产线的队伍必须从其他队伍购买原材料
- 平台提供交易大厅：挂买单/卖单
- 交易价格由双方协商，系统记录合同

**拍卖评分**：
- "最佳交易团队" 奖：综合拍卖得分 + 交易利润

### 4.5 特殊机制

#### 开城费

首次进入某城市需支付一次性开城费：

```
开城费 = base_open_cost * city_tier_multiplier
```

| 城市等级 | 乘数 | 示例城市 |
|----------|------|----------|
| 一线城市 | 2.0x | 上海、北京 |
| 新一线 | 1.5x | 杭州、成都 |
| 二线 | 1.0x | 南京、武汉 |
| 三线 | 0.6x | 合肥、无锡 |

#### 间谍机制（可选）

投入 ¥8,000 可查看指定队伍上轮决策摘要（不含本轮）。

#### 联盟机制（可选）

两队可结盟，共享某城市的 Fit 属性加成，但联盟可随时单方面解除。

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

1. **计算各队产能上限**
   ```
   max_production = factory_capacity + hired_workers * worker_productivity
   ```

2. **限制生产量**
   - 若 `decision.production > max_production`，则按 `max_production` 生产
   - 若原材料不足，按原材料可支持的最大产量生产

3. **计算单位成本**
   ```
   unit_cost = raw_material_cost + labor_cost_per_unit + overhead_per_unit
   overhead_per_unit = fixed_cost / production_quantity
   ```

4. **市场需求计算**
   对每个城市，计算各队的**有效属性得分**：
   ```
   score_i = w_tech * Tech_i + w_fit * Fit_i + w_show * Show_i - w_price * Price_i
   ```
   其中 `Price_i = unit_price_i / market_average_price`

   使用 Softmax 计算市场份额：
   ```
   market_share_i = exp(beta * score_i) / sum_j(exp(beta * score_j))
   ```

5. **销量计算**
   ```
   demand_i = market_share_i * city_market_size
   sales_i = min(demand_i, production_quantity_i + inventory_i)
   ```

6. **收入与利润**
   ```
   revenue_i = sales_i * unit_price_i
   cogs_i = sales_i * unit_cost_i
   gross_profit_i = revenue_i - cogs_i
   operating_expenses_i = marketing_spend + rnd_spend + sales_force * wage + city_opening_fees
   operating_profit_i = gross_profit_i - operating_expenses_i
   interest_i = outstanding_loan * interest_rate
   net_profit_i = operating_profit_i - interest_i
   ```

7. **现金流更新**
   ```
   cash_i = cash_i + revenue_i - cogs_i - operating_expenses_i - interest_i + new_loan - dividend - principal_repayment
   ```

8. **库存结转**
   ```
   inventory_i = production_quantity_i + previous_inventory_i - sales_i
   inventory_holding_cost_i = inventory_i * holding_cost_per_unit
   ```

9. **贷款更新**
   - 每轮偿还 10% 本金
   - 利息按余额计算

10. **属性更新**
    ```
    Tech_i += rnd_spend * tech_conversion_rate
    Fit_i += rnd_spend * fit_conversion_rate
    Show_i += marketing_spend * show_conversion_rate
    ```

11. **净资产计算**
    ```
    net_assets_i = cash_i + inventory_i * unit_cost_i - outstanding_loan_i
    ```

12. **生成财务报表和新闻事件**

### 5.3 财务报表结构

每轮结算后，每支队伍收到三张报表：

#### 损益表（Income Statement）

| 项目 | 计算 |
|------|------|
| 营业收入 | 销量 × 单价 |
| 营业成本 | 销量 × 单位成本 |
| 毛利润 | 营业收入 - 营业成本 |
| 营销费用 | marketing_spend |
| 研发费用 | rnd_spend |
| 人力费用 | sales_force × wage |
| 管理费用 | fixed_overhead |
| 运营利润 | 毛利润 - 各项费用 |
| 利息支出 | outstanding_loan × interest_rate |
| 净利润 | 运营利润 - 利息支出 |

#### 资产负债表（Balance Sheet）

| 资产 | 计算 |
|------|------|
| 现金 | cash |
| 存货 | inventory × unit_cost |
| 固定资产 | equipment_value |
| **总资产** | 以上之和 |

| 负债 | 计算 |
|------|------|
| 银行贷款 | outstanding_loan |
| 应付账款 | 临时赊购 |
| **总负债** | 以上之和 |

| 所有者权益 | 计算 |
|------------|------|
| 初始资本 | 100,000 |
| 累计利润 | sum(net_profit) |
| 已分红 | -sum(dividend) |
| **净资产** | 总资产 - 总负债 |

#### 现金流量表（Cash Flow Statement）

| 项目 | 计算 |
|------|------|
| 经营活动现金流 | 销售收入 - 成本 - 运营支出 |
| 投资活动现金流 | 设备购买/出售 |
| 筹资活动现金流 | 贷款 - 还款 - 分红 |
| 现金净变化 | 以上之和 |

### 5.4 事件系统

每轮结算后可能触发市场事件：

| 事件 | 触发条件 | 效果 |
|------|----------|------|
| 消费降级 | 随机 15% | 所有城市 Show 偏好 -10%，价格敏感度 +10% |
| 科技突破 | 某队 Tech > 阈值 | 全行业 Tech 加成 +5% |
| 政策补贴 | 随机 10% | 某城市开城费减半 |
| 竞品破产 | 某队连续 2 轮亏损 | 释放其市场份额 |
| 原材料涨价 | 随机 12% | 原材料成本 +20% |
| 品牌丑闻 | Show 投入最高队 | 该队 Show 效率 -30% |

### 5.5 最终排名

比赛结束时按 `净资产` 降序排名：

```
总得分 = 净资产 × 0.6 + 累计净利润 × 0.25 + 路演得分 × 0.1 + 产品设计得分 × 0.05
```

特殊奖项：
- 最佳运营团队：累计净利润最高
- 最佳路演团队：路演得分最高
- 最佳交易团队：竞价 + 交易利润最高
- 最佳产品设计：产品设计得分最高

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
- 不主动借贷，除非现金流 < 30,000
- 稳健扩张，优先进入二线城市

### 6.3 Aggressive（激进型）

- 生产量 = 预期需求的 120%（冒险库存）
- 定价 = 行业平均价的 0.85 倍（低价抢份额）
- 高营销投入，快速建立 Show 属性
- 积极借贷扩张
- 优先进入一线城市

### 6.4 Conservative（保守型）

- 生产量 = 预期需求的 70%
- 定价 = 行业平均价的 1.1 倍（溢价策略）
- 低营销，高研发
- 避免借贷
- 深耕单一城市

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

复用 `competition_events` 和 `competition_participants`。

#### OPS 运行时表

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `ops_team_states` | 队伍运行时状态 | `id`, `event_id`, `team_id`, `cash`, `inventory`, `tech`, `fit`, `show`, `net_assets`, `outstanding_loan` |
| `ops_rounds` | 轮次状态 | `id`, `event_id`, `round_number`, `status`, `market_snapshot`, `started_at`, `ended_at` |
| `ops_submissions` | 每轮决策提交 | `id`, `round_id`, `team_id`, `decision_json`, `submitted_at` |
| `ops_snapshots` | 结算快照 | `id`, `round_id`, `team_id`, `result_json`, `financial_statements` |
| `ops_products` | 产品设计卡 | `id`, `event_id`, `team_id`, `product_name`, `category`, `tech_points`, `fit_points`, `show_points`, `price_points` |
| `ops_auction_bids` | 拍卖出价 | `id`, `auction_id`, `team_id`, `item_id`, `bid_amount`, `bid_type` |
| `ops_contracts` | 交易合同 | `id`, `event_id`, `buyer_team_id`, `seller_team_id`, `item_id`, `quantity`, `unit_price`, `status` |
| `ops_roadshows` | 路演提交 | `id`, `event_id`, `team_id`, `poster_url`, `slides_url`, `speech_text`, `score`, `judge_feedback` |

### 7.2 队伍运行时状态

```json
{
  "team_id": 1,
  "cash": 95000,
  "inventory": 120,
  "tech": 32,
  "fit": 45,
  "show": 23,
  "price_competitiveness": 15,
  "net_assets": 98000,
  "outstanding_loan": 0,
  "factories": ["line_a"],
  "entered_cities": ["hangzhou"],
  "employees": {
    "sales_force": 3,
    "engineers": 2
  },
  "cumulative_profit": -2000
}
```

### 7.3 API 端点

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/v1/ops/events/{event_id}/state` | 获取当前比赛状态 |
| POST | `/api/v1/ops/events/{event_id}/product-design` | 提交产品设计 |
| POST | `/api/v1/ops/events/{event_id}/decisions` | 提交运营决策 |
| POST | `/api/v1/ops/events/{event_id}/roadshow` | 提交路演材料 |
| POST | `/api/v1/ops/events/{event_id}/auction/bid` | 拍卖出价 |
| POST | `/api/v1/ops/events/{event_id}/auction/trade` | 发起交易 |
| GET | `/api/v1/ops/events/{event_id}/financials` | 获取财务报表 |
| GET | `/api/v1/ops/events/{event_id}/ranking` | 获取实时排名 |
| POST | `/api/v1/ops/events/{event_id}/advance` | 推进下一轮（组织者） |

### 7.4 大规模参赛设计（15~40 支队伍）

| 设计点 | 说明 |
|--------|------|
| **结算复杂度** | Softmax 份额计算 O(n)，40 队约 1ms，可接受 |
| **数据库设计** | 每轮每队一条 `ops_submissions` + `ops_snapshots`，5 轮 × 40 队 = 200 行/表，可控 |
| **并发提交** | 决策提交各自写入，无锁竞争 |
| **结算锁** | 仅 `advance` 时锁定 `competition_events` 一行，锁持有 < 100ms |
| **前端展示** | 排行榜使用分页或 Top 10 + "我的排名" |
| **路演评分** | 40 队路演时间紧张，建议：练习赛 AI 评分；正式赛按组并行 + 评委轮换 |
| **拍卖并发** | 拍卖阶段所有队伍同时出价，使用乐观锁处理并发 |

---

## 8. 前端局内

### 8.1 运行时选型

OPS 选择 **`react-game`** 运行时，因为：
- 玩法以面板、表格、表单决策为主
- 需要展示财务报表、排行榜、市场数据
- 路演和拍卖阶段适合 React 组件实现
- 不需要地图/实时空间移动

### 8.2 组件清单

| 组件 | 说明 |
|------|------|
| `OpsEntry` | Game Shell 挂载点 |
| `DashboardLayout` | 三栏布局：左侧状态 / 中部决策 / 右侧市场情报 |
| `ProductDesignPanel` | 产品设计表单 |
| `DecisionForm` | 运营决策表 |
| `FinancialStatements` | 损益表/资产负债表/现金流量表 |
| `MarketOverview` | 市场份额、城市需求、竞争对手动态 |
| `RoadshowUploader` | 路演材料上传 |
| `AuctionHall` | 拍卖大厅：拍品列表、出价面板、倒计时 |
| `TradingFloor` | 交易大厅：挂单、成交记录 |
| `RankingPanel` | 排行榜 |
| `NewsTicker` | 市场事件滚动 |

### 8.3 主要交互流程

1. **进入对局**：`/games/:id/ops` → `OpsEntry`
2. **产品设计**：填写产品卡，分配点数，提交
3. **运营决策**：每轮调整生产、定价、营销、人力、城市
4. **查看报表**：结算后查看损益表、资产负债表
5. **路演提交**：上传海报/PPT/演讲稿
6. **拍卖出价**：选择拍品，输入出价
7. **交易大厅**：发布买单/卖单，与其他队伍协商
8. **最终结算**：查看排名和奖项

### 8.4 状态管理

```ts
interface OpsState {
  gameState: OpsGameState | null;
  currentRound: number;
  phase: 'product_design' | 'operation' | 'roadshow' | 'auction' | 'finished';
  loading: boolean;
  error: string | null;
  fetchGameState(eventId: number): Promise<void>;
  submitProductDesign(eventId, payload): Promise<void>;
  submitDecision(eventId, roundId, payload): Promise<void>;
  submitRoadshow(eventId, payload): Promise<void>;
  placeBid(eventId, auctionId, amount): Promise<void>;
  postTrade(eventId, payload): Promise<void>;
}
```

### 8.5 素材需求

| 素材类型 | 说明 |
|----------|------|
| 产品品类图标 | 3C、快消、家居 |
| 城市图标 | 一线/新一线/二线/三线 |
| 角色头像 | CEO、CFO、CMO、COO |
| 财务报表模板 | 损益表、资产负债表、现金流量表 |
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
  description: 多轮商业模拟：产品设计、运营决策、融资路演、资源竞价
  version: "1.0.0"
  author: BizSim Edu
  target_age: [14, 18]
  runtime: react-game
defaults:
  rounds: 5
  teams: 8
  members_per_team: 4
  initial_capital: 100000
  initial_inventory: 0
  max_production_per_round: 500
  decision_time_minutes: 15
  roadshow_time_minutes: 20
  auction_time_minutes: 15
  
product_categories:
  electronics:
    name: 3C电子
    base_material_cost: 80
    base_labor_cost: 30
    base_overhead: 5000
    market_size_multiplier: 1.2
  fast_moving:
    name: 快消品
    base_material_cost: 20
    base_labor_cost: 10
    base_overhead: 2000
    market_size_multiplier: 1.5
  home:
    name: 家居用品
    base_material_cost: 50
    base_labor_cost: 20
    base_overhead: 3500
    market_size_multiplier: 1.0

cities:
  shanghai:
    name: 上海
    tier: 1
    market_size: 10000
    opening_cost: 30000
    geek_ratio: 0.25
    pragmatic_ratio: 0.45
    show_ratio: 0.30
  hangzhou:
    name: 杭州
    tier: 2
    market_size: 6000
    opening_cost: 15000
    geek_ratio: 0.45
    pragmatic_ratio: 0.30
    show_ratio: 0.25
  # ... 更多城市

scoring_weights:
  net_assets: 0.60
  cumulative_profit: 0.25
  roadshow: 0.10
  product_design: 0.05

auction_items:
  - id: line_a
    name: 标准生产线
    type: english
    base_price: 25000
    effect: "每轮产出 500 单位原材料"
  - id: line_b
    name: 高端生产线
    type: english
    base_price: 40000
    effect: "每轮产出 300 单位，品质 +20%"
  - id: ad_shanghai
    name: 上海广告位
    type: sealed_first
    base_price: 15000
    effect: "上海 Show +15%"

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
| `rounds` | 5 | 运营决策轮数 |
| `decision_time_minutes` | 15 | 每轮决策时间 |
| `market_size` | 按城市 | 该城市总需求量 |
| `beta` | 2.0 | Softmax 选择锐度 |
| `interest_rate` | 0.05 | 每轮贷款利率 |
| `inventory_holding_cost` | 2 | 每单位存货每轮成本 |
| `loan_repayment_rate` | 0.10 | 每轮强制还本比例 |

---

## 10. 实现参考与 Checklist

### 10.1 关键参考文件

#### 项目内参考

| 路径 | 作用 |
|------|------|
| `inspire/a商赛主题与真题库/01-青少年层级赛事主题与真题/91-阿思丹ABS主题与真题.md` | 阿思丹赛制核心素材 |
| `inspire/a商赛主题与真题库/02-平台内置赛制主题库/03-拍卖交易大厅主题.md` | 拍卖机制设计参考 |
| `inspire/a商赛主题与真题库/02-平台内置赛制主题库/04-产业链角色扮演主题.md` | 交易谈判参考 |
| `inspire/a商赛主题与真题库/02-平台内置赛制主题库/02-实时经营挑战主题.md` | 财务健康指标参考 |
| `inspire/54-模拟商赛形式与类型库.md` | GameMode 抽象接口 |
| `inspire/72-十种商赛形式的原理与商业知识论述.md` | 经济学与博弈论原理 |
| `backend/app/games/techventure/v6_engine.py` | Softmax 份额计算参考 |
| `backend/app/games/techventure/settle.py` | DB 编排模式参考 |
| `backend/app/games/techventure/practice_flow.py` | 练习赛自动推进参考 |
| `backend/app/games/trading/rts_pricing.py` | 价格压力模型参考 |

#### 外部参考

- [ASDAN Business Simulation - AISG](https://www.aisgz.org.cn/news/asdan-business-simulation)
- [阿思丹模拟商赛 ASDAN｜上海双语学校美达菲专场](https://www.sohu.com/a/612757793_121273103)
- [ASDAN 商赛回顾](https://www.sohu.com/a/676261394_121423587)
- [DECA vs FBLA - College Confidential](https://talk.collegeconfidential.com/t/deca-vs-fbla/263005)
- [美国三大商赛 BPA、FBLA、DECA 该怎么选？](https://zhuanlan.zhihu.com/p/708925525)

### 10.2 实现 Checklist

- [ ] 完善 `ops-sim-v1.yaml`（城市、产品品类、拍卖品、事件库）
- [ ] 实现 `ops_sim/engine.py`：`settle_round` 结算函数
- [ ] 实现 `ops_sim/ai.py`：balanced / aggressive / conservative 三种 AI
- [ ] 定义 `ops_sim/models.py`：所有 SQLAlchemy 模型
- [ ] 新建 `api/ops.py`：注册所有 OPS API 路由
- [ ] 在 `main.py` 挂载 ops router
- [ ] 更新 `init_db.py` 导入 OPS 模型
- [ ] 前端 `games/ops-sim/`：实现 DashboardLayout、DecisionForm、FinancialStatements
- [ ] 前端：实现 ProductDesignPanel
- [ ] 前端：实现 AuctionHall、TradingFloor
- [ ] 前端：实现 RoadshowUploader
- [ ] 前端：新建 `stores/opsStore.ts`
- [ ] 在 `App.tsx` 注册 `/games/:id/ops` 路由
- [ ] 手动测试：4 队完整一局
- [ ] 压力测试：40 队结算性能

### 10.3 性能红线

| 指标 | 目标 |
|------|------|
| 单轮结算延迟 | < 200ms（40 队） |
| 前端首屏加载 | < 3s |
| 决策提交并发 | 支持 40 队同时提交 |
| 财务报表生成 | < 100ms |
| 拍卖出价响应 | < 50ms |

---

## 11. 与其他商业模拟赛的差异

| 维度 | OPS（本平台） | 阿思丹 ABS | DECA | FBLA | BPA |
|------|-------------|-----------|------|------|-----|
| **核心机制** | 回合制运营 + 路演 + 竞价 | 运营 + 路演 + 拍卖 | 角色扮演 + 案例 | 笔试 + 演讲 | 项目 + IT 技能 |
| **团队规模** | 4~6 人 | 6~8 人 | 1~2 人 | 1~3 人 | 2~4 人 |
| **决策周期** | 5 轮，每轮 15 分钟 | 5 轮，每轮 15~20 分钟 | 10 分钟准备 + 面试 | 笔试 + 演讲 | 长期项目 |
| **评分侧重** | 净资产 + 多维度奖项 | 净资产 + 路演 + 交易 | 演讲 + 商业分析 | 知识测试 + 演讲 | 项目交付 |
| **技术栈** | 全线上、实时结算 | 线下 IT 系统 + 线下路演 | 线下比赛 | 线下/线上混合 | 线下为主 |
| **独特优势** | 可 15~40 队同场；AI 对手；完整财务报表；教学设计化 | 品牌强、晋级体系完善 | 演讲训练强 | 知识面广 | 技术应用强 |

---

*商域 BizSim Edu · OPS 引擎 PRD v1.0*
*研究来源：ASDAN 官方赛事资料、DECA/FBLA/BPA 公开赛制、项目 inspire 素材库*
