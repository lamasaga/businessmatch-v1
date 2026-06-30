# 经济学与代理人基模型（ABM）

> POP 机制不是凭空发明的，它有深厚的经济学理论基础。本章讲经济学中的「自下而上」建模方法。

## 1. 传统宏观经济学的代表：DSGE

### 1.1 什么是 DSGE

DSGE（Dynamic Stochastic General Equilibrium，动态随机一般均衡）是主流宏观经济模型。

特点：

- 假设经济中存在一个「代表性家庭」和一个「代表性企业」。
- 假设市场总是趋向均衡。
- 用数学方程描述总量关系。

### 1.2 优点

- 数学严谨
- 便于政策分析
- 适合央行和学术界

### 1.3 局限

- 无法处理异质性（所有人被假设成一样的）。
- 难以解释金融危机、泡沫、失业等「非均衡」现象。
- 假设太强，与现实有距离。

## 2. 代理人基模型（Agent-Based Modeling, ABM）

### 2.1 什么是 ABM

ABM 是「自下而上」的建模方法：

- 模拟大量异质性代理人（Agent）。
- 每个 Agent 有自己的规则和行为。
- 宏观现象从微观互动中涌现。

### 2.2 ABM 的核心思想

```
微观规则 × 大量 Agent × 互动 = 宏观现象
```

比如：

- 每个 Agent 只是根据邻居决定搬不搬家 → 城市出现种族隔离（Schelling 模型）。
- 每个 Agent 只是买卖糖 → 出现财富分布、贸易、社会分层（Sugarscape）。

## 3. 经典 ABM 案例

### 3.1 Schelling 隔离模型

- 两个类型的 Agent 住在网格上。
- 每个 Agent 希望邻居中至少有 30% 是同类。
- 结果：即使只有 30% 的偏好，城市也会出现严重隔离。

**启示**：宏观现象可以远超个体意图。

### 3.2 Sugarscape

- Agent 在二维网格上收集「糖」（资源）。
- Agent 会移动、消费、繁殖、交易、死亡。
- 结果：出现财富不平等、贸易、战争、文化传承。

**启示**：简单的微观规则可以涌现出复杂社会现象。

### 3.3 Lengnick 的 ABM 宏观经济模型

- 模拟家庭、企业、银行、政府。
- 家庭找工作、消费、储蓄。
- 企业雇佣、生产、定价、投资。
- 结果：商业周期、失业、通胀等宏观现象自发涌现。

## 4. ABM 与 POP 机制的关系

| ABM 概念 | POP 机制对应 |
|----------|-------------|
| Agent | POP（人群组） |
| Agent 规则 | POP 的收入、需求、迁移、政治行为规则 |
| 互动 | POP 在市场上买卖、竞争工作、投票 |
| 宏观涌现 | 价格、GDP、失业率、政治动荡 |
| 异质性 | 不同职业、收入、文化的 POP |

POP 机制本质上就是**游戏化的 ABM**。

## 5. ABM 在商业模拟中的价值

### 5.1 可以教的

- 供需关系
- 价格信号
- 通货膨胀
- 失业
- 贫富差距
- 经济周期
- 政策效果

### 5.2 不能教的

- 精确预测真实经济
- 替代真实经济数据
- 证明某个经济理论绝对正确

### 5.3 为什么适合教学

- 学生可以看到微观决策如何产生宏观结果。
- 可以反复实验不同政策。
- 失败是安全的，但能学到真实反馈。

## 6. ABM 的设计步骤

1. **定义 Agent 类型**：POP 的职业、收入、偏好。
2. **定义 Agent 规则**：收入怎么来、需求怎么变、如何迁移。
3. **定义互动环境**：市场、劳动力市场、政治系统。
4. **定义宏观指标**：GDP、失业率、通胀、价格指数。
5. **运行模拟并观察**：是否能复现历史 stylized facts。
6. **调整参数和规则**：直到宏观行为合理。

## 7. 与 AI 沟通示例

```
我要用 ABM 方法为一个商业模拟引擎设计 POP 系统。

Agent 类型：
- 工人：工资收入，消费日常商品
- 资本家：分红收入，投资工厂
- 农民：农产品收入

环境：
- 劳动力市场：工资由供需决定
- 商品市场：价格由供需决定
- 政策：最低工资、税收、补贴

宏观指标：
- GDP、失业率、CPI、基尼系数

请给出 Agent 状态、规则、市场清算流程和宏观指标计算方法。
```

## 最后更新

2026-06-14

---

**参考来源**：
- [Macroeconomics Institute - Agent-Based Modeling in Economics](https://macroeconomics.institute/agentbasedmodeling)
- [Cambridge - Agent-based Macroeconomics](https://www.cambridge.org/core/elements/agentbased-macroeconomics/B7016A5CEE59694A420AF51A1347F00E)
- [Axtell - Agent-Based Modeling in Economics and Finance](https://complexityhandbook.uni-hohenheim.de/fileadmin/einrichtungen/complexityhandbook/AXTELL_Robert.pdf)
- [Schelling's Model of Segregation](http://nifty.stanford.edu/2014/mccown-schelling-model-segregation/)
- [Sugarscape - Growing Agent-based Artificial Societies](https://sugarscape.sourceforge.net/)
- [Agent-based Macroeconomics - Lengnick (2013)](https://macau.uni-kiel.de/servlets/MCRFileNodeServlet/dissertation_derivate_00005979/Dissertation_Lengnick.pdf)
