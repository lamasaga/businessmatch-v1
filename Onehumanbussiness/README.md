# OneHumanBusiness (OHB) — 一人公司孵化器

> BizSim Edu 商业模拟教育平台的扩展模块：让学生从“模拟经营”进阶到“真实创业”，在平台内组建 AI 数字员工团队，完成从创意验证到付费用户的完整创业闭环。

---

## 模块定位

- **层级**：MVP → OHB → 商业化（三层递进）
- **核心机制**：学生不是“和 AI 聊天”，而是**雇佣、管理、评价 AI 员工**，产出真实交付物
- **渐进真实**：模拟币 → 测试用户 → 真实付费，每一步都有 Gateway 评审把关
- **教育闭环**：OHB 中积累的经验值和徽章反哺 CareerProfile 成长体系

---

## 文档目录

### 0. 实施路径与架构评审（Implementation & Review）
| 文件 | 核心内容 |
|------|---------|
| `07-从平台学习到首项目-AI实施路径.md` | **知识→商赛→OHB→首项目** 全链路 AI 分工与分期落地 |
| `08-体系诊断与Agentic架构建议.md` | 体系不和谐点诊断、AI 优先级、**Pedagogy OS** 架构与改版路线图 |

### 1. 框架调研（Framework Research）
| 文件 | 核心内容 |
|------|---------|
| `01-产品愿景与差异化定位.md` | OHB 与 Business Model You、Entrecomp 等框架的差异化 |
| `02-系统架构与技术选型.md` | LangGraph + CrewAI + MCP + gVisor 技术栈决策 |
| `03-创业孵化流程设计.md` | IDEATE → VALIDATE → BUILD → LAUNCH → SCALE 五阶段流程 |
| `04-技术实施路线图.md` | 6 周 MVP 到 6 个月完整版本的开发排期 |
| `05-平台整合方案.md` | 与 CareerProfile、Athena、CyberCore 的集成方案 |
| `06-附录-参考资源.md` | 工具链、学术参考、开源项目清单 |

### 2. AI 员工设计（AI Employee Design）
| 文件 | 核心内容 |
|------|---------|
| `01-AI员工角色全览.md` | 13 个 AI 员工角色定义，3 个梯队，能力矩阵 |
| `02-系统Prompt设计.md` | 角色锚定、输出格式约束、苏格拉底教学法 |
| `03-技能升级与绩效系统.md` | XP 系统、解锁条件、协同加成、每周复盘 |

### 3. MCP 服务器规范（MCP Server Specs）
| 文件 | 核心内容 |
|------|---------|
| `01-MCP架构总览.md` | MCP 协议集成架构、安全策略、发现流程 |
| `02-ohb-memory-server-spec.md` | 记忆存储（store/recall/search_similar）|
| `03-ohb-atlas-server-spec.md` | 知识图谱查询（query_knowledge/unlock_node）|
| `04-ohb-sandbox-server-spec.md` | 代码沙箱（init/write/run/deploy）|

### 4. 前端原型（Frontend Prototype）
| 文件 | 核心内容 |
|------|---------|
| `01-页面路由与导航结构.md` | `/ohb/*` 路由体系、权限控制、导航设计 |
| `02-关键页面原型设计.md` | 人才市场、任务中心、员工详情、沙箱 IDE 的 UI 原型 |

### 5. 数据库与 API 规范（Database & API Specs）
| 文件 | 核心内容 |
|------|---------|
| `01-完整数据库Schema.md` | SQLAlchemy 模型：公司、员工、任务、财务、评审 5 大核心表 |
| `02-API端点与SSE设计.md` | RESTful API + SSE 实时推送的完整接口定义 |

### 6. 代码骨架（Code Skeleton）
| 文件 | 核心内容 |
|------|---------|
| `01-项目目录结构.md` | 可运行的目录树，含文件命名规范 |
| `02-SQLAlchemy模型骨架.py` | 可直接复制到后端项目的 ORM 模型 |
| `03-React组件骨架.tsx` | 可直接复制到前端项目的组件与 Zustand Store |
| `04-LangGraph工作流骨架.py` | 单智能体任务流 + 多智能体协作流 |
| `05-MCP-Server骨架.py` | 完整 MCP Server 实现（Memory/Atlas/Sandbox/Deploy）|

---

## 快速启动

### 前端集成
1. 在 `web应用商业教育/frontend/src/` 下创建 `ohb/` 目录
2. 复制 `code-skeleton/03-React组件骨架.tsx` 中的组件
3. 在 `App.tsx` 中添加 `/ohb/*` 路由

### 后端集成
1. 在 `web应用商业教育/backend/app/` 下创建 `ohb/` 目录
2. 复制 `code-skeleton/02-SQLAlchemy模型骨架.py` 中的模型
3. 复制 `code-skeleton/04-LangGraph工作流骨架.py` 中的工作流
4. 复制 `code-skeleton/05-MCP-Server骨架.py` 中的 MCP Server

### 数据库迁移
```bash
alembic revision --autogenerate -m "add_ohb_models"
alembic upgrade head
```

---

## 关键设计决策

1. **AI 员工不是 NPC**：每个学生创建的 AI 员工有独立记忆、技能成长、绩效记录
2. **安全优先**：AI 生成代码在 gVisor 沙箱运行，MCP 工具按角色权限控制
3. **渐进真实**：通过 Gateway 评审机制控制从模拟到真实的切换节奏
4. **数据互通**：OHB 中的成就自动同步到 CareerProfile，Athena 全局教练可介入

---

## 待完成事项

- [ ] Gateway 评审评分算法详细设计
- [ ] 每个 AI 员工的完整 YAML Prompt 模板
- [ ] 沙箱安全策略白皮书（gVisor 配置、网络隔离、资源限制）
- [ ] Stripe/支付宝 MCP 服务器规范（真实支付阶段）
- [ ] 教师监控面板设计（查看学生创业进度、干预机制）
- [ ] CyberCore "一人公司挑战赛" 锦标赛模式集成方案

---

*文档生成日期：2026-05-17*  
*版本：v0.1 — 规范级（Specification-Ready）*
