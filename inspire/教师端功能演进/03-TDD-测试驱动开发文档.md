# 商域教师端 · TDD 测试驱动开发文档

> **文档定位**：基于 `02-BDD-行为驱动开发验收文档.md`，将每个 BDD 场景转化为**可执行的测试文件路径与测试用例代码骨架**。供开发、CI/CD、QA 直接使用。  
> **读者**：全栈工程师、测试工程师、DevOps  
> **对齐文档**：`02-BDD-行为驱动开发验收文档.md` · `01-P0-P1-营团运营与赛季编排-PRD.md`  
> **测试栈**：Vitest（前端/后端单元+集成）· Playwright（E2E）· React Testing Library（组件）· MSW（API Mock）· Factory.ts（测试数据工厂）

---

## 目录

- [一、测试策略](#一测试策略)
- [二、项目测试目录结构](#二项目测试目录结构)
- [三、测试数据工厂](#三测试数据工厂)
- [Feature 1: 学员进度看板](#feature-1-学员进度看板)
- [Feature 2: 赛后复盘汇总](#feature-2-赛后复盘汇总)
- [Feature 3: 营团公告](#feature-3-营团公告)
- [Feature 4: Tab 重构](#feature-4-tab-重构)
- [Feature 5: 赛季编排](#feature-5-赛季编排)
- [Feature 6: 分组管理](#feature-6-分组管理)
- [Feature 7: 作业系统](#feature-7-作业系统)
- [Feature 8: 学生端进度](#feature-8-学生端进度)
- [附录：CI 测试脚本](#附录ci-测试脚本)

---

## 一、测试策略

### 测试分层

| 层级 | 工具 | 范围 | 运行频率 | 目标 |
|------|------|------|----------|------|
| **单元测试** | Vitest | 纯函数、工具、hooks、store 纯逻辑 | 每次保存 | 快速反馈，覆盖所有分支 |
| **集成测试** | Vitest + MSW + Testing Library | 组件渲染 + 交互 + API Mock | 每次提交 | 验证组件契约与数据流 |
| **E2E 测试** | Playwright | 真实浏览器 + 真实后端（或 docker 编排） | 每次 PR / 每日 | 验证完整用户旅程 |
| **API 测试** | Vitest + 超级请求 | 后端路由 + 数据库事务 | 每次提交 | 验证接口契约与权限 |

### 测试原则

1. **红→绿→重构**：每个测试先写期望（红），再实现代码（绿），最后优化（重构）。
2. **测试即文档**：测试用例命名应直接对应 BDD 场景名，方便追溯。
3. **不要测试实现细节**：测试用户可见的行为（DOM 文本、路由跳转、网络请求），不要测试内部状态。
4. **一个场景一个测试文件**：`Feature` 对应目录，`Scenario` 对应 `describe` 块，`Then` 对应 `it` 断言。
5. **P0 优先覆盖**：P0 场景必须 100% 单元+集成覆盖；P1 场景至少 80% 覆盖，核心流程必须有 E2E。

---

## 二、项目测试目录结构

```
webapp/
├── organizer-frontend/
│   ├── src/
│   │   ├── pages/                           # 页面组件
│   │   ├── components/                      # 通用组件
│   │   ├── stores/                          # Zustand / Pinia store
│   │   └── utils/                           # 工具函数
│   ├── tests/
│   │   ├── unit/                            # 纯函数、utils、hooks
│   │   │   ├── utils/
│   │   │   ├── stores/
│   │   │   └── hooks/
│   │   ├── integration/                     # 组件 + API Mock
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── stores/
│   │   └── e2e/                             # Playwright
│   │       └── features/
│   ├── playwright.config.ts
│   └── vitest.config.ts
│
├── backend/                                 # 后端项目（假设路径）
│   ├── tests/
│   │   ├── unit/                            # 服务层、工具函数
│   │   ├── integration/                     # API 路由 + 数据库
│   │   └── e2e/                             # 端到端流程
│   └── vitest.config.ts
│
└── shared/                                  # 共享类型与工具
    └── tests/
```

---

## 三、测试数据工厂

> 使用 `factory.ts` 或自建工厂，确保测试数据可复用、类型安全。

### 工厂定义文件

```typescript
// tests/factories/camp.factory.ts
import { Factory } from 'factory.ts';
import { faker } from '@faker-js/faker/locale/zh_CN';

// 营团工厂
export const teachingGroupFactory = Factory.define(<TeachingGroup>()
  .sequence('id', (n) => n)
  .attr('name', () => faker.company.name() + '商赛社')
  .attr('invite_code', () => faker.string.alphanumeric(6).toUpperCase())
  .attr('status', 'active')
  .attr('created_at', () => new Date().toISOString())
);

// 学员工厂
export const studentFactory = Factory.define(<CampMember>()
  .sequence('id', (n) => n)
  .attr('nickname', () => faker.person.fullName())
  .attr('role', 'student')
  .attr('joined_at', () => faker.date.past().toISOString())
);

// 比赛参与工厂
export const competitionParticipantFactory = Factory.define(<CompetitionParticipant>()
  .sequence('id', (n) => n)
  .attr('competition_id', 1)
  .attr('user_id', 1)
  .attr('rank', () => faker.number.int({ min: 1, max: 20 }))
  .attr('xp_earned', () => faker.number.int({ min: 100, max: 500 }))
);

// 赛季工厂
export const seasonFactory = Factory.define(<Season>()
  .sequence('id', (n) => n)
  .attr('name', () => '4周商赛入门')
  .attr('theme', '长三角贸易')
  .attr('status', 'draft')
  .attr('start_date', '2026-03-01')
  .attr('end_date', '2026-03-28')
  .attr('group_id', 1)
);

// 里程碑工厂
export const milestoneFactory = Factory.define(<Milestone>()
  .sequence('id', (n) => n)
  .attr('season_id', 1)
  .attr('name', () => '练习赛 #1')
  .attr('type', 'practice_match')
  .attr('status', 'locked')
  .attr('sequence_order', 1)
);
```

### 复用模式

```typescript
// 快速创建营团 + 学员 + 比赛数据
export function createCampWithStudents(count = 24) {
  const group = teachingGroupFactory.build();
  const students = studentFactory.buildList(count).map((s, i) => ({
    ...s,
    group_id: group.id,
  }));
  return { group, students };
}

// 创建完整赛季数据
export function createSeasonWithMilestones() {
  const season = seasonFactory.build();
  const milestones = [
    milestoneFactory.build({ name: '第1周：理论课', type: 'lecture', sequence_order: 1 }),
    milestoneFactory.build({ name: '练习赛 #1', type: 'practice_match', sequence_order: 2 }),
    milestoneFactory.build({ name: '班级正式赛', type: 'formal_match', sequence_order: 3 }),
    milestoneFactory.build({ name: '复盘与作业', type: 'debrief', sequence_order: 4 }),
  ];
  return { season, milestones };
}
```

---

## Feature 1: 学员进度看板

### BDD 场景映射表

| BDD 场景 | 测试文件 | 测试类型 | 优先级 |
|----------|----------|----------|--------|
| 查看进度总览 | `integration/pages/camp/MemberProgressPage.test.tsx` | 集成 | P0 |
| 状态标签规则 | `unit/utils/studentStatus.test.ts` | 单元 | P0 |
| 筛选与排序 | `integration/pages/camp/MemberProgressPage.test.tsx` | 集成 | P0 |
| 搜索学员 | `integration/pages/camp/MemberProgressPage.test.tsx` | 集成 | P0 |
| 学员详情抽屉 | `integration/components/MemberDetailDrawer.test.tsx` | 集成 | P0 |
| 导出 CSV | `e2e/features/camp-export-csv.spec.ts` | E2E | P0 |

### 单元测试：状态标签计算

```typescript
// tests/unit/utils/studentStatus.test.ts
import { describe, it, expect } from 'vitest';
import { calculateStudentStatus } from '@/utils/studentStatus';

describe('学员状态标签计算', () => {
  const scenarios = [
    { name: '积极生', daysJoined: 10, matches: 3, lastActive: 2, expected: '🟢 积极' },
    { name: '普通生', daysJoined: 10, matches: 1, lastActive: 5, expected: '🟡 正常' },
    { name: '掉队生', daysJoined: 10, matches: 0, lastActive: 10, expected: '🔴 需关注' },
    { name: '新生', daysJoined: 3, matches: 0, lastActive: 3, expected: '⚪ 从未参赛' },
  ];

  it.each(scenarios)('$name → $expected', ({ daysJoined, matches, lastActive, expected }) => {
    const result = calculateStudentStatus({ daysJoined, matches, lastActive });
    expect(result.label).toBe(expected);
  });

  it('参赛3场且最近活跃2天内 → 积极', () => {
    const result = calculateStudentStatus({ daysJoined: 10, matches: 3, lastActive: 2 });
    expect(result.label).toBe('🟢 积极');
    expect(result.color).toBe('green');
  });

  it('参赛0场且加入超过7天 → 需关注', () => {
    const result = calculateStudentStatus({ daysJoined: 10, matches: 0, lastActive: 10 });
    expect(result.label).toBe('🔴 需关注');
    expect(result.color).toBe('red');
  });

  it('参赛0场且加入3天内 → 从未参赛', () => {
    const result = calculateStudentStatus({ daysJoined: 3, matches: 0, lastActive: 3 });
    expect(result.label).toBe('⚪ 从未参赛');
    expect(result.color).toBe('gray');
  });
});
```

### 集成测试：学员进度页

```typescript
// tests/integration/pages/camp/MemberProgressPage.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/mocks/server';
import MemberProgressPage from '@/pages/camp/MemberProgressPage';
import { createCampWithStudents } from '@/tests/factories/camp.factory';

describe('Feature: 学员进度看板', () => {
  const { group, students } = createCampWithStudents(3);
  
  beforeEach(() => {
    // Mock API 返回数据
    server.use(
      http.get(`/api/v1/teaching-groups/${group.id}/members`, () => {
        return HttpResponse.json({
          data: [
            { ...students[0], matches: 3, xp: 1250, last_active: '2026-05-28', status: '积极' },
            { ...students[1], matches: 1, xp: 400, last_active: '2026-05-25', status: '正常' },
            { ...students[2], matches: 0, xp: 0, last_active: null, status: '需关注' },
          ],
        });
      })
    );
  });

  it('场景 1：查看进度总览 → 显示学员列表与状态标签', async () => {
    render(<MemberProgressPage groupId={group.id} />);
    
    // Then: 页面显示学员列表
    await waitFor(() => {
      expect(screen.getByText('昵称')).toBeInTheDocument();
      expect(screen.getByText('参赛场次')).toBeInTheDocument();
      expect(screen.getByText('累计 XP')).toBeInTheDocument();
      expect(screen.getByText('状态标签')).toBeInTheDocument();
    });

    // Then: 小明状态为积极
    expect(screen.getByText('🟢 积极')).toBeInTheDocument();
    // Then: 小红状态为正常
    expect(screen.getByText('🟡 正常')).toBeInTheDocument();
    // Then: 小刚状态为需关注
    expect(screen.getByText('🔴 需关注')).toBeInTheDocument();
  });

  it('场景 3：筛选 → 按状态筛选需关注的学员', async () => {
    render(<MemberProgressPage groupId={group.id} />);
    
    await waitFor(() => screen.getByText('筛选'));
    
    // When: 点击筛选，选择"需关注"
    fireEvent.click(screen.getByText('筛选'));
    fireEvent.click(screen.getByText('需关注'));
    
    // Then: 仅显示小刚
    await waitFor(() => {
      expect(screen.getByText(students[2].nickname)).toBeInTheDocument();
      expect(screen.queryByText(students[0].nickname)).not.toBeInTheDocument();
    });
  });

  it('场景 3：排序 → 按参赛场次降序排列', async () => {
    render(<MemberProgressPage groupId={group.id} />);
    
    await waitFor(() => screen.getByText('参赛场次'));
    
    // When: 点击表头排序
    fireEvent.click(screen.getByText('参赛场次'));
    
    // Then: 按参赛场次从高到低排列
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent(students[0].nickname); // 小明 3场
    expect(rows[2]).toHaveTextContent(students[1].nickname); // 小红 1场
    expect(rows[3]).toHaveTextContent(students[2].nickname); // 小刚 0场
  });

  it('场景 4：搜索 → 输入"明"仅显示小明', async () => {
    render(<MemberProgressPage groupId={group.id} />);
    
    await waitFor(() => screen.getByPlaceholderText('搜索学员'));
    
    // When: 搜索框输入"明"
    fireEvent.change(screen.getByPlaceholderText('搜索学员'), {
      target: { value: '明' },
    });
    
    // Then: 仅显示小明
    await waitFor(() => {
      expect(screen.getByText(students[0].nickname)).toBeInTheDocument();
      expect(screen.queryByText(students[1].nickname)).not.toBeInTheDocument();
    });
  });

  it('场景 5：详情抽屉 → 点击学员行显示参赛时间线', async () => {
    render(<MemberProgressPage groupId={group.id} />);
    
    await waitFor(() => screen.getByText(students[0].nickname));
    
    // When: 点击小明行
    fireEvent.click(screen.getByText(students[0].nickname));
    
    // Then: 右侧弹出抽屉
    await waitFor(() => {
      expect(screen.getByText('参赛时间线')).toBeInTheDocument();
    });
    
    // Then: 显示时间线数据
    expect(screen.getByText('回合制 #1')).toBeInTheDocument();
    expect(screen.getByText('TechV #2')).toBeInTheDocument();
    expect(screen.getByText('浮生记 #3')).toBeInTheDocument();
    
    // Then: 显示 XP 变化简图
    expect(screen.getByText('XP 变化')).toBeInTheDocument();
  });
});
```

### E2E 测试：导出 CSV

```typescript
// tests/e2e/features/camp-export-csv.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Feature: 学员进度看板', () => {
  test('场景 6：导出 CSV → 下载文件包含正确内容', async ({ page }) => {
    // Given: 教师已登录，在学员进度 Tab
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'teacher@example.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL('/camps');
    
    await page.goto('/camps/1');
    await page.click('text=学员进度');
    
    // When: 点击导出 CSV
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=导出 CSV'),
    ]);
    
    // Then: 文件名正确
    expect(download.suggestedFilename()).toMatch(/学员进度.*\.csv/);
    
    // Then: 文件内容包含学员信息
    const content = await download.createReadStream().then((s) => s.read());
    const csv = content.toString();
    expect(csv).toContain('昵称,加入时间,参赛场次,累计 XP,状态标签');
    expect(csv).toContain('小明');
    expect(csv).toContain('🟢 积极');
  });
});
```

---

## Feature 2: 赛后复盘汇总

### BDD 场景映射表

| BDD 场景 | 测试文件 | 测试类型 | 优先级 |
|----------|----------|----------|--------|
| 复盘入口显示 | `integration/pages/camp/EventDebriefPage.test.tsx` | 集成 | P0 |
| 通用复盘内容 | `integration/pages/camp/EventDebriefPage.test.tsx` | 集成 | P0 |
| 赛制特有复盘（TechV） | `integration/pages/camp/TechVentureDebrief.test.tsx` | 集成 | P0 |
| 发布复盘 | `integration/pages/camp/EventDebriefPage.test.tsx` | 集成 | P0 |
| 发布后状态锁定 | `integration/pages/camp/EventDebriefPage.test.tsx` | 集成 | P0 |
| 下载复盘摘要 | `e2e/features/debrief-download.spec.ts` | E2E | P0 |

### 集成测试：赛后复盘页

```typescript
// tests/integration/pages/camp/EventDebriefPage.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/mocks/server';
import EventDebriefPage from '@/pages/camp/EventDebriefPage';

describe('Feature: 赛后复盘汇总', () => {
  const mockEvent = {
    id: 1,
    name: 'T2-001',
    format: 'techventure',
    status: 'finished',
    ended_at: '2026-05-28T10:00:00Z',
    participants_count: 20,
  };

  const mockDebrief = {
    event_id: 1,
    top5: [
      { rank: 1, team_name: 'Alpha', xp: 800 },
      { rank: 2, team_name: 'Beta', xp: 750 },
      { rank: 3, team_name: 'Gamma', xp: 700 },
    ],
    xp_distribution: { total: 12000, mean: 600, max: 800, min: 300 },
    route_distribution: {
      route_a: { count: 8, percentage: 40 },
      route_b: { count: 7, percentage: 35 },
      route_c: { count: 5, percentage: 25 },
    },
    bqi_stats: { mean: 72, max: 95, min: 45 },
    published: false,
    teacher_notes: '',
    ai_insights: [],
  };

  beforeEach(() => {
    server.use(
      http.get('/api/v1/competition-events/1', () => {
        return HttpResponse.json({ data: mockEvent });
      }),
      http.get('/api/v1/competition-events/1/debrief', () => {
        return HttpResponse.json({ data: mockDebrief });
      })
    );
  });

  it('场景 1：已结束比赛显示复盘入口', async () => {
    render(<EventDebriefPage eventId={1} />);
    
    await waitFor(() => {
      // Then: 显示复盘按钮
      expect(screen.getByText('复盘')).toBeInTheDocument();
      // Then: 不显示控场按钮
      expect(screen.queryByText('控场')).not.toBeInTheDocument();
    });
  });

  it('场景 2：通用复盘内容 → 比赛概览 + 排名 + XP', async () => {
    render(<EventDebriefPage eventId={1} />);
    
    await waitFor(() => {
      // Then: 显示比赛概览
      expect(screen.getByText('TechVenture')).toBeInTheDocument();
      expect(screen.getByText('2026-05-28 10:00')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument(); // 参与人数
      
      // Then: 显示班级排名 Top 5
      expect(screen.getByText('班级排名')).toBeInTheDocument();
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      
      // Then: 显示 XP 发放明细
      expect(screen.getByText('XP 发放明细')).toBeInTheDocument();
      expect(screen.getByText('12000')).toBeInTheDocument(); // 总 XP
    });
  });

  it('场景 3：TechVenture 特有 → 路线分布 + BQI', async () => {
    render(<EventDebriefPage eventId={1} />);
    
    await waitFor(() => {
      // Then: 路线选择分布
      expect(screen.getByText('路线选择分布')).toBeInTheDocument();
      expect(screen.getByText('路线 A')).toBeInTheDocument();
      expect(screen.getByText('8 支队伍 (40%)')).toBeInTheDocument();
      expect(screen.getByText('路线 B')).toBeInTheDocument();
      expect(screen.getByText('7 支队伍 (35%)')).toBeInTheDocument();
      expect(screen.getByText('路线 C')).toBeInTheDocument();
      expect(screen.getByText('5 支队伍 (25%)')).toBeInTheDocument();
      
      // Then: BQI 统计
      expect(screen.getByText('BQI 统计')).toBeInTheDocument();
      expect(screen.getByText('均值 72')).toBeInTheDocument();
      expect(screen.getByText('最高 95')).toBeInTheDocument();
      expect(screen.getByText('最低 45')).toBeInTheDocument();
    });
  });

  it('场景 4：发布复盘 → 成功后学生端收到通知', async () => {
    server.use(
      http.post('/api/v1/competition-events/1/debrief/publish', () => {
        return HttpResponse.json({ success: true });
      })
    );
    
    render(<EventDebriefPage eventId={1} />);
    
    await waitFor(() => screen.getByText('当前复盘尚未发布'));
    
    // When: 编辑教师笔记
    fireEvent.change(screen.getByPlaceholderText('教师笔记'), {
      target: { value: '这节课大家路线选择比较保守...' },
    });
    
    // When: 勾选 AI 洞察
    fireEvent.click(screen.getByText('80% 的队伍选择了路线 A'));
    
    // When: 点击发布
    fireEvent.click(screen.getByText('发布复盘'));
    
    // Then: 提示成功
    await waitFor(() => {
      expect(screen.getByText('复盘已发布')).toBeInTheDocument();
    });
  });

  it('场景 5：已发布复盘 → 按钮禁用', async () => {
    server.use(
      http.get('/api/v1/competition-events/1/debrief', () => {
        return HttpResponse.json({
          data: { ...mockDebrief, published: true, published_at: '2026-05-28T14:30:00Z' },
        });
      })
    );
    
    render(<EventDebriefPage eventId={1} />);
    
    await waitFor(() => {
      // Then: 显示发布状态
      expect(screen.getByText('复盘已于 2026-05-28 14:30 发布')).toBeInTheDocument();
      // Then: 按钮禁用
      expect(screen.getByText('发布复盘')).toBeDisabled();
    });
  });
});
```

---

## Feature 3: 营团公告

### BDD 场景映射表

| BDD 场景 | 测试文件 | 测试类型 | 优先级 |
|----------|----------|----------|--------|
| 发布公告 | `integration/pages/camp/CampAnnouncementsPage.test.tsx` | 集成 | P0 |
| 内容限制（纯文本） | `unit/utils/announcement.test.ts` | 单元 | P0 |
| 置顶公告 | `integration/stores/announcementStore.test.ts` | 集成 | P0 |
| 数量上限与折叠 | `integration/components/AnnouncementList.test.tsx` | 集成 | P0 |
| 删除公告 | `integration/stores/announcementStore.test.ts` | 集成 | P0 |
| 学生端展示 | `integration/pages/student/CampPage.test.tsx` | 集成 | P0 |

### 单元测试：公告内容过滤

```typescript
// tests/unit/utils/announcement.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizeAnnouncement, autoLinkUrls } from '@/utils/announcement';

describe('Feature: 营团公告 - 内容处理', () => {
  it('场景 2：富文本粘贴 → 去除格式保留纯文本', () => {
    const input = '<b>加粗</b> <i>斜体</i> 普通文本';
    const result = sanitizeAnnouncement(input);
    expect(result).toBe('加粗 斜体 普通文本');
  });

  it('场景 2：URL 自动识别 → 转为可点击链接', () => {
    const input = '请查看 https://example.com/guide';
    const result = autoLinkUrls(input);
    expect(result).toContain('<a href="https://example.com/guide"');
    expect(result).toContain('https://example.com/guide');
  });

  it('场景 2：多个 URL → 全部识别', () => {
    const input = '链接1: https://a.com 链接2: http://b.com';
    const result = autoLinkUrls(input);
    expect(result.match(/<a/g)?.length).toBe(2);
  });

  it('非法 HTML → 完全去除', () => {
    const input = '<script>alert(1)</script>正常文本';
    const result = sanitizeAnnouncement(input);
    expect(result).not.toContain('script');
    expect(result).toContain('正常文本');
  });
});
```

### 集成测试：公告 Store

```typescript
// tests/integration/stores/announcementStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAnnouncementStore } from '@/stores/announcementStore';
import { act } from '@testing-library/react';

describe('Feature: 营团公告', () => {
  beforeEach(() => {
    useAnnouncementStore.setState({ announcements: [] });
  });

  it('场景 1：发布公告 → 列表顶部插入', () => {
    const store = useAnnouncementStore.getState();
    
    act(() => {
      store.addAnnouncement({
        title: '本周六下午 2 点有班级正式赛',
        content: '请大家准时参加。',
      });
    });
    
    const announcements = useAnnouncementStore.getState().announcements;
    expect(announcements[0].title).toBe('本周六下午 2 点有班级正式赛');
    expect(announcements[0].content).toBe('请大家准时参加。');
    expect(announcements[0].created_at).toBeDefined();
  });

  it('场景 3：置顶公告 → 始终位于最顶部', () => {
    const store = useAnnouncementStore.getState();
    
    act(() => {
      store.addAnnouncement({ title: '普通公告', content: '内容1' });
      store.addAnnouncement({ title: '紧急通知', content: '内容2' });
      store.pinAnnouncement(1); // 置顶第二条
    });
    
    const announcements = useAnnouncementStore.getState().announcements;
    expect(announcements[0].title).toBe('紧急通知');
    expect(announcements[0].is_pinned).toBe(true);
  });

  it('场景 4：超过 3 条 → 折叠显示', () => {
    const store = useAnnouncementStore.getState();
    
    act(() => {
      for (let i = 0; i < 5; i++) {
        store.addAnnouncement({ title: `公告${i}`, content: `内容${i}` });
      }
    });
    
    const visible = useAnnouncementStore.getState().getVisibleAnnouncements();
    expect(visible).toHaveLength(3); // 仅显示最新 3 条
    expect(visible[0].title).toBe('公告4'); // 最新的在最前
  });

  it('场景 5：删除公告 → 从列表消失', () => {
    const store = useAnnouncementStore.getState();
    
    act(() => {
      store.addAnnouncement({ id: 1, title: '临时通知', content: '内容' });
      store.deleteAnnouncement(1);
    });
    
    const announcements = useAnnouncementStore.getState().announcements;
    expect(announcements).toHaveLength(0);
  });
});
```

---

## Feature 4: Tab 重构

### BDD 场景映射表

| BDD 场景 | 测试文件 | 测试类型 | 优先级 |
|----------|----------|----------|--------|
| Tab 结构展示 | `integration/components/CampDetailTabs.test.tsx` | 集成 | P0 |
| 概览 Tab KPI | `integration/pages/camp/OverviewTab.test.tsx` | 集成 | P0 |
| Tab 切换保留状态 | `integration/components/CampDetailTabs.test.tsx` | 集成 | P0 |
| 移动端适配 | `integration/components/CampDetailTabs.test.tsx` | 集成 | P0 |

### 集成测试：Tab 组件

```typescript
// tests/integration/components/CampDetailTabs.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CampDetailTabs from '@/components/CampDetailTabs';

describe('Feature: 营团详情页 Tab 重构', () => {
  const mockTabs = [
    { id: 'overview', label: '概览', component: () => <div>概览内容</div> },
    { id: 'seasons', label: '赛季', component: () => <div>赛季内容</div> },
    { id: 'events', label: '营内商赛', component: () => <div>商赛内容</div> },
    { id: 'progress', label: '学员进度', component: () => <div>进度内容</div> },
    { id: 'members', label: '成员名册', component: () => <div>名册内容</div> },
    { id: 'groups', label: '分组管理', component: () => <div>分组内容</div> },
    { id: 'announcements', label: '公告', component: () => <div>公告内容</div> },
  ];

  it('场景 1：显示所有 Tab', () => {
    render(<CampDetailTabs tabs={mockTabs} defaultTab="overview" />);
    
    // Then: 所有 Tab 标签可见
    mockTabs.forEach((tab) => {
      expect(screen.getByText(tab.label)).toBeInTheDocument();
    });
  });

  it('场景 2：默认显示概览 Tab 内容', () => {
    render(<CampDetailTabs tabs={mockTabs} defaultTab="overview" />);
    
    // Then: 概览内容可见
    expect(screen.getByText('概览内容')).toBeInTheDocument();
    // Then: 其他 Tab 内容不可见
    expect(screen.queryByText('赛季内容')).not.toBeInTheDocument();
  });

  it('场景 3：切换 Tab 不丢失状态', () => {
    const ProgressComponent = () => {
      const [count, setCount] = useState(0);
      return (
        <div>
          <span>计数: {count}</span>
          <button onClick={() => setCount(c + 1)}>增加</button>
        </div>
      );
    };
    
    const tabsWithState = [
      ...mockTabs.slice(0, 3),
      { id: 'progress', label: '学员进度', component: ProgressComponent },
      ...mockTabs.slice(4),
    ];
    
    render(<CampDetailTabs tabs={tabsWithState} defaultTab="progress" />);
    
    // Given: 在学员进度 Tab 增加计数
    fireEvent.click(screen.getByText('增加'));
    expect(screen.getByText('计数: 1')).toBeInTheDocument();
    
    // When: 切换到其他 Tab
    fireEvent.click(screen.getByText('概览'));
    expect(screen.getByText('概览内容')).toBeInTheDocument();
    
    // When: 切回学员进度
    fireEvent.click(screen.getByText('学员进度'));
    
    // Then: 状态保留
    expect(screen.getByText('计数: 1')).toBeInTheDocument();
  });

  it('场景 4：移动端 → 显示为下拉选择器', () => {
    // Mock 移动端视口
    window.innerWidth = 375;
    window.dispatchEvent(new Event('resize'));
    
    render(<CampDetailTabs tabs={mockTabs} defaultTab="overview" />);
    
    // Then: 显示为下拉选择器或水平滚动
    const tabContainer = screen.getByRole('tablist') || screen.getByRole('combobox');
    expect(tabContainer).toBeInTheDocument();
  });
});
```

---

## Feature 5: 赛季编排

### BDD 场景映射表

| BDD 场景 | 测试文件 | 测试类型 | 优先级 |
|----------|----------|----------|--------|
| 创建空白赛季 | `integration/stores/seasonStore.test.ts` | 集成 | P1 |
| 从模板创建 | `unit/utils/seasonTemplates.test.ts` | 单元 | P1 |
| 编辑里程碑 | `integration/components/MilestoneTimeline.test.tsx` | 集成 | P1 |
| 发布赛季 | `integration/stores/seasonStore.test.ts` | 集成 | P1 |
| 解锁里程碑 | `integration/api/milestones.test.ts` | API | P1 |
| 生命周期流转 | `unit/utils/seasonStatus.test.ts` | 单元 | P1 |
| 赛季中修改限制 | `integration/api/seasons.test.ts` | API | P1 |
| 赛季结束与结算 | `e2e/features/season-complete.spec.ts` | E2E | P1 |

### 单元测试：赛季模板

```typescript
// tests/unit/utils/seasonTemplates.test.ts
import { describe, it, expect } from 'vitest';
import { generateSeasonFromTemplate, SEASON_TEMPLATES } from '@/utils/seasonTemplates';

describe('Feature: 赛季编排 - 模板', () => {
  it('场景 2：4 周入门模板 → 生成 6 个里程碑', () => {
    const milestones = generateSeasonFromTemplate('4-week-intro');
    
    expect(milestones).toHaveLength(6);
    expect(milestones[0]).toMatchObject({
      name: '第1周：理论课',
      type: 'lecture',
      sequence_order: 1,
    });
    expect(milestones[1]).toMatchObject({
      name: '练习赛 #1',
      type: 'practice_match',
      sequence_order: 2,
    });
    expect(milestones[4]).toMatchObject({
      name: '复盘与作业',
      type: 'debrief',
      sequence_order: 5,
    });
  });

  it('场景 2：单周体验模板 → 生成 3 个里程碑', () => {
    const milestones = generateSeasonFromTemplate('single-week');
    expect(milestones).toHaveLength(3);
  });

  it('场景 2：暑期集训模板 → 生成 7 个里程碑', () => {
    const milestones = generateSeasonFromTemplate('summer-bootcamp');
    expect(milestones).toHaveLength(7);
  });

  it('模板数据完整性 → 每个里程碑有 name/type/sequence', () => {
    Object.values(SEASON_TEMPLATES).forEach((template) => {
      template.milestones.forEach((m, i) => {
        expect(m.name).toBeDefined();
        expect(m.type).toMatch(/lecture|practice_match|formal_match|debrief|assignment|discussion/);
        expect(m.sequence_order).toBe(i + 1);
      });
    });
  });
});
```

### 单元测试：赛季状态机

```typescript
// tests/unit/utils/seasonStatus.test.ts
import { describe, it, expect } from 'vitest';
import { getNextSeasonStatus, canDeleteMilestone } from '@/utils/seasonStatus';

describe('Feature: 赛季编排 - 状态机', () => {
  it.each([
    { current: 'draft', action: '发布', expected: 'recruiting' },
    { current: 'recruiting', action: '开始教学', expected: 'ongoing' },
    { current: 'ongoing', action: '结束赛季', expected: 'final' },
    { current: 'final', action: '发布结算', expected: 'closed' },
  ])('场景 7：$current + $action → $expected', ({ current, action, expected }) => {
    const result = getNextSeasonStatus(current, action);
    expect(result).toBe(expected);
  });

  it('场景 8：已解锁里程碑不可删除', () => {
    expect(canDeleteMilestone({ status: 'unlocked' })).toBe(false);
    expect(canDeleteMilestone({ status: 'locked' })).toBe(true);
    expect(canDeleteMilestone({ status: 'completed' })).toBe(false);
  });

  it('无效状态流转 → 抛出错误', () => {
    expect(() => getNextSeasonStatus('draft', '结束赛季')).toThrow('无效状态流转');
  });
});
```

### API 测试：赛季路由

```typescript
// tests/integration/api/seasons.test.ts
import { describe, it, expect } from 'vitest';
import { request } from '@/tests/utils/supertest';
import { createCampWithStudents } from '@/tests/factories/camp.factory';

describe('Feature: 赛季编排 - API', () => {
  const { group } = createCampWithStudents();

  it('场景 1：POST /api/seasons → 创建空白赛季', async () => {
    const response = await request
      .post('/api/seasons')
      .send({
        name: '4周商赛入门',
        theme: '长三角贸易',
        start_date: '2026-03-01',
        end_date: '2026-03-28',
        group_id: group.id,
      })
      .set('Authorization', 'Bearer teacher-token');

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: '4周商赛入门',
      status: 'draft',
      group_id: group.id,
    });
  });

  it('场景 4：PATCH /api/seasons/:id/publish → 发布赛季', async () => {
    const season = await createSeason({ group_id: group.id, status: 'draft' });
    
    const response = await request
      .patch(`/api/seasons/${season.id}/publish`)
      .set('Authorization', 'Bearer teacher-token');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('recruiting');
  });

  it('场景 8：已发布赛季删除里程碑 → 403', async () => {
    const season = await createSeason({ group_id: group.id, status: 'ongoing' });
    const milestone = await createMilestone({ season_id: season.id, status: 'unlocked' });
    
    const response = await request
      .delete(`/api/milestones/${milestone.id}`)
      .set('Authorization', 'Bearer teacher-token');

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('已解锁里程碑不可删除');
  });
});
```

---

## Feature 6: 分组管理

### BDD 场景映射表

| BDD 场景 | 测试文件 | 测试类型 | 优先级 |
|----------|----------|----------|--------|
| 自动分组（随机） | `unit/utils/grouping.test.ts` | 单元 | P1 |
| 手动调整分组 | `integration/components/GroupManager.test.tsx` | 集成 | P1 |
| 设置组长 | `integration/stores/groupStore.test.ts` | 集成 | P1 |
| 分组与 TechV 队伍关联 | `integration/api/groups.test.ts` | API | P1 |
| 清空分组 | `integration/stores/groupStore.test.ts` | 集成 | P1 |
| 自定义组名颜色 | `integration/components/GroupManager.test.tsx` | 集成 | P1 |

### 单元测试：分组算法

```typescript
// tests/unit/utils/grouping.test.ts
import { describe, it, expect } from 'vitest';
import { autoGroup, autoGroupByJoinOrder } from '@/utils/grouping';

describe('Feature: 分组管理 - 算法', () => {
  const students = Array.from({ length: 24 }, (_, i) => ({
    id: i + 1,
    nickname: `学员${i + 1}`,
    joined_at: new Date(Date.now() - i * 86400000).toISOString(), // 递减加入时间
  }));

  it('场景 1：随机分组 → 24人分4人组 = 6组', () => {
    const groups = autoGroup(students, { groupSize: 4, method: 'random' });
    
    expect(groups).toHaveLength(6);
    groups.forEach((group) => {
      expect(group.members).toHaveLength(4);
    });
    
    // 所有学员都被分配
    const allAssigned = groups.flatMap((g) => g.members);
    expect(allAssigned).toHaveLength(24);
    expect(new Set(allAssigned.map((m) => m.id)).size).toBe(24); // 无重复
  });

  it('场景 2：按加入顺序分组 → 先加入的在前', () => {
    const groups = autoGroupByJoinOrder(students, { groupSize: 5 });
    
    // 先加入的学员（id 小）应该在前面的组
    expect(groups[0].members[0].id).toBe(1); // 最早加入的在第一组
    expect(groups[1].members[0].id).toBeLessThan(groups[2].members[0].id);
  });

  it('场景 2：按加入顺序 → 可能产生不满员组', () => {
    const groups = autoGroupByJoinOrder(students, { groupSize: 5 });
    
    // 24 / 5 = 4组满员 + 1组4人
    const lastGroup = groups[groups.length - 1];
    expect(lastGroup.members.length).toBeLessThanOrEqual(5);
    expect(lastGroup.members.length).toBeGreaterThan(0);
  });

  it('颜色自动分配 → 不重复', () => {
    const groups = autoGroup(students, { groupSize: 4, method: 'random' });
    const colors = groups.map((g) => g.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(colors.length); // 无重复颜色
  });
});
```

---

## Feature 7: 作业系统

### BDD 场景映射表

| BDD 场景 | 测试文件 | 测试类型 | 优先级 |
|----------|----------|----------|--------|
| 布置作业 | `integration/api/assignments.test.ts` | API | P1 |
| Markdown 简子集 | `unit/utils/markdown.test.ts` | 单元 | P1 |
| 学生提交 | `integration/api/assignments.test.ts` | API | P1 |
| 不可重复提交 | `integration/api/assignments.test.ts` | API | P1 |
| 待批改列表 | `integration/pages/camp/GradingPage.test.tsx` | 集成 | P1 |
| 教师批改 | `integration/api/assignments.test.ts` | API | P1 |
| 截止后锁定 | `unit/utils/assignmentDeadline.test.ts` | 单元 | P1 |
| 手动关闭 | `integration/api/assignments.test.ts` | API | P1 |
| 赛季结算挂钩 | `integration/api/seasons.test.ts` | API | P1 |

### 单元测试：作业截止

```typescript
// tests/unit/utils/assignmentDeadline.test.ts
import { describe, it, expect, vi } from 'vitest';
import { isAssignmentOpen, isSubmissionLate } from '@/utils/assignmentDeadline';

describe('Feature: 作业系统 - 截止逻辑', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('场景 7：截止时间前 → 可提交', () => {
    vi.setSystemTime(new Date('2026-03-15T23:00:00'));
    const deadline = '2026-03-15T23:59:00';
    
    expect(isAssignmentOpen({ deadline, status: 'active' })).toBe(true);
  });

  it('场景 7：截止时间后 1 分钟 → 不可提交', () => {
    vi.setSystemTime(new Date('2026-03-16T00:01:00'));
    const deadline = '2026-03-15T23:59:00';
    
    expect(isAssignmentOpen({ deadline, status: 'active' })).toBe(false);
    expect(isSubmissionLate({ deadline })).toBe(true);
  });

  it('场景 8：教师手动关闭 → 不可提交', () => {
    vi.setSystemTime(new Date('2026-03-15T12:00:00'));
    const deadline = '2026-03-15T23:59:00';
    
    expect(isAssignmentOpen({ deadline, status: 'closed' })).toBe(false);
  });
});
```

### API 测试：作业路由

```typescript
// tests/integration/api/assignments.test.ts
import { describe, it, expect } from 'vitest';
import { request } from '@/tests/utils/supertest';

describe('Feature: 作业系统 - API', () => {
  it('场景 3：学生提交作业 → 成功', async () => {
    const assignment = await createAssignment({ status: 'active' });
    const student = await createStudent();
    
    const response = await request
      .post(`/api/assignments/${assignment.id}/submissions`)
      .send({
        student_id: student.id,
        content: '我在 TechVenture 中选择了路线 A...',
      })
      .set('Authorization', 'Bearer student-token');

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('submitted');
  });

  it('场景 4：已提交作业再次提交 → 409', async () => {
    const assignment = await createAssignment({ status: 'active' });
    const student = await createStudent();
    await createSubmission({ assignment_id: assignment.id, student_id: student.id });
    
    const response = await request
      .post(`/api/assignments/${assignment.id}/submissions`)
      .send({
        student_id: student.id,
        content: '第二次提交...',
      })
      .set('Authorization', 'Bearer student-token');

    expect(response.status).toBe(409);
    expect(response.body.error).toContain('已提交过');
  });

  it('场景 6：教师批改 → 更新评分', async () => {
    const assignment = await createAssignment();
    const student = await createStudent();
    const submission = await createSubmission({ assignment_id: assignment.id, student_id: student.id });
    
    const response = await request
      .patch(`/api/submissions/${submission.id}/grade`)
      .send({
        score: 85,
        feedback: '分析深入，但改进策略可以更具体...',
      })
      .set('Authorization', 'Bearer teacher-token');

    expect(response.status).toBe(200);
    expect(response.body.data.score).toBe(85);
    expect(response.body.data.feedback).toBe('分析深入，但改进策略可以更具体...');
    expect(response.body.data.graded_at).toBeDefined();
  });
});
```

---

## Feature 8: 学生端赛季进度

### BDD 场景映射表

| BDD 场景 | 测试文件 | 测试类型 | 优先级 |
|----------|----------|----------|--------|
| 赛季进度条 | `integration/pages/student/CampPage.test.tsx` | 集成 | P1 |
| 待解锁里程碑 | `integration/components/SeasonTimeline.test.tsx` | 集成 | P1 |
| 当前任务入口 | `integration/pages/student/CampPage.test.tsx` | 集成 | P1 |
| 作业提醒 | `integration/components/TaskReminder.test.tsx` | 集成 | P1 |
| 已完成标记 | `integration/stores/seasonProgressStore.test.ts` | 集成 | P1 |
| 赛季档案 | `integration/pages/student/SeasonArchivePage.test.tsx` | 集成 | P1 |

### 集成测试：学生端赛季进度

```typescript
// tests/integration/pages/student/CampPage.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/mocks/server';
import StudentCampPage from '@/pages/student/CampPage';

describe('Feature: 学生端赛季进度感知', () => {
  const mockSeason = {
    id: 1,
    name: '4周商赛入门',
    theme: '长三角贸易',
    status: 'ongoing',
    progress: { completed: 2, total: 6, percentage: 33 },
    current_milestone: { name: '练习赛 #1', type: 'practice_match' },
    assignments_pending: [
      { id: 1, title: '赛后反思', deadline: '2026-03-18T23:59:00' },
    ],
  };

  beforeEach(() => {
    server.use(
      http.get('/api/v1/student/camp', () => {
        return HttpResponse.json({ data: { season: mockSeason } });
      })
    );
  });

  it('场景 1：赛季进度条 → 显示 2/6 里程碑', async () => {
    render(<StudentCampPage />);
    
    await waitFor(() => {
      expect(screen.getByText('4周商赛入门')).toBeInTheDocument();
      expect(screen.getByText('长三角贸易')).toBeInTheDocument();
      expect(screen.getByText('2 / 6 里程碑')).toBeInTheDocument();
      expect(screen.getByText('33%')).toBeInTheDocument();
    });
  });

  it('场景 3：当前任务 → 显示快捷入口', async () => {
    render(<StudentCampPage />);
    
    await waitFor(() => {
      expect(screen.getByText('练习赛 #1 · 待完成')).toBeInTheDocument();
      expect(screen.getByText('前往练习赛')).toBeInTheDocument();
    });
    
    // When: 点击快捷入口
    fireEvent.click(screen.getByText('前往练习赛'));
    
    // Then: 跳转至商赛大厅
    await waitFor(() => {
      expect(window.location.pathname).toBe('/arena');
    });
  });

  it('场景 4：作业提醒 → 显示待提交徽章', async () => {
    render(<StudentCampPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/1 个作业待提交/)).toBeInTheDocument();
      expect(screen.getByText(/剩余 3 天/)).toBeInTheDocument();
    });
  });

  it('场景 6：赛季结束后 → 显示档案入口', async () => {
    server.use(
      http.get('/api/v1/student/camp', () => {
        return HttpResponse.json({
          data: {
            season: {
              ...mockSeason,
              status: 'closed',
              archive: {
                matches: 5,
                best_rank: 2,
                total_xp: 2500,
                assignment_completion: 100,
                assignment_avg: 85,
              },
            },
          },
        });
      })
    );
    
    render(<StudentCampPage />);
    
    await waitFor(() => {
      expect(screen.getByText('已结束')).toBeInTheDocument();
    });
    
    // When: 点击赛季卡片
    fireEvent.click(screen.getByText('4周商赛入门'));
    
    // Then: 显示档案
    await waitFor(() => {
      expect(screen.getByText('参赛场次：5')).toBeInTheDocument();
      expect(screen.getByText('最佳排名：第 2 名')).toBeInTheDocument();
      expect(screen.getByText('累计赛季 XP：2500')).toBeInTheDocument();
      expect(screen.getByText('作业完成度：100%')).toBeInTheDocument();
      expect(screen.getByText('作业均分：85')).toBeInTheDocument();
    });
  });
});
```

---

## 附录：CI 测试脚本

### 运行命令

```bash
# 安装依赖
npm install -D vitest @testing-library/react @testing-library/jest-dom msw playwright @faker-js/faker factory.ts

# 运行单元测试（快速）
npm run test:unit
# 或
vitest run --config vitest.unit.config.ts

# 运行集成测试（含 MSW）
npm run test:integration
# 或
vitest run --config vitest.integration.config.ts

# 运行 E2E 测试（需启动服务）
npm run test:e2e
# 或
playwright test

# 全部测试（CI 环境）
npm run test:ci
```

### 推荐配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
```

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```typescript
// tests/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

---

*商域 BizSim Edu · 教师端 TDD · P0+P1*
