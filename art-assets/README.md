# 美术资源库（根目录）

> **定位**：商赛 / 浮生记等产品用 **可商用免费素材** 的本地归档，供 `webapp/frontend/public/` 或 Vite 引用。  
> **许可纪律**：仅收录 **CC0 / 明确允许商用** 的素材；每包保留 `sources/` 原 ZIP 与 `LICENSE-*.txt`。  
> **最后更新**：2026-06-28

---

## 按赛事引擎浏览

| 引擎 | 导航 | 实际素材 |
|------|------|----------|
| **FST** 浮生记 | [engines/fst/](./engines/fst/README.md) | [fushengji/](./fushengji/README.md) |
| **TECH** 创想大赢家 | [engines/tech/](./engines/tech/README.md) | 占位，待补齐 |
| **OPS** 生产经营销售赛 | [engines/ops/](./engines/ops/README.md) | 占位，待补齐 |
| **跨引擎 UI** | [common-ui/](./common-ui/README.md) | Academy Dashboard + Neon Arena kit |

　　总索引：[engines/README.md](./engines/README.md)

---

## 目录结构（物理）

| 路径 | 内容 |
|------|------|
| [engines/](./engines/README.md) | 三引擎美术导航（逻辑分包） |
| [common-ui/](./common-ui/) | 跨比赛引擎通用 UI 图标与 HUD 概念资产 |
| [fushengji/](./fushengji/) | 浮生记 RTS 专用分包（FST 真身，对齐 PRD §5.2） |
| `fushengji/icons/` | UI、货币、状态类小图标 |
| `fushengji/items/` | 商品/物资类（十品映射） |
| `fushengji/characters/` | 人物、头像、NPC 立绘向 |
| `fushengji/maps/` | 地图底图、城节点、路网示意 |
| `fushengji/vehicles/` | 车辆、仓库、物流 |
| `fushengji/animations/` | 精灵图、简单动效帧 |
| `fushengji/events/` | 事件条插画 |
| `fushengji/ui/` | 面板、按钮、进度条 |
| `fushengji/sources/` | 原始 ZIP（game-icons 等）+ [ATTRIBUTION](./fushengji/sources/ATTRIBUTION.md) |

　　**v0.1 已收录**：十品商品 SVG、六城节点、长三角示意底图、车辆/事件/UI/轻动效占位；详见 [fushengji/README](./fushengji/README.md)。

---

## 与工程对接

- 开发拷贝：将精选 PNG/SVG 复制到 `webapp/frontend/public/assets/<engine>/v1/`  
- FST 清单：`fushengji/manifest.yaml` 列出 `asset_key` → 相对路径  

---

## 维护

- 新引擎素材：先读 `engines/<id>/README.md`，再写入对应目录 + 更新 manifest  
- 勿提交未注明许可的素材  
