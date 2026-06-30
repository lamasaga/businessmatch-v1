 # 文档中心

 本目录按工作类别组织。开发 **FST / TECH / OPS** 三赛事引擎时，**优先读 [`engines/`](./engines/README.md)**，不必在全仓 `docs/` 里翻找。

 ## 开发三引擎？从这里开始

 | 入口 | 说明 |
 |------|------|
 | [**engines/README.md**](./engines/README.md) | 三引擎 P0 必读清单、代码落点、美术索引 |
 | [engines/fst/](./engines/fst/README.md) | 浮生记 PRD + 实现指南 |
 | [engines/tech/](./engines/tech/README.md) | 创想大赢家 |
 | [engines/ops/](./engines/ops/README.md) | 生产经营销售赛（含 BDD/SPEC） |

 ## 根目录核心文档

 | 文件 | 工作类别 | 说明 |
 |------|----------|------|
 | [`PROJECT.md`](./PROJECT.md) | 项目总览 | 对外说明、项目定位、当前进展 |
 | [`ENGINE.md`](./ENGINE.md) | 赛事引擎开发 | Phaser/React 运行时、美术管线、结算规范 |
 | [`AGENT.md`](./AGENT.md) | AI 教练与 NPC | Hermes 复盘、NPC 角色卡与多能力面实现 |
 | [`TEACHING.md`](./TEACHING.md) | 教师端与营团 | 营团创建、赛季编排、商赛控场、学生管理 |
 | [`UI-LIBRARY.md`](./UI-LIBRARY.md) | 组件库与 UI | 商业模拟通用设计元素与组件体系 |

 ## 子目录

 | 目录 | 重要性 | 说明 |
 |------|--------|------|
 | [**engines/**](./engines/README.md) | **P0** | 三赛事引擎产品+实现契约 |
 | [decisions/](./decisions/README.md) | P0（架构变更时） | ADR |
 | [prd/](./prd/README.md) | P1 | Career、POP、教师端、写作指南 |
 | [handbooks/](./handbooks/README.md) | P1（落地任务时） | 抛光、前端视觉手册 |
 | [engineering-academy/](./engineering-academy/00-README.md) | P2 | 教程与背景（引擎指南已迁到 engines/） |
 | [archive/](./archive/README.md) | P3 | 历史与预研 |
 | [角色背景/](./角色背景/README.md) | P2（NPC 工作时） | 角色 IP 与视觉 |

 ## 新增文档指引

 - **三引擎 PRD/BDD/SPEC/指南** → `engines/<fst|tech|ops>/`
 - 架构选型 → `decisions/`
 - Career / POP / 教师端等产品需求 → `prd/`
 - 实现教程/操作步骤 → `handbooks/`
 - 学习材料 → `engineering-academy/`
 - 历史/不再活跃 → `archive/`
