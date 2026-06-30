# POP 拟真城市模拟器 BDD · 微观社会涌现设计验证工具

> **文档定位**：基于 `docs/prd/PRD-POP模拟器.md` 生成的行为驱动开发场景
> **语法**：Gherkin（Given-When-Then）
> **语言**：中文业务语言，避免技术实现细节
> **最后更新**：2026-06-15

---

## Feature 1：打开模拟器与加载预设

**作为** 平台设计师
**我希望** 快速打开模拟器并加载一组基准情景
**从而** 立即开始观察 POP 机制的涌现效果

### Background

```gherkin
Given 设计师 "小林" 已在浏览器中打开 POP 拟真城市模拟器
And 系统已内置 6 组预设："均衡城市"、"工业衰退"、"房地产泡沫"、"技术替代"、"高福利社会"、"移民潮冲击"
```

### Scenario 1.1：默认加载均衡城市预设

```gherkin
When 模拟器完成初始化
Then 当前预设显示为 "均衡城市"
And 总人口参数为 10000
And 基础工资参数为 3000
And 区域数量参数为 4
And 可视化面板显示为空状态提示 "点击「重置」生成初始城市"
```

### Scenario 1.2：切换至工业衰退预设

```gherkin
Given 小林当前处于 "均衡城市" 预设
When 小林从预设下拉框选择 "工业衰退"
Then 预设名称变为 "工业衰退"
And 低技能工人占比变为 0.50
And 出口需求量变为 500
And 企业税率变为 0.35
And 系统提示 "参数已更新，点击「重置」生效"
```

### Scenario 1.3：自定义参数后预设显示为自定义

```gherkin
Given 小林当前处于 "均衡城市" 预设
When 小林将基础工资从 3000 修改为 3500
Then 预设名称变为 "自定义"
And 基础工资参数显示为 3500
```

---

## Feature 2：参数设置与校验

**作为** 平台设计师
**我希望** 调整 POP 基础设置和外部环境参数
**从而** 测试不同设计假设下的城市演化

### Background

```gherkin
Given 小林已打开模拟器并处于 "均衡城市" 预设
And 当前状态为 "editing"
```

### Scenario 2.1：成功调整 POP 职业结构

```gherkin
Given 低技能工人占比为 0.35
And 高技能工人占比为 0.25
When 小林将低技能工人占比调整为 0.40
And 小林选择 "按比例缩放其他职业"
Then 高技能工人占比自动调整为 0.2188
And 所有职业占比之和为 1.0
And 系统无越界提示
```

### Scenario 2.2：设置总人口低于下限

```gherkin
Given 总人口参数为 10000
When 小林将总人口修改为 500
Then 系统提示 "总人口不能低于 1000"
And 总人口字段高亮显示为红色
And "运行"按钮处于禁用状态
```

### Scenario 2.3：所得税率越界

```gherkin
Given 所得税率参数为 0.15
When 小林将所得税率修改为 1.20
Then 系统提示 "税率必须在 0 到 1 之间"
And 所得税率字段高亮显示为红色
```

### Scenario 2.4：职业占比之和不等于 1

```gherkin
Given 当前各职业占比之和为 1.0
When 小林将资本家占比从 0.05 修改为 0.10
And 小林未选择按比例缩放
Then 系统提示 "职业占比之和必须等于 1.0，当前为 1.05"
And "重置"按钮处于禁用状态
```

### Scenario 2.5：运行中禁止修改结构性参数

```gherkin
Given 小林已点击「运行」，状态为 "running"
When 小林尝试修改区域数量
Then 区域数量输入框处于禁用状态
And 系统提示 "请先暂停或重置后再修改结构性参数"
```

---

## Feature 3：重置与初始状态生成

**作为** 平台设计师
**我希望** 根据当前参数生成新的初始城市状态
**从而** 从同一起点开始多次对比实验

### Scenario 3.1：成功重置初始状态

```gherkin
Given 小林处于 "均衡城市" 预设
And 当前 tick 为 0
When 小林点击「重置」
Then 系统生成初始城市状态
And tick 显示为 0
And 区域地图上显示 4 个区域的人口分布
And POP 表格中显示各职业 POP 组
And 事件日志中显示 "城市已初始化，总人口 10000"
```

### Scenario 3.2：使用固定种子复现实验

```gherkin
Given 小林设置随机种子为 "123456"
When 小林点击「重置」
Then 系统生成的初始状态与上一次使用种子 "123456" 时完全一致
And 区域 "中心区" 的人口数为 4000
```

### Scenario 3.3：参数校验失败时无法重置

```gherkin
Given 小林将总人口修改为 500
When 小林点击「重置」
Then 系统提示 "请先修正标红参数"
And 未生成新的城市状态
```

---

## Feature 4：运行控制

**作为** 平台设计师
**我希望** 控制模拟器的推进节奏
**从而** 既能连续观察长期趋势，也能单步讲解因果链

### Scenario 4.1：连续运行模拟器

```gherkin
Given 小林已完成初始状态重置
And 当前 tick 为 0
When 小林点击「运行」
Then 状态变为 "running"
And tick 计数器开始递增
And 时间序列图表实时更新
```

### Scenario 4.2：暂停运行

```gherkin
Given 模拟器正在连续运行
And 当前 tick 为 25
When 小林点击「暂停」
Then 状态变为 "paused"
And tick 计数器停止在 25
And 图表停止更新
```

### Scenario 4.3：单步推进

```gherkin
Given 小林已完成初始状态重置
And 当前 tick 为 0
When 小林点击「单步推进」
Then 系统执行 1 个 tick
And tick 显示为 1
And 事件日志中新增本 tick 事件
```

### Scenario 4.4：调整运行速度

```gherkin
Given 模拟器正在连续运行
And 当前速度为 "1 tick/秒"
When 小林将速度调整为 "5 ticks/秒"
Then tick 递增速度变快
And 图表更新频率相应提高
```

### Scenario 4.5：运行中重置

```gherkin
Given 模拟器正在连续运行
And 当前 tick 为 30
When 小林点击「重置」
Then 模拟器先停止运行
And tick 重置为 0
And 系统根据当前参数重新生成初始城市状态
```

---

## Feature 5：单 tick 结算与涌现指标

**作为** 平台设计师
**我希望** 每个 tick 正确结算微观行为并更新宏观指标
**从而** 验证 POP 机制是否能涌现出预期的经济规律

### Scenario 5.1：GDP 随消费和投资增加

```gherkin
Given 初始 GDP 为 1200000
And 当前 tick 为 0
When 小林点击「单步推进」
Then tick 变为 1
And GDP 大于 0
And 历史记录中新增第 1 个数据点
```

### Scenario 5.2：最低工资上调导致失业率上升

```gherkin
Given 小林处于 "均衡城市" 预设
And 当前 tick 为 10
And 失业率为 0.08
When 小林将最低工资从 2500 上调至 5000
And 小林点击「单步推进」
Then 下一 tick 失业率上升至 0.12
And 事件日志显示 "部分企业因工资成本上升裁员"
```

### Scenario 5.3：技术冲击导致低技能失业

```gherkin
Given 小林处于 "技术替代" 预设
And 低技能工人规模为 5000
When 小林连续运行 12 个 tick
Then 低技能工人规模减少
And 失业率上升
And 事件日志中出现 "技术替代导致低技能岗位减少"
```

### Scenario 5.4：住房供给不足引发房价上涨

```gherkin
Given 小林处于 "房地产泡沫" 预设
And 初始房价指数为 100
When 小林连续运行 20 个 tick
Then 房价指数上升至 150 以上
And 事件日志中出现 "住房供不应求，租金上涨"
```

### Scenario 5.5：基尼系数反映不平等变化

```gherkin
Given 小林将财富不平等参数从 0.30 调整为 0.60
And 小林已完成重置
When 小林连续运行 10 个 tick
Then 基尼系数从 0.30 上升至 0.45 以上
And 财富分布图中右侧长尾更明显
```

---

## Feature 6：可视化面板

**作为** 平台设计师
**我希望** 通过多种图表直观观察城市状态
**从而** 快速判断 POP 设计是否涌现出预期规律

### Scenario 6.1：时间序列图表显示宏观指标

```gherkin
Given 小林已完成重置并运行了 30 个 tick
When 小林查看时间序列图表
Then 图表中包含 GDP、CPI、失业率、基尼系数、平均满意度 5 条曲线
And 横轴为 tick，纵轴为指标值
```

### Scenario 6.2：区域地图显示人口密度

```gherkin
Given 城市包含 4 个区域
When 小林在区域地图中选择 "人口密度" 视图
Then 颜色最深的区域人口最多
And 颜色最浅的区域人口最少
And 图例显示人口范围
```

### Scenario 6.3：区域地图切换为收入视图

```gherkin
Given 小林当前查看 "人口密度" 视图
When 小林切换为 "人均收入" 视图
Then 区域颜色根据人均收入重新渲染
And 中心区颜色深于边缘区
```

### Scenario 6.4：财富分布直方图

```gherkin
Given 小林已完成重置
When 小林查看财富分布图表
Then 横轴为财富区间，纵轴为 POP 数量
And 默认显示 10 个区间
```

### Scenario 6.5：职业结构堆叠面积图

```gherkin
Given 小林已连续运行 50 个 tick
When 小林查看职业结构图表
Then 图表显示各职业 POP 占比随 tick 的变化
And 总面积为 100%
```

### Scenario 6.6：空状态提示

```gherkin
Given 小林刚刚打开模拟器
And 尚未点击「重置」
When 小林查看时间序列图表
Then 图表区域显示 "暂无数据，请先重置初始状态"
```

---

## Feature 7：事件日志

**作为** 平台设计师
**我希望** 看到每个 tick 发生的重要事件
**从而** 理解宏观现象背后的微观原因

### Scenario 7.1：事件日志记录迁移潮

```gherkin
Given 小林处于 "移民潮冲击" 预设
And 已完成重置
When 小林连续运行 5 个 tick
Then 事件日志中出现 "移民流入，总人口增加 XX"
And 事件日志中出现 "住房供给紧张，租金上涨"
```

### Scenario 7.2：事件日志记录企业倒闭

```gherkin
Given 小林处于 "工业衰退" 预设
And 已完成重置
When 小林连续运行 15 个 tick
Then 事件日志中出现 "企业 XX 连续亏损，退出市场"
And 事件日志中显示释放的劳动力数量
```

### Scenario 7.3：事件日志支持过滤

```gherkin
Given 事件日志中包含 "迁移"、"企业"、"政策" 三类事件
When 小林选择只显示 "迁移" 类型
Then 事件日志中仅显示迁移相关事件
And 其他类型事件被隐藏
```

### Scenario 7.4：点击事件定位到相关区域

```gherkin
Given 事件日志中有一条 "中心区出现迁移潮"
When 小林点击该事件
Then 区域地图高亮显示 "中心区"
And POP 表格筛选出涉及迁移的 POP 组
```

---

## Feature 8：导入导出配置

**作为** 平台设计师
**我希望** 保存和分享实验配置
**从而** 与团队成员复现相同的设计验证场景

### Scenario 8.1：导出当前配置

```gherkin
Given 小林已将基础工资调整为 4000
And 将最低工资调整为 3000
When 小林点击「导出配置」
Then 浏览器下载配置文件
And 配置文件中包含基础工资 4000 和最低工资 3000
```

### Scenario 8.2：导入配置文件

```gherkin
Given 小林拥有一份名为 "high-welfare-config.json" 的配置文件
When 小林点击「导入配置」并选择该文件
Then 参数面板更新为高福利社会对应参数
And 预设名称显示为 "自定义"
And 系统提示 "配置已导入，点击「重置」生效"
```

### Scenario 8.3：导入无效配置文件

```gherkin
Given 小林选择一份损坏的配置文件
When 小林点击「导入配置」
Then 系统提示 "配置文件格式错误，请检查后重试"
And 参数面板未发生变化
```

### Scenario 8.4：导出完整状态并恢复

```gherkin
Given 小林已运行模拟器至 tick 50
And 当前 GDP 为 1500000
When 小林点击「导出完整状态」
Then 浏览器下载状态文件
And 状态文件中包含 tick 50 和 GDP 1500000

When 小林重新打开模拟器并导入该状态文件
Then 模拟器恢复到 tick 50
And GDP 显示为 1500000
And 小林可继续运行
```

---

## Feature 9：异常与边界场景

**作为** 平台设计师
**我希望** 模拟器在极端参数下也能稳定运行
**从而** 放心测试各种设计边界

### Scenario 9.1：所有企业倒闭后的稳定运行

```gherkin
Given 小林设置企业数量为 1
And 设置企业税率为 0.99
And 已完成重置
When 小林连续运行 30 个 tick
Then 该企业倒闭
And 失业率上升
And 模拟器不崩溃
And 事件日志显示 "最后一家企业退出市场"
```

### Scenario 9.2：移民率为 0 时无移民事件

```gherkin
Given 小林将移民率调整为 0
And 已完成重置
When 小林连续运行 20 个 tick
Then 事件日志中不出现移民相关事件
And 总人口保持不变
```

### Scenario 9.3：最大 tick 数达到后自动停止

```gherkin
Given 小林设置最大 tick 数为 120
And 当前 tick 为 119
When 小林点击「单步推进」
Then tick 变为 120
And 状态变为 "finished"
And 系统提示 "已到达最大 tick 数，实验结束"
```

### Scenario 9.4：快速连续点击单步不会重复执行

```gherkin
Given 当前 tick 为 5
When 小林快速连续点击「单步推进」3 次
Then tick 变为 6
And 不会变为 7 或 8
And 系统提示 "结算中，请勿重复点击"
```

### Scenario 9.5：可视化数据超过上限自动降采样

```gherkin
Given 小林设置最大 tick 数为 600
And 小林已连续运行 600 个 tick
When 小林查看时间序列图表
Then 图表中显示的数据点不超过 500 个
And GDP 长期趋势仍然可见
```

### Scenario 9.6：零人口区域正常显示

```gherkin
Given 城市包含 4 个区域
And 某区域当前人口为 0
When 小林查看区域地图
Then 该区域显示为最低颜色深度
And 模拟器继续正常运行
```

---

## 附录：BDD 到测试的映射建议

| Feature | 推荐测试类型 | 优先级 |
|---------|-------------|--------|
| Feature 1 打开模拟器与加载预设 | 前端组件测试 + E2E | P0 |
| Feature 2 参数设置与校验 | 前端组件测试 + 单元测试 | P0 |
| Feature 3 重置与初始状态生成 | 单元测试 + E2E | P0 |
| Feature 4 运行控制 | E2E | P0 |
| Feature 5 单 tick 结算与涌现指标 | 单元测试（核心结算逻辑） | P0 |
| Feature 6 可视化面板 | 前端组件测试 + E2E | P1 |
| Feature 7 事件日志 | 单元测试 + E2E | P1 |
| Feature 8 导入导出配置 | E2E + 单元测试 | P1 |
| Feature 9 异常与边界场景 | 单元测试 + E2E | P0 |

---

*商识唯智 · POP 拟真城市模拟器 BDD v1.0*
*基于 `docs/prd/PRD-POP模拟器.md` 与 `docs/prd/bdd-写作指南.md` 生成*
