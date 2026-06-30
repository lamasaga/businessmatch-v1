# 三引擎商品与功能图标设计清单

> **Phase**：A  
> **范围**：FST / TECH / OPS 学生端与控场端图标资产  
> **最后更新**：2026-06-29  

---

## 1. 总体风格

　　三套引擎不应各自长成三套互不相干的玩具盒。建议以现有 `fushengji` 商品 SVG 和 `common-ui` HUD 概念图为底座，建立一套“商业模拟教育”共通视觉语言：轮廓清楚、识别优先、色块克制，避免过度写实。

| 层级 | 推荐格式 | 视觉原则 |
|------|----------|----------|
| UI 功能图标 | SVG | 24px 网格，2px 线宽，单色可变色 |
| 商品/资源图标 | SVG 优先 | 48px / 64px 网格，轻色块 + 轮廓，适合卡片和地图 |
| 插画级商品图 | WebP | 用于大卡、教程、宣传，不直接替代小图标 |
| 角色/场景 | WebP / PNG | 透明需求强时 PNG，常规运行时优先 WebP |

---

## 2. 共用图标族

　　以下图标跨 FST、TECH、OPS 都会反复出现，建议放入 `art-assets/common-ui/icons/`，运行时进入 `public/assets/common-ui/icons/`。

| asset_key | 中文名 | 用途 | 建议母题 |
|-----------|--------|------|----------|
| `ui_cash` | 现金 | 预算、现金、资产 | 钱包 + 小硬币 |
| `ui_budget` | 预算 | TECH/OPS 投入条 | 票据/账本 |
| `ui_inventory` | 库存 | FST/OPS 库存 | 纸箱 + 仓库线 |
| `ui_market` | 市场 | 城市市场/客群 | 店铺招牌 |
| `ui_demand` | 需求 | FST 供需、事件影响 | 上升曲线 + 人群 |
| `ui_supply` | 供给 | FST 产出、供应 | 箱堆 + 出库箭头 |
| `ui_route` | 路线 | FST 路线、TECH 路径 | 路径节点 |
| `ui_auction` | 拍卖 | OPS 拍卖阶段 | 拍卖槌 + 标签 |
| `ui_report` | 报表 | 结算、财务、复盘 | 报表页 + 柱线 |
| `ui_rank` | 排名 | 排行榜 | 奖杯 + 序号 |
| `ui_event` | 事件 | 随机事件、新闻 | 闪电提示牌 |
| `ui_ai` | AI 队伍 | AI 对手/角色 | 芯片头像 |

---

## 3. FST 商品图标

　　FST 已有 16 个商品 SVG，运行时路径为 `webapp/frontend/public/assets/fushengji/v1/items/`。这一组应作为三引擎商品资产的“贸易基础库”，不要重复造一套同名图标。

| asset_key | 中文名 | 当前资源 | 设计定位 |
|-----------|--------|----------|----------|
| `grain` | 粮食 | 已有 | 基础民生，米袋/麦穗 |
| `produce` | 生鲜 | 已有 | 鲜果蔬菜，强调易损 |
| `raw_materials` | 原材料 | 已有 | 矿石/木材/钢坯 |
| `energy` | 能源 | 已有 | 电力/燃料 |
| `chemicals` | 化工品 | 已有 | 试剂瓶/化学桶 |
| `medicine` | 医药 | 已有 | 药盒/十字标识 |
| `furniture` | 家具 | 已有 | 椅/柜轮廓 |
| `textile` | 纺织 | 已有 | 布卷/线轴 |
| `apparel` | 服饰 | 已有 | 上衣/吊牌 |
| `machinery` | 机械 | 已有 | 齿轮/机床 |
| `daily_goods` | 日用品 | 已有 | 洗护/纸品 |
| `appliances` | 家电 | 已有 | 小家电轮廓 |
| `digital_device` | 数码设备 | 已有 | 手机/芯片 |
| `passenger_car` | 乘用车 | 已有 | 汽车侧影 |
| `cultural_goods` | 文创 | 已有 | 书本/票券/笔 |
| `luxury` | 奢侈品 | 已有 | 宝石/礼盒 |

　　建议新增 FST 辅助图标：

| asset_key | 中文名 | 用途 | 建议母题 |
|-----------|--------|------|----------|
| `fst_distributor` | 分销商 | 自动买卖机制 | 店铺 + 握手 |
| `fst_city_supply` | 城市供给 | 城市供给面板 | 工厂 + 上箭头 |
| `fst_city_demand` | 城市需求 | 城市需求面板 | 人群 + 购物袋 |
| `fst_price_spread` | 价差 | 路线/机会提示 | 两地价格标签 |
| `fst_cargo_capacity` | 载货量 | 车辆状态 | 货车 + 箱数 |
| `fst_risk_weather` | 天气风险 | 城市事件 | 云雨 + 路线 |

---

## 4. TECH 商品与路线图标

　　TECH 的核心不是“买卖具体商品”，而是围绕产品路线、用户增长和预算投入做取舍。图标应更像“创业产品与增长资产”，不是 FST 那种货物箱。

### 4.1 产品原型图标

| asset_key | 中文名 | 用途 | 建议母题 |
|-----------|--------|------|----------|
| `tech_product_app` | 应用产品 | 产品命名/概况 | 手机界面 + 星点 |
| `tech_product_device` | 智能硬件 | 主题产品 | 小设备 + 芯片 |
| `tech_product_service` | 服务平台 | B2B/B2C 服务 | 云端窗口 |
| `tech_product_content` | 内容产品 | 品牌/Show 路线 | 播放卡片 |
| `tech_product_tool` | 效率工具 | Tech 路线 | 扳手 + 窗口 |
| `tech_product_community` | 社区产品 | User 路线 | 气泡 + 人群 |

### 4.2 四路线图标

| asset_key | 中文名 | 用途 | 建议母题 | 主色 |
|-----------|--------|------|----------|------|
| `tech_route_tech` | 技术驱动 | 路线选择、投入 | 芯片/电路 | 蓝 |
| `tech_route_user` | 用户深耕 | 路线选择、投入 | 人群/心智 | 灰蓝 |
| `tech_route_brand` | 品牌传播 | 路线选择、投入 | 扩音器/星标 | 金 |
| `tech_route_pathfinder` | 破局奇兵 | 路线选择、投入 | 罗盘/闪电 | 金蓝混合 |

### 4.3 投入与反馈图标

| asset_key | 中文名 | 用途 | 建议母题 |
|-----------|--------|------|----------|
| `tech_invest_rnd` | 研发投入 | 投入面板 | 烧杯 + 芯片 |
| `tech_invest_growth` | 增长投入 | 投入面板 | 上升箭头 + 用户 |
| `tech_invest_brand` | 品牌投入 | 投入面板 | 扩音器 + 光芒 |
| `tech_market_city` | 城市市场 | 城市卡片 | 楼群 + 定位点 |
| `tech_feedback_score` | 加权总分 | HUD/KPI | 仪表盘 |
| `tech_feedback_fit` | 匹配度 | 城市反馈 | 拼图/靶心 |

---

## 5. OPS 商品与经营图标

　　OPS 的商品资产应服务“生产经营销售”链条：品类、生产、渠道、广告、库存、报表、拍卖资源。它比 FST 更公司经营，比 TECH 更实体经营。

### 5.1 产品品类图标

| asset_key | 中文名 | 用途 | 建议母题 |
|-----------|--------|------|----------|
| `ops_category_electronics` | 3C 电子 | 产品定位 | 手机 + 闪电 |
| `ops_category_fmcg` | 快消品 | 产品定位 | 洗护瓶 + 购物袋 |
| `ops_category_home` | 家居用品 | 产品定位 | 小房子 + 椅子 |
| `ops_category_premium` | 高端产品 | 扩展品类 | 礼盒 + 金标 |
| `ops_category_student` | 校园产品 | 主题包 | 书包 + 标签 |
| `ops_category_health` | 健康产品 | 主题包 | 药盒 + 心形 |

### 5.2 经营动作图标

| asset_key | 中文名 | 用途 | 建议母题 |
|-----------|--------|------|----------|
| `ops_action_production` | 生产量 | 决策表单 | 产线 + 箱子 |
| `ops_action_price` | 定价 | 决策表单 | 价格标签 |
| `ops_action_marketing` | 营销 | 决策表单 | 扩音器 |
| `ops_action_rnd` | 研发 | 决策表单 | 烧杯/芯片 |
| `ops_action_salesforce` | 销售人员 | 决策表单 | 工牌 + 人像 |
| `ops_action_city_entry` | 城市进入 | 决策表单 | 城市 + 箭头 |

### 5.3 拍卖资源图标

| asset_key | 中文名 | 用途 | 建议母题 |
|-----------|--------|------|----------|
| `ops_auction_production_line` | 生产线 | 拍卖 A | 传送带/机械臂 |
| `ops_auction_material_discount` | 原料折扣 | 拍卖 A | 原料箱 + 折扣标 |
| `ops_auction_ad_slot` | 广告位 | 拍卖 A | 广告牌 |
| `ops_auction_channel` | 独家渠道 | 拍卖 B | 门店网络 |
| `ops_auction_brand_endorsement` | 品牌代言 | 拍卖 B | 星标人物牌 |
| `ops_auction_legal_protection` | 法律保护 | 拍卖 B | 盾牌 + 文书 |
| `ops_auction_data_resource` | 数据资源 | 拍卖 B | 数据库 + 光点 |

### 5.4 财务反馈图标

| asset_key | 中文名 | 用途 | 建议母题 |
|-----------|--------|------|----------|
| `ops_finance_revenue` | 收入 | 报表 | 收款单 |
| `ops_finance_cost` | 成本 | 报表 | 账单 |
| `ops_finance_profit` | 利润 | 报表 | 上升现金 |
| `ops_finance_inventory` | 库存 | 报表 | 仓库箱 |
| `ops_finance_net_assets` | 净资产 | HUD/排名 | 金库 |
| `ops_finance_cashflow` | 现金流 | 报表 | 流动箭头 |

---

## 6. 落地目录建议

```text
art-assets/
  common-ui/
    icons/
      ui_cash.svg
      ui_budget.svg
      ui_inventory.svg
      ...
  engines/
    tech/
      icons/
      products/
      manifest.yaml
    ops/
      icons/
      products/
      auction/
      manifest.yaml
  fushengji/
    items/
    icons/
```

运行时复制到：

```text
webapp/frontend/public/assets/common-ui/icons/
webapp/frontend/public/assets/techventure/v1/
webapp/frontend/public/assets/ops/v1/
webapp/frontend/public/assets/fushengji/v1/
```

---

## 7. 制作优先级

| 优先级 | 资产 | 原因 |
|--------|------|------|
| P0 | `ui_cash`、`ui_budget`、`ui_inventory`、`ui_report`、`ui_rank` | 三引擎通用，立刻提升 HUD 可读性 |
| P0 | TECH 四路线图标 | 当前 TECH 依赖路线选择，视觉锚点最强 |
| P0 | OPS 3 个产品品类 + 6 个经营动作 | 当前 OPS 开局和决策表单最需要识别 |
| P1 | OPS 拍卖资源 7 个 | 拍卖大厅和复盘会更直观 |
| P1 | FST 分销商、供给、需求、价差 | 对应新机制，能解释自动买卖和城市差异 |
| P2 | TECH 产品原型 6 个 | 用于主题包和产品命名增强 |

