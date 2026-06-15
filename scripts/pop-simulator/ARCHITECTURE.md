# POP 拟真城市模拟器 · 代码与公式详解

> 本文档对应实现：`scripts/pop-simulator/simulator.js` 与 `scripts/pop-simulator/ui.js`
> 基于：`docs/prd/PRD-POP模拟器.md`、`docs/prd/BDD-POP模拟器.md`
> 最后更新：2026-06-15

---

## 1. 文档说明

本模拟器是一个**纯浏览器端、零构建**的 Agent-Based 微观社会模拟器。它把城市经济抽象为三类主体：

- **POP（人群聚合体）**：不是单个市民，而是具有相同职业、区域、教育水平的人群组。
- **企业（Firm）**：按行业生产商品/服务，雇佣 POP，支付工资，获取利润。
- **区域（District）**：城市的空间单元，承载人口、住房、就业和迁移。

每 tick 的结算遵循「外部冲击 → 生产 → 收入 → 市场清算 → 消费 → 满意度 → 迁移/升级 → 企业动态 → 宏观指标」的闭环。

---

## 2. 目录与文件职责

| 文件 | 职责 |
|------|------|
| `index.html` | 页面骨架、Chart.js CDN 引用、DOM 容器 |
| `simulator.js` | 核心引擎：数据结构、初始化、单 tick 结算、宏观指标、导入导出 |
| `ui.js` | 前端交互：参数面板、图表、地图、表格、运行控制、文件导入导出 |
| `style.css` | 布局与组件样式 |
| `启动.ps1` | PowerShell 一键启动脚本 |

---

## 3. 核心数据结构

### 3.1 职业定义 `PROFESSIONS`

```javascript
const PROFESSIONS = {
  low_skill_worker:  { skill: 1, incomeSource: 'wage', savingsRate: 0.05 },
  high_skill_worker: { skill: 2, incomeSource: 'wage', savingsRate: 0.10 },
  professional:      { skill: 3, incomeSource: 'wage', savingsRate: 0.15 },
  capitalist:        { skill: 0, incomeSource: 'capital', savingsRate: 0.30 },
  unemployed:        { skill: 0, incomeSource: 'relief', savingsRate: 0.0 },
  student:           { skill: 0, incomeSource: 'transfer', savingsRate: 0.0 },
  retiree:           { skill: 0, incomeSource: 'pension', savingsRate: 0.0 },
};
```

- `skill`：决定工资倍数与可从事的岗位等级。
- `incomeSource`：决定收入来源（工资、资本分红、救济、转移支付、养老金）。
- `savingsRate`：影响消费后剩余财富的储蓄比例。

### 3.2 商品定义 `GOODS`

```javascript
const GOODS = [
  { id: 'food', needLevel: 'survival', basePrice: 263, baseNeed: 1.8, incomeElasticity: 0.3, priceElasticity: -0.6 },
  { id: 'housing', name: '住房', needLevel: 'survival', basePrice: 1575, baseNeed: 0.5, incomeElasticity: 0.4, priceElasticity: -0.3 },
  ...
];
```

| 字段 | 含义 |
|------|------|
| `needLevel` | 需求层级：`survival` / `daily` / `development` / `luxury`，决定消费优先级 |
| `basePrice` | 基准价格，用于价格指数的锚定 |
| `baseNeed` | 人均基准需求量（单位：商品单位/人/tick） |
| `incomeElasticity` | 收入弹性：收入变化 1% 引起的需求量变化百分比 |
| `priceElasticity` | 价格弹性（通常为负）：价格变化 1% 引起的需求量变化百分比 |

### 3.3 行业定义 `SECTORS`

```javascript
const SECTORS = [
  { id: 'agri', good: 'food', skillReq: 1, productivity: 12 },
  { id: 'manu', good: 'daily', skillReq: 1, productivity: 5 },
  { id: 'edu',  good: 'education', skillReq: 3, productivity: 0.8 },
  ...
];
```

- `good`：该行业产出的商品 ID。
- `skillReq`：岗位最低技能等级（1~3）。
- `productivity`：单位雇员每 tick 产出量。

### 3.4 运行时状态 `state`

```javascript
{
  params,        // 当前参数快照
  seed,          // 随机种子
  tick,          // 当前 tick 计数
  maxTicks,      // 最大 tick 数
  status,        // 'editing' | 'running' | 'paused' | 'finished'
  districts,     // 区域数组
  firms,         // 企业数组
  pops,          // POP 组数组
  goods,         // 商品数组
  history,       // 每 tick 宏观指标历史
  events,        // 事件日志
  eventModifiers,// 当前生效的外部事件修饰符
  rng,           // 伪随机数生成器
}
```

### 3.5 POP 组对象

```javascript
{
  id, profession, size, districtId,
  income_per_capita, wealth, education, satisfaction,
  migration_intent,
  employed_count, unemployed_count,
  consumption: { food: 1200, daily: 800, ... },
  savings_rate, housing_cost,
}
```

### 3.6 企业对象

```javascript
{
  id, name, districtId, sector, good, skillReq,
  productivity, wage, employees, targetEmployees,
  output, price, sales, revenue,
  wageCost, materialCost, profit, cash,
  lossTicks, active,
}
```

---

## 4. 参数系统

### 4.1 默认参数 `DEFAULT_PARAMS`

所有可调参数的默认值集中在这里。UI 中的滑块、数字输入都绑定到这些字段。

### 4.2 预设 `PRESETS`

6 组预设是对 `DEFAULT_PARAMS` 的覆盖：

```javascript
const PRESETS = {
  balanced: { ...DEFAULT_PARAMS },
  industrial_decline: { ...DEFAULT_PARAMS, low_skill_ratio: 0.50, corporate_tax_rate: 0.35, ... },
  housing_bubble: { ...DEFAULT_PARAMS, housing_supply_per_district: 1500, interest_rate: 0.01, ... },
  ...
};
```

### 4.3 参数校验 `validateParams`

核心校验规则：

- 7 个职业占比之和必须等于 1.0（允许 ±0.001 浮点误差）。
- `total_population >= 1000`。
- `district_count` 在 2~12 之间。
- 税率、补贴率、概率等必须在 [0, 1] 之间。

### 4.4 职业占比归一化 `normalizeRatios`

当用户修改某个职业占比时，UI 会触发按比例缩放其他占比，保证总和为 1。

---

## 5. 初始化流程 `reset(params, seed)`

`reset` 根据参数和种子生成一个完整的城市初始状态，步骤如下：

1. 用 `mulberry32` 创建可复现的伪随机数生成器。
2. `createDistricts`：生成区域。
3. `createGoods`：生成商品市场。
4. `createFirms`：生成企业，并按需求校准目标雇员数。
5. `createPops`：生成 POP 组。
6. `matchLaborMarket`：初始劳动力匹配。
7. `updateDistrictStats`：计算区域统计。
8. `computeMacroMetrics`：生成 tick 0 的宏观指标。

### 5.1 区域初始化

```javascript
districts.push({
  id: `d-${i}`,
  name: DISTRICT_NAMES[i],
  housingSupply: params.housing_supply_per_district * (0.9 + rand * 0.2),
  housingCost: params.base_wage * 0.15 * centerBonus * (0.9 + rand * 0.2),
  avgWage: params.base_wage * centerBonus * (0.9 + rand * 0.2),
  ...
});
```

- 第一个区域（中心区）有 1.3 倍的工资和房价吸引力。
- 住房成本约为基础工资的 15%，保证居民可支配收入足以覆盖基本消费。

### 5.2 商品初始化

进口/出口按人口规模和商品权重缩放：

```javascript
const totalBaseNeed = GOODS.reduce((s, g) => s + g.baseNeed, 0);
const popFactor = params.total_population / 10000;

imports = params.import_supply * popFactor * (g.baseNeed / totalBaseNeed) * (0.8 + rand * 0.4);
exports = params.export_demand * popFactor * (g.baseNeed / totalBaseNeed) * (0.8 + rand * 0.4) * params.external_demand_shock;
```

这样当总人口变化时，进出口不会相对于经济体过大或过小。

### 5.3 企业初始化与目标雇员校准

企业的目标雇员数按行业需求反推，使总产出与总需求大致匹配：

```javascript
const domesticNeed = max(0, params.total_population * g.baseNeed - imports);
const perFirmNeed = domesticNeed / sectorFirms.length;
f.targetEmployees = max(5, floor((perFirmNeed / f.productivity) * 1.1));
```

解释：

- `total_population * g.baseNeed`：该商品总需求。
- 减去进口 `imports`：得到国内企业需要满足的国内需求。
- 除以该行业企业数：每家企业需要满足的份额。
- 除以企业生产率：需要的雇员数。
- 乘以 1.1：保留 10% 供给余量。

### 5.4 POP 初始化

职业占比字段名与职业 ID 不同，使用 `RATIO_KEY` 映射：

```javascript
const RATIO_KEY = {
  low_skill_worker: 'low_skill_ratio',
  high_skill_worker: 'high_skill_ratio',
  ...
};
```

初始收入分配：

```javascript
baseIncome = max(minimum_wage, base_wage * skillMult)
```

其中 `skillMult = skill_premium ^ (skill - 1)`。

初始财富：

```javascript
wealth = baseIncome * 6 * (0.5 + rand * 2) * (profession === 'capitalist' ? 10 : 1)
```

资本家的初始财富是普通职业的 10 倍，用于模拟财富不平等。

---

## 6. 单 tick 结算流程 `step(state)`

`step` 是纯函数：不修改输入 `state`，返回新的状态对象。

```javascript
function step(state) {
  // 1. 外部冲击与事件
  // 2. 企业生产
  // 3. 劳动力市场与收入分配
  // 4. 市场清算（商品供需 → 价格）
  // 5. POP 消费与储蓄
  // 6. 满意度更新
  // 7. 迁移与职业升级/降级
  // 8. 企业投资与动态
  // 9. 宏观指标计算
  // 10. 区域统计更新
}
```

---

## 7. 各子系统详解

### 7.1 劳动力市场 `matchLaborMarket`

#### 7.1.1 企业按工资排序

```javascript
activeFirms.sort((a, b) => b.wage - a.wage);
```

工资高的企业优先获得劳动力。

#### 7.1.2 技能匹配

```javascript
for (const prof of ['professional', 'high_skill_worker', 'low_skill_worker']) {
  if (profDef.skill < skillReq) continue;
  // 高技能工人可以从事低技能岗位，反之不行
}
```

#### 7.1.3 工资决定

```javascript
const skillMult = params.skill_premium ^ (PROFESSIONS[prof].skill - 1);
const unemploymentRate = (total - employed) / total;
const marketWage = params.base_wage * skillMult * (1 + (0.05 - unemploymentRate) * 0.5);
const actualWage = max(params.minimum_wage, marketWage);
```

- 基础工资按技能溢价指数增长。
- 失业率每高于 5%（自然失业率基准），工资下降 0.5%；每低于 5%，工资上升 0.5%。
- 最终工资受 `minimum_wage` 下限约束。

### 7.2 企业生产 `produce`

```javascript
const tech = params.tech_shock * (modifiers.techBoost || 1.0);
f.output = f.employees * f.productivity * tech;
f.price = g.price * (1 + (f.skillReq - 1) * 0.1);
```

- 产出 = 雇员数 × 企业生产率 × 技术冲击。
- 高技能要求的企业有 10%~20% 的品牌/质量溢价。

### 7.3 收入分配 `distributeIncome`

#### 7.3.1 工资收入

已在 `matchLaborMarket` 中写入 `pop.income_per_capita`。

#### 7.3.2 资本收入

```javascript
const totalProfit = firms.reduce((s, f) => s + f.profit, 0);
const dividend = totalProfit * (1 - investment_rate) * (1 - corporate_tax_rate) / totalCapitalistSize;
```

资本家群体均分企业税后利润中未用于再投资的部分。

#### 7.3.3 政府转移支付

| 职业 | 收入来源 | 金额 |
|------|----------|------|
| 失业/无业 | 失业救济 | `unemployment_benefit` |
| 退休人员 | 养老金 | `unemployment_benefit * 1.2` |
| 学生 | 家庭/兼职 | `unemployment_benefit * 0.8` |

### 7.4 市场清算 `clearGoodsMarket`

#### 7.4.1 需求函数

```javascript
disposable = max(0, income_per_capita * (1 - income_tax_rate) - housing_cost * (1 - housing_subsidy));
desired = baseNeed * pop.size * (disposable / base_wage) ^ incomeElasticity;
```

- 可支配收入 = 税后收入 - 住房净支出。
- 需求量随可支配收入按收入弹性增长。

#### 7.4.2 供给

```javascript
supplyFromFirms = sum(f.output for f in active firms producing g);
g.supply = supplyFromFirms + g.imports;
g.exportsEffective = min(g.exports, max(0, g.supply - g.demand));
```

#### 7.4.3 价格调整

```javascript
ratio = clamp(g.demand / max(g.supply, 1), 0.5, 2.0);
newPrice = g.price * (1 + price_adjustment_speed * (ratio - 1));
g.price = clamp(newPrice, basePrice * 0.5, basePrice * 2.0);
```

- 供需比被限制在 [0.5, 2.0]，防止单次 tick 价格剧烈震荡。
- 价格波动范围被限制在基准价的 50%~200%。
- `price_adjustment_speed`（默认 0.05）决定价格粘性。

### 7.5 消费与储蓄 `consume`

```javascript
disposable = max(0, income_per_capita * (1 - income_tax_rate) - housing_cost * (1 - housing_subsidy));
for (level in ['survival', 'daily', 'development', 'luxury']) {
  desired = baseNeed * size * (disposable / base_wage) ^ incomeElasticity;
  maxAffordable = floor(disposable / price);
  actual = min(desired, maxAffordable);
  disposable -= actual * price;
}
saved = disposable * savings_rate;
wealth += saved;
```

- 按需求层级优先满足生存需求，再满足日常、发展、享受需求。
- 当收入不足以购买理想数量时，按价格可负担数量截断。
- 剩余可支配收入按储蓄率转为财富。

### 7.6 满意度 `updateSatisfaction`

```javascript
fulfillment = totalConsumption / expectedConsumption;
housingPressure = min(1, housing_cost / income_per_capita);
unemploymentRate = unemployed_count / size;
incomeLevel = min(1, income_per_capita / (base_wage * 3));

sat = 3 + fulfillment * 4 + (1 - housingPressure) * 2
      + (1 - unemploymentRate) * 2 + incomeLevel * 2;
sat *= profession.baseSolWeight;
p.satisfaction = clamp(sat, 0, 10);
```

满意度综合了：

- 消费需求满足程度（权重 4）
- 住房压力（权重 2）
- 失业率（权重 2）
- 收入水平（权重 2）
- 职业基础满意度权重（如高技能工人略高）

### 7.7 迁移 `migrate`

#### 7.7.1 区域吸引力

```javascript
d.attractiveness = avgWage * 0.4 + jobs * 10 + housingSupply/population * 100 - housingCost * 0.05;
```

#### 7.7.2 推力与拉力

```javascript
push = 0.3 * (10 - satisfaction)
     + 0.5 * (unemployed_count / size)
     + 0.2 * (housing_cost / income_per_capita);

pull = 0.4 * (target.avgWage - current.avgWage) / current.avgWage
     + 0.3 * (target.jobs / current.jobs)
     + 0.3 * (target.housingSupply / current.housingSupply);

migration_intent = sigmoid(push - pull + random_noise);
```

当 `migration_intent > 0.55` 时，该 POP 组有 `migration_speed` 比例的人口迁往吸引力最高的其他区域。

### 7.8 职业升级与降级 `promoteAndDemote`

#### 7.8.1 教育提升

```javascript
eduBoost = education_spending / total_population / 100;
p.education += eduBoost * 0.1;
```

#### 7.8.2 升级

```javascript
if (profession === 'low_skill_worker' && education > 5 && highSkillVacancies > 0) {
  promote = min(size, floor(highSkillVacancies * 0.1));
  // 低技能工人 → 高技能工人
}
```

#### 7.8.3 降级

```javascript
if (profession === 'high_skill_worker' && unemployed_count / size > 0.5) {
  demote = floor(unemployed_count * 0.05);
  // 高技能工人 → 失业
}
```

### 7.9 POP 组合并 `mergePops`

迁移和升级会产生相同 `(profession, districtId)` 的 POP 组，合并以减少计算量：

```javascript
const key = `${profession}|${districtId}`;
// 对 income/wealth/education/satisfaction/housing_cost 做加权平均
// 对 employed_count/unemployed_count/size 做求和
```

### 7.10 企业动态 `updateFirms`

#### 7.10.1 销量与成本

```javascript
demandShare = f.output / max(g.supply, 1);
sales = min(f.output, g.demand * demandShare);
wageCost = employees * wage;
materialCost = output * basePrice * 0.05 * costMultiplier;
```

#### 7.10.2 收入下限（稳定性设计）

为防止真实市场中常见的「企业倒闭 → 失业 → 需求崩塌 → 更多倒闭」死亡螺旋，企业收入设有下限：

```javascript
let revenue = sales * price;
const minRevenue = wageCost * 1.05 + materialCost;
if (revenue < minRevenue) revenue = minRevenue;
```

这意味着企业至少能覆盖工资并保留 5% 的毛利润。真实销量和价格仍然参与计算并影响利润波动。

#### 7.10.3 利润与投资

```javascript
grossProfit = revenue - wageCost - materialCost;
profit = grossProfit * (1 - corporate_tax_rate);
cash += profit;

if (profit > 0) {
  invest = profit * investment_rate;
  productivity += invest / 100000;
  targetEmployees = min(500, targetEmployees * (1 + investment_rate * 0.1));
} else {
  lossTicks++;
  if (lossTicks >= 6) targetEmployees *= 0.9;
  if (cash < -200000) active = false;
}
```

---

## 8. 宏观指标 `computeMacroMetrics`

### 8.1 失业率

```javascript
laborSize = sum(size of low/high/professional pops);
unemployed = sum(unemployed_count);
unemployment_rate = unemployed / laborSize;
```

### 8.2 GDP

```javascript
consumption = sum(pop.consumption[good] * price);
investment = sum(max(0, firm.profit) * investment_rate);
netExport = sum(exportsEffective * price - imports * price);
gdp = consumption + investment + public_spending + netExport;
```

### 8.3 CPI

```javascript
priceIndex = sum((price / basePrice) * baseNeed) / sum(baseNeed);
cpi = (priceIndex - prevPriceIndex) / prevPriceIndex;
```

### 8.4 基尼系数 `calculateGini`

使用梯形法近似洛伦兹曲线下面积：

```javascript
sort pops by income_per_capita;
for each pop in sorted order:
  prevPop = cumulativePop / totalPop;
  prevIncome = cumulativeIncome / totalIncome;
  cumulativePop += size;
  cumulativeIncome += income * size;
  curPop = cumulativePop / totalPop;
  curIncome = cumulativeIncome / totalIncome;
  area += (curIncome + prevIncome) * (curPop - prevPop) / 2;
gini = 1 - 2 * area;
```

### 8.5 其他指标

```javascript
avg_income = weightedMean(income_per_capita, size);
avg_satisfaction = weightedMean(satisfaction, size);
housing_index = weightedMean(housing_cost, size) / (base_wage * 0.8);
population = sum(size);
```

---

## 9. 事件与外部冲击

事件系统通过 `eventModifiers` 给商品或企业添加临时效果：

| 事件 | 效果 |
|------|------|
| 原材料涨价 | 所有商品 `costMultiplier *= 1.15`，持续 3 tick |
| 消费降级 | 奢侈品需求乘数 0.7，持续 4 tick |
| 技术突破 | 全要素生产率乘数 1.2，持续 5 tick |
| 自然灾害 | 所有区域住房供给减少 8% |
| 移民潮 | 一次性迁入 3 倍于常规移民的人口 |

事件触发概率：

```javascript
if (rand() < params.event_probability) triggerEvent();
```

---

## 10. 导入导出

### 10.1 导出配置

只导出 `params` 和 `seed`，便于分享实验设计。

### 10.2 导出完整状态

导出所有运行时数据（除 `rng` 函数外），可中断后继续实验。

### 10.3 导入恢复

导入状态时，用保存的 `seed` 重新创建 RNG，保证后续随机序列一致。

---

## 11. UI 架构 `ui.js`

### 11.1 参数面板

- 根据 `PARAM_DEFS` 动态生成分组折叠面板。
- 每个参数同时绑定 `range` 滑块和 `number` 数字输入。
- 职业占比修改时自动按比例缩放其他占比。
- 实时校验并禁用「重置」按钮直到参数合法。

### 11.2 运行控制

- `doReset()`：调用 `POPSim.reset()` 生成初始状态。
- `doStep()`：调用 `POPSim.step()` 推进一个 tick。
- `toggleRun()`：用 `setInterval` 自动推进，速度可调。
- 运行中禁用结构性参数修改。

### 11.3 图表

使用 Chart.js：

- 时间序列图：支持多指标切换显示，使用左右双 Y 轴。
- 分布图：财富分布直方图 / 职业结构柱状图，可切换。

### 11.4 区域地图

使用 HTML Canvas：

- 根据区域数量自动排布网格。
- 按选定指标（人口、收入、房价、岗位空缺率、满意度）渲染颜色深浅。
- 颜色从浅蓝到深蓝线性插值。

### 11.5 事件日志与表格

- 事件日志按 tick 倒序显示，支持按类型过滤。
- POP 表和企业表显示前 30 条，支持滚动。

---

## 12. 关键设计取舍

1. **聚合 POP**
   - 相同职业+区域的 POP 合并为一组，避免逐人计算，保证浏览器端可运行万人级模拟。

2. **纯函数 `step`**
   - 输入状态不被修改，便于时间旅行、结果复现、导入导出。

3. **企业收入下限**
   - 牺牲了部分完全自由市场的真实性，换取长期稳定性，使宏观指标能持续演化而不崩溃。

4. **价格调整 clamp**
   - 供需比限制在 [0.5, 2.0]，价格限制在基准价 [50%, 200%]，防止单次事件引发极端通胀/通缩。

5. **商品 baseNeed 校准**
   - `baseNeed` 和 `basePrice` 经过校准，使各行业的收入-产出-消费大致闭环，确保不同预设能产生可区分的宏观结果。

---

## 13. 调试与验证

### 13.1 引擎级快速验证（无需浏览器）

```powershell
cd scripts/pop-simulator
node -e "global.window=global; require('./simulator.js'); const S=global.POPSim; let s=S.reset(S.PRESETS.balanced, 42); for(let i=0;i<30;i++){ s=S.step(s); console.log(s.history.at(-1)); }"
```

### 13.2 常用观察点

- 若失业率持续走高：检查 `baseNeed` 是否过低、移民率是否过高、最低工资是否抑制雇佣。
- 若 CPI 长期为负：说明供给持续大于需求，可能是 `price_adjustment_speed` 过快或企业产能过高。
- 若区域地图颜色单一：检查区域数量、住房供给、通勤成本。

---

## 14. 扩展建议

- **增加行业**：在 `SECTORS` 和 `GOODS` 中添加新条目，并注意校准 `baseNeed` 和 `basePrice`。
- **更复杂的空间模型**：可为区域添加通勤网络、产业转移成本。
- **政治反馈**：可在 `updateSatisfaction` 后增加 `political_stance` 更新，触发政策事件。
- **银行信贷**：为企业添加贷款额度，使投资不再仅依赖留存利润。

---

*商识唯智 · POP 拟真城市模拟器代码与公式详解 v1.0*
