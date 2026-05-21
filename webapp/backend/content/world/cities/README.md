# 拟真城市母本（World Cities Master）

> **状态**：Phase A 尾声 — **占位目录**，尚无运行时加载器；各赛制仍使用各自 `game-configs/*.yaml` 内联城市段。
>
> **权威阅读**：[07-拟真城市与区域模拟-阅读合集.md](../../../../07-拟真城市与区域模拟-阅读合集.md) · **详设**：[inspire/75-](../../../../inspire/75-拟真城市世界观设计.md)

## 目标

- 全平台**真实中国城市**统一 `city_id` 与 POP / 产业 / 消费 / 交通 / 档案元数据
- 赛制 YAML 通过引用本目录下的母本，而非复制城市块

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
cities/
  _schema.yaml          # 母本字段说明
  beijing.yaml
  nanjing.yaml
  ...
  regions/
    yangtze_delta.yaml  # 区域关系、交通走廊（可选）
```

## 纪律

- **Phase A**：仅文档与对照表；**禁止**在此目录添加被引擎自动加载的业务逻辑
- 新增城市须同步更新本 README 与 `inspire/75-` 城市档案计划
