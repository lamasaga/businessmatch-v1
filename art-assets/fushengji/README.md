# 浮生记 · 美术资源包（v0.1）

> **对齐**：`docs/prd/PRD-FST.md` v3.2 · 原 inspire/赛事设计 讨论稿已归档
> **许可**：见 [sources/ATTRIBUTION.md](./sources/ATTRIBUTION.md)  
> **最后更新**：2026-05-30

---

## 目录说明

| 子目录 | 内容 | 数量级 |
|--------|------|--------|
| `maps/geo/` | `basemap.webp` 长三角主底图（FStrading 对局默认） | 1 |
| `maps/` | `yangtze_6-schematic.svg` 示意底图（降级） | 1 + 六城节点 |
| `maps/cities/` | 城徽/节点图标（SVG） | 6 |
| `items/` | 十类商品图标 | 10 |
| `icons/` |  coin、仓库、地图钉 | 3 |
| `vehicles/` | 货车、卡车 | 2 |
| `characters/` | 交易者情绪占位 | 2 |
| `events/` | 丰收、拥堵、展会、能源 | 4 |
| `ui/` | 图表、时钟、包裹、路线 | 4 |
| `animations/` | .tick 加载、车队、告警（静态 SVG，用 CSS 动画） | 3 |
| `sources/` | 原始 ZIP、出处说明 | 见 ATTRIBUTION |
| `v2/` | FST 浅色现代商旅风格概念资产（PNG sheet / moodboard） | 6 张母版 |

---

## 前端引用（规划）

```typescript
// 复制精选 SVG 至：
// webapp/frontend/public/assets/fushengji/v1/
import mapUrl from '/assets/fushengji/v1/maps/yangtze_6-schematic.svg';
```

　　清单键见 [manifest.yaml](./manifest.yaml)（扩展名已改为 `.svg`）。

---

## 动效说明

　　本阶段 **无 GIF**；`animations/` 内 SVG 可在前端用 CSS `animation`（旋转 `tick-loading`、脉冲 `pulse-alert`）实现轻量动效，符合 PRD 预加载 P1。

---

## 下一步

- [ ] 统一描边/配色（设计 token）  
- [ ] 导出 PNG @2x 供 Pixi（见 inspire/76-）  
- [ ] 补充 Kenney CC0 像素包（手动下载至 `sources/`）  

## v2 概念资产

　　`v2/` 是根据 `docs/prd/PRD-FST.md` 补充的高质感视觉母版，覆盖商品图标、车辆商队、六城节点、事件卡、浅色地图和 HUD 氛围。它不替换当前 v1 运行时资源，适合作为下一轮 UI 重做与美术裁切的基准。
