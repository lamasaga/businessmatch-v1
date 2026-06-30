# FST · 浮生记（即时物流套利）

> **引擎标识**：`engine: trading` · **配置**：`fstrading` · **最后更新**：2026-06-28

---

## 必读文档（按顺序）

| # | 文档 | 用途 |
|---|------|------|
| 1 | [PRD.md](./PRD.md) | 产品契约：玩法、城市、商品、练习/正式 |
| 2 | [GUIDE.md](./GUIDE.md) | 实现指南：`rts_*` 模块、WS、AI |
| 3 | [../../ENGINE.md](../../ENGINE.md) | 通用引擎规范（Phaser/React、结算） |
| 4 | [../../../03-ENGINEERING.md](../../../03-ENGINEERING.md) | API 表与实现快照 |
| 5 | [../../../CODE_MAP.md](../../../CODE_MAP.md) §3.1 | 文件→功能索引 |
| — | [../MATH-MODELS.md](../MATH-MODELS.md) §一 | **公式总表（FST）** |

## 可选参考

| 文档 | 说明 |
|------|------|
| [../shared/DESIGN-EVALUATION.md](../shared/DESIGN-EVALUATION.md) | 三引擎 UI/美术评估（§FST 相关） |
| [../../../docs/decisions/005-浮生记RTS调度器单写者.md](../../../docs/decisions/005-浮生记RTS调度器单写者.md) | tick 单写者 ADR |

## 代码落点

| 层 | 路径 |
|----|------|
| 引擎内核 | `webapp/backend/app/games/trading/` |
| 参赛 API | `webapp/backend/app/api/trading.py` · `trading_ws.py` |
| 配置 | `webapp/backend/content/game-configs/fstrading.yaml` |
| 学生端 | `webapp/frontend/src/pages/Games/TradingRTSView.tsx` |
| Store | `webapp/frontend/src/stores/tradingStore.ts` |

## 美术资源

| 设计期归档 | 运行时 |
|------------|--------|
| [../../../art-assets/fushengji/](../../../art-assets/fushengji/README.md) | `webapp/frontend/public/assets/fushengji/v1/` |
| 导航索引 | [../../../art-assets/engines/fst/README.md](../../../art-assets/engines/fst/README.md) |

## 关键约束

- HTTP `/state` **只读**，不推进 tick
- tick **仅**由 `rts_scheduler.py` → `maybe_advance_rts` 推进
- 指令在下一 tick 结算；先 `commit` 再 WS `broadcast`
