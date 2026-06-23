# FST 引擎 PRD · 浮生记 / FSTRADING

> **引擎简称**：FST（浮生记 / FSTRADING）
> **引擎 ID**：`trading`
> **配置 ID**：`fstrading`
> **版本**：3.1.0
> **运行时**：`phaser`（当前前端 React 实现，Phaser 场景预留接入）
> **设计模式**：`standalone`
> **最后更新**：2026-06-23

---

## 1. 元信息

| 字段 | 值 |
|------|-----|
| **引擎中文名** | 浮生记 / FStrading |
| **引擎英文名** | FST / FSTRADING |
| **引擎 ID** | `trading` |
| **配置包 ID** | `fstrading`（`trading-v1`、`trading-v2-rts` 已废弃为历史别名） |
| **版本** | `3.0.0` |
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

### 5.3 定价公式

FST 采用 **pool_ask_bid** 定价模式，基于城市供需池动态定价。

#### 目标池

```
target_pool = max(20, reference * 0.5 + consumption * 0.8 + production * 0.3)
```

#### 结构性中价

```
surplus = production - consumption
factor = 1.0 - 0.04 * (surplus / max(consumption, 1))
factor *= demand_multiplier ** 0.25
mid = base_price * factor
mid = clamp(mid, price_range.low, price_range.high)
```

#### 池压

```
ratio = pool / target_pool
if ratio > 1.5:
    pressure = -0.25 - 0.08 * min(2, ratio - 1.5)
elif ratio < 0.5:
    pressure = 0.25 + 0.08 * min(2, 0.5 - ratio) * 2
else:
    pressure = (1 - ratio) * 0.35

pressure += clamp(net_player_flow / target_pool * 0.1, -0.15, 0.15)
pressure = clamp(pressure, -0.45, 0.45)
```

#### Ask / Bid

```
half_spread = min_spread / 2
ask = mid * (1 + half_spread + pressure * elasticity)
bid = mid * (1 - half_spread + pressure * elasticity * 0.6)
bid = min(bid, ask * (1 - spread))
```

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

### 5.6 事件系统（当前半占位）

FST 配置中定义了 8 种事件类型：

| 事件类型 | 效果 |
|----------|------|
| `harvest_bumper` | 丰收：粮食/农产品供给增加 |
| `factory_surge` | 工厂满产：工业制品供给增加 |
| `energy_ease` | 能源宽松：能源类供给增加 |
| `auto_show` | 车展季：汽车需求增加 |
| `new_product_launch` | 新品发布：家电需求增加 |
| `luxury_expo` | 高端展会：奢侈品需求增加 |
| `logistics_jam` | 物流拥堵：移动成本临时上升 |
| `cold_chain_break` | 冷链中断：生鲜类供给下降 |

**当前状态**：`advance_one_tick` 每 tick 会清空 `tick_events`，但事件随机生成逻辑尚未完整实现。B 阶段需要补充事件触发器。

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

YAML 中定义了 5 档 AI 策略占位：

| 档位 | 状态 |
|------|------|
| `chaotic` | ✅ 已实现 |
| `advanced` | ✅ 已实现 |
| `hoarder` | 🟡 YAML 占位 |
| `momentum` | 🟡 YAML 占位 |
| `conservative` | 🟡 YAML 占位 |

B 阶段可补充 `hoarder`（囤积型）、`momentum`（追涨型）、`conservative`（保守型）策略。

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
  "pools": {
    "shanghai": {
      "grain": {"pool": 400, "production": 60, "consumption": 80},
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

### 7.6 WebSocket 消息类型

| 类型 | 方向 | 内容 |
|------|------|------|
| `connected` | 服务端 → 客户端 | `event_id`, `tick`, `phase`, `seconds_until_next_day` |
| `tick` | 服务端 → 客户端 | `event_id`, `tick`, `phase`, `seconds_until_next_day` |
| `finished` | 服务端 → 客户端 | `event_id`, `tick`, `phase`, `finished: true` |
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
3. **查看物价**：顶部显示当前城市所有商品的 ask/bid
4. **买卖操作**：选择商品和数量，点击买入/卖出
5. **移动操作**：点击地图城市或邻城按钮，确认移动
6. **购车操作**：点击 van/truck 按钮，确认购买
7. **接收日期推进**：WS 收到日期推进消息后拉取最新 state，更新地图和面板
8. **比赛结束**：弹出结果面板，显示排名和奖励

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

---

## 9. 配置规格

### 9.1 fstrading.yaml 顶层结构

```yaml
id: fstrading
engine: trading
design_mode: standalone
version: "3.0.0"
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
    mode: pool_ask_bid
    min_spread: 0.08
    elasticity: 0.28
    reference_pool: 400
    absorption_cap_per_tick: 40
    natural_flow_scale: 0.20
    pool_reversion_rate: 0.03
    min_pool_ratio: 0.12
  logistics:
    min_travel_days: 2
    move_cost_per_edge: 800
  world:
    region_id: yangtze_6
    behavior_pack: default_yrd
products: {...}
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
```

### 9.3 车辆配置字段

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

### 9.4 事件配置字段

```yaml
event_types:
  - type: harvest_bumper
    name: 丰收
    desc: 主要粮食产区迎来丰收，市场供给增加
    target_products: [grain, produce]
    impact_range: [1.15, 1.35]
    global: false
```

### 9.5 奖励配置字段

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
- [ ] 把 state 直接推入 WS tick 消息，减少轮询（B 阶段）

### 10.4 性能红线

| 指标 | 目标 | 当前状态 |
|------|------|----------|
| 单 day 结算延迟 | < 200ms | 40 人约 10~50ms |
| 首屏加载 | < 3s | 依赖网络 |
| WebSocket 广播延迟 | < 100ms | 单实例满足 |
| 数据库锁持有时间 | < 100ms | 当前约 20ms |

---

*商识唯智 · FST 引擎 PRD v3.1.0*
*规范来源：`docs/ENGINE.md`、`02-ARCHITECTURE.md`、`03-ENGINEERING.md`*
