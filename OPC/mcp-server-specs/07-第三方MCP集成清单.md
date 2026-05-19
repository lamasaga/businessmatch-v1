# OPC · 第三方 MCP 集成清单

> **文档定位**：汇总 OPC 平台需要集成的所有第三方 MCP Server 的配置方式、认证方法、教育优惠申请指南及费用估算。
>
> **关联文档**：`01-MCP架构总览.md`、`02-系统架构与AI员工体系.md`
>
> **最后更新**：2026-05-17

---

## 一、集成总览

| 服务 | MCP Server | 核心用途 | 认证方式 | 教育优惠 | 月费用估算 |
|------|-----------|----------|----------|----------|-----------|
| **GitHub** | `server-github` | 代码仓库管理 | OAuth App / PAT | 免费教育包 | 免费 |
| **Vercel** | `server-vercel` | 前端部署与域名 | OAuth / Token | 无专门教育版 | $0-20 |
| **Stripe** | `server-stripe` | 支付与订阅管理 | API Key | 无教育优惠 | 按交易额 |
| **Resend** | `server-resend` | 邮件发送服务 | API Key | 无教育优惠 | $0-20 |
| **Supabase** | `server-supabase` | 数据库与认证 | API Key + JWT | 教育计划 | 免费 |
| **Figma** | `server-figma` | 设计稿协作 | OAuth / PAT | 教育版免费 | 免费 |
| **Twitter/X** | `server-twitter` | 社媒内容发布 | OAuth 2.0 | 无 | $0-100 |
| **Notion** | `server-notion` | 文档与知识库 | OAuth / Token | 教育版免费 | 免费 |
| **Google Search** | `server-fetch` | 网络搜索 | API Key | 无 | $0-25 |

---

## 二、GitHub MCP Server

### 2.1 功能范围

- 仓库创建与管理
- Issue 与 Pull Request 操作
- 代码审查与评论
- Actions 工作流触发
- Release 管理

### 2.2 认证配置

**方案A: GitHub App (推荐用于学校级部署)**

```yaml
github_auth:
  type: "github_app"
  app_id: "${GITHUB_APP_ID}"
  private_key: "${GITHUB_APP_PRIVATE_KEY}"
  installation_id: "${GITHUB_APP_INSTALLATION_ID}"
  permissions:
    contents: "write"
    issues: "write"
    pull_requests: "write"
    actions: "read"
```

**方案B: Personal Access Token (推荐用于学生个人)**

```yaml
github_auth:
  type: "pat"
  token: "${GITHUB_PAT}"
  scopes: ["repo", "workflow", "read:user"]
  note: "OPC Platform Integration"
```

### 2.3 教育优惠

GitHub Education 提供 **GitHub Student Developer Pack**：

- **申请条件**：年满13岁、持有学校邮箱或有效学籍证明
- **包含权益**：
  - GitHub Pro 免费
  - GitHub Copilot 免费
  - 合作平台优惠（Namecheap域名、Azure额度等）
- **申请地址**：https://education.github.com/pack
- **OPC集成方式**：学生在平台内绑定GitHub账号，自动检测教育包状态

### 2.4 调用配额

| 资源类型 | 未认证 | PAT | GitHub App |
|----------|--------|-----|-----------|
| API请求/小时 | 60 | 5,000 | 15,000 (按安装) |
| 仓库数量 | 无限制 | 无限制 | 无限制 |
| Actions 分钟 | — | 2,000/月 | 按组织配额 |

---

## 三、Vercel MCP Server

### 3.1 功能范围

- 项目部署与预览
- 域名管理
- 环境变量配置
- 部署日志查看
- 团队协作设置

### 3.2 认证配置

```yaml
vercel_auth:
  type: "token"
  token: "${VERCEL_TOKEN}"
  team_id: "${VERCEL_TEAM_ID}"  # 可选，用于团队部署
```

获取 Token：
1. 登录 Vercel Dashboard
2. Settings -> Tokens -> Create Token
3. 选择作用范围：Full Account 或 Scoped to Team

### 3.3 教育优惠

Vercel 目前**无专门的教育优惠计划**，但提供慷慨的免费层：

- **Hobby Plan**：
  - 无限项目部署
  - 100GB 带宽/月
  - 6,000 构建分钟/月
  - 自定义域名
- **学生建议**：Hobby Plan 已足够教学使用，无需付费

### 3.4 调用配额与费用

| 层级 | 费用 | 带宽 | 构建分钟 | 团队成员 |
|------|------|------|----------|----------|
| Hobby | 免费 | 100GB | 6,000 | 1 |
| Pro | $20/月 | 1TB | 24,000 | 10 |

**OPC 策略**：学生默认使用 Hobby Plan，如需 Pro 功能由学校统一采购团队版。

---

## 四、Stripe MCP Server

### 4.1 功能范围

- 产品/服务创建
- 价格与订阅管理
- 支付链接生成
- 交易记录查询
- 退款处理

### 4.2 认证配置

```yaml
stripe_auth:
  type: "api_key"
  secret_key: "${STRIPE_SECRET_KEY}"      # sk_test_... 或 sk_live_...
  publishable_key: "${STRIPE_PUBLISHABLE_KEY}"
  webhook_secret: "${STRIPE_WEBHOOK_SECRET}"
  mode: "test"  # 学生环境强制使用 test mode
```

**⚠️ 安全要求**：
- 学生环境 **强制使用 Test Mode**（密钥前缀 `sk_test_`）
- Live Mode 密钥仅对 L5 合伙人等级开放，且需导师二次确认
- 所有 Stripe 调用需经过 `OPC-ethos` 审计

### 4.3 教育优惠

Stripe **无专门教育优惠**，但提供：
- 无月费，按交易额收费（2.9% + 30¢/笔）
- Test Mode 完全免费，适合教学使用

### 4.4 费用估算

| 场景 | 月交易量 | 费用 |
|------|----------|------|
| 教学测试 | 0（Test Mode） | $0 |
| 小额真实交易 | $500 | ~$17.50 |
| 中等规模 | $5,000 | ~$175 |

**OPC 策略**：学生在 Test Mode 下完成所有支付功能学习和测试，真实交易由平台统一代收。

---

## 五、Resend MCP Server

### 5.1 功能范围

- 邮件发送
- 联系人列表管理
- 邮件模板渲染
- 发送统计与追踪

### 5.2 认证配置

```yaml
resend_auth:
  type: "api_key"
  api_key: "${RESEND_API_KEY}"
  from_domain: "OPC.edu.local"  # 或学校自定义域名
```

### 5.3 教育优惠

Resend **无专门教育优惠**，免费层足够教学：

- **免费层**：3,000 封/月
- **Pro**：$20/月，50,000 封

### 5.4 调用配额

| 层级 | 月发送量 | 费用 | 自定义域名 |
|------|----------|------|-----------|
| 免费 | 3,000 | $0 | 支持 |
| Pro | 50,000 | $20 | 支持 |

---

## 六、Supabase MCP Server

### 6.1 功能范围

- 数据库表管理
- 身份认证（Auth）
- 实时订阅（Realtime）
- 存储桶管理
- Edge Functions

### 6.2 认证配置

```yaml
supabase_auth:
  type: "service_role"
  url: "${SUPABASE_PROJECT_URL}"
  service_role_key: "${SUPABASE_SERVICE_ROLE_KEY}"
  anon_key: "${SUPABASE_ANON_KEY}"
  jwt_secret: "${SUPABASE_JWT_SECRET}"
```

### 6.3 教育优惠

Supabase 提供 ** generous 免费层**，适合教育场景：

- **免费层 (Free Tier)**：
  - 500MB 数据库空间
  - 1GB 文件存储
  - 2GB 带宽/月
  - 无限项目数
- **教育计划**：联系 sales@supabase.io 申请额外额度

### 6.4 调用配额

| 层级 | 数据库 | 存储 | 带宽 | 费用 |
|------|--------|------|------|------|
| Free | 500MB | 1GB | 2GB | $0 |
| Pro | 8GB | 100GB | 250GB | $25/月 |

**OPC 策略**：每学生分配一个 Free Tier 项目，数据量超限后引导升级或数据清理。

---

## 七、Figma MCP Server

### 7.1 功能范围

- 文件读取与写入
- 组件库管理
- 评论与协作
- 设计导出

### 7.2 认证配置

```yaml
figma_auth:
  type: "personal_access_token"
  token: "${FIGMA_TOKEN}"
  
  # 或使用 OAuth
  oauth:
    client_id: "${FIGMA_OAUTH_CLIENT_ID}"
    client_secret: "${FIGMA_OAUTH_CLIENT_SECRET}"
    redirect_uri: "https://opc.edu.local/callback/figma"
```

获取 PAT：
1. Figma -> Settings -> Personal Access Tokens -> Generate

### 7.3 教育优惠

Figma 提供 **Education Plan**：

- **申请条件**：持有.edu邮箱或有效学生证
- **包含权益**：
  - Figma Professional 免费
  ️- FigJam Professional 免费
  - 无限项目数
- **申请地址**：https://www.figma.com/education/

### 7.4 调用配额

| 层级 | 文件数 | 版本历史 | 费用 |
|------|--------|----------|------|
| Starter | 3 文件 | 30 天 | 免费 |
| Education | 无限 | 无限 | 免费 |
| Professional | 无限 | 无限 | $12/月/编辑者 |

---

## 八、Twitter/X MCP Server

### 8.1 功能范围

- 推文发布
- 媒体上传
- 时间线读取
- 用户互动统计

### 8.2 认证配置

```yaml
twitter_auth:
  type: "oauth_2_0"
  client_id: "${TWITTER_CLIENT_ID}"
  client_secret: "${TWITTER_CLIENT_SECRET}"
  bearer_token: "${TWITTER_BEARER_TOKEN}"
  redirect_uri: "https://opc.edu.local/callback/twitter"
  scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"]
```

### 8.3 教育优惠

Twitter/X **无专门教育优惠**。

### 8.4 调用配额与费用

| API 层级 | 月费用 | 推文读取 | 推文写入 | 适用场景 |
|----------|--------|----------|----------|----------|
| Free | $0 | 1,500/月 | 500/月 | 基础教学 |
| Basic | $100 | 10,000/月 | 3,000/月 | 进阶项目 |
| Pro | $5,000 | 100万/月 | 30万/月 | 大规模运营 |

**OPC 策略**：
- 学生默认使用 Free Tier
- 营销推广任务使用平台统一账号的配额
- 禁止学生个人账号的自动化操作

---

## 九、Notion MCP Server

### 9.1 功能范围

- 页面创建与编辑
- 数据库查询
- 块级内容操作
- 工作区管理

### 9.2 认证配置

```yaml
notion_auth:
  type: "integration_token"
  token: "${NOTION_INTEGRATION_TOKEN}"
  
  # 或使用 OAuth
  oauth:
    client_id: "${NOTION_OAUTH_CLIENT_ID}"
    client_secret: "${NOTION_OAUTH_CLIENT_SECRET}"
    redirect_uri: "https://opc.edu.local/callback/notion"
```

创建 Integration：
1. notion.so -> Settings & Members -> Integrations
2. 新建 Integration，复制 Token

### 9.3 教育优惠

Notion 提供 **Education Plan**：

- **申请条件**：持有.edu邮箱
- **包含权益**：
  - Notion Plus 免费
  - 无限页面
  - 无限文件上传
  - 100 位 Guests
- **申请地址**：https://www.notion.so/product/notion-for-education

### 9.4 调用配额

| 层级 | 块操作/秒 | 费用 |
|------|-----------|------|
| Free | 3 | $0 |
| Plus (教育) | 无限制 | $0 |

---

## 十、Google Search MCP Server

### 10.1 功能范围

- 网络搜索
- 搜索结果摘要
- 新闻搜索

### 10.2 认证配置

Google Search 通过 `server-fetch` 调用 Custom Search JSON API：

```yaml
google_search_auth:
  type: "api_key"
  api_key: "${GOOGLE_SEARCH_API_KEY}"
  search_engine_id: "${GOOGLE_CSE_ID}"
  endpoint: "https://www.googleapis.com/customsearch/v1"
```

设置步骤：
1. Google Cloud Console -> APIs & Services -> Credentials -> Create API Key
2. Programmable Search Engine (CSE) -> 新建搜索引擎 -> 复制 Search Engine ID

### 10.3 教育优惠

Google Cloud 提供 **教育额度**：

- 新用户 $300 免费额度
- 部分学校有 Google Workspace for Education

### 10.4 调用配额与费用

| 层级 | 查询/天 | 费用 |
|------|---------|------|
| 免费层 | 100 | $0 |
| 付费 | 无限制 | $5 / 1000 次查询 |

**OPC 策略**：
- 每日配额由平台统一分配
- 超额后降级到平台内置搜索引擎
- 学生可查看剩余配额

---

## 十一、统一认证管理

### 11.1 凭证存储架构

```
凭证存储 (Vault)
├── 平台级凭证
│   ├── GitHub App 私钥
│   ├── Vercel Team Token
│   └── Stripe 平台账号
│
├── 学校级凭证
│   ├── Supabase 组织管理Key
│   ├── Notion 教育版Token
│   └── Figma 教育版Token
│
└── 学生级凭证 (加密存储)
    ├── GitHub PAT (用户授权)
    ├── Twitter OAuth Token
    ├── Figma PAT
    └── 各服务OAuth Refresh Token
```

### 11.2 OAuth 授权流程

```
学生点击"连接GitHub"
    │
    ▼
┌─────────────────┐
│  MCP Router     │
│  生成 state     │
│  重定向到       │
│  GitHub OAuth   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GitHub 授权页   │
│  用户确认权限    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  回调 OPC       │
│  校验 state     │
│  交换 code->token│
│  加密存储 token  │
└────────┬────────┘
         │
         ▼
    授权完成，显示已连接
```

### 11.3 凭证安全要求

| 要求 | 实现方式 |
|------|----------|
| 加密存储 | AES-256-GCM + KMS |
| 传输加密 | TLS 1.3 |
| 最小权限 | OAuth Scope 最小化 |
| 定期轮换 | Refresh Token 90天过期 |
| 访问审计 | 所有凭证读取记录日志 |

---

## 十二、费用估算汇总

### 12.1 单学生月度费用估算

| 服务 | 免费层 | 付费升级 | 触发条件 |
|------|--------|----------|----------|
| GitHub | $0 | $0 (教育包) | — |
| Vercel | $0 | $20 | 带宽/构建超限 |
| Stripe | $0 (Test) | 按交易 | 真实收款 |
| Resend | $0 | $20 | 3,000+ 邮件/月 |
| Supabase | $0 | $25 | 500MB+ 数据 |
| Figma | $0 (教育) | $0 | — |
| Twitter | $0 | $100 | 1,500+ 读取/月 |
| Notion | $0 (教育) | $0 | — |
| Google Search | $0 | $5/千次 | 100+ 查询/天 |
| **合计** | **$0** | **~$165+** | — |

### 12.2 学校级年度预算估算（1000学生）

| 项目 | 估算 |
|------|------|
| 基础服务（全部免费层） | $0 |
| 高级服务（10%学生升级） | $19,800/年 |
| LLM API 调用（教育折扣） | $24,000/年 |
| 向量数据库托管 | $6,000/年 |
| 监控与可观测性 | $3,600/年 |
| **总计** | **~$53,400/年** |

---

## 十三、附录

### 13.1 第三方 MCP Server 安装

```bash
# GitHub
npm install -g @modelcontextprotocol/server-github

# Vercel
npm install -g @modelcontextprotocol/server-vercel

# 通用 fetch (用于 Google Search 等)
npm install -g @modelcontextprotocol/server-fetch
```

### 13.2 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v0.1 | 2026-05-17 | 初稿，涵盖8个核心第三方服务的集成方式与费用估算 |
