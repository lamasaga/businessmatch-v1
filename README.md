# businessmatch-v1 · 商业模拟教育平台

> **商识唯智**：K12～大学商业素养教育基础设施。

---

## 从这里开始

| 步骤 | 文档 |
| ---- | ---- |
| **1. 打开项目后先读** | [**agent.md**](./agent.md) — 总入口、导航、AI 协作立场 |
| **2. 弄清仓库与选读** | [**00-PROJECT.md**](./00-PROJECT.md) — 项目全景、产品架构共识、inspire 索引 |
| **3. 本地运行** | [**webapp/README.md**](./webapp/README.md) |

　　编写代码、查 API、对实现度：**以根目录 `00～04` + `11-` 为权威**。编码默认 attach [`03-ENGINEERING.md` §AI_DEFAULT](./03-ENGINEERING.md#ai_default)；任务包见 [`03-ENGINEERING.md` §六](./03-ENGINEERING.md#六开发流程)。

---

## 快速启动

```powershell
Set-Location "d:\1XFAwork\businessmatch-v1\webapp"; .\启动.ps1
```

　　<http://localhost:5173> 学生端 · <http://localhost:5174> 教师端 · `student/student123` · `admin/admin123`

---

## 根目录权威文档（00～04 + 11）

| 编号 | 文档 | 定位 |
| ---- | ---- | ---- |
| 00 | [项目全景](./00-PROJECT.md) | 仓库地图、产品架构共识、快速开始 |
| 00 | [统一术语表](./00-TERMINOLOGY.md) | 全项目唯一术语权威源 |
| 01 | [产品架构与赛事体系](./01-PRODUCT.md) | 五域、赛制、双端、赛季 |
| 02 | [技术架构与智能体编排](./02-ARCHITECTURE.md) | 技术栈、域分包、Worker 列表 |
| 03 | [工程实现与开发规范](./03-ENGINEERING.md) | **AI_DEFAULT**、API/路由全表、开发流程 |
| 04 | [实施路线与里程碑](./04-ROADMAP.md) | Phase A～F、验收标准 |
| 11 | [引擎技术规范](./docs/ENGINE.md) | Phaser/React 运行时、美术管线 |

　　产品架构可视化：[`docs/bizsim-product-architecture-2026-06.png`](./docs/bizsim-product-architecture-2026-06.png)（详见 `00-PROJECT` §产品架构共识）。

---

## 其它入口

- **对外项目说明**（同行 / 合作方概览）：[docs/PROJECT.md](./docs/PROJECT.md)
- **架构决策（ADR）**：[docs/decisions/](./docs/decisions/README.md)
- **构想库（inspire）**：仅通过 [00-PROJECT §inspire 专题索引](./00-PROJECT.md#inspire-专题索引) 进入；库内目录 [inspire/50-](./inspire/50-目录导航.md)
- **协作规则**：[.cursor/rules/](./.cursor/rules/)（蓝图编程、文档对齐、inspire 文风、**链接纪律**）
