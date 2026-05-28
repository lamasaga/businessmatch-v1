# 79 - AI 技术名词与概念详解 Wiki

> **文档定位**：商域 BizSim Edu 在 [81-六支柱全景](./81-商域AI赋能六支柱全景.md)、[77-投资人版](./77-商域AI作用全景-投资人版.md)、[78-Vibe Coding 实施指南](./78-智能体技术路线批判与VibeCoding实施指南.md) 及全仓智能体规划中出现的 **AI / Agent / 教学产品名词** 的**统一释义**；每项含：通俗解释、在本项目中的含义、代码/文档落点、阶段状态、易混淆项。
>
> **读者**：投资人（速查）、主理人、Vibe Coder、教研对接人  
> **维护**：新增 Agent 或对外新名词时，在本 Wiki 增一条并更新 §二索引表  
> **最后更新**：2026-05-28

---

## 一、如何使用本 Wiki

| 你的问题 | 建议跳转 |
|----------|----------|
| 「AI 赋能分哪几块？」 | [81-六支柱全景](./81-商域AI赋能六支柱全景.md) §一 |
| 「Athena 和 Cortex 有什么区别？」 | §三 产品角色 · [Athena](#athena) · [Cortex](#cortex) |
| 「LangGraph 是不是大模型？」 | §二 基础 · [LangGraph](#langgraph) · [LLM](#llm) |
| 「我们现在有没有 RAG？」 | 各词条 **本项目状态** 列 |
| 「投资人问的 Gateway 是什么？」 | [Gateway（OPC）](#gateway-opc) |
| 「Vibe Coding 和蓝图编程？」 | [Vibe Coding](#vibe-coding) · [蓝图编程](#blueprint-coding) |
| 「练习 AI 算不算 Agent？」 | [规则型 AI / 零 Token AI](#rule-based-ai) · [Agent](#agent) |

**图例（本项目状态）**

| 标记 | 含义 |
|------|------|
| ✅ 已落地 | `webapp` 可运行或文档/规则已固化 |
| 🟡 部分 | UI/mock/表结构有，生产逻辑未完成 |
| 📋 规划 | `04-` / `03-` / OPC 规格已写，代码未接 |
| 🔧 工程 | 指研发方式，非学生可见功能 |

---

## 二、速查索引（按字母 / 拼音）

### 2.1 英文 A～Z

| 名词 | 一句话 | 状态 |
|------|--------|------|
| [Agent](#agent) | 能感知环境、做决策、调工具的自主程序 | 规则 Agent ✅；LLM Agent 📋 |
| [Apollo](#apollo) | 教师学情看板（规划） | 📋 |
| [Athena](#athena) | 统一教练品牌：复盘/答疑/周计划 | 🟡 mock |
| [BMC](#bmc) | 商业模式画布 9 宫格 | ✅ OPC 页 |
| [Checkpoint](#checkpoint) | LangGraph 状态存档点 | 📋 |
| [ChromaDB / pgvector](#vector-db) | 向量数据库 | 📋 |
| [CloudEvents](#cloudevents) | 统一事件格式（规划） | 📋 |
| [Cortex](#cortex) | OPC 拆单与战略大脑 | 📋 |
| [CyberCore](#cybercore) | 声明式赛制配置+结算，非 LLM | ✅ |
| [Debrief](#debrief) | 赛后复盘卡片/流程 | 🟡 mock |
| [Demia](#demia) | 市场/人群叙事层 | 🟡 UI |
| [Embedding](#embedding) | 文本转向量 | 📋 |
| [Gateway（OPC）](#gateway-opc) | 创业阶段评审闸门 | 🟡 表/📋 算法 |
| [Hallucination](#hallucination) | 模型胡编事实 | 防护 📋 |
| [HACR](#hacr) | 人机成本比 | 📋 OPC 指标 |
| [Human-in-the-Loop](#human-in-the-loop) | 高风险人工确认 | 📋 |
| [LangGraph](#langgraph) | 状态图 Agent 编排框架 | 📋 |
| [Legacy](#legacy) | 跨赛季继承资产 | 📋 |
| [LiteLLM](#litellm) | 多模型 API 路由 | 📋 |
| [LLM](#llm) | 大语言模型 | 🟡 未大规模上线 |
| [MCP](#mcp) | Agent 调工具的标准协议 | 📋 |
| [MVP](#mvp) | 最小可行产品 | OPC 语境 📋 |
| [Pedagogy OS](#pedagogy-os) | 教学智能体编排总称 | 📋 架构 |
| [Persona](#persona) | 性格与赛制匹配 | 📋 |
| [POP](#pop) | 拟真城市人口/需求群体模型 | 📋 占位 |
| [RAG](#rag) | 检索增强生成 | 📋 |
| [Rival](#rival) | 谈判/博弈练习对手 | 🟡 UI |
| [RTS 单写者](#rts-single-writer) | 仅调度器推进 tick | ✅ |
| [Rule-based AI](#rule-based-ai) | 规则引擎对手/陪练 | ✅ |
| [Sandbox](#sandbox) | 隔离执行学生/Agent 代码 | 📋 |
| [Student OS](#student-os) | 统一学生侧编排（规划名） | 📋 |
| [Token](#token) | 模型计费与上下文单位 | 概念 ✅ |
| [Tool / Function Calling](#tool-function-calling) | 模型调外部函数 | 📋 |
| [trace_id](#trace-id) | 全链路追踪 ID | 📋 |
| [Vibe Coding](#vibe-coding) | AI 辅助即兴式开发 | 🔧 团队实践 |
| [Worker](#worker) | 编排图中的一个执行节点 | 📋 |
| [World](#world) | 拟真城市共享世界域 | 📋 |

### 2.2 中文与工程词

| 名词 | 见词条 |
|------|--------|
| 蓝图编程 | [Blueprint Coding](#blueprint-coding) |
| 规则层优先 | [规则层优先](#rules-first) |
| 零 Token | [Token](#token) · [Rule-based AI](#rule-based-ai) |
| 幂等 | [idempotency_key](#idempotency-key) |
| 记忆三层 | [记忆架构](#memory-layers) |
| 阶段 B0 / C- | [实施子阶段](#impl-subphases) |
| 幻觉 | [Hallucination](#hallucination) |
| 向量库 | [Vector DB](#vector-db) |
| 智能体 | [Agent](#agent) |
| 检索增强 | [RAG](#rag) |
| 架构决策记录 | [ADR](#adr) |

---

## 三、基础概念

### LLM {#llm}

| 项 | 内容 |
|----|------|
| **英文** | Large Language Model |
| **是什么** | 用海量文本训练、根据提示生成/理解自然语言的模型（如 GPT、Claude、DeepSeek、通义等）。 |
| **在本项目中** | 用于 **Athena 复盘/答疑**、战报润色、OPC 员工交付、Demia/Rival 对话；**不**用于对局结算、价格计算、XP 入账。 |
| **落点** | [03- §八](../03-技术架构与实现现状.md)；[04- §4.4](../04-实施路线与里程碑.md) Token 成本表 |
| **状态** | 🟡 产品以 mock/模板为主；[78-](./78-智能体技术路线批判与VibeCoding实施指南.md) 建议 **C-** 才接第一条生产 LLM 路径 |
| **易混淆** | ≠ 整个「AI 功能」；练习对手多为 [规则型 AI](#rule-based-ai) |

---

### Token {#token}

| 项 | 内容 |
|----|------|
| **是什么** | 模型读写的最小计费单位（约 0.75 个英文词或更少汉字）；输入+输出都计费。 |
| **在本项目中** | [04-](./04-实施路线与里程碑.md) 按场景估算月成本；策略：**练习零 Token、高价值节点才调 LLM**（77 §4.2）。 |
| **落点** | `ai_trader.py`、`rts_ai_levels.py`、`ai_team.py` → **0 Token** |
| **易混淆** | 「Token」≠ 登录 JWT；≠ 区块链 token |

---

### Agent {#agent}

| 项 | 内容 |
|----|------|
| **是什么** | 能根据目标**自主多步执行**的程序：可调用工具、维护状态、在失败时重试。 |
| **在本项目中** | 两档：**(1) 规则 Agent**——练习对手、自动推进，已上线；**(2) LLM Agent**——Athena Worker、OPC 员工，规划在 LangGraph 上。 |
| **落点** | 规则：`games/trading/`、`games/techventure/ai_team.py`；LLM：[03- §8.3](../03-技术架构与实现现状.md) |
| **状态** | 规则 ✅；LLM 📋 |
| **易混淆** | 聊天机器人不一定是 Agent（若无工具/多步规划）；本仓库 **NPC 练习 AI 通常不叫 LLM Agent** |

---

### AI 员工 {#ai-employee}

| 项 | 内容 |
|----|------|
| **是什么** | OPC 模块中由学生管理的**虚拟岗位**（市场、开发等），有 KPI 与交付物。 |
| **在本项目中** | 学生是**管理者**；员工执行任务通过 Cortex 拆单 + Worker（规划 LangGraph），非 13 个独立聊天入口（[OPC/08-](../OPC/08-体系诊断与Agentic架构建议.md)）。 |
| **落点** | `webapp` `/opc/*`；`OPC/ai-employee-design/` |
| **状态** | CRUD ✅；真实 Agent 📋 Phase E |

---

### Rule-based AI {#rule-based-ai}

| 项 | 内容 |
|----|------|
| **是什么** | 用 **if/权重/随机/公式** 决策的「对手或助手」，不调用大模型。 |
| **在本项目中** | 浮生记 RTS 三档、回合 `ai_trader`、TechVenture `ai_team`；可复现、可测、**零 Token**。 |
| **落点** | `rts_ai_levels.py`、`ai_trader.py`、`ai_team.py`、`practice_flow.py` |
| **状态** | ✅ |
| **见 also** | [CyberCore](#cybercore)、[ADR-005](../docs/decisions/005-浮生记RTS调度器单写者.md) |

---

### RAG {#rag}

| 项 | 内容 |
|----|------|
| **英文** | Retrieval-Augmented Generation |
| **是什么** | 先**检索**知识库片段，再交给 LLM **生成**答案，降低胡编。 |
| **在本项目中** | 计划索引：`inspire/c知识卡片库`、课程、赛制 YAML 摘要；用于 **Athena-QA**、Debrief 引用概念，**不**用于「教你这局怎么赢」。 |
| **落点** | [03- §8.5](../03-技术架构与实现现状.md)；[58-](./58-AI赋能的商业教育革命.md) §1.2 |
| **状态** | 📋；[78-](./78-智能体技术路线批判与VibeCoding实施指南.md) C- 建议**单索引**先行 |
| **易混淆** | ≠ 把整个 Wiki 塞进 prompt；需要 chunk、embed、检索、引用 |

---

### Embedding {#embedding}

| 项 | 内容 |
|----|------|
| **是什么** | 把一段文字变成固定长度**数字向量**，语义相近的文本向量距离更近。 |
| **在本项目中** | RAG 建库步骤之一；与 [Vector DB](#vector-db) 配合。 |
| **状态** | 📋 |

---

### Vector DB {#vector-db}

| 项 | 内容 |
|----|------|
| **是什么** | 存 embedding、按相似度检索的数据库（如 Chroma、pgvector、Milvus）。 |
| **在本项目中** | [03- §8.5](../03-技术架构与实现现状.md) **中期记忆**层；与 PostgreSQL 迁移（Phase B）同期规划。 |
| **状态** | 📋 |
| **易混淆** | SQLite 业务库 ≠ 向量库；不要为演示另建「第二个业务库」 |

---

### Hallucination {#hallucination}

| 项 | 内容 |
|----|------|
| **是什么** | 模型**自信地编造**不存在的事实（假排名、假交易、假引用）。 |
| **在本项目中** | Debrief 最大风险；对策：**先聚合对局事实**再让 LLM 润色（[78- B0/C-](./78-智能体技术路线批判与VibeCoding实施指南.md)）、RAG 带 citation、[58-](./58-AI赋能的商业教育革命.md) §五 置信度。 |
| **状态** | 防护机制 📋 |

---

### Tool / Function Calling {#tool-function-calling}

| 项 | 内容 |
|----|------|
| **是什么** | LLM 输出「调用某函数+参数」，由程序执行后把结果塞回模型。 |
| **在本项目中** | OPC 员工调沙箱、检索、报告生成；[MCP](#mcp) 是 Tool 的**标准化协议**版。 |
| **状态** | 📋；[78-](./78-智能体技术路线批判与VibeCoding实施指南.md) 建议先用普通 Python 函数再 MCP |

---

### Prompt {#prompt}

| 项 | 内容 |
|----|------|
| **是什么** | 发给模型的指令与上下文（含 system/user 消息）。 |
| **在本项目中** | Athena 人格卡（[03- §8.6](../03-技术架构与实现现状.md)）；OPC `ai-employee-design/02-系统Prompt`；须与 **结构化输出 schema** 配合。 |
| **状态** | 规格 🟡；生产 📋 |

---

### Temperature {#temperature}

| 项 | 内容 |
|----|------|
| **是什么** | 控制输出随机性：低（0.3～0.5）更稳；高（0.7～0.9）更创意。 |
| **在本项目中** | 复盘/规划用低温；Demia 叙事可用高温（[03- §8.6](../03-技术架构与实现现状.md)）。 |

---

### JSON Mode / Structured Output {#structured-output}

| 项 | 内容 |
|----|------|
| **是什么** | 强制模型输出可解析 JSON，便于填 Debrief 卡片字段。 |
| **在本项目中** | [78- C-](./78-智能体技术路线批判与VibeCoding实施指南.md) Debrief 第一步 LLM 必备能力。 |
| **状态** | 📋 |

---

## 四、编排、架构与协议

### LangGraph {#langgraph}

| 项 | 内容 |
|----|------|
| **是什么** | LangChain 生态下的**状态图**框架：节点=步骤，边=转移，支持检查点、中断、人机协作。 |
| **在本项目中** | **Pedagogy OS** 与 **OPC** 共用的编排主选（[03- §8.2](../03-技术架构与实现现状.md)）；非「大模型本身」。 |
| **状态** | 📋 Phase C；[78-](./78-智能体技术路线批判与VibeCoding实施指南.md) 要求 **C- 稳定后**再上，且第一图仅 4 节点 |
| **易混淆** | ≠ 在 FastAPI 里写 `while` 调 OpenAI；应先有 [Debrief](#debrief) 流水线 |

---

### Pedagogy OS {#pedagogy-os}

| 项 | 内容 |
|----|------|
| **是什么** | 本仓库对「教学侧智能体编排层」的**总称**：事件驱动 + 多 Worker + 单教练品牌。 |
| **在本项目中** | Athena / Demia / Rival / Persona 等作为 Worker；与 OPC 编排**收敛**同一 LangGraph 基建（[03- §8.7](../03-技术架构与实现现状.md)）。 |
| **状态** | 📋 架构已定；实现 🟡 |
| **见 also** | [Student OS](#student-os)、[OPC/08-](../OPC/08-体系诊断与Agentic架构建议.md) |

---

### Student OS {#student-os}

| 项 | 内容 |
|----|------|
| **是什么** | [OPC/08-](../OPC/08-体系诊断与Agentic架构建议.md) 提出的**统一学生侧运行时**：一份画像、一种事件格式、一个教练入口。 |
| **在本项目中** | 相对「三套运行时」（CyberCore / 平台 AI / OPC）的整合目标；[78-](./78-智能体技术路线批判与VibeCoding实施指南.md) 对应 **B+**「单教练入口」。 |
| **状态** | 📋 |

---

### Worker {#worker}

| 项 | 内容 |
|----|------|
| **是什么** | 编排图里**负责一类任务**的节点/子图（如 `Athena-Debrief Worker`）。 |
| **在本项目中** | 对外只暴露 **Athena** 品牌；Worker 是内部实现单元。 |
| **状态** | 📋 |

---

### MCP {#mcp}

| 项 | 内容 |
|----|------|
| **英文** | Model Context Protocol |
| **是什么** | Anthropic 推动的、让 Agent **标准化连接外部工具**（读文件、跑命令、查库）的协议。 |
| **在本项目中** | OPC 规格：`OPC/mcp-server-specs/`（memory、atlas、sandbox、report…）；[78-](./78-智能体技术路线批判与VibeCoding实施指南.md) **不建议**在掌握单进程 Tool 前全量上 MCP。 |
| **状态** | 📋 Phase E |
| **易混淆** | ≠ API Gateway；≠ 前端 MCP 插件 |

---

### Checkpoint {#checkpoint}

| 项 | 内容 |
|----|------|
| **是什么** | LangGraph 在每一步后**持久化图状态**，便于断点续跑、人机中断后续传。 |
| **在本项目中** | 依赖 PostgreSQL（[04-](./04-实施路线与里程碑.md) Phase B 迁移后更合适）。 |
| **状态** | 📋 |

---

### Human-in-the-Loop {#human-in-the-loop}

| 项 | 内容 |
|----|------|
| **是什么** | 关键步骤**必须等人确认**再继续（如 Gateway 通过、高风险 OPC 任务）。 |
| **在本项目中** | [03- §8.1](../03-技术架构与实现现状.md)、OPC Gateway、教师可选终审。 |
| **状态** | 📋 |

---

### trace_id {#trace-id}

| 项 | 内容 |
|----|------|
| **是什么** | 一次请求/一场复盘/一条 Agent 链路的**全局关联 ID**，用于日志与排错。 |
| **在本项目中** | [OPC/08-](../OPC/08-体系诊断与Agentic架构建议.md) 事件规范 v1；[78-](./78-智能体技术路线批判与VibeCoding实施指南.md) LangGraph 验收项。 |
| **状态** | 📋 |

---

### CloudEvents {#cloudevents}

| 项 | 内容 |
|----|------|
| **是什么** | 描述「发生了什么」的**标准事件信封**格式（类型、来源、时间、payload）。 |
| **在本项目中** | 规划统一 `match.finished`、`quest.completed`、`opc.milestone`（[OPC/08-](../OPC/08-体系诊断与Agentic架构建议.md)）。 |
| **状态** | 📋 |

---

### LiteLLM {#litellm}

| 项 | 内容 |
|----|------|
| **是什么** | 统一多家模型 API 的调用层，便于切换 DeepSeek/OpenAI 等。 |
| **在本项目中** | [OPC/08- §七](../OPC/08-体系诊断与Agentic架构建议.md) Tool Layer 选型参考。 |
| **状态** | 📋 |

---

### Sandbox {#sandbox}

| 项 | 内容 |
|----|------|
| **是什么** | **隔离环境**中执行不可信代码（学生 Demo、Agent 生成的脚本）。 |
| **在本项目中** | OPC BUILD 阶段；规划 gVisor/nsjail（[OPC/99-](../OPC/99-查漏补缺与现状总结.md)）。 |
| **状态** | 📋 |
| **易混淆** | ≠ Docker Compose 整站；≠ 赛制对局沙盒（对局在 SQLite+引擎内） |

---

### Rules-first {#rules-first}

| 项 | 内容 |
|----|------|
| **是什么** | [03- §8.1](../03-技术架构与实现现状.md) 原则：**规则层 → RAG → 完整 Agent**，不跳步。 |
| **在本项目中** | 练习 AI、结算、Gateway 初版都用规则；LLM 只做复盘/答疑/叙事。 |
| **见 also** | [77 §一](./77-商域AI作用全景-投资人版.md)、[78 §一](./78-智能体技术路线批判与VibeCoding实施指南.md) |

---

## 五、商域产品角色（智能域）

### Athena {#athena}

| 项 | 内容 |
|----|------|
| **是什么** | 平台**唯一对外教练品牌**（雅典娜）：路径建议、赛后复盘、答疑、周计划。 |
| **在本项目中** | 浮窗 + `mockPlatform` 模板；内部可拆 Worker：Debrief / PathPlanner / QA（[03- §8.4](../03-技术架构与实现现状.md)）。 |
| **落点** | 前端 Career 相关页；规划 `domains/` 或 `services/athena/` |
| **状态** | 🟡 ~25%（[08- §三](../08-工程现状与webapp实现详表.md)） |
| **易混淆** | ≠ Cortex（OPC 专用）；≠ 通用 ChatGPT 嵌入 |

---

### Demia {#demia}

| 项 | 内容 |
|----|------|
| **是什么** | **市场/人群叙事**层：评论供需、POP 反应、赛中旁白（非裁判）。 |
| **在本项目中** | UI 演示；远期服从 [World](#world) / [POP](#pop) 数值，**不得改写结算**（[75-](./75-拟真城市世界观设计.md)）。 |
| **状态** | 🔴 ~15%；LLM 增强 📋 Phase D/E |

---

### Rival {#rival}

| 项 | 内容 |
|----|------|
| **是什么** | **谈判/博弈**练习的对话式对手。 |
| **在本项目中** | 练习页 mock；与 [规则型 AI](#rule-based-ai) 表单对局不同。 |
| **状态** | 🟡 UI；LLM 📋 Phase D |

---

### Persona {#persona}

| 项 | 内容 |
|----|------|
| **是什么** | 性格测评 + 行为数据 → **推荐赛制与学习路径**。 |
| **在本项目中** | 设计见 `inspire/f早期调研`、归档 12；引擎 📋 Phase C。 |
| **状态** | 📋 |
| **注意** | 青少年人格不稳定，避免过度承诺（[OPC/08- §三](../OPC/08-体系诊断与Agentic架构建议.md)） |

---

### Apollo {#apollo}

| 项 | 内容 |
|----|------|
| **是什么** | **教师/机构**学情看板：班级画像、干预建议（规划）。 |
| **在本项目中** | 对应 [58-](./58-AI赋能的商业教育革命.md) §四 辅助教师；未实现。 |
| **状态** | 📋 Phase F |

---

### Cortex {#cortex}

| 项 | 内容 |
|----|------|
| **是什么** | OPC **战略大脑**：把学生自然语言需求**拆成**结构化任务分派给员工。 |
| **在本项目中** | 管理者范式核心；与 Athena **并列对内、不并列对学生**（应收敛为「教练 vs 项目模式」）。 |
| **落点** | `OPC/` 多份设计稿 |
| **状态** | 📋 Phase E |
| **易混淆** | ≠ LangGraph 本身；Cortex 是图中的一个（组）节点角色 |

---

## 六、OPC、生涯与商赛专用词

### Gateway（OPC） {#gateway-opc}

| 项 | 内容 |
|----|------|
| **是什么** | OPC 流水线 **IDEATE→VALIDATE→BUILD→…** 各阶段的**评审闸门**；通过才能晋级。 |
| **在本项目中** | Gateway 1～5；可 AI 初评 + 教师终审；**非**网络 API Gateway。 |
| **落点** | `OPC/platform-integration/03-`；表结构有，**算法文档缺口**（OPC/99-） |
| **状态** | 🟡 表；📋 算法 |
| **见 also** | [BMC](#bmc)、[MVP](#mvp) |

---

### BMC {#bmc}

| 项 | 内容 |
|----|------|
| **英文** | Business Model Canvas |
| **是什么** | 9 宫格商业模式画布（客户、价值、渠道等）。 |
| **在本项目中** | OPC 交付物；`webapp` `/opc/bmc` 编辑器 ✅。 |
| **易混淆** | ≠ [蓝图编程](#blueprint-coding) 的「蓝图」 |

---

### MVP {#mvp}

| 项 | 内容 |
|----|------|
| **英文** | Minimum Viable Product |
| **是什么** | 验证核心假设的**最简可用产品**（Demo/内测版）。 |
| **在本项目中** | **两义**：**(1)** OPC 学生创业交付物；**(2)** 文档中「现有 webapp MVP」= 整站可运行演示版。 |
| **见 also** | [77 §3.6](./77-商域AI作用全景-投资人版.md) |

---

### Debrief {#debrief}

| 项 | 内容 |
|----|------|
| **是什么** | **赛后复盘**：结构化卡片（亮点、失误、追问、建议）。 |
| **在本项目中** | `Athena-Debrief`；路由 `/career/debrief/:matchId` 当前 **DEBRIEF_MOCK**（[08- E5](../08-工程现状与webapp实现详表.md)）。 |
| **实施顺序** | 规则模板（B0）→ LLM 润色（C-）→ LangGraph 包装（C）（[78-](./78-智能体技术路线批判与VibeCoding实施指南.md)） |
| **状态** | 🟡 |

---

### CyberCore {#cybercore}

| 项 | 内容 |
|----|------|
| **是什么** | 本项目的**声明式赛制内核**：`content/game-configs/*.yaml` + `domains/cybercore` 加载 + `games/<engine>/` 结算。 |
| **在本项目中** | **非 LLM**；`trading-v1`、`trading-v2-rts`、`techventure-v1` ✅。 |
| **落点** | [ADR-004](../docs/decisions/004-CyberCore声明式赛制扩展.md) |
| **易混淆** | ≠ 任意「游戏配置」；扩展赛制不克隆 `trading.py` API |

---

### World {#world}

| 项 | 内容 |
|----|------|
| **是什么** | **拟真城市**共享世界域：城市母本、POP、政策情景、跨赛制快照。 |
| **在本项目中** | 终局出口 B（[07-](../07-拟真城市与区域模拟-阅读合集.md)）；Phase A **禁止** `domains/world/` 运行时（[ADR-008](../docs/decisions/008-Phase-A范围门控.md)）。 |
| **状态** | 📋 占位 `content/world/cities/` |

---

### POP {#pop}

| 项 | 内容 |
|----|------|
| **英文** | Population-Oriented Participant（本仓库用法） |
| **是什么** | 城市中**需求侧人群分群**（类似 P 社 POP），驱动叙事与规则参数。 |
| **在本项目中** | 与 TechVenture `geek/pragmatic/trendy` 对齐；Demia 叙事须服从 POP 数值（[75-](./75-拟真城市世界观设计.md)）。 |
| **状态** | 📋 |

---

### Legacy {#legacy}

| 项 | 内容 |
|----|------|
| **是什么** | 跨赛季/阶段**继承**的称号、资产、加成。 |
| **在本项目中** | [OPC/06-](./06-附录-工具矩阵与参考资源.md) 术语；与 [06-生涯模式](../06-生涯模式-大循环家园与资源经济.md) 赛季传承相关。 |
| **状态** | 📋 |

---

### HACR {#hacr}

| 项 | 内容 |
|----|------|
| **英文** | Human-AI Cost Ratio |
| **是什么** | 人机成本比：衡量 AI 投入相对人力是否划算。 |
| **在本项目中** | OPC 运营指标（[OPC/06-](./06-附录-工具矩阵与参考资源.md)）。 |
| **状态** | 📋 |

---

## 七、数据、记忆与工程

### 记忆架构 {#memory-layers}

| 层 | 存什么 | 生命周期 | 本项目 |
|----|--------|----------|--------|
| **短期** | 当前对话上下文 | 单次会话 | 内存/Redis 📋 |
| **中期** | 摘要、复盘要点、检索片段 | 跨会话 | 向量库 📋 |
| **长期** | 五维雷达、掌握度、里程碑 | 永久 | `career_profiles` 等 📋 [03- §8.5](../03-技术架构与实现现状.md) |

　　**跨会话工程记忆**（给 Vibe Coder）：见 [ADR](../docs/decisions/README.md)、[蓝图编程](#blueprint-coding)，非学生产品功能。

---

### idempotency_key {#idempotency-key}

| 项 | 内容 |
|----|------|
| **是什么** | 幂等键：同一键重复提交**只生效一次**。 |
| **在本项目中** | `xp_events` 防重复发 XP；Agent 重试 Debrief 时也必须设计（[ADR-007](../docs/decisions/007-生涯经验幂等账本.md)）。 |
| **状态** | ✅ XP；Debrief 📋 |

---

### RTS 单写者 {#rts-single-writer}

| 项 | 内容 |
|----|------|
| **是什么** | 浮生记 RTS **仅** `rts_scheduler.py` 推进 tick；HTTP 只读。 |
| **在本项目中** | 与 Agent「单 Orchestrator 写状态」同构（[78- §4.0](./78-智能体技术路线批判与VibeCoding实施指南.md)）。 |
| **落点** | [ADR-005](../docs/decisions/005-浮生记RTS调度器单写者.md) |
| **状态** | ✅ |

---

### settle_match_rewards {#settle-match-rewards}

| 项 | 内容 |
|----|------|
| **是什么** | 赛后**唯一推荐入口**：向 career 域发放 XP/资源。 |
| **在本项目中** | 赛制禁止直接改 `users.experience`（[ADR-007](../docs/decisions/007-生涯经验幂等账本.md)）。 |
| **状态** | ✅ 正式赛路径 |

---

## 八、研发方法论名词

### Vibe Coding {#vibe-coding}

| 项 | 内容 |
|----|------|
| **是什么** | 以自然语言驱动 AI（如 Cursor）**快速写代码**的方式；强依赖上下文与约束，弱依赖先写完整规格。 |
| **在本项目中** | 团队主要生产力（[01- §一](../01-平台愿景与产品架构.md)）；须配 [蓝图编程](#blueprint-coding) 防漂移（[78-](./78-智能体技术路线批判与VibeCoding实施指南.md)）。 |
| **状态** | 🔧 实践 ✅ |

---

### Blueprint Coding {#blueprint-coding}

| 项 | 内容 |
|----|------|
| **是什么** | **蓝图编程**：以 `00～09` 文档 + `.cursor/rules` + ADR 为约束层，AI 在边界内实现。 |
| **在本项目中** | 手册：[蓝图编程方法论](../蓝图编程方法论——AI辅助大型工程实践指南.md)；示范 tag：`蓝图coding示范文档`。 |
| **状态** | 🔧 ✅ |

---

### ADR {#adr}

| 项 | 内容 |
|----|------|
| **英文** | Architecture Decision Record |
| **是什么** | 记录「为什么这样定架构」的短文。 |
| **在本项目中** | [`docs/decisions/`](../docs/decisions/README.md) 001～008。 |
| **易混淆** | ≠ 投资人 Wiki；≠ `08-` 变更记录（记 what，ADR 记 why） |

---

### Phase / B0 / C- {#impl-subphases}

| 名词 | 含义 |
|------|------|
| **Phase A～F** | [04-](./04-实施路线与里程碑.md) 产品阶段门控 |
| **B0** | [78-](./78-智能体技术路线批判与VibeCoding实施指南.md) 工程子阶段：Career 真数据 + 规则 Debrief，**无 LLM** |
| **B+** | 单教练入口 + Quest 后端 + 今日 3 件事 |
| **C-** | 最小 LLM（一场一调 Debrief + 小 RAG + 降级） |
| **C** | LangGraph 包装已有流水线 |

---

## 九、与 77 / 78 的对应关系

| 文档 | 本 Wiki 用法 |
|------|----------------|
| [77-](./77-商域AI作用全景-投资人版.md) | 看到名词 → 来 79 查**准确定义与是否已落地** |
| [78-](./78-智能体技术路线批判与VibeCoding实施指南.md) | 看到 B0/C-/LangGraph → 查 §八 实施子阶段 + 各词条 **状态** |
| [58-](./58-AI赋能的商业教育革命.md) | 场景灵感；实现度以 79 **状态** 列为准 |
| [03- §八](../03-技术架构与实现现状.md) | 架构源；79 做通俗化 |
| [OPC/06- 术语表](../OPC/06-附录-工具矩阵与参考资源.md) | OPC 专词子集；79 覆盖全平台 |

---

## 十、贡献与更新规则

1. 新名词先加 §二索引，再写详解（模板：是什么 → 在本项目中 → 落点 → 状态 → 易混淆）。  
2. 落地后把 📋 改为 ✅，并更新 `08-` §三百分比（推送前文档对齐）。  
3. 与 OPC 重复的词条，以 **79 为全平台索引**，OPC/06 可保留 OPC 专深附录。  

---

*商域 BizSim Edu · Inspire 79 · AI 名词 Wiki*
