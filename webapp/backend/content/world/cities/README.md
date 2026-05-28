# 拟真城市母本（World Cities Master）

> **状态**：Phase A 尾声 — **占位目录**，尚无运行时加载器；各赛制仍使用各自 `game-configs/*.yaml` 内联城市段。
>
> **权威阅读**：[07-拟真城市与区域模拟-阅读合集.md](../../../../07-拟真城市与区域模拟-阅读合集.md)（**§六 数据颗粒度 · §七 POP · §八 数据整理 · §九 AI 作用**）  
> **详设**：[inspire/75-](../../../../inspire/75-拟真城市世界观设计.md)

## 目标

- 全平台**真实中国城市**统一 `city_id` 与 POP / 产业 / 消费 / 交通 / 档案元数据
- 赛制 YAML 通过 `$ref` 引用本目录母本，而非复制城市块
- 数据血缘：`meta.data_sources`、`calibrated_at`、`confidence`（见 07- §6.4）

## 数据颗粒度（五层，摘要）

| 层 | 路径 | Phase B |
|----|------|---------|
| L0 全局 | `../global.yaml` | 可选 |
| L1 区域 | `../regions/*.yaml` | 可选（如长三角） |
| L2 城市 | `<city_id>.yaml` | **必做** ≥6 城 |
| L3 POP | 母本内 `pop_segments[]` | 每城 3～5 段 |
| L4 快照 | DB `world_snapshots` | Phase C+ |

## 城市 ID 对照（草案）

| canonical `city_id` | 标准名 | 当前赛制中的别名 |
|---------------------|--------|------------------|
| `beijing` | 北京市 | trading-v1/v2: `jingcheng` 京城 |
| `shanghai` | 上海市 | `hushi` 沪市 |
| `shenzhen` | 深圳市 | `shenshi` 深市 |
| `chengdu` | 成都市 | `rongcheng` 蓉城 |
| `harbin` | 哈尔滨市 | `bingcheng` 冰城 |
| `hongkong` | 香港特别行政区 | `gangcheng` 港城 |
| `nanjing` | 南京市 | techventure-v1: `南京` |
| `hefei` | 合肥市 | techventure-v1: `合肥` |
| `hangzhou` | 杭州市 | techventure-v1: `杭州` |

## Phase B 待建文件（示例）

```
world/
  global.yaml                 # L0（可选）
  regions/
    yangtze_delta.yaml        # L1（可选）
  cities/
    _schema.yaml              # 字段说明 + provenance 约定
    nanjing.yaml              # L2 + L3 pop_segments
    ...
```

## 纪律

- **Phase A**：仅文档与对照表；**禁止**引擎自动加载本目录
- 新增城市须同步更新本 README、[07-](../../../../07-拟真城市与区域模拟-阅读合集.md)、[inspire/75-](../../../../inspire/75-拟真城市世界观设计.md)
- **数值定稿**：教研签字；AI 只可起草档案与建议区间（见 07- §九）
