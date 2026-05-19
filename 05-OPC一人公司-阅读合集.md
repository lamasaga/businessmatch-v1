# OPC 一人公司 · 阅读合集

> **文档定位**：OPC（一人公司）的**根目录权威阅读版**——合并 `OPC/01～08、99` 的重复叙述，供决策与排期；**规格细则、MCP Schema、SOP 逐日手册**仍在 [`OPC/`](./OPC/) 子目录。
>
> **最后更新**：2026-05-19

---

## 目录

1. [OPC 是什么](#一opc-是什么)
2. [与主平台的关系](#二与主平台的关系)
3. [学生旅程：知识→商赛→首项目](#三学生旅程知识商赛首项目)
4. [系统架构（四层）](#四系统架构四层)
5. [创业流水线 IDEATE→SCALE](#五创业流水线-ideatescale)
6. [AI 员工与 Pedagogy OS](#六ai-员工与-pedagogy-os)
7. [技术路线与分期](#七技术路线与分期)
8. [融合与解锁](#八融合与解锁)
9. [现状、缺口与优先级](#九现状缺口与优先级)
10. [延伸阅读索引](#十延伸阅读索引)

---

## 一、OPC 是什么

> **让一个学生在具备商业素养与模拟经验后，以「管理者」身份运营一人公司，用 AI 数字员工团队完成人生第一个可展示、可验收、可迭代的真实或半真实项目。**

| 概念 | 说明 |
|------|------|
| **OPC（一人公司）** | 2025 年约 36% 新创为 solo founder；AI 将创业门槛从组织级降至个人级 |
| **AI 员工** | 有岗位、KPI、交付物、记忆——学生是**管理者**，不是「和 ChatGPT 聊天」 |
| **渐进真实** | 模拟币 → 测试用户 → 真实付费；**Gateway** 评审把关每一阶段跃迁 |
| **差异化** | 平台终局出口：模拟教育 → **真实商业能力孵化** |

　　趋势与数据详述：[OPC/01-OPC-愿景与趋势洞察.md](./OPC/01-OPC-愿景与趋势洞察.md)

---

## 二、与主平台的关系

```
Atlas / Academy / Quest / Arena / Credenti
              ↓
        Career Hub（统一档案 · Athena）
              ↓ [解锁 Gateway]
        OPC
              ↓
   IDEATE → VALIDATE → BUILD → LAUNCH → SCALE
```

| 原则 | 说明 |
|------|------|
| 数据不孤岛 | 共享 `user_id`、`career_id`、五维能力 |
| 入口自然 | OPC 是生涯达标后的**解锁区域**，非独立 App |
| 能力可回溯 | OPC 成就反哺 Credenti / XP |
| 教师不增负 | AI 承担日常教练；真人可选 Gateway 终审 |

　　融合详述：[OPC/05-与现有平台融合路径.md](./OPC/05-与现有平台融合路径.md)

---

## 三、学生旅程：知识→商赛→首项目

| 阶段 | 平台域 | AI 角色 | 产出 |
|------|--------|---------|------|
| ① 知识 | Atlas + Academy + Quest | Athena：路径、薄弱点 | 掌握度、素养标签 |
| ② 商赛 | Arena（practice + official） | Demia/Rival；Athena 复盘 | 决策日志、五维变化 |
| ③ 解锁 | Gateway + 启航仪式 | Athena 背书 | 进入 OPC |
| ④ 首项目 | OPC 流水线 | AI 员工 + Cortex 拆单 | BMC、MVP、验证报告 |

　　实施路径全文：[OPC/07-从平台学习到首项目-AI实施路径.md](./OPC/07-从平台学习到首项目-AI实施路径.md)

### 「第一个项目」定义（K12～高职）

| 维度 | 标准 |
|------|------|
| 形态 | Web/服务/内容等 **MVP** |
| 教育目标 | 走完想法→验证→可用 Demo，**不强制盈利** |
| 推荐终点 | IDEATE + VALIDATE + BUILD（内测）；LAUNCH 可选 |
| 交付物 | BMC、竞品报告、着陆页、可运行 Demo、Gateway 记录 |

---

## 四、系统架构（四层）

| 层 | 内容 |
|----|------|
| **体验层** | `/opc/*`：人才市场、任务中心、员工详情、BMC、Mission Control |
| **编排层** | Cortex（拆单）、LangGraph 工作流、任务状态机 |
| **能力层** | MCP Servers：memory、atlas、sandbox、ethos、report… |
| **隔离层** | gVisor 沙箱、权限、伦理审计 |

　　架构详述：[OPC/02-系统架构与AI员工体系.md](./OPC/02-系统架构与AI员工体系.md)

### 与 webapp 现状

| 已有 | 未有 |
|------|------|
| OPC 页面路由、`OPC.py` CRUD | LangGraph 生产工作流 |
| 员工/公司/任务数据模型 | MCP Server 部署 |
| mock / 本地演示交互 | Gateway 评分算法、配额计费 |

---

## 五、创业流水线 IDEATE→SCALE

| 阶段 | 目标 | 典型 AI 员工 |
|------|------|--------------|
| **IDEATE** | 机会识别、BMC 初稿 | 战略、市场研究 |
| **VALIDATE** | 用户访谈、竞品、假设检验 | 用户研究、数据分析 |
| **BUILD** | MVP、品牌、着陆页 | 开发、设计、文案 |
| **LAUNCH** | 获客、定价、发布 | 增长、运营 |
| **SCALE** | 留存、收入放大 | 财务、自动化 |

　　逐日 SOP：[OPC/venture-playbook/](./OPC/venture-playbook/)（01～05）  
　　流程总览：[OPC/03-创业孵化流水线.md](./OPC/03-创业孵化流水线.md)

---

## 六、AI 员工与 Pedagogy OS

### 6.1 设计问题（08 诊断摘要）

| 问题 | 整改方向 |
|------|----------|
| 竞技 vs 成长叙事冲突 | OPC 解锁**主路径**：课程+图谱+申请；商赛为加成 |
| AI 面孔过多（Athena/Rival/13 员工…） | 对外**一个教练**；OPC 内为**项目模式 + 临时 Worker** |
| 交互分裂（聊天 vs 任务卡 vs 表单） | 统一**任务卡片**；对话仅作 brief 输入 |
| OPC「代写」风险 | 强制 **Human Artifact** + 验收说明「我改了哪几处」 |
| 三套运行时未收敛 | **Pedagogy Orchestrator** + 事件 + Worker |

　　全文：[OPC/08-体系诊断与Agentic架构建议.md](./OPC/08-体系诊断与Agentic架构建议.md)

### 6.2 AI 员工（规格级）

- **13 角色**、3 梯队：见 [ai-employee-design/01-AI员工角色全览.md](./OPC/ai-employee-design/01-AI员工角色全览.md)  
- **Prompt 原则**：[02-系统Prompt设计.md](./OPC/ai-employee-design/02-系统Prompt设计.md)  
- **人机协议**（可交付 UI）：[04-人机交互协议.md](./OPC/ai-employee-design/04-人机交互协议.md)

### 6.3 MCP（实现级）

| Server | 用途 |
|--------|------|
| OPC-memory | 员工记忆 store/recall |
| OPC-atlas | 知识图谱查询 |
| OPC-sandbox | 代码沙箱 run/deploy |
| OPC-ethos | 伦理审计 |
| OPC-report | 报告生成 |

　　索引：[mcp-server-specs/01-MCP架构总览.md](./OPC/mcp-server-specs/01-MCP架构总览.md)

---

## 七、技术路线与分期

　　合并 [04-技术栈选型与实现路线](./OPC/04-技术栈选型与实现路线.md) 与 [04-实施路线](./04-实施路线与里程碑.md) §六：

| 期 | 重点 | 技术 |
|----|------|------|
| **A（0～6 月）** | webapp OPC CRUD + BMC + 手动任务 | FastAPI 已有；无 Agent |
| **B（6～12 月）** | Cortex + 2 员工 Worker | LangGraph + 2 MCP |
| **C（12～18 月）** | Gateway + 沙箱部署 | gVisor + ethos |
| **D（18 月+）** | LAUNCH 真实收入 | 支付 MCP、合规 |

**技术栈选型**：LangGraph（编排）、MCP（工具）、CrewAI 可选（角色组）、PostgreSQL 与主平台共库。

**代码起点**：[OPC/code-skeleton/](./OPC/code-skeleton/)

---

## 八、融合与解锁

| 解锁路径（建议） | 条件示例 |
|------------------|----------|
| **主路径** | Academy 核心单元 + Atlas 掌握度 + Athena 推荐 |
| **加速路径** | 商赛赛季表现 → **资源包**，非唯一资格 |
| **申请路径** | 教师/导师批准 + 简短陈述 |

　　避免「仅商赛前 30% 可进 OPC」单一竞技门槛（与成长花园叙事冲突）。

---

## 九、现状、缺口与优先级

　　来源：[OPC/99-查漏补缺与现状总结.md](./OPC/99-查漏补缺与现状总结.md)

### 已完成（规格资产）

- 框架 01～08、AI 员工、MCP 规格、DB/API、前端原型、venture-playbook、code-skeleton  
- 约 32 篇 MD + 5 份骨架代码（**规格就绪，非生产就绪**）

### P0 缺口（开发前必补）

| 缺口 | 说明 |
|------|------|
| **Gateway 评分算法** | 有表无算法文档 |
| **13 份 YAML Prompt** | 有原则无实例 |
| **成本与配额** | LLM/沙箱无配额 = 无商业模式 |

### P1 缺口（MVP 前）

- 教师监控面板  
- 支付 MCP 规格  
- CyberCore「一人公司挑战赛」集成  

### 与主平台路线图对齐

　　OPC **不抢** P0 的 Career / 组织者端 / practice 局；**Phase A** 与 webapp P2 并行，见 [04-实施路线与里程碑](./04-实施路线与里程碑.md)。

---

## 十、延伸阅读索引

| 需求 | 打开 |
|------|------|
| 趋势与愿景原文 | `OPC/01-` |
| 架构与员工体系 | `OPC/02-` |
| 孵化流程 | `OPC/03-` |
| 技术选型细节 | `OPC/04-` |
| 平台融合 | `OPC/05-` |
| 工具与参考 | `OPC/06-`、`100-开源项目资源库.md` |
| AI 实施路径 | `OPC/07-` |
| 体系诊断 | `OPC/08-` |
| 子系统规格库 | `OPC/00-规格库索引.md` |
| webapp OPC 页面 | `webapp/frontend/src/pages/OPC/` |

---

> **规格库入口**：[OPC/README.md](./OPC/README.md)（已精简为索引，阅读从本文开始。）
