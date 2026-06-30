# POP 拟真城市模拟器 PRD · 微观社会涌现设计验证工具

> **引擎简称**：POP-SIM
> **引擎 ID**：`pop_simulator`
> **配置 ID**：`pop-simulator-v1`
> **中文名**：POP 拟真城市模拟器
> **英文名**：POP Agent-Based City Simulator
> **运行时**：`web-tool`（单页 HTML + Canvas + Chart.js）
> **设计模式**：`standalone`
> **版本**：`1.0.0`
> **最后更新**：2026-06-15
> **状态**：🟢 已定稿

---

## 1. 元信息

| 字段 | 值 |
|------|-----|
| **引擎中文名** | POP 拟真城市模拟器 |
| **引擎英文名** | POP Agent-Based City Simulator / POP-SIM |
| **引擎 ID** | `pop_simulator` |
| **配置包 ID** | `pop-simulator-v1` |
| **版本** | `1.0.0` |
| **设计模式** | `standalone`（浏览器本地运行，不依赖后端） |
| **运行时类型** | `web-tool`（静态 HTML/JS，零构建） |
| **表前缀** | 无（不在数据库中持久化） |
| **后端路由前缀** | 无 |
| **前端路由** | 本地文件 `scripts/pop-simulator/index.html` |
| **参考文档** | `docs/archive/engineering-academy/70-POP机制与社会模拟/`、`docs/archive/engineering-academy/80-POP拟真城市/` |
| **目标学段** | 设计师、教师、高中生及以上 |
| **单局时长** | 5~30 分钟（自由运行） |

---

## 2. 产品定位

### 2.1 一句话玩法

**一个可调参数的浏览器端微观社会模拟器**：设计者调整 POP（人群聚合体）的初始结构、外部政策与市场环境，单步或连续运行，观察城市经济与社会指标如何从个体行为中涌现出来。

### 2.2 核心教育目标

| # | 能力 | 说明 |
|---|------|------|
| 1 | **理解微观到宏观的涌现** | 通过调整单个 POP 的收入、需求、迁移规则，观察 GDP、失业率、通胀等宏观指标的波动 |
| 2 | **感知反馈闭环** | 看到「工资上升 → 消费增加 → 价格上涨 → 企业扩产 → 工资再上升」的正反馈与负反馈 |
| 3 | **分析政策效果** | 调整税收、最低工资、补贴、利率，观察对就业、不平等、满意度的影响 |
| 4 | **识别非线性与阈值效应** | 体验迁移潮、失业潮、房地产泡沫、技术替代等涌现现象 |
| 5 | **培养数据化设计思维** | 用可视化图表验证 POP 设计假设，而非凭直觉拍脑袋 |

### 2.3 目标受众

| 维度 | 说明 |
|------|------|
| **目标年龄** | 14 岁以上（高中生、大学生、教师、设计师） |
| **使用场景** | 课堂演示、引擎设计验证、学生自主探索 |
| **单场人数** | 1 人操作，可投屏供全班观看 |
| **决策类型** | 参数调节 + 实时观察 + 假设验证 |
| **设备要求** | 任意可运行现代浏览器的设备 |

### 2.4 单局节奏

```
┌────────────────────────────────────────────────────────────┐
│  0:00  加载默认预设或导入配置                                  │
│  0:30  在左侧面板调整 POP 结构、政策、外部环境参数             │
│  2:00  点击「运行」或「单步推进」，观察右侧可视化面板           │
│  5:00  发现涌现现象（失业潮 / 通胀 / 迁移 / 产业升级）         │
│  10:00 暂停，导出当前配置或截图，记录设计结论                  │
│  任意  重置为预设，开始新一轮对比实验                          │
└────────────────────────────────────────────────────────────┘
```

---

## 3. 核心循环

### 3.1 完整流程图

```
打开模拟器
  ├── 加载默认预设 / 用户导入 JSON 配置
  ├── 初始化 POP 组、企业、商品、区域
  └── 渲染参数面板 + 可视化面板
      ↓
用户调节参数
  ├── POP 基础设置（规模、职业、收入、财富、教育）
  ├── 企业与市场设置（生产率、工资、价格、产能）
  ├── 政策设置（税收、最低工资、补贴、公共支出）
  └── 外部环境（利率、出口、移民、技术冲击、随机事件）
      ↓
运行控制
  ├── 单步推进：执行 1 个 tick 的完整结算
  ├── 连续运行：按设定速度自动推进
  ├── 暂停 / 继续
  └── 重置：恢复到当前预设的初始状态
      ↓
每 tick 结算
  ├── 外部冲击更新
  ├── 企业生产
  ├── 收入分配
  ├── 市场清算（商品、劳动力、住房）
  ├── POP 消费、储蓄、满意度更新
  ├── POP 迁移与职业升级/降级
  ├── 企业投资与产能调整
  └── 宏观指标计算
      ↓
可视化输出
  ├── 时间序列：GDP、CPI、失业率、基尼系数、满意度
  ├── 区域地图：人口密度、收入、就业、房价
  ├── 分布图：财富分布、职业结构、消费结构
  ├── 流向图：迁移流、商品供需流
  └── 事件日志：迁移潮、企业倒闭、政策触发
      ↓
用户再次调节参数或结束实验
```

### 3.2 状态机

| 状态 | 触发条件 | 可执行操作 |
|------|----------|-----------|
| `editing` | 初始化完成或重置后 | 调节参数、选择预设、导入配置 |
| `running` | 用户点击「运行」 | 连续执行 tick，可视化实时更新 |
| `paused` | 用户点击「暂停」或连续运行中触发断点 | 单步推进、继续运行、重置、导出 |
| `finished` | 达到最大 tick 数或用户主动停止 | 查看复盘、导出数据 |

### 3.3 推进规则

- **结算粒度**：每个 tick 代表一个决策周期（如一个月或一季度），默认 `tick_duration = "month"`。
- **推进者**：用户是唯一的推进触发者；无后台调度器。
- **确定性**：给定相同的初始状态和参数，使用固定随机种子时结果可复现。
- **并发**：单线程 JavaScript 顺序执行，无并发问题。
- **性能目标**：1000 个 POP 组、50 家企业、20 个区域、6 类商品的 tick 结算 < 200ms。

---

## 4. 决策设计

### 4.1 用户可调参数列表

| 参数类别 | 参数名 | 英文名 | 类型 | 默认值 | 说明 |
|----------|--------|--------|------|--------|------|
| **POP 基础** | 总人口 | `total_population` | int | 10000 | 城市初始人口 |
| | 低技能工人占比 | `low_skill_ratio` | float | 0.35 | 0~1 |
| | 高技能工人占比 | `high_skill_ratio` | float | 0.25 | 0~1 |
| | 专业技术人员占比 | `professional_ratio` | float | 0.15 | 0~1 |
| | 资本家占比 | `capitalist_ratio` | float | 0.05 | 0~1 |
| | 失业/无业占比 | `unemployed_ratio` | float | 0.10 | 0~1 |
| | 学生占比 | `student_ratio` | float | 0.05 | 0~1 |
| | 退休人员占比 | `retiree_ratio` | float | 0.05 | 0~1 |
| | 平均教育水平 | `avg_education` | float | 4.0 | 0~10 |
| | 初始财富不平等 | `wealth_inequality` | float | 0.30 | 0~1，基尼系数目标 |
| **企业与市场** | 企业数量 | `firm_count` | int | 20 | 每家企业雇佣若干 POP |
| | 基础生产率 | `base_productivity` | float | 1.0 | 单位劳动力产出 |
| | 基础工资 | `base_wage` | float | 3000 | 低技能工人月工资 |
| | 技能工资溢价 | `skill_premium` | float | 1.8 | 高技能相对低技能工资倍数 |
| | 企业留存利润投资率 | `investment_rate` | float | 0.30 | 0~1 |
| | 进口供给量 | `import_supply` | float | 200 | 每类商品基础进口量（按人口与商品权重缩放） |
| | 出口需求量 | `export_demand` | float | 200 | 每类商品基础出口量（按人口与商品权重缩放） |
| **政策** | 所得税率 | `income_tax_rate` | float | 0.15 | 0~1 |
| | 企业税率 | `corporate_tax_rate` | float | 0.20 | 0~1 |
| | 最低工资 | `minimum_wage` | float | 2500 | 月工资下限 |
| | 失业救济 | `unemployment_benefit` | float | 1200 | 每人每月 |
| | 教育投入 | `education_spending` | float | 500000 | 每 tick 总投入 |
| | 公共支出 | `public_spending` | float | 300000 | 每 tick 政府购买 |
| | 住房补贴 | `housing_subsidy` | float | 0.10 | 0~1，覆盖租房成本比例 |
| **外部** | 基准利率 | `interest_rate` | float | 0.03 | 年利率 |
| | 移民流入率 | `immigration_rate` | float | 0.001 | 每 tick 占人口比例 |
| | 技术冲击 | `tech_shock` | float | 1.0 | 全要素生产率乘数 |
| | 随机事件概率 | `event_probability` | float | 0.05 | 每 tick 触发概率 |
| | 外部需求冲击 | `external_demand_shock` | float | 1.0 | 出口需求乘数 |
| **空间** | 区域数量 | `district_count` | int | 4 | 2~12 |
| | 区域住房供给 | `housing_supply_per_district` | int | 3000 | 每个区域上限 |
| | 通勤成本 | `commute_cost` | float | 500 | 跨区工作月成本 |
| | 商业用地比例 | `commercial_land_ratio` | float | 0.30 | 0~1 |

### 4.2 校验规则

1. `total_population >= 1000`
2. 所有职业占比之和等于 1.0（允许 ±0.001 浮点误差）
3. `0 <= ratio <= 1` 对所有占比、税率、补贴率
4. `minimum_wage >= 0`
5. `district_count` 在 2~12 之间
6. `firm_count >= 1`
7. 当用户修改某项占比时，系统提示「是否需要按比例缩放其他类别」
8. 保存配置时，若参数越界，高亮越界字段并禁止运行

### 4.3 参数执行效果

| 参数 | 执行效果 |
|------|----------|
| `total_population` | 重置时按比例生成 POP 组规模 |
| `minimum_wage` | 企业支付工资不得低于该值；无法覆盖时可能裁员 |
| `income_tax_rate` | POP 税后收入 = 税前收入 × (1 - 税率) |
| `education_spending` | 每 tick 提升 POP 教育水平，提高升级概率 |
| `immigration_rate` | 每 tick 按概率在随机区域生成新 POP 组 |
| `tech_shock` | 企业产出 = 劳动力 × 生产率 × `tech_shock` |
| `event_probability` | 每 tick 按概率触发一次外部事件 |

### 4.4 特殊规则

- **参数实时生效**：除总人口、区域数量、企业数量等结构性参数外，其余参数在运行过程中修改后下一 tick 立即生效。
- **结构性参数锁定**：运行中禁止修改 `total_population`、`district_count`、`firm_count`；需先重置。
- **随机种子**：默认使用当前时间戳作为种子；用户可手动输入种子以复现实验。
- **事件覆盖**：随机事件触发后，在事件日志中显示，并对相关参数产生临时影响（如原材料涨价持续 3 个 tick）。

---

## 5. 结算规则

### 5.1 结算函数签名

```javascript
function step(state, params, rng) {
  /**
   * 推进一个 tick。
   * 纯函数：不修改输入 state，返回新的 state。
   * 确定性：相同 state、params、rng 种子产生相同输出。
   */
  return nextState;
}
```

```javascript
function reset(params, seed) {
  /**
   * 根据参数生成初始状态。
   * 返回包含 pops、firms、districts、goods、history、events 的完整状态对象。
   */
  return initialState;
}
```

### 5.2 单 tick 结算流程

1. **外部冲击与事件**
   - 根据 `event_probability` 决定是否触发随机事件。
   - 应用 `tech_shock`、`external_demand_shock`、`immigration_rate`。

2. **企业生产**
   ```javascript
   output_firm = labor_firm * productivity_firm * tech_shock
   ```
   - 劳动力市场按企业工资与岗位空缺匹配 POP。

3. **收入分配**
   - 工资：企业按岗位支付工资，受 `minimum_wage` 下限约束。
   - 资本收入：资本家获得企业税后利润分红。
   - 转移支付：无业者、失业者、退休人员领取救济/养老金。
   - 税收：从工资、利润中扣除，进入政府账户。

4. **市场清算**
   - 对每类商品计算总需求与总供给：
     ```javascript
     demand_good = sum(pop.demand_for(good))
     supply_good = sum(firm.output_of(good)) + import_supply_good
     ```
   - 价格调整：
     ```javascript
     price_ratio = demand_good / max(supply_good, 1)
     new_price = old_price * (1 + price_adjustment_speed * (price_ratio - 1))
     new_price = clamp(new_price, base_price * 0.2, base_price * 5.0)
     ```

5. **POP 消费与储蓄**
   - 可支配收入：
     ```javascript
     disposable_income = income - tax - housing_cost + transfers
     ```
   - 按生存 → 日常 → 发展 → 享受优先级分配预算：
     ```javascript
     affordable = min(desired_qty, disposable_income / price)
     ```
   - 储蓄：
     ```javascript
     savings = disposable_income * savings_rate
     wealth += savings
     ```

6. **满意度更新**
   ```javascript
   satisfaction = f(income, housing_cost, consumption_fulfillment, commute, unemployment)
   satisfaction = clamp(satisfaction, 0, 10)
   ```

7. **迁移与职业变动**
   - 迁移意愿：
     ```javascript
     push = w1 * (10 - satisfaction) + w2 * unemployment_rate + w3 * housing_cost / income
     pull = w4 * wage_diff + w5 * job_vacancy_rate + w6 * housing_affordability
     migration_intent = sigmoid(push - pull + random_noise)
     ```
   - 升级：教育水平超过阈值且存在高技能岗位空缺时，低技能工人升级。
   - 降级：长期失业或行业衰退时，高技能工人降级。

8. **企业投资与动态**
   - 盈利企业按 `investment_rate` 扩大产能。
   - 连续亏损企业裁员或退出市场；退出时释放劳动力。

9. **宏观指标计算**
   - GDP、失业率、CPI、基尼系数、平均满意度、房价指数。

10. **历史记录与事件日志**
    - 将宏观指标追加到 `history`。
    - 记录本 tick 的重大事件（迁移潮、企业倒闭、政策触发）。

### 5.3 核心公式

#### 5.3.1 需求函数

```javascript
// 某 POP 对某商品的需求量
desired_qty = base_need * pop.size * (income / reference_income) ** income_elasticity
                           * (price / reference_price) ** price_elasticity
```

- `base_need`：每人在该需求层级下的基准消费量。
- `income_elasticity`：收入弹性；奢侈品 > 1，生存品 0~0.5。
- `price_elasticity`：价格弹性；穷人 > 富人（绝对值）。

#### 5.3.2 工资决定

```javascript
market_wage = base_wage * skill_premium ** skill_level
            * (1 + labor_shortage_pressure)
            * (1 - unemployment_pressure)
actual_wage = max(market_wage, minimum_wage)
```

#### 5.3.3 迁移意愿

```javascript
migration_intent = sigmoid(
  push_weight * (10 - satisfaction)
  + unemployment_weight * (pop.unemployed / pop.size)
  + housing_pressure_weight * (housing_cost / max(income, 1))
  - wage_pull_weight * (target_district.avg_wage - current_district.avg_wage) / max(current_district.avg_wage, 1)
  - job_pull_weight * target_district.vacancy_rate
  - housing_pull_weight * target_district.housing_affordability
  + random_noise
)
```

#### 5.3.4 基尼系数（近似）

```javascript
// 对 POP 组按人均收入排序后，用梯形法计算洛伦兹曲线面积
sorted_pops = pops.sort((a, b) => a.income - b.income)
cumulative_pop = 0
cumulative_income = 0
lorenz_area = 0
for pop in sorted_pops:
    prev_pop = cumulative_pop
    prev_income = cumulative_income
    cumulative_pop += pop.size / total_population
    cumulative_income += pop.income * pop.size / total_income
    lorenz_area += (cumulative_income + prev_income) * (cumulative_pop - prev_pop) / 2
gini = 1 - 2 * lorenz_area
```

### 5.4 涌现指标定义

| 指标 | 计算公式 | 可视化方式 |
|------|----------|-----------|
| **GDP** | `C + I + G + (X - M)` | 时间序列折线 |
| **CPI** | `(本期价格指数 - 上期价格指数) / 上期价格指数` | 时间序列折线 |
| **失业率** | `失业人口 / 劳动力总人口` | 时间序列折线 |
| **基尼系数** | 收入不平等程度 | 时间序列折线 + 洛伦兹曲线 |
| **平均满意度** | 所有 POP 满意度加权平均 | 时间序列折线 |
| **房价指数** | 各区域住房成本加权平均 | 时间序列折线 + 区域热力图 |
| **职业结构** | 各职业 POP 占比 | 堆叠面积图 |
| **财富分布** | 按财富分组的 POP 占比 | 直方图 |

---

## 6. 内置预设与参照情景

> 本章替代传统「AI 对手」章节。模拟器不提供对抗 AI，而是提供一组可对比的基准情景。

### 6.1 预设配置

| 预设名称 | 设计目标 | 关键参数特征 |
|----------|----------|--------------|
| **均衡城市** | 作为默认对照组 | 中等税收、温和移民、稳定技术 |
| **工业衰退** | 观察失业潮与消费萎缩 | 高低技能工人、低出口、高企业税 |
| **房地产泡沫** | 观察正反馈与崩盘 | 低住房供给、高投资率、宽松信贷 |
| **技术替代** | 观察结构性失业与升级 | 高 `tech_shock`、低教育投入 |
| **高福利社会** | 观察财政再分配效果 | 高税收、高救济、高教育投入 |
| **移民潮冲击** | 观察劳动力市场与住房压力 | 高 `immigration_rate`、有限住房 |

### 6.2 预设加载规则

- 用户从下拉框选择预设后，参数面板全部更新为对应值。
- 选择预设不立即重置状态；用户需点击「重置」才能以新参数生成初始状态。
- 用户可在预设基础上自定义参数，自定义后预设名称显示为「自定义」。

---

## 7. 状态与数据

### 7.1 无数据库设计

POP-SIM 是纯浏览器端工具，不连接后端数据库。所有状态保存在内存中，用户可通过 JSON 导出/导入持久化。

### 7.2 运行时状态结构

```json
{
  "params": { "total_population": 10000, "base_wage": 3000, ... },
  "seed": 123456,
  "tick": 0,
  "max_ticks": 120,
  "status": "editing",
  "pops": [
    {
      "id": "pop-1",
      "profession": "low_skill_worker",
      "size": 350,
      "district_id": "d-0",
      "income_per_capita": 3000,
      "wealth": 5000,
      "education": 3.0,
      "satisfaction": 6.0,
      "migration_intent": 0.12,
      "employed_count": 320,
      "unemployed_count": 30,
      "consumption": { "food": 1200, "daily": 800, ... },
      "savings_rate": 0.10
    }
  ],
  "firms": [
    {
      "id": "firm-1",
      "sector": "manufacturing",
      "district_id": "d-0",
      "employees": 120,
      "wage": 3200,
      "productivity": 1.1,
      "output": 1500,
      "price": 12.0,
      "profit": 5000,
      "cash": 200000
    }
  ],
  "districts": [
    {
      "id": "d-0",
      "name": "中心区",
      "population": 4000,
      "housing_supply": 3000,
      "housing_cost": 2500,
      "avg_wage": 3500,
      "vacancy_rate": 0.05,
      "commercial_land": 0.30
    }
  ],
  "goods": [
    {
      "id": "food",
      "name": "食品",
      "category": "survival",
      "price": 8.0,
      "base_price": 8.0,
      "demand": 12000,
      "supply": 12500,
      "imports": 1000,
      "exports": 500
    }
  ],
  "history": [
    {
      "tick": 0,
      "gdp": 1200000,
      "unemployment_rate": 0.08,
      "cpi": 0.0,
      "gini": 0.32,
      "avg_satisfaction": 6.2
    }
  ],
  "events": [
    {
      "tick": 5,
      "type": "migration_wave",
      "message": "中心区人口向新区迁移，迁入 120 人",
      "affected_districts": ["d-0", "d-1"]
    }
  ]
}
```

### 7.3 导入/导出接口

| 操作 | 入口 | 说明 |
|------|------|------|
| 导出配置 | 「导出配置」按钮 | 下载 `pop-simulator-config.json`，仅包含 `params` 和 `seed` |
| 导出状态 | 「导出完整状态」按钮 | 下载 `pop-simulator-state.json`，包含完整运行时状态 |
| 导入配置 | 「导入配置」按钮 | 从 JSON 文件读取参数并填充面板 |
| 导入状态 | 「导入状态」按钮 | 恢复完整运行状态，可继续实验 |

### 7.4 大规模模拟设计

| 瓶颈 | 影响 | 缓解方案 |
|------|------|----------|
| POP 组数量过多 | 每 tick 计算量上升 | 使用聚合 POP，相同属性组合并；默认不超过 1000 组 |
| 图表渲染 | 时间序列数据点过多 | 历史记录最多保留 500 个 tick，超过时自动降采样 |
| 地图绘制 | 区域过多时 canvas 重绘慢 | 区域上限 12；使用脏矩形重绘 |

---

## 8. 前端设计

### 8.1 运行时选型

选择 **纯静态 HTML + 原生 JavaScript + Canvas + Chart.js（CDN）**，原因：
- 工具独立运行，不依赖项目构建流程或后端服务。
- 教师/学生可直接用浏览器打开文件使用。
- 便于快速迭代和嵌入到 `docs/archive/engineering-academy/` 文档中。

### 8.2 组件清单

| 组件 | 路径/ID | 说明 |
|------|---------|------|
| `ParameterPanel` | `#parameter-panel` | 左侧分组参数面板 |
| `PresetSelector` | `#preset-select` | 顶部预设下拉框 |
| `RunControl` | `#run-control` | 运行/暂停/单步/重置/速度 |
| `TimeSeriesChart` | `#chart-time-series` | GDP/CPI/失业率/基尼/满意度折线图 |
| `DistrictMap` | `#district-map` | 区域热力图：人口/收入/房价/就业 |
| `DistributionChart` | `#chart-distribution` | 财富分布直方图、职业结构堆叠图 |
| `EventLog` | `#event-log` | 事件时间线 |
| `PopTable` | `#pop-table` | POP 组明细表格 |
| `FirmTable` | `#firm-table` | 企业明细表格 |
| `ExportImport` | `#export-import` | 导入导出按钮组 |

### 8.3 主要交互流程

1. **打开页面**：加载默认预设「均衡城市」，渲染参数面板和空可视化面板。
2. **选择预设**：从下拉框切换预设，参数面板同步更新。
3. **调整参数**：拖动滑块或输入数值，实时显示当前值；越界时高亮提示。
4. **重置初始状态**：点击「重置」，根据当前参数生成新的初始城市状态。
5. **运行模拟**：点击「运行」，模拟器按设定速度自动推进；图表实时更新。
6. **单步观察**：点击「单步」，执行 1 个 tick 并暂停，方便讲解因果链。
7. **发现涌现**：观察事件日志和图表，暂停后调节参数继续实验。
8. **导出结果**：导出配置或完整状态，用于报告或分享。

### 8.4 状态管理

使用原生 JavaScript 模块组织：

```javascript
// simulator.js
const state = {
  params: {},
  current: null,   // 当前运行状态
  history: [],
  status: 'editing',
  seed: 0,
};

const actions = {
  reset(params, seed),
  step(),
  run(speed),
  pause(),
  loadPreset(name),
  exportConfig(),
  exportState(),
  importConfig(json),
  importState(json),
};
```

### 8.5 素材需求

| 素材类型 | 说明 |
|----------|------|
| 区域色块 | Canvas 绘制，无需图片 |
| 图表配色 | 使用 Chart.js 默认调色板，保持一致性 |
| 图标 | 使用 Tabler Icons（CDN）或 Unicode 符号 |
| 字体 | 系统默认无衬线字体，无需额外加载 |

---

## 9. 配置规格

### 9.1 JSON 配置顶层结构

```json
{
  "id": "pop-simulator-v1",
  "version": "1.0.0",
  "meta": {
    "name": "POP 拟真城市模拟器",
    "description": "用于验证 POP 机制与拟真城市设计的浏览器端微观社会模拟器",
    "author": "商识唯智"
  },
  "params": {
    "total_population": 10000,
    "low_skill_ratio": 0.35,
    "high_skill_ratio": 0.25,
    "professional_ratio": 0.15,
    "capitalist_ratio": 0.05,
    "unemployed_ratio": 0.10,
    "student_ratio": 0.05,
    "retiree_ratio": 0.05,
    "avg_education": 4.0,
    "wealth_inequality": 0.30,
    "firm_count": 20,
    "base_productivity": 1.0,
    "base_wage": 3000,
    "skill_premium": 1.8,
    "investment_rate": 0.30,
    "import_supply": 200,
    "export_demand": 200,
    "income_tax_rate": 0.15,
    "corporate_tax_rate": 0.20,
    "minimum_wage": 2500,
    "unemployment_benefit": 1200,
    "education_spending": 500000,
    "public_spending": 300000,
    "housing_subsidy": 0.10,
    "interest_rate": 0.03,
    "immigration_rate": 0.005,
    "tech_shock": 1.0,
    "event_probability": 0.05,
    "external_demand_shock": 1.0,
    "district_count": 4,
    "housing_supply_per_district": 3000,
    "commute_cost": 500,
    "commercial_land_ratio": 0.30
  },
  "presets": {
    "balanced": { ... },
    "industrial_decline": { ... },
    "housing_bubble": { ... },
    "tech_replacement": { ... },
    "high_welfare": { ... },
    "immigration_wave": { ... }
  }
}
```

### 9.2 关键参数说明

| 参数 | 默认值 | 单位 | 说明 |
|------|--------|------|------|
| `total_population` | 10000 | 人 | 城市初始总人口 |
| `base_wage` | 3000 | 元/月 | 低技能工人基准工资 |
| `skill_premium` | 1.8 | 倍数 | 高技能相对低技能工资倍数 |
| `investment_rate` | 0.30 | 比例 | 企业留存利润中用于扩产的比例 |
| `event_probability` | 0.05 | 每 tick | 随机事件触发概率 |
| `immigration_rate` | 0.005 | 每 tick | 移民流入占人口比例 |
| `district_count` | 4 | 个 | 城市区域数量 |
| `housing_supply_per_district` | 3000 | 套 | 每个区域住房上限 |

---

## 10. 实现参考与 Checklist

### 10.1 关键文件路径

| 路径 | 作用 |
|------|------|
| `scripts/pop-simulator/index.html` | 模拟器主页面 |
| `scripts/pop-simulator/simulator.js` | 核心模拟逻辑（初始化、结算、事件） |
| `scripts/pop-simulator/ui.js` | 前端交互与图表渲染 |
| `scripts/pop-simulator/style.css` | 样式 |
| `scripts/pop-simulator/simulator.js`（内置 `PRESETS`） | 默认预设配置 |

> 注：本次实现按需求置于 `scripts/pop-simulator/`；如需迁移到 `docs/archive/engineering-academy/pop-simulator/`，直接复制上述 4 个文件即可。

### 10.2 可复用模式

- **聚合 POP 模型**：将相同职业、区域、教育水平的 POP 合并为一组，便于在浏览器中模拟大规模人口。
- **纯函数结算**：`step(state, params, rng)` 不修改输入，便于时间旅行调试和结果复现。
- **事件驱动日志**：每 tick 只记录显著事件，降低渲染开销。

### 10.3 交付 Checklist

- [x] 创建 `scripts/pop-simulator/` 目录
- [x] 实现 `index.html` 页面结构和基础布局
- [x] 实现参数面板（滑块、数字输入、分组折叠）
- [x] 实现预设加载与参数校验
- [x] 实现 `reset(params, seed)` 初始状态生成
- [x] 实现 `step(state, params, rng)` 单 tick 结算
- [x] 实现生产、收入、市场清算、消费、迁移、升级、企业投资逻辑
- [x] 实现宏观指标计算（GDP、CPI、失业率、基尼、满意度、房价）
- [x] 实现时间序列折线图（Chart.js）
- [x] 实现区域热力图（Canvas）
- [x] 实现财富分布与职业结构图表
- [x] 实现事件日志与 POP/企业表格
- [x] 实现运行控制（运行/暂停/单步/重置/速度）
- [x] 实现配置导出/导入（JSON）
- [ ] 编写用户操作说明（页面内嵌帮助）
- [x] 手动测试 6 个预设场景，验证涌现现象可观测
- [ ] 性能测试：1000 POP 组、50 企业、4 区域连续运行 120 tick

### 10.4 性能红线

| 指标 | 目标 |
|------|------|
| 单 tick 结算延迟 | < 200ms（1000 POP 组、50 企业、4 区域） |
| 首屏加载时间 | < 2s（含 CDN 资源） |
| 连续运行时 UI 帧率 | > 15 FPS |
| 历史数据最大长度 | 500 tick，超出自动降采样 |
| 导出/导入 JSON | < 1s |

---

## 11. Phase A 实施边界

| 机制 | Phase A | 说明 |
|------|---------|------|
| 单城市多区域 POP 模拟 | 支持 | 核心目标 |
| 收入-需求-价格闭环 | 支持 | 核心目标 |
| 劳动力市场与失业 | 支持 | 核心目标 |
| 迁移与推力拉力 | 支持 | 核心目标 |
| 政策参数调节 | 支持 | 税收、最低工资、补贴、教育、公共支出 |
| 随机外部事件 | 支持 | 原材料涨价、技术冲击、消费降级等 |
| 可视化面板 | 支持 | 时间序列、区域图、分布图、事件日志 |
| 预设与对比实验 | 支持 | 6 组内置预设 |
| 多城市贸易网络 | 不支持 | Phase B 扩展 |
| 政治倾向与社会运动 | 不支持 | Phase B 扩展 |
| 银行信贷与房地产泡沫细节 | 不支持 | Phase B 扩展 |
| 后端持久化与多用户协作 | 不支持 | 本工具为浏览器端单机版 |

---

*商识唯智 · POP 拟真城市模拟器 PRD v1.0*
*基于 `docs/archive/engineering-academy/70-POP机制与社会模拟/` 与 `docs/archive/engineering-academy/80-POP拟真城市/` 设计*
*规范来源：`docs/prd/prd-写作指南.md`、`02-ARCHITECTURE.md`、`04-ROADMAP.md`*
