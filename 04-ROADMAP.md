# 实施路线与里程碑

> **定位**：有序阶段蓝图——无硬性日期，以入口条件与验收标准驱动。
> **关联**：`03-ENGINEERING.md`（工程详表）· `01-PRODUCT.md`（产品定义）
> **最后更新**：2026-06-06

---

## 一、北极星

将 `webapp` 从「功能齐全的演示应用」演进为「可入校试点的模块化单体」——商赛引擎闭环、智能教练可用、生涯可感知、成本可覆盖。

---

## 二、Phase A：商赛引擎闭环（当前）

**入口条件**：仓库可运行、基础认证与数据模型就位

**目标**：正式赛 + 练习赛 + XP 入账 + 组织者控场——完成"辅助学校开展商赛"的最小闭环。

| 工作项 | 验收标准 | 现状 |
|--------|----------|------|
| 回合制正式赛 | 组织者建赛→学生房间码→交易→结束→XP 入账 | ✅ |
| 浮生记 RTS v2 | 5s tick + 调度器单写 + WS 推送 + AI 两档 | ✅ |
| 练习赛入口 | 一键开练 + AI 对手 + 自动推进 + 低权重 XP | ✅ |
| 组织者独立端 | `:5174` 独立控场；学生端无控制台入口 | ✅ |
| 体验营营团 P1 | 教师建营团（6位码）→ 学生入营 → 营内建赛 → 控场 | ✅ |
| 赛事工坊 MVP | `/sandbox` 热 YAML、试跑、publish | 🟡 |
| TechVenture 赛制 | v6 引擎 + 四端 React + 通用队伍模型 + 练习 AI | ✅ |
| Career 前端读账本 | `/career` 对接 `xp_events`，替代 mock | 🔴 |

---

## 三、Phase B：智能教练、生涯中枢与日常体验

**入口条件**：Phase A 验收通过

**目标**：Career Hub（大循环 + 资源经济 + 家园 MVP）+ Hermes 复盘（规则层）+ Quest 挂钩。

| 子阶段 | 工作项 | 验收标准 |
|--------|--------|----------|
| B1 | `career_profiles` + `GET /career/profile` | 生涯页无 mock XP |
| B2 | `resource_ledger` + `economy.yaml` | 练习/正式赛结束发放 supplies（幂等） |
| B3 | 家园 5 槽 + `GET/POST homestead` + UI Tab | 消耗物资升 1 级槽 |
| B4 | NPC 静态配置 + 关系度 + 2 章主线文案 | 完成 1 章解锁对话 |
| B5 | Quest 服务 + Hermes 周计划（规则模板） | 每日 Quest 可完成；练习赛挂钩 streak |
| — | Hermes-Debrief（规则模板） | 正式赛结束后结构化复盘卡片 |
| — | SQLite → PostgreSQL + Alembic | 单库迁移 |
| — | 拟真城市母本（静态） | `content/world/cities/` ≥6 城 + `_schema` + `pop_segments` |

---

## 四、Phase C：生涯深化与自我认知

**入口条件**：Phase B（B1～B5）验收通过；PG 已迁移

| 工作项 | 验收标准 |
|--------|----------|
| LangGraph 编排上线 | Hermes-Debrief 升级为 RAG + LLM；可回忆上次对话 |
| Hermes-PathPlanner | 基于五维雷达推荐下周学习路径 |
| Persona 性格测评 | 量表 + 行为数据 → 推荐赛制与路径 |
| 五维雷达真实化 | 来自 `xp_events` + 赛制标签 + 练习数据 |
| World 域 MVP | `domains/world/` 落地；赛制开局注入城市快照 |

---

## 五、Phase D：知识图谱与课程生态

**入口条件**：Phase C 核心组件就绪

| 工作项 | 验收标准 |
|--------|----------|
| Atlas 掌握度 API | 知识点掌握度可查询、可被 Hermes 引用推荐 |
| Academy 进度回写 | 课程学习进度写入 Career |
| Hermes-QA | RAG 检索知识卡片 + 课程内容回答问题 |
| Tyche/Rival LLM 增强 | 赛中叙事 + 练习谈判对手人格 |

---

## 六、Phase E：OPC 与高级智能体

**入口条件**：Phase C LangGraph 编排稳定；Phase D Atlas 基本可用

| 工作项 | 验收标准 |
|--------|----------|
| OPC Cortex 拆单 | 学生管理指令 → Cortex 分派员工任务 |
| 2+ AI 员工 Worker | 开发、市场两个 LangGraph Worker 可执行任务 |
| Gateway 评审 | OPC 阶段跃迁需通过 Gateway 检查 |
| MCP Server 部署 | OPC-memory、OPC-sandbox 可用 |

---

## 七、Phase F：规模化与精细化

**入口条件**：Phase D/E 核心功能稳定；有试点校反馈数据

| 工作项 | 验收标准 |
|--------|----------|
| 多租户（`organization_id`） | 按校/机构隔离数据、配额、管理员 |
| 赛季系统 | 赛季榜 + 通行证 + 赛季复盘 |
| Credenti 认证链 | 成就可展示、可验证 |
| 教师/机构看板 | 班级数据、学情分析、教学建议 |

---

## 八、Phase 门控

| Phase | 能做 | 不能做 |
|-------|------|--------|
| **A（当前）** | Career 前端、正式赛控场、TechVenture 引擎、契约文档 | 建 `domains/world/` 表、OPC LangGraph 生产化 |
| **B** | Hermes 规则模板、Quest 服务、PG 迁移、家园 MVP | 跳过规则层直接上 LLM Agent |
| **C** | LangGraph 编排、Persona、World 域 MVP | — |
| **D** | Tyche/Rival LLM、Atlas API、课程框架 | — |
| **E** | OPC Worker、MCP Server、Gateway | — |

---

## 九、成本估算（月）

| 阶段 | 配置 | 月成本（RMB） |
|------|------|--------------|
| 开发/演示 | 2C4G VPS + SQLite | 50～100 |
| 试点（~100 用户） | 4C8G + PG + Redis | 200～400 |
| 小规模（~1,000） | 8C16G + PG 主从 | 600～1,200 |
| 规模化（~10,000） | 集群/云托管 + CDN | 2,000～5,000 |

---

*商域 BizSim Edu · 实施路线 v2.0*
