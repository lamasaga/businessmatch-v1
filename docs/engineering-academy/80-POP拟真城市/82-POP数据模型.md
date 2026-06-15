# POP 数据模型

> 本章定义 POP 的数据结构、分类、属性和行为规则。POP 是整个拟真城市系统的核心原子。

## 1. POP 的本质

POP 不是单个市民，而是**具有相同关键属性的人群聚合体**。例如：

- 「城市 A 的工人 POP，初中教育，月收入 5000，家庭 3 人」
- 「城市 B 的程序员 POP，本科教育，月收入 15000，家庭 2 人」

用聚合 POP 可以在保持微观机制的同时控制计算量。

## 2. POP 分类

### 2.1 按职业（Production Class）

| 职业 | 收入来源 | 技能要求 | 典型需求 |
|------|---------|---------|---------|
| 无业 | 救济/储蓄 | 无 | 基本食物、住所 |
| 低技能工人 | 工资 | 低 | 基本食物、廉价住所、公共交通 |
| 高技能工人 | 工资 | 中 | 日常消费品、教育、医疗 |
| 专业技术人员 | 高工资 | 高 | 高品质住房、服务、奢侈品 |
| 资本家/企业家 | 利润、分红 | 资本 | 奢侈品、投资 |
| 退休人员 | 养老金/储蓄 | 无 | 医疗、休闲、基本消费 |
| 学生 | 家庭支持/兼职 | 学习中 | 教育、廉价住所、娱乐 |

### 2.2 按财富阶层

| 阶层 | 财富水平 | 消费特点 |
|------|---------|---------|
| 贫困 | 无储蓄 | 只满足生存需求 |
| 工薪 | 少量储蓄 | 日常消费为主 |
| 中产 | 有房产和储蓄 | 品质消费、教育、医疗 |
| 富裕 | 大量资产 | 奢侈品、投资 |

### 2.3 按生命周期

| 阶段 | 年龄 | 特点 |
|------|------|------|
| 青年 | 18-30 | 学习、初入职场、流动性高 |
| 中年 | 30-55 | 主要劳动力、家庭负担重 |
| 老年 | 55+ | 退休、医疗需求高 |

### 2.4 按家庭结构

| 类型 | 规模 | 需求特点 |
|------|------|---------|
| 单身 | 1 | 小住房、娱乐、社交 |
| 夫妻 | 2 | 中等住房、储蓄 |
| 有孩家庭 | 3-4 | 大住房、教育、医疗 |
| 多代家庭 | 5+ | 大住房、医疗、照护 |

## 3. POP 核心属性

```python
class PopGroup:
    id: str
    
    # 人口属性
    size: int                    # 人口数量
    age_distribution: dict       # 年龄分布
    education_level: float       # 平均教育水平 0-10
    
    # 职业与经济
    profession: str              # 职业类型
    income_per_capita: float     # 人均收入
    wealth: float                # 总财富
    savings_rate: float          # 储蓄率
    employed_count: int          # 就业人数
    unemployed_count: int        # 失业人数
    
    # 居住
    residence_parcel_id: str     # 居住地地块
    housing_cost: float          # 住房支出
    housing_quality: float       # 住房质量 0-10
    commute_time: float          # 平均通勤时间
    
    # 需求
    needs: dict                  # 各类商品/服务需求
    consumption: dict            # 实际消费
    satisfaction: float          # 综合满意度 0-10
    
    # 行为状态
    migration_intent: float      # 迁移意愿 0-1
    political_stance: float      # 政治倾向 -1~+1
    trust_in_government: float   # 政府信任度 0-1
    
    # 技能与学习
    skills: dict                 # 技能分布
    training_investment: float   # 培训投入
```

## 4. POP 行为规则

### 4.1 消费规则

```python
def calculate_consumption(pop, prices, available_goods):
    disposable_income = pop.income - pop.housing_cost - pop.tax
    
    # 按需求优先级分配预算
    for need_level in ['survival', 'daily', 'development', 'luxury']:
        for good in needs[need_level]:
            affordable_qty = min(
                desired_qty(pop, good),
                disposable_income / prices[good]
            )
            pop.consumption[good] = affordable_qty
            disposable_income -= affordable_qty * prices[good]
```

### 4.2 就业规则

```python
def update_employment(pop, job_market):
    if pop.employed_count > 0:
        # 检查当前工作是否还存在
        if job_market.has_job(pop.current_job_id):
            # 比较当前工资和市场工资
            if job_market.wage(pop.current_job_id) < pop.reservation_wage:
                pop.search_new_job()
        else:
            pop.unemployed_count += pop.employed_count
            pop.employed_count = 0
            pop.search_new_job()
```

### 4.3 迁移规则

```python
def calculate_migration_intent(pop, city):
    # 推力
    push = (
        low_satisfaction_weight * (10 - pop.satisfaction) +
        high_unemployment_weight * (pop.unemployed_count / pop.size) +
        high_housing_cost_weight * (pop.housing_cost / pop.income)
    )
    
    # 拉力
    pull = (
        wage_opportunity_weight * city.avg_wage_differential +
        housing_affordability_weight * city.housing_affordability +
        job_availability_weight * city.job_vacancy_rate
    )
    
    pop.migration_intent = sigmoid(push - pull + random_noise)
```

### 4.4 升级/学习规则

```python
def update_skills(pop, education_investment, job_experience):
    if pop.profession == 'low_skill_worker' and pop.education_level > threshold:
        pop.profession = 'high_skill_worker'  # 升级
    
    pop.education_level += education_investment * learning_rate
    for skill in pop.skills:
        pop.skills[skill] += job_experience * skill_growth_rate
```

### 4.5 政治倾向规则

```python
def update_political_stance(pop, policy_effects):
    # 经济状况影响政治倾向
    if pop.satisfaction < 4:
        pop.political_stance += radicalization_rate
    elif pop.satisfaction > 7:
        pop.political_stance -= moderation_rate
    
    # 政策直接影响
    pop.political_stance += policy_effects.get(pop.profession, 0)
    
    pop.political_stance = clamp(pop.political_stance, -1, 1)
```

## 5. POP 聚合策略

为了性能，把属性相同的 POP 合并：

```python
# 聚合键
aggregation_key = (
    profession,
    education_level_bucket,
    wealth_bucket,
    residence_district,
    family_type
)
```

当 POP 内部差异过大时（如收入差距超过 20%），自动拆分为两个 POP。

## 6. POP 与玩家角色的关系

| 玩家角色 | 直接影响 POP 的什么 |
|----------|-------------------|
| 市政府 | 税收、公共服务、基础设施、政策 |
| 企业家 | 工资、就业、商品价格 |
| 投资者 | 房价、租金、土地开发 |
| 劳工领袖 | 工人谈判力、罢工概率 |

## 7. 与 AI 沟通示例

```
我要为 POP-拟真城市引擎设计 POP 数据模型。

POP 分类：
- 按职业：无业、低技能工人、高技能工人、专业技术人员、资本家、退休人员、学生
- 按财富：贫困、工薪、中产、富裕
- 按家庭：单身、夫妻、有孩家庭、多代家庭

核心属性：
- 人口规模、年龄、教育、职业、收入、财富、储蓄率
- 居住地、住房成本、住房质量、通勤时间
- 需求、消费、满意度
- 迁移意愿、政治倾向、政府信任度

行为规则：
1. 消费：按生存/日常/发展/享受优先级分配可支配收入
2. 就业：比较当前工资和保留工资，失业时找工作
3. 迁移：综合推力拉力计算迁移意愿
4. 升级：教育投入和工作经验提升技能和职业
5. 政治：满意度低则激进化

性能约束：
- 单场比赛 POP 聚合后不超过 1000 组
- 每回合更新时间在 500ms 以内

请给出 SQLAlchemy 模型定义和聚合策略。
```

## 最后更新

2026-06-14

---

**参考来源**：
- [Victoria 3 Wiki - Pops](https://vic3.paradoxwikis.com/Pops)
- [Victoria 3 Wiki - Standard of living](https://vic3.paradoxwikis.com/Standard_of_living)
- [Agent-Based Modeling in Economics](https://macroeconomics.institute/agentbasedmodeling)
