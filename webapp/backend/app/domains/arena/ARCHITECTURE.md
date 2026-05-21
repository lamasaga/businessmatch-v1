# Arena 域架构规范

## 引擎 · 配置 ID · match_kind（与本仓库 `02-` §5.0 对齐）

　　开发新功能前先判定落在哪一层：

| 层 | 标识 | 路径 | 职责 |
|----|------|------|------|
| **引擎** | YAML `engine:` | `app/games/<engine>/` | 结算内核、运行时表（如 `v6_engine`、`settle`） |
| **配置 ID** | `game_config_id` | `content/game-configs/<id>.yaml` | 轮数、城市、经济常数、奖励；可有多份（练习/国内正式/美国正式） |
| **场次类型** | `match_kind` | `ArenaMatch.match_kind` | `practice` / `official`：建场入口、XP 权重、是否房间码控场 |
| **流程** | — | `practice.py` / `competitions` / `*_admin` | 生命周期与安全，不复制引擎 |

　　建场：`get_game_config(game_config_id)` → `merged_match_config(overrides)` → 写入 `match.config` 快照。

　　示例：`match_kind=official` + `game_config_id=techventure-official-us` → 美国城市客群 + 组织端控轮；`match_kind=practice` + `game_config_id=techventure-practice` → 少轮次 + AI 队 + `practice_flow` 自动推进。

## 分层

| 层 | 路径 | 职责 |
|----|------|------|
| **Arena** | `app/domains/arena/` | 场次、组织者、参赛者；`match_kind` / `design_mode` / `game_config_id` |
| **CyberCore** | `app/domains/cybercore/` | 加载 `content/game-configs/*.yaml` |
| **Game 插件** | `app/games/<engine>/` | 赛制运行时（如 `trading` 的回合/决策/价格） |
| **Career** | `app/domains/career/` | `xp_events` 幂等账本；`settle_match_rewards` |

## 体验矩阵

| | 正式赛 `official` | 日常练习 `practice` |
|--|-------------------|---------------------|
| **高独立 `standalone`** | 组织者创建 → 多人房间码 | `POST /practice/trading/start` 单人 |
| **模块化 `modular`** | 预留：组合多个 atomic 能力 | 同上，换 `game_config_id` |

## 配置约定

- `game_config_id` → `content/game-configs/{id}.yaml`（`registry.get_game_config`）
- `game_type` = YAML 内 `engine` 字段（插件目录名）
- `config` JSON = `defaults` 与创建时 overrides 合并结果
- 新增地区/赛季正式赛：新增 YAML + `id`，**不改** `app/games/<engine>/` 除非机制变更
- 练习与正式规则差大时：优先 `*-practice` / `*-official-*` 两个 ID，避免在 `defaults` 混写 `practice_ai_count` 给正式赛用

## 新增赛制 checklist

1. 新增 `content/game-configs/<id>.yaml`（`engine` 指向已有或新插件）
2. 若无现成引擎：新增 `app/games/<engine>/`（models + engine）
3. 练习入口：`app/api/practice.py` 指定默认 `game_config_id`
4. 正式入口：组织者创建比赛可选该 `game_config_id`
5. 不改 Arena 表结构（除非通用字段扩展）

## Practice 与 Official 分轨（演进规范）

　　目标：练习局**薄、稳、少变**；正式商赛**厚、严、常改**。不必现在整库 fork 两套引擎，但**现在就要约定放代码的位置**，否则仅靠「改的时候想清楚」会在 `api/*.py` 里堆出第三套缠在一起的逻辑。

### 共用 vs 分叉

| 共用（变化应慢） | 分叉（按 `match_kind` 演进） |
|------------------|------------------------------|
| `games/<engine>/` 纯结算（如 `v6_engine`、`settle`） | 建场：`match_factory` / `practice.py` / `competitions` / `*_admin` |
| `content/game-configs/` 经济常量（可拆 `-practice` / `-official` YAML） | 生命周期：`practice_flow.py` vs 组织者 `start` / `open_round` |
| `domains/arena` 表 + `match_kind` | 鉴权、审计、防作弊（仅 official） |
| `domains/career` 按 `match_kind` 权重入账 | 学生端路由：练习一键开局 vs 房间码→大厅→对局 |
| — | 组织端 `organizer-frontend`（仅 official） |

### 改代码时的判定（每次 PR 自检）

1. **先标流程**：本改动属于 **练习** 还是 **正式赛**？若两边都要，拆成两次提交或两个函数，禁止一个 `if` 混两种语义。
2. **禁止在共享 API 里长大分支**：`api/techventure.py`、`api/trading.py` 里若 `match_kind` 分支超过约 10 行或含安全/状态机，整段移到 `games/<engine>/practice_flow.py` 或 `official_flow.py`（正式赛专用，可新建），API 只调用。
3. **建场只走约定入口**：练习 → `POST /practice/...` + `practice_flow`；正式 → 组织者 / `competitions` + `*_admin`。**不要**在 `practice.py` 复制正式赛等待区逻辑，也不要在 `admin` 里顺带改练习局。
4. **规则差异优先 YAML / 新 config id**：回合数、事件池、AI 数量等用 `game_config_id` 或 `match.config` overrides，避免复制 Python 引擎。
5. **前端**：练习专用页/入口与商赛大厅、控场页分开路由；局内 UI 可共享组件，不强制两套路由，但**状态机**（是否经 lobby、谁可开轮）不得混用。

### 现在就要做 vs 可以等

| 现在就要做（低成本） | 可以等业务需要再做 |
|----------------------|-------------------|
| 遵守上表放置位置；新功能先选 practice / official 文件 | 拆 `techventure-v1-practice.yaml` / `techventure-official-us.yaml` 等 |
| 收敛 TechVenture 练习建场到 `match_factory` 或独立 `practice_start.py`（与 admin 对称） | 独立 `PracticeTechVenturePage` 精简 UI |
| 正式赛专用逻辑进 `*_admin` / `official_flow` | 商赛审计表、提交签名校验 |

　　**结论**：配置 ID 扩展地区/赛季；`match_kind` 扩展办赛流程；引擎保持单一真相。物理双库/双 App 不必现在做。

## 兼容

`app/models/trading_competition.py` 仅为 re-export，新代码勿再写入业务逻辑。
