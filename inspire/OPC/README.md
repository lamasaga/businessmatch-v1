# OPC · 规格库

> **让每个学生都能成立并运营一家真实的一人公司。**
>
> BizSim Edu 的**终局出口**：模拟与课程之后，以管理者 + AI 员工完成首项目。

---

## 从哪里读起？

| 你的目标 | 打开 |
|----------|------|
| **理解 OPC、排未来路线** | **[../05-OPC一人公司-阅读合集.md](../05-OPC一人公司-阅读合集.md)**（根目录，必读） |
| **查 MCP / API / SOP 细则** | [00-规格库索引.md](./00-规格库索引.md) |
| **改 webapp OPC 页面** | [../webapp/frontend/src/pages/OPC/](../webapp/frontend/src/pages/OPC/) |

　　本目录约 40+ 规格文件，**不要从 README 逐个点**——先读 `05-` 合集，再按索引下钻。

---

## 模块定位

- **层级**：主平台 MVP → **OPC** → 商业化  
- **机制**：雇佣、管理、验收 AI 员工；Gateway 控制模拟→真实  
- **数据**：与 Career Hub 共享 `user_id` / `career_id`

---

## 实施状态（摘要）

| 状态 | 项 |
|------|-----|
| ✅ | 规格文档、MCP 设计、SOP、code-skeleton |
| 🟡 | webapp OPC CRUD + 页面原型 |
| 🔴 | LangGraph 生产、Gateway 算法、YAML Prompt、配额计费 |

　　缺口详表：[99-查漏补缺与现状总结.md](./99-查漏补缺与现状总结.md) · 合集版 [05-](../05-OPC一人公司-阅读合集.md) §九

---

## 快速集成（开发）

　　代码根目录为 **`webapp/`**（非历史 `web应用商业教育/`）：

1. 后端：参考 `code-skeleton/02-SQLAlchemy模型骨架.py` → `webapp/backend/app/models/opc.py`  
2. 前端：参考 `code-skeleton/03-React组件骨架.tsx` → `webapp/frontend/src/pages/OPC/`  
3. 工作流：Phase B 起引入 `code-skeleton/04-LangGraph工作流骨架.py`

---

---

## 命名说明

| 层面 | 名称 |
|------|------|
| 产品 / 文档 | **OPC**（一人公司） |
| 仓库目录 | `OPC/` |
| 代码 | API `/api/v1/opc`、表 `opc_*`、前端 `pages/OPC/`、`opcStore`、路由 `/opc/*` |

---

*规格库 v0.3 · 阅读入口：根目录 [05-OPC一人公司-阅读合集.md](../05-OPC一人公司-阅读合集.md)*
