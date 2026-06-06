# TechVenture（创想大赢家）局内 UI

## 现状

已有组件位于 `src/pages/Games/`：
- `TechVenturePlayPage.tsx` — 参赛端
- `TechVentureLobbyPage.tsx` — 等候区

## 迁移目标

按 `02-ARCHITECTURE.md` §三规范，逐步迁入本目录：

```
games/techventure/
├── scenes/
│   └── GameScene.ts           # Phaser 场景（若需要地图/动画）
├── components/
│   ├── GameHUD.tsx            # 顶部 HUD
│   ├── DecisionPanel.tsx      # 三城四路线决策
│   └── FeedbackPanel.tsx      # 回合反馈
├── hooks/
│   └── useTechventureState.ts # 连接 techventureStore
└── index.tsx                  # 入口挂载
```

## 暂不移动原因

TechVenturePlayPage 当前已实现无地图全屏 React 界面，且四端（玩/控/屏/评）路由已注册。
Phase A 保持可用，后续按统一规范逐步抽出可复用组件。
