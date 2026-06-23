# 工程实现与开发规范

> **定位**：编码任务的唯一事实源——AI_DEFAULT、API/路由全表、赛事引擎规范、开发流程。
> **关联**：`02-ARCHITECTURE.md`（技术架构）· `01-PRODUCT.md`（产品定义）
> **最后更新**：2026-06-23
> **关联决策**：`docs/decisions/011-npc-role-ip-and-multi-facet.md` · `docs/decisions/013-per-engine-identity.md`

---

## AI_DEFAULT · 工程快照

编码任务**默认只读本节**（约 80 行）。深读按需进入后续章节。

| 项 | 说明 |
|----|------|
| 代码根 | `webapp/backend`、`webapp/frontend`、`organizer-frontend` (:5174) |
| 演示账号 | `student/student123`、`admin/admin123` |
| 体验营手测 | :5174 建营团(6位码) → :5173 入营 → 营内建赛(4位房间码) → 控场 |
| 最强闭环 | 教师端建赛 → 房间码 → 交易/TechVenture/OPS 首期 → XP |
| API 字段级 | `webapp/contracts/openapi/bundled.yaml` 或 DEBUG `/openapi.json` |
| 默认 Phase | **Phase A**（商赛引擎闭环）；未指定时不抢跑 World/OPC |

### 功能矩阵

| 模块 | 后端 | 前端 | 成熟度 |
|------|------|------|--------|
| 认证 | ✅ | ✅ | 生产雏形 |
| 生涯中枢 `/career` | `xp_events` ✅ / `users.gold,diamond` 新增 | UI+mock | **Phase A 收尾项** |
| 商赛大厅 `/games` | ✅ | ✅ | 可用 |
| 浮生记 RTS | ✅ WS | ✅ 全屏 | **当前主力** |
| TechVenture | ✅ | ✅ 全屏·无地图 | 四端控场 |
| OPS 产销运营 | ✅ 6+2 基础 | ✅ 6+2 基础 | 经济模型、双拍卖、无教师练习推进已落地；正式赛倒计时需端到端深测 |
| 教师端 :5174 | ✅ | ✅ | 独立端（目录 `organizer-frontend`） |
| 体验营营团 P1 | ✅ | 🟡 | 营团+赛季编排 |
| 赛事工坊 `/sandbox` | ✅ | ✅ | 内存会话·热 YAML |
| OPC `/opc/*` | ✅ CRUD | ✅ | 数据层，无 Agent |
| Wiki/课程 | ✅ | ✅ | 可用 |

### P0 Bug

| # | 问题 | 关联 | 状态 |
|---|------|------|------|
| E1 | 生涯页与登录 XP 脱节 | Career 读账本 + `GET /career/profile` | ✅ 已修复 |
| E2 | 生涯域不完整，缺聚合 API | 新建 `api/career.py` | ✅ 已修复 |
| E3 | 房间码加入后可能无法跳转大厅 | 前端路由 bug | 🟡 待复测 |
| E4 | DB 依赖 lifespan 初始化 | 架构债 | 🔴 B4 前评估 |
| E5 | 正式赛结束与 debrief 未打通 | Hermes-Debrief 规则模板 | 🔴 B3 实现 |
| E6 | OPS 6+2 重写后端到端复测不足 | 正式赛倒计时、教师控场、练习赛全流程浏览器验证 | 🟡 P0 复测 |

### 对齐度

| 组件 | 对齐度 | 说明 |
|------|--------|------|
| Arena | 🟢 88% | 正式赛、练习赛、RTS、营团均可用；OPS 首期已接入 |
| Career Hub | 🟢 85% | `xp_events` + `users.gold/diamond` + `career_profiles` + `api/career.py` + 前端对接已完成；家园/成就仍 mock |
| OPC | 🟡 45% | CRUD + 前端 UI，无 Agent |
| Hermes/Tyche/Rival | 🔴 15～25% | 规则占位，B3 起规则模板 |
| Credenti | 🔴 20% | 前端 mock，无后端表 |

---

## 一、后端 API 全表

所有路由挂载在 `app/main.py` 的 `/api/v1` 下。

| 模块 | 前缀 | 主人域 | 状态 |
|------|------|--------|------|
| auth | `/auth` | identity | ✅ |
| wiki | `/wiki` | atlas | ✅ |
| courses | `/courses` | academy | 种子数据 |
| opc | `/opc` | opc | ✅ |
| organizer | `/organizer` | arena | ✅ |
| teaching_groups | `/teaching-groups` | arena | ✅ |
| seasons | `/seasons` | arena | 🟡 |
| assignments | `/assignments` | arena | 🟡 |
| competitions | `/competitions` | arena | ✅ |
| trading | `/trading` | games/trading | ✅ RTS-only |
| trading_ws | `/trading` | games/trading | ✅ WebSocket |
| practice | `/practice` | arena+cybercore | ✅ |
| techventure | `/techventure` | games/techventure | ✅ |
| techventure_admin | `/techventure` | arena | ✅ |
| ops | `/ops` | games/ops_sim | 🟡 6+2 基础落地 |
| sandbox | `/sandbox` | sandbox+cybercore | 🟡 |
| camp_groups | `/camp-groups` | arena | 🟡 |
| camp_summer | `/camp-summer` | arena | 🟡 |
| engine_callbacks | `/engine-callbacks` | arena | ✅ |
| career | `/career` | career | 🟡 Phase A 收尾 |

**新增路由须同步**：`main.py` + 本表 + `02-ARCHITECTURE.md` 域表。

---

## 二、前端路由全表

### 学生端 (:5173)

| 路由 | 页面 | 状态 |
|------|------|------|
| `/` | 首页 / 登录 | ✅ |
| `/career` | 生涯中枢 | UI+mock |
| `/career/start` | 生涯开局 | ✅ |
| `/career/debrief/:id` | 赛后复盘 | UI+mock |
| `/games` | 商赛大厅 | ✅ |
| `/games/:id/play` | FStrading 局内（Phaser3） | ✅ |
| `/games/:id/techventure` | TechVenture 局内 | ✅ |
| `/games/:id/ops` | OPS 局内 | 🟡 6+2 基础 |
| `/wiki` | 知识图谱 | ✅ |
| `/courses` | 课程学院 | ✅ |
| `/activities` | 日常活动（Quest） | ✅ |
| `/achievements` | 成就中心 | mock |
| `/opc/*` | 一人公司 | ✅ |
| `/sandbox` | 赛事工坊 | ✅ |
| `/camp` | 体验营入营 | ✅ |
| `/showcase` | 新手指引 | ✅ |

### 教师端 (:5174)

| 路由 | 页面 |
|------|------|
| `/` | 登录 |
| `/dashboard` | 控制台 |
| `/teaching-groups` | 营团管理 |
| `/seasons` | 赛季编排 |
| `/competitions` | 比赛控场 |
| `/techventure/admin/:id` | TechVenture 控场 |
| `/ops/:id/control` | OPS 控场 / screen payload |

---

## 三、状态管理与 Store

| Store | 用途 | 持久化 |
|-------|------|--------|
| `authStore` | 登录态、用户信息 | localStorage |
| `careerStore` | 生涯数据、XP、等级 | localStorage |
| `competitionStore` | 当前比赛状态 | — |
| `tradingStore` | FStrading 局内状态 | — |
| `techventureStore` | TechVenture 局内状态 | — |
| `opsStore` | OPS 局内状态 | — |
| `campStore` | 营团、赛季 | — |
| `sandboxStore` | 赛事工坊 | — |
| `opcStore` | 一人公司 | — |

---

## 四、六引擎产品矩阵

| # | 引擎 ID | 产品名 | 状态 | `game_config_id` |
|---|---------|--------|------|------------------|
| 1 | **trading** | 浮生记（贸易） | ✅ 已搭建：RTS 即时制 | `fstrading` |
| 2 | **techventure** | TechVenture（创投） | ✅ 已搭建：队伍策略四端 | `techventure-v1` |
| 3 | **ops_sim** | OPS 产销运营赛 | 🟡 6+2 基础落地：经济模型、双拍卖、练习推进已实现，正式赛需深测 | `ops-sim-v1` |
| 4 | **finance-lab** | 金融投研实验室 | 🟡 方向已定：投研/交易模拟 | `finance-lab-v1` |
| 5 | **engine5** | 引擎五 | ⚪ 占位 | `engine5-v1` |
| 6 | **engine6** | 引擎六 | ⚪ 占位 | `engine6-v1` |

---

## 五、赛事引擎开发规范

> **深读**：[`02-ARCHITECTURE.md`](./02-ARCHITECTURE.md) §三 · [`docs/ENGINE.md`](./docs/ENGINE.md)

### 5.1 前端技术栈（按运行时选型）

　　`game-config.yaml` 声明 `meta.runtime`；Game Shell 按引擎加载对应运行时（见 [`00-PROJECT.md`](./00-PROJECT.md) §对局前端技术路线）。

| 运行时 | 适用引擎 | 技术 |
|--------|----------|------|
| `phaser` | trading（浮生记 RTS）等地图/空间/实时移动引擎 | **Phaser 3** Canvas + React HUD overlay |
| `react-game` | techventure、ops_sim、finance-lab 等策略/面板引擎 | **React 全屏** + `game-ui` 组件库 |

**目录**：`webapp/frontend/src/games/<engine-id>/`

#### 5.1.1 引擎独立视觉与交互身份

每个赛事引擎被视为独立的「游戏」，拥有独立的 design tokens、配色、UI 布局、音效与动效。除非 PRD 或代码注释中显式声明「参考 XXX 引擎」，否则禁止默认复用其他引擎的视觉资产。平台级共享组件（Toast、Loading、AnimatedNumber 等）必须保持中性，不夹带特定引擎的主题假设。详见 **ADR-013**。
```
games/<engine-id>/
├── scenes/                 # Phaser 场景（phaser）或占位（react-game）
├── components/             # React UI 组件
├── hooks/                  # 游戏逻辑 hooks
├── assets/                 # 引擎专属素材
└── index.tsx               # Game Shell 挂载点
```

**共享**：`game-ui` 组件库、Game Shell（加载/错误边界）、Zustand store / WebSocket 数据流。

### 5.2 引擎分层

```
引擎（engine）          → app/games/<engine>/  结算内核
  ↓
配置包（game_config_id） → content/game-configs/*.yaml
  ↓
场次（match）           → 运行时状态，每局隔离
```

### 5.3 引擎调用模式（平台 ↔ 引擎）

当前 Phase A/B 默认采用同仓同进程调用：平台 API 读取 `game_config_id`，直接调用 `app/games/<engine>/` 内核与 DB 编排。独立引擎匣子 HTTP 协议已归档为远期预研，不作为默认开发契约。

| 模式 | 说明 |
|------|------|
| 同进程调用 | `api/practice.py`、`api/*_admin.py`、`api/ops.py` 直接导入 `games/<engine>/` |
| 域事件/服务调用 | 比赛结束后通过 Career 服务结算奖励 |
| 远期独立服务 | 仅保留在 `docs/archive/引擎匣子对接测试指南.md`，Phase C+ 再评估 |

**回调**：默认不走 HTTP 回调；如需跨域通知，优先使用域事件或服务函数。

### 5.4 引擎元数据（config.yaml）

```yaml
engine_id: techventure
version: "1.0.0"
name: 创想大赢家
supported_modes: [practice, official]
capabilities:
  team_mode: true
  admin_control: true
  screen_projection: true
  judge_panel: true
  round_based: true
  rts: false
```

### 5.5 新增赛制 Checklist

1. 新增 `content/game-configs/<id>.yaml`（含 `meta.runtime`）
2. 若无现成引擎：新增 `app/games/<engine>/`
3. 练习入口：`app/api/practice.py` 指定默认 `game_config_id`
4. 前端：在 `webapp/frontend/src/games/<engine-id>/` 按 `runtime` 实现局内页
5. 正式入口：教师端创建比赛可选该 `game_config_id`
6. 不改 Arena 表结构（除非通用字段扩展）

---

## 六、开发流程

### 5.1 竖切交付

每 2～3 周交付一条端到端可演示的功能链：建赛 → 加入 → 打完 → 生涯入账。

### 5.2 契约先行

先定义 API/事件契约，再写实现代码。

### 5.3 AI 编程上下文注入

| 层 | 读什么 | 预算 |
|----|--------|------|
| **T0** | `CLAUDE.md` + `.cursor/rules/` | ≤4k |
| **T1** | 本节 AI_DEFAULT + 任务包 1～2 份 | ≤12k |
| **T2** | 本文件全表、inspire 长文 | 按需 grep |

**禁止**默认全文 attach 本文件或 inspire 长文。

### 5.4 推送纪律

大型更新推送 GitHub 前，对齐 `01`～`04` 与代码；更新日期；确保无矛盾。

---

## 七、编码铁律

1. **单库单进程** — 禁止第二套 SQLite/API
2. **域边界** — 跨域只经 API 或域事件
3. **新赛制** — `game-configs/*.yaml` + `games/<engine>/`；禁止克隆整文件
4. **RTS** — 仅调度器推进 tick；HTTP 只读
5. **XP** — `grant_xp` / `settle_match_rewards`；幂等
6. **双前端** — 学生端/教师端分离；新功能接 API，不扩 mock
7. **Phase 门控默认** — 未明确要求时，不建 World 域表、OPC LangGraph；参考 `04-ROADMAP.md` §八

---

*商识唯智 · 工程实现 v2.0*
