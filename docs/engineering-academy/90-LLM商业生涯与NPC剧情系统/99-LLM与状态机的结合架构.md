# LLM 与状态机的结合架构

> 本章给出 LLM 大模型与异步状态机结合的具体架构：谁负责什么、如何交互、数据如何流动。

## 1. 架构总览

```
┌─────────────────────────────────────────────────────────┐
│  应用层：学生端 / 组织者端 / 后台管理                     │
├─────────────────────────────────────────────────────────┤
│  API 层：HTTP / WebSocket                                │
├─────────────────────────────────────────────────────────┤
│  叙事层：LLM 服务                                        │
│  - 对话生成                                              │
│  - 事件叙事                                              │
│  - 意图解析                                              │
│  - 摘要生成                                              │
├─────────────────────────────────────────────────────────┤
│  决策层：规则 + 轻量推理                                 │
│  - 状态机                                                │
│  - 行为树                                                │
│  - 效用评分                                              │
│  - 硬约束校验                                            │
├─────────────────────────────────────────────────────────┤
│  模拟层：商业规则引擎                                    │
│  - 公司财务                                              │
│  - 市场清算                                              │
│  - 项目结算                                              │
│  - 人才流动                                              │
├─────────────────────────────────────────────────────────┤
│  数据层：NPC、公司、关系、记忆、事件                      │
└─────────────────────────────────────────────────────────┘
```

## 2. 职责划分

| 层级 | 负责 | 不负责 |
|------|------|--------|
| **LLM 叙事层** | 自然语言、情感表达、情境包装 | 修改数值、决定胜负 |
| **决策层** | NPC 行为选择、状态转移、策略评估 | 自由闲聊、无约束创作 |
| **模拟层** | 财务、市场、项目等数值计算 | 叙事生成 |
| **数据层** | 持久化、检索、更新 | 业务逻辑 |

## 3. 调用流程

### 3.1 NPC 自主行动流程

```
调度器触发 NPC 更新
    ↓
状态机决定当前需要做什么
    ↓
行为树评估可选动作，选择最优动作
    ↓
模拟层执行动作，计算数值结果
    ↓
生成事件记录
    ↓
（可选）LLM 生成事件叙事文本
    ↓
更新记忆和关系
```

### 3.2 玩家与 NPC 对话流程

```
玩家输入
    ↓
LLM 解析意图（如：威胁、道歉、合作提议）
    ↓
状态机根据意图和规则决定 NPC 反应
    ↓
生成结构化反应（情绪、决策、关键信息）
    ↓
LLM 根据结构化反应生成自然语言回复
    ↓
玩家看到回复
    ↓
状态机根据对话结果更新关系、记忆、任务状态
```

### 3.3 事件叙事流程

```
系统事件触发
    ↓
状态机记录事件数据
    ↓
检索相关记忆和上下文
    ↓
LLM 生成叙事文本
    ↓
校验输出
    ↓
展示给玩家
```

## 4. LLM 调用点

### 4.1 必须调用 LLM

- 自由对话回复
- 事件叙事包装
- 人物履历摘要
- 复杂意图解析

### 4.2 可选调用 LLM

- NPC 内心独白
- 新闻生成
- 邮件/报告撰写
- 回合总结

### 4.3 不调用 LLM

- 数值计算
- 状态转移
- 胜负判定
- 数据库写入

## 5. Prompt 工程

### 5.1 NPC 对话 Prompt 模板

```python
npc_dialogue_prompt = """
# 角色设定
你扮演 {npc_name}，{npc_role}。
性格：{traits}
当前情绪：{emotion}

# 与玩家关系
关系强度：{relationship_strength}
信任度：{trust}
共同历史摘要：{relationship_summary}

# 当前情境
{situation}

# 最近相关记忆
{relevant_memories}

# 规则
- 保持角色一致性
- 只能表达 {npc_name} 知道的信息
- 不要泄露系统机制
- 回复不超过 100 字

玩家说："{player_input}"

请用第一人称回复，并输出以下结构化信息：
情绪变化：[+0.1 / -0.1 / 0]
态度变化：[+0.1 / -0.1 / 0]
是否触发行动：[是/否]
触发行动：[行动描述，如果没有则填无]
"""
```

### 5.2 事件叙事 Prompt 模板

```python
event_narrative_prompt = """
# 事件
{event_data}

# 受影响人物
{affected_npcs}

# 商业背景
{business_context}

请生成一段不超过 200 字的叙事文本。
要求：
- 有戏剧感但基于事实
- 体现人物关系
- 不添加不存在的信息
"""
```

## 6. 状态约束 LLM

### 6.1 输出结构化

要求 LLM 输出 JSON，便于状态机解析：

```json
{
  "reply": "玩家看到的自然语言回复",
  "emotion_change": 0.1,
  "trust_change": -0.2,
  "triggered_action": "poaching_attempt",
  "action_target": "player_company",
  "internal_monologue": "NPC 内心想法（可选）"
}
```

### 6.2 校验与回退

```python
response = await llm_generate(prompt, schema=response_schema)

if not validate_response(response):
    response = fallback_response(npc, situation)

# 只有校验通过后才允许影响状态
apply_to_state(response, constraints)
```

## 7. 异步更新

### 7.1 离线演化

```python
async def world_tick(world_state):
    # 所有 NPC 并行更新
    tasks = [npc.update() for npc in active_npcs]
    results = await asyncio.gather(*tasks)
    
    # 处理事件
    for event in collect_events(results):
        if event.requires_narrative:
            event.narrative = await llm_narrate(event)
        
        # 记录待玩家查看
        world_state.pending_events.append(event)
    
    return world_state
```

### 7.2 玩家上线时

```python
def player_login(player_id):
    pending_events = get_pending_events(player_id)
    summary = llm_summarize_events(pending_events)
    return {
        'events': pending_events,
        'summary': summary
    }
```

## 8. 与 AI 沟通示例

```
我要设计一个 LLM + 状态机结合的商业生涯系统架构。

层级：
- 应用层：前端界面
- API 层：HTTP/WebSocket
- 叙事层：LLM 服务
- 决策层：状态机 + 行为树
- 模拟层：商业规则引擎
- 数据层：NPC/公司/关系/记忆/事件

调用流程：
1. NPC 自主行动由状态机决策
2. 玩家对话由 LLM 解析意图 + 生成回复
3. 系统事件由 LLM 包装叙事

约束：
- LLM 不修改核心数值
- LLM 输出结构化 JSON
- 有硬回退机制
- 支持异步离线演化

请给出：
1. 各层职责表
2. 玩家对话完整调用流程
3. Prompt 模板
4. 异步更新流程
```

## 最后更新

2026-06-14

---

**参考来源**：
- [arXiv - LLM-Driven NPCs: Cross-Platform Dialogue System](https://arxiv.org/html/2504.13928v1)
- [Gamine AI - Your First LLM-Driven NPC Dialogue with a Hard Fallback Net](https://gamineai.com/blog/your-first-llm-npc-dialogue-system-hard-fallback-net-unity-godot-2026-beginner-build)
- [OpenReview - State-Inference-Based Prompting](https://openreview.net/pdf?id=xiTOYf2YR6)
- [GitHub - SoulEngine](https://github.com/PranavMishra17/SoulEngine)
- [Stanford Generative Agents](https://arxiv.org/abs/2304.03442)
