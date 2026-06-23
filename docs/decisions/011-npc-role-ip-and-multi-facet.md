 # ADR-011: NPC 角色 IP 与多能力面（Facet）架构

 **日期**：2026-06-22  
 **状态**：已采纳  
 **触发**：M1（多方案选型）、M3（域边界/表归属调整）、R3（Phase 边界变化导致新能力进入当前阶段）

 ---

 ## 上下文

 项目进入 Phase A/B 交界后，产品目标明确要求「初步的 AI 教练」和「基础的角色 NPC 对手和队友」全部实现。现有代码中的 AI 对手是匿名级别（如 `chaotic` / `advanced`），没有角色感；Career 域也缺少 NPC 关系数据层。  
 我们需要决定：如何把「AI 对手」「可雇佣队友」「故事背景角色」统一到一个可扩展的角色体系里，同时不破坏现有比赛引擎的公平性与可复现性。

 ---

 ## 决策

 我们决定采用 **「角色 IP（Persona）+ 多能力面（Facet）」** 的架构：

 - 一个 NPC 是一张人物设定卡（名字、背景、语气、价值观、头像）。
 - 同一张角色卡可以开启多个能力面：`opponent`（对手）、`teammate`（队友）、`story`（故事角色）。
 - 每个能力面有独立的行为参数和解锁条件，互不影响。
 - 对局内只使用能力面的策略参数，不使用 LLM；角色 IP 只影响展示和赛后文案。
 - NPC 与玩家的关系数据（关系度、胜负记录、成长参数）由 Career 域独占写入。

 **落地位置**：

 - 内容配置：`content/career/npcs.yaml`
 - 规则复盘模板：`content/career/debrief/*.yaml`
 - 加载器：`webapp/backend/app/domains/career/npc_loader.py`
 - 实例工厂：`webapp/backend/app/domains/career/npc_factory.py`
 - 成长适应：`webapp/backend/app/domains/career/npc_adaptation.py`
 - 复盘服务：`webapp/backend/app/domains/career/services/debrief.py`
 - 数据表：`npc_personas`、`npc_relationships`、`match_npc_instances`

 ---

 ## 考虑过的方案

 | 方案 | 优点 | 缺点 | 未采用原因 |
 |------|------|------|------------|
 | A. 每个 NPC 类型单独建表 | 简单直观 | 角色复用困难；一个 NPC 同时是对手和队友时需要冗余数据 | 不满足「一个 NPC 多角色复用」的需求 |
 | B. 把 NPC 行为全部交给 LLM | 表达自然、有角色感 | 对局内成本高、延迟大、不可复现、可能不公平 | 违反「对局内零 LLM」原则 |
 | C. **角色 IP + 多 Facet（已采纳）** | 人设一致、能力面隔离、规则 AI 可复用、可渐进演化 | 需要新增配置层和关系表 | 最符合当前阶段目标与成本约束 |

 ---

 ## 后果

 ### 正面

 - 同一角色 IP 可以无缝出现在比赛、生涯、家园三个场景，体验连续。
 - 对局引擎不需要关心人设，只接收策略参数，公平性和可测试性不变。
 - 教研/主理人可以通过改 YAML 新增 NPC，不需要改引擎代码。
 - 成长演化被限制在参数空间内，可审计、可回滚。

 ### 负面 / 代价

 - 需要新增 3 张表和 1 套配置加载器，初期工作量比「匿名 AI 级别」大。
 - 队友系统如果要做深（局内配合、团队决策），会触及 Arena 组队模型，需要单独设计。
 - 故事角色章节内容生产需要文案/策划持续投入。

 ### 给初学者的操作提示

 - **可以做的**：
   - 在 `content/career/npcs.yaml` 里新增角色，并为其开启一个或多个 facet。
   - 在 `content/game-configs/*.yaml` 的 `ai_strategies` 中通过 `persona_id` 绑定角色。
   - 在 Career 域新增 `npc_relationships` 记录来存储玩家与 NPC 的长期关系。
 - **不要做的**：
   - 不要在对局决策函数里调用 LLM。
   - 不要让 Arena 域直接修改 `npc_relationships` 表。
   - 不要把角色 IP 写死进引擎 Python 代码。
 - **相关阅读**：
   - `docs/agent-ai-coach-npc-implementation-guide.md`
   - `webapp/backend/app/domains/career/DESIGN.md` §3
   - `inspire/80-角色IP复用与可成长规则NPC-Agent框架.md`
   - `inspire/90-AI对手NPC化与成长演化系统PRD.md`

 ---

 ## 关联

 - 规则：`.cursor/rules/blueprint-coding.mdc`（域边界、Phase 门控）
 - 文档：`03-ENGINEERING.md` §对齐度表 · `04-ROADMAP.md` §Phase B
 - 其他 ADR：ADR-004（CyberCore 声明式赛制扩展）、ADR-007（生涯经验幂等账本）
