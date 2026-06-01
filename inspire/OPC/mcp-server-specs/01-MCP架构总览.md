# OPC · MCP 架构总览

> **文档定位**：定义 OPC 平台中 MCP（Model Context Protocol）的整体部署架构、工具发现机制、权限模型、调用链路追踪、错误处理与成本管控策略。
>
> **关联文档**：`02-OPC-memory-server-spec.md`、`03-OPC-atlas-server-spec.md`、`04-OPC-sandbox-server-spec.md`、`05-OPC-ethos-server-spec.md`、`06-OPC-report-server-spec.md`、`07-第三方MCP集成清单.md`
>
> **最后更新**：2026-05-17

---

## 一、MCP Client-Server 部署架构

### 1.1 架构拓扑图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              用户接触层 (Touch Layer)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  学生创业端   │  │  AI员工局    │  │   导师看板   │  │   创意工作室  │        │
│  │  (Web/App)   │  │   (Web)      │  │   (Web)      │  │   (Web)      │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
└─────────┼─────────────────┼─────────────────┼─────────────────┼────────────────┘
          │                 │                 │                 │
          └─────────────────┴────────┬────────┴─────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MCP Client 层                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      OPC MCP Router (Gateway)                            │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │   │
│  │  │ 连接管理器  │  │ 认证中间件  │  │ 限流器      │  │ 调用日志收集器      │ │   │
│  │  │Connection  │  │  Auth      │  │Rate Limiter│  │   Call Logger      │ │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────────────┘ │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │   │
│  │  │ 工具注册表  │  │ 权限引擎    │  │ 错误处理器  │  │ 成本计量器          │ │   │
│  │  │ Tool Registry│ │ Permission │  │  Error     │  │  Cost Meter        │ │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│  ┌─────────────────────────────────┼─────────────────────────────────────────┐ │
│  │           AI Agent Runtime      ▼                                         │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │ │
│  │  │ Cortex   │ │ Worker   │ │ Advisor  │ │ Scout    │ │ ...      │        │ │
│  │  │ 战略大脑  │ │ 执行员工  │ │ 专业顾问  │ │ 市场探员  │ │ 其他Agent│        │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘        │ │
│  │       └────────────┴────────────┴────────────┴────────────┘               │ │
│  │                          MCP Client SDK                                   │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │   内部 MCP      │ │   内部 MCP      │ │   内部 MCP      │
        │   OPC-memory    │ │   OPC-sandbox   │ │   OPC-ethos     │
        │   OPC-atlas     │ │   OPC-report    │ │   OPC-pipeline  │
        └─────────────────┘ └─────────────────┘ └─────────────────┘
                    │                │                │
                    └────────────────┼────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │   第三方 MCP    │ │   第三方 MCP    │ │   第三方 MCP    │
        │   GitHub        │ │   Vercel        │ │   Stripe        │
        │   Supabase      │ │   Figma         │ │   Twitter       │
        │   Notion        │ │   Resend        │ │   ...           │
        └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 1.2 核心组件职责

| 组件 | 代号 | 职责描述 | 技术选型 |
|------|------|----------|----------|
| **MCP Router** | `mcp-gateway` | 统一入口，管理所有Client-Server连接 | FastAPI + WebSocket |
| **连接管理器** | `conn-manager` | 维护长连接池，心跳检测，自动重连 | Python `mcp` SDK |
| **认证中间件** | `auth-middleware` | JWT校验，OAuth2回调处理 | `python-jose` + OAuth2 |
| **限流器** | `rate-limiter` | 按用户/按工具/按时段的调用频率控制 | Redis + 滑动窗口 |
| **调用日志器** | `call-logger` | 全链路调用记录，支持追踪与审计 | PostgreSQL + Kafka |
| **权限引擎** | `permission-engine` | 动态权限判定，RBAC+ABAC混合模型 | Casbin / OPA |
| **成本计量器** | `cost-meter` | Token消耗、API调用费用的实时统计 | Redis + PostgreSQL |

---

## 二、工具发现与注册流程

### 2.1 服务注册生命周期

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Server  │───▶│  Health  │───▶│  Schema  │───▶│  Catalog │───▶│  Client  │
│  启动    │    │  健康检查 │    │  注册     │    │  发布    │    │  发现    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### 2.2 注册流程详解

**Step 1: Server 启动自检**

每个 MCP Server（内部或第三方）启动后，首先执行 `initialize` 握手：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": { "listChanged": true },
      "resources": { "subscribe": false }
    },
    "clientInfo": {
      "name": "OPC-memory-server",
      "version": "1.0.0"
    }
  }
}
```

**Step 2: 工具列表注册**

Server 通过 `tools/list` 暴露所有可用工具的 JSON Schema：

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "result": {
    "tools": [
      {
        "name": "memory_search",
        "description": "基于向量语义检索AI员工的历史经验记忆",
        "inputSchema": { /* JSON Schema */ },
        "outputSchema": { /* JSON Schema */ }
      }
    ]
  }
}
```

**Step 3: 权限标签绑定**

Router 为每个工具附加权限元数据：

```yaml
tool_permissions:
  memory_search:
    required_scope: ["memory:read"]
    min_level: "L1"
    rate_limit: "100/hour"
    cost_budget: "0.5 USD/day"
  
  execute_code:
    required_scope: ["sandbox:execute", "code:write"]
    min_level: "L2"
    rate_limit: "50/hour"
    cost_budget: "2.0 USD/day"
    requires_approval: true
```

**Step 4: 动态发现通知**

当 Server 新增或下线工具时，通过 `notifications/tools/list_changed` 推送变更：

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/list_changed"
}
```

### 2.3 工具发现 API

```
GET /api/v1/mcp/tools/discover
Headers:
  Authorization: Bearer <jwt_token>
  X-Student-Level: L3
  X-Company-Id: comp_abc123

Response:
{
  "available_tools": [
    {
      "server": "OPC-memory",
      "tool": "memory_search",
      "description": "...",
      "permission": "granted",
      "rate_limit_remaining": 87,
      "cost_budget_remaining": "0.42 USD"
    },
    {
      "server": "OPC-sandbox",
      "tool": "execute_code",
      "description": "...",
      "permission": "pending_approval",
      "reason": "需要导师审批后方可使用代码执行功能"
    }
  ]
}
```

---

## 三、权限模型

### 3.1 三级权限体系

OPC 采用 **学生级 → 学校级 → 平台级** 的三层递进权限模型，确保工具访问的安全可控。

#### 学生级权限（Student-Level）

| 等级 | 代号 | 描述 | 典型工具权限 |
|------|------|------|-------------|
| L1 实习生 | `level_1` | 默认权限，可执行只读和基础操作 | `memory_search`, `concept_lookup`, `web_search` |
| L2 专员 | `level_2` | 完成5个任务后解锁，可执行标准写入操作 | `memory_store`, `generate_bmc_pdf`, `execute_code` |
| L3 资深 | `level_3` | 完成20个任务且满意度>4.5，可使用进阶工具 | `memory_update`, `deploy_preview`, `stripe:create_product` |
| L4 专家 | `level_4` | 完成50个任务且项目上线，可跨领域调用 | `package_install`, `github:merge_pr`, `vercel:prod_deploy` |
| L5 合伙人 | `level_5` | 公司月收入>5000元，全平台工具开放 | 所有工具，包括高风险的财务/法务操作 |

#### 学校级权限（School-Level）

学校管理员可通过后台配置全校的默认工具白名单：

```yaml
# school_policy.yaml
school_id: "sch_beijing_101"
tool_policy:
  allowed_servers:
    - "OPC-memory"
    - "OPC-atlas"
    - "OPC-report"
    - "github"
    - "vercel"
  blocked_tools:
    - "stripe:create_charge"      # 禁止真实支付
    - "sandbox:execute_shell"     # 禁止Shell执行
    - "twitter:post_tweet"        # 禁止自动发推
  override_student_level: true     # 学校策略可覆盖学生等级
  require_teacher_approval_for:
    - "execute_code"
    - "deploy_preview"
```

#### 平台级权限（Platform-Level）

平台运营方控制的最高级安全策略：

```yaml
# platform_policy.yaml
platform_safety:
  global_rate_limits:
    per_student_per_minute: 60
    per_school_per_second: 100
  cost_ceiling:
    per_student_per_month: "20 USD"
    per_school_per_month: "5000 USD"
  forbidden_patterns:
    - "rm -rf /"
    - "DROP TABLE"
    - "os.system"
  mandatory_audit_tools:
    - "OPC-ethos:review_content"
    - "OPC-ethos:scan_secrets"
```

### 3.2 权限判定流程

```
学生请求调用 tool_X
    │
    ▼
┌─────────────────┐
│ 1. 解析JWT身份   │
│    student_id   │
│    school_id    │
│    level        │
└────────┬────────┘
         ▼
┌─────────────────┐     否     ┌─────────────────┐
│ 2. 检查平台黑名单│ ─────────▶ │  拒绝: BLOCKED   │
│    工具/模式    │            │  平台策略禁止     │
└────────┬────────┘            └─────────────────┘
         │ 是
         ▼
┌─────────────────┐     否     ┌─────────────────┐
│ 3. 检查学校白名单│ ─────────▶ │  拒绝: FORBIDDEN │
│    是否允许     │            │  学校策略禁止     │
└────────┬────────┘            └─────────────────┘
         │ 是
         ▼
┌─────────────────┐     否     ┌─────────────────┐
│ 4. 检查学生等级  │ ─────────▶ │  拒绝: LEVEL_LOW │
│    是否达标     │            │  等级不足，需升级 │
└────────┬────────┘            └─────────────────┘
         │ 是
         ▼
┌─────────────────┐     否     ┌─────────────────┐
│ 5. 检查实时预算  │ ─────────▶ │  拒绝: BUDGET_EXCEEDED │
│    是否充足     │            │  今日Token/费用已用完 │
└────────┬────────┘            └─────────────────┘
         │ 是
         ▼
┌─────────────────┐     是     ┌─────────────────┐
│ 6. 检查是否需审批│ ─────────▶ │  挂起: PENDING_APPROVAL│
│                 │            │  等待导师/系统审批 │
└────────┬────────┘            └─────────────────┘
         │ 否
         ▼
    ┌──────────┐
    │ 允许执行  │
    └──────────┘
```

---

## 四、调用链路追踪

### 4.1 追踪架构

每条 MCP 调用链路生成唯一的 `trace_id`，贯穿 Client → Router → Server → 下游服务全路径。

```
┌─────────────┐    trace_id: OPC-trace-7f8a9b    ┌─────────────┐
│   Client    │─────────────────────────────────▶│   Router    │
│  (Cortex)   │    span_id: client.invoke        │  (Gateway)  │
└─────────────┘                                    └──────┬──────┘
                                                          │
                              ┌───────────────────────────┼───────────┐
                              │                           │           │
                              ▼ span: router.auth         ▼           ▼
                        ┌──────────┐              ┌──────────┐  ┌──────────┐
                        │ 权限检查  │              │ 限流检查  │  │ 预算检查  │
                        └──────────┘              └──────────┘  └──────────┘
                                                          │
                              ┌───────────────────────────┘
                              ▼ span: router.route
                        ┌─────────────┐
                        │ OPC-memory  │
                        │ memory_search│
                        └──────┬──────┘
                               │
                               ▼ span: server.execute
                        ┌─────────────┐
                        │  ChromaDB   │
                        │ 向量查询     │
                        └─────────────┘
```

### 4.2 日志数据模型

```json
{
  "trace_id": "OPC-trace-7f8a9b2c1d3e",
  "span_id": "router.route.001",
  "parent_span_id": "client.invoke.001",
  "timestamp": "2026-05-17T12:34:56.789Z",
  "service": "mcp-router",
  "operation": "tools/call",
  "actor": {
    "type": "ai_employee",
    "id": "DEV-01",
    "student_id": "stu_abc123",
    "school_id": "sch_bj101",
    "level": "L3"
  },
  "target": {
    "server": "OPC-memory",
    "tool": "memory_search",
    "version": "1.0.0"
  },
  "request": {
    "params_hash": "sha256:a1b2c3...",
    "payload_size": 256
  },
  "response": {
    "status": "success",
    "latency_ms": 145,
    "payload_size": 4096
  },
  "cost": {
    "tokens_input": 150,
    "tokens_output": 800,
    "api_cost_usd": 0.003
  },
  "audit": {
    "permission_check": "passed",
    "rate_limit_remaining": 87,
    "budget_remaining_usd": 0.42
  }
}
```

### 4.3 日志查询 API

```
GET /api/v1/mcp/traces?student_id=stu_abc123&tool=memory_search&from=2026-05-01&to=2026-05-17

Response:
{
  "traces": [
    {
      "trace_id": "OPC-trace-7f8a9b",
      "timestamp": "2026-05-17T12:34:56Z",
      "tool": "memory_search",
      "status": "success",
      "latency_ms": 145,
      "cost_usd": 0.003
    }
  ],
  "summary": {
    "total_calls": 156,
    "success_rate": 0.98,
    "avg_latency_ms": 120,
    "total_cost_usd": 0.47
  }
}
```

---

## 五、错误处理与降级策略

### 5.1 错误码体系

| 错误码 | 名称 | HTTP状态 | 含义 | 客户端处理建议 |
|--------|------|----------|------|---------------|
| `MCP-0000` | `SUCCESS` | 200 | 调用成功 | 正常处理结果 |
| `MCP-1001` | `TOOL_NOT_FOUND` | 404 | 工具不存在或已下线 | 刷新工具列表后重试 |
| `MCP-1002` | `SERVER_UNAVAILABLE` | 503 | MCP Server 暂时不可用 | 自动重试（指数退避） |
| `MCP-1003` | `TIMEOUT` | 504 | 调用超时 | 检查参数后重试，或降级 |
| `MCP-2001` | `PERMISSION_DENIED` | 403 | 权限不足 | 提示用户升级或申请权限 |
| `MCP-2002` | `RATE_LIMITED` | 429 | 频率超限 | 等待后重试，或切换工具 |
| `MCP-2003` | `BUDGET_EXCEEDED` | 402 | 预算耗尽 | 提示用户充值或等待次日 |
| `MCP-3001` | `INVALID_PARAMS` | 400 | 参数校验失败 | 根据schema修正参数 |
| `MCP-3002` | `SCHEMA_MISMATCH` | 400 | 输出schema不匹配 | 上报平台，使用默认值 |
| `MCP-4001` | `ETHOS_BLOCKED` | 403 | 伦理审计拦截 | 返回审计原因，禁止重试 |
| `MCP-5001` | `INTERNAL_ERROR` | 500 | 服务器内部错误 | 联系平台技术支持 |

### 5.2 降级策略矩阵

| 场景 | 主路径 | 降级路径 | 降级结果 |
|------|--------|----------|----------|
| `OPC-memory` 不可用 | 向量语义检索 | 回退到 PostgreSQL 关键词搜索 | 相关性降低但仍可用 |
| `OPC-sandbox` 超时 | 沙箱代码执行 | 返回代码但不执行，提示学生本地运行 | 安全性降低但教学可用 |
| `github` API 限流 | 自动创建仓库 | 返回手动创建指引 + 模板链接 | 流程变手动但仍可完成 |
| `vercel` 部署失败 | 自动部署预览 | 生成静态文件 ZIP 包供下载 | 无法在线预览但可查看 |
| LLM API 超时 | AI生成内容 | 返回模板 + 占位符，提示学生手动填写 | 交互性降低但流程可继续 |

### 5.3 错误响应格式

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "error": {
    "code": "MCP-2002",
    "message": "Rate limit exceeded for tool 'execute_code'",
    "data": {
      "tool": "execute_code",
      "limit": "50/hour",
      "current": 51,
      "retry_after": "2026-05-17T13:00:00Z",
      "suggestion": "请等待到下一个小时，或联系导师申请临时提升配额"
    }
  }
}
```

---

## 六、成本管控

### 6.1 配额模型

OPC 实施 **三层配额** 机制，精确控制每个学生和学校的资源消耗。

#### Token 配额

```yaml
token_quota:
  free_tier:
    daily_limit: 10000        # GPT-4o 等效Token
    monthly_limit: 200000
  basic_tier:
    daily_limit: 50000
    monthly_limit: 1000000
  premium_tier:
    daily_limit: 200000
    monthly_limit: 5000000
  
  token_weights:
    gpt-4o: 1.0
    claude-3-5-sonnet: 1.0
    gpt-4o-mini: 0.25
    embedding: 0.05
```

#### 调用频率限制

```yaml
rate_limits:
  per_student:
    default: "60/min"
    burst: "10/sec"
  per_tool:
    web_search: "30/min"
    execute_code: "10/min"
    deploy_preview: "5/hour"
    stripe_api: "20/min"
  per_school:
    concurrent: 50            # 全校同时进行的MCP调用上限
```

#### 费用预算

```yaml
budget_control:
  student_daily_usd: 2.0
  student_monthly_usd: 20.0
  school_monthly_usd: 5000.0
  
  cost_breakdown:
    llm_api: 0.60             # 60% 用于LLM调用
    vector_db: 0.15           # 15% 用于向量存储查询
    third_party: 0.20         # 20% 用于第三方API
    sandbox: 0.05             # 5% 用于沙箱计算资源
  
  alert_thresholds:
    warning: 0.80             # 预算用到80%时预警
    critical: 0.95            # 预算用到95%时限制非必要调用
```

### 6.2 成本追踪仪表板

```
┌─────────────────────────────────────────────────────────────┐
│              MCP 成本管控仪表板 · 学生视图                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  本月预算: $20.00          已用: $12.47 (62%)               │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       │
│                                                             │
│  今日Token消耗: 8,432 / 10,000                              │
│  ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      │
│                                                             │
│  工具调用分布:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ memory_search  ████████████████████  45%  $5.61    │   │
│  │ execute_code   ████████████          28%  $3.49    │   │
│  │ web_search     ██████                15%  $1.87    │   │
│  │ generate_bmc   ███                    9%  $1.12    │   │
│  │ others         ██                     3%  $0.38    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [查看详细] [申请增加配额] [设置预警阈值]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 教育优惠与配额申请

学生可通过以下途径增加配额：

1. **任务完成奖励**：每完成一个里程碑任务，获得额外的Token奖励
2. **导师审批**：提交配额申请，说明用途，由导师审批通过
3. **学校统一采购**：学校购买教育版许可证，全校学生共享更高配额
4. **竞赛奖励**：在商赛中获奖可获得临时高额配额

---

## 七、附录

### 7.1 内部 MCP Server 清单

| Server | 端口 | 协议 | 状态 |
|--------|------|------|------|
| `OPC-memory` | 8081 | stdio / SSE | 规划中 |
| `OPC-atlas` | 8082 | stdio / SSE | 规划中 |
| `OPC-sandbox` | 8083 | stdio / SSE | 规划中 |
| `OPC-ethos` | 8084 | stdio / SSE | 规划中 |
| `OPC-report` | 8085 | stdio / SSE | 规划中 |
| `OPC-pipeline` | 8086 | stdio / SSE | 规划中 |

### 7.2 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v0.1 | 2026-05-17 | 初稿，定义整体架构与各子系统接口 |
