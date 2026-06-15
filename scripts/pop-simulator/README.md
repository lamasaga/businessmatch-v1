# POP 拟真城市模拟器

基于 `docs/prd/PRD-POP模拟器.md` 与 `docs/prd/BDD-POP模拟器.md` 实现的浏览器端微观社会模拟器。

## 文档索引

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — 详细代码注释与关键公式解释
- [`README.md`](./README.md) — 本文件：快速开始与功能概览

## 快速开始

### 方式一：一键启动（推荐）

已为你准备好 PowerShell 启动脚本：

```powershell
cd scripts/pop-simulator
.\启动.ps1
```

脚本会询问：
- **选项 1**：直接打开 `index.html`（需要联网加载 Chart.js CDN）
- **选项 2**：启动本地 HTTP 服务器（推荐，避免部分浏览器的文件访问限制）

### 方式二：手动打开

直接用浏览器打开 `index.html` 即可，无需构建、无需后端。

```powershell
cd scripts/pop-simulator
start index.html
```

或启动一个本地静态服务器：

```powershell
cd scripts/pop-simulator
python -m http.server 8080
# 浏览器访问 http://localhost:8080
```

## 文件结构

| 文件 | 说明 |
|------|------|
| `index.html` | 页面结构与 CDN 资源引用 |
| `simulator.js` | 核心引擎：POP 生成、劳动力市场、市场清算、消费、迁移、宏观指标 |
| `ui.js` | 前端交互：参数面板、运行控制、图表、地图、事件日志、表格、导入导出 |
| `style.css` | 页面样式 |

## 主要功能

- **6 组内置预设**：均衡城市、工业衰退、房地产泡沫、技术替代、高福利社会、移民潮冲击
- **可调参数**：POP 职业结构、工资、企业生产率、税收、最低工资、补贴、利率、移民、技术冲击等
- **运行控制**：单步推进、连续运行、暂停、重置、速度调节、随机种子
- **可视化面板**：
  - 宏观指标时间序列（GDP、CPI、失业率、基尼系数、平均满意度、人均收入、房价指数）
  - 区域热力图（人口、收入、房价、岗位空缺率、满意度）
  - 财富分布直方图 / 职业结构堆叠图
  - 事件日志
  - POP 组与企业明细表格
- **导入导出**：配置 JSON、完整状态 JSON

## 设计说明

- 引擎使用**聚合 POP**：相同职业与区域的 POP 合并为一组，保证浏览器端可模拟万人级城市。
- `step(state, params, rng)` 为纯函数，给定相同输入可复现结果。
- 为保证模拟长期稳定，企业收入设有下限，避免出现真实市场中可能出现的死亡螺旋；价格、需求、销量、利润仍参与结算并反馈到宏观指标。

## 验证

可用 Node.js 做引擎级快速验证（无需 DOM）：

```powershell
node -e "global.window=global; require('./simulator.js'); const S=global.POPSim; let s=S.reset(S.PRESETS.balanced, 42); for(let i=0;i<30;i++){ s=S.step(s); console.log(s.history.at(-1)); }"
```

## 最后更新

2026-06-15
