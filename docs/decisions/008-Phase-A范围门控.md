# ADR-008: Phase A 范围门控

**日期**：2026-05-21  
**状态**：已采纳  
**触发**：M4、R3

---

## 上下文

　　产品路线图包含 **World 拟真城市**、**OPC 一人公司 LangGraph**、**Hermes LLM 复盘** 等终局能力。若在商赛引擎尚未闭环时投入，会导致表结构泛滥、AI 会话目标发散、文档与代码长期不一致。

---

## 决策

　　当前处于 **Phase A（商赛引擎闭环）**。默认 AI 编程与人类开发**只做 Phase A 清单内**工作；Phase B+ 能力仅允许**规划文档与占位**（如 `content/world/cities/`），**禁止**提前落地：

| Phase A 可以做 | Phase A 不该做（示例） |
|----------------|------------------------|
| Career 前端对接、正式赛控场完善 | 建 `domains/world/` 表与 API |
| `contracts/` 契约、TechVenture 引擎完善 | OPC LangGraph + MCP 生产化 |
| 拟真城市**阅读合集与 YAML 占位** | 跨局持久化城市状态、赛制结算接 World |
| `xp_events` / `settle_match_rewards` 深化 | 跳过规则层直接上 LLM Agent |

　　Phase 推进时须**同时**更新 `04-`、`blueprint-coding.mdc` §7「当前 Phase」标记，并视情况新增 ADR 说明「为何现在放开」。

**落地位置**：

- `04-实施路线与里程碑.md`
- `.cursor/rules/blueprint-coding.mdc` §7
- `07-` 拟真城市合集（终局出口 B）、`05-` OPC（终局出口 A）

---

## 考虑过的方案

| 方案 | 优点 | 缺点 | 未采用原因 |
|------|------|------|------------|
| 不设 Phase，功能驱动并行 | 灵活 | AI 过度建设；仓库失控 | 已多次险些偏离 |
| 按周 Sprint 硬日期 | 传统项目管理 | 与 AI 协作节奏不匹配 | 项目采用「有序蓝图」见 `04-` |
| **Phase 门控表 + 默认 Phase A（已采纳）** | 会话简报可写 Phase；规则可自动注入 | 需要人记得更新 Phase 标记 | 与蓝图编程一致 |

---

## 后果

### 正面

- 新对话默认不建 World 域、不抢 OPC 进度
- `08-` 对齐度百分比反映真实缺口（如 Career 🟡）

### 负面 / 代价

- 「想先做 OPC 演示」会被规则挡住 — 须显式声明并评估是否升 Phase

### 给初学者的操作提示

- **可以做的**：开场写「Phase A，做 XXX」；读 `04-` §二当前阶段
- **不要做的**：未说明 Phase 就让 AI 建 `domains/world/` 或接 LangGraph
- **相关阅读**：ADR-001、`04-`、`07-`/`05-` 仅当调研终局出口时读

---

## 关联

- ADR-001、ADR-002
- 规则：`blueprint-coding.mdc` §7
