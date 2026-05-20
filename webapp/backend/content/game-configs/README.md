# 赛制配置包（CyberCore Content）

| 文件 | engine | design_mode | 说明 |
|------|--------|-------------|------|
| `trading-v1.yaml` | `trading` | `standalone` | 完整独立交易倒卖赛 |

## 字段约定

- `id`：写入 `competition_events.game_config_id`
- `engine`：对应 `app/games/<engine>/` 插件
- `design_mode`：`standalone` | `modular`（模块化组合赛今后用 `modular` + 组合清单）

## 加载

由 `app.domains.cybercore.registry.get_game_config(config_id)` 读取。
