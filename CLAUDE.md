# CLAUDE.md

本文件为 Claude Code（claude.ai/code）提供本项目的工作指引。

## 项目概览（Project Overview）

**商域（BizSim Edu）** 是面向 K12 至大学的商业模拟教育平台。本仓库为 monorepo 结构：

- **`webapp/`** — 主应用：FastAPI 后端 + React 双前端（学生端 Student + 教师端 Teacher）
- **`art-assets/`** — 美术素材（含浮生记/fushengji、tabler 图标等）
- **`PPT/`** — 演示文件（HTML/SVG）
- **`inspire/`** — 构想/研究文档（**非编程契约**，non-authoritative）
- **`docs/decisions/`** — 架构决策记录（ADR, Architecture Decision Records）

根目录权威文档为 `00-PROJECT.md`、`00-TERMINOLOGY.md`、`01-PRODUCT.md`、`02-ARCHITECTURE.md`、`03-ENGINEERING.md`、`04-ROADMAP.md`。**不以 `inspire/` 作为实现依据。**

---

## 快速启动（Quick Start）

### Webapp（主应用）

**一键启动（Windows，推荐）：**
```powershell
cd webapp
.\启动.ps1
```
同时启动后端（:8000）+ 学生端（:5173）+ 组织者端（:5174），各开独立窗口。

**手动启动：**
```powershell
# 后端（在 webapp/backend/ 下）
.\venv\Scripts\python run.py
# 或带自动重载（Windows 重载可能残留孤儿进程）：
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 数据库初始化（首次或 schema 变更后）
.\venv\Scripts\python -m app.db.init_db

# 学生端（在 webapp/frontend/ 下）
npm install
npm run dev        # localhost:5173

# 组织者端（在 webapp/organizer-frontend/ 下）
npm install
npm run dev        # localhost:5174
```

**Docker（类生产环境）：**
```powershell
cd webapp
docker compose up -d --build
# 学生端 http://localhost，组织者端 http://localhost:5174
```

**测试账号：** `student`/`student123`，`admin`/`admin123`



## 高层架构（High-Level Architecture）

### 后端 — 模块化单体（Domain-Partitioned Monolith）

后端（`webapp/backend/app/`）按**硬域边界（hard domain boundaries）**组织。禁止跨域写入，只经 API 调用或域事件。

| 域（Domain） | 路径 | 独占表 | 核心规则 |
|-------------|------|--------|---------|
| **identity** | `models/user.py` · `api/auth.py` | `users` | 其他域不得直接写入 `users.experience` |
| **arena** | `domains/arena/` · `api/{competitions,trading,organizer,practice,teaching_groups}.py` | `competition_events`, `competition_participants`, `organizer_profiles`, `arena_teams` | 赛事引擎不得绕过 arena 修改比赛状态 |
| **cybercore** | `domains/cybercore/` · `content/game-configs/` | YAML 配置 | 规则必须声明在 YAML 中，禁止硬编码 |
| **games/trading** | `games/trading/*.py` | `trading_rounds`, `trading_decisions`, `trading_prices` | 禁止操作 arena 表 |
| **games/techventure** | `games/techventure/*.py` | `tv_team_state`, `tv_rounds`, `tv_submissions`, `tv_snapshots`, `tv_news` | 禁止操作 arena 表 |
| **career** | `domains/career/` | `xp_events` | XP 变更只能通过 `grant_xp` / `settle_match_rewards` |
| **sandbox** | `domains/sandbox/` | — | 隔离实验空间 |

**`models/trading_competition.py` 仅为兼容层（re-export）。** 新逻辑须放入 `domains/arena/models/` 或 `games/<engine>/models.py`。

### Arena + 赛事引擎分离

平台将「比赛生命周期（arena）」与「游戏规则（engine）」分离：

| 层 | 标识符 | 路径 | 职责 |
|---|--------|------|------|
| **引擎** | YAML `engine:` | `app/games/<engine>/` | 结算内核（settlement kernel）、运行时表 |
| **配置包** | `game_config_id` | `content/game-configs/<id>.yaml` | 轮数、城市、经济常数、奖励 |
| **场次类型** | `match_kind` | `ArenaMatch.match_kind` | `practice` / `official`：入口流程、XP 权重、房间码控制 |
| **流程** | — | `practice.py` / `competitions` / `*_admin` | 生命周期与安全，不含引擎逻辑 |

建场流程：`get_game_config(game_config_id)` → `merged_match_config(overrides)` → 写入 `match.config` 快照。

### RTS 实时架构（FStrading）

交易赛事采用**调度器单写者（scheduler-single-writer）**模式。HTTP 端点只读，不推进 tick。

| 规则 | 说明 |
|------|------|
| Tick 推进 | **仅** `rts_scheduler.py` → `maybe_advance_rts` |
| HTTP `/state` | 只读。GET 处理程序中不写不推进 |
| HTTP `/actions` | 队列命令；下一 tick 结算。不立即推进 |
| WS 广播 | 先 `commit`，后 `broadcast`；commit 前不发 `finished` |
| 回合制推进 | 练习赛在 `practice_flow.py` 中原子推进（人类决策 + AI 决策 + 推进，同一事务） |

### 双前端架构（Dual Frontend）

| 前端 | 路径 | 端口 | 内容 |
|------|------|------|------|
| **学生端** | `webapp/frontend/` | :5173 | 所有学生面向页面；无组织者控制 |
| **组织者端** | `webapp/organizer-frontend/` | :5174 | 独立 Vite 项目；比赛控制面板 |

状态管理：Zustand stores — `authStore`、`careerStore`（持久化 persist）、`competitionStore`、`tradingStore`、`techventureStore`、`OPCStore`、`campStore`、`sandboxStore`。

`data/mockPlatform.ts` 仅供演示。新功能必须对接后端 API。

### 单数据库、单 API 进程

- 单 SQLite 数据库（`bizsim.db` 或 Docker 中 `sqlite:////app/data/bizsim.db`）
- 单 FastAPI 进程服务所有客户端
- 幂等写入：`xp_events` 使用 `idempotency_key`
- 赛后奖励须经过 `settle_match_rewards`

### Phase 门控（当前：Phase A）

项目使用阶段门控。用户未指定时，默认仅限 **Phase A** 范围。完整门控见 `04-ROADMAP.md` §八。

| Phase | 能做 | 不做 |
|-------|------|------|
| **A（当前）** | Career 前端对接、正式赛控场、契约文档、TechVenture 引擎 | 建 `domains/world/` 表、跨比赛持久城市状态、修改结算接入 World |
| **B1** | 营内对抗赛、`group_scrimmage`、在线匹配、AI 填位、Game Shell 统一入口 | 抢跑 Hermes LLM、教师教研工作台 |
| **B2** | `career_profiles`、资源账本、家园 MVP、NPC 静态层 | 跳过规则层直接上 LLM Agent |
| **B3** | Quest 服务、Hermes-Debrief 规则模板、五维雷达真实化 | 跳过规则层直接上 LLM Agent |
| **B4** | PG 迁移、Alembic、静态城市母本、性能基准 | — |
| **C~D** | LangGraph 编排、Persona、知识图谱 | — |
| **E** | OPC LangGraph + MCP | — |

### 路由挂载

所有路由在 `app/main.py` 中挂载于 `/api/v1`：

```python
app.include_router(auth.router, prefix="/api/v1")
app.include_router(wiki.router, prefix="/api/v1")
app.include_router(courses.router, prefix="/api/v1")
app.include_router(opc.router, prefix="/api/v1")
app.include_router(organizer.router, prefix="/api/v1")
app.include_router(teaching_groups.router, prefix="/api/v1")
app.include_router(competitions.router, prefix="/api/v1")
app.include_router(trading.router, prefix="/api/v1")
app.include_router(trading_ws.router, prefix="/api/v1")
app.include_router(practice.router, prefix="/api/v1")
app.include_router(techventure_api.router, prefix="/api/v1")
app.include_router(techventure_admin.router, prefix="/api/v1")
app.include_router(seasons.router, prefix="/api/v1")
app.include_router(camp_groups.router, prefix="/api/v1")
app.include_router(assignments.router, prefix="/api/v1")
app.include_router(camp_summer.router, prefix="/api/v1")
app.include_router(sandbox_router, prefix="/api/v1")
```

**新增路由模块须先更新 `03-ENGINEERING.md` §后端 API 全表 与 `main.py`。**

---

## 文档权威层级（Documentation Authority Hierarchy）

编码时的事实来源（按优先级）：

1. **`00-PROJECT.md` / `00-TERMINOLOGY.md` / `01-PRODUCT.md` / `02-ARCHITECTURE.md` / `03-ENGINEERING.md` / `04-ROADMAP.md`** —— 尤其 `03-ENGINEERING.md` 用于实现状态/API 表
2. **`docs/decisions/*.md`** —— 架构选型的「为什么」
3. **域 `DESIGN.md` / `ARCHITECTURE.md`** —— 如 `domains/arena/ARCHITECTURE.md`、`domains/career/DESIGN.md`
4. **代码** —— `main.py`、路由、模型

`inspire/` 用于愿景和研究。可能超前于代码。未与 `03-ENGINEERING.md` 及 Phase 门控确认前，不从中实现。

---

## Cursor 规则摘要（`.cursor/rules/`）

以下规则在 AI 编程会话中强制执行：

- **blueprint-coding.mdc**：硬域边界、路由归属、赛制配置扩展规则、RTS 单写者、单库/单进程、双前端分离、Phase 门控约束、编码风格（Python: FastAPI+SQLAlchemy 2，函数式优先；TypeScript: React 19+Zustand+Tailwind）
- **docs-align-before-push.mdc**：大型变更推送 GitHub 前，对齐根文档 `00-PROJECT.md` 至 `04-ROADMAP.md` 与代码；更新元数据日期；确保 `03-ENGINEERING.md` AI_DEFAULT 无矛盾
- **adr-writing.mdc**：发生架构选型（M1-M6）或新赛制（R1-R4）时写 ADR；80-200 行；不粘贴代码
- **doc-linking.mdc**：仅 `agent.md`、`README.md`、`00~04` 可维护指向 `inspire/` 的链接；`inspire/` 文内禁止互链（用编号指称，索引进 `50-`）
- **inspire-writing.mdc**：愿景文档须叙述风格；每个 `##` 段落须 ≥1 段说明「为什么」；禁止无叙述的裸列表

---

## 关键文件速查（Key Files）

| 用途 | 文件 |
|------|------|
| 会话入口 | `CLAUDE.md`（Claude Code）· `agent.md`（其他 AI 工具） |
| 代码地图 | `CODE_MAP.md`（功能→文件精确映射） |
| 工程真相 | `03-ENGINEERING.md`（AI_DEFAULT 快照） |
| 域边界 | `.cursor/rules/blueprint-coding.mdc` |
| Arena 架构 | `webapp/backend/app/domains/arena/ARCHITECTURE.md` |
| 后端入口 | `webapp/backend/app/main.py` |
| 后端配置 | `webapp/backend/app/core/config.py` |
| 游戏配置 | `webapp/backend/content/game-configs/*.yaml` |
| 学生端入口 | `webapp/frontend/src/App.tsx` |
| 组织者端入口 | `webapp/organizer-frontend/src/App.tsx` |
| ADR 索引 | `docs/decisions/README.md` |
