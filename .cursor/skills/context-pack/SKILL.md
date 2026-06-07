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
- 任务跨域，需避免全文 `03-ENGINEERING.md` / inspire 长文

## 步骤

1. 从用户消息提取：**任务类型**、**Phase**、**域**（arena / trading / career / …）
2. 打开 [`03-ENGINEERING.md` §六](../../03-ENGINEERING.md#六开发流程)，匹配最接近的任务类型
3. 输出结构化清单（勿复制整份文档）：

```markdown
## 建议上下文包

- **T0（已自动）**：agent.md · blueprint-coding.mdc · docs-align（若推送）
- **T1（请 @）**：
  - [ ] `03-ENGINEERING.md` [AI_DEFAULT](../../03-ENGINEERING.md#ai_default)
  - [ ] …（按任务域选 1～2 份 DESIGN.md / ARCHITECTURE.md）
- **T2（按需，勿默认 @）**：…
- **禁止默认 attach**：全文 `03-ENGINEERING.md`、inspire 长文、蓝图编程方法论

## 开场简报模板（复制填空）

- 任务：…
- Phase：A
- 域：…
- 禁止：…
```

4. 若任务含 **新路由/API**：提醒跑 `webapp/scripts/export_openapi.py` 并更新 `03-ENGINEERING.md` §一 API 全表
5. 若任务含 **推送**：建议 docs-align；自检 AI_DEFAULT 与代码无成熟度矛盾
6. 深读 `03-ENGINEERING.md` 时用 grep 或 Read 指定锚点（如 `#ai_default`、`#五赛事引擎开发规范`），勿全文 attach

## 默认禁令（Phase A）

- 不 attach `inspire/OPC/` 深规格、`inspire/75-` 拟真城市长文，除非用户明确 Phase E / World
- 不 attach [`蓝图编程方法论`](../../inspire/蓝图编程方法论——AI辅助大型工程实践指南.md) 全文

## 按任务速查（T1 附加）

| 任务 | 额外 @ |
|------|--------|
| 新赛制 / 引擎 | `02-ARCHITECTURE.md` §三 · `docs/engine-spec.md` · `arena/ARCHITECTURE.md` |
| 产品/赛制定义 | `00-PROJECT.md` §产品架构共识 · `01-PRODUCT.md` |
| RTS / 浮生记 | ADR-005 · `games/trading/` |
| 生涯 / XP | ADR-007 · `domains/career/DESIGN.md` |
| 教师端 / 营团 | `01-PRODUCT.md` §四 · `03-ENGINEERING.md` AI_DEFAULT |
