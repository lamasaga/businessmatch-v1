# 实施路线与里程碑

> **定位**：有序阶段蓝图——无硬性日期，以入口条件与验收标准驱动。
> **关联**：`03-ENGINEERING.md`（工程详表）· `01-PRODUCT.md`（产品定义）
> **最后更新**：2026-06-07

---

## 一、北极星

将 `webapp` 从「功能齐全的演示应用」演进为「可入校试点的模块化单体」——商赛引擎闭环、智能教练可用、生涯可感知、成本可覆盖。

---

## 二、Phase A：商赛引擎闭环（当前）

**入口条件**：仓库可运行、基础认证与数据模型就位

**目标**：正式赛 + 练习赛 + XP 入账 + Career 前端读账本 + 组织者控场——完成"辅助学校开展商赛"的最小闭环。

| 工作项 | 验收标准 | 现状 |
|--------|----------|------|
| FST RTS 正式赛 | 组织者建赛→学生房间码→即时商战（4 秒/日）→结束→XP 入账 | ✅ |
| FST 3.2 供需可见与叙事 HUD | 日历进度条、路线净利、公共订单（分阶段） | 🟡 见 `docs/prd/PRD-FST.md` |
| 练习赛入口 | 一键开练 + AI 对手 + 自动推进 + 低权重 XP | ✅ |
| 组织者独立端 | `:5174` 独立控场；学生端无控制台入口 | ✅ |
| 体验营营团 P1 | 教师建营团（6位码）→ 学生入营 → 营内建赛 → 控场 | ✅ |
| TechVenture 赛制 | v6 引擎 + 四端 React + 通用队伍模型 + 练习 AI | ✅ |
| Career 前端读账本 | `/career` 对接真实后端：XP + 金币 + 钻石 + 等级 + 近期比赛；家园入口加锁占位 | 🟡 |
| 赛事工坊 MVP | `/sandbox` 热 YAML、试跑、publish | 🟡 不阻塞 A |

**Phase A 退出条件**：上述 8 项中，标 🟡 的两项达到可用状态（Career 页能展示真实 XP、金币、钻石与等级；赛事工坊核心流程可跑通）。

---

## 三、Phase B：Arena 扩展与 Career 数据层

**入口条件**：Phase A 验收通过

**目标**：在 A 的闭环之上，扩展 Arena 的「营内对抗」新档位，并建立 Career 的完整数据层。

### B1：Arena 扩展

| 工作项 | 验收标准 |
|--------|----------|
| 营内对抗赛 | `match_kind=group_scrimmage` + 营团上下文；学生或教师发起；非 official |
| 在线匹配 | 营团内排队 → 真人匹配 → AI 填位 → 开局 |
| Game Shell 统一入口 | 所有赛制 `/games/:id/play` 全屏进游戏；运行时按 `meta.runtime` 分流 |
| 教学互动（Guided Demo） | 教师端可开启受控教学演示，学生按步骤体验赛制 |

### B2：Career 数据层

| 工作项 | 验收标准 |
|--------|----------|
| `career_profiles` + `GET /career/profile` | 生涯页无 mock：等级、XP、五维占位、资源余额、近期比赛 |
| `resource_ledger` + `economy.yaml` | 练习/正式赛结束发放 supplies（幂等）；资源类型 ≥3 种 |
| 家园 5 槽 + `GET/POST homestead` + UI Tab | 消耗物资升 1 级槽；不影响局内数值 |
| NPC 静态配置 + 关系度 + 2 章主线文案 | 完成 1 章解锁对话；静态 YAML 驱动 |

### B3：日常体验与规则层教练

| 工作项 | 验收标准 |
|--------|----------|
| Quest 服务 | 每日 Quest 可完成；练习赛挂钩 streak；后端持久化 |
| Hermes-Debrief（规则模板） | 正式赛结束后结构化复盘卡片；规则模板驱动，零 LLM Token |
| 五维雷达占位 | 静态五维展示 + 来自 `xp_events` 的真实数据映射 |

### B4：基础设施

| 工作项 | 验收标准 |
|--------|----------|
| SQLite → PostgreSQL + Alembic | 单库迁移；回滚方案；数据兼容性验证 |
| 拟真城市母本（静态） | `content/world/cities/` ≥6 城 + `_schema` + `pop_segments` |
| 性能基准 | PG 下 100 并发正式赛控场无阻塞 |

**Phase B 退出条件**：B1~B4 全部验收通过。

---

## 四、Phase C：AI 编排与生涯深化

**入口条件**：Phase B（B1~B4）验收通过；PG 已迁移

**目标**：LangGraph 编排上线，Hermes 从规则模板升级为 LLM 驱动，World 域落地。

| 子阶段 | 工作项 | 验收标准 |
|--------|--------|----------|
| C1 | LangGraph 编排上线 | Hermes-Debrief 升级为 RAG + LLM；可回忆上次对话 |
| C1 | Hermes-PathPlanner | 基于五维雷达推荐下周学习路径 |
| C2 | Persona 性格测评 | 量表 + 行为数据 → 推荐赛制与路径 |
| C2 | 五维雷达真实化 | 来自 `xp_events` + 赛制标签 + 练习数据 |
| C3 | World 域 MVP | `domains/world/` 落地；赛制开局注入城市快照 |

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
| **A（当前）** | Career 前端对接、正式赛控场、TechVenture 引擎、契约文档、赛事工坊 MVP | 建 `domains/world/` 表、OPC LangGraph 生产化 |
| **B1** | 营内对抗 + 在线匹配 + AI 填位、Game Shell 全引擎统一 | 抢跑 Hermes LLM、教师教研工作台 |
| **B2~B3** | Hermes-Debrief 规则模板、Quest 服务、家园 MVP、NPC 静态层 | 跳过规则层直接上 LLM Agent |
| **B4** | PG 迁移、静态城市母本、性能优化 | — |
| **C** | LangGraph 编排、Persona、World 域 MVP | — |
| **D** | Tyche/Rival LLM、Atlas API、课程框架 | — |
| **E** | OPC Worker、MCP Server、Gateway | — |

---

## 九、成本估算（月）

| 阶段 | 配置 | 月成本（RMB） |
|------|------|--------------|
| 开发/演示 | 2C4G VPS + SQLite | 50～100 |
| 试点（~100 用户）| 4C8G + PG + Redis | 200～400 |
| 小规模（~1,000）| 8C16G + PG 主从 | 600～1,200 |
| 规模化（~10,000）| 集群/云托管 + CDN | 2,000～5,000 |

---

*商识唯智 · 实施路线 v3.0*
