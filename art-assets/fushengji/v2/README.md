# 浮生记 FST · v2 美术资产概念包

> **用途**：根据 `docs/engines/fst/PRD.md` 与当前 `TradingRTSView` / `FushengjiMapStage` 实现，建立一套更统一、更轻盈、更有质感的 FST 赛事游戏视觉母版。
>
> **状态**：概念资产。当前为 PNG sheet / moodboard，适合美术定调、UI 重做、后续裁切与二次导出；尚未直接接入前端运行时。
>
> **生成日期**：2026-06-25

## 视觉方向

FST v2 采用“轻盈、通透、现代商旅”的独立引擎视觉，而不是通用网页后台风格。画面应像一个面向学生的实时物流商战控制台：信息密度高，但空气感足；交易紧张，但不压迫。

| 维度 | 规范 |
|------|------|
| 主背景 | `#F6F8FA` 到白色的浅灰渐变，避免大面积深色 |
| 主色 | 青蓝 `#2EC3E5`，代表长江水系、物流路线、实时推进 |
| 辅色 | 暖黄 `#F6C344`，代表商队、金币、交易收益 |
| 警告 | 暖橙 `#FF8A4C`，只用于冲刺、拥堵、错误 |
| 文字 | 深灰 `#1F2937`，避免纯白字压在复杂背景上 |
| 图标风格 | 轻 3D + UI 插画，圆角底座、柔和阴影、干净高光 |
| 面板风格 | 半透明白卡、细边框、12px 圆角、浅投影 |

## 资产清单

| 类别 | 文件 | 用途 |
|------|------|------|
| 商品图标 | [`items/product-icon-sheet.png`](./items/product-icon-sheet.png) | 10 类商品：粮食、生鲜、原材料、能源、家具、纺织品、日用品、家电、家用车、奢侈品 |
| 车辆与商队 | [`vehicles/fleet-vehicle-marker-sheet.png`](./vehicles/fleet-vehicle-marker-sheet.png) | 小货车、大卡车、商队地图标记、路线轨迹、仓库标记、抵达光环 |
| 城市节点 | [`cities/yangtze-six-city-marker-sheet.png`](./cities/yangtze-six-city-marker-sheet.png) | 上海、苏州、杭州、南京、南通、常州的高质感城市徽章 |
| 事件卡 | [`events/event-card-sheet.png`](./events/event-card-sheet.png) | 丰收、工厂满产、能源宽松、车展季、新品发布、高端展会、物流拥堵、冷链中断 |
| UI 氛围 | [`ui/fst-light-hud-art-direction.png`](./ui/fst-light-hud-art-direction.png) | 对局 HUD、地图面板、市场面板、底部操作栏的风格母版 |
| 地图背景 | [`maps/yangtze-delta-light-map-concept.png`](./maps/yangtze-delta-light-map-concept.png) | 浅色长三角物流网络地图概念 |

## 建议接入顺序

1. **商品图标裁切**：从 `items/product-icon-sheet.png` 裁出 10 个独立 PNG/WebP，命名与 `fstrading.yaml` 的 product id 对齐。
2. **车辆替换**：从 `vehicles/fleet-vehicle-marker-sheet.png` 裁出 `van`、`truck` 与地图商队 token，替换或并存于 `art-assets/fushengji/vehicles/`。
3. **事件弹窗**：从 `events/event-card-sheet.png` 裁出 8 张事件图，命名与 `event_types.type` 对齐。
4. **地图重绘**：以 `maps/yangtze-delta-light-map-concept.png` 作为风格参考，重绘可交互底图；不要直接把 mood map 当作精确地理底图。
5. **HUD 重做**：以 `ui/fst-light-hud-art-direction.png` 为布局氛围参考，保留当前 React 数据结构，重做视觉层。

## Product ID 对应

| ID | 中文 | 图标裁切建议 |
|----|------|--------------|
| `grain` | 粮食 | 第 1 行第 1 格 |
| `produce` | 生鲜 | 第 1 行第 2 格 |
| `raw_materials` | 原材料 | 第 1 行第 3 格 |
| `energy` | 能源 | 第 1 行第 4 格 |
| `furniture` | 家具 | 第 1 行第 5 格 |
| `textile` | 纺织品 | 第 2 行第 1 格 |
| `daily_goods` | 日用品 | 第 2 行第 2 格 |
| `appliances` | 家电 | 第 2 行第 3 格 |
| `passenger_car` | 家用车 | 第 2 行第 4 格 |
| `luxury` | 奢侈品 | 第 2 行第 5 格 |

## Event Type 对应

| Type | 中文 | 图标裁切建议 |
|------|------|--------------|
| `harvest_bumper` | 丰收 | 第 1 行第 1 格 |
| `factory_rush` | 工厂满产 | 第 1 行第 2 格 |
| `energy_supply` | 能源宽松 | 第 1 行第 3 格 |
| `auto_fair` | 车展季 | 第 1 行第 4 格 |
| `tech_launch` | 新品发布 | 第 2 行第 1 格 |
| `luxury_fair` | 高端展会 | 第 2 行第 2 格 |
| `logistics_jam` | 物流拥堵 | 第 2 行第 3 格 |
| `cold_chain_break` | 冷链中断 | 第 2 行第 4 格 |

## 注意事项

- 这些 PNG 为 AI 生成概念资产，正式入前端前需要裁切、压缩、统一尺寸与人工质检。
- `ui/fst-light-hud-art-direction.png` 是视觉母版，包含抽象 UI 占位，不应直接作为真实界面截图使用。
- `maps/yangtze-delta-light-map-concept.png` 是风格参考图，不是精确 GIS 地图；实际交互仍应使用 `content/world/geo/yangtze_6` 坐标。
- 当前 v1 SVG 资产仍保留，v2 不破坏现有前端引用路径。
