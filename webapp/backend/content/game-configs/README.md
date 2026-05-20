# 赛制配置包（CyberCore Content）

| 文件 | engine | 说明 |
|------|--------|------|
| `trading-v1.yaml` | `trading` | **浮生记式**六城十品倒卖；`pricing.mode: market` 由玩家/AI 买卖驱动供需 |

## 定价模式

- **market**（默认）：各城各商品价格在回合间根据「买入量 − 卖出量」调整，用于教学供需曲线
- 练习局自动加入 3 名 AI 交易员（`practice_ai_count`），模拟多人市场
- 正式赛由所有真人参赛者共同塑造物价

## 字段约定

- `id` → `competition_events.game_config_id`
- `engine` → `app/games/<engine>/`
- `defaults.pricing` → 弹性系数、参考成交量等

加载：`app.domains.cybercore.registry.get_game_config(config_id)`
