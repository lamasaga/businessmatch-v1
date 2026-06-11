# CODE_MAP.md — 商识唯智 · 功能到文件速查

> **最后更新**：2026-06-07
> **维护纪律**：新增/删除/重命名文件后须同步更新本文件（`docs-align-before-push.mdc` 强制）。
> **使用方式**：按功能域查表 → 拿到文件路径和关键符号 → 直接跳转。

---

## 目录

- [0. 约定](#0-约定)
- [1. 后端入口与基础设施](#1-后端入口与基础设施)
- [2. Arena 域（比赛生命周期）](#2-arena-域比赛生命周期)
- [3. 赛事引擎](#3-赛事引擎)
  - [3.1 FST / 浮生记 / trading](#31-fst--浮生记--trading)
  - [3.2 TECH / 创想大赢家 / techventure](#32-tech--创想大赢家--techventure)
  - [3.3 OPS / 生产经营销售 / ops_sim](#33-ops--生产经营销售--ops_sim)
  - [3.4 FIN / 金融投资 / finance_lab](#34-fin--金融投资--finance_lab)
  - [3.5 ENI5 / ENI6（占位引擎）](#35-eni5--eni6占位引擎)
- [4. Career 域（生涯系统）](#4-career-域生涯系统)
- [5. Identity / 用户系统](#5-identity--用户系统)
- [6. OPC / 一人公司](#6-opc--一人公司)
- [7. Sandbox / 沙盒](#7-sandbox--沙盒)
- [8. 前端 — 学生端](#8-前端--学生端)
  - [8.1 入口与路由](#81-入口与路由)
  - [8.2 状态管理（Zustand）](#82-状态管理zustand)
  - [8.3 FST 前端](#83-fst-前端)
  - [8.4 TECH 前端](#84-tech-前端)
  - [8.5 通用页面与组件](#85-通用页面与组件)
- [9. 前端 — 组织者端](#9-前端--组织者端)
- [10. 配置与数据](#10-配置与数据)
- [11. PRD / 文档](#11-prd--文档)

---

## 0. 约定

| 标记 | 含义 |
|------|------|
| ✅ | 已实现且稳定 |
| 🟡 | 部分实现 / 占位 / 待接入 |
| 🔴 | 规划中，尚未实现 |
| `→` | 别名 / 快捷指向 |

**路径简写**：
- `B/` = `webapp/backend/app/`
- `F/` = `webapp/frontend/src/`
- `O/` = `webapp/organizer-frontend/src/`
- `C/` = `content/game-configs/`

---

## 1. 后端入口与基础设施

| 功能 | 文件 | 关键符号 | 状态 |
|------|------|----------|------|
| FastAPI 应用入口 | `B/main.py` | `app = FastAPI(...)`, 所有 `include_router` | ✅ |
| 应用配置 | `B/core/config.py` | `get_settings()`, `Settings` | ✅ |
| 依赖注入（当前用户） | `B/core/dependencies.py` | `get_current_active_user` | ✅ |
| 统一响应封装 | `B/core/response.py` | `ApiResponse`, `BusinessException`, `ErrorCode` | ✅ |
| 安全（密码/JWT） | `B/core/security.py` | `get_password_hash`, `create_access_token` | ✅ |
| 请求日志中间件 | `B/core/middleware.py` | `RequestLoggingMiddleware` | ✅ |
| 引擎 HTTP 客户端 | `B/core/engine_client.py` | — | 🟡 |
| 数据库引擎 | `B/db/database.py` | `Base`, `engine`, `SessionLocal`, `get_db` | ✅ |
| 数据库初始化 | `B/db/init_db.py` | `init_all()` — 导入所有模型并建表 | ✅ |
| 轻量迁移 | `B/db/migrate_schema.py` | `run_migrations()` | ✅ |

---

## 2. Arena 域（比赛生命周期）

> 架构文档：`B/domains/arena/ARCHITECTURE.md`

### 2.1 模型

| 功能 | 文件 | 类 | 状态 |
|------|------|-----|------|
| 比赛场次 | `B/domains/arena/models/match.py` | `ArenaMatch` | ✅ |
| 参赛队伍 | `B/domains/arena/models/team.py` | `ArenaTeam` | ✅ |
| 参赛者 | `B/domains/arena/models/participant.py` | `ArenaParticipant` | ✅ |
| 组织者资料 | `B/domains/arena/models/organizer.py` | `OrganizerProfile` | ✅ |
| 教学群组 | `B/domains/arena/models/teaching_group.py` | `TeachingGroup`, `GroupMembership` | ✅ |
| 赛季 | `B/domains/arena/models/season.py` | `Season`, `SeasonMilestone` | ✅ |
| 营团分组 | `B/domains/arena/models/camp_group.py` | `CampGroup`, `CampGroupMember` | ✅ |
| 作业任务 | `B/domains/arena/models/assignment.py` | `Assignment`, `AssignmentSubmission` | ✅ |
| 公告 | `B/domains/arena/models/announcement.py` | `CampAnnouncement` | ✅ |
| 夏令营 | `B/domains/arena/models/camp_summer.py` | `CampAgendaItem`, `CampTask`, `ScoringDimension`, `TaskSubmission`, `SubmissionReview`, `CampCoinBalance`, `CampCoinTransaction`, `CampCoinRule`, `CampShopItem`, `CampAward`, `AwardWinner` | ✅ |
| 枚举 | `B/domains/arena/enums.py` | `MatchStatus`, `MatchKind`, `DesignMode` | ✅ |
| 群组枚举 | `B/domains/arena/enums_group.py` | — | ✅ |
| 序列化 | `B/domains/arena/serializers.py` | — | ✅ |

### 2.2 服务

| 功能 | 文件 | 关键符号 | 状态 |
|------|------|----------|------|
| 比赛创建 | `B/domains/arena/services/match_factory.py` | — | ✅ |
| 生命周期 | `B/domains/arena/services/match_lifecycle.py` | — | ✅ |
| 教学群组 | `B/domains/arena/services/teaching_group_service.py` | — | ✅ |
| 配置 JSON | `B/domains/arena/config_json.py` | — | ✅ |

### 2.3 API 路由

| 功能 | 文件 | 路由前缀 | 状态 |
|------|------|----------|------ |
| 比赛管理 | `B/api/competitions.py` | `/api/v1/competitions` | ✅ |
| 组织者 | `B/api/organizer.py` | `/api/v1/organizer` | ✅ |
| 练习赛 | `B/api/practice.py` | `/api/v1/practice` | ✅ |
| 教学群组 | `B/api/teaching_groups.py` | `/api/v1/teaching-groups` | ✅ |
| 赛季 | `B/api/seasons.py` | `/api/v1/seasons` | ✅ |
| 营团分组 | `B/api/camp_groups.py` | `/api/v1/camp-groups` | ✅ |
| 作业 | `B/api/assignments.py` | `/api/v1/assignments` | ✅ |
| 夏令营 | `B/api/camp_summer.py` | `/api/v1/camp-summer` | ✅ |
| 引擎回调 | `B/api/engine_callbacks.py` | `/api/v1/engine-callbacks` | 🟡 |

---

## 3. 赛事引擎

### 3.1 FST / 浮生记 / trading

> PRD：`docs/prd/PRD-FST.md`
> 配置：`B/../content/game-configs/fstrading.yaml`

| 功能 | 文件 | 关键符号 | 状态 |
|------|------|----------|------|
| **模型** | `B/games/trading/models.py` | `TradingRound`, `TradingDecision`, `TradingPrice` | ✅ |
| **Tick 推进** | `B/games/trading/rts_tick.py` | `advance_one_tick()`, `_finish_rts_match()` | ✅ |
| **调度器** | `B/games/trading/rts_scheduler.py` | `RtsScheduler`, `maybe_advance_rts()` | ✅ |
| **定价** | `B/games/trading/rts_pricing.py` | `build_price_snapshot()` | ✅ |
| **Action 执行** | `B/games/trading/rts_actions.py` | `apply_pending_actions()` | ✅ |
| **物流/仓储** | `B/games/trading/rts_logistics.py` | `advance_transits()` | ✅ |
| **AI 入口** | `B/games/trading/rts_ai.py` | `enqueue_ai_actions()` | ✅ |
| **AI 策略** | `B/games/trading/rts_ai_levels.py` | `chaotic`, `advanced` | ✅ |
| **运行时状态** | `B/games/trading/rts_state.py` | — | ✅ |
| **WebSocket** | `B/games/trading/rts_ws.py` | `RtsWsHub`, `hub` | ✅ |
| **配置加载** | `B/games/trading/config_loader.py` | — | ✅ |
| **常量** | `B/games/trading/constants.py` | — | ✅ |
| **市场** | `B/games/trading/market.py` | — | ✅ |
| **库存** | `B/games/trading/inventory.py` | — | ✅ |
| **世界切片** | `B/games/trading/world_slice.py` | — | ✅ |
| **回合展示** | `B/games/trading/round_presenter.py` | — | ✅ |
| **API 辅助** | `B/games/trading/rts_api_helpers.py` | — | ✅ |
| **枚举** | `B/games/trading/enums.py` | — | ✅ |
| **Bot 用户** | `B/games/trading/bot_users.py` | `ensure_bot_traders()` | ✅ |
| **参赛端 API** | `B/api/trading.py` | `/api/v1/trading` | ✅ |
| **RTS 处理** | `B/api/trading_rts_handlers.py` | — | ✅ |
| **WS 路由** | `B/api/trading_ws.py` | `/api/v1/trading/events/{id}/ws` | ✅ |
| 兼容模型 | `B/models/trading_competition.py` | — | ✅ |

### 3.2 TECH / 创想大赢家 / techventure

> PRD：`docs/prd/PRD-TECH.md`
> 配置：`B/../content/game-configs/techventure-v1.yaml`

| 功能 | 文件 | 关键符号 | 状态 |
|------|------|----------|------|
| **结算引擎 v6.0** | `B/games/techventure/v6_engine.py` | `settle_round(ctx, config_id)` | ✅ |
| **DB 编排** | `B/games/techventure/settle.py` | `settle_tv_round(db, match, tv_round)` | ✅ |
| **配置读取** | `B/games/techventure/config.py` | `get_cfg()`, `growth_rate()`, `softmax()`, `tech_i_eff()`, `pathfinder_m_crowd()` | ✅ |
| **模型** | `B/games/techventure/models.py` | `TvTeamState`, `TvRound`, `TvSubmission`, `TvSnapshot`, `TvNews` | ✅ |
| **枚举** | `B/games/techventure/enums.py` | `StrategyRoute`, `TvRoundStatus`, `TvEventId`, `TvNewsKind` | ✅ |
| **AI 决策** | `B/games/techventure/ai_team.py` | `generate_ai_decision(state, round_no)` | ✅ |
| **练习赛推进** | `B/games/techventure/practice_flow.py` | `run_ai_decisions_and_settle(db, match, tv_round)` | ✅ |
| **参赛端 API** | `B/api/techventure.py` | `/api/v1/techventure` | ✅ |
| **组织端 API** | `B/api/techventure_admin.py` | `/api/v1/techventure/admin` | ✅ |

### 3.3 OPS / 生产经营销售 / ops_sim

> PRD：`docs/prd/PRD-OPS.md`
> 配置：`B/../content/game-configs/ops-sim-v1.yaml`（规划中）

| 功能 | 文件 | 关键符号 | 状态 |
|------|------|----------|------|
| **结算引擎** | `B/games/ops_sim/engine.py` | `settle_round()` | 🔴 |
| **模型** | `B/games/ops_sim/models.py` | — | 🔴 |
| **AI** | `B/games/ops_sim/ai.py` | — | 🔴 |
| **配置** | `B/games/ops_sim/config.py` | — | 🔴 |
| **前端占位** | `F/games/ops-sim/` | `index.tsx`, `GameHUD.tsx`, `useGameState.ts`, `GameScene.ts` | 🟡 |

### 3.4 FIN / 金融投资 / finance_lab

> PRD：`docs/prd/PRD-FIN.md`（规划中）

| 功能 | 文件 | 关键符号 | 状态 |
|------|------|----------|------|
| **结算引擎** | `B/games/finance_lab/engine.py` | — | 🔴 |
| **模型** | `B/games/finance_lab/models.py` | — | 🔴 |
| **AI** | `B/games/finance_lab/ai.py` | — | 🔴 |
| **配置** | `B/games/finance_lab/config.py` | — | 🔴 |
| **前端占位** | `F/games/finance-lab/` | `index.tsx`, `GameHUD.tsx`, `useGameState.ts`, `GameScene.ts` | 🟡 |

### 3.5 ENI5 / ENI6（占位引擎）

| 功能 | 文件 | 状态 |
|------|------|------|
| **引擎五** | `B/games/engine5/` (`engine.py`, `models.py`, `ai.py`, `config.py`) | 🟡 占位 |
| **引擎六** | `B/games/engine6/` (`engine.py`, `models.py`, `ai.py`, `config.py`) | 🟡 占位 |
| **前端占位 ENI5** | `F/games/engine5/` | 🟡 占位 |
| **前端占位 ENI6** | `F/games/engine6/` | 🟡 占位 |

---

## 4. Career 域（生涯系统）

> 设计文档：`B/domains/career/DESIGN.md`

| 功能 | 文件 | 关键符号 | 状态 |
|------|------|----------|------|
| **XP 事件模型** | `B/domains/career/models/xp_event.py` | `XpEvent` | ✅ |
| **生涯档案模型** | `B/domains/career/models/career_profile.py` | `CareerProfile` | 🟡 |
| **奖励结算** | `B/domains/career/services/rewards.py` | `settle_match_rewards()`, `grant_xp()` | ✅ |
| **Career API** | `B/api/career.py` | `/api/v1/career` | 🟡 |

---

## 5. Identity / 用户系统

| 功能 | 文件 | 关键符号 | 状态 |
|------|------|----------|------|
| **用户模型** | `B/models/user.py` | `User`, `UserRole` | ✅ |
| **认证路由** | `B/api/auth.py` | `/api/v1/auth`（登录/注册/JWT） | ✅ |
| **Wiki 路由** | `B/api/wiki.py` | `/api/v1/wiki` | ✅ |
| **课程路由** | `B/api/courses.py` | `/api/v1/courses` | 🟡 |

---

## 6. OPC / 一人公司

| 功能 | 文件 | 关键符号 | 状态 |
|------|------|----------|------|
| **OPC 模型** | `B/models/opc.py` | `OneCompany`, `AIEmployee`, `AITask` | 🟡 |
| **OPC API** | `B/api/opc.py` | `/api/v1/opc` | 🟡 |
| **前端页面** | `F/pages/OPC/` | `OPCPage.tsx`, `BMCPage.tsx`, `MissionControlPage.tsx`, `TalentMarketPage.tsx`, `EmployeeDetailPage.tsx` | 🟡 |
| **前端 Store** | `F/stores/opcStore.ts` | — | 🟡 |

---

## 7. Sandbox / 沙盒

| 功能 | 文件 | 关键符号 | 状态 |
|------|------|----------|------|
| **沙盒模型** | `B/domains/sandbox/models.py` | — | 🟡 |
| **沙盒 API** | `B/domains/sandbox/api.py` | `/api/v1/sandbox` | 🟡 |
| **AI 引擎** | `B/domains/sandbox/services/ai_engine.py` | — | 🟡 |
| **调试器** | `B/domains/sandbox/services/debugger.py` | — | 🟡 |
| **市场模拟** | `B/domains/sandbox/services/market_sim.py` | — | 🟡 |
| **运行器** | `B/domains/sandbox/services/runner.py` | — | 🟡 |
| **热配置** | `B/domains/sandbox/services/hot_config.py` | — | 🟡 |
| **前端页面** | `F/pages/Sandbox/SandboxPage.tsx` | — | 🟡 |
| **前端 Store** | `F/stores/sandboxStore.ts` | — | 🟡 |

---

## 8. 前端 — 学生端

> 入口：`F/main.tsx` → `F/App.tsx`
> API 客户端：`F/lib/api.ts`

### 8.1 入口与路由

| 功能 | 文件 | 说明 | 状态 |
|------|------|------|------|
| **路由总表** | `F/App.tsx` | 所有 `<Route>` 定义 | ✅ |
| **入口挂载** | `F/main.tsx` | ReactDOM.createRoot | ✅ |

### 8.2 状态管理（Zustand）

| 功能 | 文件 | 说明 | 状态 |
|------|------|------|------|
| **认证** | `F/stores/authStore.ts` | 登录态、用户信息（持久化） | ✅ |
| **Career** | `F/stores/careerStore.ts` | 生涯数据、XP（持久化） | ✅ |
| **赛事大厅** | `F/stores/competitionStore.ts` | 比赛列表、加入逻辑 | ✅ |
| **FST 交易** | `F/stores/tradingStore.ts` | RTS 状态、WS 连接 | ✅ |
| **TECH** | `F/stores/techventureStore.ts` | 回合状态、提交、排行榜 | ✅ |
| **OPC** | `F/stores/opcStore.ts` | — | 🟡 |
| **营团** | `F/stores/campStore.ts` | — | 🟡 |
| **沙盒** | `F/stores/sandboxStore.ts` | — | 🟡 |

### 8.3 FST 前端

| 功能 | 文件 | 说明 | 状态 |
|------|------|------|------|
| **对局页面容器** | `F/pages/Games/TradingGamePage.tsx` | WS 连接、轮询管理 | ✅ |
| **核心对局 UI** | `F/pages/Games/TradingRTSView.tsx` | 买卖/移动/购车面板 | ✅ |
| **SVG 地图** | `F/components/fushengji/FushengjiMapStage.tsx` | 城市节点与路网 | ✅ |
| **商队标记** | `F/components/fushengji/FushengjiFleetMarker.tsx` | 移动动画 | ✅ |
| **地理工具** | `F/lib/fstradingGeo.ts` | — | ✅ |
| **Phaser 入口** | `F/games/trading/index.tsx` | 🟡 占位，待接入 | 🟡 |
| **Phaser HUD** | `F/games/trading/components/GameHUD.tsx` | 🟡 占位 | 🟡 |
| **Phaser 场景** | `F/games/trading/scenes/MapScene.ts` | 🟡 占位 | 🟡 |
| **Phaser State Hook** | `F/games/trading/hooks/useTradingState.ts` | 🟡 占位 | 🟡 |

### 8.4 TECH 前端

| 功能 | 文件 | 说明 | 状态 |
|------|------|------|------|
| **主对局页面** | `F/pages/Games/TechVenturePlayPage.tsx` | 三栏布局决策面板 | ✅ |
| **等候区/选队** | `F/pages/Games/TechVentureLobbyPage.tsx` | — | ✅ |
| **顶部 HUD** | `F/components/techventure/TvHud.tsx` | 队名、预算、排名 | ✅ |
| **策略选择器** | `F/components/techventure/TvStrategySelector.tsx` | 四路线 + 三城开拓 | ✅ |
| **KPI 卡片** | `F/components/techventure/TvKpiCards.tsx` | Tech/声量/BQI/排名 | ✅ |
| **排行榜面板** | `F/components/techventure/TvLeaderboardPanel.tsx` | — | ✅ |
| **新闻面板** | `F/components/techventure/TvNewsPanel.tsx` | — | ✅ |
| **策略地图** | `F/components/techventure/TvStrategyMapPanel.tsx` | 预留 | 🟡 |
| **TypeScript 类型** | `F/types/techventure.ts` | `TvGameState`, `TvSubmitPayload`, `RouteId` 等 | ✅ |
| **Phaser 入口** | `F/games/techventure/index.tsx` | 🟡 占位 | 🟡 |
| **Phaser HUD** | `F/games/techventure/components/GameHUD.tsx` | 🟡 占位 | 🟡 |
| **Phaser 场景** | `F/games/techventure/scenes/GameScene.ts` | 🟡 占位 | 🟡 |
| **Phaser State Hook** | `F/games/techventure/hooks/useGameState.ts` | 🟡 占位 | 🟡 |

### 8.5 通用页面与组件

| 功能 | 文件 | 说明 | 状态 |
|------|------|------|------|
| **首页** | `F/pages/HomePage.tsx` | — | ✅ |
| **登录** | `F/pages/Auth/LoginPage.tsx` | — | ✅ |
| **注册** | `F/pages/Auth/RegisterPage.tsx` | — | ✅ |
| **Dashboard** | `F/pages/Dashboard/DashboardPage.tsx` | — | ✅ |
| **生涯首页** | `F/pages/Career/CareerPage.tsx` | — | ✅ |
| **生涯起点** | `F/pages/Career/CareerStartPage.tsx` | — | ✅ |
| **复盘页** | `F/pages/Career/DebriefPage.tsx` | — | 🟡 |
| **成就展示** | `F/pages/Showcase/ShowcasePage.tsx` | — | 🟡 |
| **每日活动** | `F/pages/Activities/DailyActivitiesPage.tsx` | — | 🟡 |
| **商赛大厅** | `F/pages/Games/GamesPage.tsx` | — | ✅ |
| **游戏房间** | `F/pages/Games/GameRoomPage.tsx` | — | ✅ |
| **通用对局页** | `F/pages/Games/GamePlayPage.tsx` | — | ✅ |
| **通用大厅页** | `F/pages/Games/GameLobbyPage.tsx` | — | ✅ |
| **课程列表** | `F/pages/Courses/CoursesPage.tsx` | — | 🟡 |
| **课程详情** | `F/pages/Courses/CourseDetailPage.tsx` | — | 🟡 |
| **Wiki** | `F/pages/Wiki/WikiPage.tsx` | — | 🟡 |
| **Wiki 文章** | `F/pages/Wiki/WikiArticlePage.tsx` | — | 🟡 |
| **营团加入** | `F/pages/Camp/JoinCampPage.tsx` | — | 🟡 |
| **我的营团** | `F/pages/Camp/MyCampPage.tsx` | — | 🟡 |
| **财富国度** | `F/pages/WealthOfNations/WealthOfNationsPage.tsx` | — | 🟡 |
| **练习谈判** | `F/pages/Games/PracticeNegotiationPage.tsx` | — | 🟡 |

---

## 9. 前端 — 组织者端

> 入口：`O/main.tsx` → `O/App.tsx`
> 独立 Vite 项目，端口 :5174

| 功能 | 文件 | 说明 | 状态 |
|------|------|------|------|
| **路由总表** | `O/App.tsx` | — | ✅ |
| **布局** | `O/components/Layout.tsx` | — | ✅ |
| **认证守卫** | `O/components/AuthGuard.tsx` | — | ✅ |
| **引导页** | `O/components/OrganizerBootstrap.tsx` | — | ✅ |
| **登录** | `O/pages/LoginPage.tsx` | — | ✅ |
| **申请入驻** | `O/pages/ApplyPage.tsx` | — | ✅ |
| **Dashboard** | `O/pages/DashboardPage.tsx` | — | ✅ |
| **创建赛事** | `O/pages/CreateEventPage.tsx` | — | ✅ |
| **赛事控场** | `O/pages/EventControlPage.tsx` | — | ✅ |
| **营团列表** | `O/pages/CampListPage.tsx` | — | ✅ |
| **创建营团** | `O/pages/CreateCampPage.tsx` | — | ✅ |
| **营团详情** | `O/pages/CampDetailPage.tsx` | + 多个 Tab | ✅ |
| **营团概览** | `O/pages/camp/OverviewTab.tsx` | — | ✅ |
| **营团成员** | `O/pages/camp/MembersTab.tsx` | — | ✅ |
| **营团进度** | `O/pages/camp/MemberProgressTab.tsx` | — | ✅ |
| **营团赛季** | `O/pages/camp/SeasonsTab.tsx` | — | ✅ |
| **营团活动** | `O/pages/camp/EventsTab.tsx` | — | ✅ |
| **营团公告** | `O/pages/camp/AnnouncementsTab.tsx` | — | ✅ |
| **营团分组** | `O/pages/camp/GroupsTab.tsx` | — | ✅ |
| **营团公司** | `O/pages/camp/CompanyTab.tsx` | — | ✅ |
| **营团经济** | `O/pages/camp/CoinEconomyTab.tsx` | — | ✅ |
| **营团评分** | `O/pages/camp/ScoringTab.tsx` | — | ✅ |
| **营团任务** | `O/pages/camp/TaskCenterTab.tsx` | — | ✅ |
| **营团管理** | `O/pages/camp/MemberManagementTab.tsx` | — | ✅ |
| **TECH 控场** | `O/pages/TechVentureControl.tsx` | — | ✅ |
| **TECH 大屏** | `O/pages/TechVentureScreen.tsx` | — | ✅ |
| **TECH 评委** | `O/pages/TechVentureJudge.tsx` | — | ✅ |

---

## 10. 配置与数据

### 10.1 游戏配置（CyberCore）

| 配置 | 文件 | 引擎 | 状态 |
|------|------|------|------|
| 浮生记 | `B/../content/game-configs/fstrading.yaml` | FST / trading | ✅ |
| 创想大赢家 | `B/../content/game-configs/techventure-v1.yaml` | TECH / techventure | ✅ |
| 生产经营销售 | `B/../content/game-configs/ops-sim-v1.yaml` | OPS / ops_sim | 🔴 |
| 金融投资 | — | FIN / finance_lab | 🔴 |

### 10.2 CyberCore 配置系统

| 功能 | 文件 | 关键符号 | 状态 |
|------|------|----------|------|
| **配置注册表** | `B/domains/cybercore/registry.py` | — | ✅ |
| **类型定义** | `B/domains/cybercore/types.py` | — | ✅ |
| **世界加载器** | `B/domains/cybercore/world_loader.py` | — | ✅ |

---

## 11. PRD / 文档

| 文档 | 路径 | 说明 | 状态 |
|------|------|------|------|
| **项目总纲** | `00-PROJECT.md` | 仓库地图、项目概览 | ✅ |
| **术语表** | `00-TERMINOLOGY.md` | 统一术语定义 | ✅ |
| **产品定义** | `01-PRODUCT.md` | 产品架构、赛事体系 | ✅ |
| **技术架构** | `02-ARCHITECTURE.md` | 运行时选型、双前端 | ✅ |
| **工程规范** | `03-ENGINEERING.md` | API 全表、AI_DEFAULT、开发流程 | ✅ |
| **路线图** | `04-ROADMAP.md` | Phase 门控、里程碑 | ✅ |
| **CLAUDE 指引** | `CLAUDE.md` | Claude Code 会话入口 | ✅ |
| **Agent 入口** | `agent.md` | 通用 AI 工具入口 | ✅ |
| **代码地图** | `CODE_MAP.md` | 本文 | ✅ |
| **FST PRD** | `docs/prd/PRD-FST.md` | 浮生记引擎规范 | ✅ |
| **TECH PRD** | `docs/prd/PRD-TECH.md` | 创想大赢家引擎规范 | ✅ |
| **OPS PRD** | `docs/prd/PRD-OPS.md` | 生产经营销售引擎规范 | ✅ |
| **引擎开发手册** | `docs/engine-spec.md` | 全栈引擎开发规范 | ✅ |
| **Arena 架构** | `webapp/backend/app/domains/arena/ARCHITECTURE.md` | Arena 域架构 | ✅ |
| **Career 设计** | `webapp/backend/app/domains/career/DESIGN.md` | Career 域设计 | ✅ |
| **ADR 索引** | `docs/decisions/README.md` | 架构决策记录 | ✅ |
| **Cursor 规则** | `.cursor/rules/*.mdc` | AI 编码约束 | ✅ |

---

## 12. 快速检索表

### 12.1 "我要改……"

| 我要改…… | 去哪找 |
|-----------|--------|
| TechVenture 结算公式 | `B/games/techventure/v6_engine.py` → `settle_round()` |
| FST 定价逻辑 | `B/games/trading/rts_pricing.py` → `build_price_snapshot()` |
| FST tick 间隔 | `B/games/trading/rts_scheduler.py` + `fstrading.yaml` |
| 新增 API 路由 | `B/main.py` 挂载 + `B/api/` 新建模块 |
| 新增数据库表 | `B/db/init_db.py` 导入模型 |
| 用户登录/注册 | `B/api/auth.py` + `B/models/user.py` |
| 比赛创建流程 | `B/domains/arena/services/match_factory.py` |
| 比赛生命周期 | `B/domains/arena/services/match_lifecycle.py` |
| XP/奖励发放 | `B/domains/career/services/rewards.py` |
| 前端路由新增 | `F/App.tsx` + `F/pages/` 新建页面 |
| 前端新增 Store | `F/stores/` 新建 + `F/types/` 补充类型 |
| 组织者端新增页面 | `O/App.tsx` + `O/pages/` 新建 |
| 游戏配置调整 | `B/../content/game-configs/*.yaml` |
| 新增引擎（后端） | 参考 `B/games/techventure/` 结构 |
| 新增引擎（前端） | 参考 `F/pages/Games/TechVenturePlayPage.tsx` |

### 12.2 "我想了解……"

| 我想了解…… | 读什么 |
|-------------|--------|
| 整个项目是什么 | `00-PROJECT.md` → `01-PRODUCT.md` |
| 当前做到哪了 | `03-ENGINEERING.md` §AI_DEFAULT |
| 某个引擎怎么玩 | `docs/prd/PRD-*.md` |
| 域边界规则 | `.cursor/rules/blueprint-coding.mdc` |
| Phase 能不能做 | `04-ROADMAP.md` §Phase 门控 |
| 新增引擎 Checklist | `docs/prd/README.md` §设计约束 |

---

*商识唯智 · CODE_MAP v1.0*
*维护规则：新增/删除/重命名文件后须同步更新。失效行直接删除，不保留过时映射。*
