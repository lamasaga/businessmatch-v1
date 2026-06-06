# 浮生记（FStrading）局内 UI

## 现状

已有组件位于 `src/pages/Games/` 和 `src/lib/fstradingGeo.ts`。

## 迁移目标

按 `02-ARCHITECTURE.md` §三规范，逐步迁入本目录：

```
games/trading/
├── scenes/
│   └── MapScene.ts           # Phaser 地图场景（由 FushengjiMapStage 迁移）
├── components/
│   ├── GameHUD.tsx           # 顶部 HUD
│   ├── MarketPanel.tsx       # 市场行情面板
│   └── DecisionPanel.tsx     # 决策提交面板
├── hooks/
│   └── useTradingState.ts    # 连接 tradingStore
└── index.tsx                 # 入口挂载
```

## 暂不移动原因

TradingGamePage 当前直接使用 DOM/SVG 实现地图，未使用 Phaser3。
Phase A 先保持可用，Phase B 按统一规范重写为 Phaser3 + React 叠加层。
