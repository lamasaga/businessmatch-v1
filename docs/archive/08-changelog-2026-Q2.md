# 08- 工程详表 · 变更归档（2026 Q2）

> **文档定位**：[`08-工程现状与webapp实现详表.md`](../../08-工程现状与webapp实现详表.md) §5.1 历史条目归档（只读备查）。活跃窗见 08- §5.1。  
> **最后更新**：2026-05-29

---

| 日期 | 摘要 |
| ---- | ---- |
| 2026-05-23 | **生涯模式设计启动**：[d/07-大循环家园与资源经济](../../inspire/d商业模拟教育平台/07-生涯模式-大循环家园与资源经济.md)（T0～T3、资源、家园、NPC、Phase B1～B5）；[career/DESIGN.md](../../webapp/backend/app/domains/career/DESIGN.md)；根目录 `04-` Phase B 拆条、`06-` 索引 |
| 2026-05-21 | **ADR 体系落地**：`docs/decisions/`（README 触发表 + 模板 + ADR-001～008 基线）；`.cursor/rules/adr-writing.mdc`；`00-`/`03-`/`06-`/`09-`/`README` 交叉引用 |
| 2026-05-23 | **赛事四层模型文档化**：`02-` §5.0 引擎/配置 ID/match_kind/流程；`arena/ARCHITECTURE.md` 对齐；`03-`/`00-`/`09-`/`README`/蓝图附录 A；创想大赢家组织端等待区与 `admin/start` 代码（见 2026-05-21 条目） |
| 2026-05-21 | **组织端等待区（创想大赢家）**：`admin/state` 扩展房间码与选手列表；`POST admin/.../start` 与 `open_round` 拆分；组织端报名态 UI；学生房间码加入后路由至 `techventure/lobby`；`02-` §5.1 正式赛标准流程 |
| 2026-05-22 | **根目录 07- 拟真城市阅读合集**：与 05- OPC 并列终局出口；[inspire/75-](../../inspire/75-拟真城市世界观设计.md) 降为详设附录；`00～09` 编号补齐；`content/world/cities/` 占位 |
| 2026-05-21 | **TechVenture 选队大厅**：`GET/POST lobby` + `TechVentureLobbyPage`；学生/组织端入口与赛制选择器 |
| 2026-05-21 | **TechVenture 赛制迁移**：Arena 域新增通用 `ArenaTeam` 模型 + `ArenaParticipant` 增 `team_id/team_role`；从 Node.js 原版精确翻译 v6 引擎为 Python（`v6_engine.py` Step 0-9）；新增 `techventure-v1.yaml` 配置包（4 轮三城四路线 BQI）；5 张运行时表（`tv_*`）；学生 + 组织者 + 大屏 + 评委四端 React 重写；练习模式 AI 队伍决策；14 条 API 路由 |
| 2026-05-19 | **浮生记 RTS v2**：`trading-v2-rts`、调度器单写 tick、HTTP 只读、WebSocket 推送、两档练习 AI、10 品；修复双写回合/调度器占坑/估值 bid/提前结束收尾 |
| 2026-05-21 | **根目录文档体系重组**：`07-` 迁至 `inspire/`；`01-` 重写（普惠教育定位+发展主线+可持续运营）；`03-` 新增 §八智能体编排架构 + §九AI 编程方法论；`04-` 全面重写为有序蓝图（无硬性日期）+ 工程规模与成本估算；百分比统一以 `08-` §三为唯一真相源 |
| 2026-05-20 | 浮生记回合制供需定价（`market.py`）；练习局 AI + 自动推进（`practice_flow.py`）；单品种库存上限 99（`inventory.py`）；学生端移除组织者入口；修复 AI 不推进 + 单回合多次提交 bug |
| 2026-05-22 | 根目录文档链接对齐 `inspire/a～f` 新层级（a 商赛主题、b 界面、c 卡片、d 平台规划、e 课程、f 早期调研） |
| 2026-05-20 | Arena/Career/Cybercore 域分包；`games/trading` 引擎；`practice` API；`trading-v1.yaml`；`xp_events`；课程文档迁至 `inspire/e课程设计/` |
| 2026-05-19 | 组织者独立端、Docker 三端编排（见上一版提交说明） |

---

*归档 · 勿在此维护活跃变更*
