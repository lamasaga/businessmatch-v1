# ADR-004: CyberCore 声明式赛制扩展

**日期**：2026-05-21  
**状态**：已采纳  
**触发**：R1、M3

---

## 上下文

　　平台规划**十种左右赛制**。若每增一种就复制一份 `api/trading.py` 或整包克隆引擎，会导致路由爆炸、规则硬编码在 Python、练习/正式赛逻辑分叉失控。

---

## 决策

　　新赛制走 **CyberCore 声明式配置包** + **独立引擎目录**：

1. 新增 `webapp/backend/content/game-configs/<id>.yaml`（规则参数、`engine` 字段）
2. 新增 `webapp/backend/app/games/<engine>/`（models + engine + 可选 `practice_flow.py`）
3. 练习入口可挂 `api/practice.py`；**禁止**复制整份 `trading.py` 路由文件
4. **尽量不改** arena 表结构；通用扩展才改 arena 模型

　　同一 `engine` 可多份 YAML（如 `trading-v1` 回合制 vs `trading-v2-rts` 即时制）；`match_kind` 区分练习/正式流程，**不**为练习单独克隆引擎目录。

**落地位置**：

- 配置：`content/game-configs/trading-v1.yaml`、`trading-v2-rts.yaml`、`techventure-v1.yaml`
- 加载：`domains/cybercore/`
- 说明：`domains/arena/ARCHITECTURE.md`、`02-` §5.0

---

## 考虑过的方案

| 方案 | 优点 | 缺点 | 未采用原因 |
|------|------|------|------------|
| 每个赛制 fork 一套 `api/trading_xxx.py` | 直观 | N 套路由；规则散落代码 | 不可维护 |
| 全部规则写死在 `engine.py` | 实现快 | 改平衡要改代码发版；教研难调参 | 违背 CyberCore 方向 |
| **YAML + 引擎包 + 共享 arena（已采纳）** | 调参改 YAML；引擎可测 | 要先设计 schema | 已验证 trading + techventure |

---

## 后果

### 正面

- `trading-v2-rts` 与 `trading-v1` 共用 `games/trading` 代码路径，差异在配置与 RTS 模块
- TechVenture 用 `techventure-v1.yaml` 驱动 v6 引擎翻译

### 负面 / 代价

- 须维护 YAML schema 与文档；错误配置会在运行时暴露

### 给初学者的操作提示

- **可以做的**：复制现有 YAML 改 id；在 `games/<engine>/` 加模块；先读 `game-configs/README.md`（若有）
- **不要做的**：`cp trading.py investor_duel_trading.py` 式克隆 API；不要复制 `v6_engine.py` 整文件改赛制名
- **相关阅读**：`02-` §5.0、`09-` §6.2、`ADR-005`（RTS 是 trading 引擎的一种运行时模式）

---

## 关联

- ADR-003、ADR-005
- 规则：`blueprint-coding.mdc` §3
