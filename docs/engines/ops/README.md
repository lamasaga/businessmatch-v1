# OPS · 生产经营销售赛（6 轮运营 + 2 轮拍卖）

> **引擎标识**：`engine: ops_sim` · **配置**：`ops-sim-v1` · **最后更新**：2026-06-28

---

## 必读文档（按顺序）

| # | 文档 | 用途 |
|---|------|------|
| 1 | [PRD.md](./PRD.md) | 产品契约：阶段、决策、拍卖、胜负 |
| 2 | [BDD.md](./BDD.md) | **验收契约**：无教师练习、6+2 推进 |
| 3 | [SPEC.md](./SPEC.md) | API、phase、payload、P0 Gap |
| 4 | [SPEC-ECONOMY.md](./SPEC-ECONOMY.md) | 生产/份额/广告/财务公式 |
| 5 | [GUIDE.md](./GUIDE.md) | 引擎目录与联调 |
| 6 | [../../../03-ENGINEERING.md](../../../03-ENGINEERING.md) | API 表与实现快照 |
| — | [../MATH-MODELS.md](../MATH-MODELS.md) §三 | **公式总表（OPS）** |
| — | [SPEC-ECONOMY.md](./SPEC-ECONOMY.md) | OPS 完整经济契约（比总表更细） |

## 代码落点

| 层 | 路径 |
|----|------|
| 引擎内核 | `webapp/backend/app/games/ops_sim/` |
| 参赛 API | `webapp/backend/app/api/ops.py` |
| 配置 | `webapp/backend/content/game-configs/ops-sim-v1.yaml` |
| 学生端 | `webapp/frontend/src/pages/Games/OpsPlayPage.tsx` |
| 组织者端 | `webapp/organizer-frontend/src/pages/OpsControlPage.tsx` |
| 组件 | `webapp/frontend/src/components/ops/` |

## 美术资源

| 状态 | 路径 |
|------|------|
| 占位/规划 | [../../../art-assets/engines/ops/README.md](../../../art-assets/engines/ops/README.md) |
| 跨引擎面板 | [../../../art-assets/common-ui/academy-dashboard/](../../../art-assets/common-ui/README.md) |

## 主题色（实现参考）

- 主色：工业蓝 `#3b82f6` + 拍卖橙 `#f59e0b`
- 形态：阶段条 + 财务感面板
