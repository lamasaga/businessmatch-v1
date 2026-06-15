# NPC 角色与关系网络设计

> 本章设计商业世界中的 NPC：他们的属性、性格、目标、关系网，以及这些如何驱动剧情。

## 1. NPC 不是任务发布器

传统 RPG 中，NPC 通常是：

- 站在固定位置
- 说固定台词
- 给玩家任务
- 没有自己的生活

我们要设计的 NPC 是：

- 有自己的目标和计划
- 会主动行动
- 会记住与玩家的互动
- 会与其他 NPC 建立关系
- 职业生涯会变化

## 2. NPC 核心属性

```python
class NPC:
    id: str
    name: str
    age: int
    
    # 身份
    current_role: str          # 职员、创业者、投资人、高管
    current_company_id: str
    
    # 性格（参考 CK3 特质）
    traits: list               # 如 ['ambitious', 'honest', 'risk_averse']
    big_five: dict             # 开放性、尽责性、外向性、宜人性、神经质
    
    # 能力
    skills: dict               # 销售、技术、管理、财务、谈判
    
    # 经济
    cash: float
    assets: list               # 房产、股权
    income: float
    
    # 心理
    stress: float              # 0-10
    satisfaction: float        # 0-10
    ambition: float            # 0-10
    morality: float            # -1~+1
    
    # 目标
    short_term_goals: list
    long_term_goals: list
    
    # 关系
    relationships: dict        # NPC ID → 关系对象
    
    # 记忆
    memory: list               # 重要事件
    
    # 状态
    current_state: str         # 状态机当前状态
    
    # 声望
    reputation: dict           # 不同群体中的声望
```

## 3. 性格设计

### 3.1 核心性格维度

| 维度 | 两端 |
|------|------|
| 风险偏好 | 激进 ↔ 保守 |
| 诚信 | 正直 ↔ 投机 |
| 社交 | 外向 ↔ 内向 |
| 责任 | 尽责 ↔ 随性 |
| 情绪 | 稳定 ↔ 敏感 |
| 权力欲 | 野心勃勃 ↔ 知足常乐 |

### 3.2 性格如何影响行为

| 性格 | 行为倾向 |
|------|---------|
| 激进 | 高杠杆、快速扩张、爱冒险 |
| 保守 | 稳健、储蓄、避免风险 |
| 正直 | 遵守合同、不搞小动作 |
| 投机 | 钻空子、内幕交易、背叛 |
| 外向 | 善于谈判、容易建立关系 |
| 内向 | 专注技术、不善社交 |
| 野心勃勃 | 不断追求晋升和财富 |
| 知足常乐 | 满足现状、忠诚稳定 |

### 3.3 性格冲突与相容

```
正直 + 投机 = 容易冲突
激进 + 保守 = 合作困难
外向 + 外向 = 容易建立友谊
野心勃勃 + 知足 = 权力斗争中对立
```

## 4. 目标系统

### 4.1 目标类型

| 类型 | 例子 |
|------|------|
| 财富 | 赚取 100 万 |
| 权力 | 成为 CEO |
| 成就 | 创办上市公司 |
| 安全 | 稳定退休 |
| 关系 | 报答导师 |
| 复仇 | 扳倒背叛者 |
| 理想 | 改变行业 |

### 4.2 目标驱动行为

```
目标：成为 CEO
    ↓
行为：争取关键项目、建立联盟、削弱竞争对手
    ↓
如果受阻：可能采取更激进手段
```

## 5. 关系网络

### 5.1 关系类型

| 关系 | 影响 |
|------|------|
| 导师-学生 | 学生容易获得指导，导师有影响力 |
| 合伙人 | 共同承担风险，可能因利益反目 |
| 上下级 | 权力不对等，影响晋升和决策 |
| 竞争对手 | 争夺市场、人才、资源 |
| 投资人-创业者 | 资金支持 vs 控制权博弈 |
| 朋友 | 互相帮助，信息共享 |
| 宿敌 | 互相拆台，长期对抗 |
| 恋人/家人 | 情感羁绊，可能影响商业判断 |

### 5.2 关系强度

```python
class Relationship:
    npc_a_id: str
    npc_b_id: str
    type: str                    # friend, rival, mentor, partner, etc.
    strength: float              # -1 ~ +1
    trust: float                 # 0 ~ 1
    history: list                # 共同经历
    secrets_shared: list         # 共享的秘密
    obligations: list            # 互相亏欠
```

### 5.3 关系动态

关系会随事件变化：

```
共同完成项目 → 信任增加
背叛 → 关系破裂
长期竞争 → 可能化敌为友，也可能更敌对
互相帮助 → 产生人情债
```

### 5.4 派系与联盟

NPC 会根据利益结成派系：

```python
class Faction:
    id: str
    name: str
    members: list              # NPC IDs
    shared_goals: list
    leader_id: str
    cohesion: float            # 凝聚力
```

派系例子：

- 保守派：维护传统行业利益
- 革新派：推动技术变革
- 本土派：保护本地企业
- 开放派：支持外资和市场开放

## 6. 声望系统

### 6.1 声望维度

| 维度 | 说明 |
|------|------|
| 诚信 | 是否守信用 |
| 能力 | 是否做事靠谱 |
| 慷慨 | 是否愿意分享利益 |
| 强硬 | 是否在竞争中不留情面 |
| 创新 | 是否敢于创新 |

### 6.2 声望的影响

```
高诚信 → 容易获得投资和合作
高能力 → 容易被高薪挖角
高强硬 → 竞争对手忌惮但伙伴不安
```

## 7. NPC 自主行为

### 7.1 日常行为

- 上班、完成项目、提升技能。
- 社交、建立关系。
- 消费、投资、储蓄。

### 7.2 主动行为

- 寻找新机会。
- 联系潜在合伙人。
- 挖角或跳槽。
- 发起竞争行动。
- 寻求投资。

### 7.3 反应行为

- 被挖角后决定离开或留下。
- 被背叛后报复或原谅。
- 公司危机时坚守或逃离。

## 8. 与 AI 沟通示例

```
我要设计商业世界的 NPC 系统。

NPC 属性：
- 身份、公司、角色
- 性格（5 个维度 + CK3 风格特质）
- 能力技能
- 经济状态
- 心理（压力、满意度、野心、道德）
- 短期/长期目标
- 关系网
- 记忆
- 声望

关系类型：
- 导师-学生、合伙人、上下级、竞争对手、投资人-创业者、朋友、宿敌

要求：
- NPC 会自主行动
- 关系会动态变化
- 性格影响行为
- 能形成派系

请给出 NPC 数据模型、关系网络结构和行为规则。
```

## 最后更新

2026-06-14

---

**参考来源**：
- [RimWorld Wiki - Social](https://rimworldwiki.com/wiki/Social)
- [RimWorld Wiki - Traits](https://rimworldwiki.com/wiki/Traits)
- [Game Developer - RimWorld, Dwarf Fortress, and procedurally generated story telling](https://www.gamedeveloper.com/design/rimworld-dwarf-fortress-and-procedurally-generated-story-telling)
- [Characterization and Emergent Narrative in Dwarf Fortress](https://www.degruyterbrill.com/document/doi/10.1515/9783839453452-007/html)
