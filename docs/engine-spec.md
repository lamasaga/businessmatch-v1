# 引擎技术规范（Engine Spec）

> **定位**：赛事引擎（Engine Box）的全栈开发手册。覆盖 2D 页游运行时、美术资产、音效、粒子、后端结算、数据库与 API 对接。
> **读者**：AI 编程助手（vibecoding）、引擎前端开发、引擎后端开发
> **关联**：`02-ARCHITECTURE.md` §三（对局前端技术路线）· `03-ENGINEERING.md` §五（赛事引擎开发规范）· `webapp/backend/app/games/`
> **最后更新**：2026-06-06

---

## 快速参考（Quick Reference）

开发新引擎时，按此顺序执行：

| 步骤 | 做什么 | 在哪里 |
|------|--------|--------|
| 1 | 写 YAML 配置 | `content/game-configs/<engine-id>-v1.yaml` |
| 2 | 写后端引擎 | `backend/app/games/<engine-id>/`（engine.py / models.py / ai.py） |
| 3 | 写前端局内 | `frontend/src/games/<engine-id>/`（按 `meta.runtime` 选 phaser / react-game） |
| 4 | 注册路由 | `backend/app/main.py` + `frontend/src/App.tsx` |
| 5 | 跑 checklist | 见 §十一「新增引擎 Checklist」 |

**必须遵循的铁律**：
- 结算函数纯函数、幂等、不读写数据库
- AI 决策零 Token，纯规则引擎
- 引擎表名前缀 = 引擎 ID，禁止跨引擎读写
- HTTP `/state` 只读，推进只由调度器或 `practice_flow.py` 完成

---

## 目录

1. [选型原则与架构分层](#一选型原则与架构分层)
2. [2D 页游：Phaser 3 详解](#二2d-页游phaser-3-详解)
3. [UI 与交互](#三ui-与交互)
4. [美术资产管线](#四美术资产管线)
5. [动画系统](#五动画系统)
6. [声效系统](#六声效系统)
7. [粒子效果](#七粒子效果)
8. [后端算法与结算](#八后端算法与结算)
9. [数据库设计](#九数据库设计)
10. [外部 API 对接](#十外部-api-对接)
11. [最佳实践与 Checklist](#十一最佳实践与-checklist)

---

## 一、选型原则与架构分层

### 1.1 核心选型原则

| 原则 | 说明 |
|------|------|
| **运行时按玩法选** | 地图/空间/实时移动 → Phaser3；策略/面板/表格 → React 全屏 |
| **单库单进程** | 引擎内核与平台同进程，开发期可独立 dev server |
| **零 Token AI** | 练习赛 Bot 走规则引擎，不上 LLM |
| **资产懒加载** | 单局素材按需加载，首屏 < 3s |
| **配置驱动** | 数值、事件、关卡全部进 YAML，禁止硬编码 |

### 1.2 架构分层

```text
┌─ 用户前端 ──────────────────────┐
│  Game Shell (React)              │  全屏入口、加载页、错误边界
│       ↓                          │
│  ├─ runtime=phaser   → Phaser 3  │  2D 游戏场景 + React HUD overlay
│  └─ runtime=react-game → React   │  策略面板 + game-ui 组件库
└──────────────────────────────────┘
              ↓ REST / WebSocket
┌─ 平台 API (FastAPI) ─────────────┐
│  Arena 生命周期 / 决策提交 / 状态查询 │
└──────────────────────────────────┘
              ↓ 函数调用
┌─ 引擎内核 (games/<engine>/) ──────┐
│  engine.py / settle.py / ai.py   │  纯函数结算，幂等
└──────────────────────────────────┘
              ↓ SQLAlchemy
┌─ 数据库 ─────────────────────────┐
│  SQLite(开发) / PostgreSQL(生产)   │
└──────────────────────────────────┘
```

---

## 二、2D 页游：Phaser 3 详解

### 2.1 为什么选 Phaser 3

- **成熟度**：2013 年至今，社区庞大，中文资料多
- **浏览器兼容**：WebGL + Canvas 双渲染，自动降级
- **TypeScript 支持**：官方类型定义完整
- **物理引擎可选**：Arcade（轻量）、Matter（复杂）、Impact
- **不需要构建工具**：可直接 `<script src>`，也可配合 Vite/Webpack

### 2.2 安装

```bash
cd webapp/frontend
npm install phaser
npm install -D @types/phaser   # 若官方类型不完整
```

### 2.3 最小可运行场景

```typescript
// webapp/frontend/src/games/trading/scenes/MapScene.ts
import Phaser from 'phaser';

export default class MapScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;

  constructor() {
    super({ key: 'TradingMapScene' });
  }

  preload() {
    // 加载纹理图集（推荐）
    this.load.atlas('city-atlas', '/games/trading/city-atlas.png', '/games/trading/city-atlas.json');
    // 或加载单图
    this.load.image('bg', '/games/trading/bg.png');
  }

  create() {
    // 背景
    this.add.image(0, 0, 'bg').setOrigin(0);

    // 玩家商队
    this.player = this.add.sprite(400, 300, 'city-atlas', 'caravan-idle');

    // 相机跟随
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, 2048, 2048);

    // 输入
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.moveTo(pointer.worldX, pointer.worldY);
    });
  }

  update(_time: number, delta: number) {
    // 每帧更新，16ms 一次 @60fps
  }

  private moveTo(x: number, y: number) {
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
    const duration = (distance / 200) * 1000; // 速度 200px/s

    this.tweens.add({
      targets: this.player,
      x,
      y,
      duration,
      ease: 'Linear',
      onComplete: () => {
        // 到达后通知 React HUD
        this.game.events.emit('caravan-arrived', { x, y });
      },
    });
  }
}
```

### 2.4 React 与 Phaser 集成

**推荐模式**：Phaser 占全屏 Canvas，React 作为 DOM overlay。

```tsx
// webapp/frontend/src/games/trading/index.tsx
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import MapScene from './scenes/MapScene';
import GameHUD from './components/GameHUD';

export default function TradingGameEntry() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      scene: [MapScene],
      backgroundColor: '#0f172a',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      // 禁用默认右键菜单
      disableContextMenu: true,
    });

    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <GameHUD gameRef={gameRef} />
    </div>
  );
}
```

**HUD 组件接收游戏引用**：

```tsx
// webapp/frontend/src/games/trading/components/GameHUD.tsx
import { useEffect, useState } from 'react';
import Phaser from 'phaser';

interface Props {
  gameRef: React.MutableRefObject<Phaser.Game | null>;
}

export default function GameHUD({ gameRef }: Props) {
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;

    const handler = () => setArrived(true);
    game.events.on('caravan-arrived', handler);
    return () => {
      game.events.off('caravan-arrived', handler);
    };
  }, [gameRef]);

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <div className="pointer-events-auto fixed top-4 left-4 rounded-xl bg-background/80 p-4 backdrop-blur">
        <h1 className="font-bold">浮生记</h1>
        {arrived && <span className="text-success">商队已到达</span>}
      </div>
    </div>
  );
}
```

### 2.5 关键配置项

```typescript
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,           // WebGL 优先，自动回退 Canvas
  width: 1920,
  height: 1080,
  pixelArt: true,              // 像素风，关闭纹理插值
  antialias: false,            // 性能优先
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // 俯视视角无重力
      debug: import.meta.env.DEV,
    },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    mouse: true,
    touch: true,
    keyboard: true,
  },
};
```

### 2.6 性能优化

| 问题 | 方案 |
|------|------|
| 大场景卡顿 | 使用 Tilemap + 相机边界，只渲染视口内对象 |
| 多单位移动 | `arcade` 物理 + `group` 批量管理 |
| 纹理内存 | 使用 Texture Atlas（精灵图），单图 < 2048x2048 |
| 动画性能 | 优先 `tween` 而非每帧 `update` 改坐标 |
| 对象池 | `this.add.group({ classType: Caravan, maxSize: 100, runChildUpdate: true })` |

### 2.7 网络同步

Phaser 游戏状态不由前端权威决定，**所有推进由后端结算**。

```typescript
// 前端只负责：渲染 + 本地输入反馈 + 向后端提交决策
class MapScene extends Phaser.Scene {
  private ws!: WebSocket;

  create() {
    this.ws = new WebSocket(`wss://host/api/v1/trading/events/${eventId}/ws?token=${jwt}`);
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'tick') this.applyTick(msg.payload);
      if (msg.type === 'finished') this.showResult(msg.payload);
    };
  }

  private submitDecision(decision: unknown) {
    fetch(`/api/v1/trading/events/${eventId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decision),
    });
  }
}
```

---

## 三、UI 与交互

### 3.1 层级规范

| 层级 | z-index | 内容 | 技术 |
|------|---------|------|------|
| **L0 设计令牌** | — | 颜色、字体、间距 | Tailwind config |
| **L1 通用组件** | 30 | 按钮、卡片、表格、Toast、Modal | `components/game/` |
| **L2 赛事专用** | 40 | 倒计时、资源条、排行榜、回合条 | `games/<engine>/components/` |
| **HUD Overlay** | 50 | 顶部信息、底部操作栏、侧边面板 | React DOM overlay |
| **弹窗/Modal** | 60 | 确认、结果、设置 | Portal |

### 3.2 交互原则

- **所有操作有反馈**：hover、active、loading、success/error 四态
- **决策窗口明确**：倒计时条 + 按钮禁用态
- **防止误触**：确认弹窗用于不可逆操作（结束比赛、退出）
- **移动端适配**：触控目标 ≥ 44x44dp；双指缩放地图

### 3.3 推荐组件库

- 项目基础组件：`components/ui/`（按钮、输入、卡片）
- 商赛专用组件：`components/game/`（Countdown、Leaderboard、ResourceBar）
- 动画库：**Framer Motion**（React 入场/过渡）、**GSAP**（复杂时间轴）

---

## 四、美术资产管线

### 4.1 资产类型

| 类型 | 格式 | 工具 | 存放路径 |
|------|------|------|----------|
| 纹理/精灵图 | PNG/WebP | Aseprite、Photoshop | `frontend/public/games/<engine>/` |
| 精灵图集 | JSON+PNG | TexturePacker、Shoebox | 同上 `.atlas/` |
| Tilemap | Tiled JSON + 图块 | Tiled | 同上 `.tilemap/` |
| 矢量 UI | SVG | Figma | `frontend/src/assets/ui/` |
| 字体 | WOFF2 | 中文网字计划、Google Fonts | `frontend/public/fonts/` |

### 4.2 命名规范

```
city-atlas.png
city-atlas.json
bg-main-menu.png
caravan-
  ├── idle.png
  ├── move_01.png ~ move_08.png
  └── arrive.png
tilemap-
  ├── overworld.json
  └── tileset-ground.png
```

### 4.3 压缩与加载

```bash
# 推荐工具
npm install -D imagemin imagemin-webp
```

- 纹理最大 2048x2048
- WebP 优先，PNG 回退
- 音频 OGG + MP3 双格式
- 大图按需 `this.load.image()`，局内切换场景时 `this.scene.start()` 自动清理

---

## 五、动画系统

### 5.1 Phaser 动画

```typescript
// 注册动画
this.anims.create({
  key: 'caravan-move',
  frames: this.anims.generateFrameNames('city-atlas', { prefix: 'caravan-move_', start: 1, end: 8 }),
  frameRate: 12,
  repeat: -1,
});

// 播放
this.player.play('caravan-move');

// 补间
this.tweens.add({
  targets: this.player,
  alpha: 0,
  duration: 300,
  yoyo: true,
});
```

### 5.2 Spine/Spriter（复杂角色）

如果需要骨骼动画：
- **Spine**：行业标准，Phaser 有官方运行时 `phaser-spine`
- **DragonBones**：免费，Phaser 社区插件
- **建议**：商识唯智以经营模拟为主，Spine 仅用于重点 NPC/吉祥物

### 5.3 React 动画

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  回合结算面板
</motion.div>
```

---

## 六、声效系统

### 6.1 Phaser 音频

```typescript
this.load.audio('bgm-market', ['/games/trading/bgm-market.mp3', '/games/trading/bgm-market.ogg']);
this.load.audio('sfx-coin', ['/games/trading/sfx-coin.mp3']);

const bgm = this.sound.add('bgm-market', { loop: true, volume: 0.5 });
bgm.play();

this.sound.play('sfx-coin');
```

### 6.2 Web Audio API（更灵活）

```typescript
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

export function playCoinSound() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}
```

### 6.3 音频规范

| 类型 | 格式 | 大小 | 说明 |
|------|------|------|------|
| BGM | OGG / MP3 128kbps | < 3MB | 循环播放 |
| SFX | WAV / MP3 | < 50KB | 事件触发 |
| UI 音 | 程序生成或短 WAV | < 10KB | 点击、悬停 |

---

## 七、粒子效果

### 7.1 Phaser 粒子

```typescript
const particles = this.add.particles(0, 0, 'coin', {
  speed: { min: 100, max: 300 },
  angle: { min: 200, max: 340 },
  scale: { start: 1, end: 0 },
  blendMode: 'ADD',
  lifespan: 800,
  gravityY: 300,
  quantity: 10,
});

particles.explode(20, this.player.x, this.player.y);
```

### 7.2 性能注意

- 粒子数 < 500/屏
- 生命周期结束后自动销毁
- 移动设备关闭 `blendMode: 'ADD'`

---

## 八、后端算法与结算

### 8.1 结算函数规范

```python
# webapp/backend/app/games/ops_sim/engine.py
from __future__ import annotations

from typing import Any


def settle_round(
    match_state: dict[str, Any],
    decisions: dict[str, Any],        # {team_id: decision_payload}
    cfg: dict[str, Any],              # YAML 配置快照
) -> dict[str, Any]:
    """结算单轮。

    要求：
    - 纯函数：不读不写数据库
    - 幂等：同一 (round_id, decisions_hash) 多次调用结果相同
    - 可序列化：输入输出全是 dict/list/primitive
    """
    raise NotImplementedError


def ai_decision(team_state: dict[str, Any], cfg: dict[str, Any]) -> dict[str, Any]:
    """生成 AI 决策。零 Token，纯规则。"""
    raise NotImplementedError
```

### 8.2 常用算法模式

| 场景 | 算法 | 说明 |
|------|------|------|
| 市场出清 | 供需均衡价格 | `price = demand / supply * base_price` |
| 市场份额 | Softmax / Logit | 按价格/品牌/渠道计算选择概率 |
| 价格弹性 | 分段线性 | 涨价 → 销量下降 |
| 库存成本 | EOQ / 线性持有 | 每轮按库存量扣费 |
| 随机事件 | 带种子 RNG | `random.seed(round_id)` 保证可复现 |
| 排名 | 稳定排序 | 同分按提交时间或随机种子 |

### 8.3 算法实现示例

```python
import math
import random
from hashlib import sha256


def _seeded_random(round_id: str, team_id: str) -> random.Random:
    """基于轮次和队伍的种子随机，保证所有客户端/服务器结果一致。"""
    seed = sha256(f"{round_id}:{team_id}".encode()).hexdigest()
    return random.Random(seed)


def softmax(beta: float, utilities: dict[str, float]) -> dict[str, float]:
    ids = list(utilities.keys())
    max_u = max(utilities.values())
    exp_vals = {uid: math.exp(beta * (utilities[uid] - max_u)) for uid in ids}
    total = sum(exp_vals.values())
    return {uid: exp_vals[uid] / total for uid in ids}


def market_share(
    prices: dict[str, float],
    brands: dict[str, float],
    cfg: dict[str, Any],
) -> dict[str, float]:
    """计算各队在当前市场的份额。"""
    beta_price = cfg["market"]["price_sensitivity"]
    beta_brand = cfg["market"]["brand_sensitivity"]
    utilities = {
        tid: beta_price * (1 / max(prices[tid], 1)) + beta_brand * brands[tid]
        for tid in prices
    }
    return softmax(1.0, utilities)
```

---

## 九、数据库设计

### 9.1 引擎表设计原则

- 每个引擎独占一组表：`trading_*`、`tv_*`、`ops_*`、`finance_*`
- 表名前缀 = 引擎 ID
- 禁止跨引擎读他表
- 禁止引擎写 Arena 表（`competition_events` 等）

### 9.2 通用表模板

```python
# webapp/backend/app/games/ops_sim/models.py
from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base


class OpsMatchState(Base):
    __tablename__ = "ops_match_states"

    id = Column(Integer, primary_key=True)
    match_id = Column(Integer, ForeignKey("competition_events.id"), nullable=False, index=True)
    round_number = Column(Integer, nullable=False, default=1)
    team_states = Column(JSON, nullable=False, default=dict)   # {team_id: TeamState}
    market_state = Column(JSON, nullable=False, default=dict)  # 市场需求/价格
    status = Column(String(20), nullable=False, default="decision")  # decision / settlement / finished
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class OpsDecision(Base):
    __tablename__ = "ops_decisions"

    id = Column(Integer, primary_key=True)
    match_id = Column(Integer, nullable=False, index=True)
    round_number = Column(Integer, nullable=False)
    team_id = Column(String(64), nullable=False)
    payload = Column(JSON, nullable=False)    # 决策体
    submitted_at = Column(DateTime, server_default=func.now())
```

### 9.3 幂等设计

所有写入操作使用幂等键：

```python
idempotency_key = f"ops_decision:{match_id}:{round_number}:{team_id}"

existing = db.query(OpsDecision).filter_by(idempotency_key=idempotency_key).first()
if existing:
    return existing
```

---

## 十、外部 API 对接

### 10.1 平台 ↔ 引擎内部接口

同进程下直接函数调用，不走 HTTP：

```python
# webapp/backend/app/api/practice.py
from app.games.ops_sim.engine import settle_round, ai_decision

# 创建对局
match_state = create_match_state(cfg)

# 收集决策
human_decisions = collect_human_decisions(match_id)
ai_decisions = {tid: ai_decision(state, cfg) for tid in ai_teams}

# 结算
new_state = settle_round(match_state, {**human_decisions, **ai_decisions}, cfg)
write_state(new_state)
```

### 10.2 引擎 ↔ 外部服务（远期）

| 服务 | 用途 | 接口形式 |
|------|------|----------|
| LLM API | Hermes 复盘、Tyche 叙事 | HTTP SSE / async |
| 支付 | OPC 真实收入（Phase E） | Webhook |
| 短信/邮件 | 营团邀请 | 第三方 SDK |
| 地图服务 | 拟真城市地理数据 | REST / GeoJSON |

### 10.3 回调规范

引擎如需通知平台外部服务：

```python
# 事件总线，不直接 HTTP 调用
from app.domains.career.events import emit

emit("match.finished", {
    "match_id": match_id,
    "engine_id": "ops_sim",
    "result": result,
    "xp_payload": xp_payload,
})
```

---

## 十一、最佳实践与 Checklist

### 11.1 新增引擎 Checklist

- [ ] `content/game-configs/<id>.yaml` 已创建
- [ ] `backend/app/games/<engine>/` 包含 engine.py / models.py / ai.py / config.py
- [ ] 结算函数 `settle_round` 标注幂等
- [ ] AI 决策零 Token，纯规则
- [ ] `frontend/src/games/<engine>/` 包含 scenes / components / hooks / index.tsx
- [ ] YAML 中声明 `meta.runtime: phaser | react-game`
- [ ] 新路由已在 `App.tsx` 注册
- [ ] 新表已在 engine models 声明，且前缀为 `<engine>_`
- [ ] `npm run build` 通过

### 11.2 性能红线

| 指标 | 限制 |
|------|------|
| 首屏加载 | < 3s（3G 网络） |
| 运行时帧率 | ≥ 30fps（中低端手机） |
| 单场景纹理 | < 50MB |
| 粒子数 | < 500/屏 |
| 音频并发 | < 32 轨 |
| 结算延迟 | < 200ms（单轮） |

### 11.3 调试工具

- Phaser：Chrome DevTools → Rendering → FPS meter
- 网络：WebSocket 消息过滤
- 性能：`console.time('settle_round')`
- 状态：React DevTools + Zustand store

---

*商识唯智 · 引擎技术规范 v1.0*
