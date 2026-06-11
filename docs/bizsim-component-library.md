# 商识唯智 · 商业模拟组件库

> **定位**：商业模拟教育游戏/赛事的通用设计元素命名与分类体系。
> **用途**：
> 1. 新引擎设计时从库中"选取"组件，避免重复发明
> 2. 评审现有引擎时对照组件库，识别缺失或冗余
> 3. 统一团队术语，消除"那个买卖东西的机制"这类模糊表达
> **版本**：v1.0
> **范围**：Phase A 已验证 + Phase B~E 可扩展

---

## 目录

1. [设计哲学](#一设计哲学)
2. [核心机制层](#二核心机制层-core-mechanics)
3. [公式体系层](#三公式体系层-formula-system)
4. [互动形式层](#四互动形式层-interaction-patterns)
5. [组件组合速查](#五组件组合速查)
6. [FST 即时制评估](#六fst-即时制合理性评估)

---

## 一、设计哲学

### 1.1 命名原则

| 原则 | 说明 | 示例 |
|------|------|------|
| **英文为主，中文注释** | 便于代码映射和国际化 | `PoolPressurePricing`（池压定价） |
| **领域术语优先** | 借用经济学、博弈论、运营学术语 | `SoftmaxAllocation` 而非 `SmartDivision` |
| **层级清晰** | Category → Component → Variant | `Pricing → PoolPressurePricing → LinearPressureVariant` |
| **避免隐喻** | 不用游戏圈黑话 | `TurnBasedAdvancement` 而非 `TB` |
| **可组合性** | 组件间正交，可自由搭配 | `NodeNetwork` + `TurnBasedAdvancement` = 回合制物流 |

### 1.2 三个抽象层级

```
┌─ 核心机制层（Mechanics）─────────┐  "有什么"
│  资源循环、空间、时间、竞争...      │  决定游戏的结构性体验
├─ 公式体系层（Formulas）──────────┤  "怎么算"
│  定价、份额、增长、评分...         │  决定数值感受
├─ 互动形式层（Interactions）──────┤  "怎么玩"
│  决策频率、信息展示、交互模式...    │  决定操作体验
└──────────────────────────────────┘
```

### 1.3 与现有引擎的映射

| 引擎 | 核心机制组合 | 公式组合 | 互动形式 |
|------|-------------|---------|---------|
| **FST（浮生记）** | ArbitrageLoop + NodeNetwork + MovementConstraint + RealTimeAdvancement | PoolPressurePricing + LinearValuation | HighFrequencyMicroDecision + AsyncDecision + RealTimeDashboard |
| **TECH（创想大赢家）** | InvestmentReturnLoop + NodeNetwork + TurnBasedAdvancement | SoftmaxAllocation + DiminishingReturnsGrowth + MultiDimensionalWeightedScoring | LowFrequencyMacroDecision + SimultaneousGame + TurnSnapshot |
| **OPS（生产经营）** | ProductionConsumptionLoop + MultiPhaseStructure | CostPlusPricing + LinearShare | MixedDecision + SequentialPhase |

---

## 二、核心机制层（Core Mechanics）

### 2.1 资源循环机制（Resource Loop Mechanics）

资源循环描述"钱/物/分"如何在系统中流动。

| 组件名 | 英文名 | 说明 | 典型应用 |
|--------|--------|------|---------|
| **生产-消费循环** | `ProductionConsumptionLoop` | 生产商品 → 市场消费 → 获得收入 → 再投资生产 | 工厂模拟、产业链游戏 |
| **买卖套利循环** | `ArbitrageLoop` | 低价买入 → 运输/等待 → 高价卖出 → 赚取价差 | FST、贸易模拟 |
| **投入-产出循环** | `InvestmentReturnLoop` | 投入资源到某维度 → 属性增长 → 转化为得分/收入 | TECH、策略经营 |
| **融资-扩张循环** | `FinancingExpansionLoop` | 融资获得资金 → 扩张业务 → 产生利润 → 偿还/再融资 | 创业模拟、金融游戏 |
| **竞价-分配循环** | `AuctionAllocationLoop` | 出价竞拍稀缺资源 → 获得资源 → 用于生产/套利 | OPS拍卖、资源争夺 |
| **任务-奖励循环** | `QuestRewardLoop` | 完成特定目标 → 获得一次性奖励 → 积累优势 | 教学关卡、成就系统 |

**FST 使用**：`ArbitrageLoop`（核心）
**TECH 使用**：`InvestmentReturnLoop`（核心）

---

### 2.2 空间机制（Spatial Mechanics）

空间机制描述"在哪里"发生，以及位置如何影响玩法。

| 组件名 | 英文名 | 说明 | 典型应用 |
|--------|--------|------|---------|
| **节点网络** | `NodeNetwork` | 离散节点（城市/市场），节点间通过边连接 | FST六城、TECH三城 |
| **连续空间** | `ContinuousSpace` | 坐标系中的连续位置，可任意移动 | 开放世界、地图探索 |
| **移动约束** | `MovementConstraint` | 移动需要时间/成本/运力，途中无法行动 | FST运输、物流模拟 |
| **地域差异** | `RegionalDifferentiation` | 不同节点有不同的资源/价格/需求结构 | FST城市特产、TECH城市客群 |
| **领地控制** | `TerritoryControl` | 节点可被占领/控制，控制者获得特权 | 地盘争夺、区域垄断 |
| **网络效应** | `NetworkEffect` | 节点间连接数越多，整体效率越高 | 基建投资、物流网络 |

**FST 使用**：`NodeNetwork` + `MovementConstraint` + `RegionalDifferentiation`
**TECH 使用**：`NodeNetwork` + `RegionalDifferentiation`（无移动约束）

---

### 2.3 时间机制（Temporal Mechanics）

时间机制描述"何时推进"，是游戏节奏的决定性因素。

| 组件名 | 英文名 | 说明 | 典型应用 |
|--------|--------|------|---------|
| **即时推进** | `RealTimeAdvancement` | 固定间隔自动推进（如每5秒一tick），玩家必须实时响应 | FST、RTS游戏 |
| **回合推进** | `TurnBasedAdvancement` | 所有玩家决策完成后统一推进，游戏等待最慢者 | TECH、桌游电子化 |
| **阶段推进** | `PhaseBasedAdvancement` | 大阶段内包含多个小回合，阶段间有质变 | OPS（设计→运营→路演→拍卖） |
| **事件驱动推进** | `EventDrivenAdvancement` | 推进由特定事件触发（如所有玩家提交后） | 异步对战、邮件回合制 |
| **混合推进** | `HybridAdvancement` | 同时存在实时层和回合层（如实时市场+回合决策） | 复杂经营模拟 |
| **倒计时推进** | `CountdownAdvancement` | 玩家有固定时间窗口决策，超时自动提交或跳过 | 限时测试、快节奏决策 |

**FST 使用**：`RealTimeAdvancement`
**TECH 使用**：`TurnBasedAdvancement`

---

### 2.4 竞争机制（Competition Mechanics）

竞争机制描述"玩家之间如何相互作用"。

| 组件名 | 英文名 | 说明 | 典型应用 |
|--------|--------|------|---------|
| **直接竞争** | `DirectCompetition` | 玩家直接争夺同一有限资源（先到先得） | 抢购、抢地盘 |
| **间接竞争（份额）** | `IndirectCompetition_Softmax` | 玩家通过投入/属性竞争市场份额，按 Softmax 分配 | TECH市场份额 |
| **间接竞争（排名）** | `IndirectCompetition_Ranking` | 玩家独立行动，最终按某个指标排名 | FST总资产排名 |
| **零和博弈** | `ZeroSumCompetition` | 一玩家所得即另一玩家所失，总收益恒定 | 拍卖、赌博 |
| **正和博弈** | `PositiveSumCompetition` | 玩家可同时获益，竞争相对优势 | 多数商业模拟 |
| **合作竞争** | `Coopetition` | 玩家既竞争又需要合作完成某些目标 | 联盟、供应链协作 |
| **拥挤效应** | `CrowdingEffect` | 同一策略/区域的玩家越多，各自收益越低 | TECH路线拥挤税 |

**FST 使用**：`IndirectCompetition_Ranking` + `PositiveSumCompetition`
**TECH 使用**：`IndirectCompetition_Softmax` + `CrowdingEffect`

---

### 2.5 信息不对称机制（Information Mechanics）

信息不对称机制描述"玩家知道什么"。

| 组件名 | 英文名 | 说明 | 典型应用 |
|--------|--------|------|---------|
| **完全信息** | `PerfectInformation` | 所有玩家看到相同的市场/对手状态 | FST物价、TECH排名 |
| **私有信息** | `PrivateInformation` | 各玩家拥有独特的隐藏信息 | 卡牌手牌、内部消息 |
| **延迟信息** | `DelayedInformation` | 信息有传播时滞，过去的状态才可见 | 真实市场、供应链信息 |
| **噪声信息** | `NoisyInformation` | 玩家看到的信息有随机误差 | 预测、调研模拟 |
| **可探索信息** | `ExplorableInformation` | 信息需要付出成本去获取 | 市场调研、情报收集 |
| **历史透明** | `HistoricalTransparency` | 当前状态可能不透明，但历史数据完全公开 | 股市模拟、拍卖记录 |

**FST 使用**：`PerfectInformation` + `HistoricalTransparency`（价格历史）
**TECH 使用**：`PerfectInformation` + `HistoricalTransparency`

---

### 2.6 约束机制（Constraint Mechanics）

约束机制描述"什么不能做/有限制"。

| 组件名 | 英文名 | 说明 | 典型应用 |
|--------|--------|------|---------|
| **预算约束** | `BudgetConstraint` | 资金有限，必须在选项间权衡 | 几乎所有商业模拟 |
| **仓储约束** | `StorageConstraint` | 库存容量有限，必须管理库存结构 | FST仓储、库存管理 |
| **时间约束** | `TimeConstraint` | 决策有时间限制，超时自动处理 | 限时决策、实时游戏 |
| **运力约束** | `CapacityConstraint` | 运输/处理能力有限，需投资扩容 | FST车辆、物流产能 |
| **行动点约束** | `ActionPointConstraint` | 每轮/每tick只能执行有限次数行动 | 策略游戏行动点 |
| **资格约束** | `EligibilityConstraint` | 某些行动需要满足前置条件 | 解锁新城市、进阶功能 |
| **吸收约束** | `AbsorptionConstraint` | 市场每轮只能消化有限数量供给 | FST收购上限 |

**FST 使用**：`BudgetConstraint` + `StorageConstraint` + `CapacityConstraint` + `ActionPointConstraint`（1 action/tick）+ `AbsorptionConstraint`
**TECH 使用**：`BudgetConstraint` + `ActionPointConstraint`（1 decision/round）

---

### 2.7 事件机制（Event Mechanics）

事件机制描述"什么会随机/计划性地发生"。

| 组件名 | 英文名 | 说明 | 典型应用 |
|--------|--------|------|---------|
| **随机事件** | `RandomEvent` | 按概率随机触发，影响市场/规则 | 灾害、政策变化 |
| **计划事件** | `ScheduledEvent` | 在特定轮次/tick必然触发 | 季节性变化、考试 |
| **组织者事件** | `OrganizerTriggeredEvent` | 由教师/组织者手动选择触发 | TECH R3事件 |
| **玩家触发事件** | `PlayerTriggeredEvent` | 玩家行为触发连锁反应 | 达成条件解锁 |
| **突发事件** | `SurpriseEvent` | 不可预测、不可预防的干扰 | 经济危机、黑天鹅 |
| **链式事件** | `ChainEvent` | 一个事件触发另一个事件 | 供应链断裂传导 |

**FST 使用**：`RandomEvent`（半实现）+ `ScheduledEvent`
**TECH 使用**：`OrganizerTriggeredEvent`（R3事件）

---

## 三、公式体系层（Formula System）

### 3.1 定价公式（Pricing Formulas）

定价公式决定"商品价格如何形成"。

| 组件名 | 英文名 | 公式原型 | 特点 | 典型应用 |
|--------|--------|---------|------|---------|
| **供需均衡定价** | `SupplyDemandEquilibrium` | `price = base × (demand / supply)^elasticity` | 直观，供需直接决定价格 | 基础经济模拟 |
| **池压定价** | `PoolPressurePricing` | `mid = base × factor; pressure = f(pool/target); ask = mid × (1 + spread + pressure)` | 考虑库存池的相对压力，更 nuanced | FST |
| **成本加成定价** | `CostPlusPricing` | `price = cost × (1 + margin)` | 玩家控制成本，价格相对稳定 | 制造业模拟 |
| **竞争定价** | `CompetitivePricing` | `price = f(my_cost, competitors_prices, market_share)` | 价格由玩家策略互动决定 | 价格战模拟 |
| **拍卖定价** | `AuctionPricing` | `price = second_highest_bid + increment` | 揭示真实估值 | 英式/密封拍卖 |
| **随机游走定价** | `RandomWalkPricing` | `price_t = price_{t-1} × (1 + drift + noise)` | 模拟金融市场 | 股票/期货模拟 |

**FST 使用**：`PoolPressurePricing`

---

### 3.2 市场份额公式（Market Share Formulas）

市场份额公式决定"玩家如何分配市场蛋糕"。

| 组件名 | 英文名 | 公式原型 | 特点 | 典型应用 |
|--------|--------|---------|------|---------|
| **Softmax份额分配** | `SoftmaxAllocation` | `share_i = exp(β×utility_i) / Σ(exp(β×utility_j))` | 避免零份额，平滑过渡，有"拥挤感" | TECH |
| **线性份额分配** | `LinearAllocation` | `share_i = utility_i / Σ(utility_j)` | 直观，但可能导致极端结果 | 简单竞争模型 |
| **赢者通吃** | `WinnerTakeAll` | `winner = argmax(utility); winner_share = 1.0` | 激烈竞争，适者生存 | 竞标、选举 |
| **阈值份额分配** | `ThresholdAllocation` | `share_i = 1 if utility_i > threshold else 0` | 达标即获得资格，不竞争份额 | 认证、评级 |
| **空间份额分配** | `SpatialAllocation` | `share_i ∝ f(distance, accessibility, preference)` | 考虑地理距离 | 零售选址模拟 |

**TECH 使用**：`SoftmaxAllocation`
**FST 使用**：无（FST是套利模型，不是市场份额模型）

---

### 3.3 增长公式（Growth Formulas）

增长公式决定"投入如何转化为属性/能力增长"。

| 组件名 | 英文名 | 公式原型 | 特点 | 典型应用 |
|--------|--------|---------|------|---------|
| **线性增长** | `LinearGrowth` | `delta = k × investment` | 简单直观，无策略深度 | 基础教学 |
| **边际递减增长** | `DiminishingReturnsGrowth` | `delta = k × √investment` 或积分表 | 投入越多单位收益越低，鼓励分散投资 | TECH属性增长 |
| **S曲线增长** | `LogisticGrowth` | `delta = r × current × (1 - current/cap)` | 早期慢、中期快、后期饱和 | 技术扩散、用户增长 |
| **排名激励增长** | `RankIncentiveGrowth` | `delta = base × f(investment_rank)` | 相对排名比绝对投入更重要 | TECH Fit/Show增长 |
| **阈值突破增长** | `ThresholdBreakthroughGrowth` | `delta = 0 if investment < t1; boost if investment > t2` | 鼓励达到关键节点 | 里程碑解锁 |
| **组合增长** | `CompositeGrowth` | `delta = f(investment, rank, current_level, route_boost)` | 多因素综合，最灵活 | TECH Tech增长 |

**TECH 使用**：`DiminishingReturnsGrowth` + `RankIncentiveGrowth` + `CompositeGrowth`

---

### 3.4 评分公式（Scoring Formulas）

评分公式决定"最终按什么排名"。

| 组件名 | 英文名 | 公式原型 | 特点 | 典型应用 |
|--------|--------|---------|------|---------|
| **单维度排名** | `SingleDimensionRanking` | `rank = sort(metric)` | 简单明了 | FST总资产 |
| **多维度加权** | `MultiDimensionalWeightedScoring` | `score = Σ(metric_i × weight_i)` | 平衡多个目标 | OPS多维度评分 |
| **累积加权** | `CumulativeWeightedScoring` | `total = Σ(round_score_r × round_weight_r)` | 越往后越重要，防止前期定局 | TECH |
| **相对表现评分** | `RelativePerformanceScoring` | `score = (my_metric - avg) / std` | 与对手表现挂钩 | 竞争激烈的场景 |
| **等级评分** | `TieredScoring` | `score = base + tier_bonus(tier)` | 按排名档位给分，同档同分 | 锦标赛、资格赛 |

**FST 使用**：`SingleDimensionRanking`
**TECH 使用**：`CumulativeWeightedScoring`

---

### 3.5 修正公式（Modifier Formulas）

修正公式是"锦上添花"的调整因素。

| 组件名 | 英文名 | 说明 | 典型应用 |
|--------|--------|------|---------|
| **动量修正** | `MomentumModifier` | 上轮排名高 → 本轮微弱加成 | TECH Momentum |
| **爆发修正** | `BurstModifier` | 某条件满足时触发大额加成 | TECH Hot Pulse |
| **质量修正** | `QualityModifier` | 决策与宣言/策略的一致性奖励 | TECH BQI |
| **噪声修正** | `NoiseModifier` | ±X% 随机扰动，模拟不确定性 | TECH Noise、FST定价 |
| **拥挤修正** | `CrowdingModifier` | 同策略/同区域玩家越多，各自收益越低 | TECH 路线拥挤税 |
| **独占红利** | `ExclusivityBonus` | 选择某策略的人少时大幅加成 | TECH PATHFINDER |

---

## 四、互动形式层（Interaction Patterns）

### 4.1 决策频率（Decision Frequency）

| 组件名 | 英文名 | 说明 | 认知负荷 | 典型应用 |
|--------|--------|------|---------|---------|
| **高频微决策** | `HighFrequencyMicroDecision` | 每tick/每几秒做一个简单决策（买/卖/移动） | 中等，但持续 | FST |
| **低频宏决策** | `LowFrequencyMacroDecision` | 每轮做一个复杂决策（涉及多个参数权衡） | 高，但有充足思考时间 | TECH |
| **混合决策** | `MixedDecision` | 宏决策确定策略 + 微执行调整细节 | 中高 | OPS |
| **一次性决策** | `OneShotDecision` | 开局做一个决策，后续自动执行 | 低 | 被动投资模拟 |
| **响应式决策** | `ReactiveDecision` | 大部分时间观望，事件发生时快速响应 | 中等，有紧迫感 | 危机管理 |

**FST 使用**：`HighFrequencyMicroDecision`
**TECH 使用**：`LowFrequencyMacroDecision`

---

### 4.2 交互模式（Interaction Mode）

| 组件名 | 英文名 | 说明 | 典型应用 |
|--------|--------|------|---------|
| **异步决策** | `AsynchronousDecision` | 各玩家独立决策，不等待彼此 | FST（实时提交） |
| **同步博弈** | `SimultaneousGame` | 所有人同时提交，同时揭晓 | TECH（每轮同时结算） |
| **序贯博弈** | `SequentialGame` | 玩家轮流行动，后行动者知道先行动者的选择 | 棋类、拍卖 |
| **半同步博弈** | `SemiSynchronousGame` | 有决策窗口期，窗口内异步提交，截止后统一结算 | 在线回合制 |
| **实时对抗** | `RealTimeConfrontation` | 玩家同时在线实时互动，行动立即影响彼此 | MOBA、RTS对战 |

**FST 使用**：`AsynchronousDecision`
**TECH 使用**：`SimultaneousGame`

---

### 4.3 信息展示（Information Display）

| 组件名 | 英文名 | 说明 | 典型应用 |
|--------|--------|------|---------|
| **实时仪表盘** | `RealTimeDashboard` | 持续更新的数值面板（价格、排名、资产） | FST |
| **回合快照** | `TurnSnapshot` | 每轮结算后展示完整状态报告 | TECH |
| **历史趋势** | `HistoricalTrend` | 折线图展示多轮/多tick的变化趋势 | FST价格历史、TECH属性变化 |
| **对比面板** | `ComparisonPanel` | 与对手的关键指标并排对比 | 竞争分析 |
| **预测提示** | `ForecastHint` | 系统给出"如果这样做，预计结果"的提示 | 教学友好设计 |
| **新闻叙事** | `NewsNarrative` | 用新闻故事形式包装结算结果 | TECH新闻 |
| **中间变量展示** | `IntermediateVariableDisplay` | 展示结算过程中的中间计算值，帮助理解 | 教育场景推荐 |

**FST 使用**：`RealTimeDashboard` + `HistoricalTrend`
**TECH 使用**：`TurnSnapshot` + `NewsNarrative` + `HistoricalTrend`

---

### 4.4 操作界面（Operation Interface）

| 组件名 | 英文名 | 说明 | 典型应用 |
|--------|--------|------|---------|
| **地图操作** | `MapBasedInterface` | 在地图上点击城市/路线进行操作 | FST（城市间移动） |
| **面板操作** | `PanelBasedInterface` | 在表单/面板中输入数值、选择选项 | TECH（滑块、单选） |
| **卡片操作** | `CardBasedInterface` | 通过选择和打出卡片进行决策 | 卡牌类商赛 |
| **表格操作** | `SpreadsheetInterface` | 类似Excel的批量数据录入和调整 | 复杂财务模拟 |
| **对话操作** | `DialogueInterface` | 通过对话/叙事分支进行决策 | 叙事驱动模拟 |
| **拖拽操作** | `DragDropInterface` | 拖拽资源到不同目标进行分配 | 直观分配教学 |

**FST 使用**：`MapBasedInterface` + `PanelBasedInterface`
**TECH 使用**：`PanelBasedInterface`

---

## 五、组件组合速查

### 5.1 常见商赛类型 → 组件组合

| 商赛类型 | 资源循环 | 空间 | 时间 | 竞争 | 决策频率 | 交互模式 |
|---------|---------|------|------|------|---------|---------|
| **物流套利赛** | ArbitrageLoop | NodeNetwork + MovementConstraint | RealTimeAdvancement | IndirectCompetition_Ranking | HighFrequencyMicroDecision | AsynchronousDecision |
| **策略经营赛** | InvestmentReturnLoop | NodeNetwork | TurnBasedAdvancement | IndirectCompetition_Softmax + CrowdingEffect | LowFrequencyMacroDecision | SimultaneousGame |
| **生产经营赛** | ProductionConsumptionLoop | NodeNetwork | PhaseBasedAdvancement | IndirectCompetition_Ranking + DirectCompetition | MixedDecision | SimultaneousGame |
| **拍卖竞赛** | AuctionAllocationLoop | — | TurnBasedAdvancement | ZeroSumCompetition | LowFrequencyMacroDecision | SimultaneousGame |
| **创业模拟** | FinancingExpansionLoop | NodeNetwork | PhaseBasedAdvancement | PositiveSumCompetition | MixedDecision | SemiSynchronousGame |
| **股票投资** | RandomWalkPricing + ArbitrageLoop | — | RealTimeAdvancement or TurnBasedAdvancement | IndirectCompetition_Ranking | HighFrequencyMicroDecision or MixedDecision | AsynchronousDecision |
| **供应链协作** | ProductionConsumptionLoop | NodeNetwork + NetworkEffect | TurnBasedAdvancement | Coopetition | LowFrequencyMacroDecision | SimultaneousGame |

### 5.2 教育目标 → 推荐组件

| 教育目标 | 推荐核心机制 | 推荐公式 | 推荐互动形式 |
|---------|-------------|---------|------------|
| 理解供需关系 | ProductionConsumptionLoop or ArbitrageLoop | SupplyDemandEquilibrium or PoolPressurePricing | TurnSnapshot + HistoricalTrend |
| 理解机会成本 | ArbitrageLoop + MovementConstraint | — | RealTimeDashboard + IntermediateVariableDisplay |
| 战略取舍 | InvestmentReturnLoop | SoftmaxAllocation + CrowdingModifier | LowFrequencyMacroDecision + ComparisonPanel |
| 资源分配 | InvestmentReturnLoop | DiminishingReturnsGrowth | PanelBasedInterface + ForecastHint |
| 风险与不确定性 | RandomEvent + NoiseModifier | — | NewsNarrative + HistoricalTrend |
| 市场竞争 | IndirectCompetition_Softmax + CrowdingEffect | SoftmaxAllocation | TurnSnapshot + ComparisonPanel |
| 财务报表理解 | ProductionConsumptionLoop | CostPlusPricing + MultiDimensionalWeightedScoring | SpreadsheetInterface |
| 谈判与博弈 | AuctionAllocationLoop or Coopetition | AuctionPricing or LinearAllocation | SequentialGame + DialogueInterface |

---

## 六、FST 即时制合理性评估

### 6.1 FST 当前组件组合

```
FST = ArbitrageLoop
    + NodeNetwork + MovementConstraint + RegionalDifferentiation
    + RealTimeAdvancement
    + IndirectCompetition_Ranking + PositiveSumCompetition
    + BudgetConstraint + StorageConstraint + CapacityConstraint + ActionPointConstraint + AbsorptionConstraint
    + PoolPressurePricing
    + SingleDimensionRanking
    + HighFrequencyMicroDecision + AsynchronousDecision
    + RealTimeDashboard + HistoricalTrend
    + MapBasedInterface + PanelBasedInterface
```

### 6.2 教育目标与机制匹配分析

| 教育目标 | 核心体验要求 | 即时制支持度 | 回合制支持度 | 分析 |
|---------|-------------|-------------|-------------|------|
| **地域产业结构与供需结构** | 观察不同城市的特产和价格差异 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 回合制给更多时间分析城市差异和供需逻辑 |
| **运输时间的机会成本** | 感受"资金在途中无法使用"的约束 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | **即时制的核心优势**。移动需要2+ tick，途中无法交易，实时感受到资金占用 |
| **仓储约束与运力投资** | 在库存上限和运力扩张间权衡 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 两者均可，回合制给更多时间计算最优库存结构 |
| **买卖价差与市场池吸收** | 理解低价买高价卖，以及大量抛售压低价格 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 回合制有更多时间分析价差和池动态，做出更理性的套利决策 |

**结论**：4 个教育目标中，1 个（机会成本）即时制显著优于回合制，2 个（供需结构、价差分析）回合制更优，1 个（仓储约束）持平。

### 6.3 课堂场景匹配分析

| 场景维度 | 即时制（FST当前） | 回合制（假设调整） |
|---------|-----------------|------------------|
| **单局时长** | 8~20 分钟 ✅ | 30~50 分钟 |
| **教师讲解空间** | 只能在赛前/赛后讲解 ❌ | 每轮间可点评、讲解 ✅ |
| **学生思考深度** | 直觉反应为主，难以深度计算 ❌ | 有时间计算最优策略 ✅ |
| **课堂节奏控制** | 一旦开始难以暂停 ❌ | 组织者完全控制推进节奏 ✅ |
| **认知负荷** | 持续中等负荷，可能疲劳 | 间歇性高负荷，有休息 |
| **多局可能性** | 一节课可打 2~3 局 ✅ | 一节课通常 1 局 |
| **意外容错** | 走神几秒可能错过关键tick ❌ | 决策窗口期内随时可提交 ✅ |

### 6.4 与 TECH 的差异化分析

| 维度 | FST（即时制） | TECH（回合制） | 差异化价值 |
|------|-------------|---------------|-----------|
| **核心体验** | 快节奏、直觉反应、空间套利 | 深思熟虑、策略规划、市场竞争 | 两者互补 |
| **教育侧重** | 机会成本、快速决策 | 战略取舍、资源分配 | 覆盖不同能力 |
| **单局时长** | 8~20 分钟 | 30~50 分钟 | 适应不同课时 |
| **操作密度** | 高（~20 actions/局） | 低（4 decisions/局） | 满足不同偏好 |
| **可解释性** | 较难（tick多，每tick变化小） | 较好（轮次少，变化显著） | TECH更适合复盘教学 |

**差异化价值**：FST 和 TECH 在即时/回合、微决策/宏决策、套利/竞争上形成**明确差异化**，保留两种模式对用户是有价值的。

### 6.5 评估结论与建议

#### 核心结论：FST 即时制基本合理，但需增加"教学友好"辅助功能

**不建议改为纯回合制**，原因：
1. **会丧失核心教育体验**：运输时间的机会成本是 FST 的独特价值，回合制下"移动"只是消耗一个回合，无法体现"资金在途中被锁定"的时间价值
2. **与 TECH 定位重叠**：如果 FST 也改为回合制，与 TECH 的差异化将大幅缩小
3. **物流套利的本质**：套利本质上是时间敏感的，即时制更符合真实商业逻辑

**建议增强（按优先级）**：

| 优先级 | 增强项 | 具体做法 | 教育价值 |
|--------|--------|---------|---------|
| **P0** | **可调 Tick 间隔** | 组织者可选 5秒/10秒/15秒/30秒 间隔。课堂场景推荐 15~30秒 | 给学生更多思考时间，不改变即时制本质 |
| **P0** | **逐 Tick 回放复盘** | 赛后可逐 tick 查看价格变化、自己的决策、资产曲线 | 解决可解释性问题，支持教师讲解 |
| **P1** | **热身期延长** | 从 6 tick（30秒）延长到 12 tick（60秒），并增加引导提示 | 给学生更充分的熟悉时间 |
| **P1** | **暂停观察模式** | 允许学生在 tick 间隔内"冻结"自己的观察面板（不影响游戏推进，只是自己的界面暂停更新） | 便于截图、记录、小组讨论 |
| **P2** | **AI 策略教学提示** | 鼠标悬停在 AI 行为上时，显示"该 AI 正在执行跨城套利策略"等提示 | 帮助学生理解策略模式 |
| **P2** | **慢速教学局** | 预设配置 `classroom_slow`：tick 间隔 30秒，总 tick 数减半，总时长不变但每步更从容 | 专门适配课堂场景 |

### 6.6 如果坚持要回合制调整

如果经过讨论仍认为需要回合制版本，建议不是"替换"而是"新增"：

```
FST-RTS（现有）：RealTimeAdvancement, 5秒tick, 8~20分钟
FST-Turn（新增）：TurnBasedAdvancement, 每轮3~5分钟, 8~12轮, 30~40分钟
```

**FST-Turn 的设计调整**：
- 每轮玩家提交"行动序列"（如在 A 城买 X → 移动到 B → 在 B 卖 Y）
- 所有玩家提交后统一执行，执行期间展示动画
- 运输途中占用 2~3 轮（保持机会成本教育）
- 市场池在每轮执行后更新（保持供需教育）
- 但这样就非常接近"带地图的 TECH"，差异化不足

**更推荐**：保留 FST-RTS，增加上述 P0/P1 增强项。

---

*商识唯智 · 商业模拟组件库 v1.0*
*评审引擎：FST v3.0.0、TECH v1.0.0*
*规范来源：`docs/engine-spec.md`、`02-ARCHITECTURE.md`、`03-ENGINEERING.md`*
