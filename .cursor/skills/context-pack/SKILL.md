---
name: context-pack
description: >-
  Output T0/T1/T2 document attach list for BizSim AI coding sessions. Use when
  the user starts a task, asks what to @, wants context budget help, or says
  "任务包" / "attach 什么".
---

# context-pack · 任务上下文包

## 何时使用

- 用户新开编码会话，未声明要 attach 哪些文档
- 用户问「这次该 @ 哪些文件」
- 任务跨域，需避免全文 `08-` / `07-`

## 步骤

1. 从用户消息提取：**任务类型**、**Phase**、**域**（arena / trading / career / …）
2. 打开 [`09-` §6.1](../../09-分项目开发与集成流程.md#61-ai-编程上下文注入清单)，匹配最接近的行
3. 输出结构化清单（勿复制整份 09-）：

```markdown
## 建议上下文包

- **T0（已自动）**：agent.md · blueprint-coding.mdc · docs-align（若推送）
- **T1（请 @）**：
  - [ ] `08-` [AI_DEFAULT](../../08-工程现状与webapp实现详表.md#ai_default)
  - [ ] …（来自 §6.1 该行）
- **T2（按需，勿默认 @）**：…
- **禁止默认 attach**：全文 `08-`、`07-`、蓝图编程方法论

## 开场简报模板（复制填空）

- 任务：…
- Phase：A
- 域：…
- 禁止：…
```

4. 若任务含 **新路由/API**：提醒跑 `webapp/scripts/export_openapi.py` 并更新 `08-` AI_DEFAULT API 摘要行
5. 若任务含 **推送**：建议同时启用 docs-align 流程，对齐 `08-` AI_DEFAULT + §5.1 一条

## 默认禁令（Phase A）

- 不 attach `07-` §六～§九、`05-` §四～§八，除非用户明确 Phase E / World
- 不 attach [`蓝图编程方法论`](../../蓝图编程方法论——AI辅助大型工程实践指南.md) 全文
