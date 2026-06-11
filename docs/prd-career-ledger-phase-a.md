# 生涯模式读账本 · Phase A 收尾 PRD

> **文档定位**：Phase A 闭环的最后一块拼图——将生涯模式前端从 mock 数据对接至真实后端。
> **关联**：`04-ROADMAP.md` §Phase A · `domains/career/DESIGN.md` · `03-ENGINEERING.md` §P0 Bug E1/E2
> **最后更新**：2026-06-07

---

## 术语澄清（本文档内）

| 术语 | 含义 | 使用场景 |
|------|------|----------|
| **生涯模式** | 学生的长期成长主线体验。学生点击「开启生涯」后进入此模式，所有活动汇入同一成长档案 | 产品概念、用户体验 |
| **Career Hub** | 承载生涯模式的**主界面系统**，即 `/career` 页面及其子页面 | 系统实现、前端路由 |
| **关系** | 生涯模式 = 「你正在玩的游戏模式」；Career Hub = 「这个游戏的主界面」 | — |

---

## 一、关系型说明：生涯模式与周边系统的数据流

### 1.1 核心实体关系

```
┌─ Arena（赛事域）─────────────────────────────┐
│  ArenaMatch(competition_events)               │
│    ├── match_kind ∈ {practice, official_t2}   │
│    ├── game_config_id                         │
│    └── status = finished                      │
│         ↓                                      │
│    ArenaParticipant(competition_participants) │
│    ├── user_id                                 │
│    ├── is_ai                                   │
│    ├── total_assets                            │
│    └── experience_earned                       │
└────────────────────┬───────────────────────────┘
                     │ settle_match_rewards()
                     ↓
┌─ Career（生涯域）────────────────────────────┐
│  User(users) ──1:1──┐                         │
│  ├── experience     │    ┌─ xp_events ──┐     │
│  ├── level          │    │ idempotency  │     │
│  ├── gold           │    │ amount       │     │
│  └── diamond        │    │ match_id     │     │
│                     └──→ │ source       │     │
│       ┌────────────────→ │ resource_type│     │
│       │                  └──────────────┘     │
│  ┌────┴────┐                                   │
│  │career_  │  ← 本次新建（Phase A 收尾）        │
│  │profiles │                                   │
│  └─────────┘                                   │
└────────────────────┬───────────────────────────┘
                     │ GET /career/profile
                     ↓
┌─ 学生端 (:5173) ──────────────────────────────┐
│  CareerPage ──→ careerStore（从 API 读取）     │
│  ├── XP 进度条（真实 xp_events 聚合）          │
│  ├── 等级（users.level）                       │
│  ├── 金币/钻石余额（users.gold/diamond）       │
│  ├── 近期比赛列表                              │
│  ├── 五维雷达（静态占位）                      │
│  └── 家园入口（加锁占位，B2 开放）             │
└────────────────────────────────────────────────┘
```

### 1.2 数据流入生涯模式的路径

| # | 路径 | 触发点 | 写入表 | 说明 |
|---|------|--------|--------|------|
| **P1** | 比赛结算 → XP 入账 | `settle_match_rewards()` | `xp_events` + `users.experience` | 已有。Arena 结束事件 → Career 服务幂等写入 |
| **P1-扩展** | 比赛结算 → 金币/钻石入账 | `settle_match_rewards()` 扩展 | `users.gold` / `users.diamond` | **本次追加**。按 match_kind 权重发放 |
| **P2** | 用户注册 → 初始化 | `create_demo_student()` | `users.experience=100, level=2` | 已有。演示账号自带初始值 |
| **P2-扩展** | 用户注册 → 初始资源 | `create_demo_student()` | `users.gold=500, diamond=10` | **本次追加**。新手初始资源 |
| **P3** | 首次开启生涯 → Profile 创建 | 学生点击「开启生涯」 | `career_profiles` | 本次新增。创建档案 + 新手包标记 |

### 1.3 数据流出 Career Hub 的读取路径

| # | 读取方 | API | 来源表 | 说明 |
|---|--------|-----|--------|------|
| **R1** | CareerPage | `GET /career/profile` | `users` + `career_profiles` + `xp_events` | 聚合返回：等级、XP、金币、钻石、近期比赛 |
| **R2** | DebriefPage | `GET /career/debrief/:matchId` | `xp_events` + `ArenaParticipant` | 赛后复盘数据（B3 Hermes-Debrief 规则模板阶段） |
| **R3** | AchievementsPage | `GET /career/achievements` | `career_profiles.achievements_json` | 成就列表（B2 起持久化） |
| **R4** | 家园入口（加锁） | — | `users.level` + `career_profiles` | 展示解锁条件（B2 开放） |

### 1.4 与现有 P0 Bug 的对应关系

| Bug | 根因 | 本 PRD 修复方式 |
|-----|------|----------------|
| **E1** 生涯页与登录 XP 脱节 | CareerPage 读 `DEMO_CAREER` mock | CareerPage 改调 `GET /career/profile`，展示真实 XP/等级/金币/钻石 |
| **E2** 生涯域不完整，缺聚合 API | 无 `api/career.py` | 新建 `api/career.py`，挂载聚合读取接口 |

---

## 二、PRD 正文

### 2.1 背景与目标

**现状**：生涯模式（`/career`）是学生端的长期成长主线，当前所有数据来自前端 mock（`DEMO_CAREER`、`DEBRIEF_MOCK`、`ACHIEVEMENTS`）。后端已具备：
- `xp_events` 表 + `grant_xp()` / `settle_match_rewards()`（幂等写入）
- `users` 表的 `experience`、`level` 字段
- 比赛结束时 XP 已自动入账

**问题**：学生打完比赛获得 XP，但打开 Career Hub 看不到变化——前后端数据断层。

**追加需求**：除 XP 外，引入两种资源——**金币**（常见资源）和**钻石**（高级资源），用于驱动未来的家园系统经济循环。

**目标**：
1. 完成 Career Hub 前端与后端的真实数据对接，使 Phase A 「XP + 金币 + 钻石 入账 → 生涯可见」闭环成立
2. 资源在 Phase A **只入账、只展示、不消费**——消费逻辑（家园购买、NPC 雇佣等）留至 Phase B2

**范围控制（Phase A 收尾）**：

| 功能 | Phase A（本次） | Phase B2（后续） |
|------|----------------|-----------------|
| XP 入账 + 展示 | ✅ 做 | — |
| 金币/钻石入账 + 展示 | ✅ 做 | — |
| `career_profiles` 创建 + 读取 | ✅ 做 | — |
| 五维雷达静态占位 | ✅ 做 | B2 起逐步真实化 |
| 家园入口（加锁占位） | ✅ 做 | B3 开放功能 |
| 成就列表 | 🟡 保持 mock | B2 起持久化 |
| 赛后复盘 | 🟡 保持 mock | B3 Hermes-Debrief 规则模板 |
| **资源消费（购买/雇佣）** | ❌ **不做** | ✅ B2 完整实现 |
| **resource_ledger 完整账本** | ❌ **不做** | ✅ B2 完整实现 |
| **economy.yaml 经济配置** | ❌ **不做** | ✅ B2 完整实现 |

---

### 2.2 术语表（本 PRD 内使用）

| 中文名 | 英文名 | 代码/DB 名 | 说明 |
|--------|--------|-----------|------|
| 生涯模式 | Career Mode | — | 学生的长期成长主线体验（产品概念） |
| 生涯中枢 | Career Hub | — | 承载生涯模式的主界面系统（`/career`） |
| 生涯档案 | Career Profile | `career_profiles` | 学生的长期成长主档案，与 `users` 1:1 |
| 经验值 | XP | `experience`, `amount` | 成长点数，来自 `xp_events` 聚合 |
| 等级 | Level | `level` | 由累计 XP 决定，`level = max(1, xp // 1000 + 1)` |
| **金币** | **Gold** | `gold` | 常见资源。日常活动、营团、比赛均可获取 |
| **钻石** | **Diamond** | `diamond` | 高级资源。仅正式活动（official）可获取 |
| 五维雷达 | 5D Radar | `competency_json` | 财务/市场/战略/协作/伦理五维评估（静态占位） |
| 家园 | Homestead | — | 学生的个人虚拟空间（Phase A 入口加锁，B3 开放） |
| 近期比赛 | Recent Matches | — | 最近 5 场参与的比赛及获得 XP/金币/钻石 |
| 幂等键 | Idempotency Key | `idempotency_key` | 防止重复发放的 UUID |

---

### 2.3 资源经济设计

#### 2.3.1 两种资源的定位

| 维度 | 金币 (Gold) | 钻石 (Diamond) |
|------|------------|----------------|
| **获取门槛** | 低 | 高 |
| **获取场景** | 日常活动、营团活动、任何比赛 | 仅正式赛 (official) |
| **用途（B2 起）** | 装饰、权限、雇佣 NPC、新区域 | 稀有装饰、炫耀性权限 |
| **Phase A** | 入账 + 展示，不可消费 | 入账 + 展示，不可消费 |
| **类比** | 游戏金币 | 付费钻石/宝石 |

#### 2.3.2 发放规则（Phase A 硬编码，B2 迁移至 economy.yaml）

```python
# 发放常量（Phase A 硬编码，后续迁移至 YAML 配置）
# 当前 MatchKind 仅支持 practice / official；t2/t1 细分在后续扩展
REWARD_CONSTANTS = {
    "practice": {"gold": 30, "diamond": 0},
    "official": {"gold": 100, "diamond": 2},
}

# 排名加成（仅金币，钻石固定）
RANK_BONUS_GOLD = {
    1:  1.5,   # 第一名 +50%
    2:  1.25,  # 第二名 +25%
    3:  1.1,   # 第三名 +10%
}
```

**规则说明**：
- 金币：所有比赛类型均发放，按排名有加成
- 钻石：仅 official 发放，固定量（不随排名变化）
- 练习赛 (practice) 不发钻石，符合「高级资源只奖励正式参与」的定位
- 初始值：新注册用户 `gold=500, diamond=10`（演示账号同步）

---

### 2.4 数据库变更

#### 2.4.1 现有表变更：`users`

```sql
ALTER TABLE users ADD COLUMN gold INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN diamond INTEGER DEFAULT 0 NOT NULL;
```

**设计理由**：
- 金币/钻石是用户级属性，与 XP 同级，放在 `users` 表便于聚合读取
- Phase B2 引入 `resource_ledger` 完整账本后，`users.gold/diamond` 作为**实时余额缓存**，账本作为**审计记录**
- 单字段变更，不破坏现有结构

#### 2.4.2 新建表：`career_profiles`

```sql
CREATE TABLE career_profiles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL UNIQUE,
    -- 基础成长
    title       VARCHAR(64) DEFAULT '商业探索者',
    season_id   VARCHAR(32) DEFAULT '2026-S1',
    -- 五维雷达（JSON 占位，B2 起逐步真实化）
    competency_json TEXT DEFAULT '{"financial":50,"marketing":50,"strategic":50,"collaborative":50,"ethical":50}',
    -- 成就（JSON 列表，B2 起迁移为独立表）
    achievements_json TEXT DEFAULT '[]',
    -- 家园（B3 开放，Phase A 仅占位）
    homestead_json TEXT DEFAULT '{"unlocked_slots":0,"total_slots":5}',
    -- 元数据
    is_started  BOOLEAN DEFAULT 1,
    started_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_career_profiles_user ON career_profiles(user_id);
```

#### 2.4.3 现有表不变更

- `xp_events`：保持现有结构，继续作为 XP 幂等账本
- `competition_events` / `competition_participants`：不变
- **Phase B2 新增**：`resource_ledger` 表（资源完整账本）

---

### 2.5 API 设计

#### 2.5.1 新建路由模块：`api/career.py`

挂载于 `/api/v1/career`，须同步更新 `main.py` 与 `03-ENGINEERING.md` §后端 API 全表。

| 方法 | 路径 | 认证 | 说明 | Phase |
|------|------|------|------|-------|
| POST | `/career/start` | JWT | 首次开启生涯模式，创建 `career_profiles` | A |
| GET | `/career/profile` | JWT | 读取生涯聚合数据（XP、金币、钻石、等级、近期比赛） | A |
| GET | `/career/recent-matches` | JWT | 近期比赛列表（含获得 XP/金币/钻石） | A |

#### 2.5.2 `POST /career/start`

**请求**：空 body（用户 ID 从 JWT 提取）

**响应**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "profile_id": 42,
    "user_id": 3,
    "title": "商业探索者",
    "started_at": "2026-06-07T10:30:00Z"
  }
}
```

**行为**：
1. 检查 `career_profiles` 是否已存在该 `user_id`
2. 已存在 → 直接返回现有档案
3. 不存在 → 插入新记录
4. **不自动赠送资源**（`users.gold/diamond` 由注册流程初始化）

**幂等**：同一用户多次调用返回同一档案，无副作用。

#### 2.5.3 `GET /career/profile`

**响应**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "user": {
      "id": 3,
      "username": "student",
      "avatar": null,
      "level": 2,
      "experience": 100,
      "next_level_xp": 1000,
      "gold": 530,
      "diamond": 10
    },
    "profile": {
      "title": "商业探索者",
      "season": "2026-S1",
      "is_started": true,
      "started_at": "2026-06-07T10:30:00Z"
    },
    "radar": {
      "financial": 50,
      "marketing": 50,
      "strategic": 50,
      "collaborative": 50,
      "ethical": 50
    },
    "resources": {
      "gold_total_earned": 530,
      "diamond_total_earned": 10,
      "gold_earned_7d": 30,
      "diamond_earned_7d": 0
    },
    "homestead": {
      "unlocked_slots": 0,
      "total_slots": 5,
      "status": "locked",
      "unlock_hint": "B2 阶段开放家园系统"
    },
    "stats": {
      "total_matches": 1,
      "total_xp_earned": 100,
      "practice_count": 1,
      "official_count": 0
    }
  }
}
```

**聚合逻辑**：
- `user.gold` / `user.diamond`：直接读 `users` 表余额
- `resources.gold_total_earned` / `diamond_total_earned`：`users` 累计值（或从 `resource_ledger` B2 起聚合）
- `resources.*_earned_7d`：近 7 天入账汇总
- `homestead`：读 `career_profiles.homestead_json`，Phase A 始终 `status: "locked"`
- 其余字段逻辑同前版 PRD

#### 2.5.4 `GET /career/recent-matches`

**查询参数**：`limit=5`（默认 5，最大 20）

**响应**：
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "match_id": 42,
      "match_title": "回合制策略商赛 #8842",
      "match_kind": "official",
      "game_config_id": "trading-v1",
      "finished_at": "2026-06-06T14:20:00Z",
      "final_rank": 2,
      "total_participants": 6,
      "xp_earned": 150,
      "gold_earned": 100,
      "diamond_earned": 2,
      "total_assets": 12800.50
    }
  ]
}
```

---

### 2.6 结算层扩展：`settle_match_rewards()`

#### 2.6.1 扩展后的发放流程

```python
def settle_match_rewards(db, match, participants):
    """比赛结束后的统一结算入口"""
    tier = _tier_for_match(match)  # 现有：读取 YAML 奖励配置
    total = len([p for p in participants if not p.is_ai])
    ranked = sorted(participants, key=lambda p: p.total_assets, reverse=True)

    # 读取资源常量（Phase A 硬编码，B2 从 economy.yaml 读取）
    base_rewards = REWARD_CONSTANTS[match.match_kind.value]

    human_rank = 0
    for p in ranked:
        if p.is_ai:
            continue
        human_rank += 1

        # 1. XP 发放（现有逻辑）
        exp = _rank_exp(human_rank, total, tier)
        p.experience_earned = exp
        grant_xp(db, user_id=p.user_id, amount=exp, ...)

        # 2. 金币发放（本次新增）
        gold_amount = _calc_gold(match, human_rank, base_rewards)
        _grant_gold(db, user_id=p.user_id, amount=gold_amount, match_id=match.id)

        # 3. 钻石发放（本次新增，仅 official）
        if match.match_kind.value == "official":
            diamond_amount = base_rewards["diamond"]
            _grant_diamond(db, user_id=p.user_id, amount=diamond_amount, match_id=match.id)
```

#### 2.6.2 新增函数

```python
def _calc_gold(match, rank, base_rewards) -> int:
    """计算金币数量：基础值 × 排名加成"""
    base = base_rewards["gold"]
    multiplier = RANK_BONUS_GOLD.get(rank, 1.0)
    return int(base * multiplier)

def _grant_gold(db, user_id, amount, match_id):
    """发放金币，幂等"""
    if amount <= 0:
        return
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.gold += amount
        # Phase B2: 同时写入 resource_ledger

def _grant_diamond(db, user_id, amount, match_id):
    """发放钻石，幂等"""
    if amount <= 0:
        return
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.diamond += amount
        # Phase B2: 同时写入 resource_ledger
```

**关键约束**：
- 金币/钻石发放与 XP 发放共用同一事务（同一 `db` session），确保原子性
- 若比赛异常中断（crash），三者同时回滚
- Phase B2 引入 `resource_ledger` 后，上述函数扩展为「先写账本、再更新余额」

---

### 2.7 前端变更

#### 2.7.1 `careerStore.ts` — 从本地 mock 改为 API 驱动

```typescript
interface CareerProfile {
  user: {
    id: number;
    username: string;
    avatar: string | null;
    level: number;
    experience: number;
    next_level_xp: number;
    gold: number;
    diamond: number;
  };
  profile: {
    title: string;
    season: string;
    is_started: boolean;
    started_at: string;
  };
  radar: Record<string, number>;
  resources: {
    gold_total_earned: number;
    diamond_total_earned: number;
    gold_earned_7d: number;
    diamond_earned_7d: number;
  };
  homestead: {
    unlocked_slots: number;
    total_slots: number;
    status: 'locked' | 'unlocked';
    unlock_hint: string;
  };
  stats: {
    total_matches: number;
    total_xp_earned: number;
    practice_count: number;
    official_count: number;
  };
}

interface CareerState {
  profile: CareerProfile | null;
  loading: boolean;
  error: string | null;
  // 本地状态（仅标记是否已进入生涯模式）
  careerActive: boolean;
  // 操作
  fetchProfile: () => Promise<void>;
  startCareer: () => Promise<void>;
}
```

**行为变更**：
- `fetchProfile()`：页面挂载时调用 `GET /career/profile`
- `startCareer()`：调用 `POST /career/start`，成功后 `fetchProfile()`
- `careerActive`：**保留本地 persist**（用于未登录用户体验），但真实数据从 API 读取
- **fallback**：API 失败时降级到 mock，打印 warn，UI 显示「数据同步中」

#### 2.7.2 `CareerPage.tsx` — 替换数据源 + 新增资源展示

| 当前（mock） | 变更后（API） |
|-------------|--------------|
| `const c = DEMO_CAREER` | `const { profile, loading } = useCareerStore()` |
| `c.xp` / `c.level` | `profile.user.experience` / `profile.user.level` |
| `c.nextLevelXp` | `profile.user.next_level_xp` |
| `c.season` | `profile.profile.season` |
| **金币/钻石（新增）** | `profile.user.gold` / `profile.user.diamond` |
| 五维雷达 | `profile.radar`（静态占位） |
| 近期成长 | `profile.stats` / `profile.resources` |
| 每周计划 | **保留 mock**（B3 Quest） |
| AI 叙事 | **保留 mock**（B3 Hermes-Debrief） |
| **家园入口（新增）** | 展示加锁状态，提示「即将开放」 |

#### 2.7.3 金币/钻石 UI 设计（Phase A 纯展示）

```
┌─ 资源栏 ─────────────────────────┐
│  💰 金币 530    💎 钻石 10       │
│  （点击无响应，B2 开放消费）      │
└──────────────────────────────────┘
```

- 金币图标 + 数量，钻石图标 + 数量
- 点击不跳转（无消费逻辑）
- 悬停提示：「金币：参与日常活动与比赛获取」/「钻石：参与正式赛获取」

#### 2.7.4 家园入口（加锁占位）

```
┌─ 家园入口 ───────────────────────┐
│  🏠 我的家园                     │
│  5 个槽位待解锁                   │
│  [🔒 B2 阶段开放]                │
└──────────────────────────────────┘
```

- 入口可见（占位），但显示加锁图标
- 点击弹窗提示：「家园系统即将开放，敬请期待」
- B2 时移除加锁，开放真实功能

#### 2.7.5 `CareerStartPage.tsx` — 对接后端

```typescript
const onStart = async () => {
  await startCareer();  // POST /career/start
  navigate('/career');
};
```

#### 2.7.6 `DebriefPage.tsx` / `AchievementsPage.tsx` — 预留接口

Phase A 保持 mock，B2/B3 起对接真实数据。

---

### 2.8 时序图

#### 场景：学生打完正式赛后查看生涯

```
Arena (比赛结束)       Career (结算)           数据库
  │                      │                      │
  │── settle_match_rewards() ──→│              │
  │                      │── grant_xp() ────────→│ users.experience += 150
  │                      │── _grant_gold() ─────→│ users.gold += 100
  │                      │── _grant_diamond() ──→│ users.diamond += 2
  │                      │── COMMIT ─────────────→│
  │                      │←─ 提交成功 ───────────│
  │                      │                      │
  │←─ 结算完成 ──────────│                      │
  │                      │                      │
  [学生打开 /career]                              │
  │                      │                      │
  │── GET /career/profile ──→│                 │
  │                      │── 读 users 表 ───────→│
  │                      │←─ XP=250, Gold=630, Diamond=12 ─│
  │                      │                      │
  │←─ 展示更新后数据 ────│                      │
```

---

### 2.9 验收标准

| # | 验收项 | 测试方法 |
|---|--------|----------|
| A1 | 新注册用户 `users.gold=500, diamond=10` | 直接查 DB |
| A2 | 打完练习赛后，用户金币增加、钻石不变 | 手动测试 + DB 校验 |
| A3 | 打完正式赛后，用户金币和钻石均增加 | 手动测试 + DB 校验 |
| A4 | `GET /career/profile` 返回的 gold/diamond 与 `users` 表一致 | API 测试 |
| A5 | CareerPage 展示金币/钻石余额，点击无消费响应 | 手动 UI 测试 |
| A6 | 家园入口可见但加锁，点击提示「即将开放」 | 手动 UI 测试 |
| A7 | `POST /career/start` 幂等，多次调用无副作用 | API 测试 |
| A8 | CareerPage 加载时若 API 失败，降级到 mock | 断网测试 |
| A9 | `api/career.py` 已挂载于 `main.py` | 代码审查 |
| A10 | `03-ENGINEERING.md` 后端 API 全表已更新 | 文档审查 |

---

### 2.10 风险与依赖

| 风险 | 影响 | 缓解 |
|------|------|------|
| `users.gold/diamond` 与 B2 `resource_ledger` 不同步 | B2 迁移时出现数据不一致 | Phase A 的 `settle_match_rewards` 在 B2 时扩展为「先写 ledger、再更新余额」，保持接口不变 |
| 金币/钻石发放量平衡性 | 经济系统通胀或紧缩 | Phase A 为硬编码常量，B2 通过 economy.yaml 调整；A 阶段仅用于展示，不影响平衡 |
| 前端 mock fallback 导致用户看不到真实资源 | 体验断层 | fallback 时打印 warn，UI 显示「数据同步中」提示 |

**外部依赖**：
- `settle_match_rewards()` 已正常工作（已有）
- `xp_events` 表已有数据（已有）
- 用户认证 JWT 可正常提取 user_id（已有）

---

### 2.11 实施 Checklist

```
□ 1. backend: ALTER TABLE users ADD gold / diamond
□ 2. backend: 新建 app/domains/career/models/career_profile.py
□ 3. backend: 扩展 app/domains/career/services/rewards.py（_grant_gold / _grant_diamond）
□ 4. backend: 修改 app/games/trading/*.py 中的结算调用（确保正式赛调用 settle）
□ 5. backend: 新建 app/api/career.py（start + profile + recent-matches）
□ 6. backend: app/db/init_db.py 导入 CareerProfile 模型 + 初始 gold/diamond
□ 7. backend: app/main.py 挂载 career router
□ 8. backend: 运行 init_db 或 Alembic 迁移
□ 9. frontend: 重写 stores/careerStore.ts（API 驱动 + gold/diamond + fallback）
□ 10. frontend: CareerPage.tsx 替换 DEMO_CAREER + 新增金币/钻石展示 + 家园加锁
□ 11. frontend: CareerStartPage.tsx 对接 POST /career/start
□ 12. docs: 03-ENGINEERING.md 更新 API 全表 + 功能矩阵
□ 13. docs: 00-TERMINOLOGY.md 登记「金币」「钻石」术语
□ 14. docs: 01-PRODUCT.md / 04-ROADMAP.md 更新资源类型描述
□ 15. test: 手动端到端（注册 → 开生涯 → 打练习赛 → 检查金币变化 → 打正式赛 → 检查钻石变化）
```

---

### 2.12 Phase B2 资源经济扩展（预留接口）

Phase A 的代码为 B2 预留以下扩展点：

| 扩展点 | Phase A 实现 | Phase B2 扩展 |
|--------|-------------|--------------|
| 资源发放常量 | `REWARD_CONSTANTS` 硬编码字典 | 迁移至 `content/career/economy.yaml` |
| 资源写入 | 直接更新 `users.gold/diamond` | 新增 `resource_ledger` 表，先写账本再更新余额 |
| 资源消费 | ❌ 无 | `POST /career/shop/purchase` + `POST /career/homestead/upgrade` |
| 家园 | 入口加锁占位 | 5 槽位解锁 + 装饰购买 + NPC 雇佣 |

---

*商识唯智 · 生涯模式读账本 PRD v2.0*
