 # ADR-012: 商业模拟赛前端体验增强技术栈

 **日期**：2026-06-22  
 **状态**：已采纳  
 **触发**：M1（在多个可行方案中做选型）、M2（引入核心依赖/库）

 ---

 ## 上下文

 当前学生端商业模拟赛（trading/TechVenture/OPS 等）的前端被反馈为「像网页上点点点的复杂 Excel」：反馈缺失、动效缺失、音效缺失、场景感弱。  
 我们需要在不推翻现有引擎架构、不引入过重技术债务的前提下，选择一套能显著提升交互质感的技术方案。

 ---

 ## 决策

 我们决定**在现有运行时之上叠加体验层**，不替换底层技术栈：

 - 保持 `Phaser 3` 用于地图/空间/实时类引擎（浮生记 RTS）。
 - 保持 `React + Tailwind` 用于策略/面板类引擎（TechVenture、OPS、金融）。
 - 引入 `framer-motion` 处理 React 交互动画与布局变化。
 - 引入 `howler` 处理音效与 BGM。
 - 引入 `gsap` 处理复杂时间轴动画（结果揭晓、倒计时冲刺等）。
 - 使用 Phaser 内置粒子系统处理游戏内粒子效果。
 - 复用 `art-assets/fushengji/` 已有 SVG/WebP 美术资源，按需补缺口。

 **落地位置**：

 - 实现手册：`docs/handbooks/engine-polish-playbook.md`
 - 引擎规范：`docs/ENGINE.md` §三～§七
 - 共享组件：`frontend/src/components/game/`
 - 音效管理器：`frontend/src/lib/audio.ts`
 - 公共资源：`frontend/public/games/shared/`
 - 引擎资源：`frontend/public/games/<engine>/`

 ---

 ## 考虑过的方案

 | 方案 | 优点 | 缺点 | 未采用原因 |
 |------|------|------|------------|
 | A. 重写为 3D（Three.js/Babylon） | 视觉冲击强 | 加载重、移动端风险大、美术产能要求高、偏离当前赛制需求 | 过度设计 |
 | B. 自研动画/音效系统 | 完全可控 | 重复造轮子、维护成本高、开发周期长 | 不经济 |
 | C. **成熟轻量库叠加（已采纳）** | 社区成熟、学习曲线低、可渐进改造、与现有栈兼容 | 需要管理依赖版本和包体积 | 最符合当前阶段目标 |

 ---

 ## 后果

 ### 正面

 - 不改引擎核心结算逻辑，风险可控。
 - 可以按引擎逐步打磨，不阻塞其他开发。
 - 美术资源可复用 `art-assets/fushengji/`，降低前期投入。
 - 学生端体验从「表格感」提升到「现代化游戏终端感」。

 ### 负面 / 代价

 - 包体积增加约 80～120KB（gzipped），需要严格按需引入。
 - 需要为每个引擎补充音效和专属美术，持续有内容生产成本。
 - 动画和音效需要测试低端设备和 `prefers-reduced-motion`。

 ### 给初学者的操作提示

 - **可以做的**：
   - 在 `frontend/src/components/game/` 新增共享游戏组件。
   - 用 `howler` 统一管理音效，避免在每个组件里直接 `new Audio()`。
   - 用 `framer-motion` 给按钮、面板、数字变化加动画。
   - 复用 `art-assets/fushengji/` 里的 SVG 作为起点。
 - **不要做的**：
   - 不要在前端动画函数里修改比赛状态或调用结算。
   - 不要为每个小动效都引入 GSAP，简单动画用 framer-motion 即可。
   - 不要一次性为所有引擎同时打磨，先做一个样板间引擎。
 - **相关阅读**：
   - `docs/handbooks/engine-polish-playbook.md`
   - `docs/ENGINE.md` §三（UI 与交互）· §五（动画）· §六（声效）· §七（粒子）
   - `00-PROJECT.md` §产品架构共识

 ---

 ## 关联

 - 规则：`.cursor/rules/blueprint-coding.mdc`（Phase 门控、双前端分离）
 - 文档：`03-ENGINEERING.md` §五 · `docs/ENGINE.md`
 - 其他 ADR：ADR-004（CyberCore 声明式赛制扩展）、ADR-006（学生端与组织者端双前端）
