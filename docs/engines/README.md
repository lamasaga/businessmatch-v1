# 三赛事引擎 · 文档导航

> **最后更新**：2026-06-28  
> **定位**：本目录是 **FST / TECH / OPS** 三套 Arena 赛事引擎的**唯一产品+实现入口**。读文档从这里开始，不必在 `docs/` 全仓翻找。

---

## 一、30 秒选型

| 引擎 | 对外名称 | `engine` | `game_config_id` | 形态 |
|------|----------|----------|------------------|------|
| [FST](./fst/README.md) | 浮生记 | `trading` | `fstrading` | 实时 tick + WebSocket |
| [TECH](./tech/README.md) | 创想大赢家 | `techventure` | `techventure-v1` | 回合制策略 |
| [OPS](./ops/README.md) | 生产经营销售赛 | `ops_sim` | `ops-sim-v1` | 6 轮运营 + 2 轮拍卖 |

---

## 二、每个引擎「真正要读」的文档（P0）

按 **PRD → BDD（若有）→ SPEC（若有）→ GUIDE → 工程真相** 顺序阅读。

### FST / 浮生记

| 优先级 | 文档 | 回答什么问题 |
|--------|------|--------------|
| P0 | [fst/PRD.md](./fst/PRD.md) | 玩法、阶段、胜负、练习/正式差异 |
| P0 | [fst/GUIDE.md](./fst/GUIDE.md) | 代码地图、tick/定价/物流、API 与 WS |
| P0 | [../ENGINE.md](../ENGINE.md) §FST | 运行时、美术管线、结算纪律 |
| P1 | [../../03-ENGINEERING.md](../../03-ENGINEERING.md) §AI_DEFAULT | API 表、实现状态、Phase 门控 |
| P1 | [../../CODE_MAP.md](../../CODE_MAP.md) §3.1 | 文件→功能精确索引 |

### TECH / 创想大赢家

| 优先级 | 文档 | 回答什么问题 |
|--------|------|--------------|
| P0 | [tech/PRD.md](./tech/PRD.md) | 回合流程、四维属性、城市投资 |
| P0 | [tech/GUIDE.md](./tech/GUIDE.md) | v6 结算、练习推进、四端视角 |
| P0 | [../ENGINE.md](../ENGINE.md) §TECH | 面板运行时、组织端/大屏 |
| P1 | [../../03-ENGINEERING.md](../../03-ENGINEERING.md) | API 与实现快照 |
| P1 | [../../CODE_MAP.md](../../CODE_MAP.md) §3.2 | 文件索引 |

### OPS / 生产经营销售赛

| 优先级 | 文档 | 回答什么问题 |
|--------|------|--------------|
| P0 | [ops/PRD.md](./ops/PRD.md) | 6+2 阶段、决策项、拍卖 |
| P0 | [ops/BDD.md](./ops/BDD.md) | 可验收场景（无教师练习全流程） |
| P0 | [ops/SPEC.md](./ops/SPEC.md) | API、phase、payload、工程 Gap |
| P0 | [ops/SPEC-ECONOMY.md](./ops/SPEC-ECONOMY.md) | 生产/份额/财务公式 |
| P0 | [ops/GUIDE.md](./ops/GUIDE.md) | 引擎目录与联调要点 |
| P1 | [../../CODE_MAP.md](../../CODE_MAP.md) §3.3 | 文件索引 |

### 三引擎共用（体验与美术，非 API 契约）

| 优先级 | 文档 | 说明 |
|--------|------|------|
| P1 | [shared/DESIGN-EVALUATION.md](./shared/DESIGN-EVALUATION.md) | UI/美术/组件库提升建议，**参考材料** |
| P1 | [../UI-LIBRARY.md](../UI-LIBRARY.md) | 跨引擎组件与设计 token |
| P1 | [MATH-MODELS.md](./MATH-MODELS.md) | **三引擎公式总表**（调参/改模型入口） |
| P1 | [../../art-assets/engines/README.md](../../art-assets/engines/README.md) | 美术分包与运行时路径 |

---

## 三、不必默认阅读的目录

| 目录 | 性质 | 何时才需要 |
|------|------|------------|
| [../engineering-academy/](../engineering-academy/00-README.md) | 教程与背景知识 | 新人系统学习、POP/营团专题 |
| [../archive/](../archive/README.md) | 历史与预研 | 查旧方案、引擎匣子 POC |
| [../handbooks/](../handbooks/README.md) | 任务手册 | 抛光、前端视觉落地 |
| [../../inspire/](../../inspire/) | 构想库（**非编程契约**） | 产品调研；实现前须与 PRD/03 对齐 |
| [../prd/](../prd/README.md) | 非引擎 PRD + 写作指南 | Career、POP、教师夏令营 |

---

## 四、架构与决策（跨引擎硬约束）

| 文档 | 用途 |
|------|------|
| [../../02-ARCHITECTURE.md](../../02-ARCHITECTURE.md) | 高层架构、运行时选型 |
| [../../03-ENGINEERING.md](../../03-ENGINEERING.md) | 工程真相、API 全表 |
| [../decisions/004-CyberCore声明式赛制扩展.md](../decisions/004-CyberCore声明式赛制扩展.md) | 声明式赛制 |
| [../decisions/005-浮生记RTS调度器单写者.md](../decisions/005-浮生记RTS调度器单写者.md) | FST tick 单写者 |
| [../../webapp/backend/app/domains/arena/ARCHITECTURE.md](../../webapp/backend/app/domains/arena/ARCHITECTURE.md) | Arena 与引擎分层 |

---

## 五、代码与配置落点（速查）

| 引擎 | 后端 | 配置 YAML | 学生端 | 组织者端 |
|------|------|-----------|--------|----------|
| FST | `webapp/backend/app/games/trading/` | `content/game-configs/fstrading.yaml` | `pages/Games/TradingRTSView.tsx` | — |
| TECH | `webapp/backend/app/games/techventure/` | `content/game-configs/techventure-v1.yaml` | `pages/Games/TechVenture*.tsx` | `TechVentureControl.tsx` |
| OPS | `webapp/backend/app/games/ops_sim/` | `content/game-configs/ops-sim-v1.yaml` | `pages/Games/Ops*.tsx` | `OpsControlPage.tsx` |

---

*商识唯智 · 三引擎文档枢纽 v1.0*
