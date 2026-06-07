# 生涯模式读账本 · Phase A BDD 文档

> **文档定位**：基于 `docs/prd-career-ledger-phase-a.md` 生成的行为驱动开发场景，用于指导开发、测试和验收。
> **语法**：Gherkin（Given-When-Then）
> **语言**：中文业务语言，避免技术实现细节
> **最后更新**：2026-06-07

---

## Feature 1：生涯模式开启

**作为** 一名注册学生
**我希望** 点击「开启生涯」后进入生涯模式
**从而** 在 Career Hub 中看到我的长期成长档案

### Scenario 1.1：首次开启生涯模式

```gherkin
Given 学生 "小林" 已注册并登录
And 小林尚未开启生涯模式
When 小林在 Career Start 页面点击「开启生涯 · 进入第 1 赛季」
Then 系统为小林创建生涯档案
And 档案标题为 "商业探索者"
And 档案赛季为 "2026-S1"
And 系统自动跳转至 Career Hub 主页
```

### Scenario 1.2：重复开启生涯模式保持幂等

```gherkin
Given 学生 "小林" 已注册并登录
And 小林已经开启过生涯模式
And 小林的生涯档案标题为 "商业探索者"
When 小林再次调用「开启生涯」
Then 系统不创建新的生涯档案
And 返回小林已有的生涯档案
And 档案信息保持不变
```

### Scenario 1.3：未登录学生本地体验生涯模式

```gherkin
Given 访客 "未登录用户" 打开 Career Start 页面
When 访客点击「开启生涯」
Then 前端允许本地进入 Career Hub 体验
And 页面展示演示数据
And 系统不调用后端创建档案接口
```

---

## Feature 2：Career Hub 读取成长数据

**作为** 一名已进入生涯模式的学生
**我希望** 打开 Career Hub 后看到真实的等级、XP、金币和钻石
**从而** 了解自己在平台上的成长进度

### Scenario 2.1：Career Hub 展示真实基础信息

```gherkin
Given 学生 "小林" 已开启生涯模式
And 小林的等级为 2
And 小林的 XP 为 100
And 小林的金币为 530
And 小林的钻石为 10
When 小林打开 Career Hub 主页
Then 页面显示等级 "Lv.2"
And 页面显示 XP 进度 "100 / 1000"
And 页面显示金币 "💰 530"
And 页面显示钻石 "💎 10"
```

### Scenario 2.2：Career Hub 展示五维雷达占位

```gherkin
Given 学生 "小林" 已开启生涯模式
When 小林打开 Career Hub 主页
Then 五维雷达图可见
And 财务、市场、战略、协作、伦理五维均显示为 50
And 雷达图旁标注 "能力评估持续更新中"
```

### Scenario 2.3：Career Hub 展示近期成长统计

```gherkin
Given 学生 "小林" 已开启生涯模式
And 小林近 7 天通过比赛获得 30 金币
And 小林近 7 天未获得钻石
And 小林总共参与过 3 场比赛
When 小林打开 Career Hub 主页
Then 页面显示 "近 7 天获得金币 30"
And 页面显示 "近 7 天获得钻石 0"
And 页面显示 "总场次 3"
```

### Scenario 2.4：Career Hub 数据加载失败时优雅降级

```gherkin
Given 学生 "小林" 已开启生涯模式
And 小林的网络连接中断
When 小林打开 Career Hub 主页
Then 页面展示本地演示数据
And 页面显示提示 "数据同步中，部分信息可能不是最新"
And 页面不白屏
```

---

## Feature 3：比赛结算资源入账

**作为** 一名参与比赛的学生
**我希望** 比赛结束后根据表现获得 XP、金币和钻石
**从而** 在生涯模式中有持续的成长反馈

### Scenario 3.1：练习赛结束后获得 XP 和金币

```gherkin
Given 学生 "小林" 参与了一场练习赛
And 小林在比赛中的总资产的排名为第 2 名
And 练习赛基础金币奖励为 30
And 第 2 名金币加成系数为 1.25
When 比赛结束并结算
Then 小林获得 XP
And 小林获得金币 38（30 × 1.25 取整）
And 小林不获得钻石
And Career Hub 中金币余额相应增加
```

### Scenario 3.2：正式赛结束后获得 XP、金币和钻石

```gherkin
Given 学生 "小林" 参与了一场 official_t2 正式赛
And 小林在比赛中的总资产的排名为第 1 名
And official_t2 基础金币奖励为 100
And 第 1 名金币加成系数为 1.5
And official_t2 固定钻石奖励为 2
When 比赛结束并结算
Then 小林获得 XP
And 小林获得金币 150（100 × 1.5）
And 小林获得钻石 2
And Career Hub 中金币和钻石余额相应增加
```

### Scenario 3.3：正式赛钻石发放不随排名变化

```gherkin
Given 学生 "小林" 参与了一场 official_t2 正式赛，排名第 3
And 学生 "小王" 参与了同一场 official_t2 正式赛，排名第 1
When 比赛结束并结算
Then 小林获得钻石 2
And 小王获得钻石 2
And 两人的钻石数量相同
```

### Scenario 3.4：同一比赛结算幂等，不重复发放

```gherkin
Given 学生 "小林" 参与了一场 official_t2 正式赛
And 比赛已正常结束并结算过一次
When 系统因异常重试再次调用结算
Then 小林不再额外获得 XP
And 小林不再额外获得金币
And 小林不再额外获得钻石
And 资源余额保持不变
```

### Scenario 3.5：AI 对手不参与资源分配

```gherkin
Given 一场比赛中有 4 名真人学生和 2 名 AI 对手
When 比赛结束并结算
Then 只有 4 名真人学生获得 XP、金币和钻石
And 2 名 AI 对手不获得任何资源
And 排名只计算真人学生
```

---

## Feature 4：近期比赛记录

**作为** 一名已进入生涯模式的学生
**我希望** 在 Career Hub 中看到最近参与的比赛记录
**从而** 回顾自己的比赛表现和成长轨迹

### Scenario 4.1：Career Hub 展示最近比赛记录

```gherkin
Given 学生 "小林" 近 7 天参与了 3 场比赛
When 小林打开 Career Hub 主页
Then 页面展示最近 3 条比赛记录
And 每条记录包含比赛标题、类型、完成时间、名次、获得 XP、获得金币、获得钻石
```

### Scenario 4.2：比赛记录按时间倒序排列

```gherkin
Given 学生 "小林" 先后完成了比赛 A（昨天）、比赛 B（前天）、比赛 C（上周）
When 小林查看近期比赛记录
Then 比赛 A 显示在第 1 条
And 比赛 B 显示在第 2 条
And 比赛 C 显示在第 3 条
```

### Scenario 4.3：无比赛记录时展示空状态

```gherkin
Given 学生 "小林" 已开启生涯模式
And 小林尚未参与任何比赛
When 小林打开 Career Hub 主页
Then 近期比赛区域显示 "还没有比赛记录"
And 页面显示引导 "去商赛大厅开启第一场练习吧"
```

---

## Feature 5：家园入口占位

**作为** 一名已进入生涯模式的学生
**我希望** 提前看到家园入口但知道尚未开放
**从而** 对未来的功能有期待，同时不产生困惑

### Scenario 5.1：家园入口可见但加锁

```gherkin
Given 学生 "小林" 已开启生涯模式
When 小林打开 Career Hub 主页
Then 页面显示 "我的家园" 入口
And 入口旁显示锁图标
And 入口显示 "5 个槽位待解锁"
```

### Scenario 5.2：点击加锁家园入口展示提示

```gherkin
Given 学生 "小林" 已开启生涯模式
And 小林在 Career Hub 主页
When 小林点击 "我的家园" 入口
Then 系统弹出提示 "家园系统即将开放，敬请期待"
And 不发生页面跳转
And 不扣除任何资源
```

---

## Feature 6：金币和钻石的界面规则

**作为** 一名已进入生涯模式的学生
**我希望** 清楚了解两种资源的区别
**从而** 合理规划自己的参与策略

### Scenario 6.1：悬停金币显示说明

```gherkin
Given 学生 "小林" 在 Career Hub 主页
When 小林将鼠标悬停在金币数量上
Then 显示提示 "金币：参与日常活动与比赛获取"
```

### Scenario 6.2：悬停钻石显示说明

```gherkin
Given 学生 "小林" 在 Career Hub 主页
When 小林将鼠标悬停在钻石数量上
Then 显示提示 "钻石：参与正式赛获取"
```

### Scenario 6.3：金币和钻石点击无消费响应

```gherkin
Given 学生 "小林" 在 Career Hub 主页
When 小林点击金币或钻石图标
Then 不发生任何消费行为
And 不跳转至任何商店页面
And 不弹出消费弹窗
```

---

## Feature 7：不同比赛类型的资源获取差异

**作为** 平台设计者
**我希望** 不同比赛类型的资源收益有明确区分
**从而** 引导学生从练习走向正式赛

### Scenario 7.1：练习赛只发金币不发钻石

```gherkin
Given 学生 "小林" 参与了一场练习赛
When 比赛结束并结算
Then 小林可能获得金币
And 小林获得钻石 0
```

### Scenario 7.2：营内对抗赛只发金币不发钻石（B1 启用）

```gherkin
Given 学生 "小林" 参与了一场营内对抗赛
When 比赛结束并结算
Then 小林可能获得金币
And 小林获得钻石 0
```

### Scenario 7.3：正式赛同时发金币和钻石

```gherkin
Given 学生 "小林" 参与了一场 official_t2 或 official_t1 正式赛
When 比赛结束并结算
Then 小林可能获得金币
And 小林获得固定数量钻石
```

---

## Feature 8：新用户初始资源

**作为** 一名新注册学生
**我希望** 开启生涯时获得初始资源
**从而** 有基础的经济体验

### Scenario 8.1：新用户注册获得初始资源

```gherkin
Given 新用户 "小林" 完成注册
When 系统自动初始化小林账户
Then 小林获得初始 XP 100
And 小林获得初始金币 500
And 小林获得初始钻石 10
```

### Scenario 8.2：初始资源不影响比赛结算

```gherkin
Given 新用户 "小林" 刚注册，拥有初始金币 500
When 小林完成第一场练习赛并获得金币 30
Then 小林的金币余额变为 530
And 系统正确累加，不覆盖初始值
```

---

## Feature 9：Career Hub 数据聚合准确性

**作为** 一名学生
**我希望** Career Hub 中展示的数据与后台一致
**从而** 信任平台的成长记录

### Scenario 9.1：Career Hub 等级与 XP 一致

```gherkin
Given 学生 "小林" 的累计 XP 为 2500
When 小林打开 Career Hub 主页
Then 页面显示等级 "Lv.3"
And 页面显示 "2500 / 3000 XP"
```

### Scenario 9.2：Career Hub 资源余额实时更新

```gherkin
Given 学生 "小林" 原有金币 500
When 小林完成一场比赛并获得金币 100
And 小林刷新 Career Hub 主页
Then 页面显示金币 "💰 600"
```

---

## 附录：BDD 到测试的映射建议

| Feature | 推荐测试类型 | 优先级 |
|---------|-------------|--------|
| Feature 1 生涯模式开启 | API 单元测试 + E2E | P0 |
| Feature 2 Career Hub 读取 | API 集成测试 + 前端组件测试 | P0 |
| Feature 3 比赛结算入账 | 后端单元测试 + E2E | P0 |
| Feature 4 近期比赛记录 | API 集成测试 | P1 |
| Feature 5 家园入口占位 | 前端组件测试 | P1 |
| Feature 6 金币钻石界面 | 前端组件测试 | P1 |
| Feature 7 不同比赛类型 | 后端单元测试 | P0 |
| Feature 8 新用户初始资源 | 后端单元测试 + DB 校验 | P1 |
| Feature 9 数据聚合准确 | API 集成测试 | P0 |

---

*商域 BizSim Edu · 生涯模式读账本 BDD v1.0*
