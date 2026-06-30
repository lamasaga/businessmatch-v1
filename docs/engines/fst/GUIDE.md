# 浮生记 RTS 引擎指南

> 引擎标识：`engine: fstrading` · 配置文件：`content/game-configs/fstrading.yaml` · 路径：`webapp/backend/app/games/trading/`
> 玩法形态：**实时制（RTS）跨城贸易套利**，玩家在不同城市之间买卖商品、运输、扩张车队，AI 商人同台竞争。

---

> **最后更新**：2026-06-30

---

## 零、呈现层：游戏日叙事（强制）

FST 对玩家**只呈现日历时间**，不暴露引擎内部的 tick/拍概念。

| 层 | 规则 |
|----|------|
| **玩家可见文案** | 使用「游戏日期」「今日」「日末」「约 N 秒后执行」「X 日后到达」；禁止「拍」「tick」「节拍」 |
| **时间流逝 UI** | 合入顶栏「游戏日期」HUD 槽位：小型日晷/太阳弧（`FstDayClock`），**禁止**单独占一整行的大进度条 |
| **日末入账** | 一日将尽的最后约 0.6s 锁定新指令；提示「日末结算」「今日入账」 |
| **API / 代码** | 可保留 `tick`、`total_ticks`、`ms_until_next_tick` 等字段与函数名；前端用 `lib/fstGameTime.ts` 映射为日期 |
| **术语权威** | [`00-TERMINOLOGY.md`](../../../00-TERMINOLOGY.md) §游戏日、§禁用表 |

---

## 一、引擎定位与核心体验

浮生记 RTS 是一个**实时推进、按游戏日结算、服务器权威**的商品贸易模拟器。

- **时间轴**：默认约 **4 秒 = 1 游戏日**，总天数由 `total_ticks` 配置（如 120 日）。
- **玩家目标**：通过在多城市之间低买高卖，最大化总资产。
- **核心策略**：跨城套利、车队扩张、路线规划、库存管理。
- **实时感**：玩家提交指令后，在**当日将尽**统一入账；跨日时 WebSocket 触发 HTTP 刷新状态。

---

## 二、代码结构与核心文件

### 2.1 引擎层（`games/trading/`）

| 文件 | 职责 | 关键函数/类 |
|------|------|------------|
| `rts_scheduler.py` | **调度器**：唯一推进 tick 的入口 | `_tick_loop`, `maybe_advance_rts`, `start_rts_scheduler` |
| `rts_tick.py` | **Tick 推进**：一个 tick 内的完整结算流程 | `advance_one_tick`, `create_rts_first_round`, `finish_rts_match` |
| `rts_pricing.py` | **定价引擎**：供需、池压、买卖价计算 | `structural_mid`, `pool_pressure`, `calc_ask_bid`, `natural_pool_tick` |
| `rts_actions.py` | **指令系统**：玩家操作提交、排队、执行 | `queue_action`, `apply_pending_actions`, `_execute_one`, `advance_transits` |
| `rts_state.py` | **运行时状态**：管理 `match.config["rts_runtime"]` | `init_rts_runtime`, `build_price_snapshot`, `player_state` |
| `rts_ai.py` | **AI 入口**：按等级分派策略 | `enqueue_ai_actions` |
| `rts_ai_levels.py` | **AI 策略**：chaotic / advanced 两种商人 | `decide_advanced`, `decide_chaotic` |
| `rts_ws.py` | **WebSocket 广播**：tick 推送 | `RtsWsHub`, `broadcast_rts_from_match` |
| `rts_logistics.py` | **物流仓储**：容量、车辆、旅行时间 | `storage_capacity`, `effective_travel_ticks`, `move_cash_cost` |
| `rts_config.py` | **配置解析**：读取城市、商品、车辆定义 | `product_catalog`, `city_catalog`, `vehicle_defs` |
| `models.py` | **ORM 模型**：`TradingRound`, `TradingDecision`, `TradingPrice` | — |
| `rts_api_helpers.py` | **API 状态组装**：供 HTTP `/state` 使用 | `build_rts_markets`, `build_rts_inventory`, `build_rts_meta` |

### 2.2 API 与 Arena 层

| 文件 | 职责 |
|------|------|
| `api/trading.py` | HTTP 路由：`/state` 只读、`/actions` 提交指令 |
| `api/trading_ws.py` | WebSocket 路由：`/events/{id}/ws` |
| `domains/arena/services/match_lifecycle.py` | `begin_match()` 开赛，启动调度器 |
| `domains/arena/services/match_factory.py` | 创建练习赛 / 正式赛 |

---

## 三、调用关系图

```
practice.py / competitions.py
    ↓
begin_match()  ──► create_rts_first_round()
    ↓
start_rts_scheduler(event_id)
    ↓
_tick_loop() 每 5 秒一次
    ↓
maybe_advance_rts()  ──► advance_one_tick()
    ↓
1. advance_transits()        检查到达的旅行者
2. apply_pending_actions()   执行玩家/AI 指令
3. natural_pool_tick()       城市池量自然变化
4. build_price_snapshot()    重新计算全城价格
5. enqueue_ai_actions()      AI 生成指令
6. apply_pending_actions()   执行 AI 指令
7. natural_pool_tick()       AI 交易后池量变化
8. build_price_snapshot()    生成最终价格快照
9. _refresh_assets()         更新总资产
    ↓
db.commit()
    ↓
broadcast_rts_from_match()  WebSocket 广播 tick
```

---

## 四、功能实现详解

### 4.1 比赛创建与初始化

1. **`match_factory.create_practice_match()`** 读取 `fstrading.yaml`，提取初始资金、城市、商品、车辆。
2. 创建 `ArenaMatch` + `ArenaParticipant`（玩家 + 3 个 AI）。
3. `begin_match()` 调用 `create_rts_first_round()` 初始化运行时状态。
4. `init_rts_runtime()` 在 `match.config["rts_runtime"]` 中写入：
   - `tick=0`
   - `phase=warmup`（热身阶段）
   - `cities.{city}.pools` 各商品初始池量
   - `pending_actions=[]`
5. 启动 `rts_scheduler`，进入 `_tick_loop`。

### 4.2 调度器单写者模式

- 只有 `rts_scheduler.py` 中的 `_tick_loop()` 能推进 tick。
- HTTP `/state` 只读，不写状态。
- HTTP `/actions` 只把指令加入 `pending_actions`，不立即生效。
- 数据库使用 `with_for_update()` 行锁防止并发推进。

### 4.3 玩家操作类型

`_execute_one()` 支持 5 种指令：

| 指令 | 效果 |
|------|------|
| `buy` | 按 ask 价买入，扣现金、加库存、城市池减少 |
| `sell` | 按 bid 价卖出，加现金、减库存、城市池增加 |
| `move` | 移动城市，扣路费，进入 transit 状态 |
| `buy_vehicle` | 购买车辆，提升容量和速度 |
| `hold` | 无操作 |

### 4.4 AI 商人

- `chaotic`：高随机，有时会做亏损交易。
- `advanced`：跨城套利、产销地采购、最高 bid 城市出货。
- AI 指令与人类指令进入同一队列，使用同一结算规则。

### 4.5 WebSocket 广播

- 每个 tick 推进并 commit 后，广播 `{"type": "tick", tick, phase, seconds_until_next_tick}`。
- 客户端收到 tick 后，再拉 HTTP `/state` 获取完整状态。
- 比赛结束时广播 `{"type": "finished"}`。

---

## 五、数学建模详解

### 5.1 城市目标池量

```
target_pool = max(20, reference * 0.5 + consumption * 0.8 + production * 0.3)
```

- 消费量权重最高（0.8），决定目标池量以需求为主导。

### 5.2 结构性中价

```
surplus = production - consumption
factor = 1.0 - 0.04 * (surplus / max(consumption, 1))
factor *= demand_mult ** 0.25
structural_mid = base_price * factor
structural_mid = clamp(structural_mid, base*0.5, base*2)
```

- 供过于求 → 价格下跌；供不应求 → 价格上涨。
- `demand_mult` 是城市对该商品的偏好系数。

### 5.3 池压（Pool Pressure）

```
ratio = pool_qty / target_pool
if ratio > 1.5:   pressure = -0.25 - 0.08 * min(2.0, ratio - 1.5)
elif ratio < 0.5: pressure = 0.25 + 0.08 * min(2.0, 0.5 - ratio) * 2
else:             pressure = (1.0 - ratio) * 0.35

pressure += clamp(net_player_buy / target * 0.1, -0.15, 0.15)
pressure = clamp(pressure, -0.45, 0.45)
```

- 池量低于目标一半 → 涨价压力最大。
- 池量高于目标 1.5 倍 → 降价压力最大。
- 玩家净买入（买 - 卖）也会贡献 ±0.15 的压力。

### 5.4 Ask / Bid 价格

```
half = spread / 2  # spread 默认 8%
ask = mid * (1 + half + pressure * elasticity)
bid = mid * (1 - half + pressure * elasticity * 0.6)
bid = min(bid, ask * (1 - spread))
```

- `ask` 是买入价（玩家买的价格），对压力更敏感。
- `bid` 是卖出价（玩家卖的价格），对压力较迟钝。
- `spread` 保证做市商价差空间。

**例子**：base=100，spread=0.08，elasticity=0.12，pressure=0
- ask = 100 × (1 + 0.04 + 0) = 104
- bid = 100 × (1 - 0.04 + 0) = 96

### 5.5 自然池量变化

```
structural = (production - consumption) * flow_scale    # flow_scale=0.20
reversion  = (target - pool) * reversion_rate            # 0.03
delta = structural + reversion - player_buy + player_sell
pool = max(target * min_ratio, pool + delta)            # min_ratio=0.10
```

- 每 tick 池量按结构性供需、回归目标、玩家交易三者更新。

### 5.6 仓储与容量

```
capacity = base_capacity + Σ vehicle.capacity_bonus
used_volume = Σ (quantity * product.volume)
```

- 不同商品占用不同体积：民生品通常 1~2 格，家具/家电/机械显著占仓，家用车为 18 格，要求玩家投入运力并承担低频高资金占用风险。
- 车辆增加容量和速度。

### 5.7 总资产与排名

```
inventory_value = Σ (bid_price_in_current_city * quantity)
total_assets = cash + inventory_value
```

- 库存按当前城市 bid 估价。
- 比赛结束按 `total_assets` 排序。

---

## 六、关键配置参数（`fstrading.yaml`）

| 参数 | 典型值 | 含义 |
|------|--------|------|
| `initial_capital` | 50000 | 初始现金 |
| `total_ticks` | 120 | 总 tick 数 |
| `warmup_ticks` | 6 | 热身 tick 数 |
| `tick_interval_sec` | 5 | tick 间隔 |
| `base_capacity` | 99 | 基础仓储容量 |
| `spread` | 0.08 | 买卖最小价差 |
| `price_elasticity` | 0.12 | 价格弹性 |
| `flow_scale` | 0.20 | 结构性供需缩放 |

---

## 七、扩展与修改建议

| 想做的事 | 应改的文件 |
|----------|-----------|
| 新增商品/城市 | `content/game-configs/fstrading.yaml` + `rts_config.py` |
| 调整价格公式 | `rts_pricing.py` |
| 新增玩家操作类型 | `rts_actions.py` 的 `_execute_one` + API schema |
| 调整 AI 难度 | `rts_ai_levels.py` |
| 改变 tick 节奏 | `fstrading.yaml` 的 `tick_interval_sec` |
| 调整车辆/物流 | `rts_logistics.py` + YAML |

---

## 八、与 AI 沟通关键词

| 你想说的 | 关键词 |
|---------|--------|
| 实时推进 | "RTS scheduler, tick-based" |
| 玩家操作排队 | "queue action, apply pending actions" |
| 跨城价格差 | "city price spread, arbitrage" |
| 城市供需 | "pool pressure, target pool" |
| AI 商人 | "AI trader, advanced/chaotic strategy" |
| WebSocket 广播 | "broadcast tick after commit" |

---

## 最后更新

2026-06-14
