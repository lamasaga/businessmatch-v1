# 商域 BizSim Edu · 游戏引擎 PRD 文档集

> **最后更新**：2026-06-07
> **简称约定**：
> - **FST** = 浮生记 / FSTRADING（已有）
> - **TECH** = 创想大赢家 / TechVenture（已有）
> - **OPS** = 生产经营销售 / Ops-Sim（待开发）
> - **FIN** = 金融投资、公司研究 / Finance-Lab（待开发）
> - **ENI5**, **ENI6** = 占位引擎

---

## 设计约束（全局）

1. **参赛规模**：所有新引擎按 **15~20 支队伍常规设计**，必须能扩展至 **40 支队伍同时参赛**。
2. **运行时选型**：按 `docs/engine-spec.md` §1.2 选择 `phaser` 或 `react-game`。
3. **结算规范**：`settle_round(match_state, decisions, cfg)` 纯函数、幂等、不读写数据库。
4. **AI 规范**：零 Token、纯规则、可预测。
5. **表前缀**：引擎 ID 小写 + 下划线，如 `fst_`、`ops_`、`finance_`。

---

## 文档清单

| 文档 | 引擎 | 状态 | 说明 |
|------|------|------|------|
| [PRD-FST.md](./PRD-FST.md) | FST / 浮生记 | ✅ 已完成 | 已有引擎的规范化 PRD |
| [PRD-TECH.md](./PRD-TECH.md) | TECH / 创想大赢家 | ✅ 已完成 | 已有引擎的规范化 PRD |
| [PRD-OPS.md](./PRD-OPS.md) | OPS / 生产经营销售 | ✅ 已完成 | 新引擎完整 PRD |
| PRD-FIN.md | FIN / 金融投资 | ⚪ 待排期 | 新引擎完整 PRD |
| PRD-ENI5.md | ENI5 / 引擎五 | ⚪ 待排期 | 占位引擎框架 PRD |
| PRD-ENI6.md | ENI6 / 引擎六 | ⚪ 待排期 | 占位引擎框架 PRD |

---

## 关键参考

- [docs/engine-spec.md](../../docs/engine-spec.md) — 引擎全栈开发手册
- [02-ARCHITECTURE.md](../../02-ARCHITECTURE.md) — 技术架构与运行时选型
- [03-ENGINEERING.md](../../03-ENGINEERING.md) — 赛事引擎开发规范

---

*商域 BizSim Edu · 引擎 PRD 索引 v1.0*
