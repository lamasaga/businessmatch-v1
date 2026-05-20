# Arena 域架构规范

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

- `game_config_id` → `content/game-configs/{id}.yaml`
- `game_type` = YAML 内 `engine` 字段（插件目录名）
- `config` JSON = `defaults` 与创建时 overrides 合并结果

## 新增赛制 checklist

1. 新增 `content/game-configs/<id>.yaml`
2. 新增 `app/games/<engine>/`（models + engine）
3. 可选：练习入口 `app/api/practice.py` 增加路由
4. 不改 Arena 表结构（除非通用字段扩展）

## 兼容

`app/models/trading_competition.py` 仅为 re-export，新代码勿再写入业务逻辑。
