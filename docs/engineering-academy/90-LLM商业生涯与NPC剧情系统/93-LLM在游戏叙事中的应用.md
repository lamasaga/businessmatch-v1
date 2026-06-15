# LLM 在游戏叙事中的应用

> 本章讲如何在大模型增强的商业生涯系统中使用 LLM，以及它的能力边界和安全策略。

## 1. LLM 能做什么

| 能力 | 应用场景 |
|------|---------|
| 自然语言对话 | NPC 与玩家对话、谈判、邮件 |
| 情境化表达 | 根据 NPC 性格和当前状态生成台词 |
| 叙事包装 | 把系统事件转化为故事 |
| 推理辅助 | NPC 评估机会、做复杂决策 |
| 内容生成 | 生成新闻、报告、人物背景 |
| 摘要 | 总结长期事件、生成履历 |

## 2. LLM 不能做什么

| 局限 | 说明 |
|------|------|
| 不可预测 | 相同输入可能输出不同 |
| 幻觉 | 可能生成不存在的信息 |
| 数学/规则错误 | 复杂计算容易出错 |
| 高延迟 | API 调用通常几百毫秒到几秒 |
| 高成本 | 高频调用费用高 |
| 不可解释 | 决策过程黑盒 |

## 3. 核心原则：LLM 是血肉，规则是骨架

### 3.1 LLM 负责什么

- **翻译**：把状态机的输出转化为自然语言。
- **润色**：让文本有性格、有情感。
- **包装**：把系统事件变成故事。
- **辅助推理**：在规则约束下做复杂判断。

### 3.2 LLM 不做什么

- **不决定核心商业结果**：价格、利润、市场份额由规则计算。
- **不直接修改数据库**：所有修改由状态机执行。
- **不拥有无限自由**：必须在给定选项和约束中工作。

## 4. LLM 在系统中的位置

```
状态机决定 NPC 行为
    ↓
生成结构化输出（意图、情绪、关键信息）
    ↓
LLM 根据结构化输出生成自然语言
    ↓
玩家看到对话/叙事文本
    ↓
玩家输入选择/自由文本
    ↓
LLM 解析玩家输入，提取意图
    ↓
状态机根据意图更新状态
```

## 5. 对话系统设计

### 5.1 不是完全自由聊天

完全自由的 LLM 聊天：

- 成本高
- 容易跑偏
- 难以保证一致性
- 难以教学

推荐：**半开放对话 + 关键选项**。

### 5.2 半开放对话示例

```
NPC（愤怒）：「你挖走了我的技术总监，这笔账怎么算？」

玩家可选：
A. 「市场竞争，各凭本事。」
B. 「我愿意支付一笔补偿金。」
C. 「[自由输入]」
```

如果玩家选 C，LLM 解析意图：

- 道歉 → 关系缓和
- 挑衅 → 关系恶化
- 提出合作 → 进入谈判

### 5.3 Prompt 结构

```
你扮演 [NPC 名字]，[职位]，[性格摘要]。

当前情境：
- [事件背景]
- 你与玩家的关系：[关系分数]
- 你的目标：[目标]
- 你的情绪：[情绪]

规则：
- 只能表达 [NPC 名字] 知道的信息
- 不能泄露系统内部机制
- 保持角色一致性
- 语气符合性格

玩家说：「[玩家输入]」

请用第一人称回复，不超过 100 字。
```

## 6. 叙事生成

### 6.1 事件叙事

把系统事件包装成故事：

```
输入：
{
    "event": "company_bankruptcy",
    "company": "星辰科技",
    "cause": "产品失败导致现金流断裂",
    "affected_npcs": ["张伟", "李娜"],
    "previous_relationship": "张伟曾是玩家合伙人"
}

输出：
「星辰科技正式宣告破产。这家公司曾是你和张伟共同创办的，
  如今因为新一代产品市场反响惨淡，资金链断裂而倒下。
  张伟在办公室坐了一整夜，第二天没有来向你告别。」
```

### 6.2 回合报告

```
第三季度回顾：
- 你的公司「云图科技」推出了新产品，市场反响热烈。
- 但核心工程师王磊被竞争对手以双倍薪资挖走，项目进度受到影响。
- 投资人孙姐对你的表现满意，提议追加投资。
- 你与旧友张伟的关系进一步恶化，他可能会在行业中散布对你不利的消息。
```

## 7. RAG：让 LLM 知道世界

### 7.1 为什么需要 RAG

LLM 训练数据不包含当前游戏世界的具体信息：

- 玩家之前做了什么
- NPC 之间的关系
- 公司当前财务状况
- 行业历史

RAG 把这些信息作为上下文提供给 LLM。

### 7.2 RAG 流程

```
玩家/NPC 输入 → 检索相关记忆和规则 → 构造上下文 → LLM 生成回复
```

检索内容：

- NPC 与玩家的历史互动
- 相关公司信息
- 行业事件
- 规则约束

## 8. 成本控制

### 8.1 缓存

- 相同情境下的回复缓存。
- NPC 的固定背景信息预生成。

### 8.2 小模型

- 简单任务用本地小模型。
- 复杂叙事用 Claude/GPT。

### 8.3 异步

- LLM 调用不阻塞核心游戏循环。
- 对话结果可以延迟几百毫秒返回。

### 8.4 批量

- 批量生成 NPC 的回合内省文本。
- 批量生成新闻和报告。

## 9. 安全与回退

### 9.1 输出校验

- 检查 LLM 输出是否违反规则。
- 过滤敏感内容。
- 确保不泄露内部机制。

### 9.2 硬回退

如果 LLM 失败或输出不合规，回退到模板：

```python
response = await llm_generate(prompt)
if not validate(response):
    response = fallback_template(npc, situation)
```

## 10. 与 AI 沟通示例

```
我要在商业生涯系统中使用 LLM 增强 NPC 对话。

约束：
- LLM 不决定核心商业结果
- LLM 只生成自然语言回复和叙事文本
- 使用半开放对话 + 关键选项
- 需要 RAG 提供 NPC 记忆和世界信息
- 有硬回退机制
- 控制成本

请给出：
1. LLM 在系统中的位置
2. Prompt 模板
3. RAG 检索内容
4. 输出校验规则
5. 成本控制策略
```

## 最后更新

2026-06-14

---

**参考来源**：
- [ACM - Player Perceptions on Generative Non-Player Character Dialogues](https://dl.acm.org/doi/10.1145/3742413.3789221)
- [arXiv - LLM-Driven NPCs: Cross-Platform Dialogue System](https://arxiv.org/html/2504.13928v1)
- [Gamine AI - Your First LLM-Driven NPC Dialogue with a Hard Fallback Net](https://gamineai.com/blog/your-first-llm-npc-dialogue-system-hard-fallback-net-unity-godot-2026-beginner-build)
- [AI Tool Tutorials - AI for Game Devs: Using LLMs to Generate Dynamic NPC Dialogue Trees](https://www.aitooltutorials.com/ai-for-game-devs-using-llms-to-generate/)
- [OpenReview - State-Inference-Based Prompting for Natural Language Trading](https://openreview.net/pdf?id=xiTOYf2YR6)
- [GitHub - SoulEngine](https://github.com/PranavMishra17/SoulEngine)
