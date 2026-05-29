# agent.md · 商域 BizSim Edu · 项目第一入口

> **你是从哪里开始读的**：打开本仓库后，**请先读本文**，再按任务进入 `00～09` 权威文档或 `webapp/` 代码。  
> **最后更新**：2026-05-30

---

## 一、本文是什么（与其它文档的分工）

| 文档 | 层级 | 职责 |
| ---- | ---- | ---- |
| **agent.md（本文）** | **第 0 层 · 总入口** | 导航、协作立场、纪律索引、会话怎么开；**不写** API 表、实现度百分比、完整目录树 |
| [**README.md**](./README.md) | 第 1 层 · 对外门户 | GitHub 访客：一句话介绍、如何启动、指向本文与 `00-` |
| [**00～09**](./00-项目全景与目录结构.md) | **第 2 层 · 编写代码时的权威与事实** | 产品定义、工程详表、Phase、域边界、任务→文档链；**08-** 为实现度唯一真相源 |
| [**inspire/**](./inspire/50-目录导航.md) | 构想库（非编程契约） | 方向性长文；**仅由权威文档链入**，文内互链见链接纪律 |

```text
打开项目 → agent.md（导航 + 立场）
              ├─ 写代码 / 查事实 → 00～09（尤其 08-、03-、02-）
              ├─ 开 AI 会话 → 09- §6.0 开场指南 + .cursor/rules/
              ├─ 跑起来 → webapp/README.md
              └─ 读构想 / 教研 → 00- §1.4 inspire 索引 → inspire/50-
```

---

## 二、按任务导航（30 秒选型）

| 我要… | 下一步 |
| ----- | ------ |
| **写代码、改 API、查做到哪了** | [`08-` AI_DEFAULT 快照](./08-工程现状与webapp实现详表.md#ai_default) → 域 [`DESIGN.md`](./webapp/backend/app/domains/career/DESIGN.md) / [`ARCHITECTURE.md`](./webapp/backend/app/domains/arena/ARCHITECTURE.md) → 按需 [`03-`](./03-技术架构与实现现状.md) |
| **懂产品主线、赛制、双端** | [`01-愿景`](./01-平台愿景与产品架构.md) → [`02-赛事`](./02-赛事体系与双端产品.md) |
| **排期与 Phase** | [`04-实施路线`](./04-实施路线与里程碑.md) |
| **竖切开发、AI 协作流程** | [`09-分项目流程`](./09-分项目开发与集成流程.md)（含 **§6.0 会话开场指南**） |
| **弄清仓库结构与选读路径** | [`00-项目全景`](./00-项目全景与目录结构.md) |
| **本地启动演示** | [`webapp/README.md`](./webapp/README.md) |
| **体验营 P1（营团+商赛）** | [`02-` §5.3](./02-赛事体系与双端产品.md) · `08-` AI_DEFAULT · `arena/ARCHITECTURE.md` 体验营节 |
| **读 AI 六支柱 / 教师端构想等** | [`00-` §1.4 inspire 专题索引](./00-项目全景与目录结构.md#14-inspire-专题索引权威外链维护点) → [`inspire/50-`](./inspire/50-目录导航.md) |
| **重大选型之「为什么」** | [`docs/decisions/`](./docs/decisions/README.md) |

---

## 三、编写代码时的权威（事实从哪来）

　　**凡涉及实现、路由、表归属、Phase 能否做**，以 **`00～09` + `docs/decisions/` + 各域 `DESIGN.md`** 为准，**不以 inspire 构想稿为准**。

| 问题 | 唯一 / 首选真相源 |
| ---- | ---------------- |
| 路由、API、Bug、实现度 % | [`08-` AI_DEFAULT](./08-工程现状与webapp实现详表.md#ai_default)（勿全文 attach `08-`/`07-`） |
| 练习 / 正式、`game_config_id` | [`02-`](./02-赛事体系与双端产品.md) §5.0 |
| 域边界、新赛制 checklist | [blueprint-coding.mdc](./.cursor/rules/blueprint-coding.mdc) · [`arena/ARCHITECTURE.md`](./webapp/backend/app/domains/arena/ARCHITECTURE.md) |
| Phase 门控 | [`04-`](./04-实施路线与里程碑.md) · blueprint §7 |
| RTS tick 推进 | ADR-005 · blueprint §4 |

　　当前默认 **Phase A（商赛引擎闭环）**：未明确要求时，不抢跑 World 域表、OPC LangGraph、全站无约束 LLM 聊天。

---

## 四、AI 编程会话：怎么开

　　完整开场模板、**T0/T1/T2 任务包**、注入矩阵见 **[`09-` §6.0～6.1](./09-分项目开发与集成流程.md#60-会话开场指南主理人--agent-入口)**。每次会话 **2～3 句**声明：做什么 · Phase · 涉及域。

| 层 | 内容 | 预算 |
|----|------|------|
| **T0** | 本文 + `.cursor/rules/` | ≤4k（自动） |
| **T1** | `08-` [AI_DEFAULT](./08-工程现状与webapp实现详表.md#ai_default) + `09-` §6.1 任务包所列 1～2 份 | ≤12k |
| **T2** | `08-` 全表、`05-`/`07-` 深读、inspire 长文 | 按需 grep/局部 Read |

　　**禁止**默认全文 attach [`08-`](./08-工程现状与webapp实现详表.md)、[`07-`](./07-拟真城市与区域模拟-阅读合集.md)、[`蓝图编程方法论`](./蓝图编程方法论——AI辅助大型工程实践指南.md)。

---

## 五、工程纪律索引（摘要）

　　全文见 [blueprint-coding.mdc](./.cursor/rules/blueprint-coding.mdc)。会话中最易违反的条目：

1. **单库单进程** — 禁止第二套 SQLite/API  
2. **域边界** — 跨域只经 API 或域事件  
3. **新赛制** — `game-configs/*.yaml` + `games/<engine>/`；禁止克隆整文件  
4. **RTS** — 仅调度器推进 tick；HTTP 只读  
5. **XP** — `grant_xp` / `settle_match_rewards`；幂等  
6. **双前端** — 学生端 / 组织者端分离；新功能接 API，不扩 mock  
7. **AI 产品** — 规则优先、LLM 渐进、教师不替代（见 `inspire/81-` 产品框架，入口经 `00-` §1.4）

　　推送 GitHub 前：大型更新须 [docs-align-before-push.mdc](./.cursor/rules/docs-align-before-push.mdc) 对齐 `00～09` / `08-`。

---

## 六、文档与链接纪律

| 规则 | 说明 |
| ---- | ---- |
| **链入 inspire** | **仅** `agent.md`、`README.md`、`00～09` 可维护指向 `inspire/` 的 Markdown 链接；详见 [doc-linking.mdc](./.cursor/rules/doc-linking.mdc) |
| **inspire 文内** | 可链向 `00～09`、`agent.md`、`webapp/`、`docs/decisions/`；**禁止** `inspire/` 之间相互链接（用编号指称，索引进 [`50-`](./inspire/50-目录导航.md)） |
| **inspire 文风** | 充分叙述目的与意图，见 [inspire-writing.mdc](./.cursor/rules/inspire-writing.mdc) |

---

## 七、对 AI Agent 的行为声明

1. **先读本文导航**，再打开任务对应的 `00～09` 权威节，不凭印象改代码。  
2. **有歧义时问主理人** Phase 与域，不擅自扩大范围。  
3. **inspire 超前于代码** 时，以 `08-` 与 Phase 为准；构想只作方向参考。  
4. **文档改动**：契约表可精炼；`inspire/` 须保留「为什么」叙述段。  
5. **未授权不 commit / push**；不修改 git config。  
6. 中文叙述段：独立成段时段首 **两个全角空格（`　　`）**。

---

## 八、规则文件索引

| 规则 | 路径 |
| ---- | ---- |
| 蓝图编程 | [blueprint-coding.mdc](./.cursor/rules/blueprint-coding.mdc) |
| 推送前文档对齐 | [docs-align-before-push.mdc](./.cursor/rules/docs-align-before-push.mdc) |
| ADR 编写 | [adr-writing.mdc](./.cursor/rules/adr-writing.mdc) |
| Inspire 文风 | [inspire-writing.mdc](./.cursor/rules/inspire-writing.mdc) |
| 文档链接纪律 | [doc-linking.mdc](./.cursor/rules/doc-linking.mdc) |
| 任务上下文包 | [.cursor/skills/context-pack/](./.cursor/skills/context-pack/SKILL.md) |

---

## 九、维护说明

- **产品线 / 新端 / Phase 推进**：更新 [`00-`](./00-项目全景与目录结构.md) 与 [`08-`](./08-工程现状与webapp实现详表.md)；本文 §二 导航仅在有**新入口级**变化时改。  
- **新增稳定 inspire 专题（50+ 编号）**：登记 [`inspire/50-`](./inspire/50-目录导航.md)，并在 [`00-` §1.4](./00-项目全景与目录结构.md#14-inspire-专题索引权威外链维护点) 增加**一条**权威外链。  
- **AI 协作流程变更**：改 [`09-`](./09-分项目开发与集成流程.md) §六，本文 §四 保持链指向即可。
