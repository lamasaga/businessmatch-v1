# 拟真城市内容包（World Content Pack）

> **状态**：Phase B 起步 — **只读 YAML 母本**，由 `cybercore.world_loader` 在赛制加载时合并；**尚无** `domains/world/` 表与 API。  
> **权威阅读**：[07-拟真城市与区域模拟-阅读合集.md](../../../07-拟真城市与区域模拟-阅读合集.md) · [inspire/POP…/08-长三角六城起步手册](../../../inspire/POP行为涌现与区域市场/08-长三角六城起步手册.md)  
> **最后更新**：2026-06-01

## 目录结构

```
world/
  README.md                 # 本文件
  global.yaml               # L0 全局基调（可选）
  regions/
    yangtze_6.yaml          # L1 长三角六城区域包
  cities/
    _schema.yaml            # 字段约定
    nanjing.yaml …          # L2 城市母本 + L3 pop_segments
  behavior_packs/
    default_yrd.yaml        # POP 行为原语包（v0 占位）
  geo/
    yangtze_6/
      manifest.yaml         # bbox、投影、美术资源路径
      anchors.yaml          # WGS84 锚点（地图层）
```

## 对齐原则（全平台）

| 原则 | 说明 |
|------|------|
| **统一 `city_id`** | 赛制、生涯、NPC 档案、地图 Geo 层均使用 canonical id（如 `shanghai`），禁止再发明「京城/蓉城」等虚构简称 |
| **真实显示名** | 学生端展示 `display_name`（如「上海市」），教研档案可附 `meta.data_sources` |
| **赛制引用区域包** | `game-configs/*.yaml` 在 `defaults.world.region_id` 声明区域，由 loader 注入 `cities` / `routes` |
| **POP 与引擎字段并存** | 母本内 `pop_segments[]` 供 POP 引擎；`production` / `consumption` 供 RTS 定价（过渡期双写，数值同源） |
| **废弃别名** | 旧虚构 id 仅作迁移对照，**新内容禁止引用** |

### 废弃虚构 id 对照（只读迁移）

| 废弃 id | 真实 id | 原虚构名 |
|---------|---------|----------|
| `jingcheng` | — | 京城（不在长三角六城包内） |
| `hushi` | `shanghai` | 沪市 |
| `shenshi` | `suzhou` | 深市（产业角色由苏州承接） |
| `rongcheng` | `nantong` | 蓉城（农业/转运由南通承接） |
| `bingcheng` | `changzhou` | 冰城（重工/汽车链由常州承接） |
| `gangcheng` | `wuxi` | 港城（制造/枢纽由无锡承接） |

　　**FStrading（fstrading）** 默认 `region_id: yangtze_6`，六城为真实长三角节点；NPC 角色背景须绑定上表真实 `city_id` 与 `display_name`。

## 加载方式

　　`get_game_config(config_id)` 读取赛制 YAML 后，若存在 `defaults.world.region_id`，则：

1. 加载 `regions/<region_id>.yaml`
2. 按区域 `cities` 列表加载 `cities/<city_id>.yaml`
3. 合并 `routes`、写入 `GameConfigDocument.cities`
4. 将 `defaults.cities` 设为区域城市顺序；`hub_cities` 供练习局出生城
5. 合并 `geo/yangtze_6/anchors.yaml` 至引擎 `cities[*].geo`（经纬度）

　　**HTTP**：`GET /api/v1/trading/regions/yangtze_6/geo-pack` · `GET /api/v1/trading/game-configs/fstrading/geo-pack`  
　　**对局 state**：`game_state.rts.world` 含完整贸易切片（城、边、geo 元数据）

　　详见 `app/domains/cybercore/world_loader.py` 与 [ADR-010](../../../docs/decisions/010-拟真城市内容包与CyberCore合并加载.md)。

## Phase 门控

| 允许（当前） | 禁止（待 Phase C+） |
|--------------|---------------------|
| YAML 母本、loader 合并、赛制对齐 | `domains/world/` 表、跨局持久化、`world_snapshots` DB |
| POP 行为包占位 | 运行时 POP 引擎全量替换 RTS pool 定价 |
