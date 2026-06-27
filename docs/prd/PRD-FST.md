# FST 引擎 PRD · 浮生记 / FSTRADING

> **引擎简称**：FST（浮生记 / FSTRADING）
> **引擎 ID**：`trading`
> **配置 ID**：`fstrading`
> **版本**：3.2.0
> **运行时**：`phaser`（当前前端 React 实现，Phaser 场景预留接入）
> **设计模式**：`standalone`
> **最后更新**：2026-06-25

---

## 1. 元信息

| 字段 | 值 |
|------|-----|
| **引擎中文名** | 浮生记 / FStrading |
| **引擎英文名** | FST / FSTRADING |
| **引擎 ID** | `trading` |
| **配置包 ID** | `fstrading`（`trading-v1`、`trading-v2-rts` 已废弃为历史别名） |
| **版本** | `3.2.0` |
| **设计模式** | `standalone` |
| **主题** | `fstrading` |
| **世界区域** | `yangtze_6`（长三角六城） |
| **默认模式** | `rts`（即时制，日期推进，4 秒/日） |
| **默认起始日期** | `7-01`（配置项 `start_date`，可覆盖） |

| **表前缀** | `trading_` |
| **后端路由前缀** | `/api/v1/trading` |
| **WebSocket 路由** | `/api/v1/trading/events/{event_id}/ws` |
| **前端路由** | `/games/:id/play` |

---

## 2. 产品定位

### 2.1 一句话玩法

**4 秒一日的即时长三角六城物流商战**：玩家在相邻城市间低买高卖、投资运力，以比赛结束时的**总资产**排名决胜负。

### 2.2 教育目标

1. **地域产业结构与供需结构**：不同城市生产/消费不同商品，理解产地与销地。
2. **运输时间的机会成本**：移动需要消耗日期，资金在途中无法交易。
3. **仓储约束与运力投资**：库存有上限，购买车辆可扩大运力，但占用资金。
4. **买卖价差与市场池吸收**：城市有独立的供需池，大量抛售会压低价格。

### 2.3 目标受众

| 维度 | 说明 |
|------|------|
| **目标年龄** | 14~22 岁 |
| **适合学段** | 初中高年级至大学低年级 |
| **单局时长** | 8~20 分钟可选 |
| **单场人数** | 练习赛 1 真人 + 3 AI；正式赛支持 4~40 人 |
| **决策类型** | 实时操作 + 资源管理 + 空间套利 |

### 2.4 单局节奏

| 阶段 | 时长 | 内容 |
|------|------|------|
| 热身期 | 前 6 日（24 秒） | 玩家熟悉 UI、查看物价、规划路线 |
| 正式期 | 剩余天数 | 买卖、移动、购车、竞争 |
| 结束 | 最后 1 日 | 按总资产排名，发放 XP/金币/钻石 |

### 2.5 3.2 重构目标：让玩家形成可行动的供需直觉

当前 FST 的主要问题不在于缺少数值，而在于缺少一个玩家能立刻理解并反复验证的心理模型：

1. **城市差异不显著**：玩家看不出“这个城市为什么便宜/贵”，六城像六个随机报价点。
2. **赚钱路径不稳定**：移动成本、点差与价格回归叠加后，很多路线即使方向正确也难以盈利。
3. **供需不可见**：玩家只看到 ask/bid 和池量，看不到生产、消费、缺口、趋势与其他玩家行为如何共同影响价格。
4. **缺少爽点反馈**：低买高卖成功后缺少“我判断对了”的明确收益、动效、连击与复盘解释。
5. **公共博弈不足**：玩家之间没有足够的共同争夺物、抢跑窗口、拥堵、订单、囤货和事件预期，导致 AI 只能做孤立套利。

3.2 版的目标是把 FST 从“价格表游戏”重构为“可解释的实时供需博弈”：

```text
看城市角色 → 看供需缺口 → 看价格趋势 → 估算净利润 → 抢路线/抢订单 → 获得明确反馈
```

### 2.6 玩家核心心理模型

对学生而言，FST 必须把商业判断压缩成 4 个问题：

| 问题 | 游戏内可见信息 | 对应决策 |
|------|----------------|----------|
| 哪里产得多？ | 城市产业标签、供给槽、产地低价标记 | 在产地买入 |
| 哪里缺得多？ | 需求槽、缺口指数、收购热度 | 运往缺货城市 |
| 这趟是否赚钱？ | 路线净利预估、路费、预计到达价、风险等级 | 是否移动/买入 |
| 别人会不会抢？ | 公共订单、城市拥堵、同路商队、排行榜动向 | 抢单、避开拥堵、囤货或提前抛售 |

前端必须避免让学生只盯着一堆价格数字。每个商品在每个城市至少展示 3 个可读信号：

- **供需状态**：过剩 / 平衡 / 短缺。
- **价格趋势**：上涨 / 横盘 / 下跌，附最近 10~20 日曲线。
- **套利提示**：若存在正向路线，显示“可赚 / 勉强 / 不建议”，并解释主要原因。

### 2.7 赚钱与爽感设计原则

FST 不应保证每次操作赚钱，但必须保证“正确判断有足够频率被奖励”：

| 原则 | 设计要求 |
|------|----------|
| 正价差窗口 | 每个标准局任意时刻至少存在 3~5 条理论净利为正的路线，其中 1~2 条应对新手可见 |
| 低买高卖闭环 | 产地买入 → 运到缺货城 → 卖出，扣除路费后应有 8%~25% 常规毛利窗口 |
| 爽点反馈 | 成功卖出后显示“本趟净赚”“利润率”“击败本城均价” |
| 错误可解释 | 亏损时说明原因：买贵、卖晚、路费过高、到达后供给被抢、城市需求不足 |
| 节奏峰值 | 每局至少出现 2~4 个明显机会窗口：事件、公共订单、短缺爆发、物流拥堵解除 |

---

## 3. 核心循环

### 3.1 流程图

```
创建 match
  ├── 读取 fstrading.yaml
  ├── 合并覆盖参数
  ├── 创建 ArenaMatch
  └── 创建 ArenaParticipant（真人 + AI）
      ↓
玩家加入（正式赛）
  └── 输入房间码 → 创建 ArenaParticipant
      ↓
开赛 begin_match
  ├── 校验状态
  ├── 初始化 rts_runtime
  ├── 创建 TradingRound #0
  └── 启动 asyncio 日期推进调度器
      ↓
决策阶段（每日持续）
  ├── 人类玩家：HTTP POST /actions → pending_actions
  └── AI 玩家：日期推进时自动 enqueue
      ↓
日期推进（每 4 秒）
  ├── 推进在途玩家
  ├── 执行 pending_actions
  ├── 自然市场池更新
  ├── 重新定价
  ├── AI 决策（练习赛）
  ├── 再次执行 + 定价
  ├── 刷新总资产
  └── 新建 TradingRound
      ↓
结束判定
  ├── day >= total_days
  ├── 按 total_assets 排名
  ├── settle_match_rewards()
  └── event.status = finished
```

### 3.2 关键状态机

| 状态 | 触发条件 | 可执行操作 |
|------|----------|-----------|
| `draft` | 刚创建 | 组织者配置、邀请玩家 |
| `registration` | 开放加入 | 玩家输入房间码加入 |
| `playing` | 开赛 | 提交 action、查看 state |
| `finished` | 比赛结束 | 查看结果、复盘 |

### 3.3 日期推进规则

- **时间映射**：真实世界每 4 秒对应游戏内 1 日（`day_interval_sec = 4`）。
- **游戏日历**：开局可配置起始日期（如 `start_date: 07-01`），比赛共 `total_days: 150` 日。
- **推进者**：唯一，`rts_scheduler._day_loop()` 协程；每 4 秒触发一次 `advance_one_day()`。
- **内部字段保留**：后端代码与 API 中仍使用 `tick` 字段名，1 tick = 1 日；学生端一律显示为日期。
- **并发安全**：`maybe_advance_rts()` 对 `ArenaMatch` 行加锁（`with_for_update()`）。
- **HTTP 只读原则**：`GET /state` 不推进；`POST /actions` 只入队不立即执行。
- **广播顺序**：先 `db.commit()`，再 `WS broadcast`。

### 3.4 日期推进模型

#### 3.4.1 日历配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `start_date` | `07-01` | 起始日期，格式 `MM-DD`，例如 7 月 1 日 |
| `total_days` | `150` | 单局总天数 |
| `day_interval_sec` | `4` | 真实时间每 4 秒推进 1 日 |
| `warmup_days` | `6` | 热身期天数 |

日历显示规则：
- 第 0 日显示为起始日期（如 7 月 1 日）。
- 每推进 1 日，日期 +1；不区分真实月份天数，统一按 30 日/月循环显示（视觉层只做展示，结算仍用 day 计数）。
- 比赛结束日 = `start_date` + `total_days`。

#### 3.4.2 日期进度条

学生端顶部固定显示一条**日历进度条**，让学生对时间流逝有直观感知：

- **总览条**：一条从左到右的细进度条，全长代表 `total_days`，当前位置代表已过天数。
- **当日微进度**：在相邻两日之间，用一个二次缓动的子进度条展示 4 秒内的流逝（0% → 100%）。
- **关键节点标记**：热身期结束日、第 50/100 日、最后 10 日用小标记点高亮。
- **日期数字**：当前日期放大显示在进度条左侧，格式如「7 月 23 日 · 第 23 天」。
- **动画语言**：
  - 普通推进：进度条平滑右移，颜色为引擎主色（浮生记：青蓝 `#2EC3E5`）。
  - 最后 10 日：进度条变为暖橙色并轻微脉动，制造紧迫感。
  - 新一日触发：日期数字有 0.3 秒的弹跳缩放动画。

#### 3.4.3 内部 `tick` 与日期映射

为降低后端改动范围，内部状态与 API 继续复用 `tick` 字段：

```text
display_day = runtime.tick
display_date = start_date + runtime.tick 天
```

前端在渲染层做转换，**所有学生可见文案统一用「日/日期」**，不再出现「tick」一词。

#### 3.4.4 推进时序

1. 调度器每 `day_interval_sec` 唤醒一次。
2. 获取 `ArenaMatch` 行锁。
3. 调用 `advance_one_day()`：市场演化 → 执行 pending actions → AI 决策 → 定价 → 刷新资产 → 持久化 round。
4. 释放锁。
5. `db.commit()`。
6. WS 广播 `tick` 消息，前端收到后同时更新日期与进度条。

---

## 4. 决策设计

### 4.1 玩家每日可执行的操作

玩家在同一日内可提交 **一条 action**。Action 进入 `runtime["pending_actions"]` 队列，在下一日开始时统一执行。

| Action | 英文名 | Payload Schema | 说明 |
|--------|--------|----------------|------|
| 买入 | `buy` | `{"product_id": string, "quantity": int}` | 按城市 ask 价格买入商品 |
| 卖出 | `sell` | `{"product_id": string, "quantity": int}` | 按城市 bid 价格卖出商品 |
| 移动 | `move` | `{"to_city": string}` | 移动到相邻城市 |
| 购车 | `buy_vehicle` | `{"vehicle_type": "van" \| "truck"}` | 购买小货车/大卡车 |
| 观望 | `hold` | `{}` | 本日不操作 |

#### 4.1.1 3.2 新增策略动作（分阶段落地）

为增强策略性与公共博弈，FST 3.2 引入 4 类新动作。Phase A 可先实现前端提示与部分后端字段，完整机制可拆到 Phase A 收尾 / B1。

| Action | 英文名 | Payload Schema | 说明 | 落地优先级 |
|--------|--------|----------------|------|------------|
| 接公共订单 | `accept_contract` | `{"contract_id": string}` | 承诺在期限前向指定城市交付指定商品，成功给溢价，失败扣信誉/押金 | P0 |
| 市场情报 | `scout_market` | `{"city": string, "product_id": string}` | 消耗小额费用，显示该城该商品未来 3~5 日需求倾向/事件风险 | P1 |
| 限价委托 | `limit_order` | `{"side": "buy" \| "sell", "product_id": string, "quantity": int, "limit_price": number}` | 价格到达阈值时自动排队买/卖，降低高频操作压力 | P1 |
| 宣传/扰动 | `promote_demand` | `{"city": string, "product_id": string, "budget": number}` | 小幅提高某城市某商品短期需求；多人可叠加，形成公共博弈 | P2 |

公共订单是最优先机制，因为它同时解决 3 个问题：

- 给新手一个明确目标：“把 X 运到 Y，期限内可赚 Z”。
- 给高手一个抢跑博弈：“这张订单谁先接、谁先到、谁会被堵在路上”。
- 给 AI 一个可解释策略：“抢高溢价订单、堵热门路线、提前囤订单商品”。

### 4.2 校验规则

#### `buy` 校验

1. `quantity >= 1`
2. `product_id` 存在于配置中
3. 玩家当前不在运输途中，或已到达目的地
4. 当前城市该商品 `ask > 0`
5. `ask * quantity <= cash`
6. 买入后库存体积 `+ quantity * volume <= storage_capacity`

#### `sell` 校验

1. `quantity >= 1`
2. 库存 `inventory[product_id] >= quantity`
3. 当前城市该商品 `bid > 0`
4. 本日该城市该商品累计出售 `+ quantity <= absorption_cap_per_day`

#### `move` 校验

1. `to_city` 存在于城市列表中
2. `to_city != current_city`
3. 两城在路网中相邻（`route_exists(from, to)`）
4. 路费 `move_cost_per_edge <= cash`
5. 玩家当前不在运输途中

#### `buy_vehicle` 校验

1. `vehicle_type` 为 `van` 或 `truck`
2. 当前车辆数 `vehicles.length < max_vehicles_per_player`
3. 购车款 `vehicle_cost <= cash`

### 4.3 执行效果

| Action | 执行效果 |
|--------|----------|
| `buy` | `cash -= ask * qty`；`inventory[pid] += qty`；城市池 `-qty` |
| `sell` | `cash += bid * qty`；`inventory[pid] -= qty`；城市池 `+qty` |
| `move` | `cash -= move_cost`；写入 `transit = {from, to, arrival_day}` |
| `buy_vehicle` | `cash -= vehicle_cost`；`vehicles.append(type)`；`capacity += bonus` |
| `hold` | 无状态变更 |

### 4.4 特殊规则

- **运输途中无法交易**：玩家处于 `transit` 状态且 `current_day < arrival_day` 时，不能 buy/sell。
- **本城日收购上限**：所有玩家合计向某城市出售某商品，每日不超过 `absorption_cap_per_day`（默认 40）。
- **相邻限制**：移动只能选择路网中直接相连的城市。
- **车辆上限**：每名玩家最多拥有 `max_vehicles_per_player` 辆车（默认 3）。

### 4.5 路线净利预估

所有买入、移动、卖出决策都必须围绕“这趟是否赚钱”展开。前端在玩家选中商品和目标城市时，应展示路线净利预估：

```text
预计净利 = 预计到达 bid × 可售数量 - 当前 ask × 买入数量 - 路费 - 仓储/机会成本
预计利润率 = 预计净利 / (当前 ask × 买入数量 + 路费)
```

预估必须分成 3 档，而不是只给精确数字：

| 档位 | 条件 | UI 表达 |
|------|------|---------|
| 高机会 | 预计净利 > 成本 × 15%，且目标城短缺 | 青蓝/金色高亮，“值得跑” |
| 可尝试 | 预计净利 5%~15%，或存在事件风险 | 中性提示，“有机会” |
| 不建议 | 预计净利 < 5% 或路费吃掉价差 | 灰/橙提示，“路费过高/价差不足” |

预估不是承诺。若到达后价格变化导致亏损，复盘必须解释“为什么预估失效”：其他玩家提前抛售、事件改变供需、物流拥堵导致到达延迟、目标城收购上限被吃掉。

### 4.6 公共博弈对象

3.2 版至少设计 4 个公共争夺对象：

| 对象 | 玩家感知 | 策略点 |
|------|----------|--------|
| 公共订单 | 地图上出现限时需求卡 | 抢单、提前备货、判断期限 |
| 热门路线 | 路线上显示商队数量/拥堵度 | 跟随套利或避开拥堵 |
| 城市收购上限 | 市场显示“今日剩余收购量” | 抢先卖出、分散出货 |
| 事件预告 | 1~3 日前出现模糊预警 | 囤货、提前抛售、购车避险 |

---

## 5. 结算规则

### 5.1 结算函数签名

```python
def settle_match_rewards(
    db: Session,
    match: ArenaMatch,
    participants: List[ArenaParticipant],
) -> None:
    """比赛结束后按总资产排名发放奖励。
    注意：FST 的单轮日期结算不由 settle_match_rewards 处理，
    而是由 `rts_day.advance_one_day()` 在每日推进时处理。
    settle_match_rewards 只负责最终 XP/金币/钻石入账。
    """
```

单轮日期结算函数：

```python
def advance_one_tick(db: Session, event: ArenaMatch) -> None:
    """推进一日。包含市场演化、action 执行、定价、资产刷新。"""
```

### 5.2 日期推进的 8 步顺序

1. **日期计数器 +1**，更新 `phase`（warmup/running/finished）。
2. **推进在途玩家**：`advance_transits()`，若 `day >= arrival_day`，更新 `current_city`。
3. **执行真人 pending actions**：`apply_pending_actions()`，按 FIFO 顺序结算本日前提交的指令。
4. **自然市场池更新**：`natural_pool_tick()`，根据生产/消费/均值回归调整城市池。
5. **重新定价**：`build_price_snapshot()`，基于新池生成 ask/bid。
6. **AI 决策（仅练习赛）**：`enqueue_ai_actions()`，AI 基于新 snapshot 排队。
7. **执行 AI actions + 再次自然池更新 + 定价**：保证 AI 行为立即反映到价格。
8. **刷新所有玩家总资产**：`_refresh_assets()`，按当前城市 bid 估值库存。
9. **持久化新 Round**：创建 `TradingRound(next_day, price_snapshot=new_snapshot)`。
10. **结束判定**：若 `next_day >= total_days`，调用 `_finish_rts_match()`。

### 5.3 供需与定价重构（3.2）

FST 3.2 的定价模型不再只追求“模拟”，而要服务 3 个体验目标：

1. **可读**：玩家能从供需槽、价格曲线和城市标签看懂为什么涨跌。
2. **可赚**：正确的空间套利在扣除路费后仍有稳定利润窗口。
3. **可博弈**：玩家、AI、公共订单和事件会改变价格，让同一条路线不是永远最优。

#### 5.3.1 城市角色：每城必须有明确产业身份

六城必须在配置中声明 `city_profile`，给学生一个直观记忆点：

| 城市 | 角色 | 供给优势 | 需求优势 | 教学意图 |
|------|------|----------|----------|----------|
| 上海 | 消费/金融枢纽 | 奢侈品周转、家用车展销 | 奢侈品、家电、日用品 | 高消费城市，高 bid 但竞争激烈 |
| 苏州 | 制造枢纽 | 家电、日用品、原材料加工 | 能源、原材料 | 制造业吃上游、产下游 |
| 杭州 | 科技/生活消费 | 家电、日用品、纺织品品牌化 | 生鲜、奢侈品 | 新品事件与消费升级 |
| 南京 | 区域综合枢纽 | 家具、日用品 | 粮食、能源、家电 | 稳定中转，低风险路线 |
| 南通 | 港口/农业节点 | 粮食、生鲜、能源入港 | 家具、日用品 | 低价产地与冷链风险 |
| 常州 | 能源/装备制造 | 能源、原材料、家用车零部件 | 家电、纺织品 | 工业链与运力投资 |

每个城市-商品组合有一个清晰的基础状态：

```yaml
city_product_profile:
  role: producer | consumer | hub | neutral
  production_rate: number
  consumption_rate: number
  demand_elasticity: number
  event_affinity: [event_type]
  visual_tag: 产地 | 缺货 | 枢纽 | 展销 | 冷链
```

#### 5.3.2 供需槽：让价格变化可解释

每个城市每个商品维护 4 个核心量：

| 字段 | 含义 | UI 表达 |
|------|------|---------|
| `supply_stock` | 城市当前可售供给池 | 供给槽 |
| `daily_demand` | 城市每日自然消费需求 | 需求槽 |
| `demand_gap` | `daily_demand - supply_stock / cover_days` | 短缺/过剩标签 |
| `player_flow` | 玩家近 3~5 日净买入/净卖出 | 玩家影响箭头 |

玩家看到的不是公式，而是结论：

| 状态 | 条件 | 价格倾向 | UI |
|------|------|----------|----|
| 严重短缺 | `demand_gap > high_gap` | bid 快速上升，ask 上升 | 红橙“急缺” |
| 轻度短缺 | `demand_gap > 0` | bid 上升 | 金色“缺货” |
| 平衡 | 接近 0 | 横盘 | 灰色“平衡” |
| 过剩 | `demand_gap < -low_gap` | ask 下跌，bid 下跌 | 青色“过剩” |

#### 5.3.3 新定价公式：结构价 + 短缺价 + 玩家冲击 + 事件

FST 3.2 推荐公式：

```text
structural_mid = base_price
  × city_role_multiplier(city, product)
  × seasonal_multiplier(day, product)

scarcity_index = clamp((target_cover_days - cover_days) / target_cover_days, -1.0, 1.5)

player_impact = clamp(net_player_flow_5d / target_pool, -0.25, 0.35)
event_impact = active_event_multiplier(city, product)

mid = structural_mid
  × (1 + scarcity_index × scarcity_elasticity)
  × (1 + player_impact × player_elasticity)
  × event_impact

ask = mid × (1 + spread / 2 + local_buy_pressure)
bid = mid × (1 - spread / 2 + shortage_bid_bonus)
```

关键调整：

- **产地 ask 明显更低**：producer 城市对优势商品的 `city_role_multiplier` 应在 `0.72~0.88`。
- **消费城 bid 明显更高**：consumer 城市对需求商品的 `city_role_multiplier` 应在 `1.12~1.35`。
- **短缺优先抬 bid**：缺货城市要更愿意收购，而不是只把 ask 抬高。
- **玩家冲击可见但不过度**：多人同时抛售会压低 bid，形成抢先卖出的公共博弈。
- **均值回归变慢**：价格不能在运输途中快速回到无利可图，标准路线的机会窗口应持续 3~8 日。

#### 5.3.4 价差与盈利校准

每个配置包必须内置“机会路线校准表”，保证存在可盈利路线：

| 商品 | 低价产地 | 高价销地 | 常规净利目标 | 风险 |
|------|----------|----------|--------------|------|
| 粮食 | 南通 | 上海/南京 | 8%~14% | 低 |
| 生鲜 | 南通 | 上海/杭州 | 12%~22% | 冷链/时间 |
| 原材料 | 常州/苏州 | 苏州/南京 | 10%~18% | 中 |
| 能源 | 常州/南通 | 苏州/杭州 | 10%~20% | 事件波动 |
| 家具 | 南京/苏州 | 上海/杭州 | 12%~20% | 体积大 |
| 纺织品 | 杭州/苏州 | 上海/南京 | 10%~18% | 中 |
| 日用品 | 苏州/南京 | 上海/南通 | 8%~16% | 低 |
| 家电 | 苏州/杭州 | 上海/南京 | 14%~24% | 资金占用 |
| 家用车 | 常州/上海 | 上海/杭州 | 15%~28% | 体积大/高价 |
| 奢侈品 | 上海/杭州 | 上海/南京/杭州事件城 | 18%~35% | 高波动 |

验收标准：

- 标准局第 0 日，至少 4 条路线的 `预计净利率 > 10%`。
- 任意非结束阶段，若没有 `预计净利率 > 8%` 的路线，系统应通过事件、订单或需求回补生成新机会。
- 新手推荐路线应避开最高风险商品，优先粮食、日用品、生鲜。

#### 5.3.5 价格历史曲线

每个城市-商品必须提供价格历史，支持点击商品后查看：

| 曲线 | 含义 | UI |
|------|------|----|
| ask | 当前城市买入价 | 青蓝线 |
| bid | 当前城市卖出价 | 金色线 |
| supply/demand | 供给与需求指数 | 小柱状或背景带 |
| player_flow | 玩家净买卖冲击 | 底部正负柱 |
| event_marker | 事件发生点 | 小图标 |

默认显示最近 30 日；短局显示全局。曲线必须回答 3 个问题：

- 价格是在涨还是跌？
- 涨跌是因为自然供需、玩家抛售，还是事件？
- 我现在买/卖是追高、抄底，还是正常套利？

### 5.4 库存规则

- **基础仓储**：`storage_capacity_base = 99` 格
- **车辆加成**：
  - `van`：+18 格
  - `truck`：+42 格
- **商品体积**：1~8 不等（例如 passenger_car 体积为 8）
- **已用体积**：`used = sum(qty * volume for each product)`
- **买入限制**：`used + need <= capacity`

### 5.5 移动与路费

- **最短旅行日数**：`min_travel_days = 2`
- **基础路费**：`move_cost_per_edge = 800`
- **速度加成**：truck 可缩短旅行天数（当前未完全实现）
- **在途状态**：`transit = {from_city, to_city, arrival_day}`

### 5.6 事件系统：机会窗口与公共预期

事件不再只是随机扰动，而是用来制造“可预判、可抢跑、可解释”的机会窗口。每个事件分为 3 个阶段：

| 阶段 | 时长 | 玩家可见性 | 作用 |
|------|------|------------|------|
| 预告 | 1~3 日 | 模糊提示，如“上海高端展会传闻” | 给玩家提前囤货/转向的机会 |
| 生效 | 3~10 日 | 明确事件卡、影响商品和城市 | 形成高利润窗口 |
| 消退 | 2~5 日 | 趋势回落提示 | 防止价格突然断崖，允许收尾 |

FST 3.2 事件表：

| 事件类型 | 影响 | 策略点 |
|----------|------|--------|
| `harvest_bumper` | 南通粮食/生鲜供给大增，产地 ask 下跌 | 低价扫货，运往消费城 |
| `factory_rush` | 苏州/南京日用品、家具、原材料供给上升 | 制造品外运 |
| `energy_supply` | 常州/南通能源供给上升，能源 ask 下跌 | 能源套利，工业城补货 |
| `auto_fair` | 上海/杭州家用车需求上升，bid 上升 | 高价低频大单 |
| `tech_launch` | 杭州/上海家电需求上升 | 提前从苏州进货 |
| `luxury_fair` | 上海/杭州奢侈品 bid 大幅上升 | 高风险高收益 |
| `logistics_jam` | 某些路线 travel_days +1 或 move_cost 上升 | 绕路、提前出发、抢拥堵解除 |
| `cold_chain_break` | 生鲜运输风险上升，到达延迟会折价 | 快速卖出或避开生鲜 |

#### 5.6.1 公共订单系统

公共订单是事件系统的常驻策略层。订单由城市需求、事件和系统节奏生成：

```json
{
  "contract_id": "c_1024",
  "city": "shanghai",
  "product_id": "produce",
  "quantity": 20,
  "deadline_day": 42,
  "premium_rate": 0.22,
  "deposit": 1200,
  "remaining_slots": 2,
  "status": "open"
}
```

规则：

- 每张订单有数量、期限、溢价、押金和可接人数。
- 成功交付：按 `current_bid × (1 + premium_rate)` 结算，并返还押金。
- 失败：押金损失，信誉/复盘记录扣分；不影响比赛公平奖励。
- 订单必须显示预计净利、剩余时间、竞争人数。
- 订单生成应优先补足当前地图缺少的盈利路线。

#### 5.6.2 城市拥堵与路线热度

路线热度把玩家行动变成公共信息：

| 指标 | 来源 | 影响 |
|------|------|------|
| `route_traffic` | 近 3 日选择该路线的商队数量 | 高时提高移动成本或延迟概率 |
| `arrival_queue` | 同日抵达目标城市的同商品库存 | 高时提示“可能压价” |
| `sell_pressure` | 目标城近 3 日玩家净卖出 | 高时 bid 下行 |

UI 表达：路线从淡青到暖橙逐渐加粗；热门目的地显示“拥挤/抢卖”。

#### 5.6.3 爽点事件

系统应在玩家完成正确判断时给出可见奖励反馈：

| 触发 | 文案/反馈 |
|------|-----------|
| 单趟净利率 > 15% | “漂亮套利：本趟净赚 ¥X，利润率 Y%” |
| 抢在价格下跌前卖出 | “抢先出货：避开后续跌价” |
| 公共订单成功 | “订单达成：溢价 +X%” |
| 逆势抄底后上涨 | “低位建仓命中” |
| 连续 3 次正收益 | “商路连击 ×3” |

### 5.7 最终排名

比赛结束时按 `total_assets` 降序排名：

```
total_assets = cash + sum(inventory[pid] * current_city_bid[pid])
```

---

## 6. AI 对手

### 6.1 AI 配置

| 字段 | 默认值 |
|------|--------|
| 练习赛 AI 数量 | `practice_ai_count = 3` |
| AI 档位分配 | `["chaotic", "advanced", "advanced"]` |
| 最大 AI 档位 | 配置中定义 5 档，当前仅实现 2 档 |

FST 3.2 后，AI 不应只模拟“会不会套利”，而要承担 3 个体验职责：

1. **提供市场行为**：AI 买卖应影响供需，让价格变化有公共来源。
2. **制造对抗压力**：AI 会抢公共订单、热门路线和收购上限。
3. **承担教学示范**：AI 的行动轨迹可以被复盘解释，学生能学到策略。

### 6.2 Chaotic（混乱型）

用于提供"随机扰动"，让市场价格更动态。

| 概率 | 行为 |
|------|------|
| 20% | 故意反向操作：若有库存 60% 随机卖一个；否则随机买一个 |
| 20%~55% | 随机卖库存 |
| 55%~78% | 随机买（最多 5 单位，受资金和仓储限制） |
| 78%~88% | 40% 概率随机买车 |
| 其余 | 随机移动到另一城市 |

### 6.3 Advanced（套利型）

用于提供"理性对手"，模拟真实套利行为。

按优先级执行：

1. **已在最高 bid 城 → 卖出**：遍历库存，若当前城市是某商品最高 bid 城，卖出 `min(qty, 8)`。
2. **不在最优城 → 前往最高 bid 城**：选择库存价值最高商品，若远程 bid > 本地 bid + 路费/数量，则移动。
3. **仓储紧 → 购车**：
   - 使用 > 72% 且现金 > 9000 且无 van → 买 van
   - 使用 > 55% 且现金 > 22000 且已有车且无 truck → 买 truck
4. **跨城套利扫描**：对所有商品找 `max(bid_remote - ask_local)`，考虑产地加成，若 score > 路费*0.5：
   - 若不在低价城则移动
   - 到达后买入 `min(max_by_cash/vol, 6)`
5. **人在产地**：若某商品本地生产 > 消费，且最佳出售城 bid > ask*1.12，买入最多 5。
6. **现金闲置**：移动到总消费需求最高的城市。

### 6.4 AI 命名与扩展

YAML 中定义 5 档 AI 策略。3.2 版要求每档 AI 绑定明确“商业性格”和可观察行为：

| 档位 | 商业性格 | 主要策略 | 玩家感受 |
|------|----------|----------|----------|
| `chaotic` | 市场噪音制造者 | 小额随机买卖、偶尔反向操作、制造低价/高价异常 | 市场更活，低威胁 |
| `advanced` | 理性套利商 | 扫描净利路线、抢公共订单、避开拥堵 | 标准强敌 |
| `hoarder` | 囤货商 | 在产地低价扫货，等待事件/短缺后抛售 | 会造成缺货和价格上行 |
| `momentum` | 趋势追随者 | 追涨买入、热门路线跟随、抢收购上限 | 制造拥挤和抢卖压力 |
| `conservative` | 稳健商队 | 小批量低风险路线、现金储备、订单优先 | 教学示范型对手 |

#### 6.4.1 AI 决策评分

所有高级 AI 使用统一评分框架，方便调参和复盘：

```text
score(route, product) =
  expected_profit
  + contract_bonus
  + shortage_bonus
  + trend_bonus
  - travel_cost
  - congestion_penalty
  - inventory_risk
  - cash_risk
```

不同 AI 只改变权重：

| AI | 高权重 | 低权重 |
|----|--------|--------|
| advanced | expected_profit, contract_bonus | cash_risk |
| hoarder | shortage_bonus, event_forecast | quick_cash |
| momentum | trend_bonus, route_popularity | congestion_penalty |
| conservative | cash_risk, inventory_risk | high_volatility_profit |
| chaotic | random_noise | all rational weights |

#### 6.4.2 AI 可见化

为了增强对抗性，前端应公开一部分 AI 意图：

- 排行榜显示 AI 当前城市、总资产、最近动作。
- 地图路线显示 AI 商队移动方向。
- 公共订单卡显示“已有 X 个商队接单/疑似前往”。
- 赛后复盘显示“某 AI 因为提前囤货赚取 ¥X”。

---

## 7. 状态与数据

### 7.1 数据库表

#### 通用 Arena 表

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `competition_events` | 场次元数据 | `id`, `match_kind`, `game_config_id`, `game_type`, `status`, `config`, `max_players`, `current_round` |
| `competition_participants` | 参赛者 | `id`, `event_id`, `user_id`, `is_ai`, `cash`, `inventory`, `current_city`, `total_assets`, `final_rank` |

#### FST 运行时表

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `trading_rounds` | 每日一行 | `id`, `event_id`, `round_number`, `status`, `events`, `price_snapshot` |
| `trading_decisions` | 玩家决策记录 | `id`, `round_id`, `participant_id`, `action_type`, `action_data`, `cash_after`, `inventory_after` |
| `trading_prices` | 价格历史（当前未使用，预留） | `id`, `event_id`, `round_id`, `city`, `product_id`, `base_price`, `final_price` |

### 7.2 运行时状态结构（`match.config["rts_runtime"]`）

```json
{
  "config_id": "fstrading",
  "day": 0,
  "phase": "warmup",
  "total_days": 150,
  "day_interval_sec": 4,
  "started_at": "ISO timestamp",
  "last_day_at": "ISO timestamp",
  "pending_actions": [
    {
      "participant_id": 1,
      "action_type": "buy",
      "action_data": {"product_id": "grain", "quantity": 10},
      "queued_at": "ISO timestamp"
    }
  ],
  "tick_events": [],
  "contracts": [
    {
      "contract_id": "c_1024",
      "city": "shanghai",
      "product_id": "produce",
      "quantity": 20,
      "deadline_day": 42,
      "premium_rate": 0.22,
      "remaining_slots": 2
    }
  ],
  "route_heat": {
    "nantong->shanghai": {"traffic": 3, "congestion": 0.2}
  },
  "pools": {
    "shanghai": {
      "grain": {
        "pool": 400,
        "production": 60,
        "consumption": 80,
        "supply_state": "balanced",
        "demand_gap": 0.05,
        "player_flow_5d": -8
      },
      "...": "..."
    }
  },
  "active_round_id": 1
}
```

### 7.3 玩家私有状态（`match.config["rts_players"][participant_id]`）

```json
{
  "ai_level": "advanced",
  "vehicles": ["van"],
  "transit": null,
  "last_action_summary": "买入粮食 x10"
}
```

### 7.4 API 端点

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/v1/trading/events/{event_id}/state` | 获取当前 GameState |
| POST | `/api/v1/trading/events/{event_id}/actions` | 提交 RTS action |
| GET | `/api/v1/trading/events/{event_id}/history` | 获取日期历史价格 |
| GET | `/api/v1/trading/regions/{region_id}/geo-pack` | 获取地理包 |
| WS | `/api/v1/trading/events/{event_id}/ws` | 订阅日期推进推送 |

#### 7.4.1 GameState 新增字段（3.2）

| 字段 | 类型 | 用途 |
|------|------|------|
| `markets[].products[].supply_state` | string | `shortage` / `balanced` / `surplus` 等供需标签 |
| `markets[].products[].demand_gap` | number | 供需缺口指数，用于 UI 排序和颜色 |
| `markets[].products[].trend_score` | number | 价格趋势，-1 到 1 |
| `markets[].products[].expected_routes` | array | 当前商品推荐目的地与净利预估 |
| `rts.contracts` | array | 当前开放公共订单 |
| `rts.route_heat` | object | 路线热度、拥堵、商队数量 |
| `rts.market_events` | array | 事件预告、生效、消退状态 |
| `rts.explainers` | array | 系统生成的供需解释短句 |

#### 7.4.2 历史价格 API

`GET /api/v1/trading/events/{event_id}/history` 必须支持按城市和商品过滤：

```text
/history?city=shanghai&product_id=produce&window=30
```

返回结构：

```json
{
  "city": "shanghai",
  "product_id": "produce",
  "points": [
    {
      "day": 12,
      "ask": 31,
      "bid": 29,
      "supply_index": 0.42,
      "demand_index": 0.73,
      "player_flow": -6,
      "event_types": ["cold_chain_break"]
    }
  ]
}
```

该 API 是教育目标的一部分，不是可选图表。没有价格曲线，学生难以建立供需和价格变化之间的因果关系。

### 7.5 视觉与交互设计规范

#### 7.5.1 引擎独立身份声明

FST 是浮生记专属引擎，其视觉、交互、配色、音效均**独立设计**，不与其他引擎共享主题。后续 TechVenture、OPS、金融等引擎须各自拥有自己的设计系统；除非显式说明「参考 FST」，否则禁止复用 FST 的配色、组件或动效。

#### 7.5.2 FST 专属视觉方向

为改变当前整体偏深重的网页感，FST 采用**轻盈、通透、现代商旅**风格：

| 元素 | 方向 | 参考值 |
|------|------|--------|
| 主背景 | 浅灰/米白渐变，避免全屏深黑 | `#F6F8FA` → `#FFFFFF` |
| 主色 | 青蓝（长江水/物流感） | `#2EC3E5` |
| 辅色 | 暖黄（商队/金币） | `#F6C344` |
| 警告/冲刺 | 暖橙 | `#FF8A4C` |
| 文字 | 深灰，非纯白 | `#1F2937` |
| 面板 | 白色卡片 + 细阴影 + 圆角 12px | — |
| 地图 | 浅色长三角底图 + 高饱和城市节点 | `art-assets/fushengji/maps/` |

#### 7.5.3 车辆移动：从瞬移到平滑动画

当前车辆在 tick 切换时直接跳到目的地，体验断裂。新规范要求：

1. **提交移动指令时**：
   - 立即播放「出发」音效（短促引擎声）。
   - 起点城市出现出发粒子环。
   - 商队标记沿路线开始平滑位移，速度按旅行日数均分。
2. **在途期间**：
   - 商队标记在地图路线上按比例前进，每日推进一段。
   - 面板显示「预计 X 月 X 日到达」。
3. **到达时**：
   - 播放「到达」音效。
   - 目标城市出现抵达粒子环。
   - 当前城市标签高亮 1 秒。
4. **实现建议**：
   - Phaser 场景：用 `tween` 驱动标记移动，持续时间为 `travel_days * day_interval_sec` 秒。
   - React/SVG 实现：用 CSS `transition` + `requestAnimationFrame` 按真实时间插值，状态变化只修正目标位置，不瞬移。

#### 7.5.4 交易交互重做

当前交易交互为「选商品 → 填数量 → 点买入/卖出」，操作链路长。新规范改为：

**买入**：
1. 点击商品卡片即显示快捷数量条（+1 / +5 / +10 / 全部）。
2. 拖动或点击数量后，卡片上浮现「买入」确认按钮。
3. 确认后：
   - 现金数字滚动减少，库存数字滚动增加。
   - 播放「交易成功」音效。
   - 商品卡片绿色闪一下，并向上飘出「+X」浮动文字。
4. 若资金或仓储不足，卡片抖动并显示红色提示，不提交。

**卖出**：
1. 库存列表中的商品可拖拽到城市市场区，或点击后选择卖出数量。
2. 确认后：
   - 库存数字滚动减少，现金数字滚动增加。
   - 播放「收银」音效。
   - 商品卡片金色闪一下，并向上飘出「+$」浮动文字。
3. 若城市该商品 bid 为 0 或超过当日收购上限，市场区变红并抖动。

**移动**：
1. 点击当前城市高亮显示相邻城市。
2. 点击目标城市弹出确认浮层，显示路费与预计到达日。
3. 确认后商队出发动画启动，目的地按钮进入倒计时状态。

#### 7.5.5 音效、反馈与动画清单

| 事件 | 音效 | 视觉反馈 |
|------|------|----------|
| 页面加载 | 轻 BGM 渐入 | 城市节点依次淡入 |
| 新一日推进 | 日历翻页声 | 日期数字弹跳、进度条平滑推进 |
| 买入成功 | 金币落入袋声 | 现金滚动、库存滚动、绿色闪光、+X 浮动文字 |
| 卖出成功 | 收银机「叮」 | 现金滚动、金色闪光、+$ 浮动文字 |
| 移动出发 | 引擎启动短声 | 出发粒子环、商队沿路线移动 |
| 移动到达 | 刹车/到埠铃声 | 抵达粒子环、城市高亮 |
| 购车 | 机械/升级声 | 容量数字增长、车辆图标飞入 |
| 事件触发 | 事件类型音效 | 全屏事件卡从底部滑入 |
| 错误/拒绝 | 低频警示声 | 面板轻微抖动、按钮变红 |
| 比赛结束 | 胜利/结算 BGM | 结果面板展开、排名依次揭晓 |

#### 7.5.6 动画性能约束

1. 所有动画优先使用 CSS `transform` 与 `opacity`，避免触发 layout/paint。
2. 同时播放粒子效果不超过 30 个。
3. 支持 `prefers-reduced-motion`，关闭非必要动画。
4. 低端设备帧率低于 30fps 时自动降级为简单过渡。

#### 7.5.7 商品详情与价格曲线

点击任意商品卡片后，必须出现商品详情抽屉或弹窗，而不是只选中商品。详情面板包含：

| 模块 | 内容 | 教学作用 |
|------|------|----------|
| 价格曲线 | 最近 30 日 ask/bid 双线 | 看懂涨跌趋势 |
| 供需条 | 当前供给、需求、短缺/过剩状态 | 看懂价格原因 |
| 玩家冲击 | 近 5 日玩家净买/净卖 | 看懂公共博弈 |
| 推荐路线 | 1~3 条净利最高路线 | 把认知转成行动 |
| 风险解释 | 路费、拥堵、收购上限、事件风险 | 避免盲目跟随 |

面板文案应短、直观：

- “南通生鲜过剩，ask 低于 7 日均价 18%。”
- “上海生鲜短缺，bid 连续 4 日上涨。”
- “南通 → 上海预计净利 ¥860，利润率 17%，但冷链事件风险高。”
- “已有 3 支商队前往上海，可能在到达日压低 bid。”

曲线图交互：

1. 默认显示当前城市该商品。
2. 可切换“对比城市”，最多同时显示 3 城 bid。
3. 事件发生日用小图标标记。
4. 鼠标悬停显示当天 ask、bid、供需状态。
5. 移动端用底部抽屉，避免遮挡地图。

### 7.6 WebSocket 消息类型

| 类型 | 方向 | 内容 |
|------|------|------|
| `connected` | 服务端 → 客户端 | `event_id`, `tick`, `phase`, `seconds_until_next_day` |
| `tick` | 服务端 → 客户端 | `event_id`, `tick`, `phase`, `seconds_until_next_day`，建议附带轻量 state diff |
| `finished` | 服务端 → 客户端 | `event_id`, `tick`, `phase`, `finished: true` |
| `market_event` | 服务端 → 客户端 | 事件预告/生效/消退 |
| `contract_update` | 服务端 → 客户端 | 公共订单新增、被接取、完成、过期 |
| `ping` | 客户端 → 服务端 | 保活 |
| `pong` | 服务端 → 客户端 | 保活响应 |

> 注：`tick` 字段在内部协议中保留，含义为「游戏日数」；前端展示时转换为日期。

### 7.7 大规模参赛设计（15~40 支队伍）

#### 当前设计已支持的点

- `max_players` 默认 50，可扩展至 100+
- `competition_participants` 表独立，不依赖队伍模式
- 运行时状态存 JSON，不随人数增加表字段

#### 需要注意的瓶颈

| 瓶颈 | 影响 | 缓解方案 |
|------|------|----------|
| 行锁竞争 | `maybe_advance_rts` 每 4 秒加锁 `ArenaMatch` | 锁持有时间应 < 100ms；日期结算放在锁外 |
| tick 结算线性遍历 | `apply_pending_actions` 遍历所有 participant | O(n) 可接受，40 人约 1ms；避免 O(n²) |
| WS 串行广播 | `RtsWsHub.broadcast` 逐个连接发送 | 40 连接 × 5 秒 = 8 RPS，当前可接受；多实例时需 Redis Pub/Sub |
| TradingRound JSON 过大 | `price_snapshot` 含 6 城 × 10 商品 | 约 10KB/行，120 tick ≈ 1.2MB/场，可接受 |
| 前端 fetchGameState 轮询 | 每个玩家每 tick 拉一次 | 40 人 × 12 tick/min = 480 RPS/场；建议把 state 直接塞进 WS tick 消息 |

#### 40 支队伍时的建议

1. **每队 1 人**：40 名独立 participant，完全支持。
2. **每队多人**：FST 是个人模式，`team_id` 为 NULL。若未来支持组队，需要重新定义共享库存/决策逻辑。
3. **AI 数量**：练习赛固定 3 个 AI，与真人数量解耦。
4. **排行榜显示**：前端当前显示前 6 名，40 人局建议增加完整排行榜弹窗或分页。

---

## 8. 前端局内

### 8.1 运行时选型

FST 选择 **`phaser` 运行时**，因为玩法核心包含：
- 地图上的城市节点
- 商队在路网中的移动动画
- 实时日推进的可视化

**当前实现状态**：
- `frontend/src/games/trading/index.tsx` 和 `scenes/MapScene.ts` 为 Phaser 接入占位
- 实际对局 UI 当前用 React + SVG 地图实现（`FushengjiMapStage`）
- Phaser 场景待 B 阶段完整接入

### 8.2 组件清单

| 组件 | 路径 | 状态 | 说明 |
|------|------|------|------|
| `TradingGamePage` | `pages/Games/TradingGamePage.tsx` | ✅ 已实现 | 页面容器，管理 WS 连接和轮询 |
| `TradingRTSView` | `pages/Games/TradingRTSView.tsx` | ✅ 已实现 | 核心对局 UI |
| `FushengjiMapStage` | `components/fushengji/FushengjiMapStage.tsx` | ✅ 已实现 | SVG 地图舞台，城市节点与路网 |
| `FushengjiFleetMarker` | `components/fushengji/FushengjiFleetMarker.tsx` | ✅ 已实现 | 商队标记与路线动画 |
| `TradingEntry` | `games/trading/index.tsx` | 🟡 占位 | Phaser 全屏入口 |
| `GameHUD` | `games/trading/components/GameHUD.tsx` | 🟡 占位 | 顶部 HUD |
| `MapScene` | `games/trading/scenes/MapScene.ts` | 🟡 占位 | Phaser 场景 |

### 8.3 主要交互流程

1. **进入对局**：`/games/:id/play` → `TradingGamePage`
2. **连接 WebSocket**：订阅 `tick` / `finished` 消息
3. **查看市场**：当前城市商品卡显示 ask/bid、供需状态、趋势、剩余收购量
4. **点击商品**：打开价格曲线和供需解释，查看推荐路线与净利预估
5. **买卖操作**：从商品卡快捷数量条买入/卖出，立即显示本次预计影响
6. **移动操作**：点击地图城市或推荐路线，确认路费、到达日、拥堵与预计净利
7. **公共订单**：查看地图订单卡，选择接单或放弃，订单进入个人目标栏
8. **购车操作**：点击 van/truck，确认容量、速度、回本预估
9. **接收日期推进**：WS 收到日期推进消息后拉取最新 state 或应用 state diff，更新地图和面板
10. **爽点反馈**：盈利卖出、订单完成、抢先出货触发结算浮层
11. **比赛结束**：弹出结果面板，显示排名、奖励和关键商业判断复盘

### 8.4 状态管理

```ts
interface TradingState {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;
  fetchGameState(eventId: number): Promise<GameState | null>;
  submitRtsAction(eventId, actionType, payload): Promise<RtsActionResponse>;
}
```

### 8.5 素材需求

| 素材类型 | 说明 |
|----------|------|
| 城市图标 | 长三角六城风格化图标 |
| 商队卡车 | van / truck 两种车型 |
| 商品图标 | 10 种商品的视觉标识 |
| 地图底图 | 长三角区域简化地图 |
| 事件弹窗 | 丰收/拥堵等事件的视觉提示 |
| 价格曲线组件 | ask/bid 双线、供需柱、事件标记 |
| 公共订单卡 | 订单商品、城市、期限、溢价、竞争人数 |
| 路线热度视觉 | 拥堵路线、商队数量、到达队列 |
| 爽点结算浮层 | 单趟净利、利润率、连击、订单达成 |

---

## 9. 配置规格

### 9.1 fstrading.yaml 顶层结构

```yaml
id: fstrading
engine: trading
design_mode: standalone
version: "3.2.0"
meta:
  name: 浮生记
  description: 4秒一日的即时长三角物流商战
  theme: fstrading
  world_region: yangtze_6
  education_focus:
    - 地域产业结构
    - 供需与价差
    - 运力投资
    - 库存约束
defaults:
  mode: rts
  day_interval_sec: 4
  start_date: 07-01
  duration_preset: standard
  duration_presets:
    short: { minutes: 8, days: 120 }
    standard: { minutes: 10, days: 150 }
    long: { minutes: 12, days: 180 }
    classroom: { minutes: 20, days: 300 }
  warmup_days: 6
  initial_capital: 50000
  storage_capacity_base: 99
  max_vehicles_per_player: 3
  practice_ai_count: 3
  practice_ai_slots: [chaotic, advanced, advanced]
  pricing:
    mode: supply_demand_v2
    min_spread: 0.08
    elasticity: 0.28
    reference_pool: 400
    absorption_cap_per_tick: 40
    natural_flow_scale: 0.20
    pool_reversion_rate: 0.03
    min_pool_ratio: 0.12
    target_cover_days: 6
    scarcity_elasticity: 0.32
    player_elasticity: 0.18
    opportunity_routes_min: 4
    opportunity_profit_floor: 0.08
  logistics:
    min_travel_days: 2
    move_cost_per_edge: 800
    congestion_enabled: true
  world:
    region_id: yangtze_6
    behavior_pack: default_yrd
  contracts:
    enabled: true
    max_open: 5
    min_premium_rate: 0.12
    max_premium_rate: 0.35
  history:
    price_window_days: 30
products: {...}
city_profiles: {...}
vehicles: {...}
event_types: [...]
rewards:
  official: {...}
  practice: {...}
```

### 9.2 商品配置字段

```yaml
grain:
  name: 粮食
  category: staple
  volume: 1
  base_price: 18
  price_range: [8, 45]
  chain: upstream
  spoil_pressure: 1.05
  demand_visibility: high
  volatility: low
```

新增字段：

| 字段 | 说明 |
|------|------|
| `demand_visibility` | 是否适合作为新手教学商品，`high` 的商品应给更明确路线提示 |
| `volatility` | 波动等级，影响 AI 风险与前端风险提示 |
| `spoil_pressure` | 生鲜等时间敏感商品到达延迟后的折价风险 |

### 9.3 城市配置字段

```yaml
city_profiles:
  shanghai:
    role: consumer_hub
    tags: [finance, port, luxury, auto_fair]
    products:
      luxury: { role: consumer, demand_mult: 1.35, production_mult: 0.75 }
      appliances: { role: consumer, demand_mult: 1.22, production_mult: 0.9 }
      daily_goods: { role: consumer, demand_mult: 1.15, production_mult: 0.85 }
  nantong:
    role: port_agriculture
    tags: [port, agriculture, cold_chain]
    products:
      grain: { role: producer, demand_mult: 0.82, production_mult: 1.45 }
      produce: { role: producer, demand_mult: 0.88, production_mult: 1.55 }
```

城市配置必须让每个城市至少有：

- 2 个优势供给商品。
- 2 个高需求商品。
- 1 个事件关联标签。
- 1 条新手可理解的推荐路线。

### 9.4 车辆配置字段

```yaml
van:
  name: 小货车
  capacity_bonus: 18
  speed_bonus: 1
  cost: 7500
truck:
  name: 大卡车
  capacity_bonus: 42
  speed_bonus: 2
  cost: 22000
```

### 9.5 事件配置字段

```yaml
event_types:
  - type: harvest_bumper
    name: 丰收
    desc: 主要粮食产区迎来丰收，市场供给增加
    target_products: [grain, produce]
    impact_range: [1.15, 1.35]
    global: false
    forecast_days: [1, 3]
    active_days: [4, 8]
    decay_days: [2, 4]
```

### 9.6 公共订单配置字段

```yaml
contracts:
  enabled: true
  max_open: 5
  generation:
    interval_days: 5
    prefer_shortage_city: true
    ensure_profitable_route: true
  defaults:
    deadline_days: [6, 14]
    premium_rate: [0.12, 0.35]
    deposit_ratio: 0.08
    slots: [1, 3]
```

### 9.7 奖励配置字段

```yaml
rewards:
  official:
    participate: 100
    top50_bonus: 100
    top20_bonus: 200
    first_place_bonus: 500
  practice:
    participate: 40
    top50_bonus: 30
    top20_bonus: 60
    first_place_bonus: 120
```

---

## 10. 实现参考与 Checklist

### 10.1 关键代码文件路径

#### 后端

| 路径 | 作用 |
|------|------|
| `backend/content/game-configs/fstrading.yaml` | 完整赛制配置 |
| `backend/app/games/trading/rts_tick.py` | tick 推进与比赛结束 |
| `backend/app/games/trading/rts_scheduler.py` | asyncio 调度器 |
| `backend/app/games/trading/rts_actions.py` | action 校验与执行 |
| `backend/app/games/trading/rts_pricing.py` | 定价算法 |
| `backend/app/games/trading/rts_logistics.py` | 仓储、车辆、移动 |
| `backend/app/games/trading/rts_ai.py` | AI 入口 |
| `backend/app/games/trading/rts_ai_levels.py` | chaotic / advanced 策略 |
| `backend/app/games/trading/rts_state.py` | 运行时状态 |
| `backend/app/games/trading/models.py` | trading_rounds / decisions / prices 表 |
| `backend/app/api/trading.py` | HTTP API 路由 |
| `backend/app/api/trading_rts_handlers.py` | RTS API 处理 |
| `backend/app/api/trading_ws.py` | WebSocket 路由 |
| `backend/app/domains/arena/services/match_factory.py` | 比赛创建 |
| `backend/app/domains/arena/services/match_lifecycle.py` | 开赛/结束 |

#### 前端

| 路径 | 作用 |
|------|------|
| `frontend/src/pages/Games/TradingGamePage.tsx` | 对局页面容器 |
| `frontend/src/pages/Games/TradingRTSView.tsx` | 核心对局 UI |
| `frontend/src/stores/tradingStore.ts` | Zustand store |
| `frontend/src/components/fushengji/FushengjiMapStage.tsx` | 地图舞台 |
| `frontend/src/components/fushengji/FushengjiFleetMarker.tsx` | 商队标记 |
| `frontend/src/lib/fstradingGeo.ts` | 地理工具 |
| `frontend/src/App.tsx` | 路由注册 |

### 10.2 新增引擎可复用的模式

从 FST 可以复用到新引擎的**架构模式**：

1. **运行时状态存 `match.config`**：减少表结构变更。
2. **调度器单点推进 tick**：`rts_scheduler.py` 模式。
3. **HTTP 提交 + pending 队列 + tick 统一执行**：`rts_actions.py` 模式。
4. **预校验与执行分离**：给玩家即时反馈，tick 时真正执行。
5. **AI 与人类共用 action 队列**：减少结算分支。
6. **每 tick 快照持久化到 round 表**：方便回放和审计。
7. **配置驱动内容**：`fstrading.yaml` 定义所有商品/城市/事件。
8. **WebSocket 广播 hub**：`rts_ws.py` 模式。

### 10.3 FST 交付 Checklist

- [x] 后端 `games/trading/` 目录结构完整
- [x] `settle_match_rewards` 接入 Career 奖励系统
- [x] RTS 调度器单写者模式
- [x] WebSocket 广播
- [x] 前端 React 对局 UI 可用
- [x] SVG 地图与商队动画
- [x] 练习赛 AI（chaotic + advanced）
- [x] `fstrading.yaml` 配置完整
- [ ] Phaser 场景接入（B 阶段）
- [ ] 事件系统完整实现（B 阶段）
- [ ] 完整排行榜支持 40 人（B 阶段）
- [ ] 额外 3 档 AI 策略（B 阶段）
- [ ] 日期进度条 UI 实现（Phase A 收尾）
- [ ] 车辆平滑移动动画（Phase A 收尾）
- [ ] 交易/移动交互重做（Phase A 收尾）
- [ ] 音效与动效清单落地（Phase A 收尾）
- [ ] FST 浅色主题独立实现（Phase A 收尾）
- [ ] 供需状态可视化：短缺/平衡/过剩、供需槽、趋势标签（Phase A 收尾）
- [ ] 商品详情价格曲线：ask/bid、供需指数、事件标记（Phase A 收尾）
- [ ] 路线净利预估：扣除路费后的预计利润与风险解释（Phase A 收尾）
- [ ] 城市角色配置：六城产业身份、优势供给、高需求商品（Phase A 收尾）
- [ ] 价差校准：标准局保持 3~5 条正净利路线（Phase A 收尾）
- [ ] 公共订单系统：订单生成、接取、交付、失败（B1）
- [ ] 路线热度/拥堵：商队数量、到达队列、抢卖压力（B1）
- [ ] AI 策略升级：订单型、囤货型、趋势型、保守型（B1）
- [ ] 事件三阶段：预告/生效/消退与机会窗口生成（B1）
- [ ] 把 state 直接推入 WS tick 消息，减少轮询（B 阶段）

### 10.4 性能红线

| 指标 | 目标 | 当前状态 |
|------|------|----------|
| 单 day 结算延迟 | < 200ms | 40 人约 10~50ms |
| 首屏加载 | < 3s | 依赖网络 |
| WebSocket 广播延迟 | < 100ms | 单实例满足 |
| 数据库锁持有时间 | < 100ms | 当前约 20ms |

---

*商识唯智 · FST 引擎 PRD v3.2.0*
*规范来源：`docs/ENGINE.md`、`02-ARCHITECTURE.md`、`03-ENGINEERING.md`*
