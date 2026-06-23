 # AI 教练与 NPC 角色 AGENT 实现教程

 > **文档定位**：面向开发者的逐步教程——如何在商识唯智平台内实现「AI 教练（Hermes/Athena）」与「可复用 NPC 角色（对手 / 队友 / 故事角色）」。  
 > **适用阶段**：Phase A 收尾 ～ Phase B3。  
 > **关联文档**：`03-ENGINEERING.md` · `domains/career/DESIGN.md` · `04-ROADMAP.md` · `inspire/80-角色IP复用与可成长规则NPC-Agent框架.md` · `inspire/90-AI对手NPC化与成长演化系统PRD.md`  
 > **最后更新**：2026-06-22

 ---

 ## 一、本教程要讲什么

 读完本教程，你应该能独立完成以下三件事：

 1. **AI 教练赛后复盘**：比赛结束后自动生成结构化复盘卡片，先规则模板、后可选择 LLM 润色。
 2. **NPC 角色化对手**：把现有匿名 AI 级别（如 `chaotic` / `advanced`）替换为有名字、有策略、可成长的 NPC 角色。
 3. **多能力面 NPC**：让同一个 NPC 同时是「对手」「可雇佣队友」「故事角色」，且各能力面数据隔离。

 本教程**不**讲大模型微调、强化学习或复杂 Agent 编排；优先保证规则层先跑通、成本可控、体验可验收。

 ---

 ## 二、核心原则（先记住这五条）

 | # | 原则 | 为什么 |
 |---|------|--------|
 | 1 | **对局内零 LLM** | 保证延迟、成本、公平、可复现 |
 | 2 | **规则优先，LLM 只润色** | 先有不靠 LLM 也能跑通的最小闭环 |
 | 3 | **角色 IP 与策略参数分离** | 同一个人设可以换策略，同一策略可以换人设 |
 | 4 | **学习只调参，不改规则** | NPC 成长必须在可审计、可回滚的参数空间内 |
 | 5 | **Career 域拥有关系数据** | NPC 与玩家的关系、成长进度只能由 Career 域写入 |

 ---

 ## 三、整体架构

 ```text
 ┌─ 内容层（YAML）────────────────────────────┐
 │  content/career/npcs.yaml        NPC 角色卡  │
 │  content/career/debrief/*.yaml   复盘规则模板 │
 │  content/game-configs/*.yaml     赛制策略库   │
 └──────────────────────┬───────────────────────┘
                        │
 ┌─ 平台层（FastAPI）────┴───────────────────────┐
 │  domains/career/        关系数据、成长、奖励   │
 │  domains/arena/         比赛生命周期          │
 │  games/<engine>/        规则 AI 决策内核       │
 └──────────────────────┬───────────────────────┘
                        │
 ┌─ 前端层（React）──────┴───────────────────────┐
 │  学生端 /career         生涯页、NPC 关系展示   │
 │  学生端 /career/debrief 赛后复盘卡片           │
 │  教师端                班级讲评草稿（可选）    │
 └──────────────────────────────────────────────┘
 ```

 ---

 ## 四、第一步：实现 AI 教练赛后复盘（规则模板版）

 ### 4.1 目标

 比赛结束后，学生能在 `/career/debrief/:match_id` 看到一张复盘卡片：

 - 3 个观察点（基于真实比赛数据）
 - 1 个改进建议
 - 1 个相关练习推荐
 - 每条结论都可追溯到具体轮次 / 数据字段

 ### 4.2 新增内容配置

 创建 `content/career/debrief/trading.yaml`：

 ```yaml
 # 规则复盘模板：按比赛事实触发
 rules:
   - id: inventory_pileup
     name: 库存积压
     engine: trading
     condition:
       field: max_inventory_ratio
       operator: gt
       value: 0.7
     observations:
       - "第 {round} 轮你的库存占用率达到 {value}，资金沉淀较多。"
       - "在 {city} 持有 {product} 数量 {qty}，当轮未售出。"
     suggestion: "尝试把库存上限控制在 50% 以下，或优先前往高 bid 城市出货。"
     related_quest: quest_inventory_management_01

   - id: cash_idle
     name: 现金闲置
     engine: trading
     condition:
       field: cash_ratio
       operator: gt
       value: 0.6
     observations:
       - "多轮现金占比超过 {value}，机会成本较高。"
     suggestion: "在保证安全垫的前提下，把更多现金投入到有价差机会的商品中。"
     related_quest: quest_arbitrage_01
 ```

 ### 4.3 新增服务层

 在 `webapp/backend/app/domains/career/services/debrief.py` 实现：

 ```python
 from typing import List, Dict, Any
 from dataclasses import dataclass

 @dataclass
 class DebriefCard:
     observations: List[str]
     suggestion: str
     related_quest_ids: List[str]
     citations: List[Dict[str, Any]]

 def generate_debrief(match_id: int, user_id: int) -> DebriefCard:
     """幂等生成复盘卡片。"""
     facts = aggregate_match_facts(match_id, user_id)
     rules = load_debrief_rules(facts["engine"])

     observations = []
     citations = []
     suggestion = ""
     quests = []

     for rule in rules:
         if evaluate_condition(rule["condition"], facts):
             obs = render_observation(rule["observations"], facts)
             observations.extend(obs)
             citations.append({
                 "rule_id": rule["id"],
                 "round": facts.get("relevant_round"),
                 "field": rule["condition"]["field"]
             })
             if not suggestion:
                 suggestion = rule["suggestion"]
             if rule.get("related_quest"):
                 quests.append(rule["related_quest"])

     return DebriefCard(
         observations=observations or ["本局表现稳定，没有明显风险信号。"],
         suggestion=suggestion or "继续保持，尝试探索新路线。",
         related_quest_ids=quests,
         citations=citations,
     )
 ```

 ### 4.4 新增 API

 在 `webapp/backend/app/api/career.py` 追加：

 ```python
 @router.get("/career/debrief/{match_id}")
 def get_debrief(match_id: int, current_user: User = Depends(get_current_user)):
     """获取某场比赛的赛后复盘卡片。幂等。"""
     card = generate_debrief(match_id, current_user.id)
     return {
         "match_id": match_id,
         "observations": card.observations,
         "suggestion": card.suggestion,
         "related_quest_ids": card.related_quest_ids,
         "citations": card.citations,
     }
 ```

 ### 4.5 事实聚合器

 每赛制需要一个 `match_facts` 聚合器。以 `trading` 为例：

 ```python
 def aggregate_match_facts(match_id: int, user_id: int) -> Dict[str, Any]:
     """从比赛运行时表提取可引用的事实。"""
     decisions = fetch_trading_decisions(match_id, user_id)
     standings = fetch_match_standings(match_id)
     return {
         "engine": "trading",
         "match_id": match_id,
         "user_id": user_id,
         "final_rank": standings.get(user_id),
         "max_inventory_ratio": compute_max_inventory_ratio(decisions),
         "cash_ratio": compute_final_cash_ratio(decisions),
         "relevant_round": find_peak_inventory_round(decisions),
         "city": find_peak_inventory_city(decisions),
         "product": find_peak_inventory_product(decisions),
     }
 ```

 **关键纪律**：事实必须来自 DB 真实字段，不能由 LLM 总结。

 ### 4.6 前端展示

 在 `webapp/frontend/src/pages/Career/DebriefPage.tsx` 展示：

 ```tsx
 <DebriefCard
   observations={data.observations}
   suggestion={data.suggestion}
   relatedQuests={data.related_quest_ids}
 />
 ```

 ---

 ## 五、第二步：NPC 角色卡与多能力面

 ### 5.1 新增 NPC 角色配置

 创建 `content/career/npcs.yaml`：

 ```yaml
 npcs:
   chen_xu:
     id: chen_xu
     display_name: 陈叙
     title: 蓉城冷链老板
     avatar: avatars/chen_xu.png
     archetype: merchant
     city: chengdu
     backstory: 做了三十年冷链物流，信奉"现金流第一"。

     tone:
       formality: medium
       warmth: high
       humor: low

     values:
       - 现金流第一，利润第二
       - 对新手宽容，对老手严厉

     taboos:
       - 不透露其他对手策略
       - 不教唆违规操作

     signature_phrases:
       - "账算清楚之前，别谈格局。"

     facets:
       opponent:
         enabled: true
         default_policy_by_engine:
           trading: conservative_chen
           techventure: city_expand_slow
         intro_line: "年轻人，做生意不是赌博。"

       teammate:
         enabled: true
         hire_cost:
           gold: 500
           affinity: 0.3
         skill_bonus:
           trading:
             logistics_efficiency: 0.10
         availability: affinity_ge_0.3

       story:
         enabled: true
         role: shopkeeper
         shop_id: chen_cold_chain_shop
         chapters:
           - chapter_id: chen_ch1
             title: 初次见面
             unlock_condition: career_level >= 1
             reward:
               supplies: 20
 ```

 ### 5.2 新增数据表

 **`npc_personas`**：角色档案快照。

 | 字段 | 类型 | 说明 |
 |------|------|------|
 | `id` | string PK | NPC 唯一 ID |
 | `content_json` | JSON | 完整角色卡 |
 | `version` | string | 配置版本 |

 **`npc_relationships`**：每个玩家与每个 NPC 的关系。

 | 字段 | 类型 | 说明 |
 |------|------|------|
 | `id` | int PK | |
 | `career_id` | int FK | 玩家生涯档案 |
 | `npc_id` | string FK | NPC ID |
 | `affinity` | float | 关系度 0～1 |
 | `unlocked_facets` | JSON | 已解锁能力面 |
 | `unlocked_chapters` | JSON | 已解锁章节 |
 | `wins_vs_player` | int | 该 NPC 赢玩家次数 |
 | `losses_vs_player` | int | 该 NPC 输玩家次数 |
 | `hired_until` | datetime | 雇佣到期时间 |

 **`match_npc_instances`**：每场比赛的 NPC 实例。

 | 字段 | 类型 | 说明 |
 |------|------|------|
 | `id` | int PK | |
 | `match_id` | int FK | 比赛 |
 | `npc_id` | string FK | NPC |
 | `participant_id` | int FK | 比赛中分配的参与者 |
 | `facet` | enum | opponent / teammate |
 | `policy_id` | string | 本局策略 |
 | `knobs_snapshot` | JSON | 本局参数快照 |
 | `final_rank` | int | 最终排名 |

 ### 5.3 新增加载器

 `webapp/backend/app/domains/career/npc_loader.py`：

 ```python
 import yaml
 from pathlib import Path

 NPC_CONFIG_PATH = Path(__file__).parents[4] / "content" / "career" / "npcs.yaml"

 def load_all_npcs() -> Dict[str, Any]:
     with open(NPC_CONFIG_PATH, "r", encoding="utf-8") as f:
         data = yaml.safe_load(f)
     return {npc["id"]: npc for npc in data["npcs"].values()}

 def get_npc(npc_id: str) -> Dict[str, Any]:
     return load_all_npcs().get(npc_id)

 def has_facet(npc_id: str, facet: str) -> bool:
     npc = get_npc(npc_id)
     if not npc:
         return False
     return npc.get("facets", {}).get(facet, {}).get("enabled", False)
 ```

 ### 5.4 NPC 实例工厂

 `webapp/backend/app/domains/career/npc_factory.py`：

 ```python
 def create_match_npc(
     match_id: int,
     npc_id: str,
     facet: str,
     engine: str,
     career_id: int,
 ) -> Dict[str, Any]:
     """为某场比赛生成一个 NPC 参与者实例。"""
     npc = get_npc(npc_id)
     facet_cfg = npc["facets"][facet]

     policy_id = facet_cfg["default_policy_by_engine"][engine]
     base_knobs = load_policy(policy_id)["behavior"]["params"]

     # 读取玩家关系，应用成长参数
     rel = get_npc_relationship(career_id, npc_id)
     knobs = apply_growth_knobs(base_knobs, rel)

     return {
         "npc_id": npc_id,
         "facet": facet,
         "policy_id": policy_id,
         "display_name": npc["display_name"],
         "avatar": npc["avatar"],
         "knobs": knobs,
         "intro_line": facet_cfg.get("intro_line", ""),
     }
 ```

 ---

 ## 六、第三步：把 NPC 接入比赛补位

 ### 6.1 改造练习赛 AI 补位

 现有配置：

 ```yaml
 practice_ai_slots:
   - chaotic
   - advanced
   - advanced
 ```

 改造为 NPC ID 列表：

 ```yaml
 practice_ai_slots:
   - npc_id: chen_xu
     facet: opponent
   - npc_id: lin_rui
     facet: opponent
   - npc_id: wang_ke
     facet: opponent
 ```

 ### 6.2 改造 AI 决策入口

 以 `trading` 为例，原 `rts_ai_levels.py` 的入口：

 ```python
 def decide_ai(p: ArenaParticipant, ...):
     level = get_ai_level(config, p.id)
     if level == AI_LEVEL_CHAOTIC:
         return decide_chaotic(...)
     return decide_advanced(...)
 ```

 新入口：

 ```python
 def decide_ai(p: ArenaParticipant, ...):
     instance = get_match_npc_instance(p.id)
     if instance:
         policy = load_policy(instance.policy_id)
         return run_policy_decision(policy, instance.knobs, p, ...)
     # 兜底：旧级别逻辑
     return legacy_decide_ai(p, ...)
 ```

 `run_policy_decision` 根据 `policy["behavior"]["type"]` 分发到具体策略函数（conservative / arbitrage / momentum / random 等），并把 `knobs` 注入参数。

 ### 6.3 比赛结束后的成长更新

 在 `settle_match_rewards` 之后异步调用：

 ```python
 def on_match_finished(match_id: int):
     instances = fetch_match_npc_instances(match_id)
     for inst in instances:
         update_npc_relationship_after_match(inst)
 ```

 `update_npc_relationship_after_match` 负责：

 1. 更新胜负记录。
 2. 按规则微调 knobs（在 `growth_space` 范围内）。
 3. 检查并解锁新的 facet / chapter。
 4. 写审计日志。

 ---

 ## 七、第四步：NPC 作为可雇佣队友

 ### 7.1 雇佣接口

 ```python
 @router.post("/career/npcs/{npc_id}/hire")
 def hire_npc(npc_id: str, current_user: User = Depends(get_current_user)):
     npc = get_npc(npc_id)
     rel = get_or_create_relationship(current_user.career_id, npc_id)

     cost = npc["facets"]["teammate"]["hire_cost"]
     if not can_afford(current_user.career_id, cost):
         raise HTTPException(400, "资源不足")

     if not evaluate_unlock_condition(cost.get("availability"), rel):
         raise HTTPException(400, "关系度不足")

     deduct_resources(current_user.career_id, cost)
     rel.hired_until = now() + timedelta(days=7)
     rel.unlocked_facets = list(set(rel.unlocked_facets + ["teammate"]))
     db.commit()
     return {"hired_until": rel.hired_until}
 ```

 ### 7.2 队友在比赛中生效

 组队赛制中，NPC 队友占用一个队员位。其 `skill_bonus` 在比赛结算时作为系数应用：

 ```python
 def apply_teammate_bonus(team_id: int, base_result: Dict[str, Any]) -> Dict[str, Any]:
     npc = get_active_teammate(team_id)
     if not npc:
         return base_result
     bonus = npc["facets"]["teammate"]["skill_bonus"]
     for engine, effects in bonus.items():
         for key, delta in effects.items():
             base_result[key] *= (1 + delta)
     return base_result
 ```

 **当前阶段简化版**：如果组队赛制还没完全实现，可以先让「雇佣队友」只影响生涯页的加成展示，不深做局内配合。

 ---

 ## 八、第五步：NPC 作为故事角色

 ### 8.1 章节解锁

 `content/career/npcs.yaml` 中每个 NPC 的 `story.chapters` 定义对话节点：

 ```yaml
 chapters:
   - chapter_id: chen_ch1
     title: 初次见面
     unlock_condition: career_level >= 1
     dialogue:
       - speaker: chen_xu
         text: "年轻人，做生意不是赌博。先把账算清楚。"
       - speaker: player
         choices:
           - text: "我想学您怎么做风控。"
             next: chen_ch1_a
           - text: "我想直接开始练。"
             next: chen_ch1_b
     reward:
       supplies: 20
 ```

 ### 8.2 对话状态机

 ```python
 def get_npc_dialogue(career_id: int, npc_id: str, chapter_id: str, node_id: str):
     npc = get_npc(npc_id)
     rel = get_relationship(career_id, npc_id)

     # 检查解锁
     if chapter_id not in rel.unlocked_chapters:
         if not evaluate_unlock_condition(chapter_unlock_condition(npc, chapter_id), rel):
             raise HTTPException(403, "章节未解锁")
         rel.unlocked_chapters.append(chapter_id)

     chapter = find_chapter(npc, chapter_id)
     node = find_node(chapter, node_id)
     return {
         "speaker": node["speaker"],
         "text": render_text(node["text"], rel),
         "choices": node.get("choices", []),
         "reward": chapter.get("reward"),
     }
 ```

 ### 8.3 与家园联动

 完成章节后解锁家园摆件：

 ```python
 def grant_chapter_reward(career_id: int, chapter: Dict[str, Any]):
     reward = chapter.get("reward", {})
     for resource, amount in reward.items():
         if resource == "homestead_item":
             unlock_homestead_item(career_id, amount)
         else:
             add_resource(career_id, resource, amount)
 ```

 ---

 ## 九、第六步：可选接入 LLM 润色（C- 阶段）

 ### 9.1 何时接入

 当规则复盘模板已经稳定、事实聚合器已经可靠，可以引入 LLM 只做「表达润色」。

 ### 9.2 润色流程

 ```text
 facts → rule_card → (可选 LLM 润色) → persist → response
 ```

 LLM 输入：

 - 角色 IP（语气、口头禅、taboos）
 - 规则生成的 `observations` + `suggestion`
 - 事实引用 `citations`

 LLM 输出约束：

 - 不得改变 citations 中的事实
 - 不得泄露其他玩家策略
 - 不得直接给出下局操作建议
 - 输出必须匹配 JSON schema，失败则降级到规则模板

 ### 9.3 降级链

 ```python
 def enhance_with_llm(rule_card: DebriefCard, persona: Dict[str, Any]) -> DebriefCard:
     if not settings.AI_DEBRIEF_LLM_ENABLED:
         return rule_card
     try:
         return call_llm_enhancer(rule_card, persona)
     except LLMError:
         logger.warning("LLM 润色失败，降级到规则模板")
         return rule_card
 ```

 ---

 ## 十、前端集成要点

 | 功能 | 路由/组件 | 数据来源 |
 |------|-----------|----------|
 | 复盘卡片 | `/career/debrief/:match_id` | `GET /api/v1/career/debrief/{match_id}` |
 | NPC 列表 | `/career/npcs` | `GET /api/v1/career/npcs` |
 | NPC 详情 | `/career/npcs/:npc_id` | `GET /api/v1/career/npcs/{npc_id}` |
 | NPC 对话 | `/career/npcs/:npc_id/dialogue` | `GET/POST /api/v1/career/npcs/{npc_id}/dialogue` |
 | 雇佣队友 | `/career/npcs/:npc_id/hire` | `POST /api/v1/career/npcs/{npc_id}/hire` |

 学生端浮窗「AI 教练 Athena」保持单一入口，内部按当前场景切换角色面具。

 ---

 ## 十一、分阶段验收标准

 | 阶段 | 交付物 | 验收标准 |
 |------|--------|----------|
 | B0 | 规则复盘 + 3 个 NPC 对手 | 赛后 10 秒出卡；练习赛缺人时显示 NPC 名字头像 |
 | B1 | 6 个 NPC 角色 + 成长状态表 | 每个 NPC 有独立策略；局后可更新胜负记录 |
 | B2 | 队友雇佣 + 故事章节 | 能雇佣 NPC；完成章节解锁奖励 |
 | B3 | Athena 统一入口 + 教师端讲评草稿 | 学生端一个教练浮窗；教师端看到班级高频问题 |
 | C- | LLM 润色（可选开关） | 有降级链、成本统计、事实护栏 |

 ---

 ## 十二、常见坑与对策

 | 坑 | 对策 |
 |---|------|
 | 对局内调用 LLM | 严格禁止；所有 AI 决策走规则引擎 |
 | LLM 编造数据 | citations 强制；无引用不展示 |
 | NPC 行为不可解释 | 保留 knobs 快照和 adaptation_history |
 | 跨域写 NPC 关系 | 只允许 Career 域写入 `npc_relationships` |
 | 同一 NPC 多 facet 数据混淆 | facet 字段在 match_npc_instances 中显式区分 |
 | 成长参数越界 | 每次调整检查 min/max，超界则截断 |

 ---

 ## 十三、参考资料

 - `docs/decisions/011-npc-role-ip-and-multi-facet.md`（本方案对应的 ADR）
 - `inspire/80-角色IP复用与可成长规则NPC-Agent框架.md`
 - `inspire/86-AI教练与生涯NPC首期建设蓝图.md`
 - `inspire/90-AI对手NPC化与成长演化系统PRD.md`
 - `inspire/91-AI对手NPC角色图鉴.md`
 - `webapp/backend/app/domains/career/DESIGN.md`
 - `webapp/backend/app/games/trading/rts_ai_levels.py`

 ---

 *商识唯智 · AI 教练与 NPC AGENT 实现教程 v1.0*
