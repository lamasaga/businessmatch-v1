# 商域 BizSim Edu — 商业模拟教育平台

> 一个现代化的、模块化的前后端分离 Web 应用，提供**完整的商业模拟教育体验**：课程学习、实战商赛、AI 辅助训练、交易模拟比赛。
>
> **仓库文档**：[`../README.md`](../README.md)（00～09）· 工程详表 [`../08-`](../08-工程现状与webapp实现详表.md) · 分项目 [`../09-`](../09-分项目开发与集成流程.md)

---

## 目录

1. [项目概述](#项目概述)
2. [技术栈](#技术栈)
3. [快速开始](#快速开始)
4. [项目结构](#项目结构)
5. [功能模块详解](#功能模块详解)
6. [API 接口](#api-接口)
7. [开发路线图](#开发路线图)
8. [启动脚本说明](#启动脚本说明)
9. [许可证](#许可证)

---

## 项目概述

**商域 (BizSim Edu)** 是面向青少年及大学生的商业模拟教育平台，融合课程学习、实战商赛、交易模拟与 AI 辅助训练，打造系统化的商业思维成长路径。

### 核心设计理念

- **五域一体**：知识图谱 (Atlas) · 课程学院 (Academy) · 每日任务 (Quest) · 商赛大厅 (Arena) · 成就中心 (Credenti)
- **三层 AI**：Athena (生涯导师) · Demia (人群模拟) · Rival (谈判对手)
- **赛季成长**：经验等级、五维雷达、连续打卡、徽章认证
- **交易商赛**：组织者建场 / 学生房间码加入 / **浮生记 RTS**（5s tick + WebSocket）或 **回合制 v1** → 结果反馈生涯

### 对外演示（推荐）

1. 启动前端：`cd frontend` → `npm install` → `npm run dev`
2. 启动后端：`cd backend` → `.venv\Scripts\python run.py`（首次或拉取体验营分支后执行 `python -m app.db.init_db` 建表）
3. 浏览器打开 http://localhost:5173
4. 使用测试账户登录：
   - **学生**: `student` / `student123`
   - **管理员/教师**: `admin` / `admin123`
5. 体验完整闭环：
   - `/career` 生涯中枢（经验值、等级）
   - `/games` 商赛大厅 → **浮生记 · 日常练习**（默认 RTS v2）或房间码加入正式赛
   - `/games/:id/play` 即时物流商战（WebSocket 刷新 + 指令排队）或回合制交易
   - 教师端 http://localhost:5174 营团与商赛控场（RTS 无「推进回合」）

### 商业体验营 Phase 1（开发分支）

　　功能在分支 **`feature/camp-phase1`** 上迭代，稳定后再合并 `main`，避免影响现网演示。

| 端 | 说明 |
|----|------|
| 学生 `:5173` | 本地 dev 默认开启体验营壳（`VITE_CAMP_PHASE1` 未设或为 `true`）；生产构建见 `frontend/.env.example` |
| 教师 `:5174` | 创建营团（**6 位**邀请码）→ 营内发起商赛（**4 位**房间码）→ 控场 |
| 后端 | `POST/GET /api/v1/teaching-groups/*`；`competition_events.teaching_group_id` |

**手测路径**：教师端建营并复制邀请码 → 学生 `/camp/join` 入营 → 教师营内「发起商赛」→ 学生商赛大厅输入房间码 → 教师控场结束。

---

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^19.2.6 | UI 框架 |
| TypeScript | ~6.0.2 | 类型安全 |
| Vite | ^8.0.12 | 构建工具 |
| Tailwind CSS | ^3.4.1 | 原子化样式（暗色主题） |
| React Router | ^7.15.0 | 客户端路由 |
| Zustand | ^5.0.13 | 状态管理 |
| Axios | ^1.16.0 | HTTP 客户端 |
| Lucide React | ^1.14.0 | 图标库 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.13 | 运行环境 |
| FastAPI | >=0.136.0 | Web 框架 |
| SQLAlchemy | >=2.0.0 | ORM |
| SQLite | 内置 | 数据库 |
| python-jose | >=3.5.0 | JWT 认证 |
| passlib + bcrypt | >=1.7.4 | 密码哈希 |

### 部署

| 技术 | 用途 |
|------|------|
| Docker + Docker Compose | 容器化部署 |
| Nginx (Alpine) | 前端静态服务 + 反向代理 |

---

## 组织者控制台（Phase 1）

　　独立前端工程 [`organizer-frontend/`](./organizer-frontend/)，默认端口 **5174**：

| 角色 | 地址 |
|------|------|
| 组织者 | http://localhost:5174 |
| 学生加入 | http://localhost:5173/games（输入房间码） |

　　演示：组织者 `admin/admin123` 创建比赛 → 学生 `student/student123` 输入房间码 → 组织者端控场推进回合。

---

## 快速开始

### 环境要求

- Node.js >= 20
- Python >= 3.13
- npm >= 10

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

前端服务将运行在 http://localhost:5173

### 后端启动

```bash
cd backend
# 创建虚拟环境
python -m venv venv

# Windows
.\venv\Scripts\pip install -r requirements.txt
.\venv\Scripts\python run.py

# macOS/Linux
source venv/bin/pip install -r requirements.txt
source venv/bin/python run.py
```

后端服务将运行在 http://localhost:8000

API 文档: http://localhost:8000/docs

### 数据库初始化

后端首次启动时会自动创建所有数据表并插入默认用户：

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | admin | 管理员 + 组织者 |
| student | student123 | student | 演示学生 |

组织者档案会自动创建（关联 admin 用户）。

### Docker 三端部署（推荐演示 / ECS 单机）

　　一条命令启动 **后端 + 学生端 + 组织者端**：

```powershell
Set-Location "d:\businessmatch-v1\webapp"
docker compose up -d --build
```

| 服务 | 容器名 | 浏览器地址 |
|------|--------|------------|
| 后端 API | `bizsim-backend` | http://localhost:8000 （文档 `/docs`） |
| 学生端 | `bizsim-student` | http://localhost |
| 组织者端 | `bizsim-organizer` | http://localhost:5174 |

　　前端通过 Nginx 将 `/api/` 反代到 `backend:8000`，无需浏览器跨域。SQLite 数据持久化在卷 `bizsim_data`。

```powershell
# 查看日志
docker compose logs -f backend

# 停止并删除容器（保留数据卷）
docker compose down

# 停止并删除数据卷（清空数据库）
docker compose down -v
```

　　开发时若需后端热重载，可叠加：

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up backend
```

　　前端仍建议本机 `npm run dev`（5173 / 5174），见 [`organizer-frontend/README.md`](./organizer-frontend/README.md)。

---

## 项目结构

```
webapp/
├── frontend/                    # React 前端
│   ├── public/                  # 静态资源
│   ├── src/
│   │   ├── components/          # 共享组件
│   │   │   ├── Layout.tsx       # 侧边栏布局
│   │   │   ├── AuthGuard.tsx    # 路由权限守卫
│   │   │   ├── AppInitializer.tsx # 应用初始化
│   │   │   ├── KnowledgeGraph.tsx # Canvas 知识图谱
│   │   │   └── platform/        # 平台特色组件
│   │   │       ├── AbilityRadar.tsx   # 五维雷达图
│   │   │       ├── AthenaPanel.tsx    # AI 导师浮窗
│   │   │       ├── PopPanel.tsx       # Demia 人群面板
│   │   │       └── DemoBanner.tsx     # MVP 演示横幅
│   │   ├── pages/               # 页面组件
│   │   │   ├── HomePage.tsx     # 首页
│   │   │   ├── Auth/            # 登录/注册
│   │   │   ├── Career/          # 生涯中枢/开启/复盘
│   │   │   ├── Games/           # 商赛大厅/大厅/交易游戏
│   │   │   ├── Wiki/            # 知识图谱/文章详情
│   │   │   ├── Courses/         # 课程列表/详情
│   │   │   ├── WealthOfNations/ # 国富论游戏
│   │   │   ├── OPC/             # 一人公司孵化器
│   │   │   ├── Organizer/       # 组织者控制台/创建比赛
│   │   │   ├── Quests/          # 每日任务
│   │   │   ├── Achievements/    # 成就中心
│   │   │   ├── Showcase/        # 新手指引
│   │   │   └── Dashboard/       # 个人中心
│   │   ├── stores/              # Zustand 状态管理
│   │   │   ├── authStore.ts     # 认证状态
│   │   │   ├── careerStore.ts   # 生涯状态
│   │   │   ├── competitionStore.ts  # 比赛状态
│   │   │   ├── tradingStore.ts  # 交易游戏状态
│   │   │   └── OPCStore.ts      # 一人公司状态
│   │   ├── services/            # API 服务层
│   │   │   ├── authService.ts
│   │   │   ├── wikiService.ts
│   │   │   └── courseService.ts
│   │   ├── data/                # 静态数据
│   │   │   └── mockPlatform.ts  # MVP 演示数据
│   │   ├── types/               # TypeScript 类型
│   │   │   └── index.ts
│   │   ├── lib/                 # 工具函数
│   │   │   └── api.ts           # Axios 封装 + Token 刷新
│   │   ├── App.tsx              # 路由配置
│   │   ├── main.tsx             # 入口
│   │   └── index.css            # 全局样式 + Tailwind
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js       # 暗色主题配置
│   ├── tsconfig.json
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf               # Nginx 反向代理配置
│
├── backend/                     # FastAPI 后端
│   ├── app/
│   │   ├── main.py              # 应用入口
│   │   ├── api/                 # API 路由
│   │   │   ├── auth.py          # 认证 (注册/登录/刷新/Me)
│   │   │   ├── wiki.py          # 知识图谱
│   │   │   ├── courses.py       # 课程中心
│   │   │   ├── OPC.py           # 一人公司
│   │   │   ├── organizer.py     # 组织者管理
│   │   │   ├── competitions.py  # 比赛管理
│   │   │   └── trading.py       # 交易游戏
│   │   ├── core/                # 核心基础设施
│   │   │   ├── config.py        # 配置管理
│   │   │   ├── security.py      # JWT + 密码哈希
│   │   │   ├── dependencies.py  # 权限校验 + 分页
│   │   │   ├── response.py      # 统一响应格式 + 异常处理
│   │   │   └── middleware.py    # 请求日志中间件
│   │   ├── models/              # SQLAlchemy 数据模型
│   │   │   ├── user.py          # 用户模型
│   │   │   ├── OPC.py           # 公司/员工/任务模型
│   │   │   └── trading_competition.py  # 商赛模型
│   │   ├── schemas/             # Pydantic 数据校验
│   │   │   ├── user.py
│   │   │   ├── OPC.py
│   │   │   └── trading_competition.py
│   │   ├── db/                  # 数据库
│   │   │   ├── database.py      # SQLite + SQLAlchemy 引擎
│   │   │   └── init_db.py       # 数据库初始化 + 默认用户
│   │   ├── data/                # 静态数据文件
│   │   │   └── knowledge_graph.json
│   │   └── services/            # 业务逻辑层 (预留)
│   ├── scripts/                 # 数据初始化脚本
│   │   ├── init_OPC.py
│   │   └── parse_knowledge.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── run.py                   # 开发启动脚本
│
├── docker-compose.yml           # 三端编排（backend + student + organizer）
├── docker-compose.dev.yml       # 开发叠加（后端热重载）
├── organizer-frontend/          # 组织者控制台（:5174）
├── bizsim.db                    # SQLite 数据库文件
├── 启动.bat                     # Windows 一键启动 (前后端)
├── 启动-前端.bat                # Windows 启动前端
├── 启动-后端.bat                # Windows 启动后端
└── README.md                    # 本文件
```

---

## 功能模块详解

### 1. 用户认证系统 (`/login`, `/register`)

- 邮箱/用户名双方式登录
- JWT Access Token + Refresh Token 双令牌机制
- 自动 Token 刷新（Axios 拦截器实现）
- 角色系统：student / teacher / admin
- 经验值与等级系统（比赛结果自动反馈）

### 2. 生涯中枢 (`/career`)

- 赛季体系：等级、经验、连续打卡
- 五维能力雷达：财务 · 市场 · 战略 · 协作 · 伦理
- Athena AI 导师浮窗：快速问答式交互
- 本周计划与叙事化成长档案
- **比赛结果联动**：参赛获得经验值，排名越高奖励越多

### 3. 每日任务 (`/quests`)

- 每日挑战任务列表
- 完成状态追踪（localStorage 持久化）
- Athena 导师轻反思提示
- 连续打卡统计

### 4. 商赛大厅 (`/games`) — 交易模拟比赛

**核心玩法（《北京浮生记》式倒卖）**：

- **组织者**创建比赛，设置参数（回合数/初始资金/库存上限），生成 **4 位数字房间码**
- **学生**输入房间码加入比赛
- **回合制交易**：每回合学生决策（买入/卖出/移动/持有）
- **价格波动**：供需关系 + 随机事件（丰收/歉收/流行趋势/政策调控/谣言/天灾等）
- **6 个城市**各有特色：京城（高档品溢价）、沪市（中档活跃）、深市（电子便宜）、蓉城（食品低价）、冰城（波动大）、港城（免税）
- **10 种商品**分 3 档：低档（水果/蔬菜/日用品）、中档（电子/服装/化妆品）、高档（珠宝/古董/艺术品）

**比赛流程**：
```
创建比赛 → 生成房间码 → 学生加入 → 组织者开始
→ 回合1：公布事件 → 学生决策 → 计算价格 → 排行榜
→ ...（循环）→ 结束比赛 → 经验值发放到生涯
```

**页面**：
| 页面 | 路径 | 说明 |
|------|------|------|
| 商赛大厅 | `/games` | 浏览公开比赛 + 输入房间码加入 |
| 比赛大厅 | `/games/:id/lobby` | 显示房间码、等待开始 |
| 交易游戏 | `/games/:id/play` | 核心游戏界面（市场/库存/决策/排行榜） |
| 创建比赛 | `/organizer/events/create` | 组织者设置参数 |

### 5. 知识图谱 (`/wiki`)

- 真实知识卡片数据（从 YAML 解析生成 JSON）
- 三大学科：经济学 · 商学 · 管理学
- Canvas 力导向交互图谱（缩放/拖拽/点击）
- 卡片详情：定义 / 解释 / 类比 / 案例 / 关联知识

### 6. 课程学院 (`/courses`)

- 课程列表：分类筛选 + 难度筛选 + 搜索
- 课程详情：大纲 / 课时列表 / 学习目标
- 试看与购买流程 UI（演示）

### 7. 国富论游戏 (`/wealth-of-nations`)

基于亚当·斯密《国富论》的工坊经营模拟：

- **雇佣工人**：用利润雇佣，支付日工资
- **劳动分工**：增加工序，提升效率（别针厂原理）
- **投资工具**：购买机器提升生产力
- **市场波动**：价格与需求随供需变化
- **斯密语录**：关键时刻弹出原著引文

### 8. 一人公司孵化器 (`/opc`)

学生创建虚拟公司，雇佣 AI 员工完成商业任务：

| 页面 | 功能 |
|------|------|
| `/opc` | 公司仪表盘：员工/任务/营收统计 |
| `/opc/talent` | 人才市场：雇佣 AI 员工 |
| `/opc/missions` | 任务控制中心：看板式任务管理 |
| `/opc/bmc` | 商业模式画布：9宫格编辑 |
| `/opc/employee/:id` | 员工详情：技能矩阵 / 任务历史 |

**数据模型**：
- `OneCompany` — 公司（阶段：IDEATE → SCALE）
- `AIEmployee` — AI 员工（代号/角色/技能/状态）
- `AITask` — 任务（标题/描述/指派/进度/评分）

---

## API 接口

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/register` | 用户注册 |
| POST | `/api/v1/auth/login` | 用户登录（支持邮箱/用户名） |
| GET | `/api/v1/auth/me` | 获取当前用户 |
| POST | `/api/v1/auth/refresh` | 刷新 Access Token |

### 知识图谱

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/wiki/articles` | 文章列表（支持学科/分类/搜索筛选） |
| GET | `/api/v1/wiki/articles/{id}` | 文章详情 |
| GET | `/api/v1/wiki/graph` | 完整知识关联图谱 |
| GET | `/api/v1/wiki/disciplines` | 学科与分类结构 |

### 课程

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/courses/` | 课程列表（支持分类/等级/搜索筛选） |
| GET | `/api/v1/courses/{id}` | 课程详情 |

### 一人公司 (OPC)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/opc/companies` | 公司列表 |
| POST | `/api/v1/opc/companies` | 创建公司 |
| GET | `/api/v1/opc/companies/{id}` | 公司详情（含员工+任务） |
| PATCH | `/api/v1/opc/companies/{id}` | 更新公司 |
| GET | `/api/v1/opc/companies/{id}/employees` | 员工列表 |
| POST | `/api/v1/opc/companies/{id}/employees` | 雇佣员工 |
| GET | `/api/v1/opc/employees/{id}` | 员工详情 |
| GET | `/api/v1/opc/companies/{id}/tasks` | 任务列表 |
| POST | `/api/v1/opc/companies/{id}/tasks` | 创建任务 |
| PATCH | `/api/v1/opc/tasks/{id}` | 更新任务状态/进度/评分 |

> **数据库**：表名已由 `ohb_*` 改为 `opc_*`。若本地已有旧版 `bizsim.db`，请删除后重启后端以自动建表，或运行 `python scripts/init_opc.py` 写入演示数据。

### 组织者 (Organizer)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/organizer/apply` | 申请成为组织者 |
| GET | `/api/v1/organizer/profile` | 获取组织者档案 |
| PUT | `/api/v1/organizer/profile` | 更新组织者信息 |
| GET | `/api/v1/organizer/stats` | 获取统计数据 |
| GET | `/api/v1/organizer/events` | 我的比赛列表 |
| GET | `/api/v1/organizer/events/{id}/control` | 控场面板（排行榜/回合） |

### 比赛 (Competition)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/competitions` | 创建比赛（组织者） |
| GET | `/api/v1/competitions` | 公开比赛列表 |
| GET | `/api/v1/competitions/{id}` | 比赛详情 |
| POST | `/api/v1/competitions/join` | 加入比赛（房间码） |
| POST | `/api/v1/competitions/{id}/leave` | 退出比赛 |
| POST | `/api/v1/competitions/{id}/start` | 开始比赛（组织者） |
| POST | `/api/v1/competitions/{id}/end` | 结束比赛（组织者） |
| GET | `/api/v1/competitions/{id}/standings` | 排行榜 |
| GET | `/api/v1/competitions/{id}/my-status` | 我的参赛状态 |

### 交易游戏 (Trading)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/trading/events/{id}/state` | 游戏状态（**RTS：只读，不推进 tick**） |
| POST | `/api/v1/trading/events/{id}/actions` | RTS 指令（buy/sell/move/buy_vehicle，下 tick 结算） |
| WS | `/api/v1/trading/events/{id}/ws?token=` | RTS tick/finished 推送（调度器 commit 后广播） |
| POST | `/api/v1/trading/rounds/{id}/decide` | 回合制决策 |
| GET | `/api/v1/trading/rounds/{id}/result` | 回合结果 |
| POST | `/api/v1/trading/rounds/{id}/next` | 推进下一回合（组织者；**RTS 返回 400**） |
| GET | `/api/v1/trading/events/{id}/history` | 价格历史 |

### 日常练习 (Practice)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/practice/game-configs` | 可选赛制列表 |
| POST | `/api/v1/practice/trading/start` | 创建并开始练习局（默认 `trading-v2-rts`） |

---

## 开发路线图

| 阶段 | 任务 | 状态 |
|------|------|------|
| Phase 1 | 项目脚手架（Vite + FastAPI + Tailwind） | ✅ |
| Phase 2 | 用户系统（注册/登录/JWT） | ✅ |
| Phase 3 | Wiki 知识图谱系统 | ✅ |
| Phase 4 | 课程中心 | ✅ |
| Phase 5 | 商赛引擎（大厅/房间/对局 UI） | ✅ |
| Phase 6 | 国富论教学游戏 | ✅ |
| Phase 7 | 生涯五域 + 三层 AI MVP | ✅ |
| Phase 8 | 一人公司孵化器 (OPC) | ✅ |
| Phase 9 | 整合优化 + Docker 部署 | ✅ |
| Phase 10 | **交易模拟商赛（组织者+房间码+回合制）** | ✅ |
| Phase 11 | **浮生记 RTS v2（调度器+WebSocket+双档 AI）** | ✅ |

---

## 启动脚本说明

项目根目录提供 Windows 批处理脚本，方便一键启动：

| 脚本 | 说明 |
|------|------|
| `启动.bat` | 同时启动前端 (npm run dev) 和后端 (uvicorn) |
| `启动-前端.bat` | 仅启动前端 |
| `启动-后端.bat` | 仅启动后端 |

> 脚本使用 PowerShell 执行，会自动打开两个窗口分别运行前后端服务。

---

## 许可证

MIT License
