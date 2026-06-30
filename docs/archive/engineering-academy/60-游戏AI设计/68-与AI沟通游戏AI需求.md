# 与 AI 沟通游戏 AI 需求

> 本章提供向 AI 描述游戏 AI 需求时的模板和关键词，帮助你获得更准确的输出。

## 1. 描述 AI 需求的结构

```
【目标】这个 AI 要达到什么效果
【场景】在什么玩法 / 引擎中使用
【输入】AI 能感知到什么信息
【输出】AI 要做出什么决策
【约束】不能做什么、必须遵守的规则
【验收】怎么测试 AI 是否合格
```

## 2. 关键词速查

### 简单 AI

| 你想说的 | 关键词 |
|---------|--------|
| 随机行为 | random AI, stochastic behavior |
| 状态切换 | finite state machine, FSM |
| 模块化行为 | behavior tree, BT, selector, sequence |
| 如果那么 | rule-based AI, if-then rules |
| 多动作打分 | utility AI, scoring function |

### 搜索与规划

| 你想说的 | 关键词 |
|---------|--------|
| 最短路径 | A* pathfinding |
| 双人博弈 | minimax, alpha-beta pruning |
| 复杂决策 | Monte Carlo Tree Search, MCTS |
| 动作组合 | GOAP, goal-oriented action planning |

### 机器学习

| 你想说的 | 关键词 |
|---------|--------|
| 从数据学习 | supervised learning, classification |
| 试错学习 | reinforcement learning, RL, PPO, DQN |
| 参数优化 | genetic algorithm, evolution strategy |
| 行为克隆 | behavior cloning |

### 复杂机制

| 你想说的 | 关键词 |
|---------|--------|
| 市场自发运行 | economic simulation, emergent behavior |
| NPC 关系 | social simulation, reputation, faction |
| 自动生成事件 | procedural narrative, dynamic events |
| 自动调难度 | dynamic difficulty adjustment, DDA |

### 大模型

| 你想说的 | 关键词 |
|---------|--------|
| 生成文本 | LLM text generation, prompt engineering |
| 检索增强 | RAG, retrieval-augmented generation |
| 工具调用 | LLM agent, function calling, tool use |
| 多步推理 | ReAct, chain-of-thought, LangGraph |

### 伴随成长

| 你想说的 | 关键词 |
|---------|--------|
| 了解玩家 | player modeling, player segmentation |
| 自动调难度 | adaptive difficulty, skill matching |
| 教学 AI | mentor AI, tutorial AI, scaffolding |
| 情绪推断 | affective computing, engagement modeling |

## 3. 提示词模板

### 模板一：新增规则 AI

```
我要为 [引擎名] 增加一个 [AI 名称/难度] 对手。

目标：
[一句话描述 AI 的风格]

规则：
1. [规则1]
2. [规则2]
3. [规则3]

输入信息：
- [AI 能看到的游戏状态]

输出决策：
- [AI 每轮/tick 要选择的动作]

约束：
- 不修改结算公式
- 不跨域写入数据库
- 决策可解释，能输出理由
- 使用服务器权威模式

请给出实现方案和需要修改的文件。
```

### 模板二：引入 LLM 增强

```
我要为 [引擎名] 增加一个 [功能]，使用 LLM 增强。

功能：
[描述功能]

LLM 作用：
- [只做文本生成 / 生成建议 / Agent 决策]

输入：
- [给 LLM 的上下文]

输出格式：
- [JSON / 纯文本 / 结构化数据]

约束：
- LLM 不直接修改比赛状态
- 输出需要规则层校验
- 控制成本，结果可缓存
- 支持中文

请提供 prompt 模板、调用流程和错误处理。
```

### 模板三：AI 伴随成长

```
我要为 [引擎名] 增加一个导师/自适应 AI。

目标：
[让玩家获得什么体验]

玩家建模：
- 需要收集的数据：[胜率、排名、决策类型等]
- 推断的玩家状态：[新手/熟练/专家]

AI 行为：
- 玩家处于 X 状态时，AI 做什么
- 玩家处于 Y 状态时，AI 做什么

约束：
- 不泄露系统在对玩家做适应性调整
- 保持公平性
- 玩家可关闭此功能

请给出玩家建模方案和 AI 调整规则。
```

## 4. 常见错误

| 错误 | 后果 | 改进 |
|------|------|------|
| "做一个聪明的 AI" | AI 定义模糊 | 明确聪明的具体表现 |
| "让 AI 自己学习" | 可能产生不可解释行为 | 先规定学习边界和验收指标 |
| "LLM 直接决定比赛结果" | 违反 Phase 门控和公平性 | LLM 只做文本/建议 |
| "AI 知道玩家所有信息" | 显得作弊 | 限制 AI 的可见信息 |
| "只做一个难度" | 无法服务不同水平玩家 | 至少做 3 档难度 |

## 5. 验收 AI 的清单

- [ ] AI 能正常完成一局游戏
- [ ] AI 行为符合设计目标
- [ ] AI 不违反游戏规则
- [ ] AI 在不同难度下表现有差异
- [ ] AI 决策可解释（能输出理由）
- [ ] AI 不会导致游戏崩溃或死循环
- [ ] AI 性能可接受（不会卡住服务器）
- [ ] 与玩家对战 10 局后，玩家能描述出 AI 的风格

## 最后更新

2026-06-14
