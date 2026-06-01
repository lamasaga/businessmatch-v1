# 拟真城市母本（World Cities Master）

> **状态**：Phase B — **长三角六城 v0.1 已落盘**；`fstrading` 通过 `defaults.world.region_id: yangtze_6` 引用本目录。  
> **权威阅读**：[07-拟真城市与区域模拟-阅读合集.md](../../../../07-拟真城市与区域模拟-阅读合集.md) · [content/world/README.md](../README.md)

## 当前区域包

| region_id | 城市 | 文件 |
|-----------|------|------|
| `yangtze_6` | 南京、苏州、上海、南通、无锡、常州 | `../regions/yangtze_6.yaml` + `*.yaml` |

## canonical `city_id`

| city_id | 标准名 | 授课定位 |
|---------|--------|----------|
| `shanghai` | 上海市 | 金融与高端消费枢纽 |
| `suzhou` | 苏州市 | 先进制造与外向配套 |
| `nanjing` | 南京市 | 省会综合与科教 |
| `wuxi` | 无锡市 | 精密制造 |
| `changzhou` | 常州市 | 装备与汽车链 |
| `nantong` | 南通市 | 临港农业与转运 |

## 废弃虚构 id（勿在新内容中使用）

| 废弃 | 说明 |
|------|------|
| `jingcheng`/`hushi`/`shenshi`/`rongcheng`/`bingcheng`/`gangcheng` | 浮生记 v2.1 及以前；v2.2+ 已切换 `yangtze_6` 真实 id |

## 纪律

- 新增城市须同步更新本表、[07-](../../../../07-拟真城市与区域模拟-阅读合集.md)、区域包 `regions/*.yaml`
- **数值定稿**：教研签字；AI 只可起草档案与建议区间
- **禁止**在赛制 YAML 内联复制整段城市块 — 应扩展本目录母本
