# 商识唯智 · 赛事引擎 PRD/BDD/SPEC 文档集

> **最后更新**：2026-06-16
> **文档定位**：本目录只收录后续赛事引擎开发会直接依赖的产品契约、行为契约与技术契约。

---

## 一、权威层级

| 层级 | 文档类型 | 用途 | 规则 |
|------|----------|------|------|
| 1 | `PRD-<ENGINE>.md` | 定义玩法、用户流程、阶段边界、胜负条件 | 产品需求以 PRD 为准 |
| 2 | `BDD-<ENGINE>.md` | 定义可验收行为场景 | 测试与联调以 BDD 为准 |
| 3 | `SPEC-<ENGINE>.md` | 定义 API、状态机、数据结构、工程 Gap | 开发落地以 SPEC 为准 |
| 4 | `../engine-spec.md` | 通用引擎技术规范 | 所有引擎共享约束 |

　　`docs/engineering-academy/` 是教学解释材料，`docs/archive/` 是历史与远期预研，均不作为默认开发契约。`inspire/` 是构想与复盘库，只有被本目录或 `03-ENGINEERING.md` 吸收后，才进入实现依据。

---

## 二、全局设计约束

1. **单库单进程**：当前 Phase A/B 默认同仓同进程导入引擎内核，不采用独立引擎服务。
2. **配置驱动**：赛制数值、城市、奖励、拍品等写入 `webapp/backend/content/game-configs/*.yaml`。
3. **域边界**：Arena 管生命周期；`games/<engine>/` 管结算与运行时表；Career 奖励只走 `settle_match_rewards`。
4. **练习 AI**：零 Token、纯规则、可预测；练习赛必须能在无教师场景下跑通。
5. **运行时选型**：地图/空间/实时移动用 `phaser`；策略/面板/表格用 `react-game`。
6. **验收口径**：PRD 讲“要什么”，BDD 讲“怎样算通过”，SPEC 讲“怎么接上代码”。

---

## 三、引擎文档清单

| 文档 | 引擎 | 状态 | 说明 |
|------|------|------|------|
| [PRD-FST.md](./PRD-FST.md) | FST / 浮生记 | 🟢 已定稿 | 即时物流套利；`engine=trading`，`game_config_id=fstrading` |
| [PRD-TECH.md](./PRD-TECH.md) | TECH / 创想大赢家 | 🟢 已定稿 | 回合制科技公司策略赛；`engine=techventure` |
| [PRD-OPS.md](./PRD-OPS.md) | OPS / 生产经营销售赛 | 🟡 目标契约 | 6 轮运营 + 2 轮拍卖；首期已贯通，仍需补齐 6+2 与无教师练习全流程 |
| [SPEC-OPS.md](./SPEC-OPS.md) | OPS / 生产经营销售赛 | 🟡 补齐契约 | API、phase、payload、P0 Gap、防复发清单 |
| [SPEC-OPS-ECONOMY.md](./SPEC-OPS-ECONOMY.md) | OPS / 经济模型 | 🟡 公式契约 | 生产、市场份额、广告、研发、库存、财务、排名、AI 的数学公式 |
| PRD-FIN.md | FIN / 金融投资 | ⚪ 待排期 | 后续新引擎 |
| PRD-ENI5.md | ENI5 / 引擎五 | ⚪ 待排期 | 占位 |
| PRD-ENI6.md | ENI6 / 引擎六 | ⚪ 待排期 | 占位 |

---

## 四、BDD 文档清单

| 文档 | 对应 PRD | 状态 | 说明 |
|------|----------|------|------|
| [BDD-OPS.md](./BDD-OPS.md) | [PRD-OPS.md](./PRD-OPS.md) | 🟡 P0 验收契约 | 覆盖无教师练习全流程、6+2 阶段推进、OPS 首期联调回归 |

　　FST 与 TECH 已有可运行实现，本轮仅做口径校准，暂不补 BDD。新增大改动时再按 `bdd-writing-guide.md` 生成对应 BDD。

---

## 五、非本轮契约

| 文档 | 处理方式 | 原因 |
|------|----------|------|
| `PRD-POP模拟器.md` / `BDD-POP模拟器.md` | 暂不纳入赛事引擎契约 | POP 属拟真城市/浏览器模拟器方向，不属于本轮 Arena 赛事引擎整理 |
| [PRD-赛事设计评估与提升建议.md](./PRD-赛事设计评估与提升建议.md) | 参考材料 | 体验、美术、可视化建议，不作为 API/玩法契约 |
| `../archive/引擎匣子对接测试指南.md` | 归档 | 独立引擎服务预研，与当前单库单进程默认架构冲突 |

---

## 六、关键参考

- [../engine-spec.md](../engine-spec.md) — 通用引擎全栈开发手册
- [../../02-ARCHITECTURE.md](../../02-ARCHITECTURE.md) — 技术架构与运行时选型
- [../../03-ENGINEERING.md](../../03-ENGINEERING.md) — 工程实现真相、API 表、Phase 门控
- [../../webapp/backend/app/domains/arena/ARCHITECTURE.md](../../webapp/backend/app/domains/arena/ARCHITECTURE.md) — Arena 与引擎分层
- [../../docs/decisions/004-CyberCore声明式赛制扩展.md](../decisions/004-CyberCore声明式赛制扩展.md) — 声明式赛制基线 ADR

---

*商识唯智 · 赛事引擎契约索引 v2.0*
