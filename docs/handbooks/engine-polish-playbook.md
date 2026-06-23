# 商业模拟赛前端体验打磨手册

> **文档定位**：把当前「网页上点点点的复杂 Excel」改造为「精致、现代化、有游戏感的商业赛事终端」的执行手册。  
> **读者**：前端开发、引擎开发、美术/策划、主理人。  
> **关联文档**：`docs/ENGINE.md` · `02-ARCHITECTURE.md` §三 · `03-ENGINEERING.md` §五 · `00-PROJECT.md` §产品架构共识  
> **对应 ADR**：`docs/decisions/012-engine-frontend-polish-stack.md`  
> **最后更新**：2026-06-23

---

## 一、当前问题诊断

目前学生端商业模拟赛给人的感受偏单调，主要原因不是「没有美术」，而是**反馈层缺失**：

| 问题 | 表现 | 后果 |
|------|------|------|
| **无动效过渡** | 点击按钮、提交决策、回合切换都是瞬间跳变 | 像表格刷新，不像游戏 |
| **无音效反馈** | 买卖、移动、事件触发全部静音 | 操作没有「手感」 |
| **视觉层次弱** | 所有信息平铺，缺乏焦点和节奏 | 学生眼睛疲劳，找不到重点 |
| **状态变化不可见** | 库存、现金、价格变化没有动画示意 | 学生难以建立决策与结果的因果感 |
| **场景感不足** | 策略类引擎只有面板，没有世界背景 | 学生难以沉浸到商业情境中 |
| **交互动效缺位** | hover、active、loading、success/error 四态不完整 | 显得粗糙、不可信 |

**核心判断**：不需要重做引擎，也**不需要**立刻上 3D 或复杂骨骼动画。先把「反馈层」补齐，就能让体验从 60 分提升到 85 分。

---

## 二、目标效果定义

我们追求的不是「炫酷」，而是**「清晰、有节奏、有回馈」**的现代化商业赛事终端：

1. **每一次操作都有反馈**：点击、拖拽、提交、收到结果，都有视觉+音效反馈。
2. **状态变化可读**：钱变少、库存增加、价格波动，都用动画和颜色表达。
3. **决策有仪式感**：回合切换、拍卖倒计时、最终结果都有戏剧化呈现。
4. **世界观可见**：即使是策略面板类引擎，也有城市背景、商品图标、角色头像。
5. **移动端可用**：触控目标足够大，动画不卡顿。

---

## 三、引擎独立身份约束

> 本节约束来自 ADR-013：每个赛事引擎都是独立的「游戏」，拥有独立的配色、UI、交互逻辑、音效与动效；除非显式说明参考某引擎，否则不能被其他引擎影响。

### 3.1 为什么需要独立身份

商业模拟赛不是「同一套皮肤换数据」的工具。不同赛事的教育情境、决策节奏、空间感差异很大：

| 引擎 | 情境感 | 节奏 | 适合风格 |
|------|--------|------|----------|
| 浮生记 FST | 长三角物流商战 | 即时 4 秒/日 | 轻盈、商旅、地图驱动 |
| TechVenture | 创投路演与团队决策 | 回合制 | 科技、专业、数据驱动 |
| OPS 产销运营 | 工厂、拍卖、供应链 | 双拍卖 + 回合 | 工业、紧张、运营仪表盘 |
| 金融投研 | 资本市场与新闻交易 | 实时/回合混合 | 沉稳、信息密集、图表驱动 |

如果强制统一主题，学生会把所有赛事当成「同一个网页应用」，失去进入不同商业情境的仪式感。

### 3.2 执行规则

1. **每个引擎独立拥有 design tokens**：颜色、字体、圆角、阴影、动画缓动函数都必须定义在 `frontend/src/games/<engine-id>/theme.css` 或等价位置，不得直接 import 其他引擎的主题文件。
2. **引擎资源目录隔离**：音效、BGM、图片、3D/Phaser 资源只放在 `frontend/public/games/<engine-id>/`，禁止跨引擎引用。
3. **共享组件只到「基础交互」层**：`components/game/` 里只允许放无主题色彩的通用组件（Toast、Loading、AnimatedNumber、SoundToggle 等）。带视觉风格的组件必须下沉到引擎目录。
4. **显式引用才允许复用**：若某引擎确实需要参考 FST 的地图交互或 TechVenture 的面板布局，须在 PRD 或代码注释中写明「参考 XXX 引擎的 YYY 设计」。
5. **PRD 必须包含视觉与交互规范**：每个引擎的 PRD 至少包含：
   - 配色方向与主色/辅色/警告色
   - 明暗风格选择
   - 核心动效清单
   - 音效/BGM 清单
   - 关键交互范式（点击、拖拽、确认、撤销等）

### 3.3 FST 专属设计先行走通

FST 作为首个被重点打磨的引擎，承担「样板间」角色：

- **配色**：青蓝 `#2EC3E5` + 暖黄 `#F6C344` + 暖橙 `#FF8A4C`，背景从深色改为浅灰/米白。
- **核心动效**：日期进度条、车辆平滑移动、交易成功金币飘字、事件卡滑入。
- **音效**：交易、移动、购车、事件、结算五类事件音效 + 1 首轻 BGM。
- **交互范式**：商品卡片快捷数量条、拖拽卖出、邻城高亮确认。

样板间验收后，其他引擎可以**参考其方法**，但**不可默认复用其视觉资产**。

### 3.4 给共享组件库的要求

- 不要夹带特定引擎的配色假设。
- 允许通过 props 传入主题 tokens，但默认值必须是中性灰/白。
- 动画参数（duration、easing）可配置，不要写死某个引擎的「弹簧感」或「机械感」。
---

## 四、技术栈选择

不推翻现有 `Phaser 3` / `React` 双运行时路线，只在上面叠加体验层。

### 3.1 运行时层（保持现有）

| 引擎类型 | 现有技术 | 说明 |
|----------|----------|------|
| 地图/空间/实时（浮生记 RTS） | **Phaser 3** | 2D Canvas/WebGL 游戏场景 |
| 策略/面板/表格（TechVenture、OPS、金融） | **React 全屏 + Tailwind** | 沉浸式 UI，无地图 |

### 3.2 新增体验层

| 能力 | 推荐库 | 用途 | 体积 |
|------|--------|------|------|
| **React 交互动画** | `framer-motion` | 入场/退场、布局变化、数字滚动、hover 反馈 | ~40KB gzipped |
| **复杂时间轴动画** | `gsap` + `@gsap/react` | 倒计时冲刺、结果揭晓、连击动画 | ~30KB（按需引） |
| **音效** | `howler` 或原生 Web Audio | UI 点击、交易成功、事件触发、BGM | ~10KB |
| **粒子效果** | Phaser 内置粒子 / `canvas-confetti` | 胜利、升级、金币获得 | 内置/轻量 |
| **图标** | `lucide-react`（已有）+ 项目 SVG | 统一、轻量、可缩放 | — |
| **数字滚动** | `framer-motion` 或自研 hook | 现金/XP 变化可视化 | — |

### 3.3 不推荐

| 方案 | 不推荐原因 |
|------|------------|
| 3D 引擎（Three.js/Babylon） | 对当前赛制宜过度；加载重、移动端风险大 |
| Spine/Live2D 骨骼动画 | 需要持续美术产能；首期 ROI 低 |
| 自研物理引擎 | 超出项目边界，用 Phaser Arcade 足够 |

---

## 六、美术资源选择

### 4.1 复用现有资产

`art-assets/fushengji/` 已经有大量可用素材：

| 目录 | 内容 | 可用于 |
|------|------|----------|
| `maps/cities/` | 6 城城市插画 SVG | 地图背景、城市选择卡 |
| `items/` | 10 种商品图标 SVG | 库存、交易、价格面板 |
| `events/` | 事件图标 SVG | 随机事件弹窗 |
| `characters/` | 交易员表情 SVG | NPC 头像、Debrief 卡片 |
| `icons/` | 金币、地图钉、仓库 | UI 图标 |
| `animations/` | 舰队移动、脉冲、加载 | 状态动画 |
| `maps/geo/basemap.webp` | 长三角底图 | 浮生记大地图 |

### 4.2 补齐缺口

| 缺口 | 建议来源 | 预算 |
|------|----------|------|
| 通用 UI 背景/边框 | AI 生成 PNG/WebP + Figma 微调 | 低 |
| 音效 | freesound.org / 爱给网 / 程序生成 | 低 |
| BGM | 免费可商用音乐库（如 filmmusic.io） | 低 |
| TechVenture/OPS 专属场景图 | AI 生成或委托插画 | 中 |
| 角色立绘 | 先用 91 号角色图鉴的 AI 生成头像 | 中 |

### 4.3 美术风格约定

- **主风格**：扁平插画 + 微渐变 + 清晰描边，偏向「现代商业模拟游戏」而非「卡通游戏」。
- **配色**：每引擎有主色调（浮生记=青蓝/暖黄，TechVenture=紫蓝，OPS=橙红，金融=墨绿）。
- **字体**：中文用「思源黑体/阿里巴巴普惠体」，数字用等宽或 DIN 风格字体。
- **动效语言**：弹簧缓出（spring out）用于成功，线性+轻微震动用于警告，淡入淡出用于信息。

---

## 七、实现过程（分阶段）

### 阶段 0：基础设施（1 周）

1. 安装依赖：
   ```bash
   cd webapp/frontend
   npm install framer-motion howler
   npm install -D @types/howler
   ```
2. 新增 `frontend/src/lib/audio.ts` 音频管理器。
3. 新增 `frontend/src/components/game/` 共享游戏组件目录。
4. 把 `art-assets/fushengji/` 按需复制/链接到 `frontend/public/games/`。

### 阶段 1：全局反馈层（1 周）

所有引擎共享：

- **Toast 通知系统**：交易成功、提交成功、错误提示。
- **加载/过渡页**：进入比赛时的全屏加载动画。
- **结果揭晓动画**：比赛结束后的排名展示。
- **全局音效开关**：玩家可静音。

### 阶段 2：按引擎打磨（每引擎 1.5～2 周）

#### 浮生记（trading）

- 接入 Phaser 3 真实地图场景，使用 `basemap.webp` + 城市 SVG。
- 商队移动用 tween 动画，到达时播放 `sfx-arrive`。
- 交易成功时金币弹出动画 + 音效。
- 事件触发时全屏事件卡 + 音效。
- HUD 用 React overlay，加入数字滚动动画。

#### TechVenture

- 全屏 React 布局，加入城市背景图。
- 投资决策面板用 framer-motion 布局动画。
- 轮次推进时「季度报告」翻页动画。
- 结果揭晓时用 gsap 时间轴展示各队排名。

#### OPS 产销运营赛

- 工厂/城市/市场用插画卡片。
- 拍卖阶段倒计时动画 + 紧张音效。
- 每轮结算时财务数字滚动。
- 需求曲线变化用简单 SVG 动画。

#### 金融投研实验室

- K 线/折线图用轻量图表库（如 `recharts` 或自研 SVG）。
- 交易执行时价格闪烁 + 成交音效。
- 新闻事件弹窗 + 市场波动视觉反馈。

### 阶段 3：AI 教练与 NPC 视觉包装（1 周）

- Debrief 卡片加入角色头像和打字机文本效果。
- NPC 对话框加入头像、情绪表情、分支选择动效。
- 赛后 Hermes 点评用语音气泡式 UI。

### 阶段 4：性能与适配（1 周）

- 移动端触控测试。
- 低端机帧率测试。
- 资源懒加载与压缩。
- 动画降级（prefers-reduced-motion）。

---

## 八、推荐项目结构

```text
webapp/frontend/
├── src/
│   ├── components/
│   │   ├── game/              # 赛事通用组件（新增）
│   │   │   ├── GameToast.tsx
│   │   │   ├── CountdownTimer.tsx
│   │   │   ├── ResourceBar.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   ├── ResultReveal.tsx
│   │   │   ├── AnimatedNumber.tsx
│   │   │   └── SoundToggle.tsx
│   │   ├── ui/                # 平台基础组件（已有）
│   │   └── platform/          # 平台级组件（已有）
│   ├── lib/
│   │   ├── audio.ts           # 音效管理器（新增）
│   │   └── motion.ts          # 共享动画变体（新增）
│   ├── games/
│   │   ├── trading/           # 浮生记
│   │   │   ├── index.tsx
│   │   │   ├── scenes/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── assets/
│   │   ├── techventure/       # 创投
│   │   ├── ops-sim/           # 产销
│   │   └── finance-lab/       # 金融
│   └── styles/
│       └── game-tokens.css    # 游戏专用设计令牌（新增）
└── public/
    └── games/
        ├── shared/            # 共享音效、BGM、字体
        ├── trading/           # 浮生记美术资源
        ├── techventure/
        ├── ops-sim/
        └── finance-lab/
```

`art-assets/` 作为**源文件仓库**，构建时通过脚本复制到 `public/games/`；`public/games/` 不直接提交，加入 `.gitignore`。

---

## 九、关键组件设计

### 7.1 音效管理器

```typescript
// frontend/src/lib/audio.ts
import { Howl } from 'howler';

const sounds: Record<string, Howl> = {};

export function preloadSounds(engine: string) {
  const manifest = [`/games/${engine}/sfx/click.mp3`, `/games/${engine}/sfx/success.mp3`];
  manifest.forEach((src) => {
    sounds[src] = new Howl({ src: [src], volume: 0.5 });
  });
}

export function playSfx(name: string) {
  sounds[name]?.play();
}
```

### 7.2 数字滚动组件

```tsx
// frontend/src/components/game/AnimatedNumber.tsx
import { useSpring, animated } from 'framer-motion';

export function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 100, damping: 20 });
  // 绑定 value 变化
  return <animated.span>{spring.get()}</animated.span>;
}
```

### 7.3 全局 Toast

```tsx
// frontend/src/components/game/GameToast.tsx
import { motion, AnimatePresence } from 'framer-motion';

export function GameToast({ messages }: { messages: string[] }) {
  return (
    <AnimatePresence>
      {messages.map((msg) => (
        <motion.div
          key={msg}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="rounded-lg bg-background/90 px-4 py-2 shadow-lg"
        >
          {msg}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
```

---

## 十、验收标准

| 检查项 | 标准 |
|--------|------|
| 操作反馈 | 每个可交互元素都有 hover/active/success/error 四态 |
| 音效覆盖 | 每个引擎至少 5 个事件音效 + 1 首 BGM |
| 数字动画 | 现金、库存、XP 变化时有滚动动画 |
| 过渡动画 | 页面/面板切换、回合切换有过渡 |
| 移动端 | 中低端手机 30fps，触控目标 ≥ 44px |
| 可访问性 | 支持 `prefers-reduced-motion` |
| 构建通过 | `npm run build` 无报错，包体积增幅 < 15% |

---

## 十一、时间与人力估算

按 1 名前端 + 0.5 名美术 + 0.5 名策划/音效兼职：

| 阶段 | 时间 | 产出 |
|------|------|------|
| 基础设施 | 1 周 | 依赖、音频管理器、资源管线 |
| 全局反馈层 | 1 周 | Toast、加载、结果、音效开关 |
| 浮生记打磨 | 2 周 | Phaser 地图、商队动画、交易反馈 |
| TechVenture 打磨 | 1.5 周 | 城市背景、面板动画、结果揭晓 |
| OPS 打磨 | 1.5 周 | 工厂插画、拍卖倒计时、财务动画 |
| 金融投研打磨 | 1.5 周 | 图表动画、交易反馈、新闻弹窗 |
| NPC/AI 教练包装 | 1 周 | 角色头像、Debrief 卡片、对话框 |
| 性能适配 | 1 周 | 移动端、低端机、资源压缩 |
| **合计** | **约 10～11 周** | 四个引擎全部精致化 |

如果人力紧张，建议优先做：**浮生记 + 全局反馈层 + OPS**，其余引擎先保证「可用+有基础动效」。

---

## 十二、风险与对策

| 风险 | 对策 |
|------|------|
| 美术产能跟不上 | 先用 AI 生成/素材库占位，保证动效和反馈先上线 |
| 包体积膨胀 | 资源懒加载、WebP/OGG 优先、音效压缩 |
| 移动端卡顿 | 粒子数限制、动画降级、减少同时播放音轨 |
| 引擎核心逻辑被干扰 | 体验层只读状态，不改动结算；先写测试再动 UI |
| 过度设计 | 坚持「反馈优先于装饰」；每个动效都要有功能意义 |

---

## 十三、下一步行动

1. 确认本手册和 ADR-012，安装 `framer-motion` + `howler`。
2. 从 `art-assets/fushengji/` 导出首批可用资源到 `public/games/trading/`。
3. 实现 `components/game/` 三个基础组件：`GameToast`、`AnimatedNumber`、`SoundToggle`。
4. 选择 1 个引擎（建议浮生记）做端到端体验打磨样板间。
5. 样板间验收后，再复制到其他引擎。

---

*商识唯智 · 商业模拟赛前端体验打磨手册 v1.0*
