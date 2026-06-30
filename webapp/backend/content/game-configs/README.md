# 赛制配置包（CyberCore Content）

| 文件 | engine | 说明 |
|------|--------|------|
| `fstrading.yaml` | `trading` | **FST / 浮生记** 即时商战（`mode: rts`）：**4 秒/游戏日**、ask/bid、体积仓储、车辆、长三角六城；契约见 `docs/prd/PRD-FST.md` |

## 已废弃（别名指向 `fstrading`）

- `trading-v1`（回合制）
- `trading-v2-rts`（旧即时包 id）

## 字段约定

- `id` → `competition_events.game_config_id`
- `engine` → `app/games/<engine>/`
- `defaults.world.region_id` → 由 `world_loader` 注入 `cities` / `routes`

加载：`app.domains.cybercore.registry.get_game_config(config_id)`
