# 商域教师端功能演进：P0 · 营团运营强化 + P1 · 赛季与教学编排

> **文档定位**：在体验营营团 P1 已可跑通的前提下，给出 **工程可直接落地** 的教师端功能演进 PRD。聚焦 P0（立刻能做、改动最小）与 P1（结构性升级）两个阶段。  
> **对齐**：`84-`（P1 缺口与功能演进建议） · `83-`（教师端蓝图初稿） · `02-` §五（赛季模式与双端产品） · `ADR-009`（赛季模式与教师端双端演进）  
> **读者**：前端/后端工程师、产品与测试验收  
> **最后更新**：2026-06-01

---

## 目录

1. [现状与目标](#一现状与目标)
2. [P0 阶段：营团运营强化](#二p0-阶段营团运营强化)
3. [P1 阶段：赛季与教学编排](#三p1-阶段赛季与教学编排)
4. [数据模型](#四数据模型)
5. [API 设计](#五api-设计)
6. [前端设计](#六前端设计)
7. [实施优先级与验收标准](#七实施优先级与验收标准)
8. [风险与约束](#八风险与约束)

---

## 一、现状与目标

### 1.1 教师端现状（截至 feature/camp-phase1）

| 已落地 | 状态 | 说明 |
|--------|------|------|
| 创建/管理营团 | ✅ | `:5174` organizer-frontend，6 位邀请码 |
| 营内发起商赛 | ✅ | 带 `teaching_group_id`，4 位房间码 |
| 赛事控场 | ✅ | RTS/回合制/TechVenture 控场页 |
| 成员名册 | ✅ | 仅用户名、角色、加入时间 |
| 大屏/评委视角 | ✅ | TechVenture 专用 |
| 赛季/赛季编排 | 🔴 无 | 文档已规划，代码未建表 |
| 学生进度追踪 | 🔴 无 | 名册无参赛/XP 信息 |
| 赛后复盘/汇总 | 🔴 无 | 赛后数据在 DB，缺教师视角 |
| 活动类型（理论课/作业） | 🔴 无 | 仅「发起商赛」一种 |
| 班级分组 | 🔴 无 | 大营团不可拆小组 |
| 公告/通知 | 🔴 无 | 教师靠微信群发通知 |

### 1.2 设计原则

1. **先数据、后编排**：P0 先把已有数据展示给教师看；P1 再新增数据结构（赛季/里程碑/分组）。
2. **教师是导演，不是代打**：控场、发布、点评；AI 仅做脚手架与模板。
3. **复用 Arena，不 fork 引擎**：新能力落在 `organizer-frontend` + 新 API，不改 `games/` 结算内核。
4. **每条能力可单独演示**：校方参观时能讲清「这一步解决什么问题」。

---

## 二、P0 阶段：营团运营强化

> **目标**：让教师「开营之后有地方待」，而不是创建完营团就只能不断「再开一场商赛」。  
> **工期预估**：1.5～2 周  
> **改动范围**：organizer-frontend 新页面 + backend 聚合查询 API，**不新增核心表**。

---

### 2.1 学生进度看板

#### 2.1.1 需求概述

在营团详情页增加「学员进度」Tab，让教师一眼看出：谁积极参与、谁掉队了、谁还没参加过任何商赛。

#### 2.1.2 页面位置

`organizer-frontend`：`/camps/:id` → 现有「营内商赛」「成员名册」旁新增「学员进度」Tab。

#### 2.1.3 展示内容

| 字段 | 来源 | 说明 |
|------|------|------|
| 学员昵称 | `users.username` | — |
| 加入时间 | `group_memberships.joined_at` | — |
| 参赛场次 | `COUNT(competition_participants WHERE user_id)` | 本营团内所有比赛 |
| 累计 XP | `SUM(xp_events.amount WHERE user_id)` | 全平台累计（或限本营团） |
| 最近活跃 | `MAX(competition_participants.joined_at)` 或 `users.last_login` | 取最近一次 |
| 状态标签 | 聚合计算 | 「积极」「正常」「需关注」「从未参赛」 |

**状态标签规则**：

| 标签 | 条件 |
|------|------|
| 🟢 积极 | 参赛 ≥ 2 场，且最近 7 天内有活跃 |
| 🟡 正常 | 参赛 ≥ 1 场 |
| 🔴 需关注 | 加入 > 7 天，参赛 = 0 |
| ⚪ 从未参赛 | 参赛 = 0（且加入 ≤ 7 天）|

#### 2.1.4 交互

- 可按「状态」「参赛场次」「最近活跃」排序。
- 支持搜索学员昵称。
- 点击学员行 → 弹出「学员详情抽屉」：该学员在所有本营团比赛中的名次时间线。

#### 2.1.5 API 设计

```
GET /api/v1/teaching-groups/{group_id}/member-progress
```

**响应**：

```json
{
  "members": [
    {
      "user_id": 42,
      "username": "小明",
      "joined_at": "2026-05-20T08:00:00Z",
      "match_count": 3,
      "total_xp": 1250,
      "last_active_at": "2026-05-28T14:30:00Z",
      "status": "active"   // active | normal | attention | newcomer
    }
  ],
  "summary": {
    "total": 24,
    "active": 15,
    "normal": 5,
    "attention": 3,
    "newcomer": 1
  }
}
```

**实现要点**：
- 聚合查询：JOIN `group_memberships` → `users` → `competition_participants`（限 `teaching_group_id` 关联的 `competition_events`）→ `xp_events`。
- 后端已有 `xp_events` 表（`domains/career/models/xp_event.py`），直接复用。
- 注意性能：营团规模预期 < 100 人，聚合查询可接受；未来 > 200 人时考虑缓存或分页。

---

### 2.2 赛后复盘自动汇总

#### 2.2.1 需求概述

商赛结束后，在教师端自动生成「班级复盘页」，展示全班决策分布、排名、关键数据，教师可一键「发布复盘」给学生端查看。

#### 2.2.2 触发时机

- 比赛状态变为 `finished` 后自动可查看（不需要教师手动创建）。
- 教师在「营内商赛」列表点击已结束比赛的「复盘」按钮进入。

#### 2.2.3 展示内容（因赛制而异）

**通用部分（所有赛制）**：

| 模块 | 内容 |
|------|------|
| 比赛概览 | 赛制、时长、参与人数、结束时间 |
| 班级排名 | 前 N 名 + 学员名次变化（与上次比赛对比）|
| 决策分布 | 关键决策的统计分布（如：选择各路线/城市的比例）|
| 全班 XP 发放 | 每人获得 XP 明细 |

**回合制 Trading 特有**：
- 人均交易次数、最常买卖的商品 Top 3
- 终局资金分布图
- 典型失误：满仓未交易、单城滞留

**TechVenture 特有**：
- 各队路线选择分布
- BQI 均值/最高/最低
- 宣言关键词云（可选）

**浮生记 RTS 特有**：
- 人均 tick 内操作次数
- 城市间物流热力图
- 车辆购买率

#### 2.2.4 教师操作

- **发布复盘**：点击「发布到学生端」→ 学生端 `/camp` 收到通知，可查看「班级复盘」。
- **下载摘要**：导出 Markdown/图片格式的「班级复盘卡」，方便教师贴到微信群。
- **标记亮点**：教师可勾选「精彩决策」→ 标记到具体学员，学生端收到「你的决策被教师标记」。

#### 2.2.5 API 设计

```
GET /api/v1/teaching-groups/{group_id}/events/{event_id}/debrief
```

**响应**（以 TechVenture 为例）：

```json
{
  "event_id": 101,
  "title": "TechVenture 班级赛 #1",
  "status": "finished",
  "finished_at": "2026-05-28T10:00:00Z",
  "participant_count": 20,
  "ranking": [
    {"rank": 1, "username": "小明", "team_name": "星火队", "score": 8500, "xp_gained": 300},
    {"rank": 2, "username": "小红", "team_name": "浪尖队", "score": 7200, "xp_gained": 250}
  ],
  "summary": {
    "avg_score": 5400,
    "route_distribution": {"route_a": 8, "route_b": 7, "route_c": 5},
    "bqi_stats": {"avg": 72, "max": 95, "min": 45}
  },
  "insights": [
    {"type": "highlight", "text": "80% 的队伍选择了路线 A，竞争激烈"},
    {"type": "warning", "text": "3 支队伍 BQI 低于 50，品牌策略需加强"}
  ],
  "is_published": false
}
```

```
POST /api/v1/teaching-groups/{group_id}/events/{event_id}/debrief/publish
```

**请求**：`{"insights": [...], "teacher_notes": "..."}`  
**作用**：标记复盘为已发布，学生端可见。

#### 2.2.6 实现要点

- 复盘数据从现有比赛结果表读取（`trading_rounds`、`tv_submissions`、`tv_snapshots` 等），**不需要新表**。
- 仅新增一个 `debrief_published` 标志位（可放在 `competition_events` 表的 `meta_json` 中，或新增 `event_debriefs` 轻量表）。
- 学生端在 `/camp` 检测已发布的复盘，展示入口。

---

### 2.3 营团公告

#### 2.3.1 需求概述

教师可在营团内发布公告，学生端 `/camp` 营首页顶部展示最新公告。

#### 2.3.2 范围控制（P0 极简版）

- 仅支持纯文本 + 链接自动识别，不支持富文本/附件。
- 最多 3 条公告同时展示，旧公告折叠到历史。
- 无「已读回执」（P0 不做），仅展示。

#### 2.3.3 数据结构（新增表）

```sql
-- camp_announcements（唯一新增表）
CREATE TABLE camp_announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teaching_group_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by INTEGER NOT NULL,  -- user_id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_pinned BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (teaching_group_id) REFERENCES competition_events(id) -- 或 teaching_groups 表
);
```

> 注：如果 `teaching_groups` 表尚未有独立 ID（当前可能复用 `competition_events`），需确认。若 `teaching_groups` 已有独立表，则外键指向它。

#### 2.3.4 API 设计

```
GET    /api/v1/teaching-groups/{group_id}/announcements
POST   /api/v1/teaching-groups/{group_id}/announcements
DELETE /api/v1/teaching-groups/{group_id}/announcements/{id}
```

---

### 2.4 P0 前端页面调整

#### 2.4.1 营团详情页（CampDetailPage）重构

当前 `CampDetailPage` 只有「营内商赛」和「成员名册」两个区域。P0 改为 Tab 结构：

```
/camps/:id
├── Tab: 概览（新增）
│   ├── 营团 KPI 卡片：成员数、进行中商赛数、本周活跃人次
│   ├── 最新公告（置顶）
│   └── 最近活动时间线
├── Tab: 营内商赛（已有，增加「复盘」入口）
├── Tab: 学员进度（新增）
│   └── 进度表格 + 筛选 + 学员抽屉
├── Tab: 成员名册（已有，并入「学员进度」或保留独立）
└── Tab: 公告管理（新增，仅教师可见）
    └── 发布公告 + 历史列表
```

#### 2.4.2 新增页面

- `CampDashboardPage`（营团概览 Tab 内容）
- `MemberProgressPage`（学员进度 Tab 内容）
- `CampAnnouncementsPage`（公告管理 Tab 内容）
- `EventDebriefPage`（赛后复盘页）

---

## 三、P1 阶段：赛季与教学编排

> **目标**：让教师端从「营团管理工具」升级为「教学导演台」——可编排完整教学节奏。  
> **工期预估**：3～4 周  
> **改动范围**：新增 `seasons` / `milestones` / `groups`（分组）表 + 前端赛季编排 UI。

---

### 3.1 赛季（Season）

#### 3.1.1 概念定义

一个营团可包含多个赛季。赛季是「一次完整教学段落」的容器，从开季到收官，包含若干里程碑（活动占位）。

**示例**：
- 营团：「高二商赛社 2026 春」
  - 赛季 1：「4 周商赛入门」（2.15~3.15）
  - 赛季 2：「暑期集训营」（7.1~7.15）

#### 3.1.2 数据结构（新增表）

```sql
-- seasons
CREATE TABLE seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teaching_group_id INTEGER NOT NULL,
  title TEXT NOT NULL,              -- e.g. "4周商赛入门"
  description TEXT,
  theme TEXT,                       -- 赛季主题，如 "长三角贸易"
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | recruiting | ongoing | final | closed
  start_at TIMESTAMP,
  end_at TIMESTAMP,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  config_json TEXT,                 -- 扩展配置（里程碑模板ID、难度预设等）
  FOREIGN KEY (teaching_group_id) REFERENCES teaching_groups(id)
);

-- season_milestones
CREATE TABLE season_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  title TEXT NOT NULL,              -- e.g. "第一周：理论课"
  description TEXT,
  milestone_type TEXT NOT NULL,     -- lecture | practice_match | formal_match | debrief | assignment | discussion
  sequence_order INTEGER NOT NULL,  -- 排序
  status TEXT DEFAULT 'locked',     -- locked | unlocked | completed
  unlock_at TIMESTAMP,              -- 解锁时间（可选）
  due_at TIMESTAMP,                 -- 截止时间（可选）
  linked_event_id INTEGER,          -- 关联的 competition_events.id（赛事类型）
  config_json TEXT,                 -- 扩展：关联课程ID、作业模板ID等
  FOREIGN KEY (season_id) REFERENCES seasons(id),
  FOREIGN KEY (linked_event_id) REFERENCES competition_events(id)
);
```

#### 3.1.3 赛季生命周期

| 状态 | 说明 | 教师可执行 |
|------|------|-----------|
| `draft` | 草稿，仅教师可见 | 编辑里程碑、设置时间 |
| `recruiting` | 招募中，学生可见赛季预告 | 发布赛季公告 |
| `ongoing` | 进行中，按里程碑推进 | 解锁里程碑、发起商赛 |
| `final` | 收官阶段，最后里程碑 | 组织收官赛、发布结算 |
| `closed` | 已结束，只读 | 查看档案 |

#### 3.1.4 里程碑类型

| 类型 | 说明 | 教师动作 | 学生端表现 |
|------|------|----------|-----------|
| `lecture` | 理论课 | 关联 Wiki/课程资料 | 显示阅读任务 |
| `practice_match` | 练习赛 | 一键创建练习赛（默认 AI 对手） | 进入练习赛大厅 |
| `formal_match` | 正式赛（T2） | 创建班级正式赛 | 房间码加入 |
| `debrief` | 复盘 | 发布赛后复盘 | 查看班级复盘页 |
| `assignment` | 作业/产出 | 布置反思/计划书 | 提交入口 |
| `discussion` | 讨论任务 | 发布讨论题（远期群聊） | 讨论区（远期） |

---

### 3.2 活动编排工作流

#### 3.2.1 教师编排赛季（前端流程）

```
1. 进入营团详情 → 「赛季」Tab
2. 点击「创建赛季」
   - 填写：名称、主题、起止时间
   - 选择模板（或空白）：「4周入门」「单周体验」「暑期集训」
3. 进入赛季编辑页
   - 拖拽添加里程碑（左侧类型面板 → 右侧时间线）
   - 设置每个里程碑：名称、类型、建议时长、是否必做
4. 点击「发布赛季」→ 状态变为 recruiting/ongoing
5. 赛季进行中：
   - 里程碑默认 locked
   - 教师点击「解锁下一里程碑」→ 学生端可见并收到提示
   - 赛事类型里程碑：点击后跳转「发起商赛」（自动带 group_id 和 season_id）
```

#### 3.2.2 模板预设

| 模板 | 里程碑序列 | 适用场景 |
|------|-----------|----------|
| 4 周商赛入门 | 理论课 → 练习赛×2 → 正式赛 → 复盘 → 作业 | 学期社团课 |
| 单周体验课 | 理论课 → 练习赛 → 复盘 | 开放日/试听课 |
| 暑期集训 | 理论课 → 练习赛×3 → 正式赛×2 → 复盘 → 路演作业 | 夏令营 |

---

### 3.3 营团分组

#### 3.3.1 需求概述

大营团（如 40 人）可按 4~5 人分小组，小组内协作/组间对抗。

#### 3.3.2 数据结构（新增表）

```sql
-- camp_groups（营团内分组）
CREATE TABLE camp_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teaching_group_id INTEGER NOT NULL,
  name TEXT NOT NULL,               -- e.g. "A组"
  color TEXT,                       -- UI 颜色标识
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teaching_group_id) REFERENCES teaching_groups(id)
);

-- camp_group_members（分组-成员关联）
CREATE TABLE camp_group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  camp_group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT DEFAULT 'member',       -- leader | member
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (camp_group_id) REFERENCES camp_groups(id),
  UNIQUE(camp_group_id, user_id)
);
```

#### 3.3.3 分组应用场景

- **TechVenture 队伍赛**：分组 = 队伍，组内共享成绩
- **分组对抗赛**：A 组 vs B 组，教师可查看组间排名
- **作业协作**：同组成员可共同提交一份作业

#### 3.3.4 前端交互

- 营团详情页新增「分组管理」Tab
- 自动分组：按人数平均分配，随机/按加入顺序
- 手动调整：拖拽学员到不同组
- 组名/颜色可编辑

---

### 3.4 作业系统（轻量版）

#### 3.4.1 需求概述

教师可布置简单作业（如赛后反思、商业计划书），学生提交文本，教师端批改。

#### 3.4.2 范围控制（P1 极简版）

- 作业类型：纯文本提交（支持 Markdown 简子集）
- 评分：0~100 分 + 教师评语
- 不接入 AI 批改（P2 再考虑）

#### 3.4.3 数据结构

```sql
-- assignments
CREATE TABLE assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teaching_group_id INTEGER NOT NULL,
  season_id INTEGER,                -- 可选，关联赛季
  milestone_id INTEGER,             -- 可选，关联里程碑
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMP,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active',     -- active | closed
  FOREIGN KEY (teaching_group_id) REFERENCES teaching_groups(id),
  FOREIGN KEY (season_id) REFERENCES seasons(id)
);

-- assignment_submissions
CREATE TABLE assignment_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  score INTEGER,                    -- 0-100，教师批改后写入
  feedback TEXT,
  graded_at TIMESTAMP,
  graded_by INTEGER,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id),
  UNIQUE(assignment_id, user_id)
);
```

---

## 四、数据模型

### 4.1 P0 新增表

```sql
-- camp_announcements（营团公告）
CREATE TABLE camp_announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teaching_group_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_pinned BOOLEAN DEFAULT FALSE
);

-- event_debriefs（赛后复盘发布状态）
-- 轻量表，如已有 competition_events.meta_json 可复用则免建
CREATE TABLE event_debriefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL UNIQUE,
  published_at TIMESTAMP,
  published_by INTEGER,
  teacher_notes TEXT,
  insights_json TEXT,
  FOREIGN KEY (event_id) REFERENCES competition_events(id)
);
```

### 4.2 P1 新增表

```sql
-- seasons（赛季）
CREATE TABLE seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teaching_group_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  theme TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  start_at TIMESTAMP,
  end_at TIMESTAMP,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  config_json TEXT
);

-- season_milestones（里程碑）
CREATE TABLE season_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  milestone_type TEXT NOT NULL,
  sequence_order INTEGER NOT NULL,
  status TEXT DEFAULT 'locked',
  unlock_at TIMESTAMP,
  due_at TIMESTAMP,
  linked_event_id INTEGER,
  config_json TEXT
);

-- camp_groups（分组）
CREATE TABLE camp_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teaching_group_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- camp_group_members（分组成员）
CREATE TABLE camp_group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  camp_group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(camp_group_id, user_id)
);

-- assignments（作业）
CREATE TABLE assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teaching_group_id INTEGER NOT NULL,
  season_id INTEGER,
  milestone_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMP,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active'
);

-- assignment_submissions（作业提交）
CREATE TABLE assignment_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  score INTEGER,
  feedback TEXT,
  graded_at TIMESTAMP,
  graded_by INTEGER,
  UNIQUE(assignment_id, user_id)
);
```

### 4.3 现有表扩展（如有需要）

```sql
-- teaching_groups：增加 season 关联（可选，一个营团当前赛季）
ALTER TABLE teaching_groups ADD COLUMN current_season_id INTEGER;

-- competition_events：增加 season_id 关联
ALTER TABLE competition_events ADD COLUMN season_id INTEGER;
ALTER TABLE competition_events ADD COLUMN milestone_id INTEGER;
```

---

## 五、API 设计

### 5.1 P0 API

#### 学员进度看板

```
GET /api/v1/teaching-groups/{group_id}/member-progress
```

#### 赛后复盘

```
GET    /api/v1/teaching-groups/{group_id}/events/{event_id}/debrief
POST   /api/v1/teaching-groups/{group_id}/events/{event_id}/debrief/publish
PATCH  /api/v1/teaching-groups/{group_id}/events/{event_id}/debrief  (更新教师笔记)
```

#### 营团公告

```
GET    /api/v1/teaching-groups/{group_id}/announcements
POST   /api/v1/teaching-groups/{group_id}/announcements
DELETE /api/v1/teaching-groups/{group_id}/announcements/{id}
```

### 5.2 P1 API

#### 赛季管理

```
GET    /api/v1/teaching-groups/{group_id}/seasons
POST   /api/v1/teaching-groups/{group_id}/seasons
GET    /api/v1/seasons/{season_id}
PATCH  /api/v1/seasons/{season_id}
DELETE /api/v1/seasons/{season_id}
POST   /api/v1/seasons/{season_id}/publish      # 发布赛季
POST   /api/v1/seasons/{season_id}/close        # 结束赛季
```

#### 里程碑

```
GET    /api/v1/seasons/{season_id}/milestones
POST   /api/v1/seasons/{season_id}/milestones
PATCH  /api/v1/seasons/{season_id}/milestones/{milestone_id}
DELETE /api/v1/seasons/{season_id}/milestones/{milestone_id}
POST   /api/v1/seasons/{season_id}/milestones/{milestone_id}/unlock  # 教师解锁
POST   /api/v1/seasons/{season_id}/milestones/{milestone_id}/complete # 标记完成
```

#### 分组

```
GET    /api/v1/teaching-groups/{group_id}/groups
POST   /api/v1/teaching-groups/{group_id}/groups
PATCH  /api/v1/teaching-groups/{group_id}/groups/{group_id}
DELETE /api/v1/teaching-groups/{group_id}/groups/{group_id}
POST   /api/v1/teaching-groups/{group_id}/groups/auto-generate  # 自动分组
POST   /api/v1/teaching-groups/{group_id}/groups/{group_id}/members  # 添加成员
DELETE /api/v1/teaching-groups/{group_id}/groups/{group_id}/members/{user_id}
```

#### 作业

```
GET    /api/v1/teaching-groups/{group_id}/assignments
POST   /api/v1/teaching-groups/{group_id}/assignments
GET    /api/v1/assignments/{assignment_id}
PATCH  /api/v1/assignments/{assignment_id}
DELETE /api/v1/assignments/{assignment_id}

GET    /api/v1/assignments/{assignment_id}/submissions
GET    /api/v1/assignments/{assignment_id}/submissions/my
POST   /api/v1/assignments/{assignment_id}/submissions
PATCH  /api/v1/assignments/{assignment_id}/submissions/{submission_id}/grade  # 教师评分
```

---

## 六、前端设计

### 6.1 信息架构（P0 + P1 合并视图）

```
教师端 :5174
├── 我的体验营（列表）          ← 已有
├── 体验营详情 /camps/:id
│   ├── Tab: 概览（P0 新增）
│   │   ├── KPI 卡片
│   │   ├── 最新公告
│   │   └── 最近活动时间线
│   ├── Tab: 赛季（P1 新增）
│   │   ├── 赛季列表
│   │   ├── 赛季详情/编排
│   │   └── 里程碑时间线
│   ├── Tab: 营内商赛（已有）
│   │   ├── 商赛列表（增加「复盘」入口）
│   │   └── 发起商赛
│   ├── Tab: 学员进度（P0 新增）
│   │   ├── 进度表格
│   │   ├── 筛选/搜索
│   │   └── 学员详情抽屉
│   ├── Tab: 成员名册（已有）
│   ├── Tab: 分组管理（P1 新增）
│   │   ├── 分组列表
│   │   ├── 拖拽调整
│   │   └── 自动分组
│   └── Tab: 公告（P0 新增）
│       ├── 发布公告
│       └── 历史公告
├── 发起商赛 /events/create     ← 已有
├── 控场页 /events/:id          ← 已有
├── 赛后复盘 /events/:id/debrief ← P0 新增
└── 作业批改 /assignments/:id    ← P1 新增
```

### 6.2 关键页面设计

#### 6.2.1 学员进度看板

```
┌─────────────────────────────────────────────┐
│  学员进度                    [搜索框] [筛选▼] │
├─────────────────────────────────────────────┤
│  状态概览：🟢积极15  🟡正常5  🔴需关注3  ⚪新1  │
├─────────────────────────────────────────────┤
│  学员    | 加入时间 | 参赛 | 累计XP | 最近活跃 | 状态 │
│  ─────────────────────────────────────────  │
│  小明    | 05-20   |  3   | 1250  | 昨天    | 🟢   │
│  小红    | 05-21   |  1   |  400  | 3天前   | 🟡   │
│  小刚    | 05-18   |  0   |    0  | 无      | 🔴   │
├─────────────────────────────────────────────┤
│  [导出CSV]                                  │
└─────────────────────────────────────────────┘
```

点击学员行 → 右侧抽屉弹出：
```
┌──────────────────────┐
│ 小明                 │
│ 加入：2026-05-20     │
│ ───────────────────  │
│ 参赛时间线：          │
│  05-22  回合制 #1  第3名 │
│  05-25  TechV #2   第1名 │
│  05-28  浮生记 #3  第5名 │
│ ───────────────────  │
│ XP 变化曲线 [简图]   │
└──────────────────────┘
```

#### 6.2.2 赛后复盘页

```
┌─────────────────────────────────────────────┐
│  TechVenture 班级赛 #1        [发布复盘] [下载]│
│  结束时间：2026-05-28 10:00                  │
├─────────────────────────────────────────────┤
│  📊 班级排名（Top 5）                        │
│  1. 小明-星火队    8500分  +300XP           │
│  2. 小红-浪尖队    7200分  +250XP           │
│  ...                                        │
├─────────────────────────────────────────────┤
│  📈 决策分布                                  │
│  路线A: ████████ 40%                        │
│  路线B: ██████░░ 35%                        │
│  路线C: ███░░░░░ 25%                        │
├─────────────────────────────────────────────┤
│  💡 AI 洞察（可编辑）                         │
│  ✓ 80%的队伍选择了路线A，竞争激烈            │
│  ✓ 3支队伍BQI低于50，品牌策略需加强          │
│  [+ 添加自定义洞察]                          │
├─────────────────────────────────────────────┤
│  📝 教师笔记                                  │
│  [文本框：这节课大家路线选择比较保守...]      │
└─────────────────────────────────────────────┘
```

#### 6.2.3 赛季编排页（P1）

```
┌─────────────────────────────────────────────┐
│  赛季：4周商赛入门    [保存] [发布赛季]       │
├─────────────────────────────────────────────┤
│  基本信息                                     │
│  主题：长三角贸易  时间：2.15 ~ 3.15        │
├─────────────────────────────────────────────┤
│  里程碑时间线                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  │ 📖 第1周：理论课          [locked]       │
│  │    └ 关联课程：供需关系基础              │
│  │                                           │
│  │ 🎮 练习赛 #1              [locked]       │
│  │    └ 赛制：浮生记RTS（AI对手）           │
│  │    [发起练习赛]                           │
│  │                                           │
│  │ 🎮 练习赛 #2              [locked]       │
│  │                                           │
│  │ 🏆 班级正式赛（T2）        [locked]       │
│  │    [发起正式赛]                           │
│  │                                           │
│  │ 📊 复盘与作业              [locked]       │
│  │    └ 作业：赛后反思 200 字               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                              │
│  [+ 添加里程碑]     [从模板加载]            │
└─────────────────────────────────────────────┘
```

---

## 七、实施优先级与验收标准

### 7.1 P0 实施顺序（建议）

| 序号 | 功能 | 工期 | 验收标准 |
|------|------|------|----------|
| P0-1 | 学员进度看板 API + 页面 | 3d | 教师可查看营团所有学员的参赛场次、XP、状态标签 |
| P0-2 | 赛后复盘汇总 API + 页面 | 3d | 比赛结束后教师可查看班级排名、决策分布、发布复盘 |
| P0-3 | 营团公告 API + 页面 | 2d | 教师可发公告，学生端 `/camp` 顶部可见 |
| P0-4 | 营团详情页 Tab 重构 | 2d | 现有页面按新 Tab 结构重组，不破坏现有功能 |

### 7.2 P1 实施顺序（建议）

| 序号 | 功能 | 工期 | 验收标准 |
|------|------|------|----------|
| P1-1 | `seasons` + `season_milestones` 表 + API | 4d | 可创建/编辑/发布赛季，含里程碑序列 |
| P1-2 | 赛季编排前端页面 | 4d | 拖拽/添加里程碑，选择模板，解锁推进 |
| P1-3 | 营团分组表 + API + 前端 | 3d | 可手动/自动分组，分组在名册中展示 |
| P1-4 | 作业系统表 + API + 前端 | 3d | 教师布置作业，学生提交，教师批改 |
| P1-5 | 学生端赛季进度展示 | 2d | `/camp` 显示当前赛季进度条和待完成任务 |

---

## 八、风险与约束

| 风险 | 影响 | 对策 |
|------|------|------|
| 聚合查询性能 | 学员进度看板 JOIN 多表 | 营团规模 < 100 时直接查；> 200 时加缓存或异步 |
| 复盘数据格式差异 | 不同赛制数据结构不同 | 复盘 API 按 `game_config_id` 路由到不同汇总逻辑 |
| 赛季 vs 营团关系 | 教师可能混淆「营团」和「赛季」 | UI 明确区分：营团 = 容器；赛季 = 一次教学段落 |
| P1 表结构变更 | `seasons` 依赖 `teaching_groups` 表 | 确认 `teaching_groups` 表当前状态，必要时先补 schema |
| 作业批改工作流 | 教师可能不愿逐份批改 | P1 仅做基础评分；P2 再引入 AI 批改脚手架 |
| 多端边界模糊 | 教师端/组织者端/学生端功能重叠 | 严格按文档边界执行：教师端只做教学编排，不做赛事运营 |

---

## 附录 A：与现有文档索引

| 本文引用 | 对齐文档 | 说明 |
|----------|----------|------|
| 赛季生命周期 | `02-` §6.0 | 赛季状态机、`draft`→`closed` |
| 里程碑类型 | `02-` §5.1 | 理论课→练习赛→复盘→产出 |
| 教师端边界 | `83-` §三 | 教师端 vs 组织者端 vs 学生端 |
| P1 缺口 | `84-` §3.1~3.2 | 营团运营台、赛季轻量版 |
| 赛季 ADR | `ADR-009` | 赛季模式与教师端双端演进决策 |
| 赛事工坊 | `89-` | 赛制 YAML 热配置可复用于教学编排 |
| AI 教练边界 | `81-` | AI 仅做脚手架，不替代教师决策 |

---

*商域 BizSim Edu · 教师端功能演进 PRD · P0+P1*
