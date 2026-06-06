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

所有赛事引擎的局内 UI 统一使用以下技术栈：

| 层 | 技术 | 说明 |
|----|------|------|
| 游戏渲染 | **Phaser 3** | 2D 游戏场景、动画、交互 |
| UI 框架 | **React + TypeScript** | 面板、HUD、弹窗、表单 |
| 样式 | **Tailwind CSS** + 项目 UI 组件库 | 统一视觉 |
| 构建 | Vite | — |

**目录约定**：
```
webapp/frontend/src/games/<engine-id>/
├── GameScene.ts          # Phaser 场景入口
├── components/           # React UI 组件（HUD、面板、弹窗）
├── assets/               # 引擎专属素材
└── index.tsx             # React 挂载点
```

**渲染模式**：Phaser Canvas 作为底层，React 通过 `react-phaser-fiber` 或 DOM overlay 渲染 UI 层。UI 组件库（按钮、卡片、表格等）复用项目统一组件。

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

## 六、RTS 实时架构（浮生记）

| 规则 | 说明 |
|------|------|
| Tick 推进 | **仅** `rts_scheduler.py` → `maybe_advance_rts` |
| HTTP `/state` | 只读，不写不推进 |
| HTTP `/actions` | 队列命令，下 tick 结算 |
| WS 广播 | `commit` 后 `broadcast` |

---

*商域 BizSim Edu · 技术架构 v2.0*
