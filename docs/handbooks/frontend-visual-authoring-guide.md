# 前端视觉编排与动画调试手册

> **文档定位**：解决 Phaser / React 前端在地图定位、精灵动画、移动轨迹等视觉实现上「凭感觉调代码」的痛点。  
> **读者**：前端开发、引擎开发、美术/策划、主理人。  
> **关联文档**：`docs/handbooks/engine-polish-playbook.md` · `docs/engines/fst/PRD.md` §7.5 · `docs/decisions/013-per-engine-identity.md`  
> **最后更新**：2026-06-23

---

## 一、核心问题诊断

当前前端视觉实现最费时间的不是「写动画代码」，而是**看不见坐标、路径、时序**：

| 痛点 | 表现 | 后果 |
|------|------|------|
| 城市位置靠猜 | 改一个 `x/y` 像素值就要重启游戏看效果 | 反复试 20 次才对准 |
| 车辆轨迹不直观 | 移动代码里塞满三角函数、插值公式 | 稍微改下速度就穿帮 |
| 动画节奏难把握 | 只能凭肉眼判断快慢 | 有的设备快、有的设备慢 |
| 美术与代码脱节 | 美术出 PNG，开发手写坐标 | 位置、锚点、碰撞框对不上 |
| 调试信息缺失 | 运行时看不到坐标、路径、状态 | Bug 定位全靠 console.log |

**核心判断**：把「视觉编排」从代码里抽出来，变成可编辑、可预览、可热重载的数据。

---

## 二、核心思路：数据驱动 + 可视化编排

### 2.1 三层分离

```
视觉层（Phaser/React） ← 读取
编排数据（JSON/YAML）  ← 编辑
引擎状态（API/WebSocket） ← 驱动
```

- **视觉层**：只负责渲染、动画、反馈，不硬编码坐标和路径。
- **编排数据**：城市坐标、路线航点、动画参数全部放在外部配置里。
- **引擎状态**：位置、库存、日期等真实状态只从后端来。

### 2.2 关键原则

1. **所有坐标可视化**：地图上每个点都要有名字、可拖动、可导出。
2. **所有路径航点化**：车辆移动不是「A→B 直线公式」，而是「沿 waypoint 列表插值」。
3. **所有动画参数化**：时长、缓动、延迟、缩放都抽成配置，支持运行时调试面板。
4. **所有状态可看见**：开发模式下显示坐标、速度、目标、当前 day、transit 进度。

---

## 三、城市与地图定位

### 3.1 推荐工作流

**方式 A：Phaser Editor / Tiled（推荐有美术参与时）**

1. 美术在 Tiled 里导入底图 (`basemap.webp`)。
2. 新建对象层 `cities`，用点对象标注每个城市，命名如 `shanghai`、`hangzhou`。
3. 导出 JSON (`yangtze_6.json`)。
4. 游戏加载时读取该 JSON，自动生成城市节点。

```json
{
  "layers": [
    {
      "name": "cities",
      "objects": [
        { "name": "shanghai", "x": 640, "y": 280 },
        { "name": "hangzhou", "x": 580, "y": 420 }
      ]
    }
  ]
}
```

**方式 B：自研 Dev Overlay（推荐快速迭代）**

在 `MapScene` 中开启一个 `devMode`：

- 显示半透明网格。
- 城市节点可拖拽。
- 拖拽结束后在控制台输出最新坐标。
- 提供「导出 JSON」按钮。

```typescript
// games/trading/scenes/MapScene.ts
if (import.meta.env.DEV) {
  this.input.on('dragend', (pointer, gameObject) => {
    console.log(`${gameObject.name}: { x: ${gameObject.x}, y: ${gameObject.y} }`);
  });
}
```

### 3.2 坐标系约定

| 坐标系 | 说明 | 使用场景 |
|--------|------|----------|
| 世界坐标 | Phaser 场景的原始 x/y | 配置、后端无关 |
| 屏幕坐标 | 经相机缩放/偏移后的位置 | UI overlay 定位 |
| 归一化坐标 | 0~1 相对底图比例 | 响应式适配、多分辨率 |

**建议**：配置文件里先存**归一化坐标**，运行时乘以当前底图尺寸得到世界坐标。这样换底图分辨率时城市位置不变。

```typescript
const city = { name: 'shanghai', nx: 0.64, ny: 0.28 };
const worldX = city.nx * bg.width;
const worldY = city.ny * bg.height;
```

---

## 四、车辆移动轨迹

### 4.1 不要写死公式，用航点

车辆从 A 到 B 的「真实感」来自路线形状，而不是简单直线。

**推荐数据结构**：

```typescript
interface Route {
  from: string;      // 城市 id
  to: string;
  waypoints: { x: number; y: number }[]; // 中间点
  distance: number;  // 路径总长度（像素）
}
```

**移动逻辑**：

```typescript
// 根据已行驶比例 t（0~1）在航点间插值
function getPositionOnRoute(route: Route, t: number) {
  const total = route.distance;
  const targetDistance = t * total;
  let accumulated = 0;
  for (let i = 0; i < route.waypoints.length - 1; i++) {
    const a = route.waypoints[i];
    const b = route.waypoints[i + 1];
    const seg = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
    if (accumulated + seg >= targetDistance) {
      const localT = (targetDistance - accumulated) / seg;
      return { x: Phaser.Math.Linear(a.x, b.x, localT), y: Phaser.Math.Linear(a.y, b.y, localT) };
    }
    accumulated += seg;
  }
  return route.waypoints[route.waypoints.length - 1];
}
```

### 4.2 路线可视化调试

在 devMode 下把路线画出来：

```typescript
const graphics = this.add.graphics();
graphics.lineStyle(2, 0xff0000, 0.5);
graphics.beginPath();
graphics.moveTo(waypoints[0].x, waypoints[0].y);
waypoints.slice(1).forEach(p => graphics.lineTo(p.x, p.y));
graphics.strokePath();
```

### 4.3 平滑转向与车头朝向

车辆不要只平移位置，还要根据路径切线旋转：

```typescript
// 每帧更新
const current = getPositionOnRoute(route, t);
const next = getPositionOnRoute(route, Math.min(1, t + 0.01));
vehicle.setPosition(current.x, current.y);
vehicle.setRotation(Math.atan2(next.y - current.y, next.x - current.x));
```

### 4.4 移动与日期同步

FST 中车辆需要跨多日移动。不要每帧重新计算目标，而是：

```typescript
// 根据引擎状态计算 t
t = (currentDay - departureDay) / travelDays;
// 用 Phaser tween 只做视觉插值，不改变真实状态
this.tweens.add({
  targets: marker,
  props: { visualT: { from: startT, to: endT } },
  duration: dayIntervalSec * 1000,
  ease: 'Linear',
});
```

---

## 五、动画节奏控制

### 5.1 时间参数全部外置

```yaml
# content/game-configs/fstrading-ui.yaml
animations:
  day_progress:
    duration_ms: 4000          # 对应 4 秒/日
    ease: "Sine.easeInOut"
  vehicle_move:
    ease: "Linear"
  trade_success:
    pop_duration_ms: 300
    float_duration_ms: 600
```

### 5.2 开发模式下调速

提供全局时间缩放，方便看慢动作：

```typescript
const TIME_SCALE = import.meta.env.DEV ? 0.25 : 1.0;
this.tweens.timeScale = TIME_SCALE;
```

### 5.3 动画可观测

每个动画对象都给一个名字和调试信息：

```typescript
this.tweens.add({
  targets: marker,
  x: targetX,
  duration: 4000,
  onUpdate: (tween) => {
    if (window.__DEBUG_ANIMS) {
      console.log(`[move-${marker.name}] progress=${tween.progress}`);
    }
  },
});
```

---

## 六、推荐工具

| 工具 | 用途 | 成本 | 接入方式 |
|------|------|------|----------|
| **Tiled** | 地图/城市/路线可视化编辑 | 免费 | 导出 JSON，Phaser 加载 |
| **Phaser Editor 2D** | 场景、动画、精灵可视化 | 付费/社区版 | 直接生成 Phaser 代码 |
| **Chrome DevTools > Animations** | 调试 CSS/JS 动画时序 | 免费 | 浏览器内置 |
| **dat.GUI / tweakpane** | 运行时参数面板 | 免费 | npm 安装 |
| **React DevTools Profiler** | 分析 React overlay 渲染 | 免费 | 浏览器插件 |

### 6.1 运行时调试面板示例

```typescript
import { Pane } from 'tweakpane';

const pane = new Pane({ title: 'FST Visual Debug' });
const params = {
  timeScale: 1.0,
  showGrid: true,
  showRoutes: true,
  showColliders: false,
};

pane.addBinding(params, 'timeScale', { min: 0.1, max: 2.0 });
pane.addBinding(params, 'showGrid');
```

---

## 七、项目结构建议

```
webapp/frontend/src/games/trading/
├── scenes/
│   └── MapScene.ts
├── components/
│   ├── DevOverlay.tsx          # 调试面板（仅 dev）
│   ├── CityMarker.tsx
│   └── VehicleSprite.tsx
├── data/
│   ├── yangtze_6.json          # Tiled 导出
│   ├── city-layout.yaml        # 城市坐标/归一化
│   ├── routes.yaml             # 路线航点
│   └── animations.yaml         # 动画参数
├── lib/
│   ├── routeInterpolation.ts   # 航点插值
│   └── coordinateTransform.ts  # 坐标系转换
└── theme.css
```

---

## 八、快速检查清单

- [ ] 城市坐标存在外部配置，不是硬编码在 TS 里。
- [ ] 路线用航点表示，能在 devMode 下可视化。
- [ ] 车辆移动时同时更新位置和旋转角度。
- [ ] 动画时长、缓动可配置，devMode 下可慢放。
- [ ] 开发模式显示坐标、网格、路线、状态信息。
- [ ] 美术资源与代码之间有明确的锚点、尺寸约定。

---

*商识唯智 · 前端视觉编排与动画调试手册 v1.0*