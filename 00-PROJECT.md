# 商域 BizSim Edu · 项目全景

> **仓库定位**：面向 K12～大学的商业模拟教育平台。模块化单体后端 + React 双前端 + 赛事引擎匣子。
> **第一入口**：本文件 → 按任务进入 `01`～`04`。
> **最后更新**：2026-06-06

---

## 目录

| 编号 | 文档 | 定位 |
|------|------|------|
| **00** | 本文 | 仓库地图、快速开始、inspire 外链 |
| **00** | [统一术语表](./00-TERMINOLOGY.md) | 全项目唯一术语权威源 |
| **01** | [产品架构与赛事体系](./01-PRODUCT.md) | 五域、赛制、双端、赛季 |
| **02** | [技术架构与智能体编排](./02-ARCHITECTURE.md) | 技术栈、域分包、Worker 列表 |
| **03** | [工程实现与开发规范](./03-ENGINEERING.md) | AI_DEFAULT、API/路由全表、引擎规范 |
| **04** | [实施路线与里程碑](./04-ROADMAP.md) | Phase A～F、验收标准 |

> **ADR**：[docs/decisions/](./docs/decisions/README.md) · **代码**：[webapp/](./webapp/)

---

## 快速开始

```powershell
# 一键启动（Windows）
cd webapp
.\启动.ps1          # 后端:8000 + 学生端:5173 + 组织者端:5174

# 数据库初始化（首次或 schema 变更）
cd webapp/backend
.\venv\Scripts\python -m app.db.init_db
```

**测试账户**：`student`/`student123`，`admin`/`admin123`

---

## 仓库目录树

```text
businessmatch-v1/
├── 00-PROJECT.md              ★ 本文
├── 00-TERMINOLOGY.md          ★ 术语表
├── 01-PRODUCT.md              ★ 产品架构
├── 02-ARCHITECTURE.md         ★ 技术架构
├── 03-ENGINEERING.md          ★ 工程详表
├── 04-ROADMAP.md              ★ 路线图
├── CLAUDE.md                  ★ Claude Code 上下文（AI 编程入口）
├── agent.md                   ★ 其他 AI 工具入口（备份）
├── docs/decisions/            ADR（架构决策记录）
├── webapp/
│   ├── backend/               FastAPI + SQLite
│   ├── frontend/              学生端 (:5173)
│   └── organizer-frontend/    组织者端 (:5174)
├── inspire/                   构想库（非编程契约）
│   ├── archive/               历史文档归档
│   └── OPC/                   OPC 一人公司规格（Phase E）
└── art-assets/                美术资源
```

---

## 按任务导航

| 我要… | 读什么 |
|-------|--------|
| **写代码、改 API** | `03-ENGINEERING.md` §AI_DEFAULT → 域 DESIGN.md / ARCHITECTURE.md |
| **懂产品、赛制、双端** | `01-PRODUCT.md` |
| **懂技术栈、域边界** | `02-ARCHITECTURE.md` |
| **排期、Phase 门控** | `04-ROADMAP.md` |
| **查术语** | `00-TERMINOLOGY.md` |
| **启动本地环境** | `webapp/README.md` |

---

## inspire 专题索引

> inspire/ 为构想库，非编程契约。仅本文维护外链入口。

| 专题 | 文档 |
|------|------|
| OPC 一人公司 | `inspire/OPC/00-规格库索引.md` |
| 拟真城市详设 | `inspire/75-拟真城市世界观设计.md` |
| AI 六支柱框架 | `inspire/81-商域AI赋能六支柱全景.md` |
| 商赛美术 | `inspire/76-商赛美术资源嵌入与技术选型建议.md` |
| 构想库导航 | `inspire/50-目录导航.md` |

---

*商域 BizSim Edu · 项目全景 v2.0*
