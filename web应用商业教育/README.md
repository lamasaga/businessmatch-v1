# 商业模拟教育平台 (BizSim Edu)

一个现代化的、模块化的前后端分离 Web 应用，对齐仓库 **`商业模拟教育平台/`** 一体化规划，提供**可对外演示的 MVP 交互壳**（生涯五域 + 三层 AI）。

## 对外演示（推荐）

1. 启动前端：`cd frontend` → `npm install` → `npm run dev`
2. 浏览器打开 http://localhost:5173
3. 点击顶部 **「展示解说」** 或首页 **「对外展示路线」**，按 7 步脚本讲解
4. 或点击 **「一键开启生涯」**，依次体验：
   - `/career` 生涯中枢（Athena 周计划、五维雷达）
   - `/quests` 日常任务
   - `/games/turn-based/play` Demia POP 对局演示
   - `/games/supply-chain/practice` Rival 谈判练习
   - `/career/debrief/demo` Athena 结构化复盘

> 演示数据在前端 `src/data/mockPlatform.ts`，状态保存在浏览器 localStorage，无需启动后端。

## 功能特性

### MVP 展示模块（前端）

| 模块 | 路径 | 说明 |
|------|------|------|
| 生涯中枢 | `/career` | XP、赛季、五域入口、Athena 浮窗 |
| 日常 Quest | `/quests` | 每日任务 + 完成反馈 |
| 商赛 · Demia | `/games/:id/play` | POP 人群面板 + 回合决策示意 |
| 商赛 · Rival | `/games/:id/practice` | 多轮谈判对话演示 |
| Athena 复盘 | `/career/debrief/demo` | 战报、反思题、下一步推荐 |
| 展示路线 | `/showcase` | 15 分钟解说脚本 |

### 原有模块

| 模块 | 描述 | 状态 |
|------|------|------|
| 用户系统 | 注册/登录/JWT | 可选（演示可不登录） |
| 知识图谱 Wiki | 商业知识百科 | 已接入 |
| 课程中心 | 课程浏览/详情 | 已接入 |
| 商赛大厅 | 10 种赛制 + AI 标签 | 已增强 |
| 国富论游戏 | 工坊经营模拟 | 已接入 |

### 技术栈

**前端**
- React 18 + TypeScript
- Vite (构建工具)
- Tailwind CSS (样式)
- React Router (路由)
- Zustand (状态管理)
- Axios (HTTP客户端)
- Lucide React (图标)

**后端**
- Python 3.13
- FastAPI (Web框架)
- SQLAlchemy (ORM)
- SQLite (数据库)
- JWT (认证)
- Passlib (密码哈希)

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

API文档: http://localhost:8000/docs

### Docker部署

```bash
docker-compose up -d
```

## 项目结构

```
web应用商业教育/
├── frontend/                 # React前端
│   ├── src/
│   │   ├── components/       # 共享组件
│   │   ├── pages/            # 页面组件
│   │   │   ├── Auth/         # 登录/注册
│   │   │   ├── Dashboard/    # 个人中心
│   │   │   ├── Games/        # 商赛大厅
│   │   │   ├── Wiki/         # 知识图谱
│   │   │   ├── Courses/      # 课程中心
│   │   │   └── WealthOfNations/  # 国富论游戏
│   │   ├── stores/           # Zustand状态管理
│   │   ├── services/         # API服务
│   │   ├── types/            # TypeScript类型
│   │   └── lib/              # 工具函数
│   └── package.json
├── backend/                  # FastAPI后端
│   ├── app/
│   │   ├── api/              # API路由
│   │   ├── core/             # 配置/安全
│   │   ├── models/           # 数据模型
│   │   ├── schemas/          # Pydantic模型
│   │   └── db/               # 数据库
│   └── requirements.txt
└── docker-compose.yml
```

## 《国富论》教学游戏设计

### 核心机制

基于亚当·斯密《国富论》第一篇和第八章，设计"工坊经营模拟"游戏：

**游戏流程：**
1. **开局**：1名工人，100金币，日产量10件
2. **雇佣阶段**：用利润雇佣更多工人（需支付日工资）
3. **分工阶段**：增加工序，提升效率（斯密别针厂原理）
4. **投资阶段**：购买工具，提升生产力
5. **市场阶段**：产品进入市场，价格随供需波动

**教学锚点：**
- 劳动分工 → 效率提升（别针厂案例）
- 工资决定 → 劳动力供需（自然工资vs市场工资）
- 利润来源 → 资本投入与风险承担
- 财富积累 → 储蓄→投资→更多产出

**游戏界面：**
- 工坊视图：工人+工序可视化
- 账本系统：收入/支出/工资/利润实时显示
- 市场看板：价格/需求量动态变化
- 斯密语录：关键时刻弹出原著引文

## API接口

### 认证
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `GET /api/v1/auth/me` - 获取当前用户
- `POST /api/v1/auth/refresh` - 刷新Token

### Wiki
- `GET /api/v1/wiki/articles` - 文章列表
- `GET /api/v1/wiki/articles/{id}` - 文章详情
- `GET /api/v1/wiki/graph` - 知识图谱数据

### 课程
- `GET /api/v1/courses/` - 课程列表
- `GET /api/v1/courses/{id}` - 课程详情

## 开发路线图

| 阶段 | 任务 | 状态 |
|------|------|------|
| Phase 1 | 项目脚手架 | ✅ |
| Phase 2 | 用户系统 | ✅ |
| Phase 3 | Wiki系统 | ✅ |
| Phase 4 | 课程/支付 | ✅ |
| Phase 5 | 商赛引擎 | ✅ |
| Phase 6 | 国富论游戏 | ✅ |
| Phase 7 | 整合优化 | ✅ |

## 许可证

MIT License
