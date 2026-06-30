# 教师端营团实施手册

> **文档定位**：教师通过营团项目完整实施一次商业素养体验项目的操作与开发手册。覆盖营团创建、赛季编排、商赛控场、学生管理。  
> **目标读者**：前端开发者、后端开发者、教师/组织者  
> **关联文档**：`docs/prd/PRD-夏令营教师场景.md` · `03-ENGINEERING.md` · `04-ROADMAP.md`  
> **最后更新**：2026-06-22

---

## 一、概述与约定

### 1.1 项目结构约定

```
webapp/organizer-frontend/src/
├── pages/
│   ├── CampDetailPage.tsx          # Tab 容器（修改）
│   └── camp/
│       ├── OverviewTab.tsx         # 概览（扩展）
│       ├── TaskCenterTab.tsx       # 任务中心（新增，含4子Tab）
│       ├── CompanyTab.tsx          # 公司管理（新增，含2子Tab）
│       ├── CoinEconomyTab.tsx      # 营币经济（新增，含5子Tab）
│       ├── ScoringTab.tsx          # 评分评奖（新增，含3子Tab）
│       ├── EventsTab.tsx           # 营内商赛（已有，不变）
│       └── MemberManagementTab.tsx # 成员管理（新增，含4子Tab）
├── components/camp/                # 共享组件（新增目录）
│   ├── KpiCards.tsx
│   ├── TodayAgenda.tsx
│   ├── QuickActions.tsx
│   ├── DaySelector.tsx
│   ├── TaskCard.tsx
│   ├── GalleryCard.tsx
│   ├── ScoreInput.tsx
│   ├── CoinGrantModal.tsx
│   └── AwardCard.tsx
├── stores/
│   └── campStore.ts                # 扩展（新增 state + action）
├── types/
│   └── camp.ts                     # 新增类型定义文件
└── lib/
    └── api.ts                      # 已有，不变

webapp/backend/app/
├── api/
│   ├── teaching_groups.py          # 扩展已有路由
│   ├── camp_agenda.py              # 新增：议程
│   ├── camp_tasks.py               # 新增：任务
│   ├── camp_submissions.py         # 新增：提交/作品
│   ├── camp_companies.py           # 新增：公司
│   ├── camp_coins.py               # 新增：营币
│   ├── camp_scoring.py             # 新增：评分
│   └── camp_awards.py              # 新增：奖项
├── models/
│   └── camp.py                     # 新增：所有夏令营模型
└── schemas/
    └── camp.py                     # 新增：Pydantic schemas
```

### 1.2 编码约定

- **组件**：默认导出函数组件，`interface Props { groupId: number }`
- **样式**：Tailwind CSS + `glass-card` 等已有工具类
- **状态**：Zustand，`create<CampState>((set) => ({...}))`
- **API**：`api.get<T>(url)` / `api.post<T>(url, data)`，统一走 `lib/api.ts`
- **图标**：Lucide React
- **Loading**：`Loader2` + `animate-spin`
- **空状态**：图标 + `text-foreground-muted` 文字

### 1.3 文件修改清单（已有文件）

| 文件 | 操作 | 说明 |
|------|------|------|
| `App.tsx` | 修改 | 无需修改路由 |
| `CampDetailPage.tsx` | 修改 | Tab 列表替换为 7 个 |
| `OverviewTab.tsx` | 扩展 | 新增今日议程、快捷操作 |
| `campStore.ts` | 扩展 | 新增大量 state + action |
| `types/index.ts` | 扩展 | 或新建 `types/camp.ts` |

---

## 二、公共基础设施

### 2.1 路由配置（无需修改）

`CampDetailPage` 已在 `/camps/:id` 路由下，内部 Tab 切换通过本地 state 管理，无需新增路由。

### 2.2 类型定义（types/camp.ts）

**新建文件**，所有夏令营相关类型统一放这里：

```typescript
// types/camp.ts
// ─────────────────────────────────────────────

// ========== 议程 ==========
export interface CampAgendaItem {
  id: number;
  group_id: number;
  day_number: number;
  start_time: string;    // "09:00"
  end_time: string;      // "10:30"
  title: string;
  location?: string;
  description?: string;
  task_id?: number;
  sort_order: number;
}

// ========== 任务 ==========
export type TaskType =
  | 'text' | 'image' | 'video' | 'file' | 'vote' | 'match'
  | 'lecture' | 'practice_match' | 'formal_match' | 'debrief'
  | 'assignment' | 'discussion' | 'survey' | 'prototype' | 'pitch';

export type TaskStatus = 'draft' | 'published' | 'closed' | 'scored' | 'archived';
export type SubmitterType = 'user' | 'group';

export interface ScoringDimension {
  id: number;
  task_id: number;
  name: string;
  weight: number;       // 0.0 ~ 1.0
  max_score: number;    // 默认 5
  sort_order: number;
}

export interface CampTask {
  id: number;
  group_id: number;
  day_number: number;
  title: string;
  description?: string;
  task_type: TaskType;
  submit_type: SubmitterType;
  due_at?: string;
  config_json?: Record<string, unknown>;
  status: TaskStatus;
  dimensions?: ScoringDimension[];
  created_by: number;
  created_at: string;
  updated_at: string;
}

// ========== 提交/作品 ==========
export interface TaskSubmission {
  id: number;
  task_id: number;
  submitter_type: SubmitterType;
  submitter_id: number;
  submitter_name: string;    // 公司名或用户名
  content?: string;
  attachments: string[];     // 图片 URL 数组
  submitted_at: string;
  status: 'pending' | 'reviewed' | 'featured';
  score?: number;
  feedback?: string;
  vote_counts?: Record<string, number>;  // { thumbs_up: 12, clap: 8, heart: 5 }
}

export interface SubmissionReview {
  id: number;
  submission_id: number;
  dimension_id: number;
  dimension_name: string;
  scorer_id: number;
  scorer_name: string;
  score: number;
  comment?: string;
}

// ========== 公司 ==========
export type CompanyRole = 'ceo' | 'product' | 'marketing' | 'finance' | 'research' | 'design';

export interface CompanyMember {
  user_id: number;
  username: string;
  avatar?: string;
  role: CompanyRole;
}

export interface CampCompany {
  id: number;
  group_id: number;
  camp_group_id: number;
  name: string;
  logo_url?: string;
  slogan?: string;
  members: CompanyMember[];
  coin_balance: number;
  total_score: number;
  work_count: number;
  created_at: string;
}

export interface RoleTemplate {
  role_type: CompanyRole;
  name: string;
  description: string;
  icon: string;       // Lucide icon name
  is_enabled: boolean;
}

// ========== 营币 ==========
export interface CampCoinTransaction {
  id: number;
  group_id: number;
  entity_type: SubmitterType;
  entity_name: string;
  amount: number;
  balance_after: number;
  type: 'earn' | 'spend' | 'transfer';
  source_type: string;
  description?: string;
  created_at: string;
}

export interface CampCoinRule {
  id: number;
  group_id: number;
  name: string;
  trigger_type: string;
  amount: number;
  is_active: boolean;
}

export interface CampShopItem {
  id: number;
  group_id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  effect_type: string;
  is_active: boolean;
}

export interface CoinLeaderboardEntry {
  rank: number;
  entity_type: SubmitterType;
  entity_id: number;
  entity_name: string;
  balance: number;
}

// ========== 评分/奖项 ==========
export interface CampAward {
  id: number;
  group_id: number;
  name: string;
  description?: string;
  icon: string;
  criteria?: string;
  sort_order: number;
}

export interface AwardWinner {
  award_id: number;
  award_name: string;
  winner_type: SubmitterType;
  winner_id: number;
  winner_name: string;
  score_value?: number;
  announced_at?: string;
}

// ========== 扩展 Dashboard ==========
export interface CampDashboard extends Omit<import('../stores/campStore').CampDashboard, 'recent_announcements' | 'recent_events'> {
  current_day: number;
  company_count: number;
  active_task_count: number;
  today_agenda: CampAgendaItem[];
  quick_actions: {
    has_ongoing_match: boolean;
    has_pending_reviews: number;
    unscored_tasks: number;
  };
}

// ========== API 响应辅助 ==========
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
```

### 2.3 Zustand Store 扩展（stores/campStore.ts）

**在现有 `campStore.ts` 中扩展**，保留已有字段，新增：

```typescript
// 在 CampState interface 中新增字段：
interface CampState {
  // === 已有字段 ===
  camps: TeachingGroup[];
  current: TeachingGroupDetail | null;
  announcements: Announcement[];
  memberProgress: MemberProgress[];
  progressSummary: MemberProgressSummary | null;
  dashboard: CampDashboard | null;
  loading: boolean;
  error: string | null;

  // === 新增：议程 ===
  agenda: CampAgendaItem[];
  fetchAgenda: (groupId: number, day?: number) => Promise<void>;
  createAgendaItem: (groupId: number, data: Partial<CampAgendaItem>) => Promise<CampAgendaItem>;
  updateAgendaItem: (groupId: number, itemId: number, data: Partial<CampAgendaItem>) => Promise<CampAgendaItem>;
  deleteAgendaItem: (groupId: number, itemId: number) => Promise<void>;
  reorderAgenda: (groupId: number, items: { id: number; sort_order: number }[]) => Promise<void>;

  // === 新增：任务 ===
  tasks: CampTask[];
  currentTask: CampTask | null;
  fetchTasks: (groupId: number, filters?: { status?: TaskStatus; day?: number; type?: TaskType }) => Promise<void>;
  fetchTaskDetail: (groupId: number, taskId: number) => Promise<void>;
  createTask: (groupId: number, data: Partial<CampTask>) => Promise<CampTask>;
  updateTask: (groupId: number, taskId: number, data: Partial<CampTask>) => Promise<CampTask>;
  deleteTask: (groupId: number, taskId: number) => Promise<void>;
  publishTask: (groupId: number, taskId: number) => Promise<void>;
  closeTask: (groupId: number, taskId: number) => Promise<void>;
  remindTask: (groupId: number, taskId: number) => Promise<void>;

  // === 新增：提交/作品 ===
  submissions: TaskSubmission[];
  currentSubmission: TaskSubmission | null;
  submissionReviews: SubmissionReview[];
  pendingReviewCount: number;
  fetchSubmissions: (groupId: number, filters?: { task_id?: number; day?: number; group_id?: number }) => Promise<void>;
  fetchSubmissionDetail: (groupId: number, submissionId: number) => Promise<void>;
  reviewSubmission: (groupId: number, submissionId: number, dimensions: { dimension_id: number; score: number; comment?: string }[]) => Promise<void>;
  featureSubmission: (groupId: number, submissionId: number, featured: boolean) => Promise<void>;
  fetchPendingReviewCount: (groupId: number) => Promise<void>;

  // === 新增：公司 ===
  companies: CampCompany[];
  roleTemplates: RoleTemplate[];
  fetchCompanies: (groupId: number) => Promise<void>;
  updateCompanyRoles: (groupId: number, companyId: number, roles: { user_id: number; role: CompanyRole }[]) => Promise<void>;
  rotateRoles: (groupId: number, companyId: number) => Promise<void>;
  fetchRoleTemplates: (groupId: number) => Promise<void>;
  updateRoleTemplates: (groupId: number, templates: RoleTemplate[]) => Promise<void>;

  // === 新增：营币 ===
  coinTransactions: CampCoinTransaction[];
  coinRules: CampCoinRule[];
  shopItems: CampShopItem[];
  coinLeaderboard: CoinLeaderboardEntry[];
  grantCoins: (groupId: number, targets: { entity_type: SubmitterType; entity_id: number }[], amount: number, reason: string) => Promise<void>;
  deductCoins: (groupId: number, targets: { entity_type: SubmitterType; entity_id: number }[], amount: number, reason: string) => Promise<void>;
  fetchCoinTransactions: (groupId: number, filters?: { entity_type?: SubmitterType; entity_id?: number }) => Promise<void>;
  fetchCoinRules: (groupId: number) => Promise<void>;
  updateCoinRule: (groupId: number, ruleId: number, data: Partial<CampCoinRule>) => Promise<void>;
  fetchShopItems: (groupId: number) => Promise<void>;
  createShopItem: (groupId: number, data: Partial<CampShopItem>) => Promise<void>;
  updateShopItem: (groupId: number, itemId: number, data: Partial<CampShopItem>) => Promise<void>;
  deleteShopItem: (groupId: number, itemId: number) => Promise<void>;
  fetchCoinLeaderboard: (groupId: number, type: 'company' | 'user') => Promise<void>;

  // === 新增：评分/奖项 ===
  awards: CampAward[];
  awardWinners: AwardWinner[];
  fetchAwards: (groupId: number) => Promise<void>;
  createAward: (groupId: number, data: Partial<CampAward>) => Promise<CampAward>;
  updateAward: (groupId: number, awardId: number, data: Partial<CampAward>) => Promise<CampAward>;
  deleteAward: (groupId: number, awardId: number) => Promise<void>;
  calculateWinners: (groupId: number) => Promise<void>;
  announceWinner: (groupId: number, awardId: number, winnerId: number, winnerType: SubmitterType) => Promise<void>;

  // === 已有 action ===
  fetchMine: () => Promise<void>;
  fetchDetail: (id: number) => Promise<void>;
  createCamp: (...) => ...;
  updateCamp: (...) => ...;
  fetchAnnouncements: (...) => ...;
  createAnnouncement: (...) => ...;
  deleteAnnouncement: (...) => ...;
  pinAnnouncement: (...) => ...;
  fetchMemberProgress: (...) => ...;
  fetchDashboard: (...) => ...;
  clearError: () => void;
}
```

### 2.4 后端路由注册（backend/app/main.py）

在 `main.py` 中新增路由注册：

```python
from app.api import (
    auth, teaching_groups, camp_agenda, camp_tasks,
    camp_submissions, camp_companies, camp_coins,
    camp_scoring, camp_awards,
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(teaching_groups.router, prefix="/api/v1")
# 新增：
app.include_router(camp_agenda.router, prefix="/api/v1")
app.include_router(camp_tasks.router, prefix="/api/v1")
app.include_router(camp_submissions.router, prefix="/api/v1")
app.include_router(camp_companies.router, prefix="/api/v1")
app.include_router(camp_coins.router, prefix="/api/v1")
app.include_router(camp_scoring.router, prefix="/api/v1")
app.include_router(camp_awards.router, prefix="/api/v1")
```

---

## 三、📊 概览 Tab 开发手册

### 3.1 页面入口

**文件**：`pages/camp/OverviewTab.tsx`（已有，扩展）

**Props**：`interface Props { groupId: number }`

### 3.2 数据流

```
CampDetailPage → OverviewTab(groupId)
  → useCampStore()
    → fetchDashboard(groupId)  // 已有，扩展返回字段
    → fetchAgenda(groupId, current_day)
```

### 3.3 组件清单

| 组件名 | 文件路径 | Props | 职责 |
|--------|----------|-------|------|
| `OverviewTab` | `pages/camp/OverviewTab.tsx` | `{ groupId }` | Tab 主容器，组合子组件 |
| `KpiCards` | `components/camp/KpiCards.tsx` | `{ memberCount, companyCount, currentDay, activeTaskCount }` | 4 张 KPI 卡片 |
| `TodayAgenda` | `components/camp/TodayAgenda.tsx` | `{ items: CampAgendaItem[], currentTaskId? }` | 今日议程时间轴 |
| `QuickActions` | `components/camp/QuickActions.tsx` | `{ actions: QuickAction[], onAction }` | 快捷操作按钮栏 |

### 3.4 关键组件实现

**KpiCards.tsx**

```typescript
// components/camp/KpiCards.tsx
import { Users, Building2, Calendar, ClipboardList } from 'lucide-react';

interface Props {
  memberCount: number;
  companyCount: number;
  currentDay: number;
  activeTaskCount: number;
}

const KPI_CONFIG = [
  { key: 'memberCount', label: '成员数', icon: Users, color: 'text-primary' },
  { key: 'companyCount', label: '已组建公司', icon: Building2, color: 'text-emerald-400' },
  { key: 'currentDay', label: '当前天数', icon: Calendar, color: 'text-amber-400' },
  { key: 'activeTaskCount', label: '进行中任务', icon: ClipboardList, color: 'text-purple-400' },
] as const;

export default function KpiCards({ memberCount, companyCount, currentDay, activeTaskCount }: Props) {
  const values = { memberCount, companyCount, currentDay, activeTaskCount };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {KPI_CONFIG.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{values[key]}</p>
              <p className="text-xs text-foreground-muted">{label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**TodayAgenda.tsx**

```typescript
// components/camp/TodayAgenda.tsx
import { Clock, MapPin, CheckCircle2, Circle } from 'lucide-react';
import type { CampAgendaItem } from '../../types/camp';

interface Props {
  items: CampAgendaItem[];
}

function getItemStatus(item: CampAgendaItem): 'upcoming' | 'ongoing' | 'finished' {
  const now = new Date();
  const start = new Date(`${now.toDateString()} ${item.start_time}`);
  const end = new Date(`${now.toDateString()} ${item.end_time}`);
  if (now < start) return 'upcoming';
  if (now > end) return 'finished';
  return 'ongoing';
}

export default function TodayAgenda({ items }: Props) {
  const sorted = [...items].sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="glass-card p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-primary" />
        今日议程
      </h3>
      <div className="space-y-3">
        {sorted.map((item) => {
          const status = getItemStatus(item);
          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-lg ${
                status === 'ongoing'
                  ? 'border border-primary/30 bg-primary/5'
                  : status === 'finished'
                    ? 'opacity-50'
                    : 'bg-background-secondary/50'
              }`}
            >
              {status === 'finished' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : status === 'ongoing' ? (
                <Circle className="w-5 h-5 text-primary shrink-0 mt-0.5 animate-pulse" />
              ) : (
                <Circle className="w-5 h-5 text-foreground-muted shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-foreground-muted">{item.start_time}</span>
                  <span className="font-medium text-sm">{item.title}</span>
                  {status === 'ongoing' && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/15 text-primary">进行中</span>
                  )}
                </div>
                {item.location && (
                  <p className="text-xs text-foreground-muted mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {item.location}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-sm text-foreground-muted text-center py-4">暂无今日议程</p>
        )}
      </div>
    </div>
  );
}
```

**QuickActions.tsx**

```typescript
// components/camp/QuickActions.tsx
import { Plus, Coins, Dices, Image, Gamepad2 } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tab: string;
  modal?: string;
  badge?: number;
}

interface Props {
  actions: QuickAction[];
  onAction: (action: QuickAction) => void;
}

export default function QuickActions({ actions, onAction }: Props) {
  return (
    <div className="glass-card p-5">
      <h3 className="font-semibold mb-4">快捷操作</h3>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background-secondary border border-border-subtle text-sm hover:bg-background-hover transition-colors"
          >
            <action.icon className="w-4 h-4 text-primary" />
            {action.label}
            {action.badge !== undefined && action.badge > 0 && (
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-danger/15 text-danger">{action.badge}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 3.5 OverviewTab 组装

```typescript
// pages/camp/OverviewTab.tsx（扩展后）
import { useEffect } from 'react';
import { useCampStore } from '../../stores/campStore';
import KpiCards from '../../components/camp/KpiCards';
import TodayAgenda from '../../components/camp/TodayAgenda';
import QuickActions from '../../components/camp/QuickActions';
// ... 已有导入

interface Props { groupId: number; }

const QUICK_ACTIONS = [
  { id: 'task', label: '发布任务', icon: Plus, tab: 'tasks', modal: 'createTask' },
  { id: 'coin', label: '发放营币', icon: Coins, tab: 'coins', modal: 'grant' },
  { id: 'fate', label: '抽命运卡', icon: Dices, tab: 'coins', modal: 'fateCard' },
  { id: 'gallery', label: '查看画廊', icon: Image, tab: 'tasks', modal: 'gallery' },
  { id: 'match', label: '进入控场', icon: Gamepad2, tab: 'events' },
];

export default function OverviewTab({ groupId }: Props) {
  const { dashboard, agenda, fetchDashboard, fetchAgenda, pendingReviewCount } = useCampStore();

  useEffect(() => {
    fetchDashboard(groupId);
    fetchAgenda(groupId); // 不传 day 则返回今日
  }, [groupId, fetchDashboard, fetchAgenda]);

  const actions = QUICK_ACTIONS.map((a) =>
    a.id === 'gallery' ? { ...a, badge: pendingReviewCount } : a
  );

  return (
    <div className="space-y-6">
      <KpiCards
        memberCount={dashboard?.member_count ?? 0}
        companyCount={dashboard?.company_count ?? 0}
        currentDay={dashboard?.current_day ?? 1}
        activeTaskCount={dashboard?.active_task_count ?? 0}
      />
      <TodayAgenda items={agenda} />
      <QuickActions actions={actions} onAction={handleQuickAction} />
      {/* 已有：公告区、活动列表 */}
      {/* ... */}
    </div>
  );
}
```

### 3.6 API 契约

```
GET /api/v1/teaching-groups/{id}/dashboard
  ← 扩展返回：
  {
    "member_count": 36,
    "active_event_count": 1,
    "weekly_active_count": 120,
    "company_count": 6,
    "current_day": 3,
    "active_task_count": 3,
    "today_agenda": [...],
    "quick_actions": {
      "has_ongoing_match": true,
      "has_pending_reviews": 5,
      "unscored_tasks": 2
    },
    "recent_announcements": [...],
    "recent_events": [...]
  }
```

---

## 四、📋 任务中心 Tab 开发手册

### 4.1 页面入口

**文件**：`pages/camp/TaskCenterTab.tsx`（新增）

**Props**：`interface Props { groupId: number }`

**内部子 Tab**：

```typescript
const SUB_TABS = [
  { id: 'agenda', label: '议程编排' },
  { id: 'tasks', label: '任务管理' },
  { id: 'gallery', label: '作品画廊' },
  { id: 'stats', label: '提交统计' },
] as const;
```

### 4.2 组件清单

| 组件名 | 文件路径 | Props | 职责 |
|--------|----------|-------|------|
| `TaskCenterTab` | `pages/camp/TaskCenterTab.tsx` | `{ groupId }` | 子 Tab 容器 |
| `AgendaPlanner` | `components/camp/AgendaPlanner.tsx` | `{ groupId, day: number }` | 议程编排子 Tab |
| `AgendaTimeline` | `components/camp/AgendaTimeline.tsx` | `{ items, onReorder, onEdit, onDelete }` | 议程时间轴（可拖拽） |
| `TaskManager` | `components/camp/TaskManager.tsx` | `{ groupId }` | 任务管理子 Tab |
| `TaskList` | `components/camp/TaskList.tsx` | `{ tasks, onEdit, onDelete }` | 任务卡片列表 |
| `TaskCard` | `components/camp/TaskCard.tsx` | `{ task, onEdit, onDelete }` | 单任务卡片 |
| `CreateTaskModal` | `components/camp/CreateTaskModal.tsx` | `{ open, onClose, onSubmit, initialData? }` | 新建/编辑任务弹窗 |
| `ScoringDimensionEditor` | `components/camp/ScoringDimensionEditor.tsx` | `{ dimensions, onChange }` | 评分维度编辑器 |
| `GalleryView` | `components/camp/GalleryView.tsx` | `{ groupId }` | 作品画廊子 Tab |
| `GalleryGrid` | `components/camp/GalleryGrid.tsx` | `{ submissions, onSelect }` | 作品网格 |
| `GalleryCard` | `components/camp/GalleryCard.tsx` | `{ submission }` | 作品卡片 |
| `WorkDetailDrawer` | `components/camp/WorkDetailDrawer.tsx` | `{ submission, onClose, onReview }` | 作品详情抽屉 |
| `ReviewForm` | `components/camp/ReviewForm.tsx` | `{ dimensions, onSubmit }` | 导师评分表单 |
| `SubmissionStats` | `components/camp/SubmissionStats.tsx` | `{ groupId }` | 提交统计子 Tab |

### 4.3 关键组件实现

#### CreateTaskModal（新建任务弹窗）

```typescript
// components/camp/CreateTaskModal.tsx
import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { CampTask, ScoringDimension, TaskType, SubmitterType } from '../../types/camp';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<CampTask> & { dimensions?: Partial<ScoringDimension>[] }) => void;
  initialData?: CampTask;
}

const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'text', label: '文字提交' },
  { value: 'image', label: '图片提交' },
  { value: 'video', label: '视频链接' },
  { value: 'file', label: '文件上传' },
  { value: 'vote', label: '投票' },
];

export default function CreateTaskModal({ open, onClose, onSubmit, initialData }: Props) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [taskType, setTaskType] = useState<TaskType>(initialData?.task_type ?? 'image');
  const [dayNumber, setDayNumber] = useState(initialData?.day_number ?? 1);
  const [submitType, setSubmitType] = useState<SubmitterType>(initialData?.submit_type ?? 'group');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [dueAt, setDueAt] = useState(initialData?.due_at ?? '');
  const [dimensions, setDimensions] = useState<Partial<ScoringDimension>[]>(
    initialData?.dimensions ?? []
  );

  const totalWeight = dimensions.reduce((sum, d) => sum + (d.weight ?? 0), 0);

  const addDimension = () => {
    setDimensions([...dimensions, { name: '', weight: 0, max_score: 5, sort_order: dimensions.length }]);
  };

  const updateDimension = (index: number, field: string, value: unknown) => {
    const next = [...dimensions];
    next[index] = { ...next[index], [field]: value };
    setDimensions(next);
  };

  const removeDimension = (index: number) => {
    setDimensions(dimensions.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title,
      task_type: taskType,
      day_number: dayNumber,
      submit_type: submitType,
      description,
      due_at: dueAt || undefined,
      dimensions: dimensions.length > 0 ? dimensions : undefined,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background-secondary rounded-2xl border border-border-subtle p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold">{initialData ? '编辑任务' : '新建任务'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-background-hover rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 标题 */}
          <div>
            <label className="text-sm text-foreground-muted block mb-1.5">任务标题 *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：街头调研实战"
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle"
            />
          </div>

          {/* 任务类型 + 提交对象 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-foreground-muted block mb-1.5">任务类型 *</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle"
              >
                {TASK_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-foreground-muted block mb-1.5">所属天数 *</label>
              <select
                value={dayNumber}
                onChange={(e) => setDayNumber(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle"
              >
                {Array.from({ length: 7 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Day {i + 1}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 提交对象 */}
          <div>
            <label className="text-sm text-foreground-muted block mb-1.5">提交对象 *</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={submitType === 'user'}
                  onChange={() => setSubmitType('user')}
                  className="accent-primary"
                />
                <span className="text-sm">个人提交</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={submitType === 'group'}
                  onChange={() => setSubmitType('group')}
                  className="accent-primary"
                />
                <span className="text-sm">公司提交</span>
              </label>
            </div>
          </div>

          {/* 截止时间 */}
          <div>
            <label className="text-sm text-foreground-muted block mb-1.5">截止时间</label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle"
            />
          </div>

          {/* 任务说明 */}
          <div>
            <label className="text-sm text-foreground-muted block mb-1.5">任务说明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle resize-none"
            />
          </div>

          {/* 评分维度 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-foreground-muted">评分配置（可选）</label>
              <button
                onClick={addDimension}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="w-3 h-3" />
                添加维度
              </button>
            </div>
            {dimensions.map((dim, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  value={dim.name ?? ''}
                  onChange={(e) => updateDimension(i, 'name', e.target.value)}
                  placeholder="维度名"
                  className="flex-1 px-3 py-2 rounded-lg bg-background border border-border-subtle text-sm"
                />
                <input
                  type="number"
                  value={dim.weight ?? 0}
                  onChange={(e) => updateDimension(i, 'weight', Number(e.target.value))}
                  placeholder="权重%"
                  className="w-20 px-3 py-2 rounded-lg bg-background border border-border-subtle text-sm"
                />
                <span className="text-xs text-foreground-muted">%</span>
                <button onClick={() => removeDimension(i)} className="p-1.5 hover:bg-background-hover rounded-lg">
                  <Trash2 className="w-4 h-4 text-danger" />
                </button>
              </div>
            ))}
            {dimensions.length > 0 && (
              <p className={`text-xs ${Math.abs(totalWeight - 100) < 0.01 ? 'text-emerald-400' : 'text-danger'}`}>
                权重合计：{totalWeight}% {totalWeight !== 100 && '（应为 100%）'}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border-subtle text-sm">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium disabled:opacity-50"
          >
            {initialData ? '保存' : '创建任务'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### ReviewForm（导师评分表单）

```typescript
// components/camp/ReviewForm.tsx
import { useState } from 'react';
import type { ScoringDimension } from '../../types/camp';

interface Props {
  dimensions: ScoringDimension[];
  onSubmit: (scores: { dimension_id: number; score: number; comment?: string }[]) => void;
  onCancel: () => void;
}

export default function ReviewForm({ dimensions, onSubmit, onCancel }: Props) {
  const [scores, setScores] = useState<Record<number, number>>({});
  const [comment, setComment] = useState('');

  const setScore = (dimId: number, score: number) => {
    setScores((prev) => ({ ...prev, [dimId]: score }));
  };

  const isComplete = dimensions.every((d) => scores[d.id] !== undefined);

  const handleSubmit = () => {
    if (!isComplete) return;
    onSubmit(
      dimensions.map((d) => ({
        dimension_id: d.id,
        score: scores[d.id],
        comment: comment || undefined,
      }))
    );
  };

  return (
    <div className="space-y-4">
      {dimensions.map((dim) => (
        <div key={dim.id} className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">
              {dim.name} <span className="text-foreground-muted">(权重 {Math.round(dim.weight * 100)}%)</span>
            </span>
            <span className="text-sm font-bold text-primary">{scores[dim.id] ?? '-'}/{dim.max_score}</span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: dim.max_score }, (_, i) => i + 1).map((score) => (
              <button
                key={score}
                onClick={() => setScore(dim.id, score)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  scores[dim.id] === score
                    ? 'bg-primary text-background'
                    : 'bg-background border border-border-subtle hover:bg-background-hover'
                }`}
              >
                {score}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div>
        <label className="text-sm text-foreground-muted block mb-1.5">点评</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="写下你的点评..."
          className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle resize-none"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-border-subtle text-sm">
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isComplete}
          className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium disabled:opacity-50"
        >
          提交评分
        </button>
      </div>
    </div>
  );
}
```

### 4.4 API 契约

```
# 议程
GET    /api/v1/teaching-groups/{id}/agenda?day={n}
  → { items: CampAgendaItem[] }

POST   /api/v1/teaching-groups/{id}/agenda
  body: { day_number, start_time, end_time, title, location?, description?, task_id?, sort_order }
  → { item: CampAgendaItem }

PUT    /api/v1/teaching-groups/{id}/agenda/{itemId}
  body: 部分字段
  → { item: CampAgendaItem }

DELETE /api/v1/teaching-groups/{id}/agenda/{itemId}
  → { success: true }

PATCH  /api/v1/teaching-groups/{id}/agenda/reorder
  body: { items: [{ id, sort_order }] }
  → { items: CampAgendaItem[] }

# 任务
GET    /api/v1/teaching-groups/{id}/tasks?status=&day=&type=&page=&page_size=
  → { items: CampTask[], total, page, page_size }

POST   /api/v1/teaching-groups/{id}/tasks
  body: { title, task_type, day_number, submit_type, description?, due_at?, config_json?, dimensions? }
  → { task: CampTask }

GET    /api/v1/teaching-groups/{id}/tasks/{taskId}
  → { task: CampTask }

PUT    /api/v1/teaching-groups/{id}/tasks/{taskId}
  body: 部分字段
  → { task: CampTask }

DELETE /api/v1/teaching-groups/{id}/tasks/{taskId}
  → { success: true }

POST   /api/v1/teaching-groups/{id}/tasks/{taskId}/publish
  → { task: CampTask }

POST   /api/v1/teaching-groups/{id}/tasks/{taskId}/close
  → { task: CampTask }

POST   /api/v1/teaching-groups/{id}/tasks/{taskId}/remind
  → { notified_count: number }

# 评分维度
GET    /api/v1/teaching-groups/{id}/tasks/{taskId}/dimensions
  → { dimensions: ScoringDimension[] }

POST   /api/v1/teaching-groups/{id}/tasks/{taskId}/dimensions
  body: [{ name, weight, max_score, sort_order }]
  → { dimensions: ScoringDimension[] }

# 作品与点评
GET    /api/v1/teaching-groups/{id}/submissions?task_id=&day=&group_id=&sort=&page=&page_size=
  → { items: TaskSubmission[], total, page, page_size }

GET    /api/v1/teaching-groups/{id}/submissions/{subId}
  → { submission: TaskSubmission, reviews: SubmissionReview[] }

POST   /api/v1/teaching-groups/{id}/submissions/{subId}/review
  body: { dimensions: [{ dimension_id, score, comment? }] }
  → { reviews: SubmissionReview[], submission: TaskSubmission }

PUT    /api/v1/teaching-groups/{id}/submissions/{subId}/feature
  body: { featured: boolean }
  → { submission: TaskSubmission }

GET    /api/v1/teaching-groups/{id}/submissions/pending-count
  → { count: number }

GET    /api/v1/teaching-groups/{id}/submissions/export?format=csv
  → CSV 文件下载
```

---

## 五、🏢 公司管理 Tab 开发手册

### 5.1 页面入口

**文件**：`pages/camp/CompanyTab.tsx`（新增）

**Props**：`interface Props { groupId: number }`

**内部子 Tab**：

```typescript
const SUB_TABS = [
  { id: 'companies', label: '公司列表' },
  { id: 'roles', label: '角色模板' },
] as const;
```

### 5.2 组件清单

| 组件名 | 文件路径 | Props | 职责 |
|--------|----------|-------|------|
| `CompanyTab` | `pages/camp/CompanyTab.tsx` | `{ groupId }` | 子 Tab 容器 |
| `CompanyList` | `components/camp/CompanyList.tsx` | `{ companies, onEditRoles }` | 公司卡片列表 |
| `CompanyCard` | `components/camp/CompanyCard.tsx` | `{ company }` | 公司信息卡 |
| `RoleAssignmentModal` | `components/camp/RoleAssignmentModal.tsx` | `{ company, members, onSave }` | 角色分配弹窗 |
| `RoleTemplateEditor` | `components/camp/RoleTemplateEditor.tsx` | `{ templates, onChange }` | 角色模板配置 |

### 5.3 关键组件实现

**RoleAssignmentModal**

```typescript
// components/camp/RoleAssignmentModal.tsx
import { useState } from 'react';
import { X, Shuffle } from 'lucide-react';
import type { CampCompany, CompanyRole, CompanyMember } from '../../types/camp';

const ROLE_LABELS: Record<CompanyRole, string> = {
  ceo: 'CEO',
  product: '产品经理',
  marketing: '营销总监',
  finance: '财务官',
  research: '调研员',
  design: '设计师',
};

interface Props {
  company: CampCompany;
  open: boolean;
  onClose: () => void;
  onSave: (roles: { user_id: number; role: CompanyRole }[]) => void;
  onRotate: () => void;
}

export default function RoleAssignmentModal({ company, open, onClose, onSave, onRotate }: Props) {
  const [assignments, setAssignments] = useState<Record<number, CompanyRole>>(() => {
    const map: Record<number, CompanyRole> = {};
    company.members.forEach((m) => { map[m.user_id] = m.role; });
    return map;
  });

  const allRoles = Object.keys(ROLE_LABELS) as CompanyRole[];
  const usedRoles = new Set(Object.values(assignments));

  const handleSave = () => {
    const roles = Object.entries(assignments).map(([userId, role]) => ({
      user_id: Number(userId),
      role,
    }));
    onSave(roles);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background-secondary rounded-2xl border border-border-subtle p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">调整角色 — {company.name}</h3>
          <button onClick={onClose} className="p-2 hover:bg-background-hover rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {company.members.map((member) => (
            <div key={member.user_id} className="flex items-center gap-3">
              <span className="text-sm flex-1">{member.username}</span>
              <select
                value={assignments[member.user_id] ?? ''}
                onChange={(e) => {
                  setAssignments((prev) => ({
                    ...prev,
                    [member.user_id]: e.target.value as CompanyRole,
                  }));
                }}
                className="px-3 py-2 rounded-lg bg-background border border-border-subtle text-sm"
              >
                <option value="">未分配</option>
                {allRoles.map((role) => (
                  <option key={role} value={role} disabled={usedRoles.has(role) && assignments[member.user_id] !== role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={onRotate}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Shuffle className="w-4 h-4" />
            一键轮换
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border-subtle text-sm">
              取消
            </button>
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5.4 API 契约

```
GET    /api/v1/teaching-groups/{id}/companies
  → { companies: CampCompany[] }

PUT    /api/v1/teaching-groups/{id}/companies/{companyId}/roles
  body: { roles: [{ user_id, role }] }
  → { company: CampCompany }

POST   /api/v1/teaching-groups/{id}/companies/{companyId}/roles/rotate
  → { company: CampCompany, assignments: [{ user_id, role }] }

GET    /api/v1/teaching-groups/{id}/role-templates
  → { templates: RoleTemplate[] }

PUT    /api/v1/teaching-groups/{id}/role-templates
  body: { templates: RoleTemplate[] }
  → { templates: RoleTemplate[] }
```

---

## 六、🪙 营币经济 Tab 开发手册

### 6.1 页面入口

**文件**：`pages/camp/CoinEconomyTab.tsx`（新增）

**Props**：`interface Props { groupId: number }`

**内部子 Tab**：

```typescript
const SUB_TABS = [
  { id: 'grant', label: '发放与扣除' },
  { id: 'transactions', label: '交易记录' },
  { id: 'rules', label: '规则配置' },
  { id: 'shop', label: '营团商城' },
  { id: 'leaderboard', label: '排行榜' },
] as const;
```

### 6.2 组件清单

| 组件名 | 文件路径 | Props | 职责 |
|--------|----------|-------|------|
| `CoinEconomyTab` | `pages/camp/CoinEconomyTab.tsx` | `{ groupId }` | 子 Tab 容器 |
| `CoinGrantPanel` | `components/camp/CoinGrantPanel.tsx` | `{ groupId }` | 发放/扣除操作 |
| `CoinGrantModal` | `components/camp/CoinGrantModal.tsx` | `{ open, onClose, onSubmit }` | 发放弹窗 |
| `TransactionList` | `components/camp/TransactionList.tsx` | `{ transactions }` | 交易记录列表 |
| `CoinRuleEditor` | `components/camp/CoinRuleEditor.tsx` | `{ rules, onChange }` | 规则编辑器 |
| `ShopItemEditor` | `components/camp/ShopItemEditor.tsx` | `{ items, onChange }` | 商城商品编辑器 |
| `CoinLeaderboard` | `components/camp/CoinLeaderboard.tsx` | `{ entries, type }` | 排行榜 |

### 6.3 关键组件实现

**CoinGrantModal（发放弹窗）**

```typescript
// components/camp/CoinGrantModal.tsx
import { useState } from 'react';
import { X } from 'lucide-react';
import type { SubmitterType } from '../../types/camp';

interface Props {
  open: boolean;
  mode: 'grant' | 'deduct';
  targets: Array<{ id: number; name: string; type: SubmitterType }>;
  onClose: () => void;
  onSubmit: (data: { targetIds: number[]; targetType: SubmitterType; amount: number; reason: string }) => void;
}

const QUICK_TEMPLATES = [
  { label: '入营奖励', amount: 100 },
  { label: '任务完成', amount: 50 },
  { label: '竞赛获胜', amount: 200 },
  { label: '主动发言', amount: 5 },
  { label: '帮助队友', amount: 10 },
];

export default function CoinGrantModal({ open, mode, targets, onClose, onSubmit }: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [amount, setAmount] = useState(50);
  const [reason, setReason] = useState('');
  const [targetType, setTargetType] = useState<SubmitterType>('user');

  const handleSubmit = () => {
    if (selectedIds.length === 0 || amount <= 0) return;
    onSubmit({ targetIds: selectedIds, targetType, amount, reason });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background-secondary rounded-2xl border border-border-subtle p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{mode === 'grant' ? '发放营币' : '扣除营币'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-background-hover rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 快捷模板 */}
        {mode === 'grant' && (
          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK_TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => { setAmount(t.amount); setReason(t.label); }}
                className="px-2.5 py-1 rounded-lg bg-background border border-border-subtle text-xs hover:bg-background-hover"
              >
                {t.label} +{t.amount}
              </button>
            ))}
          </div>
        )}

        {/* 选择对象 */}
        <div className="mb-4 max-h-48 overflow-auto border border-border-subtle rounded-lg">
          {targets.map((t) => (
            <label key={t.id} className="flex items-center gap-3 px-3 py-2 hover:bg-background-hover cursor-pointer border-b border-border-subtle/50 last:border-0">
              <input
                type="checkbox"
                checked={selectedIds.includes(t.id)}
                onChange={(e) => {
                  setSelectedIds((prev) =>
                    e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id)
                  );
                  setTargetType(t.type);
                }}
              />
              <span className="text-sm">{t.name}</span>
              <span className="text-xs text-foreground-muted ml-auto">{t.type === 'group' ? '公司' : '个人'}</span>
            </label>
          ))}
        </div>

        {/* 金额 + 理由 */}
        <div className="space-y-3">
          <div>
            <label className="text-sm text-foreground-muted block mb-1">金额</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={1}
                className="w-32 px-4 py-2 rounded-xl bg-background border border-border-subtle"
              />
              <span className="text-sm">🪙</span>
            </div>
          </div>
          <div>
            <label className="text-sm text-foreground-muted block mb-1">理由</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="如：任务完成奖励"
              className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border-subtle text-sm">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedIds.length === 0 || amount <= 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
              mode === 'deduct' ? 'bg-danger text-background' : 'bg-primary text-background'
            }`}
          >
            {mode === 'grant' ? '确认发放' : '确认扣除'}（{selectedIds.length} 对象，共 {amount * selectedIds.length} 🪙）
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 6.4 API 契约

```
POST   /api/v1/teaching-groups/{id}/coins/grant
  body: { targets: [{ entity_type, entity_id }], amount, reason }
  → { transactions: CampCoinTransaction[], total_amount }

POST   /api/v1/teaching-groups/{id}/coins/deduct
  body: { targets: [{ entity_type, entity_id }], amount, reason }
  → { transactions: CampCoinTransaction[], total_amount }

GET    /api/v1/teaching-groups/{id}/coins/transactions?entity_type=&entity_id=&page=&page_size=
  → { items: CampCoinTransaction[], total, page, page_size }

GET    /api/v1/teaching-groups/{id}/coin-rules
  → { rules: CampCoinRule[] }

PUT    /api/v1/teaching-groups/{id}/coin-rules/{ruleId}
  body: { name?, trigger_type?, amount?, is_active? }
  → { rule: CampCoinRule }

GET    /api/v1/teaching-groups/{id}/shop-items
  → { items: CampShopItem[] }

POST   /api/v1/teaching-groups/{id}/shop-items
  body: { name, description, price, stock, effect_type, effect_config? }
  → { item: CampShopItem }

PUT    /api/v1/teaching-groups/{id}/shop-items/{itemId}
  body: 部分字段
  → { item: CampShopItem }

DELETE /api/v1/teaching-groups/{id}/shop-items/{itemId}
  → { success: true }

GET    /api/v1/teaching-groups/{id}/coins/leaderboard?type=company|user
  → { entries: CoinLeaderboardEntry[] }
```

---

## 七、🏆 评分评奖 Tab 开发手册

### 7.1 页面入口

**文件**：`pages/camp/ScoringTab.tsx`（新增）

**Props**：`interface Props { groupId: number }`

**内部子 Tab**：

```typescript
const SUB_TABS = [
  { id: 'scoring', label: '评分管理' },
  { id: 'awards', label: '奖项管理' },
  { id: 'liveboard', label: '评分看板' },
] as const;
```

### 7.2 组件清单

| 组件名 | 文件路径 | Props | 职责 |
|--------|----------|-------|------|
| `ScoringTab` | `pages/camp/ScoringTab.tsx` | `{ groupId }` | 子 Tab 容器 |
| `ScoringManager` | `components/camp/ScoringManager.tsx` | `{ groupId }` | 评分管理子 Tab |
| `ScoringTable` | `components/camp/ScoringTable.tsx` | `{ task, submissions, onScore }` | 评分表格 |
| `ScoreInputDrawer` | `components/camp/ScoreInputDrawer.tsx` | `{ submission, dimensions, onSubmit, onNext }` | 评分输入抽屉 |
| `AwardManager` | `components/camp/AwardManager.tsx` | `{ groupId }` | 奖项管理子 Tab |
| `AwardCard` | `components/camp/AwardCard.tsx` | `{ award, winner?, onSelectWinner }` | 奖项卡片 |
| `AwardCeremonyModal` | `components/camp/AwardCeremonyModal.tsx` | `{ awards, onStep, onComplete }` | 颁奖流程弹窗 |
| `LiveScoreBoard` | `components/camp/LiveScoreBoard.tsx` | `{ scores }` | 实时评分看板 |

### 7.3 关键组件实现

**AwardCeremonyModal（颁奖流程弹窗）**

```typescript
// components/camp/AwardCeremonyModal.tsx
import { useState } from 'react';
import { X, Trophy, ChevronRight, ChevronLeft } from 'lucide-react';
import type { CampAward, AwardWinner } from '../../types/camp';

interface Props {
  open: boolean;
  awards: Array<{ award: CampAward; winner?: AwardWinner }>;
  onClose: () => void;
  onComplete: () => void;
}

export default function AwardCeremonyModal({ open, awards, onClose, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const current = awards[step];
  const isLast = step === awards.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
      onClose();
    } else {
      setStep(step + 1);
      setRevealed(false);
    }
  };

  if (!open || !current) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background-secondary rounded-2xl border border-border-subtle p-8 text-center">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-background-hover rounded-lg">
          <X className="w-5 h-5" />
        </button>

        <p className="text-sm text-foreground-muted mb-2">Step {step + 1} / {awards.length}</p>

        <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">{current.award.name}</h3>
        <p className="text-sm text-foreground-muted mb-6">{current.award.description}</p>

        {!revealed ? (
          <div className="py-8">
            <button
              onClick={() => setRevealed(true)}
              className="px-8 py-3 rounded-xl bg-primary text-background font-semibold text-lg animate-pulse"
            >
              🥁 揭晓获奖者
            </button>
          </div>
        ) : (
          <div className="py-4 animate-in fade-in zoom-in duration-500">
            <p className="text-lg text-foreground-muted mb-2">获奖者是...</p>
            <p className="text-3xl font-bold text-amber-400 mb-4">
              {current.winner?.winner_name ?? '待定'}
            </p>
            <div className="text-4xl mb-4">🎉</div>
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 text-sm text-foreground-muted disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
            上一步
          </button>
          <button
            onClick={handleNext}
            disabled={!revealed}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium disabled:opacity-50"
          >
            {isLast ? '完成颁奖' : '下一步奖项'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 7.4 API 契约

```
GET    /api/v1/teaching-groups/{id}/tasks/{taskId}/scores
  → { submissions: [{ submission, reviews, average_score }] }

POST   /api/v1/teaching-groups/{id}/submissions/{subId}/review
  body: { dimensions: [{ dimension_id, score, comment? }] }
  → { reviews: SubmissionReview[], submission: TaskSubmission }

GET    /api/v1/teaching-groups/{id}/awards
  → { awards: CampAward[] }

POST   /api/v1/teaching-groups/{id}/awards
  body: { name, description?, icon, criteria?, sort_order }
  → { award: CampAward }

PUT    /api/v1/teaching-groups/{id}/awards/{awardId}
  body: 部分字段
  → { award: CampAward }

DELETE /api/v1/teaching-groups/{id}/awards/{awardId}
  → { success: true }

POST   /api/v1/teaching-groups/{id}/awards/calculate
  → { winners: AwardWinner[] }

POST   /api/v1/teaching-groups/{id}/awards/{awardId}/announce
  body: { winner_type, winner_id }
  → { winner: AwardWinner }

GET    /api/v1/teaching-groups/{id}/scores/liveboard
  → SSE stream: { scores: [{ entity_name, total_score, rank }] }
```

---

## 八、🎮 营内商赛 Tab

### 8.1 说明

**复用现有 `EventsTab.tsx`，不做修改。**

### 8.2 已有功能

- 发起商赛 → 跳转 `/events/create?groupId={id}`
- 商赛列表 → 点击跳转控场
- 状态标签：草稿/报名中/进行中/已结束

---

## 九、👥 成员管理 Tab 开发手册

### 9.1 页面入口

**文件**：`pages/camp/MemberManagementTab.tsx`（新增）

**Props**：`interface Props { groupId: number }`

**内部子 Tab**：

```typescript
const SUB_TABS = [
  { id: 'members', label: '成员名册' },
  { id: 'progress', label: '学员进度' },
  { id: 'groups', label: '分组管理' },
  { id: 'announcements', label: '公告' },
] as const;
```

### 9.2 说明

四个子 Tab **直接复用现有组件**，不做修改：

```typescript
// pages/camp/MemberManagementTab.tsx
import { lazy, Suspense, useState } from 'react';
import { Loader2 } from 'lucide-react';

const MembersTab = lazy(() => import('./MembersTab'));
const MemberProgressTab = lazy(() => import('./MemberProgressTab'));
const GroupsTab = lazy(() => import('./GroupsTab'));
const AnnouncementsTab = lazy(() => import('./AnnouncementsTab'));

const SUB_TABS = [
  { id: 'members', label: '成员名册', component: MembersTab },
  { id: 'progress', label: '学员进度', component: MemberProgressTab },
  { id: 'groups', label: '分组管理', component: GroupsTab },
  { id: 'announcements', label: '公告', component: AnnouncementsTab },
] as const;

interface Props { groupId: number; }

export default function MemberManagementTab({ groupId }: Props) {
  const [activeSubTab, setActiveSubTab] = useState('members');
  const ActiveComponent = SUB_TABS.find((t) => t.id === activeSubTab)?.component ?? MembersTab;

  return (
    <div>
      <div className="border-b border-border-subtle mb-4">
        <div className="flex gap-1">
          {SUB_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveSubTab(id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
        <ActiveComponent groupId={groupId} />
      </Suspense>
    </div>
  );
}
```

---

## 十、CampDetailPage 修改

### 10.1 Tab 列表替换

```typescript
// pages/CampDetailPage.tsx（修改 TABS 常量）

const TABS = [
  { id: 'overview', label: '概览', icon: LayoutDashboard, component: OverviewTab },
  { id: 'tasks', label: '任务中心', icon: ClipboardList, component: TaskCenterTab },
  { id: 'companies', label: '公司管理', icon: Building2, component: CompanyTab },
  { id: 'coins', label: '营币经济', icon: Coins, component: CoinEconomyTab },
  { id: 'scoring', label: '评分评奖', icon: Trophy, component: ScoringTab },
  { id: 'events', label: '营内商赛', icon: Gamepad2, component: EventsTab },
  { id: 'members', label: '成员管理', icon: Users, component: MemberManagementTab },
] as const;
```

### 10.2 从外部跳转带 Tab 参数

支持 URL query `?tab=tasks` 自动切换：

```typescript
// 在 CampDetailPage 中
import { useSearchParams } from 'react-router-dom';

const [searchParams, setSearchParams] = useSearchParams();
const tabFromUrl = searchParams.get('tab') as TabId | null;

// 初始化时
useEffect(() => {
  if (tabFromUrl && TABS.some((t) => t.id === tabFromUrl)) {
    setActiveTab(tabFromUrl);
  }
}, [tabFromUrl]);
```

---

## 十一、后端实现指南

### 11.1 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/main.py` | 修改 | 注册 7 个新 router |
| `app/models/camp.py` | 新增 | 所有夏令营模型 |
| `app/schemas/camp.py` | 新增 | Pydantic schemas |
| `app/api/camp_agenda.py` | 新增 | 议程 API |
| `app/api/camp_tasks.py` | 新增 | 任务 API |
| `app/api/camp_submissions.py` | 新增 | 提交/作品 API |
| `app/api/camp_companies.py` | 新增 | 公司 API |
| `app/api/camp_coins.py` | 新增 | 营币 API |
| `app/api/camp_scoring.py` | 新增 | 评分 API |
| `app/api/camp_awards.py` | 新增 | 奖项 API |
| `app/db/init_db.py` | 修改 | 新增表初始化 |

### 11.2 模型定义（app/models/camp.py）

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Boolean, Text, Float
from sqlalchemy.sql import func
from app.db.database import Base

class CampAgendaItem(Base):
    __tablename__ = "camp_agenda_items"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False)
    start_time = Column(String(8), nullable=False)   # "09:00"
    end_time = Column(String(8), nullable=False)     # "10:30"
    title = Column(String(128), nullable=False)
    location = Column(String(64), nullable=True)
    description = Column(Text, nullable=True)
    task_id = Column(Integer, ForeignKey("camp_tasks.id"), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CampTask(Base):
    __tablename__ = "camp_tasks"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False)
    title = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(String(32), nullable=False)
    submit_type = Column(String(16), default="group", nullable=False)
    due_at = Column(DateTime(timezone=True), nullable=True)
    config_json = Column(Text, nullable=True)   # JSON string
    status = Column(String(16), default="draft", nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ScoringDimension(Base):
    __tablename__ = "scoring_dimensions"
    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey("camp_tasks.id"), nullable=False, index=True)
    name = Column(String(64), nullable=False)
    weight = Column(Float, default=1.0, nullable=False)
    max_score = Column(Integer, default=5, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

class TaskSubmission(Base):
    __tablename__ = "task_submissions"
    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey("camp_tasks.id"), nullable=False, index=True)
    submitter_type = Column(String(16), nullable=False)   # "user" | "group"
    submitter_id = Column(Integer, nullable=False)
    content = Column(Text, nullable=True)
    attachments = Column(Text, nullable=True)   # JSON array of URLs
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(16), default="pending", nullable=False)
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)

class SubmissionReview(Base):
    __tablename__ = "submission_reviews"
    id = Column(Integer, primary_key=True)
    submission_id = Column(Integer, ForeignKey("task_submissions.id"), nullable=False, index=True)
    dimension_id = Column(Integer, ForeignKey("scoring_dimensions.id"), nullable=False)
    scorer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Float, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CampCompany(Base):
    __tablename__ = "camp_companies"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    camp_group_id = Column(Integer, ForeignKey("camp_groups.id"), nullable=False)
    name = Column(String(64), nullable=False)
    logo_url = Column(String(500), nullable=True)
    slogan = Column(String(128), nullable=True)
    coin_balance = Column(Integer, default=0, nullable=False)
    total_score = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class GroupMemberRole(Base):
    __tablename__ = "group_member_roles"
    id = Column(Integer, primary_key=True)
    membership_id = Column(Integer, ForeignKey("group_memberships.id"), nullable=False, index=True)
    role_type = Column(String(16), nullable=False)   # "ceo" | "product" | ...
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

class CampCoinBalance(Base):
    __tablename__ = "camp_coin_balances"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    entity_type = Column(String(16), nullable=False)
    entity_id = Column(Integer, nullable=False)
    balance = Column(Integer, default=0, nullable=False)
    total_earned = Column(Integer, default=0, nullable=False)
    total_spent = Column(Integer, default=0, nullable=False)
    __table_args__ = (
        # UniqueConstraint("group_id", "entity_type", "entity_id", name="uq_camp_coin_balance"),
    )

class CampCoinTransaction(Base):
    __tablename__ = "camp_coin_transactions"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    entity_type = Column(String(16), nullable=False)
    entity_id = Column(Integer, nullable=False)
    amount = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)
    type = Column(String(16), nullable=False)   # "earn" | "spend" | "transfer"
    source_type = Column(String(32), nullable=False)
    source_id = Column(Integer, nullable=True)
    description = Column(String(256), nullable=True)
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CampCoinRule(Base):
    __tablename__ = "camp_coin_rules"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    name = Column(String(64), nullable=False)
    trigger_type = Column(String(32), nullable=False)
    amount = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

class CampShopItem(Base):
    __tablename__ = "camp_shop_items"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    name = Column(String(64), nullable=False)
    description = Column(String(256), nullable=True)
    price = Column(Integer, nullable=False)
    stock = Column(Integer, default=-1, nullable=False)   # -1 = unlimited
    effect_type = Column(String(32), nullable=False)
    effect_config = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

class CampAward(Base):
    __tablename__ = "camp_awards"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("teaching_groups.id"), nullable=False, index=True)
    name = Column(String(64), nullable=False)
    description = Column(String(256), nullable=True)
    icon = Column(String(32), nullable=False)
    criteria = Column(String(256), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)

class AwardWinner(Base):
    __tablename__ = "award_winners"
    id = Column(Integer, primary_key=True)
    award_id = Column(Integer, ForeignKey("camp_awards.id"), nullable=False, index=True)
    winner_type = Column(String(16), nullable=False)
    winner_id = Column(Integer, nullable=False)
    score_value = Column(Float, nullable=True)
    announced_at = Column(DateTime(timezone=True), nullable=True)
```

### 11.3 数据库迁移

```python
# scripts/migrate_camp_tables.py
# 或在 init_db.py 中添加

from app.models.camp import (
    CampAgendaItem, CampTask, ScoringDimension,
    TaskSubmission, SubmissionReview,
    CampCompany, GroupMemberRole,
    CampCoinBalance, CampCoinTransaction, CampCoinRule, CampShopItem,
    CampAward, AwardWinner,
)

# 在 create_all() 之前导入即可自动建表
```

---

## 十二、实施检查清单

### Phase 1（MVP）

- [ ] 新建 `types/camp.ts` 类型文件
- [ ] 扩展 `stores/campStore.ts`（所有新增 state + action）
- [ ] 修改 `CampDetailPage.tsx`（Tab 列表替换）
- [ ] 扩展 `OverviewTab.tsx`（KpiCards + TodayAgenda + QuickActions）
- [ ] 新建 `TaskCenterTab.tsx` + 子组件（CreateTaskModal + TaskList + GalleryGrid）
- [ ] 新建 `CompanyTab.tsx` + RoleAssignmentModal
- [ ] 新建 `CoinEconomyTab.tsx` + CoinGrantModal
- [ ] 新建 `ScoringTab.tsx` + ReviewForm + AwardCeremonyModal
- [ ] 新建 `MemberManagementTab.tsx`（4 个子 Tab 复用）
- [ ] 后端：新建 8 个 API 文件 + 模型文件
- [ ] 后端：修改 `main.py` 注册路由
- [ ] 后端：修改 `init_db.py` 建表

### Phase 2（体验增强）

- [ ] AgendaTimeline 拖拽排序（Dnd-kit）
- [ ] 评分弹窗「上一家/下一家」导航
- [ ] 评分实时看板（SSE）
- [ ] 颁奖流程动画
- [ ] 作品画廊瀑布流布局

### Phase 3（结营闭环）

- [ ] 一键自动计算获奖名单
- [ ] 成长档案 PDF 生成
- [ ] 分享图生成
