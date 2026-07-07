# 三赛事引擎 · 美术资源导航

> **最后更新**：2026-07-07
> **原则**：设计期归档在 `art-assets/`，运行时拷贝到 `webapp/frontend/public/assets/`（或组织者端对应路径）。

---

## 分包一览

| 引擎 | 设计期路径 | 运行时路径 | 状态 |
|------|------------|------------|------|
| **FST** | [fst/](./fst/README.md) → 实际目录 [`../fushengji/`](../fushengji/README.md) | `public/assets/fushengji/v1/` | 🟢 v1 已对接 |
| **TECH** | [tech/](./tech/README.md) | `public/assets/techventure/v1/`（规划） | 🟡 占位 |
| **OPS** | [ops/](./ops/README.md) | `public/assets/ops/v1/`（规划） | 🟡 占位 |
| **共用** | [../common-ui/](../common-ui/README.md) | `public/assets/common-ui/` | 🟢 kit sheet 已收录 |
| **Premium SVG** | [premium-svg/](./premium-svg/README.md) | `public/assets/common-ui/premium-svg/`（建议） | 🟢 单件 SVG 源资产 |

---

## Premium SVG 资产包

　　`premium-svg/` 是当前主界面和赛事引擎的可复用 SVG 素材包。正式运行时引用以单件 SVG 为主，包含图标、按钮壳、面板边框、状态指示、奖励徽章；`premium-svg/sheets/` 只作为四宫格预览板，每张 4 个资产，便于美术评审和快速选型。

　　这组素材延续平台暗色玻璃 HUD、金色主操作、青绿色成长反馈、蓝色组织者/OPS 面板、琥珀色风险事件的视觉语言，可作为后续 TECH、OPS、FST 新页面素材的统一起点。

---

## 为何 FST 仍叫 `fushengji/`？

　　历史路径 `fushengji` 已写入前端代码、`manifest.yaml` 与 `public/assets/fushengji/v1/`。**不强制改名**，以免破坏运行时引用。`engines/fst/` 作为**逻辑导航**，指向 `fushengji/` 真身。

---

## 工作流

1. 新素材放入对应 `art-assets/` 子目录  
2. 更新该包的 `manifest.yaml`（若有）  
3. 将精选资源复制到 `webapp/frontend/public/assets/<engine>/v1/`  
4. 在引擎 PRD / GUIDE 中登记 `asset_key`

---

## 关联文档

- [../../docs/engines/README.md](../../docs/engines/README.md) — 三引擎文档枢纽  
- [../../docs/engines/shared/DESIGN-EVALUATION.md](../../docs/engines/shared/DESIGN-EVALUATION.md) — UI/美术提升建议
