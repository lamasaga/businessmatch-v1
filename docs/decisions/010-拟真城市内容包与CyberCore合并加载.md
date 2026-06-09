# ADR-010: 拟真城市内容包与 CyberCore 合并加载

**日期**：2026-06-01  
**状态**：已采纳  
**触发**：R3（Phase B 拟真城市 YAML 落地）· M3（内容归属 `content/world/`，非 `domains/world/` 表）

---

## 上下文

　　产品要求全平台赛制与生涯对齐**真实中国城市**本体，浮生记 RTS 不再使用「京城/蓉城」等虚构节点。Phase B 允许城市母本 YAML 与占位，但 **禁止** 提前建设 `domains/world/` 表、跨局持久化与 World API。需要在不建 World 域的前提下，让 `trading-v2-rts` 等赛制读取统一 `city_id` 与 POP 母本。

---

## 决策

　　我们决定：在 **`content/world/`** 维护 L0～L3 YAML（首包 `yangtze_6` 六城），由 **`cybercore.world_loader.merge_world_into_game_config`** 在 `get_game_config()` 加载赛制时**只读合并** `cities` / `routes`；赛制 YAML 仅声明 `defaults.world.region_id`。

**落地位置**：

- 内容：`webapp/backend/content/world/`
- 加载器：`webapp/backend/app/domains/cybercore/world_loader.py`
- 接入点：`cybercore/registry.py`、`sandbox/hot_config.py`
- 首版消费者：`game-configs/trading-v2-rts.yaml` v2.2.0

---

## 考虑过的方案

| 方案 | 优点 | 缺点 | 未采用原因 |
|------|------|------|------------|
| A. 继续在赛制 YAML 内联城市块 | 零代码 | 三套赛制三套城、虚构名难统一 | 违背拟真城市目标 |
| B. 立刻建 `domains/world/` + DB 快照 | 终局一致 | Phase A/B 门控禁止；迁移成本高 | 超前 |
| **C. content/world + loader 合并（已采纳）** | 单源母本、无新表、赛制渐进迁移 | 运行时合并、尚无 POP 引擎 | 符合 Phase B |

---

## 后果

### 正面

- 长三角六城 `city_id` 成为浮生记 RTS 默认节点；NPC/档案可绑定真实 `display_name`
- 赛制包体积减小；教研改数只改 `content/world/cities/*.yaml`
- Sandbox 热 YAML 与正式 registry 共用合并逻辑

### 负面 / 代价

- 历史对局若仍存虚构 `city_id`（如 `jingcheng`）需重新开练或做数据迁移
- `trading-v1`、TechVenture 尚未引用 `yangtze_6`，仍待下一迭代
- POP `behavior_packs` 暂为占位，定价仍由 `production/consumption` 驱动

### 给初学者的操作提示

- 新增城市：编辑 `content/world/cities/<id>.yaml` 并加入 `regions/yangtze_6.yaml` 的 `cities` 列表
- 新赛制引用区域包：在 `defaults.world.region_id` 写 `yangtze_6`，**不要**再内联整段 `cities:`
- 改城市后若本地缓存：重启 API 或 `get_game_config.cache_clear()`（开发）
- **不要**在本阶段创建 `domains/world/` 或 `world_snapshots` 表

---

## 相关

- [ADR-008 Phase A 门控](./008-Phase-A范围门控.md)
- [ADR-004 CyberCore 声明式赛制](./004-CyberCore声明式赛制扩展.md)
- [inspire/archive/07-拟真城市与区域模拟-阅读合集.md](../../inspire/archive/07-拟真城市与区域模拟-阅读合集.md)
- [content/world/README.md](../../webapp/backend/content/world/README.md)
