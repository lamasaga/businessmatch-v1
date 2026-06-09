# 95 - POP 行为涌现：学术研究支撑与开源实现指南

> **文档定位**：面向商域平台 POP（Persona-Oriented Play）机制建设的「学术理论 → 行为原语 → 开源工具」三层桥梁文档。将金融、商业研究领域的学术成果映射到具体行为原语设计，并为工程实施推荐可直接落地的开源工具栈。
>
> **关联文档**：`POP行为涌现与区域市场/01-调研索引` · `02-ABM与ACE` · `03-异质主体宏观` · `04-微观结构与空间贸易` · `07-数据生产校准手册` · `拟真城市-POP与市场机制-PRD`
>
> **状态**：[研究 · 待对齐 Phase 门控]
>
> **最后更新**：2026-06-09

---

## 一、为什么需要这份指南

POP 目录下已有 02～07 的学术范式分册，分别从 **ABM/ACE、HANK、微观结构、空间贸易、因子模型、系统动力学** 等角度建立了理论基础。但这些文档存在一个断层：**学术理论「是什么」与「用什么工具做」之间缺少一座桥**。

本指南回答两个具体问题：

1. **学术研究能为 POP 的哪条行为原语提供数学基础或教学叙事？**
   —— 不是泛泛介绍学科，而是精确映射到 `behavior_pack.yaml` 中的原语 id。

2. **有哪些开源项目可以把这些理论「跑起来」，且与商域现有 Python/FastAPI 技术栈兼容？**
   —— 优先推荐 Python-native、Apache/MIT/BSD 许可、社区活跃的项目。

本指南与 02～07 的关系：**02～07 回答「学术范式的原理与数据怎么做」；本指南回答「学术理论 → 原语映射 → 开源工具选型」**。

---

## 二、学术研究支撑映射

以下按学术领域分节，每节包含：**核心洞察 → 可支撑的原语 → 关键文献 → 教学叙事建议**。

### 2.1 行为经济学与离散选择模型 → `reference_price`、`budget_hard`、`habit_stock`

#### 核心洞察

传统经济学假设代理人具有稳定偏好并追求期望效用最大化。行为经济学（Kahneman & Tversky, 1979；Thaler, 1980）发现，**人类决策依赖参考点、对损失更敏感、且存在心理账户**。离散选择模型（McFadden, 1974）提供了将个体选择概率化的数学框架——随机效用模型（RUM）中，代理人从有限选项集中选择效用最高的替代方案，但效用包含一个随机误差项，使选择具有概率性而非确定性。

将两者结合，得到**参考依赖随机效用模型**：属性被评估为相对于参考点的「收益」或「损失」，且损失被加权更多（损失厌恶系数 λ ≈ 2.25）。

#### 可支撑的原语

| 原语 id | 行为经济学基础 | 离散选择模型表达 | POP 实现建议 |
|---------|---------------|-----------------|-------------|
| `reference_price` | 参考依赖（Tversky & Kahneman, 1991） | 效用 = β⁺·max(x−x_ref, 0) + β⁻·min(x−x_ref, 0)，其中 \|β⁻\| > \|β⁺\| | 每个 cohort 维护 `memory_price`；现价偏离 > X% 才触发买/卖决策 |
| `budget_hard` | 心理账户（Thaler, 1999） | 预算约束进入 RUM 的选项集筛选：仅当价格 ≤ 预算时才纳入选择集 | 本月可花 ≤ 收入 × (1 − savings_rate)；超预算选项直接排除 |
| `habit_stock` | 习惯形成（Pollak, 1970；Dynan, 2000） | 当期效用依赖滞后消费：U(c_t, c_{t−1})；必需品有最低消费量 | 必需品设置 `min_consumption` 阈值；低于阈值时满意度急剧下降 |
| `loss_aversion_bias` | 损失厌恶（λ ≈ 2.25） | 混合 logit 中损失项系数为收益项的 2～3 倍 | 同 cohort 的「卖出」决策比「买入」更保守（卖出 = 实现损失） |

#### 关键文献

| 作者 | 年份 | 贡献 | 教学叙事 |
|------|------|------|----------|
| **Kahneman & Tversky** | 1979 | 前景理论：参考点、损失厌恶、概率加权 | 「人们不是绝对理性，而是相对于『记忆中的价格』做决策」 |
| **McFadden** | 1974, 2000 | 离散选择随机效用模型；多项 logit | 「为什么同一价格的商品，有人买有人不买？因为选择是概率的」 |
| **Tversky & Kahneman** | 1991 | 参考依赖偏好理论 | 「涨价 10% 比降价 10% 更让人难受——这就是损失厌恶」 |
| **Thaler** | 1999 | 心理账户理论 | 「你的大脑有『本月可花』的账户上限，不是简单的收入−储蓄」 |

---

### 2.2 量化响应均衡与认知层级 → 异质主体交互、`income_lag`

#### 核心洞察

当多个主体在市场中互动时，「完全理性」假设不成立。**量化响应均衡（QRE, McKelvey & Palfrey, 1995）** 引入噪声：主体以概率方式选择最优策略，精度参数 λ 衡量「理性程度」。λ → ∞ 时退化为纳什均衡；λ → 0 时为随机选择。

**认知层级理论（Camerer, Ho & Chong, 2004）** 进一步发现，人群中存在不同推理深度的主体：Level-0 完全随机；Level-1 认为别人都是 Level-0 并最优响应；Level-2 认为别人是 Level-1 分布……高阶主体对低阶分布做最优响应，而非对单一类型响应。

结合两者，**异质主体 QRE（Golman, 2011）** 允许不同 cohort 拥有不同的 λ，产生丰富的异质交互模式。

#### 可支撑的原语

| 原语 id | QRE/认知层级基础 | POP 实现建议 |
|---------|-----------------|-------------|
| `income_lag` | 信息处理需要时间；Level-k 越高，滞后越短 | 不同 cohort 的 `income_lag_ticks` 不同：大众消费（Level-1）滞后 6 tick，中产（Level-2）滞后 3 tick |
| `supplier_response` | 供应商作为更高 λ 的主体，对价格信号有延迟但系统的响应 | 连续 N tick bid < 成本 → 减产意愿累积 → 供给曲线上移 |
| `strategic_thinking_depth`（远期） | 认知层级分布：Poisson(τ) | 每个 cohort 分配 τ 参数；τ 越高，越能预判他人行为 |

#### 关键文献

| 作者 | 年份 | 贡献 |
|------|------|------|
| **McKelvey & Palfrey** | 1995 | QRE：随机最优响应均衡 |
| **Camerer, Ho & Chong** | 2004 | 认知层级理论：Poisson 分布的推理深度 |
| **Golman** | 2011 | 异质主体 QRE：不同 λ 的群体交互 |
| **Rogers, Palfrey & Camerer** | 2009 | HQRE 与认知层级的统一框架 |
| **Goeree, Holt & Palfrey** | 2016 | QRE 全面教科书 |

---

### 2.3 社会学习与信息级联 → `social_contagion`、`scarcity_panic`

#### 核心洞察

个体不仅依赖私有信息做决策，还观察他人的行为并从中推断信息。**信息级联（Bikhchandani, Hirshleifer & Welch, 1992）** 表明：当已公开信息足够强时，理性个体会忽略自己的私有信号而跟随他人，形成「级联」。级联一旦形成，对私人信号极度敏感——一个公开信号即可打破它（**脆弱性**）。

**羊群行为（Banerjee, 1992）** 从另一角度证明：即使每个人都理性，群体仍可能走向错误方向。Acemoglu 等（2011）将分析扩展到网络结构，证明网络拓扑决定信息是否能有效聚合。

#### 可支撑的原语

| 原语 id | 信息级联基础 | POP 实现建议 |
|---------|-------------|-------------|
| `social_contagion` | 信息级联 + 网络传播 | 邻城/同 cohort 的 `satisfaction` 变化超过阈值 → 跟风调整需求；网络密度决定传播速度 |
| `scarcity_panic` | 级联的负面形式：恐慌性抢购 | 连续缺货 tick → 本 cohort 加大订单；邻城观察到缺货信号后跟风 |
| `luxury_veblen`（待决） | 炫耀性消费的信号传递 | 高价 + 他人购买 → 需求↑；但需小心与教学目标的张力 |

#### 关键文献

| 作者 | 年份 | 贡献 | 教学叙事 |
|------|------|------|----------|
| **Bikhchandani, Hirshleifer & Welch** | 1992 | 信息级联理论 | 「为什么需求会被『制造』出来？因为看别人买，你也想买」 |
| **Banerjee** | 1992 | 羊群行为模型 | 「每个人都在理性地跟随别人，但群体可能走向错误」 |
| **Acemoglu et al.** | 2011 | 网络中的社会学习 | 「城市之间的连接方式，决定了涨价消息传多快」 |
| **Chamley** | 2004 | 《Rational Herds》教科书 | 级联形成、打破与政策干预的完整框架 |
| **Bikhchandani et al.** | 2021/2024 | JEL 综述「Information Cascades and Social Learning」 | 最新理论发展与实证证据 |

---

### 2.4 市场微观结构 → `pool` 动态、`ask/bid`、价差

#### 核心洞察

市场微观结构研究**订单流如何在短时间内形成价格**。存在两个互补范式：

- **库存/流动性模型**（Stoll, 1978；Ho & Stoll, 1981）：做市商为管理库存风险调整报价，产生**临时性**价格冲击。
- **信息/逆向选择模型**（Kyle, 1985；Glosten & Milgrom, 1985）：知情交易者的订单流被做市商学习，导致**永久性**价格调整。

Hasbrouck（1988, 1991）用 VAR 模型将两者分离。现代混合模型（Madhavan et al., 1997）同时纳入逆向选择、订单处理和库存持有成本。

#### 与 POP Pool 模型的对应

| 微观结构概念 | 学术含义 | POP 对应 |
|-------------|----------|----------|
| **Bid–ask spread** | 流动性成本 = 逆向选择 + 订单处理 + 库存风险 | `min_spread` + 动态 spread(pressure) |
| **Market depth** | 大单对价格的影响程度 | `Pool_target`；Pool 越大，同等订单流冲击越小 |
| **Inventory risk** | 做市商偏离理想库存的代价 | 城市 `pool` 动态：偏离 target 越大，价格调整越剧烈 |
| **Price impact** | 净订单流推动价格 | `pressure = h(Pool/Pool_target, Φ_net/Pool_target)` |
| **Kyle's Lambda** | 价格对订单流的敏感度 | 本系统的 `elasticity` 参数有类似经济学含义 |
| **VPIN**（远期） | 订单流毒性实时测度 | 可用于检测「scarcity_panic」级联的预警信号 |

#### 关键文献

| 作者 | 年份 | 贡献 |
|------|------|------|
| **Kyle** | 1985 | 连续拍卖与知情交易；Kyle's Lambda |
| **Glosten & Milgrom** | 1985 | 序贯交易模型；买卖价差作为逆向选择 |
| **Ho & Stoll** | 1981, 1983 | 库存风险与做市商定价 |
| **Hasbrouck** | 1988, 1991 | VAR 分解临时 vs 永久价格冲击 |
| **O'Hara** | 1995 | 《Market Microstructure Theory》教科书 |
| **Easley, López de Prado & O'Hara** | 2012 | VPIN：订单流毒性实时测度 |
| **Biais, Glosten & Spatt** | 2005 | 微观结构全面综述 |

---

### 2.5 新空间经济学 → 城市网络、跨城贸易、物流边权

#### 核心洞察

**新经济地理学（NEG, Krugman, 1991）** 将运输成本、规模经济和消费者偏好多样性纳入一般均衡，解释了经济活动为何在空间上集聚。核心机制：当运输成本适中时，集聚力（前后向关联）超过分散力（市场接近竞争），形成核心–边缘结构。

**引力模型**预测城市间贸易流：`T_ij ∝ (Y_i · Y_j) / D_ij^θ`，其中 Y 为经济规模，D 为距离。Anderson（1979）和 Krugman（1980）为其提供了微观基础。

**空间均衡模型**（Redding & Rossi-Hansberg,  various）进一步纳入劳动力流动和通勤，解释工资、房价和人口的空间分布。

#### 可支撑的原语与机制

| POP 机制 | NEG/空间经济学基础 | 实现建议 |
|----------|-------------------|----------|
| 跨城套利窗口 | 空间套利 = 价差 − 运输成本 | `profit = ask_B − bid_A − transport_cost − time_cost`；> 0 时套利可行 |
| 物流边权 | 引力模型的距离衰减 | `edge_weight = f(distance, transport_mode, congestion)` |
| 城市产业分工 | 比较优势 + 集聚经济 | L2 母本中 `production[c,p]` 反映城市产业结构 |
| 港口/枢纽溢价 | 中心地理论 + 枢纽效应 | 交通枢纽城市的 `mid_structural` 有系统性溢价 |
| 迁移效应（远期） | 空间均衡：工资差 → 劳动力流动 | 多赛季沙盘可引入人口迁移反馈 |

#### 关键文献

| 作者 | 年份 | 贡献 |
|------|------|------|
| **Krugman** | 1991 | 「Increasing Returns and Economic Geography」——NEG 奠基 |
| **Fujita, Krugman & Venables** | 1999 | 《The Spatial Economy》——NEG 教科书 |
| **Anderson** | 1979 | 引力方程的理论基础 |
| **Eaton & Kortum** | 2002 | 技术、地理与贸易——Ricardian 微观基础 |
| **Chaney** | 2008 | 「Distorted Gravity」——异质企业与引力 |
| **Allen & Arkolakis** | 2014 | 贸易与空间经济的地形——QJE |
| **Koster, Proost & Thisse** | 2026 | 《Spatial Economics》Oxford——最新教科书 |

---

### 2.6 搜索匹配模型 → `supplier_response`、劳动力市场、工资传导

#### 核心洞察

**Diamond-Mortensen-Pissarides（DMP）模型**（2010 诺贝尔经济学奖）将劳动力市场建模为**搜索与匹配**过程，而非瞬时出清。核心要素：

- **匹配函数**：`M(U,V) = K·U^β·V^γ`，失业者 U 与空缺岗位 V 的匹配数量。
- **Nash 议价**：匹配成功后，工资在工人和企业之间分配匹配剩余。
- **Beveridge 曲线**：失业率与空缺率的负向关系，反映了匹配效率。

模型的关键洞察：**失业与空缺可以共存**，因为搜索是有摩擦的。工资变化不会立即传导到就业，因为匹配需要时间。

#### 可支撑的原语

| 原语 id | DMP 基础 | POP 实现建议 |
|---------|----------|-------------|
| `supplier_response` | 企业维持生产的搜索/匹配成本；长期 bid 过低 → 退出匹配 | 连续 N tick `bid < production_cost` → `supply_willingness` 累积下降 |
| `income_lag` | 工资变化 → 匹配重新谈判 → 收入变化有滞后 | 全局 `Δwage` 事件后，不同 cohort 的 `income_lag_ticks` 不同 |
| `labor_mobility`（远期） | 工人跨城搜索匹配 | 多赛季沙盘：工资差 → 人口迁移 → 城市 cohort 结构变化 |

#### 关键文献

| 作者 | 年份 | 贡献 |
|------|------|------|
| **Diamond** | 1982 | 均衡搜索框架 |
| **Mortensen** | 1982 | 工作创造/破坏动态 |
| **Pissarides** | 1985, 2000 | 综合为可操作框架；《Equilibrium Unemployment Theory》 |
| **Mortensen & Pissarides** | 1994 | DMP 标准版本 |
| **Shimer** | 2005 | 「Shimer 之谜」——标准校准产生过低波动 |
| **Rogerson, Shimer & Wright** | 2005 | 搜索理论劳动市场模型全面综述 |

---

### 2.7 复杂适应系统 → 涌现、自组织、非均衡动态

#### 核心洞察

**复杂适应系统（CAS）** 理论（Santa Fe Institute, Arthur & Holland, 1990s）将经济视为由大量**适应性行为主体**组成的系统，宏观模式（价格波动、产业集聚、技术锁定）是**涌现**结果，而非中央计划者或代表性代理人的最优解。

Arthur 的**人工股票市场**（Arthur et al., 1996）证明：当主体使用归纳推理（而非演绎理性）时，市场会自发产生**波动聚集、胖尾分布和崩溃**——这些都是真实市场的 stylized facts，但传统均衡模型无法解释。

核心概念：
- **涌现（Emergence）**：整体 > 部分之和；价格趋势不能被还原为单个主体的意图。
- **路径依赖**：历史事件（偶然冲击）对长期结果有持续影响。
- **自组织**：系统无需外部指令即可形成有序结构。

#### 可支撑的设计哲学

| POP 设计原则 | CAS 理论基础 | 教学意义 |
|-------------|-------------|----------|
| **定义后置**（pop_id 为输出而非输入） | 涌现：标签是事后对模式命名 | 「我们先看市场怎么跑，再给消费群起名字」 |
| **行为原语驱动** | 微观规则 → 宏观涌现 | 「简单的买卖规则，合起来产生复杂的价格趋势」 |
| **非均衡动态** | CAS 远离均衡运行 | 「市场很少处于均衡；价格永远在调整中」 |
| **反馈环** | 正/负反馈叠加 | 「工资涨 → 消费涨 → 价格涨 → 要求更高工资」 |

#### 关键文献

| 作者 | 年份 | 贡献 |
|------|------|------|
| **Arthur** | 1999 | 「Complexity and the Economy」——Science |
| **Arthur** | 2013 | 「Complexity Economics: A Different Framework」——SFI |
| **Arthur, Holland et al.** | 1996 | 人工股票市场：归纳推理主体产生真实市场特征 |
| **Holland** | 1995 | 《Hidden Order》：CAS 的适应性机制 |
| **Epstein & Axtell** | 1996 | 《Growing Artificial Societies》：Sugarscape 模型 |
| **Waldrop** | 1992 | 《Complexity》：SFI 创立史 |

---

### 2.8 异质主体宏观经济学 → 工资传导、消费分布（补充 03-）

#### 核心洞察

已在 03- 中详细覆盖。本指南仅补充其与开源工具的连接点。

HANK（Heterogeneous-Agent New Keynesian）模型的核心教学价值：**同一冲击对不同财富/收入群体的影响不同**。货币政策（利率变化）对低财富家庭的消费影响更大，因为他们更依赖当期收入。

#### 与 POP 的映射（快速参考）

| HANK 概念 | POP 原语 | 数据来源建议 |
|----------|----------|-------------|
| 边际消费倾向异质 | `budget_hard` + `income_index` | CHFS（中国家庭金融调查）消费函数估计 |
| 名义工资粘性 | `income_lag` | 统计公报工资增长率 |
| 借贷约束 | `budget_hard` 中的 credit_access flag | 城市人均信贷可得性 |
| 财富分布 | cohort 初始 `cash` 分布 | 城市住户调查资产分布 |

---

## 三、开源实现工具箱

以下按工具类别组织，每节包含：**工具简介 → 与 POP 的对应 → 安装与快速启动 → 商域适配度评估**。

### 3.1 ABM 仿真框架

#### 3.1.1 Mesa（Python）—— 首选

| 属性 | 详情 |
|------|------|
| **GitHub** | `projectmesa/mesa` |
| **许可** | Apache 2.0 |
| **版本** | Mesa 3.1.x（2025） |
| **Python** | 3.12+ |

**核心能力：**
- AgentSet：灵活的 Agent 和模型管理系统
- 空间支持：网格、网络、连续空间
- 批量运行：参数扫描、敏感性分析
- Solara 可视化：浏览器交互界面
- 与 NumPy、Pandas、NetworkX 原生集成

**与 POP 的对应：**

```
Mesa Agent      →  POP cohort / 匿名主体状态机
Mesa Model      →  PopEngine（城市 + 商品 + 路网）
Mesa Space      →  城市网络（NetworkX Graph）
Mesa Scheduler  →  tick() 调度（与 RTS scheduler 对齐概念）
Mesa DataCollector → 仿真日志 → 事后聚类/校准
```

**快速启动：**

```bash
pip install -U "mesa[rec]"
```

```python
from mesa import Agent, Model
from mesa.time import RandomActivation

class PopCohort(Agent):
    """POP 主体：携带行为状态机"""
    def __init__(self, unique_id, model, pop_params):
        super().__init__(unique_id, model)
        self.cash = pop_params['initial_cash']
        self.memory_price = {}
        self.satisfaction = 0.5

    def step(self):
        # 行为原语：reference_price + budget_hard + habit_stock
        for product in self.model.products:
            price = self.model.current_prices[product]
            ref = self.memory_price.get(product, price)
            if abs(price - ref) / ref > self.model.threshold:
                # 偏离记忆价超过阈值，触发决策
                desired = self.calculate_demand(product)
                if desired * price <= self.cash * (1 - self.model.savings_rate):
                    self.place_order(product, desired)
```

**商域适配度：** ⭐⭐⭐⭐⭐
- Python-native，与现有 FastAPI 后端技术栈一致
- Apache 2.0 许可，无商业限制
- 社区活跃（500+ 论文引用，800+ 作者）
- 可视化能力可用于教研演示

#### 3.1.2 Agents.jl（Julia）—— 高性能备选

| 属性 | 详情 |
|------|------|
| **GitHub** | `JuliaDynamics/Agents.jl` |
| **许可** | MIT |

**核心能力：** 比 Python Mesa 快 10～100 倍（取决于问题）；支持大规模 Agent 交互。

**与 POP 的对应：** 当单个城市需要 >10,000 个匿名主体时，Agents.jl 的 Julia 性能优势显现。可作为 Mesa 原型验证后的高性能替代。

**商域适配度：** ⭐⭐⭐
- 需引入 Julia 运行时，增加运维复杂度
- 适合 Phase C+ 的高性能需求场景

#### 3.1.3 NetLogo —— 教研原型

| 属性 | 详情 |
|------|------|
| **官网** | ccl.northwestern.edu/netlogo |
| **许可** | GPL |

**核心能力：** 教育向 ABM 的首选；可视化极强；学习曲线平缓。

**与 POP 的对应：** 用于教研人员的「行为原语调试」——在 NetLogo 中快速验证某个原语（如 `social_contagion`）是否能产生预期的宏观模式，再将规则导出为 YAML。

**商域适配度：** ⭐⭐⭐（仅原型）
- 不直接集成到生产后端
- 但可用于生成 behavior_pack 的参考规则

---

### 3.2 异质主体经济学工具包

#### 3.2.1 Econ-ARK / HARK —— 异质主体宏观求解

| 属性 | 详情 |
|------|------|
| **GitHub** | `econ-ark/HARK` |
| **许可** | Apache 2.0 |
| **赞助** | NumFOCUS |
| **版本** | 0.17.x（2025） |

**核心能力：**
- 求解异质主体消费/储蓄决策（Aiyagari、Buffer-stock、Lifecycle）
- 聚合不确定性（Krusell-Smith）
- 2025 新增：Sequence Space Jacobian（SSJ）集成、YAML 配置、自动离散化
- AgentPopulation 类：表示外生前异质参数化的人群

**与 POP 的对应：**

```
HARK AgentType        →  单个 cohort 的消费/储蓄决策函数
HARK AgentPopulation  →  城市内 cohort 分布
HARK simulation       →  蒙特卡洛仿真 → 生成 L3 demand_vector 初值
HARK SSJ              →  冲击响应函数（IRF）→ 验证 wage→consumption 传导方向
```

**快速启动：**

```bash
pip install econ-ark
# 或
conda install -c conda-forge econ-ark
```

```python
from HARK.ConsumptionSaving.ConsIndShockModel import IndShockConsumerType

# 创建一个「中产 cohort」的消费决策者
agent = IndShockConsumerType(
    CRRA=2.0,           # 风险厌恶
    Rfree=1.03,         # 无风险利率
    DiscFac=0.96,       # 折现因子
    LivPrb=[0.98],      # 存活概率
    PermGroFac=[1.01],  # 永久收入增长
    # ... 收入冲击分布参数
)
agent.solve()  # 求解消费函数
```

**商域适配度：** ⭐⭐⭐⭐
- 不直接替代 POP 引擎（HARK 是求解器，POP 是仿真器）
- 但可用于：①生成 L3 初值；②验证传导方向；③教研人员的「手算复现」参考
- Apache 2.0 许可

#### 3.2.2 QuantEcon.py —— 定量经济学基础

| 属性 | 详情 |
|------|------|
| **GitHub** | `QuantEcon/QuantEcon.py` |
| **许可** | BSD-3 |

**核心能力：** 线性代数、马尔可夫链、动态规划、博弈论求解等基础工具。代码简洁，教学价值高。

**与 POP 的对应：**
- `quantecon.markov`：消费状态转移矩阵 → cohort 状态演化
- `quantecon.optimize`：动态规划 → 最优消费路径（教研参考）
- `quantecon.game_theory`：博弈论基础 → 竞争动力学教学模块

**商域适配度：** ⭐⭐⭐
- 偏教学/研究，非直接生产工具
- 可用于生成参考实现和测试基准

---

### 3.3 优化求解工具

#### 3.3.1 Pyomo —— 通用代数建模（首选）

| 属性 | 详情 |
|------|------|
| **GitHub** | `Pyomo/pyomo` |
| **许可** | BSD |

**核心能力：**
- 最通用的 Python 优化建模框架
- 支持 LP、MILP、QP、NLP、随机规划、多阶段优化
- Solver-agnostic：开源（GLPK、CBC、IPOPT）+ 商业（Gurobi、CPLEX）
- PySP 包：专门支持随机规划

**与 POP 的对应：**

```
空间均衡求解    →  多个城市同时出清：Pyomo + IPOPT
供应链优化      →  跨城物流路径：Pyomo + CBC
教师事件包校准   →  参数使仿真输出匹配目标矩：Pyomo + 最小二乘
```

**快速启动：**

```python
from pyomo.environ import *

# 示例：两城空间均衡的简单出清模型
model = ConcreteModel()
model.Cities = Set(initialize=['shanghai', 'suzhou'])
model.Products = Set(initialize=['rice', 'steel'])

# 决策变量：每城每品的产量和消费量
model.production = Var(model.Cities, model.Products, within=NonNegativeReals)
model.consumption = Var(model.Cities, model.Products, within=NonNegativeReals)
model.trade = Var(model.Cities, model.Cities, model.Products, within=Reals)

# 约束：市场出清
 def market_clearing(model, c, p):
     return (model.production[c,p] +
             sum(model.trade[other,c,p] for other in model.Cities) ==
             model.consumption[c,p] +
             sum(model.trade[c,other,p] for other in model.Cities))
 model.clearing = Constraint(model.Cities, model.Products, rule=market_clearing)

# 求解
solver = SolverFactory('glpk')
solver.solve(model)
```

**商域适配度：** ⭐⭐⭐⭐⭐
- 与 Python 后端完全兼容
- BSD 许可
- 学术和工业标准

#### 3.3.2 PuLP —— 入门友好

| 属性 | 详情 |
|------|------|
| **GitHub** | `coin-or/pulp` |
| **许可** | MIT |

**核心能力：** LP 和 MILP；自带 CBC 求解器；语法直观。

**与 POP 的对应：** 快速原型、教研验证。当问题规模较小（< 100 变量）时，PuLP 比 Pyomo 更简洁。

**商域适配度：** ⭐⭐⭐⭐
- 适合早期原型和教学
- 维护状态需关注（2022 起寻找共同维护者）

#### 3.3.3 OR-Tools —— 物流与调度

| 属性 | 详情 |
|------|------|
| **GitHub** | `google/or-tools` |
| **许可** | Apache 2.0 |
| **维护** | Google（非常活跃） |

**核心能力：**
- 车辆路径问题（VRP）
- 约束规划（CP-SAT）
- 调度与排班
- 旅行商问题

**与 POP 的对应：**
- 跨城商队的最优路径 = VRP 的简化版
- 物流拥堵调度 = 约束规划

**商域适配度：** ⭐⭐⭐⭐
- 若浮生记扩展「多商队路径规划」玩法，OR-Tools 是首选
- 目前 POP 核心机制不需要

#### 3.3.4 CVXPY —— 凸优化

| 属性 | 详情 |
|------|------|
| **GitHub** | `cvxpy/cvxpy` |
| **许可** | Apache 2.0 |

**核心能力：** 凸优化（LP、QP、SOCP、SDP）；DCP（Disciplined Convex Programming）保证凸性。

**与 POP 的对应：** 参数校准的最小二乘问题、投资组合优化（远期 OPC 场景）。

**商域适配度：** ⭐⭐⭐
- 适合校准层（L3→仿真→矩匹配）
- 一般性不如 Pyomo

---

### 3.4 城市与空间分析工具

#### 3.4.1 UrbanSim —— 城市统计仿真平台

| 属性 | 详情 |
|------|------|
| **GitHub** | `UDST/urbansim` |
| **许可** | BSD-3-Clause |
| **Stars** | 540+ |

**核心能力：**
- 城市房地产、人口统计的长期预测模型
- 基于普查数据（美国为 Census block level）
- 与交通需求模型双向耦合
- 依赖：Pandas、NumPy、Statsmodels、Orca（任务编排）

**与 POP 的对应：**

```
UrbanSim 的 location choice model  →  POP 的 cohort 空间分布
UrbanSim 的 real estate model     →  POP 的产业结构长期演化（远期）
UrbanSim 的 developer model       →  POP 的供给响应（supplier_response 的慢速版本）
```

**快速启动：**

```bash
pip install urbansim
# 或
conda install urbansim --channel conda-forge
```

**商域适配度：** ⭐⭐⭐
- 主要用于长期城市仿真，与 POP 的 tick 级仿真时间尺度不同
- 但其「城市统计模型」方法论（基于普查数据校准）可直接借鉴到 L2 母本建设

#### 3.4.2 OSMnx —— 街道网络分析

| 属性 | 详情 |
|------|------|
| **GitHub** | `gboeing/osmnx` |
| **许可** | MIT |

**核心能力：**
- 从 OpenStreetMap 下载真实城市街道网络
- 步行、驾车、骑行网络一键生成
- 与 GeoPandas 原生集成（输出 GeoDataFrame）
- 建筑物轮廓、设施 POI、高程数据

**与 POP 的对应：**
- 长三角六城的路网数据 → OSMnx 下载 → GeoPandas 处理 → 城市节点+边权
- 真实运距计算（非直线距离）

**快速启动：**

```python
import osmnx as ox

# 下载南京市中心的道路网络
G = ox.graph_from_place("Nanjing, China", network_type="drive")

# 计算最短路径（真实运距）
orig = ox.nearest_nodes(G, 118.78, 32.06)   # 经纬度
dest = ox.nearest_nodes(G, 120.62, 31.30)   # 苏州
route = ox.shortest_path(G, orig, dest, weight="length")
length = nx.shortest_path_length(G, orig, dest, weight="length")
```

**商域适配度：** ⭐⭐⭐⭐⭐
- 直接支撑 08-长三角六城起步手册的路网建设
- MIT 许可
- 输出直接对接 GeoPandas → 后端 JSON/YAML

#### 3.4.3 GeoPandas —— 空间数据处理基石

| 属性 | 详情 |
|------|------|
| **GitHub** | `geopandas/geopandas` |
| **许可** | BSD-3-Clause |

**核心能力：** 扩展 Pandas 以支持地理空间数据（GeoDataFrame）；处理 Shapefile、GeoJSON、GeoPackage；与 Shapely、Fiona、GDAL 集成。

**与 POP 的对应：** L1/L2 数据层的地理数据处理；城市边界、路网、POI 的空间操作。

**商域适配度：** ⭐⭐⭐⭐⭐
- 整个空间分析栈的基础
- 必装

#### 3.4.4 Pandana —— 网络可达性快速计算

| 属性 | 详情 |
|------|------|
| **GitHub** | `UDST/pandana` |
| **许可** | AGPL-3.0 |
| **Stars** | 422+ |

**核心能力：** 基于收缩层次结构（Contraction Hierarchies）的快速可达性计算；百万级节点秒级响应。

**与 POP 的对应：** 计算「从 A 城到 B 城的所有可能路径及运距」；支撑引力模型的距离衰减参数校准。

**商域适配度：** ⭐⭐⭐⭐
- AGPL 许可需注意（若修改代码需开源）
- 但仅作为工具调用不触发 copyleft

#### 3.4.5 NetworkX —— 复杂网络分析

| 属性 | 详情 |
|------|------|
| **GitHub** | `networkx/networkx` |
| **许可** | BSD-3-Clause |

**核心能力：** 图的创建、操作、分析；社区发现、中心性计算、路径算法。

**与 POP 的对应：**
- 城市贸易网络 = NetworkX Graph
- `social_contagion` 的传播路径 = 最短路径/广度优先搜索
- 网络中心性 → 识别「关键枢纽城市」

**商域适配度：** ⭐⭐⭐⭐⭐
- Python 网络分析标准库
- Mesa 也依赖 NetworkX 做空间层

---

### 3.5 数据科学与统计基础栈

#### 3.5.1 pandas / NumPy / SciPy —— 数据处理铁三角

| 工具 | 许可 | POP 用途 |
|------|------|----------|
| **pandas** | BSD | 仿真日志 DataFrame；时间序列聚合；城市母本 CSV/YAML 读写 |
| **NumPy** | BSD | 向量化计算；价格矩阵；需求向量运算 |
| **SciPy** | BSD | 优化（scipy.optimize）；统计分布（scipy.stats）；插值 |

#### 3.5.2 statsmodels —— 统计建模与计量经济学

| 属性 | 详情 |
|------|------|
| **许可** | BSD |

**核心能力：** 回归分析、时间序列（ARIMA、VAR）、离散选择（Logit、Probit）、面板数据。

**与 POP 的对应：**
- VAR 模型 → Hasbrouck 式分解（临时 vs 永久价格冲击）
- Logit/Probit → 离散选择参数估计（McFadden 框架）
- 矩匹配校准 → 仿真输出 vs 实际数据的统计检验

**商域适配度：** ⭐⭐⭐⭐⭐

#### 3.5.3 scikit-learn —— 机器学习（事后聚类）

| 属性 | 详情 |
|------|------|
| **许可** | BSD |

**核心能力：** PCA、K-Means、层次聚类、高斯混合模型等。

**与 POP 的对应：**
- 仿真日志聚类 → 自动建议 `pop_id` 标签（R4 阶段）
- PCA → 识别主要需求驱动因子（对应 05-统计因子）

**商域适配度：** ⭐⭐⭐⭐
- 仅用于事后分析，不替代规则层

#### 3.5.4 xarray —— 多维标记数组

| 属性 | 详情 |
|------|------|
| **许可** | Apache 2.0 |

**核心能力：** 带标签的多维数组（城市 × 商品 × 时间 × cohort）；类似 pandas 但支持 N 维。

**与 POP 的对应：** `prices[city, product, tick]`、`demand[city, product, cohort, tick]` 等 N 维数据的优雅表达。

**商域适配度：** ⭐⭐⭐⭐
- 当仿真维度 > 3 时，xarray 比 pandas MultiIndex 更清晰

---

## 四、学术研究 → 行为原语 → 开源工具 映射总表

| 学术领域 | 核心洞察 | 支撑的原语 | 推荐开源工具 | 商域优先级 |
|----------|----------|-----------|-------------|-----------|
| **行为经济学 + 离散选择** | 参考依赖、损失厌恶、概率化选择 | `reference_price`, `budget_hard`, `habit_stock` | statsmodels (Logit), Pyomo | P0 |
| **QRE + 认知层级** | 异质理性、随机最优响应 | `income_lag`, `supplier_response` | Mesa, quantecon | P1 |
| **社会学习 + 信息级联** | 跟风、级联、网络传播 | `social_contagion`, `scarcity_panic` | Mesa (NetworkX space), NetLogo | P0 |
| **市场微观结构** | 订单流、价差、库存风险 | `pool` 动态、`ask/bid` | Pyomo, statsmodels (VAR) | P0 |
| **新空间经济学** | 集聚、引力、空间均衡 | 跨城套利、物流边权 | OSMnx, GeoPandas, Pyomo | P1 |
| **搜索匹配（DMP）** | 摩擦、匹配函数、Nash 议价 | `supplier_response`, `income_lag` | HARK (参考), Pyomo | P2 |
| **复杂适应系统** | 涌现、路径依赖、自组织 | 设计哲学（定义后置） | Mesa (涌现验证), NetLogo | P0（理念） |
| **异质主体宏观** | 工资传导、分位数差异 | `budget_hard`, `income_lag` | HARK, Econ-ARK | P2 |

---

## 五、分阶段采纳建议

### 5.1 与 POP 研究路线（R0～R4）的对齐

| 阶段 | 学术侧重 | 开源工具交付 | 与主 PRD §11 的对齐 |
|------|----------|-------------|---------------------|
| **R0** | 行为经济学基础 + 离散选择 | Mesa 原型（2 城 × 3 POP × 10 品） | 原语清单 + Excel 验算 |
| **R1** | 市场微观结构（Pool–价） | Pyomo 空间均衡求解 + Mesa 批量仿真 | `pop_engine` 单测 |
| **R2** | 信息级联（1 条）+ DMP（工资传导） | Mesa + NetworkX 传播模拟 | 教师事件包 |
| **R3** | 认知层级（推理深度分布） | Mesa Agent 异质参数 + HARK 参考 | 行为包 v1：4 原语 |
| **R4** | 事后因子分析（PCA 命名 POP） | scikit-learn 聚类 + statsmodels 矩匹配 | 复盘卡「主驱动 cohort」 |

### 5.2 技术栈演进路线

```
Phase B 初期（R0～R1）
├── Python 标准栈：pandas + NumPy + SciPy
├── ABM 验证：Mesa（原型）
├── 优化校准：Pyomo + GLPK
└── 空间数据：GeoPandas + OSMnx

Phase B 后期（R2～R3）
├── 增加：HARK（参考消费函数）
├── 增加：NetworkX + Pandana（城市网络分析）
├── 增加：statsmodels（VAR、Logit 校准）
└── 保持：Mesa 为主框架

Phase C+（R4及以后）
├── 增加：scikit-learn（事后聚类命名）
├── 评估：Agents.jl（大规模性能需求）
└── 评估：xarray（高维数据管理）
```

---

## 六、风险与约束

### 6.1 学术理论与工程实现的张力

| 张力 | 说明 | 缓解策略 |
|------|------|----------|
| **理论精确 vs 教学可解释** | QRE 的 λ 估计需要大量实验数据；教学中用固定参数 | 参数固定为「高/中/低」三档，教研可手动调节 |
| **均衡求解 vs 涌现仿真** | HANK 用 SSJ 快速求解稳态；POP 是离散 tick 仿真 | 不引入 DSGE 求解器；仅借用传导叙事和 1～2 个参数 |
| **连续优化 vs 离散决策** | Pyomo 解连续问题；POP 主体做离散买/卖决策 | Pyomo 用于校准和参考基准；运行时保持离散仿真 |

### 6.2 开源工具的风险

| 工具 | 风险 | 缓解策略 |
|------|------|----------|
| **Mesa** | 大规模并发（>10,000 Agent）性能未充分验证 | 先小尺度验证；需要时评估 Agents.jl |
| **HARK** | 学习曲线陡峭；主要用于学术研究 | 仅由教研/算法团队使用；不暴露给学生 |
| **Pyomo** | 需额外安装求解器（GLPK/CBC） | Docker 镜像预装；提供 conda environment.yml |
| **Pandana** | AGPL-3.0 许可 | 仅作为独立进程调用；不修改源码 |
| **PuLP** | 维护状态不确定（寻找共同维护者） | 优先使用 Pyomo；PuLP 仅用于教学原型 |

### 6.3 数据可获得性

| 数据需求 | 来源 | 可得性 |
|----------|------|--------|
| 城市产业 `production` | 中国投入产出表 + 统计年鉴 | 公开，需映射 SOP |
| 消费品分类需求向量 | CHFS（中国家庭金融调查） | 需学术合作或购买 |
| 城市间运距/运费 | OSMnx（道路）+ 物流平台 | OSM 免费；运费需估计 |
| 人口/收入分布 | 统计公报 + 住户调查 | 公开，需口径对齐 |

---

## 七、待探索问题

1. **Mesa 与现有 RTS scheduler 的集成模式。** Mesa 有自己的 Scheduler 抽象，而商域已有 `rts_scheduler.py` 的单写者模式。两者是「Mesa 用于离线原型 + 手写引擎用于在线」还是「Mesa 嵌入生产」？

2. **HARK 消费函数的导出格式。** HARK 求解的个体消费规则能否导出为商域 behavior_pack.yaml 可读的参数化函数？还是需要重新实现？

3. **OSMnx 中国城市的覆盖质量。** 长三角六城在 OpenStreetMap 中的道路网络完整度如何？农村/郊区是否有明显缺失？

4. **离散选择模型的参数估计。** 商域没有真实的个体选择数据。如何用专家 elicitation + 文献校准替代？是否需要设计小规模的实验经济学收集数据？

5. **Pyomo 求解器在 SQLite 单进程架构下的性能。** 空间均衡求解是否会成为瓶颈？何时需要引入 Gurobi/CPLEX 等商业求解器？

---

## 附录 A：核心学术文献速查表

按学术领域分类，按与本平台的相关度排序。

### A.1 行为经济学与离散选择

| 优先级 | 作者 | 年份 | 标题/贡献 |
|--------|------|------|----------|
| P0 | Kahneman & Tversky | 1979 | Prospect Theory: An Analysis of Decision under Risk |
| P0 | McFadden | 1974 | Conditional Logit Analysis of Qualitative Choice Behavior |
| P1 | Tversky & Kahneman | 1991 | Loss Aversion in Riskless Choice |
| P1 | Thaler | 1999 | Mental Accounting Matters |
| P2 | Train | 2009 | Discrete Choice Methods with Simulation（教科书） |

### A.2 战略互动与异质理性

| 优先级 | 作者 | 年份 | 标题/贡献 |
|--------|------|------|----------|
| P0 | McKelvey & Palfrey | 1995 | Quantal Response Equilibria for Normal Form Games |
| P0 | Camerer, Ho & Chong | 2004 | A Cognitive Hierarchy Model of Games（QJE） |
| P1 | Golman | 2011 | Why Do the Rich gamble more? QRE with Heterogeneous Agents |
| P1 | Goeree, Holt & Palfrey | 2016 | Quantal Response Equilibrium: A Stochastic Theory of Games（书） |

### A.3 社会学习与信息级联

| 优先级 | 作者 | 年份 | 标题/贡献 |
|--------|------|------|----------|
| P0 | Bikhchandani, Hirshleifer & Welch | 1992 | A Theory of Fads, Fashion, Custom, and Cultural Change as Informational Cascades |
| P0 | Banerjee | 1992 | A Simple Model of Herd Behavior（QJE） |
| P1 | Chamley | 2004 | Rational Herds: Economic Models of Social Learning（书） |
| P1 | Bikhchandani et al. | 2024 | Information Cascades and Social Learning（JEL 综述） |
| P2 | Acemoglu et al. | 2011 | Bayesian Learning in Social Networks |

### A.4 市场微观结构

| 优先级 | 作者 | 年份 | 标题/贡献 |
|--------|------|------|----------|
| P0 | Kyle | 1985 | Continuous Auctions and Insider Trading（Econometrica） |
| P0 | Glosten & Milgrom | 1985 | Bid, Ask and Transaction Prices in a Specialist Market |
| P1 | Hasbrouck | 1991 | Measuring the Information Content of Stock Trades（JOF） |
| P1 | O'Hara | 1995 | Market Microstructure Theory（书） |
| P2 | Easley, López de Prado & O'Hara | 2012 | Flow Toxicity and Liquidity in a High-Frequency World |
| P2 | Biais, Glosten & Spatt | 2005 | Market Microstructure: A Survey |

### A.5 空间经济学

| 优先级 | 作者 | 年份 | 标题/贡献 |
|--------|------|------|----------|
| P0 | Krugman | 1991 | Increasing Returns and Economic Geography（JPE） |
| P0 | Fujita, Krugman & Venables | 1999 | The Spatial Economy（书） |
| P1 | Anderson | 1979 | A Theoretical Foundation for the Gravity Equation |
| P1 | Eaton & Kortum | 2002 | Technology, Geography, and Trade（Econometrica） |
| P2 | Allen & Arkolakis | 2014 | Trade and the Topography of the Spatial Economy（QJE） |

### A.6 搜索匹配与劳动经济学

| 优先级 | 作者 | 年份 | 标题/贡献 |
|--------|------|------|----------|
| P1 | Pissarides | 2000 | Equilibrium Unemployment Theory, 2nd ed.（书） |
| P1 | Rogerson, Shimer & Wright | 2005 | Search-Theoretic Models of the Labor Market: A Survey（JEL） |
| P2 | Mortensen & Pissarides | 1994 | Job Creation and Job Destruction in the Theory of Unemployment |

### A.7 复杂适应系统

| 优先级 | 作者 | 年份 | 标题/贡献 |
|--------|------|------|----------|
| P0 | Arthur | 1999 | Complexity and the Economy（Science） |
| P0 | Arthur | 2013 | Complexity Economics: A Different Framework for Economic Thought（SFI） |
| P1 | Arthur, Holland et al. | 1996 | Asset Pricing Under Inductive Reasoning in an Artificial Stock Market |
| P1 | Epstein & Axtell | 1996 | Growing Artificial Societies: Social Science from the Bottom Up（书） |
| P2 | Holland | 1995 | Hidden Order: How Adaptation Builds Complexity（书） |

---

## 附录 B：开源项目速查表

按类别和商域适配度排序。

### B.1 ABM 仿真框架

| 项目 | 语言 | 许可 | Stars | 核心用途 | 商域优先级 |
|------|------|------|-------|----------|-----------|
| **Mesa** | Python | Apache 2.0 | 3k+ | Python-native ABM 首选框架 | P0 |
| **Agents.jl** | Julia | MIT | 1k+ | 高性能大规模 ABM | P2 |
| **NetLogo** | 专属语言 | GPL | — | 教育原型与规则验证 | P1（仅原型） |
| **Repast** | Java/C++/Python | BSD | — | 科研级 ABM（Java 为主） | P3 |

### B.2 异质主体经济学

| 项目 | 语言 | 许可 | Stars | 核心用途 | 商域优先级 |
|------|------|------|-------|----------|-----------|
| **Econ-ARK / HARK** | Python | Apache 2.0 | 700+ | 异质主体宏观模型求解 | P1 |
| **quantecon.py** | Python | BSD-3 | 1.5k+ | 定量经济学基础工具 | P2 |
| **Sequence Space Jacobian** | Python | — | — | 与 HARK 集成的 GE 分析 | P3 |

### B.3 优化求解

| 项目 | 语言 | 许可 | Stars | 核心用途 | 商域优先级 |
|------|------|------|-------|----------|-----------|
| **Pyomo** | Python | BSD | 1.6k+ | 通用代数建模（最全面） | P0 |
| **OR-Tools** | Python/C++ | Apache 2.0 | 11k+ | 物流/路由/约束规划 | P1 |
| **PuLP** | Python | MIT | 1.4k+ | 入门友好 LP/MILP | P1（原型） |
| **CVXPY** | Python | Apache 2.0 | 5k+ | 凸优化（校准/金融） | P2 |

### B.4 城市/空间分析

| 项目 | 语言 | 许可 | Stars | 核心用途 | 商域优先级 |
|------|------|------|-------|----------|-----------|
| **GeoPandas** | Python | BSD-3 | 3.5k+ | 空间数据处理基石 | P0 |
| **OSMnx** | Python | MIT | 4k+ | 真实街道网络下载与分析 | P0 |
| **NetworkX** | Python | BSD-3 | 14k+ | 复杂网络分析 | P0 |
| **UrbanSim** | Python | BSD-3 | 540+ | 城市统计仿真平台 | P1 |
| **Pandana** | Python/C++ | AGPL-3.0 | 422+ | 网络可达性快速计算 | P1 |

### B.5 数据科学基础

| 项目 | 语言 | 许可 | Stars | 核心用途 | 商域优先级 |
|------|------|------|-------|----------|-----------|
| **pandas** | Python | BSD-3 | 43k+ | 表格数据处理 | P0 |
| **NumPy** | Python | BSD-3 | 28k+ | 数值计算 | P0 |
| **SciPy** | Python | BSD-3 | 13k+ | 科学计算 | P0 |
| **statsmodels** | Python | BSD-3 | 9k+ | 统计建模/计量经济学 | P0 |
| **scikit-learn** | Python | BSD-3 | 59k+ | 机器学习（聚类/PCA） | P1 |
| **xarray** | Python | Apache 2.0 | 3k+ | 多维标记数组 | P1 |

---

## 附录 C：术语表

| 术语 | 定义 |
|------|------|
| **ABM (Agent-Based Model)** | 基于主体的模型：大量异质主体在离散时间步上遵循局部规则交互，宏观模式从微观规则中涌现。 |
| **ACE (Agent-Based Computational Economics)** | 主体计算经济学：将 ABM 方法应用于经济学问题的研究范式。 |
| **RUM (Random Utility Model)** | 随机效用模型：McFadden 发展的离散选择理论框架，假设选择是效用最大化加随机误差的结果。 |
| **QRE (Quantal Response Equilibrium)** | 量化响应均衡：McKelvey & Palfrey 提出的均衡概念，主体以概率方式选择最优策略而非确定性最优。 |
| **Cognitive Hierarchy** | 认知层级：Camerer-Ho-Chong 提出的非均衡战略思维模型，假设人群中存在不同推理深度的主体。 |
| **Information Cascade** | 信息级联：当个体理性地忽略私有信息而跟随他人行为时形成的决策链。 |
| **Market Microstructure** | 市场微观结构：研究订单流、买卖价差、库存如何在短时间内形成市场价格的学术领域。 |
| **NEG (New Economic Geography)** | 新经济地理学：Krugman 等发展的将运输成本、规模经济和偏好多样性纳入空间均衡的理论框架。 |
| **DMP Model** | Diamond-Mortensen-Pissarides 模型：将劳动力市场建模为搜索与匹配过程的宏观劳动经济学框架。 |
| **CAS (Complex Adaptive System)** | 复杂适应系统：由大量适应性行为主体组成的系统，宏观模式是涌现结果而非中央计划产物。 |
| **Emergence** | 涌现：系统中出现的、无法从单个组成部分的属性和行为中预测的整体模式。 |
| **Behavior Primitive** | 行为原语：POP 机制中的基本行为单元（如 `reference_price`、`budget_hard`），跨 cohort 共用。 |
| **Cohort** | 群体：POP 仿真中的匿名主体集合，可事后通过聚类赋予 `pop_id` 标签。 |
| **SSJ (Sequence Space Jacobian)** | 序列空间雅可比矩阵：求解异质主体一般均衡的高效数值方法，HARK 2025 新增支持。 |
