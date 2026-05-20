# 浮生记 RTS v2 — 实施计划（已确认版）

> 配置草稿：`trading-v2-rts.yaml` · 与 v1 并存，`game_config_id` 选择赛制

---

## 一、目标摘要

| 项 | 方案 |
|----|------|
| 时间模型 | 5s/tick 即时战略；**组织者选时长三档** |
| 经济 | 城市池产出/消费 + ask/bid，非纯倒卖 |
| 商品 | 8 品（见第二节） |
| 仓储 | 基础 99 格 + 车辆加成；**最多 3 辆车** |
| 车辆 | 小货车 / 大卡车；**容量 + 速度** |
| 移动 | 2～6 tick 基准，车辆减 tick |
| 定价 | 同城 ask 买、bid 卖，硬 min_spread，池吸收上限 |

---

## 二、商品与供需（已定稿）

| id | 名称 | 体积 | 产业链 | 主策略方向 |
|----|------|------|--------|------------|
| `grain` | 粮食 | 1 | 上游 | 蓉城等产出 → 运至京城等高消费城 |
| `produce` | 生鲜 | 1 | 上游 | 同上，波动略大（`spoil_pressure`） |
| `raw_materials` | 原材料 | 4 | 上游 | 冰城产出 → 深市制造消耗 |
| `energy` | 能源 | 4 | 上游 | **冰城/港城产出** → 重工与汽车城消耗（填补投入品缺口） |
| `furniture` | 家具 | 4 | 中游 | 冰城产出 → 政治/金融城需求 |
| `textile` | 纺织品 | 4 | 中游 | 沪/蓉供给 → 全国日消 |
| `daily_goods` | 日用品 | 2 | 下游 | **工业城（冰城）主产** → 全国 mass 消费 |
| `appliances` | 家电 | 6 | 下游 | **科技+工业（深市+冰城/港城）** → 京城/沪需求 |
| `passenger_car` | 家用车 | 8 | 下游 | **冰城总装+深市零部件** → 京城/沪/港高需求 |
| `luxury` | 奢侈品 | 2 | 下游 | 产地少，京城/沪高 `demand_profile` |

**供需原则**

- 农业城：`production(grain, produce) >> consumption` → 本地 bid 偏低，外运有利。
- 工业城：原材料/家具/日用品供给过剩于本地 → 日用品外运、原材料供深市。
- 科技城：家电高产出、原材料高消耗 → 运原材料入、运家电出。
- 政治/金融城：奢侈品/家电/日用品高消费、低产出 → ask 长期偏高。

---

## 三、车辆（已定稿）

| 车型 | 仓储加成 | 速度加成 | 价格 |
|------|----------|----------|------|
| 小货车 `van` | +18 格 | −1 tick | 7,500 |
| 大卡车 `truck` | +42 格 | −2 tick | 22,000 |

**规则**

- 每位玩家 **最多购置 3 辆**（可混配，如 2 小 1 大）。
- `storage_capacity = 99 + Σ capacity_bonus`
- `effective_travel = max(min_travel_ticks, base_travel_ticks − Σ speed_bonus)`，`min_travel_ticks = 2`
- 车辆不占仓储格（实现简单；若需可后续改为占 4 格）。

---

## 四、比赛时长 — 组织者可选三档（新增）

### 4.1 预设档位（默认）

| preset | 展示名 | 墙钟 | tick 数（5s/tick） |
|--------|--------|------|---------------------|
| `short` | 快速局 | **8 分钟** | 96 |
| `standard` | 标准局 | **10 分钟** | 120（**默认**） |
| `long` | 完整局 | **12 分钟** | 144 |

另：`warmup_ticks: 6`（30s 热身，可交易/移动规则与正赛一致或仅浏览，实现时二选一）。

### 4.2 组织者如何指定

创建正式赛时，在 `config_overrides`（或 `event.config`）写入：

```json
{
  "duration_preset": "standard",
  "game_config_id": "trading-v2-rts"
}
```

- 后端：`match_factory` 合并 YAML `defaults` + overrides → 解析 `total_ticks`、`tick_interval_sec`。
- 引擎：`tick >= total_ticks` → `phase: ending` → 结算；组织者端可提前 **结束**（不变）。
- **未传** `duration_preset` 时回退 **`standard`（10 分钟）**。
- 练习局：默认 `standard`；API 可允许 `duration_preset` 覆盖（与正式赛同一枚举）。

### 4.3 组织者端 UI（P5）

`CreateEventPage` 在 `game_config_id === trading-v2-rts` 时：

- 将「回合数」改为 **单选三档**：8 / 10 / 12 分钟。
- 提交 `config: { duration_preset: "short" | "standard" | "long" }`。
- 控场页显示：**剩余 tick / 剩余时间**。

### 4.4 API 扩展（建议）

| 接口 | 说明 |
|------|------|
| `GET /api/v1/cybercore/game-configs/trading-v2-rts` | 返回 `duration_presets` 供前端渲染 |
| `POST /competitions` | 已有 `config` 字段，增加校验 preset 合法性 |

---

## 五、Tick 与定价（摘要）

每 tick：`产出 − 消费 − 玩家净买入 + 玩家净卖出` → 更新 `pool` → `ask/bid`。

- 买入结算价 = **ask**；卖出 = **bid**。
- `bid ≤ ask × (1 − min_spread)`，`min_spread ≥ 0.08`。
- 同 tick 同城：**先 ask 买再 bid 卖** 单笔必亏（自动化测试项）。
- 卖出量 ≤ `absorption_cap_per_tick`。

---

## 六、分阶段实施（更新）

| 阶段 | 交付 | 备注 |
|------|------|------|
| P0 | `trading-v2-rts.yaml` + 本文档 | ✅ 设计冻结 |
| P1 | tick 循环 + WS + `duration_preset` 解析 | 三档时长可跑满一局 |
| P2 | 池 + ask/bid | 同城无套利单测 |
| P3 | 体积 + 车辆（≤3）+ 在途移动 | 速度叠加 |
| P4 | RTS 前端 + 组织者创建三档 | 替换回合 UI |
| P5 | 练习 AI + 正式赛 | v1/v2 配置并存 |
| P6 | 平衡调参 + `02-`/`08-` 文档 | |

---

## 七、待实现检查清单

- [x] `duration_preset` 合并进 `merged_match_config`
- [x] RTS 引擎 `total_ticks` 终局结算
- [x] 组织者创建页三档单选
- [x] 8 品体积与 6 城 production/consumption 与 YAML 一致
- [x] 车辆 ≤3、速度/容量叠加
- [x] 同城买卖无利润单测（`tests/test_rts_pricing.py`）

---

## 八点五、练习局 AI 两档（已实现）

| 档位 | `ai_level` | 行为概要 |
|------|------------|----------|
| 低 | `chaotic` | 高随机买卖/移动；约 20% 故意贵买贱卖；购车随意 |
| 高 | `advanced` | 最高 bid 城出货；跨城 ask→bid 套利；产地 surplus 采购；仓储紧时购车 |

默认 `practice_ai_slots`: `[chaotic, advanced, advanced]`，与三名 bot 顺序对应。API 可通过 `PracticeStartRequest.practice_ai_slots` 覆盖。

---

## 八、与 v1 兼容

- `trading-v1` 保留回合制；新教学/赛事实验用 `trading-v2-rts`。
- 组织者未升级前端前，可仅在后端 overrides 传 `duration_preset`。
