# webapp/contracts · API 与域契约

> **文档定位**：机器可读的 API 真相源 + 短人工契约（表归属、域事件）。Markdown 全表见 [`08-` §2.7](../../08-工程现状与webapp实现详表.md#27-后端架构与-api-全表)（深读）；编码默认见 [`08-` AI_DEFAULT](../../08-工程现状与webapp实现详表.md#ai_default)。  
> **最后更新**：2026-05-30（体验营 P1 · OpenAPI 与代码同步）

---

## 一、OpenAPI

| 文件 | 说明 |
|------|------|
| [`openapi/bundled.yaml`](./openapi/bundled.yaml) | 从 FastAPI 导出的完整 Schema（提交前可 diff） |
| 运行时 | 后端 `DEBUG=true` 时 `GET http://localhost:8000/openapi.json` |

**重新生成**（在 `webapp/backend` 下，已安装依赖时；体验营分支合并前须含 `/teaching-groups`）：

```powershell
Set-Location "d:\1XFAwork\businessmatch-v1\webapp\backend"
.\.venv\Scripts\python.exe -m app.db.init_db
..\scripts\export_openapi.py
```

---

## 二、单库与表归属（摘要）

| 域 | 表（示例） | 唯一写入方 |
|----|------------|------------|
| identity | `users` | `api/auth.py` |
| arena | `competition_events`, `competition_participants`, `arena_teams`, `organizer_profiles`, `teaching_groups`, `group_memberships` | `domains/arena/`、`api/competitions.py`、`api/teaching_groups.py` |
| games/trading | `trading_*` | `games/trading/` |
| games/techventure | `tv_*` | `games/techventure/` |
| career | `xp_events` | `domains/career/services/rewards.py` |
| opc | `one_companies`, `ai_employees`, `ai_tasks` | `api/opc.py` |

　　完整域边界：[blueprint-coding.mdc](../../.cursor/rules/blueprint-coding.mdc) · [ADR-003](../../docs/decisions/003-域边界与表归属.md)。

---

## 三、域事件（规划）

| 事件名 | 触发 | 消费者（规划） |
|--------|------|----------------|
| `match.finished` | 正式赛/练习赛结束 | career `settle_match_rewards` |
| `camp.member_joined` | `POST /teaching-groups/join` 成功 | 规划：Quest / 教师通知（Phase B） |
| `quest.completed` | Quest 服务（Phase B） | career |
| `opc.milestone` | OPC Gateway（Phase E） | credenti / career |

　　Phase A 以函数调用为主；事件名在此登记，避免各域私自发明。

---

## 四、路由模块归属

| API 模块 | 文件 | 禁止 |
|----------|------|------|
| auth | `api/auth.py` | 他域改 `users.experience` |
| competitions | `api/competitions.py` | 赛制引擎直接改 arena 表结构 |
| trading | `api/trading.py`, `trading_ws.py` | HTTP 推进 RTS tick |
| practice | `api/practice.py` | 跳过 arena 建赛 |
| teaching_groups | `api/teaching_groups.py` | 他域直写营团表 |
| techventure | `api/techventure.py`, `techventure_admin.py` | 克隆 trading 引擎文件 |

　　详表：[08-` AI_DEFAULT API 摘要](../../08-工程现状与webapp实现详表.md#ai_default)。

---

*商域 BizSim Edu · contracts*
