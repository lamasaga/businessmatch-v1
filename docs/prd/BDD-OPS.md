# OPS 引擎 BDD · 生产经营销售赛

> **文档定位**：OPS 目标契约的行为驱动开发场景，覆盖 6 轮运营 + 2 轮拍卖 + 无教师练习全流程。
> **对应 PRD**：[PRD-OPS.md](./PRD-OPS.md)
> **对应 SPEC**：[SPEC-OPS.md](./SPEC-OPS.md)
> **最后更新**：2026-06-16

---

## Feature 1：练习赛创建与 AI 补位

**作为** 学生  
**我希望** 一个人也能启动 OPS 练习赛  
**从而** 在没有教师控场时完成完整赛事体验

### Scenario 1.1：学生创建单人 OPS 练习赛

```gherkin
Given 学生 "小林" 已登录学生端
And 系统已加载 OPS 配置 "ops-sim-v1"
When 小林启动 OPS 练习赛
Then 系统创建一个 "practice" 比赛
And 比赛使用引擎 "ops_sim"
And 比赛配置 ID 为 "ops-sim-v1"
And 系统创建 1 支真人队和 3 支 AI 队
And AI 队策略分别为 "balanced"、"aggressive"、"conservative"
And 比赛阶段为 "positioning"
```

### Scenario 1.2：练习赛不设置倒计时限制

```gherkin
Given 小林已进入 OPS 练习赛
When 小林查看当前阶段信息
Then 页面不显示强制截止倒计时
And 页面显示 "提交后可进入下一阶段"
```

---

## Feature 2：产品定位与首个拍卖阶段

**作为** 参赛队伍  
**我希望** 先完成产品定位，再参与开局拍卖  
**从而** 在 R1 前确定品类、客群和基础经营资源

### Scenario 2.1：真人提交定位后 AI 自动补齐定位

```gherkin
Given 小林的 OPS 练习赛处于 "positioning"
And 3 支 AI 队尚未提交产品定位
When 小林提交产品名 "智享台灯"、品类 "home"、目标客群 "pragmatic"
Then 系统保存小林队伍的产品定位
And 3 支 AI 队自动生成产品定位
And 阶段变为 "auction_a"
And 响应数据中包含 "phase" 为 "auction_a"
```

### Scenario 2.2：产品名为空时不能提交

```gherkin
Given 小林的 OPS 练习赛处于 "positioning"
When 小林提交空产品名
Then 系统提示 "请输入产品名称"
And 阶段仍为 "positioning"
```

### Scenario 2.3：拍卖 A 展示基础经营资源

```gherkin
Given 小林的 OPS 练习赛处于 "auction_a"
When 小林查看拍卖大厅
Then 拍卖大厅显示基础经营资源
And 拍品包含生产线、原材料折扣或城市广告位
And 页面显示 "跳过拍卖" 或 "进入 R1" 的阶段推进入口
```

---

## Feature 3：练习赛单人推进完整 6 轮

**作为** 练习赛玩家  
**我希望** 提交策略后由 AI 补齐并点按钮推进  
**从而** 不依赖教师也能完成 6 轮运营

### Scenario 3.1：R1 决策提交后进入下一回合按钮亮起

```gherkin
Given 小林的 OPS 练习赛处于 "operation_round_1"
And 小林尚未提交 R1 决策
When 小林提交 R1 运营决策
Then 系统保存小林的 R1 决策
And 3 支 AI 队自动提交 R1 决策
And 页面显示 "进入下一回合" 按钮可点击
```

### Scenario 3.2：点击进入下一回合后结算当前轮

```gherkin
Given 小林的 OPS 练习赛处于 "operation_round_1"
And 小林和 3 支 AI 队均已提交 R1 决策
When 小林点击 "进入下一回合"
Then 系统结算 R1
And 小林看到 R1 财务报表
And 阶段变为 "operation_round_2"
```

### Scenario 3.3：R3 结束后进入拍卖 B

```gherkin
Given 小林的 OPS 练习赛处于 "operation_round_3"
And 小林和 AI 队均已提交 R3 决策
When 小林点击 "进入下一回合"
Then 系统结算 R3
And 阶段变为 "auction_b"
And 拍卖大厅展示战略资源拍品
```

### Scenario 3.4：R6 结束后进入最终结算

```gherkin
Given 小林的 OPS 练习赛处于 "operation_round_6"
And 小林和 AI 队均已提交 R6 决策
When 小林点击 "完成比赛"
Then 系统结算 R6
And 比赛阶段变为 "finished"
And 页面显示最终排名
And 系统触发练习赛 Career 奖励结算
```

---

## Feature 4：两轮拍卖

**作为** 参赛队伍  
**我希望** 在关键时点竞拍资源  
**从而** 建立早期经营基础和中后期战略优势

### Scenario 4.1：拍卖 A 的资源全局生效

```gherkin
Given 小林的队伍在 "auction_a" 拍得 "标准生产线"
When 小林进入 R1 运营决策
Then 小林队伍的产能上限包含该生产线加成
And 该加成在 R1 到 R6 均生效
```

### Scenario 4.2：拍卖 B 展示主题化战略资源

```gherkin
Given 本场 OPS 赛事主题为 "校园消费品创业赛"
And 小林的练习赛处于 "auction_b"
When 小林查看拍品列表
Then 拍品名称围绕本场主题展示
And 拍品类型包含独家渠道、战略资源、品牌代言或法律保护
```

### Scenario 4.3：拍卖 B 的资源全局生效

```gherkin
Given 小林的队伍在 "auction_b" 拍得 "校园渠道独家代理"
When 小林进入 R4 运营决策
Then 小林队伍拥有该渠道资源
And 该资源在 R4 到 R6 以及最终结算中均可生效
```

### Scenario 4.4：出价超过现金时失败

```gherkin
Given 小林队伍现金为 80000
And 当前拍品最高价为 70000
When 小林出价 90000
Then 系统提示 "出价超过可用现金"
And 出价未记录
```

---

## Feature 5：正式赛教师控场与倒计时

**作为** 教师  
**我希望** 控制正式赛阶段并让倒计时真实生效  
**从而** 保证课堂节奏和比赛公平

### Scenario 5.1：正式赛运营轮默认 20 分钟

```gherkin
Given 教师 "李老师" 创建 OPS 正式赛
When 李老师开始 R1 运营轮
Then R1 决策窗口为 20 分钟
And 学生端显示同一个倒计时
```

### Scenario 5.2：倒计时结束后学生不能继续提交

```gherkin
Given OPS 正式赛处于 "operation_round_1"
And R1 倒计时已结束
When 学生 "小林" 提交 R1 决策
Then 系统提示 "当前轮次已截止"
And 决策未保存
```

### Scenario 5.3：教师可提前截止并推进

```gherkin
Given OPS 正式赛处于 "operation_round_2"
And 8 支队伍中已有 7 支提交决策
When 李老师点击 "截止并结算"
Then 未提交队伍获得默认决策
And 系统结算 R2
And 阶段进入下一阶段
```

### Scenario 5.4：教师可暂停并恢复

```gherkin
Given OPS 正式赛处于 "operation_round_4"
When 李老师点击 "暂停比赛"
Then 阶段变为 "paused"
When 李老师点击 "恢复比赛"
Then 阶段恢复为 "operation_round_4"
```

---

## Feature 6：财务报表、排名与奖励

**作为** 参赛队伍  
**我希望** 每轮看到财务和排名反馈  
**从而** 理解经营决策的结果

### Scenario 6.1：单轮结算后生成财务报表

```gherkin
Given 小林队伍已提交 R2 运营决策
When 系统结算 R2
Then 小林看到 R2 损益表
And 小林看到 R2 资产负债表
And 报表包含营业收入、营业成本、运营利润、现金、库存和净资产
```

### Scenario 6.2：排行榜按最终得分排序

```gherkin
Given OPS 比赛已完成 R6 结算
And 队伍 "创新者联盟" 最终得分为 120000
And 队伍 "极速科技" 最终得分为 110000
When 小林查看最终排行榜
Then "创新者联盟" 排名第 1
And "极速科技" 排名第 2
```

### Scenario 6.3：练习赛发放低权重奖励

```gherkin
Given 小林完成 OPS 练习赛
And 小林队伍排名第 1
When 系统结算 Career 奖励
Then 小林获得练习赛参与奖励
And 小林获得第一名奖励
And 奖励写入 XP 账本且不会重复发放
```

---

## Feature 7：首期联调回归

**作为** 开发者  
**我希望** OPS 首期暴露的问题被写入回归场景  
**从而** 后续扩展 6+2 时不重复踩坑

### Scenario 7.1：练习赛定位提交后不能卡在 positioning

```gherkin
Given 小林的 OPS 练习赛有 1 支真人队和 3 支 AI 队
And 比赛阶段为 "positioning"
When 小林提交产品定位
Then 系统自动为 3 支 AI 队补齐定位
And 响应数据包含新阶段
And 新阶段不是 "positioning"
```

### Scenario 7.2：教师控场数据缺省时也不黑屏

```gherkin
Given OPS 比赛刚进入教师控场页
And 尚无已结算轮次
When 教师端读取控场数据
Then 响应包含 teams、rounds、ranking 三个数组字段
And teams、rounds、ranking 为空时仍返回空数组
And 教师端页面正常渲染
```

### Scenario 7.3：关键写操作必须返回业务阶段

```gherkin
Given 小林提交 OPS 产品定位成功
When 小林查看提交响应
Then 响应中包含 "phase"
And "phase" 等于提交后的最新阶段
```

### Scenario 7.4：联调不能只看 HTTP 200

```gherkin
Given 开发者正在验证 OPS 阶段推进
When 关键请求返回 HTTP 200
Then 开发者还必须检查响应中的 "phase"
And 若 "phase" 未变化，则本次验证不通过
```

---

## Feature 8：阿思丹类赛程取舍护栏

**作为** 产品与研发团队  
**我希望** OPS 只把阿思丹类活动中的经营模拟主干纳入 P0  
**从而** 避免把路演、评委评分、交易谈判等外围活动误做成引擎硬依赖

### Scenario 8.1：主题化拍品不改变核心结算契约

```gherkin
Given 本场 OPS 赛事主题为 "校园消费品创业赛"
And "auction_b" 拍品展示为 "校园渠道独家代理"
When 系统读取该拍品的结算效果
Then 该拍品仍映射到标准类型 "exclusive_channel"
And 结算逻辑只读取结构化 effect 字段
And 不依赖展示文案进行计算
```

### Scenario 8.2：没有路演评分时仍可完成 P0 排名

```gherkin
Given OPS 比赛已完成 R6 结算
And 本场没有配置路演、答辩或评委评分环节
When 系统生成最终排名
Then 排名按净资产和累计利润计算
And 比赛阶段变为 "finished"
And Career 奖励可正常结算
```

### Scenario 8.3：外围活动不能阻塞练习赛

```gherkin
Given 小林正在进行 OPS 练习赛
When 小林完成 R6 运营结算
Then 系统不要求提交商业计划书、路演视频或评委评分
And 小林可以直接看到最终排名和复盘数据
```

---

## 附录：BDD 到测试的映射建议

| Feature | 推荐测试类型 | 优先级 |
|---------|-------------|--------|
| Feature 1 练习赛创建与 AI 补位 | API 集成测试 + E2E | P0 |
| Feature 2 产品定位与首个拍卖阶段 | API 集成测试 | P0 |
| Feature 3 练习赛单人推进完整 6 轮 | API 集成测试 + E2E | P0 |
| Feature 4 两轮拍卖 | 后端单元测试 + API 集成测试 | P0 |
| Feature 5 正式赛教师控场与倒计时 | API 集成测试 + 前端 E2E | P0 |
| Feature 6 财务报表、排名与奖励 | 后端单元测试 + DB 校验 | P0 |
| Feature 7 首期联调回归 | 回归测试 + 冒烟脚本 | P0 |
| Feature 8 阿思丹类赛程取舍护栏 | 单元测试 + 契约测试 | P0 |

---

*商识唯智 · OPS 引擎 BDD v2.0*
