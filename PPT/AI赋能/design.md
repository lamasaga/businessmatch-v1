# AI 赋能 PPT · 皮革棕空间感设计风格（可迁移）

> 适用文件：`PPT/AI赋能/index.html`  
> 目标：**皮革棕空间感背景** + **冷色镜面反光卡片** + **高对比可读性**  
> 最后更新：2026-05-28

---

## 1) 设计定位（一句话）

　　这是一个「**暖棕皮革空间**」的舞台，上面叠加「**冷色镜面反光**」的内容卡片；整体沉稳、有质感、有前后层次，但不花哨、不抢内容。

---

## 2) 色彩体系（Tokens）

　　所有风格尽量通过 `:root` token 控制，迁移时优先复制这段变量。

```css
:root {
  /* Leather brown palette */
  --bg: #1f140f;
  --bg-deep: #170e0b;
  --bg-mid: #241712;
  --bg-high: #2d1e18;

  /* Card materials */
  --bg-card: rgba(29, 18, 13, 0.80);
  --bg-card-2: rgba(38, 24, 18, 0.78);

  /* Cool specular highlight */
  --spec-a: rgba(96, 165, 250, 0.18);
  --spec-b: rgba(125, 211, 252, 0.12);
  --spec-c: rgba(255, 255, 255, 0.03);

  /* Leather grain */
  --grain-a: rgba(255, 255, 255, 0.012);
  --grain-b: rgba(0, 0, 0, 0.035);

  /* Text */
  --text: #f1f5f9;
  --text-2: #94a3b8;
  --text-3: #64748b;

  /* UI */
  --border: rgba(148, 163, 184, 0.14);
  --accent: #3b82f6;
}
```

---

## 3) 背景材质：皮革棕 + 暗纹 + 空间光斑

　　背景由 **5 层**叠加构成：暖色光斑（右上）、冷色光斑（左下）、中心微亮、皮革暗纹、基础棕色渐变。迁移时复制 `viewport` 的 `background` 即可。

```css
.viewport {
  background:
    radial-gradient(1200px 700px at 85% 10%, rgba(245, 158, 11, 0.07), transparent 62%),
    radial-gradient(980px 600px at 10% 92%, rgba(96, 165, 250, 0.05), transparent 62%),
    radial-gradient(760px 480px at 48% 40%, rgba(255, 255, 255, 0.02), transparent 60%),
    repeating-linear-gradient(135deg, var(--grain-a) 0 2px, var(--grain-b) 2px 7px),
    linear-gradient(160deg, var(--bg-high) 0%, var(--bg) 55%, var(--bg-deep) 100%);
}
```

### 3.1 暗纹（grain）建议

- **grain 角度**：`135deg`（斜向更像皮革纹理）
- **grain 间距**：`2px / 7px`（不形成明显条纹）
- **grain 强度**：`--grain-a` 与 `--grain-b` 必须极弱，否则会抢文字

---

## 4) 内容卡片材质：冷色镜面反光（微妙）

　　“镜面反光”的本质是：在卡片上叠加一层**偏冷**的高光渐变，并使用 `mix-blend-mode: screen` 让高光只在暗底上显现，形成微微的玻璃/镜面质感。

### 4.1 统一适用的卡片集合（建议）

　　对所有「文本框/卡片」统一加 `::before` 反光层与 `::after` 顶边微亮线，保证整份 PPT 的材料一致。

```css
.principle,
.flow-line,
.pillar-card,
.pillar-brand,
.agent-block,
.j-card,
.phase-card,
.overview-item { position: relative; overflow: hidden; }

.principle::before,
.flow-line::before,
.pillar-card::before,
.pillar-brand::before,
.agent-block::before,
.j-card::before,
.phase-card::before,
.overview-item::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(165deg, var(--spec-a) 0%, rgba(96, 165, 250, 0.00) 38%),
    linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.00) 30%),
    radial-gradient(420px 220px at 18% 12%, var(--spec-b), rgba(125, 211, 252, 0.00) 62%);
  opacity: 0.75;
  mix-blend-mode: screen;
}

.principle::after,
.pillar-card::after,
.pillar-brand::after,
.agent-block::after,
.j-card::after,
.phase-card::after,
.flow-line::after {
  content: "";
  position: absolute;
  left: 12px;
  right: 12px;
  top: 10px;
  height: 1px;
  pointer-events: none;
  background: linear-gradient(90deg, rgba(125, 211, 252, 0.00), rgba(125, 211, 252, 0.16), rgba(255, 255, 255, 0.00));
  opacity: 0.75;
}
```

### 4.2 强度调参（最常用）

- **高光更明显**：提高 `--spec-a / --spec-b` 或提高 `::before opacity`（建议范围 0.65～0.85）
- **更克制**：降低 `::after opacity` 或把顶边线颜色从 `0.16` 降到 `0.10`

---

## 5) 排版比例（大气感来源）

　　这个风格的“高级感”来自 **大字号 + 低密度 + 明确层级**，而不是复杂装饰。

- **页面内边距**：`padding: 52px 64px 80px`
- **主标题**：`36px / 800`
- **导语**：`18px / line-height 1.65`
- **卡片标题**：`22px / 800`
- **要点列表**：标题 `22px`，说明 `16px`
- **圆角**：容器 `12px`，卡片 `14px`，主品牌卡 `16px`

---

## 6) 组件约定（推荐复用）

### 6.1 舞台与页面切换

- **舞台容器**：`.viewport`（背景材质与边框/阴影集中在这里）
- **切页动效**：`opacity + translateX`，`0.35s`，避免夸张动画

### 6.2 信息块

- **四原则**：`.principle`（2×2 大卡，适合“价值宣言”）
- **六支柱架构**：`.pillar-card`（2×3 大卡，卡片左侧用 `border-left` 表示支柱色）
- **支柱页结构**：`.pillar-slide` = 左“品牌卡” + 右“三条价值”

---

## 7) 迁移清单（复制即可用）

1. 复制 `:root` token（色彩、grain、specular）
2. 复制 `.viewport` 的 `background`（五层叠加）
3. 复制「镜面反光层」的 `::before / ::after` 规则块
4. 复制排版尺度（padding / font-size / border-radius）

---

## 8) 不要做（避免廉价感）

- 不要使用明显渐变文字、霓虹外发光、强反光（会变“塑料”）
- 不要把暗纹加重到可见条纹（会抢内容）
- 不要把所有元素都做成按钮式描边（会碎）

