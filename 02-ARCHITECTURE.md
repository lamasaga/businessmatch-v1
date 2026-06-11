# 技术架构与智能体编排

> **定位**：技术栈、系统边界、域分包、智能体 Worker 列表、记忆架构。
> **关联**：`01-PRODUCT.md`（产品定义）· `03-ENGINEERING.md`（API/路由详表）
> **最后更新**：2026-06-06

---

## 一、技术栈

| 层 | 当前 | 规模化目标 |
|----|------|-----------|
| 后端 | FastAPI + SQLAlchemy 2 + SQLite | PostgreSQL + Redis |
| 前端 | React 19 + TypeScript + Tailwind + Vite | — |
| 状态管理 | Zustand | — |
| 引擎前端 | **Phaser 3 + React + TypeScript + UI 组件库** | — |
| 编排框架 | LangGraph（Phase C） | — |
| 部署 | Docker Compose | K8s（远期） |

---

## 二、后端域分包

| 域 | 路径 | 职责 | 现状 |
|----|------|------|------|
| `identity` | `models/user.py` + `api/auth.py` | 用户、JWT | ✅ |
| `arena` | `domains/arena/` + `api/{competitions,trading,organizer,practice}.py` | 场次、房间码、match_kind | ✅ |
| `cybercore` | `domains/cybercore/` + `content/game-configs/` | 加载赛制 YAML | ✅ |
| `games/trading` | `games/trading/*.py` | 回合制 + RTS 结算 | ✅ |
| `games/techventure` | `games/techventure/*.py` | 队伍策略赛 v6 引擎 | ✅ |
| `career` | `domains/career/` | `xp_events` 幂等账本 | 🟡 有表，前端仍 mock |
| `academy` | `api/courses.py` | 课程列表 | 🟡 硬编码 |
| `opc` | `api/opc.py` | 一人公司 CRUD | ✅ 演示级 |
| `sandbox` | `domains/sandbox/` | 赛事工坊（热 YAML 编辑） | 🟡 MVP |

**铁律**：
- 一个库、一个 API 进程
- 跨域写禁止，只经 API 或域事件
- 新表须声明唯一主人域

---

## 三、赛事引擎前端规范

### 3.1 总体分层

| 层 | 技术 | 说明 |
|----|------|------|
| **平台壳** | React + Tailwind + game-ui | 生涯、教师端、大厅、匹配队列 |
| **对局入口** | Game Shell 全屏路由 | 统一 `/games/:id/play` 进游戏 |
| **对局运行时 A** | **Phaser 3 + React HUD overlay** | 有地图/空间/实时移动的引擎 |
| **对局运行时 B** | **React 全屏 + game-ui** | 面板/策略型引擎 |

### 3.2 运行时选型

引擎在 `game-config.yaml` 中声明 `runtime`：

```yaml
meta:
  runtime: phaser       # 浮生记 RTS、产销沙盘等
  # runtime: react-game # TechVenture、金融投研等
```

| 运行时 | 适用引擎 | 目录特点 |
|--------|----------|----------|
| `phaser` | trading（浮生记）、ops-sim（产销沙盘） | `scenes/` 为 Phaser.Scene |
| `react-game` | techventure、finance-lab、engine5、engine6 | `scenes/` 保留为占位/可选；主界面在 `components/` |

### 3.3 统一目录约定

```
webapp/frontend/src/games/<engine-id>/
├── scenes/
│   └── GameScene.ts      # Phaser 场景（phaser 运行时）或占位（react-game）
├── components/           # React UI 组件（HUD、面板、弹窗）
├── hooks/                # 游戏状态 hooks
├── assets/               # 引擎专属素材
└── index.tsx             # Game Shell 挂载点
```

### 3.4 渲染模式

- **phaser 运行时**：Phaser Canvas 为底，React DOM overlay 渲染 HUD。使用项目统一 UI 组件库。
- **react-game 运行时**：纯 React 全屏沉浸布局，使用 `game-ui` 组件库，无需 Phaser 依赖。

两种运行时共享：
- `game-ui` 组件库（`frontend/src/components/game/`）
- 统一 Game Shell（尺寸、加载状态、错误边界）
- 相同的数据流（Zustand store / WebSocket）

---

## 四、前端架构

| 模块 | 路径前缀 | 说明 |
|------|----------|------|
| 生涯 | `/career` | 中枢、开局、复盘 |
| 商赛 | `/games` | 大厅、lobby、play |
| 五域 | `/wiki`, `/courses`, `/quests`, `/achievements` | 部分 mock |
| OPC | `/opc/*` | 公司、员工、任务 |
| 赛事工坊 | `/sandbox` | YAML 热编辑、试跑 |

---

## 五、智能体编排（Pedagogy OS）

### 5.1 设计原则

| 原则 | 说明 |
|------|------|
| 一个教练品牌 | 对外统一 Hermes；对内按场景分派 Worker |
| 事件驱动 | 编排层接收平台事件，路由到对应 Worker |
| 渐进复杂度 | 规则层优先 → RAG 增强 → 完整 Agent |
| 成本可控 | 练习 AI 零 Token；复盘/教练按量计费 |

### 5.2 Worker 列表

```
平台事件（match.finished / quest.completed / opc.milestone）
    ↓
  Pedagogy Router（FastAPI 后台任务 / Redis 队列）
    ↓
  LangGraph 状态图
    ├── Hermes-Debrief    → 复盘引导
    ├── Hermes-PathPlanner → 路径规划/周计划
    ├── Hermes-QA         → 答疑解惑
    ├── Tyche             → 市场模拟叙事
    ├── Rival             → 谈判/博弈对手
    ├── Persona           → 性格测评/赛制匹配
    └── Cortex（OPC）      → 拆单分发 AI 员工
```

### 5.3 记忆三层

| 层 | 存储 | 生命周期 | 内容 |
|----|------|----------|------|
| 短期 | 会话缓存（内存/Redis） | 单次对话 | 当前上下文 |
| 中期 | 向量数据库 | 跨会话 | 会话摘要、关键决策 |
| 长期 | `career_profiles` | 永久 | 五维雷达、掌握度、偏好 |

---

## 六、赛事引擎架构决策

### 6.1 核心结论

| 问题 | 决策 |
|------|------|
| 引擎是否独立仓库？ | **否**。同仓库（monorepo），引擎代码在 `games/<engine>/` |
| 引擎是否独立进程？ | **开发期可独立启动**（独立 dev server），**生产期同进程**（FastAPI 内导入） |
| 引擎是否独立数据库？ | **否**。单 SQLite，引擎表由自身域拥有 |
| 新增引擎目录？ | `games/<engine>/` + `frontend/src/games/<engine>/` |

### 6.2 为什么不是独立进程

仓库中存在 `engine_client.py` 等独立进程相关代码，属于**远期预留**（Phase C+ 可选能力）。当前 Phase A/B 采用同进程原因：
- 单进程避免分布式调试复杂度
- 避免 HTTP 序列化开销（tick 5s 内完成结算）
- `games/<engine>/` 已可直接 `import` 调用

若未来确需独立部署，只需在 `engine_client.py` 中切换「本地导入」与「HTTP 调用」两种模式，无需重构引擎内核。

### 6.3 vibe coding 目录规划

```
webapp/
├── backend/app/
│   ├── games/
│   │   ├── trading/          # 浮生记引擎内核
│   │   ├── techventure/      # TechVenture 引擎内核
│   │   └── <new-engine>/    # 新增引擎复制此结构
│   │       ├── __init__.py
│   │       ├── engine.py     # 结算入口
│   │       ├── models.py     # 运行时数据模型
│   │       ├── ai.py         # AI 对手（纯规则，零 Token）
│   │       └── config.py     # YAML 加载
│   ├── api/                  # 路由（practice.py / competitions / *_admin）
│   └── domains/
│       ├── arena/            # 比赛生命周期
│       ├── career/           # XP 账本
│       └── cybercore/        # YAML 配置加载
│
├── frontend/src/
│   ├── games/                # 赛事引擎局内 UI
│   │   ├── trading/          # 浮生记 Phaser3 + React
│   │   ├── techventure/      # TechVenture React 全屏（runtime=react-game）
│   │   └── <new-engine>/    # 新增引擎复制此结构
│   │       ├── scenes/       # Phaser 场景或占位
│   │       ├── components/   # React UI 组件
│   │       ├── hooks/        # 游戏逻辑 hooks
│   │       └── index.tsx     # 入口挂载
│   └── components/game/      # 商赛通用 UI 组件（倒计时、排行榜等）
│
└── contracts/
    ├── openapi/              # OpenAPI 规范
    └── game-configs/         # YAML Schema
```

### 6.4 新增引擎 checklist

1. 新增 `content/game-configs/<id>.yaml`
2. 新增 `backend/app/games/<engine>/`（engine.py + models.py + ai.py）
3. 新增 `frontend/src/games/<engine>/`（按 `meta.runtime` 选 Phaser 或 React 全屏）
4. 练习入口：`api/practice.py` 指定默认 `game_config_id`
5. 正式入口：教师端创建比赛可选该 `game_config_id`
6. 前端路由：在 `frontend/src/App.tsx` 或游戏大厅注册局内页路由
7. 不改 Arena 表结构（除非通用字段扩展）

---

## 七、RTS 实时架构（浮生记）

| 规则 | 说明 |
|------|------|
| Tick 推进 | **仅** `rts_scheduler.py` → `maybe_advance_rts` |
| HTTP `/state` | 只读，不写不推进 |
| HTTP `/actions` | 队列命令，下 tick 结算 |
| WS 广播 | `commit` 后 `broadcast` |

---

*商识唯智 · 技术架构 v2.0*
