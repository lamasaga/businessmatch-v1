# OPS 引擎 SPEC · 生产经营销售赛

> **文档定位**：OPS 技术契约。PRD 定义产品目标，BDD 定义验收行为，本文定义 API、状态、数据结构、工程 Gap 与联调防复发清单；经济模型公式见 [SPEC-OPS-ECONOMY.md](./SPEC-OPS-ECONOMY.md)。
> **对应 PRD**：[PRD-OPS.md](./PRD-OPS.md)
> **对应 BDD**：[BDD-OPS.md](./BDD-OPS.md)
> **最后更新**：2026-06-16

---

## 1. 标识符契约

| 项 | 值 |
|----|----|
| 产品简称 | OPS |
| 引擎 ID | `ops_sim` |
| 配置包 ID | `ops-sim-v1` |
| 后端包 | `webapp/backend/app/games/ops_sim/` |
| 后端 API | `webapp/backend/app/api/ops.py` |
| 前端 slug | `ops-sim` |
| 学生端页面 | `webapp/frontend/src/pages/Games/OpsPlayPage.tsx`、`OpsLobbyPage.tsx` |
| 共享组件 | `webapp/frontend/src/components/ops/` |
| Store | `webapp/frontend/src/stores/opsStore.ts` |
| 运行时 | `react-game` |
| 表前缀 | `ops_` |
| 经济模型 | [SPEC-OPS-ECONOMY.md](./SPEC-OPS-ECONOMY.md) |

---

## 2. 目标 Phase 状态机

| 顺序 | phase | 说明 | 进入条件 |
|------|-------|------|----------|
| 1 | `registration` | 加入/组队 | 创建比赛后 |
| 2 | `positioning` | 产品定位 | 开赛 |
| 3 | `auction_a` | R1 前基础资源拍卖 | 定位全部完成 |
| 4 | `operation_round_1` | R1 | 拍卖 A 结束或跳过 |
| 5 | `operation_round_2` | R2 | R1 结算 |
| 6 | `operation_round_3` | R3 | R2 结算 |
| 7 | `auction_b` | R4 前战略资源拍卖 | R3 结算 |
| 8 | `operation_round_4` | R4 | 拍卖 B 结束或跳过 |
| 9 | `operation_round_5` | R5 | R4 结算 |
| 10 | `operation_round_6` | R6 | R5 结算 |
| 11 | `finished` | 最终结算 | R6 结算 |
| * | `paused` | 正式赛暂停 | 教师暂停 |

### 2.1 当前实现兼容

　　当前首期代码存在 `auction`、`operation_round_1~4`，且只支持 4 轮 + 1 次拍卖。补齐目标时建议：

1. 新增 `auction_a`、`auction_b`，保留 `auction` 作为迁移兼容别名。
2. 新增 `operation_round_5`、`operation_round_6`。
3. `ops_phase` 仍存 `ArenaMatch.config`，写入必须走 `persist_match_config`。
4. `defaults.rounds` 从 4 升为 6。
5. `auction_stages` 写入 YAML，避免硬编码。

---

## 3. API 契约

### 3.1 参赛端

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/ops/events/{event_id}/state` | 参赛者 | 当前队伍视角状态 |
| POST | `/api/v1/ops/events/{event_id}/product-positioning` | 参赛者 | 提交/更新产品定位 |
| POST | `/api/v1/ops/events/{event_id}/decisions` | 参赛者 | 提交当前运营轮决策 |
| POST | `/api/v1/ops/events/{event_id}/auction/bid` | 参赛者 | 拍卖出价 |
| GET | `/api/v1/ops/events/{event_id}/auction/state` | 参赛者 | 拍卖状态 |
| GET | `/api/v1/ops/events/{event_id}/financials` | 参赛者 | 本队财务报表 |
| GET | `/api/v1/ops/events/{event_id}/ranking` | 参赛者 | 排行榜 |
| POST | `/api/v1/ops/events/{event_id}/practice/advance` | 参赛者 | **目标新增**：练习赛无教师推进下一阶段 |

### 3.2 教师端

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/api/v1/ops/events/{event_id}/start` | 教师 | 开赛并初始化队伍状态 |
| POST | `/api/v1/ops/events/{event_id}/advance` | 教师 | 正式赛推进/结算阶段 |
| POST | `/api/v1/ops/events/{event_id}/pause` | 教师 | 暂停 |
| POST | `/api/v1/ops/events/{event_id}/resume` | 教师 | 恢复 |
| GET | `/api/v1/ops/events/{event_id}/screen` | 教师 | 控场/大屏完整数据 |

### 3.3 关键响应规则

　　所有会改变阶段的写操作必须返回：

```json
{
  "phase": "operation_round_1",
  "match_status": "playing"
}
```

　　联调时 HTTP 200 不代表业务通过，必须检查 `phase` 是否符合预期。

---

## 4. Payload 结构

### 4.1 产品定位

```json
{
  "product_name": "智享台灯",
  "category": "home",
  "target_segment": "pragmatic"
}
```

### 4.2 运营决策

```json
{
  "production_quantity": 200,
  "unit_price": 180,
  "marketing_spend": 8000,
  "rnd_spend": 5000,
  "sales_force": 3,
  "target_cities": ["hangzhou", "nanjing"]
}
```

### 4.3 拍卖出价

```json
{
  "amount": 22000
}
```

　　当前代码通过 query 参数接收 `item_id`，后续可整理为 `/auction/items/{item_id}/bid`，但需同步前端和 OpenAPI。

---

## 5. Screen Payload

　　`GET /screen` 是教师控场页和未来大屏页的稳定数据源。即使尚无轮次、排名或队伍状态，也必须返回数组字段而非缺字段。

```json
{
  "match_status": "playing",
  "phase": "operation_round_1",
  "participant_count": 4,
  "room_code": "1234",
  "teams": [],
  "rounds": [],
  "ranking": []
}
```

| 字段 | 类型 | 要求 |
|------|------|------|
| `teams` | array | 必返，空时 `[]` |
| `rounds` | array | 必返，空时 `[]` |
| `ranking` | array | 必返，空时 `[]` |
| `phase` | string | 必返 |
| `match_status` | string | 必返 |
| `participant_count` | number | 必返 |
| `room_code` | string/null | 必返 |

---

## 6. 数据表

| 表 | 用途 | 状态 |
|----|------|------|
| `ops_team_states` | 队伍运行时状态 | 已有 |
| `ops_products` | 产品定位卡 | 已有 |
| `ops_rounds` | 运营轮状态 | 已有；需扩展到 6 轮 |
| `ops_submissions` | 决策提交，含幂等键 | 已有 |
| `ops_snapshots` | 每轮结算快照和财务报表 | 已有 |
| `ops_auction_items` | 拍品 | 已有；需支持 stage/type/theme |
| `ops_auction_bids` | 出价记录 | 已有 |
| `ops_auction_results` | 拍卖结果 | 已有 |

---

## 7. YAML 目标结构

```yaml
defaults:
  rounds: 6
  decision_time_minutes: 20
  practice_ai_count: 3
auction_stages:
  auction_a:
    before_round: 1
    item_pool: basic_operations
  auction_b:
    before_round: 4
    item_pool: strategic_resources
auction_item_pools:
  basic_operations:
    - line_a
    - raw_discount
    - ad_city
  strategic_resources:
    - exclusive_channel
    - strategic_resource
    - brand_endorsement
    - legal_protection
theme_pack:
  id: default
  name: 默认产销运营赛
```

---

## 8. 练习赛无教师推进

### 8.1 目标行为

1. 真人提交当前阶段内容。
2. 系统自动补齐 AI 定位、运营决策或拍卖决策。
3. 页面按钮亮起。
4. 真人点击按钮推进下一阶段。
5. 后端执行一次结算或阶段切换。
6. 响应返回新 `phase`。

### 8.2 禁止行为

- 练习赛依赖教师端 `/advance` 才能继续。
- AI 队未提交导致 phase 卡住。
- POST 返回 200 但不返回阶段信息。
- 前端只看 HTTP status，不检查响应 JSON。

---

## 9. 正式赛倒计时

| 项 | 要求 |
|----|------|
| 运营轮时长 | 默认 20 分钟，可由教师覆盖 |
| 学生端 | 显示倒计时，截止后锁定提交 |
| 教师端 | 可提前截止、延长、暂停、恢复 |
| 后端 | 必须记录当前轮 `opened_at`、`ended_at` 或等价字段 |
| 结算 | 倒计时结束后未提交队伍使用默认决策，教师确认后结算 |

---

## 10. P0 Gap

| # | Gap | 验收 |
|---|-----|------|
| O1 | 4+1 改为 6+2 | BDD Feature 3、4 通过 |
| O2 | 增加 `auction_a` / `auction_b` | 状态机与 YAML 均支持 |
| O3 | 练习赛无教师完整推进 | 单人可从定位玩到 finished |
| O4 | 正式赛 20 分钟倒计时真实生效 | 截止后学生不能提交 |
| O5 | `/screen` payload 稳定 | 空数组字段必返，教师端不黑屏 |
| O6 | 关键 POST 返回 `phase` | 联调可从响应确认业务推进 |
| O7 | OPS 文档与 `03-ENGINEERING.md` 对齐 | 工程快照不再写“待开发” |
| O8 | 主题化与核心结算解耦 | BDD Feature 8 通过 |

---

## 11. 阿思丹类赛程落地约束

　　OPS 参考阿思丹/ABS 类商业模拟活动的赛程形态，但 P0 引擎只实现可自动结算的经营模拟内核。实现时必须把“活动外围环节”和“引擎结算契约”分开。

| 约束 | 技术要求 |
|------|----------|
| 主题化只改展示与结构化参数 | `theme_pack` 可以改名称、文案、新闻和拍品显示名；结算只读取 `type` 与 `effect` |
| 拍品不能靠文案识别 | 禁止通过名称包含“渠道”“代言”等字符串决定效果 |
| P0 排名不依赖人工评分 | 没有路演、答辩、评委评分时，仍按净资产和累计利润完成排名 |
| 外围活动不阻塞练习赛 | 练习赛从 `positioning` 到 `finished` 不需要教师或评委输入 |
| 活动层扩展独立建模 | 路演、案例、交易大会后续作为赛程模块或 assignment，不写进 `ops_rounds` 主状态机 |
| 自动结算优先 | P0 所有关键结果必须可由 DB 状态、配置和提交 payload 复现 |

---

## 12. 防复发清单

| 风险 | 防复发动作 |
|------|------------|
| 前后端字段不一致导致黑屏 | 控场/大屏 payload 写入 SPEC；前端对数组字段使用 `?? []` |
| 练习赛误用正式赛全员提交规则 | `match_kind=practice` 时 AI 自动补齐，并提供参赛端推进 |
| 后端旧进程仍在监听 | 联调前重启 `run.py`；关键响应检查 `phase` |
| JSON config 修改未持久化 | 使用 `persist_match_config` |
| 学生端调用教师接口 | 参赛端只用 state/financials/ranking/auction；教师接口仅控场 |
| 文档状态落后代码 | PRD/BDD/SPEC 与 `03-ENGINEERING.md` 同步更新 |
| 主题文案污染结算 | 拍品效果统一走结构化 `type`/`effect`，主题只负责 labels |
| 把完整线下活动误作 P0 引擎 | 路演/案例/交易谈判不进入 OPS P0 状态机 |

---

*商识唯智 · OPS 引擎 SPEC v2.0*
