# 与 AI 沟通 POP 机制需求

> 本章提供向 AI 描述 POP 机制需求时的模板和关键词。

## 1. 描述 POP 机制需求的结构

```
【目标】这个 POP 系统要实现什么宏观效果
【POP 类型】有哪些人群组
【POP 属性】每个 POP 有什么状态
【POP 规则】POP 如何决策
【玩家行动】玩家能做什么
【反馈闭环】玩家行动如何影响 POP，POP 如何影响市场
【宏观指标】需要观察什么
【性能约束】POP 数量和更新频率限制
【验收】怎么测试
```

## 2. 关键词速查

### POP 基础

| 你想说的 | 关键词 |
|---------|--------|
| 人群组 | POP, population unit, demographic group |
| 职业分层 | class, profession, strata |
| 生活水平 | standard of living, SoL, well-being |
| 需求层级 | life needs, everyday needs, luxury needs |
| 迁移 | migration, push-pull factors |
| 升级/降级 | promotion, demotion, social mobility |
| 政治倾向 | political stance, consciousness, radicalism |

### 经济与涌现

| 你想说的 | 关键词 |
|---------|--------|
| 微观到宏观 | bottom-up, microfoundation, emergence |
| 代理人基模型 | agent-based modeling, ABM |
| 市场清算 | market clearing, supply-demand equilibrium |
| 价格形成 | price discovery, supply-demand |
| 反馈循环 | feedback loop, circular flow |
| 涌现现象 | emergent phenomena, self-organization |

### 量化金融

| 你想说的 | 关键词 |
|---------|--------|
| 订单簿 | limit order book, LOB |
| 市场微观结构 | market microstructure |
| 订单流 | order flow |
| 羊群效应 | herding behavior |
| 自激发过程 | Hawkes process |
| 行为偏差 | behavioral bias, loss aversion, anchoring |

## 3. 提示词模板

### 模板一：设计 POP 系统

```
我要为 [游戏/引擎名] 设计一个 POP（人群组）系统。

目标：
[一句话描述希望涌现的宏观现象]

POP 类型：
1. [类型1]：[收入来源和特点]
2. [类型2]：[收入来源和特点]
3. [类型3]：[收入来源和特点]

POP 属性：
- 规模
- 收入
- 财富
- 需求
- 满意度
- 位置
- 政治倾向

玩家行动：
- [行动1]
- [行动2]
- [行动3]

反馈闭环：
[描述玩家行动如何影响 POP，POP 如何影响市场]

宏观指标：
- [指标1]
- [指标2]
- [指标3]

性能约束：
- 总 POP 数量不超过 [N]
- 每轮更新时间不超过 [X] 毫秒

请给出数据结构、更新流程和性能优化建议。
```

### 模板二：实现涌现机制

```
我要在 [引擎名] 中实现一个涌现机制。

目标宏观现象：
[通胀 / 失业 / 泡沫 / 产业升级等]

微观规则：
1. [规则1]
2. [规则2]
3. [规则3]

玩家触发条件：
[玩家什么行为会导致这个现象]

观察指标：
[如何让学生/玩家看到这个现象]

边界条件：
[避免现象无限放大或永不发生]

请给出触发条件、反馈公式和可视化方案。
```

### 模板三：教学应用

```
我要为一个 [学段] 商业模拟课程设计 POP 教学模块。

教学目标：
[学生要理解的经济学概念]

POP 简化设计：
[2-3 种 POP，简单规则]

学生操作：
[学生能调整什么]

期望观察：
[学生应该看到什么因果关系]

请给出教学设计、POP 规则和课堂引导问题。
```

## 4. 常见错误

| 错误 | 后果 | 改进 |
|------|------|------|
| "做一个真实的经济模拟" | 目标模糊、不可实现 | 明确要教的 1-2 个概念 |
| "POP 越细越好" | 性能爆炸、不可调试 | 先粗粒度，再按需细化 |
| "所有 POP 都一样" | 没有异质性，无法涌现 | 至少分 2-3 类 |
| "反馈要立刻" | 没有惯性，不像真实经济 | 引入延迟和粘性 |
| "只做微观不做宏观指标" | 玩家看不到涌现 | 必须可视化宏观指标 |
| "让 LLM 直接控制 POP" | 不可解释、不可复现 | LLM 只生成文本/建议 |

## 5. 验收 POP 系统的清单

- [ ] POP 类型清晰可区分
- [ ] 玩家行动能影响 POP
- [ ] POP 行为能反馈到市场
- [ ] 能观察到宏观指标变化
- [ ] 出现过至少一个涌现现象
- [ ] 性能在可接受范围内
- [ ] 规则可解释，能向学生说明
- [ ] 与现实经济学概念有对应关系

## 最后更新

2026-06-14
