# TECH · 创想大赢家（回合制科技公司策略赛）

> **引擎标识**：`engine: techventure` · **配置**：`techventure-v1` · **最后更新**：2026-06-28

---

## 必读文档（按顺序）

| # | 文档 | 用途 |
|---|------|------|
| 1 | [PRD.md](./PRD.md) | 产品契约：回合、四维属性、城市投资、新闻 |
| 2 | [GUIDE.md](./GUIDE.md) | 实现指南：v6 结算、练习流、四端视角 |
| 3 | [../../ENGINE.md](../../ENGINE.md) | 面板运行时、组织端/大屏规范 |
| 4 | [../../../03-ENGINEERING.md](../../../03-ENGINEERING.md) | API 表与实现快照 |
| 5 | [../../../CODE_MAP.md](../../../CODE_MAP.md) §3.2 | 文件→功能索引 |
| — | [../MATH-MODELS.md](../MATH-MODELS.md) §二 | **公式总表（TECH）** |

## 可选参考

| 文档 | 说明 |
|------|------|
| [../shared/DESIGN-EVALUATION.md](../shared/DESIGN-EVALUATION.md) | 霓虹紫主题、仪表盘建议 |
| [../../../docs/decisions/013-per-engine-identity.md](../../../docs/decisions/013-per-engine-identity.md) | 分引擎视觉身份 |

## 代码落点

| 层 | 路径 |
|----|------|
| 引擎内核 | `webapp/backend/app/games/techventure/` |
| 参赛 API | `webapp/backend/app/api/techventure.py` |
| 组织 API | `webapp/backend/app/api/techventure_admin.py` |
| 配置 | `webapp/backend/content/game-configs/techventure-v1.yaml` |
| 学生端 | `webapp/frontend/src/pages/Games/TechVenturePlayPage.tsx` |
| 组织者端 | `webapp/organizer-frontend/src/pages/TechVentureControl.tsx` |
| 组件 | `webapp/frontend/src/components/techventure/` |

## 美术资源

| 状态 | 路径 |
|------|------|
| 占位/规划 | [../../../art-assets/engines/tech/README.md](../../../art-assets/engines/tech/README.md) |
| 跨引擎 HUD | [../../../art-assets/common-ui/neon-arena/](../../../art-assets/common-ui/README.md) |

## 主题色（实现参考）

- 主色：霓虹紫 `#a855f7`
- 形态：创业数据仪表盘 + 回合步进条
