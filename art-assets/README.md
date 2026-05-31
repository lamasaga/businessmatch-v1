# 美术资源库（根目录）

> **定位**：商赛 / 浮生记等产品用 **可商用免费素材** 的本地归档，供 `webapp/frontend/public/` 或 Vite 引用。  
> **许可纪律**：仅收录 **CC0 / 明确允许商用** 的素材；每包保留 `sources/` 原 ZIP 与 `LICENSE-*.txt`。  
> **最后更新**：2026-05-30

---

## 目录结构

| 路径 | 内容 |
|------|------|
| [fushengji/](./fushengji/) | 浮生记 RTS 专用分包（对齐 PRD §5.2） |
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

## 与工程对接（规划）

- 开发拷贝：将精选 PNG/SVG 复制到 `webapp/frontend/public/assets/fushengji/v1/`  
- 清单：`fushengji/manifest.yaml` 列出 `asset_key` → 相对路径  

---

## 维护

- 新增素材：写入对应子目录 + 更新 `fushengji/sources/ATTRIBUTION.md`  
- 勿提交未注明许可的素材  
