# OPS 经济模型 SPEC · 生产经营销售赛

> **文档定位**：OPS 引擎经济学与管理学模型契约。本文定义生产、成本、市场需求、广告效应、研发效应、拍卖资源、库存、财务报表、排名与 AI 对手的数学公式。
> **对应 PRD**：[PRD-OPS.md](./PRD-OPS.md)
> **对应技术 SPEC**：[SPEC-OPS.md](./SPEC-OPS.md)
> **最后更新**：2026-06-16

---

## 1. 建模原则

　　OPS 的目标不是做专业企业 ERP，也不是做严肃经济学估计系统，而是在青少年商赛中提供**可解释、可调参、可复现、可自动结算**的经营模拟。模型应优先满足四个要求：学生能理解因果、教师能讲解结果、开发能稳定实现、运营能通过 YAML 调参。

| 原则 | 说明 |
|------|------|
| 可解释 | 每轮销量、利润、排名必须能拆成价格、产品力、营销、渠道、库存、成本等因素 |
| 可复现 | 相同配置、相同提交、相同随机种子必须得到相同结果 |
| 可调参 | 产品品类、城市规模、客群权重、广告转化、研发转化、事件强度均来自 YAML |
| 可控复杂度 | P0 使用确定性公式与少量可种子化随机；不引入 LLM、黑箱回归或不可解释评分 |

### 1.1 参考模型

| 参考对象 | OPS 采用方式 |
|----------|--------------|
| 阿思丹/ABS 商业模拟 | 参考多轮经营、资源竞拍、净资产排名的赛程形态 |
| 多项 Logit / Softmax 离散选择 | 用于城市内竞争队伍的市场份额分配 |
| Nerlove-Arrow 广告存量思想 | 用“广告/品牌存量”表达营销投入的递延影响 |
| 库存持有成本 / EOQ 基本思想 | 用单位库存持有成本表达库存占用、仓储与滞销压力 |
| 管理会计 | 用收入、COGS、毛利、期间费用、库存价值、净资产构成报表 |

---

## 2. 符号表

| 符号 | 含义 |
|------|------|
| `i` | 队伍 |
| `r` | 运营轮，`r ∈ {1,2,3,4,5,6}` |
| `c` | 城市 |
| `k` | 产品品类 |
| `s` | 目标客群 |
| `P_{i,r}` | 队伍 `i` 在第 `r` 轮设置的单价 |
| `Q^plan_{i,r}` | 计划生产量 |
| `Q_{i,r}` | 实际生产量 |
| `D_{i,c,r}` | 队伍 `i` 在城市 `c` 的需求量 |
| `Sales_{i,r}` | 队伍 `i` 当轮实际销量 |
| `Inv_{i,r}` | 期末库存 |
| `Cash_{i,r}` | 期末现金 |
| `NA_{i,r}` | 期末净资产 |
| `Profit_{i,r}` | 当轮净利润 |
| `CumProfit_{i,r}` | 累计净利润 |
| `Tech_{i,r}` | 技术/产品性能存量 |
| `Fit_{i,r}` | 产品-客群匹配度 |
| `Brand_{i,c,r}` | 城市维度品牌/广告存量 |
| `Show_{i,r}` | 全局展示/品牌表达能力，可由 `Brand` 聚合得到 |
| `Cap_{i,r}` | 当轮产能 |
| `U_{i,c,r}` | 队伍 `i` 在城市 `c` 的消费者效用 |
| `Share_{i,c,r}` | 队伍 `i` 在城市 `c` 的市场份额 |
| `M_{c,r}` | 城市 `c` 当轮市场容量 |

---

## 3. 状态变量

### 3.1 队伍状态

```yaml
team_state:
  cash: number
  inventory: number
  net_assets: number
  cumulative_profit: number
  tech: number
  fit: number
  show: number
  brand_by_city: map[city_id, number]
  entered_cities: list[city_id]
  factories: list[resource]
  channels: list[resource]
  protections: list[resource]
  discount_rate: number
```

　　当前首期代码已有 `cash`、`inventory`、`net_assets`、`cumulative_profit`、`tech`、`fit`、`show`、`entered_cities`、`factories`、`ads`、`discount_rate`。P0 可以保留 `show` 作为全局品牌变量；若实现城市广告位和渠道差异，建议新增 `brand_by_city`，否则城市广告位无法稳定解释。

### 3.2 决策变量

```yaml
decision:
  production_quantity: int
  unit_price: number
  marketing_spend: number
  rnd_spend: number
  sales_force: int
  target_cities: list[city_id]
```

### 3.3 配置变量

　　以下参数必须来自 `ops-sim-v1.yaml` 或后续主题配置包，不应硬编码在结算函数中。

| 参数 | 建议默认 | 含义 |
|------|----------|------|
| `base_capacity` | 200 | 基础产能 |
| `worker_productivity` | 20 | 每名销售/运营人员带来的履约或销售能力加成 |
| `wage_per_head` | 1500 | 单人单轮工资 |
| `holding_cost_per_unit` | 2 | 单位库存持有成本 |
| `fixed_overhead` | 3500 | 固定管理费用 |
| `tech_decay` | 0.00~0.05 | 技术存量衰减率 |
| `brand_decay` | 0.10~0.30 | 广告/品牌存量衰减率 |
| `tech_response_alpha` | 0.8~2.0 | 研发响应强度 |
| `brand_response_alpha` | 0.8~2.0 | 广告响应强度 |
| `logit_beta` | 0.15~0.50 | 市场份额敏感度 |
| `price_sensitivity` | 1.0~3.0 | 价格惩罚强度 |
| `stockout_penalty` | 0.00~0.20 | 缺货带来的口碑损失 |

---

## 4. 产品定位与初始属性

### 4.1 品类基础参数

每个品类 `k` 需要定义：

```yaml
product_categories:
  home:
    base_material_cost: 50
    base_labor_cost: 20
    base_overhead: 3500
    base_price: 140
    market_size_multiplier: 1.0
    tech_base: 20
    fit_base: 20
    show_base: 20
```

### 4.2 目标客群权重

每个客群 `s` 对属性的权重满足：

```text
w^Tech_s + w^Fit_s + w^Show_s = 1
```

示例：

```yaml
consumer_segments:
  pragmatic:
    tech_weight: 0.22
    fit_weight: 0.60
    show_weight: 0.18
```

### 4.3 初始产品-客群匹配度

P0 可以使用固定初值：

```text
Fit_{i,0} = fit_base_k
Tech_{i,0} = tech_base_k
Show_{i,0} = show_base_k
```

P1 可引入品类与客群匹配矩阵：

```text
Fit_{i,0} = fit_base_k + FitBonus_{k,s}
```

其中 `FitBonus_{k,s}` 来自 YAML。这样可解释“家居用品更适合实用主义者”“3C 更适合技术爱好者”等主题差异。

---

## 5. 生产与产能模型

### 5.1 产能

```text
Cap_{i,r} = BaseCap
          + Σ CapacityBonus_{resource ∈ factories_i}
          + WorkerProductivity × SalesForce_{i,r}
          + ChannelCapacityBonus_{i,r}
```

约束：

```text
Q_{i,r} = min(max(Q^plan_{i,r}, 0), Cap_{i,r}, MaxProductionPerRound)
```

说明：

- 生产线拍品通过 `CapacityBonus` 提升产能。
- 销售/运营人员在 P0 中既代表履约能力，也代表市场触达能力；如果后续拆分 COO/销售，可拆成 `production_workers` 与 `sales_force`。
- `MaxProductionPerRound` 是防止极端数值破坏课堂体验的安全阀。

### 5.2 单位成本

```text
RawCost_{i,r} = BaseMaterialCost_k
              × MaterialCostMultiplier_r
              × (1 - DiscountRate_i)
```

```text
UnitCost_{i,r} = RawCost_{i,r}
               + BaseLaborCost_k
               + BaseOverhead_k / max(Q_{i,r}, 1)
```

说明：

- 原材料折扣拍品修改 `DiscountRate_i`。
- 原材料涨价事件修改 `MaterialCostMultiplier_r`。
- 固定制造费用被产量摊薄，能体现规模经济，但用 `max(Q,1)` 防止除零。

### 5.3 生产现金流

P0 采用“生产时支付原材料，销售时确认 COGS”的简化会计：

```text
RawSpend_{i,r} = Q_{i,r} × RawCost_{i,r}
```

```text
COGS_{i,r} = Sales_{i,r} × UnitCost_{i,r}
```

若后续要更严格，应改为加权平均库存成本。P0 暂不要求，因为会显著增加解释复杂度。

---

## 6. 研发模型

### 6.1 研发投入的边际递减

研发投入不应线性无限增长，否则有钱队伍会滚雪球。P0 建议用对数响应：

```text
ΔTech_{i,r} = α_Tech × ln(1 + RnDSpend_{i,r} / RnDScale)
```

```text
Tech_{i,r} = (1 - δ_Tech) × Tech_{i,r-1} + ΔTech_{i,r} + QualityBonus_{i}
```

参数：

| 参数 | 含义 |
|------|------|
| `α_Tech` | 研发转化强度 |
| `RnDScale` | 研发投入规模化参数，例如 5000 |
| `δ_Tech` | 技术折旧或代际变化，P0 可设 0 |
| `QualityBonus_i` | 高端生产线、战略资源等带来的品质加成 |

### 6.2 产品匹配度

P0 中 `Fit` 可保持稳定，仅由定位决定。P1 可让研发小幅提升 Fit：

```text
ΔFit_{i,r} = α_Fit × ln(1 + RnDSpend_{i,r} / FitScale) × SegmentFocus_{i}
```

```text
Fit_{i,r} = min(FitMax, Fit_{i,r-1} + ΔFit_{i,r})
```

如果 P0 保持 `Fit` 不变，必须在前端文案中解释：`Fit` 代表开局定位与客群匹配，`Tech` 代表后续研发改善。

---

## 7. 广告、品牌与渠道模型

### 7.1 广告存量

广告不应只在当轮生效，也不应无限积累。P0 建议使用 Nerlove-Arrow 风格的广告/品牌存量：

```text
Brand_{i,c,r} = (1 - δ_Brand) × Brand_{i,c,r-1}
              + α_Brand × ln(1 + MarketingSpend_{i,r,c} / MarketingScale)
              + AdSlotBonus_{i,c}
              + EndorsementBonus_i
```

如果前端只让队伍填写一个总营销投入，而不是分城市投放，则按目标城市平均分摊：

```text
MarketingSpend_{i,r,c} =
  MarketingSpend_{i,r} / max(|TargetCities_{i,r}|, 1)
```

### 7.2 全局 Show

如果短期不实现 `brand_by_city`，可用全局 `Show` 近似：

```text
Show_{i,r} = (1 - δ_Show) × Show_{i,r-1}
           + α_Show × ln(1 + MarketingSpend_{i,r} / MarketingScale)
           + Σ ShowBonus_{resource}
```

但城市广告位必须至少在城市效用中体现：

```text
CityAdMultiplier_{i,c} =
  Π show_multiplier_{ad ∈ ads_i, ad.city = c}
```

```text
EffectiveShow_{i,c,r} = Show_{i,r} × CityAdMultiplier_{i,c}
```

### 7.3 独家渠道

渠道资源不应直接“送销量”，而应通过市场容量、进入成本或份额效用影响竞争：

```text
ChannelDemandMultiplier_{i,c} = Π demand_multiplier_{channel ∈ channels_i, channel.city = c or global}
```

```text
ChannelUtilityBonus_{i,c} = Σ utility_bonus_{channel ∈ channels_i, channel.city = c or global}
```

```text
OpeningCost_{i,c,r} = BaseOpeningCost_c × TierMultiplier_c × (1 - ChannelOpeningDiscount_{i,c})
```

P0 建议支持三种渠道效果：

| 效果字段 | 公式位置 |
|----------|----------|
| `demand_multiplier` | 放大该队可触达市场容量 |
| `utility_bonus` | 增加城市内 Logit 效用 |
| `opening_cost_discount` | 降低开城费 |

---

## 8. 城市市场容量

### 8.1 基础市场容量

```text
M_{c,r} = BaseMarketSize_c
        × CategoryMarketMultiplier_k
        × EventMarketMultiplier_{c,r}
        × RoundGrowthMultiplier_r
```

P0 可简化为：

```text
M_{c,r} = BaseMarketSize_c
```

但如果同一城市里不同队伍品类不同，更合理的 P0+ 是按品类计算容量：

```text
M_{c,k,r} = BaseMarketSize_c × CategoryMarketMultiplier_k
```

### 8.2 城市客群结构

当前 YAML 里城市有 `geek_ratio`、`pragmatic_ratio`、`show_ratio`。建议不要只取 `dominant_segment`，而是计算城市综合权重：

```text
w^Tech_c = geek_ratio_c × w^Tech_geek
         + pragmatic_ratio_c × w^Tech_pragmatic
         + show_ratio_c × w^Tech_show
```

同理：

```text
w^Fit_c, w^Show_c
```

这样上海、杭州、成都等城市的消费者偏好会真正进入模型。

---

## 9. 价格效应

### 9.1 参考价格

每个品类有基础价：

```text
RefPrice_{k,r} = BasePrice_k
```

也可以使用城市内竞争均价：

```text
AvgPrice_{c,r} = average(P_{j,r} for j ∈ ActiveTeams_c)
```

P0 推荐用混合参考价，避免所有队伍集体涨价后价格惩罚消失：

```text
PriceRef_{i,c,r} = λ × BasePrice_k + (1 - λ) × AvgPrice_{c,r}
```

其中 `λ ∈ [0.5, 0.8]`。

### 9.2 价格惩罚

推荐使用对数价格惩罚：

```text
PricePenalty_{i,c,r} = γ_price_c × ln(P_{i,r} / PriceRef_{i,c,r})
```

解释：

- 当价格等于参考价，惩罚为 0。
- 高于参考价，效用下降。
- 低于参考价，效用上升，但不会线性爆炸。

需要限制价格极端值：

```text
P_{min,k} = BasePrice_k × min_price_multiplier
P_{max,k} = BasePrice_k × max_price_multiplier
```

建议：

```text
min_price_multiplier = 0.5
max_price_multiplier = 2.5
```

---

## 10. 消费者效用与市场份额

### 10.1 城市效用

OPS P0 的核心效用公式：

```text
U_{i,c,r} =
  w^Tech_c × norm(Tech_{i,r})
+ w^Fit_c  × norm(Fit_{i,r})
+ w^Show_c × norm(EffectiveShow_{i,c,r})
- PricePenalty_{i,c,r}
+ ChannelUtilityBonus_{i,c}
+ ProtectionUtilityBonus_{i,c}
+ RandomTasteShock_{i,c,r}
```

P0 推荐 `RandomTasteShock = 0`，保证可解释。若需要每场差异，可使用固定种子：

```text
RandomTasteShock_{i,c,r} ~ Normal(0, σ_city)
seed = hash(match_id, round, city_id, team_id)
```

### 10.2 归一化

属性数值进入效用前需要缩放，否则 `Tech=50` 会压倒价格。推荐：

```text
norm(x) = x / 20
```

或者更稳定：

```text
norm(x) = ln(1 + x / 10)
```

P0 建议使用：

```text
norm(x) = x / 20
```

因为更容易给学生解释。

### 10.3 Softmax / 多项 Logit 市场份额

城市 `c` 内参与竞争的队伍集合：

```text
ActiveTeams_c = {i | c ∈ TargetCities_{i,r} or c ∈ EnteredCities_{i,r-1}}
```

市场份额：

```text
Share_{i,c,r} =
  exp(β × U_{i,c,r}) / Σ_{j ∈ ActiveTeams_c} exp(β × U_{j,c,r})
```

其中 `β` 控制竞争强度：

- `β` 越大，优势队伍越容易通吃。
- `β` 越小，市场更平均。

建议 P0：

```text
β = 0.25
```

如果沿用当前代码的未归一化属性，则 `β=2.0` 过大，容易造成份额极端化。补齐模型时应同步缩放属性和重校准 `β`。

### 10.4 需求量

```text
D_{i,c,r} =
  floor(M_{c,k,r}
        × Share_{i,c,r}
        × ChannelDemandMultiplier_{i,c}
        × EventDemandMultiplier_{c,r})
```

全局需求：

```text
D_{i,r} = Σ_c D_{i,c,r}
```

---

## 11. 销售、缺货与库存

### 11.1 可售数量

```text
Available_{i,r} = Inv_{i,r-1} + Q_{i,r}
```

### 11.2 实际销量

```text
Sales_{i,r} = min(D_{i,r}, Available_{i,r})
```

城市层面如果需要可解释，则按需求比例分配库存：

```text
Sales_{i,c,r} =
  min(D_{i,c,r}, Available_{i,r} × D_{i,c,r} / max(D_{i,r}, 1))
```

P0 可以只计算总销量，但复盘页最好保留城市需求和城市份额中间变量。

### 11.3 期末库存

```text
Inv_{i,r} = Available_{i,r} - Sales_{i,r}
```

### 11.4 库存持有成本

```text
HoldingCost_{i,r} = Inv_{i,r} × HoldingCostPerUnit
```

解释：

- 库存成本代表仓储、损耗、资金占用和滞销压力。
- 这与库存管理中的持有成本思想一致，但 OPS 不求 EOQ 最优，只用简单成本让学生感知库存风险。

### 11.5 缺货惩罚

P1 可加入缺货导致的品牌损失：

```text
StockoutRate_{i,r} = max(D_{i,r} - Available_{i,r}, 0) / max(D_{i,r}, 1)
```

```text
Brand_{i,c,r} = Brand_{i,c,r} × (1 - StockoutPenalty × StockoutRate_{i,r})
```

P0 可不启用，避免学生第一次玩时同时处理过多反馈。

---

## 12. 城市进入成本

队伍首次进入城市需要支付开城费：

```text
OpeningFee_{i,c,r} =
  BaseOpeningCost_c
× TierMultiplier_c
× EventOpeningCostMultiplier_{c,r}
× (1 - ChannelOpeningDiscount_{i,c})
```

当前代码已经按 tier 乘数处理：

```text
TierMultiplier = {1: 2.0, 2: 1.5, 3: 1.0, 4: 0.6}
```

P0 建议保留该设计，但应写入 YAML：

```yaml
city_tier_opening_multiplier:
  1: 2.0
  2: 1.5
  3: 1.0
  4: 0.6
```

---

## 13. 财务报表模型

### 13.1 收入

```text
Revenue_{i,r} = Sales_{i,r} × P_{i,r}
```

### 13.2 销货成本

```text
COGS_{i,r} = Sales_{i,r} × UnitCost_{i,r}
```

### 13.3 毛利

```text
GrossProfit_{i,r} = Revenue_{i,r} - COGS_{i,r}
```

### 13.4 期间费用

```text
LaborExpense_{i,r} = SalesForce_{i,r} × WagePerHead
```

```text
OperatingExpense_{i,r} =
  MarketingSpend_{i,r}
+ RnDSpend_{i,r}
+ LaborExpense_{i,r}
+ FixedOverhead_k
+ OpeningFees_{i,r}
+ HoldingCost_{i,r}
```

### 13.5 净利润

```text
Profit_{i,r} = GrossProfit_{i,r} - OperatingExpense_{i,r}
```

当前首期代码中现金计算存在一个需要实现时注意的点：如果已经用 `RawSpend` 扣除生产现金，又用 `COGS` 扣现金，容易形成“生产成本重复扣现金”的问题。P0 目标应采用以下现金流公式。

### 13.6 现金

```text
Cash_{i,r} =
  Cash_{i,r-1}
- RawSpend_{i,r}
- MarketingSpend_{i,r}
- RnDSpend_{i,r}
- LaborExpense_{i,r}
- FixedOverhead_k
- OpeningFees_{i,r}
- HoldingCost_{i,r}
- AuctionPayments_{i,r}
+ Revenue_{i,r}
```

说明：

- `COGS` 是利润表口径，不应再次从现金中扣除；原材料已经在生产时通过 `RawSpend` 支出。
- 如果未来引入赊销/应收账款，才需要拆分收入确认和收款。

### 13.7 库存价值

P0 简化：

```text
InventoryValue_{i,r} = Inv_{i,r} × UnitCost_{i,r}
```

P1 可改为加权平均成本：

```text
AvgInvCost_{i,r} =
  (Inv_{i,r-1} × AvgInvCost_{i,r-1} + Q_{i,r} × UnitCost_{i,r})
  / max(Inv_{i,r-1} + Q_{i,r}, 1)
```

```text
InventoryValue_{i,r} = Inv_{i,r} × AvgInvCost_{i,r}
```

### 13.8 净资产

P0 不引入负债时：

```text
NA_{i,r} = Cash_{i,r} + InventoryValue_{i,r}
```

如果未来加入贷款：

```text
NA_{i,r} = Cash_{i,r} + InventoryValue_{i,r} + OtherAssets_{i,r} - Debt_{i,r}
```

### 13.9 累计利润

```text
CumProfit_{i,r} = CumProfit_{i,r-1} + Profit_{i,r}
```

---

## 14. 拍卖模型

### 14.1 英式拍卖出价约束

```text
Bid_{i,item} > CurrentPrice_{item}
```

```text
Bid_{i,item} ≤ Cash_{i,r}
```

```text
Bid_{i,item} ≥ CurrentPrice_{item} + MinIncrement_{item}
```

建议：

```text
MinIncrement_{item} = max(BasePrice_{item} × 0.05, 500)
```

### 14.2 成交

```text
Winner_{item} = argmax_i Bid_{i,item}
```

```text
FinalPrice_{item} = max_i Bid_{i,item}
```

```text
Cash_{winner,r} = Cash_{winner,r} - FinalPrice_{item}
```

无人出价：

```text
Winner_{item} = null
FinalPrice_{item} = 0
```

### 14.3 拍品效果映射

拍品展示名只用于 UI，结算只读取结构化字段：

```yaml
item:
  item_key: campus_channel
  display_name: 校园渠道独家代理
  type: exclusive_channel
  base_price: 25000
  effect:
    utility_bonus: 0.35
    demand_multiplier: 1.10
```

### 14.4 资源类型公式

| 资源类型 | 公式入口 |
|----------|----------|
| `production` | `Cap_{i,r}`、`QualityBonus_i` |
| `discount` | `RawCost_{i,r}` |
| `advertising` | `EffectiveShow_{i,c,r}` 或 `Brand_{i,c,r}` |
| `exclusive_channel` | `ChannelDemandMultiplier`、`ChannelUtilityBonus`、`OpeningCost` |
| `strategic_resource` | 按具体 effect 进入成本、产能、研发、需求 |
| `brand_endorsement` | `Show` 或 `Brand` |
| `legal_protection` | 事件损失减免、竞争扰动减免、份额保护 |

### 14.5 法律保护

法律保护不应使队伍无敌。P0 建议只降低负面事件影响：

```text
EffectiveEventLoss_{i,r} = EventLoss_r × (1 - ProtectionRate_i)
```

例如：

```yaml
effect:
  protection_rate: 0.5
  protects_against: [policy_penalty, competitor_attack, legal_event]
```

---

## 15. 市场事件模型

### 15.1 事件触发

P0 建议固定在 R3 后和 R5 后检查事件：

```text
Pr(Event_r = e) = probability_e
```

但必须使用固定种子：

```text
seed = hash(match_id, round_number, "ops_event")
```

### 15.2 事件效果

| 事件 | 公式 |
|------|------|
| 原材料涨价 | `MaterialCostMultiplier_r = 1.15` |
| 消费降级 | `γ_price_c = γ_price_c + Δγ`，`w^Show_c = w^Show_c + Δshow` |
| 政策补贴 | `OpeningCost_{target_city,r} ×= 0.5` |
| 竞品退出 | P0 不建议移除 AI；可改为 `MarketSize_c ×= 1.05` |

当前代码的 `competitor_exit` 会移除随机 AI 的设计不建议进入 P0，因为它会破坏学生对公平性的感知。更好的做法是把事件解释为“市场空窗”，轻微放大市场容量。

---

## 16. 排名与奖项

### 16.1 最终得分

```text
Score_i = w_NA × NA_{i,6} + w_Profit × CumProfit_{i,6}
```

默认：

```text
w_NA = 0.70
w_Profit = 0.30
```

### 16.2 排名

```text
Rank = sort_desc(Score_i)
```

同分规则：

1. 净资产更高者在前。
2. 累计利润更高者在前。
3. R6 提交时间更早者在前。
4. 若仍相同，按稳定种子排序。

### 16.3 单项奖

P1 可增加单项奖，但不能影响 P0 排名：

| 奖项 | 公式 |
|------|------|
| 最佳增长 | `NA_{i,6} - NA_{i,1}` 最大 |
| 最佳品牌 | `Show_{i,6}` 或 `Σ Brand_{i,c,6}` 最大 |
| 最佳研发 | `Tech_{i,6}` 最大 |
| 最佳周转 | `Sales / average(Inventory)` 最大 |

---

## 17. AI 对手模型

### 17.1 AI 定位

```text
category_i = seeded_choice(Categories, seed=team_id)
segment_i = seeded_choice(Segments, seed=team_id)
```

### 17.2 AI 预算分配

三档策略：

| 策略 | 生产预算 | 营销预算 | 研发预算 | 定价 |
|------|----------|----------|----------|------|
| `aggressive` | 35% | 30% | 20% | `0.90 × base_price` |
| `balanced` | 30% | 25% | 20% | `1.00 × base_price` |
| `conservative` | 25% | 15% | 30% | `1.10 × base_price` |

公式：

```text
Q^plan_{i,r} = floor((Cash_{i,r-1} × ProductionBudgetPct) / RawCost_{i,r})
```

```text
P_{i,r} = BasePrice_k × PriceMultiplier_strategy
```

```text
MarketingSpend_{i,r} = RemainingCash × MarketingPct
```

```text
RnDSpend_{i,r} = RemainingCash × RnDPct
```

### 17.3 AI 拍卖估值

```text
Valuation_{i,item} =
  BasePrice_item
× StrategyValuationMultiplier_i
× ResourceFitMultiplier_{i,item}
× RandomBand_i
```

建议：

```text
RandomBand_i ∈ [0.9, 1.1]
```

```text
StrategyValuationMultiplier =
  aggressive: 1.10
  balanced: 0.80
  conservative: 0.60
```

出价：

```text
Bid = min(CurrentPrice + MinIncrement, Valuation, Cash × MaxBidCashRatio)
```

其中：

```text
MaxBidCashRatio =
  aggressive: 0.60
  balanced: 0.50
  conservative: 0.35
```

---

## 18. P0 实现函数拆分

建议将 `webapp/backend/app/games/ops_sim/engine.py` 拆成可单测函数：

| 函数 | 输入 | 输出 |
|------|------|------|
| `compute_capacity(state, decision, cfg)` | 队伍状态、决策、配置 | 产能 |
| `compute_unit_cost(state, category_cfg, event_state, cfg)` | 状态、品类、事件 | 单位成本 |
| `update_tech(state, decision, cfg)` | 状态、研发投入 | 新 Tech |
| `update_brand(state, decision, cfg)` | 状态、营销投入 | 新 Brand/Show |
| `compute_city_weights(city_cfg, segments_cfg)` | 城市客群结构 | 城市属性权重 |
| `compute_utility(team, city, decision, cfg)` | 队伍、城市、决策 | 效用 |
| `compute_market_shares(utilities, beta)` | 效用字典 | 份额 |
| `compute_sales(demand, available)` | 需求、可售量 | 销量 |
| `compute_financials(...)` | 经营结果 | 报表 |
| `apply_auction_effect(state, item)` | 状态、拍品 | 新状态 |

每个函数都应是纯函数，DB 编排仍留在 `settle.py`。

---

## 19. 当前代码到目标模型的 Gap

| # | 当前代码 | 目标模型 |
|---|----------|----------|
| E1 | 使用未归一化 `tech/fit/show` 直接进 Softmax | 属性先 `norm`，再进入效用 |
| E2 | 价格惩罚为 `10 * price_ratio / sensitivity` | 改为 `γ × ln(price / reference_price)` |
| E3 | 城市客群比例未真正进入效用 | 用城市客群结构计算 `w^Tech_c/w^Fit_c/w^Show_c` |
| E4 | 营销线性增加 `show` | 改为对数响应或广告存量 |
| E5 | 城市广告位在 `ads` 中存储，但结算未使用 | 加入 `EffectiveShow_{i,c,r}` |
| E6 | 现金公式疑似重复扣除 COGS | 现金只扣 RawSpend 和期间费用，COGS 只用于利润表 |
| E7 | 事件随机未固定种子 | 使用 `match_id + round_number` 稳定种子 |
| E8 | `competitor_exit` 移除 AI 风险较高 | 改为轻微市场容量增益 |
| E9 | 拍卖只有 production/advertising/discount | 扩展 exclusive_channel/brand_endorsement/legal_protection |
| E10 | `beta=2.0` 与未归一化属性绑定 | 归一化后重设 `logit_beta≈0.25` |

---

## 20. 最小 P0 公式包

若开发时间有限，P0 必须至少实现以下公式：

1. 产能：`Cap = BaseCap + CapacityBonus + WorkerProductivity × SalesForce`
2. 实际生产：`Q = min(plan, Cap, MaxProductionPerRound)`
3. 单位成本：`Raw + Labor + Overhead / max(Q,1)`
4. 研发：`Tech += α × ln(1 + RnDSpend / Scale)`
5. 广告：`Show += α × ln(1 + MarketingSpend / Scale)`，城市广告位乘城市 show multiplier
6. 城市效用：`Tech/Fit/Show` 加权，减去价格惩罚，加渠道/保护 bonus
7. 市场份额：`softmax(β × utility)`
8. 需求：`market_size × share`
9. 销量：`min(demand, inventory + production)`
10. 库存：`inventory + production - sales`
11. 利润表：收入、COGS、毛利、期间费用、净利润
12. 现金：期初现金 - 原材料 - 期间费用 - 拍卖支出 + 收入
13. 净资产：现金 + 库存价值
14. 排名：`0.7 × net_assets + 0.3 × cumulative_profit`

---

## 21. 参考资料

| 资料 | 用途 |
|------|------|
| [ABS 模拟商业挑战官网](https://abs.seedasdan.com/) | 阿思丹/ABS 类赛事：数字化商业模拟、多轮商业决策、虚拟市场 |
| [ASIA Business Simulation Regional Round](https://abs.seedasdan.com/en/region-en/) | 阿思丹/ABS 类赛事：运营、交易挑战、路演等综合赛程参考 |
| [Kenneth Train, Discrete Choice Methods with Simulation](https://eml.berkeley.edu/books/choice2.html) | Logit / 离散选择模型基础 |
| [Berkeley PDF: Discrete Choice Methods with Simulation](https://eml.berkeley.edu/books/train1201.pdf) | 多项 Logit 与选择概率公式参考 |
| [Nerlove & Arrow, Optimal Advertising Policy under Dynamic Conditions](https://www.jstor.org/stable/2551549) | 广告投入影响 goodwill/需求的动态建模参考 |
| [CIPS: Economic Order Quantity](https://www.cips.org/intelligence-hub/operations-management/economic-order-quantity) | 库存持有成本与库存管理基础 |
| [Supply Chain Management: Economic Order Quantity](https://pressbooks.pub/supplychainmanagement3005/chapter/8-3-economic-order-quantity-eoq/) | 持有成本、订货成本与 EOQ 基本说明 |

---

*商识唯智 · OPS 经济模型 SPEC v1.0*
