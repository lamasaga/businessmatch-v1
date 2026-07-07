# Premium SVG UI Kit

> **Phase**: A
> **范围**: 主界面、赛事入口、三类赛事引擎、组织者面板通用美术素材
> **最后更新**: 2026-07-07

本目录是一套面向运行时复用的 SVG 源资产。和旧的 PNG 图标板不同，这里以“单件 SVG”为正式交付形态，便于前端按需引用、改色、缩放和做状态切换；`sheets/` 只作为四宫格预览板，方便评审和统一风格。

## 使用原则

| 用途 | 推荐引用 | 说明 |
|------|----------|------|
| 前端运行时 | `icons/`、`buttons/`、`frames/`、`indicators/`、`badges/` 下的单件 SVG | 每个文件都是完整独立资产 |
| 设计审阅 | `sheets/` | 每张预览板包含 4 个资产，不建议直接进入运行时代码 |
| 小尺寸按钮图标 | 优先用 `icons/` 或 lucide | 本包图标适合 32px 至 128px，极小尺寸仍以线性图标为主 |
| 大卡片、赛事入口、结果页 | 可用本包图标或旧 PNG 高质感图标板 | SVG 更适合清晰 UI，PNG 更适合插画氛围 |

## 视觉语言

| 角色 | 色彩 | 对应项目区域 |
|------|------|--------------|
| 主操作 / 荣誉 / 奖励 | `#d4a853`、`#f6c344`、`#fff0a8` | 首页、赛事入口、排名、奖励 |
| 成功 / 成长 / 可执行 | `#2dd4a0` | Career、确认反馈、行动可用状态 |
| 组织者 / OPS / 报表 | `#2563eb`、`#3b82f6`、`#93c5fd` | 组织者端、运营面板、蓝色仪表 |
| 风险 / 拍卖 / 事件 | `#f59e0b`、`#d97706` | OPS 拍卖、风险提示、事件横幅 |
| 暗色竞赛 HUD | `#080b10`、`#111820`、`#1f2937` | 学生端比赛、FST/TECH HUD |

## 资产清单

### icons

| asset_key | 文件 | 建议用途 |
|-----------|------|----------|
| `platform-career` | `icons/platform-career.svg` | Career、成长、XP、学生档案 |
| `platform-arena` | `icons/platform-arena.svg` | 正式赛、排行榜、奖杯、赛事入口 |
| `platform-academy` | `icons/platform-academy.svg` | 课程、知识库、教学计划 |
| `platform-camp` | `icons/platform-camp.svg` | 夏令营、活动、营内房间 |
| `engine-fst-trade` | `icons/engine-fst-trade.svg` | FST 交易、城市路线、运输 |
| `engine-techventure` | `icons/engine-techventure.svg` | TechVenture、创业、研发、发布 |
| `engine-ops-market` | `icons/engine-ops-market.svg` | OPS、生产、运营、资源竞拍 |
| `engine-finance-portfolio` | `icons/engine-finance-portfolio.svg` | 财务、资产组合、结算、风险 |
| `business-cashflow` | `icons/business-cashflow.svg` | 现金流、收入、成本、资金 |
| `business-inventory` | `icons/business-inventory.svg` | 库存、仓储、产能、货物 |
| `business-market-signal` | `icons/business-market-signal.svg` | 市场信号、需求、价格趋势 |
| `business-contract` | `icons/business-contract.svg` | 合约、合作、城市进入、官方承诺 |

### buttons

| asset_key | 文件 | 建议用途 |
|-----------|------|----------|
| `button-primary-gold` | `buttons/button-primary-gold.svg` | 开始、提交、确认等主操作 |
| `button-secondary-glass` | `buttons/button-secondary-glass.svg` | 次级操作、暗色 HUD 按钮 |
| `button-ops-blue` | `buttons/button-ops-blue.svg` | 组织者端、OPS 面板、后台操作 |
| `button-warning-amber` | `buttons/button-warning-amber.svg` | 风险、拍卖、紧急事件按钮 |

### frames

| asset_key | 文件 | 建议用途 |
|-----------|------|----------|
| `frame-glass-panel` | `frames/frame-glass-panel.svg` | 暗色面板、比赛 HUD、赛事卡片 |
| `frame-metric-card` | `frames/frame-metric-card.svg` | KPI、财务、资源数值卡 |
| `frame-event-banner` | `frames/frame-event-banner.svg` | 事件通知、新闻、机会提示 |
| `frame-modal-shell` | `frames/frame-modal-shell.svg` | 弹窗、确认、结算详情 |

### indicators

| asset_key | 文件 | 建议用途 |
|-----------|------|----------|
| `indicator-success` | `indicators/indicator-success.svg` | 成功、完成、通过 |
| `indicator-warning` | `indicators/indicator-warning.svg` | 警告、风险、资源不足 |
| `indicator-danger` | `indicators/indicator-danger.svg` | 失败、阻断、惩罚 |
| `indicator-info` | `indicators/indicator-info.svg` | 信息、提示、中性反馈 |

### badges

| asset_key | 文件 | 建议用途 |
|-----------|------|----------|
| `badge-champion` | `badges/badge-champion.svg` | 冠军、排名、荣誉 |
| `badge-xp` | `badges/badge-xp.svg` | 经验值、成长奖励 |
| `badge-official` | `badges/badge-official.svg` | 正式赛、认证房间 |
| `badge-reward` | `badges/badge-reward.svg` | 奖励、礼包、解锁 |

## 四宫格预览板

| 文件 | 内容 |
|------|------|
| `sheets/sheet-01-platform-icons.svg` | Career / Arena / Academy / Camp |
| `sheets/sheet-02-engine-icons.svg` | FST / TechVenture / OPS / Finance |
| `sheets/sheet-03-business-icons.svg` | Cashflow / Inventory / Market / Contract |
| `sheets/sheet-04-buttons.svg` | 4 种按钮壳 |
| `sheets/sheet-05-frames.svg` | 4 种边框与面板 |
| `sheets/sheet-06-indicators.svg` | 4 种状态指示 |
| `sheets/sheet-07-badges.svg` | 4 种徽章 |

## 落地建议

运行时可复制到：

```text
webapp/frontend/public/assets/common-ui/premium-svg/
webapp/organizer-frontend/public/assets/common-ui/premium-svg/
```

前端若直接以内联 SVG 方式使用，建议把颜色变量抽象到组件层；若以 `<img>` 引用，则保持本文件的渐变和阴影即可。
