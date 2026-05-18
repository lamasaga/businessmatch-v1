# OHB 完整数据库 Schema 定义

> **文档定位**：OneHumanBusiness (OHB) 模块的 PostgreSQL 数据库完整定义，包含 DDL、约束、索引、触发器、注释以及对应的 SQLAlchemy ORM 模型。
>
> **关联文档**：`04-技术栈选型与实现路线.md`、`05-与现有平台融合路径.md`
>
> **最后更新**：2026-05-17

---

## 一、设计原则

| 原则 | 说明 |
|------|------|
| **UUID 主键** | 所有主表使用 `UUID` 类型，避免顺序暴露，便于分布式扩展 |
| **JSONB 优先** | 动态结构、配置项使用 `JSONB`，支持 GIN 索引 |
| **软删除** | 核心业务表使用 `status` 字段而非物理删除 |
| **审计字段** | 每张表包含 `created_at`、`updated_at`，自动维护 |
| **CHECK 约束** | 枚举值通过数据库 CHECK 约束保障，不依赖应用层 |
| **分区就绪** | 日志类大表设计为分区友好结构 |

---

## 二、完整 DDL（PostgreSQL）

### 2.1 扩展与基础类型

```sql
-- 启用必要扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- 文本模糊搜索
CREATE EXTENSION IF NOT EXISTS "btree_gin";    -- GIN 复合索引

-- 自定义枚举类型（如需严格枚举，也可用 CHECK）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_stage') THEN
        CREATE TYPE company_stage AS ENUM ('IDEATE', 'VALIDATE', 'BUILD', 'LAUNCH', 'SCALE', 'ARCHIVED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_role') THEN
        CREATE TYPE employee_role AS ENUM ('strategist', 'worker', 'advisor', 'scout');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'review', 'completed', 'rejected', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'record_type') THEN
        CREATE TYPE record_type AS ENUM ('revenue', 'cost');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_decision') THEN
        CREATE TYPE review_decision AS ENUM ('pass', 'conditional', 'fail');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_status') THEN
        CREATE TYPE integration_status AS ENUM ('active', 'inactive', 'error', 'revoked');
    END IF;
END$$;
```

### 2.2 公司主表：`one_companies`

```sql
CREATE TABLE one_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    career_id UUID NOT NULL,                        -- 关联现有 CareerProfile（逻辑外键，跨库兼容）
    owner_user_id UUID NOT NULL,                    -- 所属用户ID
    
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,              -- 子域名标识，如 slug.ohb.edu
    tagline VARCHAR(255),                           -- 公司标语
    
    stage company_stage NOT NULL DEFAULT 'IDEATE',
    mode VARCHAR(20) NOT NULL DEFAULT 'simulation'  -- 模式: simulation | real | competition
        CHECK (mode IN ('simulation', 'real', 'competition')),
    
    business_model_canvas JSONB DEFAULT '{}',       -- 完整 BMC 9宫格
    brand_config JSONB DEFAULT '{}',                -- 品牌配置（颜色、Logo、字体）
    industry VARCHAR(50),                           -- 行业分类
    target_audience JSONB DEFAULT '[]',             -- 目标受众画像
    
    total_revenue DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
    net_profit DECIMAL(14,2) GENERATED ALWAYS AS (total_revenue - total_cost) STORED,
    
    employee_count INT NOT NULL DEFAULT 0,
    task_count INT NOT NULL DEFAULT 0,
    completed_task_count INT NOT NULL DEFAULT 0,
    
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'paused', 'archived')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    launched_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_one_companies_career_id ON one_companies(career_id);
CREATE INDEX idx_one_companies_owner_user_id ON one_companies(owner_user_id);
CREATE INDEX idx_one_companies_stage ON one_companies(stage) WHERE status = 'active';
CREATE INDEX idx_one_companies_slug ON one_companies(slug);
CREATE INDEX idx_one_companies_created_at ON one_companies(created_at DESC);

-- 部分索引：活跃公司按收入排序
CREATE INDEX idx_one_companies_revenue ON one_companies(total_revenue DESC) WHERE status = 'active';

-- 全文搜索（公司名称+标语）
CREATE INDEX idx_one_companies_search ON one_companies 
    USING gin(to_tsvector('chinese', name || ' ' || COALESCE(tagline, '')));

COMMENT ON TABLE one_companies IS '学生创建的虚拟/真实公司主表';
COMMENT ON COLUMN one_companies.career_id IS '关联现有平台的 CareerProfile ID';
COMMENT ON COLUMN one_companies.slug IS 'URL 友好标识，用于子域名';
COMMENT ON COLUMN one_companies.stage IS '创业阶段：IDEATE→VALIDATE→BUILD→LAUNCH→SCALE→ARCHIVED';
COMMENT ON COLUMN one_companies.mode IS 'simulation=模拟币；real=真实收入；competition=竞赛模式';
COMMENT ON COLUMN one_companies.business_model_canvas IS 'BMC 九宫格 JSON 结构';
COMMENT ON COLUMN one_companies.net_profit IS '自动计算字段：总收入-总成本';
```

### 2.3 AI 员工表：`ai_employees`

```sql
CREATE TABLE ai_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES one_companies(id) ON DELETE CASCADE,
    
    codename VARCHAR(20) NOT NULL,                  -- 如 "DEV-01", "MKT-02"
    display_name VARCHAR(50),                       -- 学生自定义昵称
    role_type employee_role NOT NULL,
    avatar_emoji VARCHAR(10) DEFAULT '🤖',
    
    level INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
    experience_points INT NOT NULL DEFAULT 0,
    
    skills JSONB NOT NULL DEFAULT '[]',             -- [{"skill": "frontend", "level": 3, "category": "tech"}]
    skill_tree JSONB NOT NULL DEFAULT '{}',         -- 已解锁技能节点
    
    mcp_tools JSONB NOT NULL DEFAULT '[]',          -- 授权的工具ID列表
    mcp_tool_quota JSONB DEFAULT '{}',              -- 各工具月度配额使用量
    
    personality_prompt TEXT,                        -- 角色系统Prompt
    memory_vector_id VARCHAR(100),                  -- 向量库中的记忆ID
    memory_summary TEXT,                            -- 近期记忆摘要（用于快速加载）
    
    status VARCHAR(20) NOT NULL DEFAULT 'idle'
        CHECK (status IN ('idle', 'busy', 'offline', 'upgrading', 'error')),
    current_task_id UUID,                           -- 当前执行中的任务
    
    tasks_completed INT NOT NULL DEFAULT 0,
    tasks_rejected INT NOT NULL DEFAULT 0,
    avg_task_score DECIMAL(3,2),                    -- 平均验收评分 0.00-5.00
    satisfaction_score DECIMAL(3,2),                -- 学生满意度 0.00-5.00
    
    hourly_rate DECIMAL(8,2) DEFAULT 0,             -- 模拟时薪（用于成本计算）
    total_cost_generated DECIMAL(12,2) DEFAULT 0,   -- 累计产生成本
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hired_at TIMESTAMPTZ DEFAULT NOW()
);

-- 唯一约束：同一公司内 codename 唯一
CREATE UNIQUE INDEX idx_ai_employees_codename_company 
    ON ai_employees(company_id, codename);

-- 索引
CREATE INDEX idx_ai_employees_company_id ON ai_employees(company_id);
CREATE INDEX idx_ai_employees_role ON ai_employees(role_type);
CREATE INDEX idx_ai_employees_status ON ai_employees(status);
CREATE INDEX idx_ai_employees_level ON ai_employees(level DESC);
CREATE INDEX idx_ai_employees_current_task ON ai_employees(current_task_id) WHERE current_task_id IS NOT NULL;

-- GIN 索引：技能 JSONB
CREATE INDEX idx_ai_employees_skills ON ai_employees USING gin(skills jsonb_path_ops);

COMMENT ON TABLE ai_employees IS 'AI 员工（Agent）实体表';
COMMENT ON COLUMN ai_employees.codename IS '系统自动生成的代码名，格式 ROLE-NN';
COMMENT ON COLUMN ai_employees.role_type IS 'strategist=战略家, worker=执行者, advisor=顾问, scout=侦察兵';
COMMENT ON COLUMN ai_employees.memory_vector_id IS '指向 ChromaDB/Qdrant 中的向量记录';
COMMENT ON COLUMN ai_employees.hourly_rate IS '模拟薪资率，用于计算任务执行成本';
```

### 2.4 任务表：`ai_tasks`

```sql
CREATE TABLE ai_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES one_companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES ai_employees(id) ON DELETE SET NULL,
    sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
    milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES ai_tasks(id) ON DELETE CASCADE,  -- 子任务支持
    
    title VARCHAR(200) NOT NULL,
    description TEXT,
    task_type VARCHAR(30) NOT NULL
        CHECK (task_type IN ('code', 'design', 'copy', 'research', 'analysis', 'marketing', 'legal', 'finance', 'review', 'custom')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    status task_status NOT NULL DEFAULT 'pending',
    
    requirements JSONB NOT NULL DEFAULT '{}',       -- 结构化需求规格
    acceptance_criteria JSONB DEFAULT '[]',         -- 验收标准清单
    deliverables JSONB DEFAULT '[]',                -- 交付物元数据
    
    estimated_hours DECIMAL(5,2),                   -- 预估工时
    actual_hours DECIMAL(5,2),                      -- 实际工时
    cost_simulated DECIMAL(10,2),                   -- 模拟成本
    
    student_review TEXT,                            -- 学生验收评语
    student_rating INT CHECK (student_rating BETWEEN 1 AND 5),
    review_decision VARCHAR(20)
        CHECK (review_decision IN ('pending', 'approved', 'rejected', 'needs_revision')),
    
    execution_summary TEXT,                         -- AI 执行摘要
    error_log TEXT,                                 -- 错误/异常日志
    
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    deadline_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_ai_tasks_company_id ON ai_tasks(company_id);
CREATE INDEX idx_ai_tasks_employee_id ON ai_tasks(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_ai_tasks_sprint_id ON ai_tasks(sprint_id) WHERE sprint_id IS NOT NULL;
CREATE INDEX idx_ai_tasks_status ON ai_tasks(status);
CREATE INDEX idx_ai_tasks_priority ON ai_tasks(priority);
CREATE INDEX idx_ai_tasks_deadline ON ai_tasks(deadline_at) WHERE status NOT IN ('completed', 'rejected', 'cancelled');
CREATE INDEX idx_ai_tasks_created_at ON ai_tasks(created_at DESC);
CREATE INDEX idx_ai_tasks_parent ON ai_tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- 复合索引：公司+状态（最常用的查询模式）
CREATE INDEX idx_ai_tasks_company_status ON ai_tasks(company_id, status, created_at DESC);

COMMENT ON TABLE ai_tasks IS 'AI 员工执行的任务/工单表';
COMMENT ON COLUMN ai_tasks.task_type IS '任务类型：code=代码, design=设计, copy=文案, research=调研, analysis=分析, marketing=营销, legal=法务, finance=财务, review=评审, custom=自定义';
COMMENT ON COLUMN ai_tasks.requirements IS '结构化需求，包含输入数据、参数配置等';
COMMENT ON COLUMN ai_tasks.deliverables IS '交付物列表，含类型、URL、大小等元数据';
```

### 2.5 Sprint 周期表：`sprints`

```sql
CREATE TABLE sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES one_companies(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    goal TEXT,                                      -- Sprint 目标描述
    stage company_stage NOT NULL DEFAULT 'IDEATE',
    
    status VARCHAR(20) NOT NULL DEFAULT 'planning'
        CHECK (status IN ('planning', 'active', 'review', 'completed', 'cancelled')),
    
    planned_tasks INT NOT NULL DEFAULT 0,
    completed_tasks INT NOT NULL DEFAULT 0,
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    actual_end_date DATE,
    
    review_data JSONB DEFAULT '{}',                 -- Sprint 评审数据
    retrospective JSONB DEFAULT '{}',               -- 复盘记录
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 约束：结束日期必须晚于开始日期
ALTER TABLE sprints ADD CONSTRAINT chk_sprint_dates 
    CHECK (end_date >= start_date);

-- 索引
CREATE INDEX idx_sprints_company_id ON sprints(company_id);
CREATE INDEX idx_sprints_status ON sprints(status);
CREATE INDEX idx_sprints_dates ON sprints(start_date, end_date);
CREATE INDEX idx_sprints_company_active ON sprints(company_id, status) WHERE status IN ('planning', 'active', 'review');

COMMENT ON TABLE sprints IS 'Sprint/迭代周期表';
COMMENT ON COLUMN sprints.stage IS '该 Sprint 对应的创业阶段';
COMMENT ON COLUMN sprints.review_data IS 'Sprint 结束时的评审结果';
```

### 2.6 里程碑表：`milestones`

```sql
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES one_companies(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    stage company_stage NOT NULL,
    
    criteria JSONB NOT NULL DEFAULT '[]',           -- 达成条件清单
    deliverables_required JSONB DEFAULT '[]',       -- 必需交付物类型
    
    status VARCHAR(20) NOT NULL DEFAULT 'locked'
        CHECK (status IN ('locked', 'unlocked', 'in_progress', 'achieved', 'missed')),
    
    unlock_conditions JSONB DEFAULT '{}',           -- 解锁条件配置
    unlocked_at TIMESTAMPTZ,
    achieved_at TIMESTAMPTZ,
    deadline_at TIMESTAMPTZ,
    
    xp_reward INT NOT NULL DEFAULT 0,               -- 达成奖励 XP
    badge_id VARCHAR(50),                           -- 关联徽章
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_milestones_company_id ON milestones(company_id);
CREATE INDEX idx_milestones_stage ON milestones(stage);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_milestones_achieved ON milestones(achieved_at) WHERE achieved_at IS NOT NULL;

COMMENT ON TABLE milestones IS '创业里程碑/关卡表';
COMMENT ON COLUMN milestones.criteria IS '达成条件的结构化定义';
COMMENT ON COLUMN milestones.xp_reward IS '达成后奖励的生涯 XP';
```

### 2.7 阶段评审表：`gateway_reviews`

```sql
CREATE TABLE gateway_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES one_companies(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
    
    stage company_stage NOT NULL,
    reviewer_type VARCHAR(20) NOT NULL
        CHECK (reviewer_type IN ('ai_panel', 'mentor', 'peer', 'auto')),
    reviewer_id UUID,                               -- 评审者ID（AI/用户）
    
    review_data JSONB NOT NULL DEFAULT '{}',        -- 多维度评分
    -- 示例: {"business_model": 85, "market_fit": 72, "execution": 90, "innovation": 68}
    
    overall_score DECIMAL(5,2),                     -- 综合得分 0-100
    decision review_decision NOT NULL,
    
    feedback TEXT,                                  -- 详细反馈
    action_items JSONB DEFAULT '[]',                -- 改进事项
    
    student_response TEXT,                          -- 学生对评审的回应
    
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    effective_until TIMESTAMPTZ,                    -- 评审有效期（条件通过时）
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_gateway_reviews_company_id ON gateway_reviews(company_id);
CREATE INDEX idx_gateway_reviews_stage ON gateway_reviews(stage);
CREATE INDEX idx_gateway_reviews_decision ON gateway_reviews(decision);
CREATE INDEX idx_gateway_reviews_reviewed_at ON gateway_reviews(reviewed_at DESC);
CREATE INDEX idx_gateway_reviews_overall_score ON gateway_reviews(overall_score DESC);

COMMENT ON TABLE gateway_reviews IS '阶段 Gate 评审记录表';
COMMENT ON COLUMN gateway_reviews.review_data IS '各维度评分的 JSON 对象';
COMMENT ON COLUMN gateway_reviews.decision IS 'pass=通过, conditional=条件通过（需整改）, fail=未通过';
COMMENT ON COLUMN gateway_reviews.effective_until IS '条件通过的评审有效期，过期需重新评审';
```

### 2.8 财务记录表：`finance_records`

```sql
CREATE TABLE finance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES one_companies(id) ON DELETE CASCADE,
    
    record_type record_type NOT NULL,
    category VARCHAR(50) NOT NULL,
    -- revenue 分类: product_sales, service_fee, subscription, investment, other
    -- cost 分类: salary, tool_subscription, hosting, marketing, legal, other
    
    amount DECIMAL(14,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'CNY',
    exchange_rate DECIMAL(10,6) DEFAULT 1.0,        -- 对 CNY 汇率
    amount_cny DECIMAL(14,2) GENERATED ALWAYS AS (amount * exchange_rate) STORED,
    
    is_real_money BOOLEAN NOT NULL DEFAULT FALSE,   -- 区分模拟/真实
    payment_method VARCHAR(30),                     -- 支付方式
    external_transaction_id VARCHAR(100),           -- 外部支付平台交易ID
    
    description TEXT,
    attachments JSONB DEFAULT '[]',                 -- 附件列表（发票、截图）
    
    related_task_id UUID REFERENCES ai_tasks(id) ON DELETE SET NULL,
    related_employee_id UUID REFERENCES ai_employees(id) ON DELETE SET NULL,
    
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_finance_records_company_id ON finance_records(company_id);
CREATE INDEX idx_finance_records_type ON finance_records(record_type);
CREATE INDEX idx_finance_records_category ON finance_records(category);
CREATE INDEX idx_finance_records_recorded_at ON finance_records(recorded_at DESC);
CREATE INDEX idx_finance_records_real ON finance_records(company_id, is_real_money) WHERE is_real_money = TRUE;
CREATE INDEX idx_finance_records_company_type_date ON finance_records(company_id, record_type, recorded_at DESC);

COMMENT ON TABLE finance_records IS '公司财务收支记录表';
COMMENT ON COLUMN finance_records.is_real_money IS 'TRUE=真实资金（需审计）, FALSE=模拟币';
COMMENT ON COLUMN finance_records.amount_cny IS '自动换算为人民币金额';
```

### 2.9 市场情报表：`market_intel`

```sql
CREATE TABLE market_intel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES one_companies(id) ON DELETE CASCADE,
    
    intel_type VARCHAR(30) NOT NULL
        CHECK (intel_type IN ('competitor', 'trend', 'customer_feedback', 'pricing', 'regulation', 'opportunity', 'threat')),
    
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    source_url VARCHAR(500),
    source_type VARCHAR(20)
        CHECK (source_type IN ('web_scrape', 'api_fetch', 'user_input', 'ai_analysis', 'mcp_tool')),
    
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    relevance_score DECIMAL(3,2) CHECK (relevance_score BETWEEN 0 AND 1),
    
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',                    -- 原始抓取数据
    
    discovered_by UUID REFERENCES ai_employees(id) ON DELETE SET NULL,  -- 发现者（AI员工）
    
    is_actioned BOOLEAN DEFAULT FALSE,              -- 是否已采取行动
    action_summary TEXT,                            -- 行动摘要
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ                          -- 情报有效期
);

-- 索引
CREATE INDEX idx_market_intel_company_id ON market_intel(company_id);
CREATE INDEX idx_market_intel_type ON market_intel(intel_type);
CREATE INDEX idx_market_intel_created ON market_intel(created_at DESC);
CREATE INDEX idx_market_intel_scores ON market_intel(relevance_score DESC, confidence_score DESC);
CREATE INDEX idx_market_intel_tags ON market_intel USING gin(tags);
CREATE INDEX idx_market_intel_expires ON market_intel(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE market_intel IS '市场情报/洞察表';
COMMENT ON COLUMN market_intel.confidence_score IS '置信度 0.00-1.00';
COMMENT ON COLUMN market_intel.relevance_score IS '相关度 0.00-1.00';
```

### 2.10 创业日志表：`venture_logs`

```sql
CREATE TABLE venture_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES one_companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,                          -- 撰写者
    
    log_type VARCHAR(20) NOT NULL
        CHECK (log_type IN ('milestone', 'decision', 'reflection', 'challenge', 'learning', 'daily', 'weekly')),
    
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    
    mood VARCHAR(20),                               -- 情绪标签
    energy_level INT CHECK (energy_level BETWEEN 1 AND 10),
    
    related_stage company_stage,
    related_task_id UUID REFERENCES ai_tasks(id) ON DELETE SET NULL,
    
    media_urls JSONB DEFAULT '[]',                  -- 图片/视频链接
    
    is_shared BOOLEAN DEFAULT FALSE,                -- 是否分享到社区
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_venture_logs_company_id ON venture_logs(company_id);
CREATE INDEX idx_venture_logs_type ON venture_logs(log_type);
CREATE INDEX idx_venture_logs_created ON venture_logs(created_at DESC);
CREATE INDEX idx_venture_logs_shared ON venture_logs(created_at DESC) WHERE is_shared = TRUE;
CREATE INDEX idx_venture_logs_user ON venture_logs(user_id, created_at DESC);

COMMENT ON TABLE venture_logs IS '学生创业日志/叙事表';
COMMENT ON COLUMN venture_logs.log_type IS 'milestone=里程碑, decision=决策, reflection=反思, challenge=挑战, learning=学习, daily=日报, weekly=周报';
```

### 2.11 MCP 调用日志表：`mcp_call_logs`

```sql
CREATE TABLE mcp_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES one_companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES ai_employees(id) ON DELETE SET NULL,
    task_id UUID REFERENCES ai_tasks(id) ON DELETE SET NULL,
    
    tool_name VARCHAR(50) NOT NULL,
    tool_version VARCHAR(20),
    
    request_payload JSONB NOT NULL,                 -- 请求参数
    response_payload JSONB,                         -- 响应数据（失败时可能为空）
    
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('pending', 'success', 'error', 'timeout', 'rate_limited')),
    error_message TEXT,
    error_code VARCHAR(50),
    
    latency_ms INT,                                 -- 调用耗时（毫秒）
    tokens_used INT,                                -- LLM Token 消耗（如有）
    cost_usd DECIMAL(10,6),                         -- 实际 API 成本（美元）
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引（分区就绪：可按 created_at 按月分区）
CREATE INDEX idx_mcp_call_logs_company_id ON mcp_call_logs(company_id);
CREATE INDEX idx_mcp_call_logs_tool ON mcp_call_logs(tool_name);
CREATE INDEX idx_mcp_call_logs_status ON mcp_call_logs(status);
CREATE INDEX idx_mcp_call_logs_created ON mcp_call_logs(created_at DESC);
CREATE INDEX idx_mcp_call_logs_task ON mcp_call_logs(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_mcp_call_logs_employee ON mcp_call_logs(employee_id) WHERE employee_id IS NOT NULL;

-- 部分索引：失败的调用
CREATE INDEX idx_mcp_call_logs_errors ON mcp_call_logs(created_at DESC) 
    WHERE status IN ('error', 'timeout', 'rate_limited');

COMMENT ON TABLE mcp_call_logs IS 'MCP 工具调用日志表';
COMMENT ON COLUMN mcp_call_logs.cost_usd IS '实际 API 调用成本，用于成本分析和配额控制';
```

### 2.12 交付物表：`deliverables`

```sql
CREATE TABLE deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES ai_tasks(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES one_companies(id) ON DELETE CASCADE,
    
    deliverable_type VARCHAR(30) NOT NULL
        CHECK (deliverable_type IN ('code', 'document', 'design', 'data', 'link', 'image', 'video', 'spreadsheet', 'presentation', 'other')),
    
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    storage_type VARCHAR(20) NOT NULL
        CHECK (storage_type IN ('inline', 's3', 'url', 'git')),
    storage_path VARCHAR(500),                      -- S3 Key / URL / Git SHA
    storage_size_bytes BIGINT,
    mime_type VARCHAR(100),
    
    content_inline TEXT,                            -- 内联内容（小文本）
    content_summary TEXT,                           -- AI 生成的内容摘要
    
    version INT NOT NULL DEFAULT 1,
    previous_version_id UUID REFERENCES deliverables(id) ON DELETE SET NULL,
    
    is_final BOOLEAN DEFAULT FALSE,                 -- 是否为最终版
    student_approved BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}',                    -- 交付物元数据（如代码语言、设计尺寸等）
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_deliverables_task_id ON deliverables(task_id);
CREATE INDEX idx_deliverables_company_id ON deliverables(company_id);
CREATE INDEX idx_deliverables_type ON deliverables(deliverable_type);
CREATE INDEX idx_deliverables_created ON deliverables(created_at DESC);
CREATE INDEX idx_deliverables_final ON deliverables(task_id, is_final) WHERE is_final = TRUE;

COMMENT ON TABLE deliverables IS 'AI 任务交付物表';
COMMENT ON COLUMN deliverables.storage_type IS 'inline=数据库存储, s3=对象存储, url=外部链接, git=代码仓库';
COMMENT ON COLUMN deliverables.version IS '版本号，同一任务可有多版交付物';
```

### 2.13 员工技能表：`employee_skills`

```sql
CREATE TABLE employee_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES ai_employees(id) ON DELETE CASCADE,
    
    skill_name VARCHAR(50) NOT NULL,
    skill_category VARCHAR(30) NOT NULL
        CHECK (skill_category IN ('technical', 'creative', 'analytical', 'social', 'business', 'leadership')),
    
    level INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
    experience_points INT NOT NULL DEFAULT 0,
    
    proficiency DECIMAL(3,2) CHECK (proficiency BETWEEN 0 AND 1),  -- 熟练度
    last_used_at TIMESTAMPTZ,
    
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(employee_id, skill_name)
);

-- 索引
CREATE INDEX idx_employee_skills_employee ON employee_skills(employee_id);
CREATE INDEX idx_employee_skills_category ON employee_skills(skill_category);
CREATE INDEX idx_employee_skills_level ON employee_skills(level DESC);

COMMENT ON TABLE employee_skills IS 'AI 员工技能明细表（从 JSONB 解耦的规范化表）';
```

### 2.14 员工绩效表：`employee_performances`

```sql
CREATE TABLE employee_performances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES ai_employees(id) ON DELETE CASCADE,
    sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
    
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    tasks_completed INT NOT NULL DEFAULT 0,
    tasks_rejected INT NOT NULL DEFAULT 0,
    avg_completion_hours DECIMAL(5,2),
    avg_student_rating DECIMAL(3,2),
    
    quality_score DECIMAL(5,2),                     -- 质量分 0-100
    efficiency_score DECIMAL(5,2),                  -- 效率分 0-100
    collaboration_score DECIMAL(5,2),               -- 协作分 0-100
    overall_score DECIMAL(5,2),                     -- 综合分 0-100
    
    strengths JSONB DEFAULT '[]',                   -- 优势领域
    improvements JSONB DEFAULT '[]',                -- 待改进项
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 约束
ALTER TABLE employee_performances ADD CONSTRAINT chk_performance_period 
    CHECK (period_end >= period_start);

-- 索引
CREATE INDEX idx_employee_performances_employee ON employee_performances(employee_id);
CREATE INDEX idx_employee_performances_sprint ON employee_performances(sprint_id) WHERE sprint_id IS NOT NULL;
CREATE INDEX idx_employee_performances_period ON employee_performances(period_start, period_end);
CREATE INDEX idx_employee_performances_score ON employee_performances(overall_score DESC);

COMMENT ON TABLE employee_performances IS 'AI 员工周期性绩效评估表';
```

### 2.15 公司设置表：`company_settings`

```sql
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES one_companies(id) ON DELETE CASCADE,
    
    -- 通用设置
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    language VARCHAR(10) DEFAULT 'zh-CN',
    
    -- 通知设置
    notify_on_task_complete BOOLEAN DEFAULT TRUE,
    notify_on_review_required BOOLEAN DEFAULT TRUE,
    notify_on_milestone BOOLEAN DEFAULT TRUE,
    notify_on_revenue BOOLEAN DEFAULT TRUE,
    notification_channels JSONB DEFAULT '{"email": true, "push": true, "websocket": true}',
    
    -- AI 员工设置
    auto_assign_tasks BOOLEAN DEFAULT FALSE,
    ai_aggressiveness VARCHAR(10) DEFAULT 'balanced'  -- conservative | balanced | aggressive
        CHECK (ai_aggressiveness IN ('conservative', 'balanced', 'aggressive')),
    max_concurrent_tasks INT DEFAULT 3 CHECK (max_concurrent_tasks BETWEEN 1 AND 10),
    
    -- 财务设置
    budget_alert_threshold DECIMAL(5,2) DEFAULT 80.0,  -- 预算使用百分比告警
    monthly_budget DECIMAL(12,2) DEFAULT 0,
    
    -- MCP 设置
    allowed_mcp_tools JSONB DEFAULT '[]',           -- 白名单
    blocked_mcp_tools JSONB DEFAULT '[]',           -- 黑名单
    mcp_budget_monthly DECIMAL(10,2) DEFAULT 100.0, -- MCP 月度预算（USD）
    
    -- 隐私设置
    is_public_profile BOOLEAN DEFAULT FALSE,
    allow_analytics_sharing BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_company_settings_company ON company_settings(company_id);

COMMENT ON TABLE company_settings IS '公司级配置与偏好设置表';
```

### 2.16 外部服务集成配置表：`external_integrations`

```sql
CREATE TABLE external_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES one_companies(id) ON DELETE CASCADE,
    
    service_name VARCHAR(30) NOT NULL
        CHECK (service_name IN ('vercel', 'github', 'stripe', 'resend', 'supabase', 'figma', 'twitter', 'wechat', 'custom')),
    display_name VARCHAR(100),                      -- 用户自定义显示名
    
    auth_type VARCHAR(20) NOT NULL
        CHECK (auth_type IN ('oauth2', 'api_key', 'token', 'webhook')),
    
    -- 凭证加密存储（实际应使用应用层加密）
    credentials_encrypted TEXT,                     -- 加密后的凭证
    credentials_metadata JSONB DEFAULT '{}',        -- 凭证元数据（过期时间、权限范围等）
    
    config JSONB DEFAULT '{}',                      -- 服务特定配置
    
    status integration_status NOT NULL DEFAULT 'inactive',
    last_error TEXT,
    last_used_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_external_integrations_company ON external_integrations(company_id);
CREATE INDEX idx_external_integrations_service ON external_integrations(service_name);
CREATE INDEX idx_external_integrations_status ON external_integrations(status);

COMMENT ON TABLE external_integrations IS '外部服务（MCP 目标平台）集成配置表';
COMMENT ON COLUMN external_integrations.credentials_encrypted IS '加密存储的 API Key / OAuth Token，密钥由 KMS 管理';
```

---

## 三、触发器

### 3.1 自动更新时间戳

```sql
-- 通用触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 应用到所有需要自动更新 updated_at 的表
CREATE TRIGGER trg_one_companies_updated_at
    BEFORE UPDATE ON one_companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ai_employees_updated_at
    BEFORE UPDATE ON ai_employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ai_tasks_updated_at
    BEFORE UPDATE ON ai_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_sprints_updated_at
    BEFORE UPDATE ON sprints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_venture_logs_updated_at
    BEFORE UPDATE ON venture_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_deliverables_updated_at
    BEFORE UPDATE ON deliverables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_employee_skills_updated_at
    BEFORE UPDATE ON employee_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_external_integrations_updated_at
    BEFORE UPDATE ON external_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 自动更新公司累计数据

```sql
-- 当财务记录变更时，自动更新公司 total_revenue / total_cost
CREATE OR REPLACE FUNCTION update_company_finance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.record_type = 'revenue' THEN
            UPDATE one_companies 
            SET total_revenue = total_revenue + NEW.amount_cny
            WHERE id = NEW.company_id;
        ELSIF NEW.record_type = 'cost' THEN
            UPDATE one_companies 
            SET total_cost = total_cost + NEW.amount_cny
            WHERE id = NEW.company_id;
        END IF;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.record_type = 'revenue' THEN
            UPDATE one_companies 
            SET total_revenue = GREATEST(0, total_revenue - OLD.amount_cny)
            WHERE id = OLD.company_id;
        ELSIF OLD.record_type = 'cost' THEN
            UPDATE one_companies 
            SET total_cost = GREATEST(0, total_cost - OLD.amount_cny)
            WHERE id = OLD.company_id;
        END IF;
        RETURN OLD;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- 先减去旧值
        IF OLD.record_type = 'revenue' THEN
            UPDATE one_companies SET total_revenue = GREATEST(0, total_revenue - OLD.amount_cny)
            WHERE id = OLD.company_id;
        ELSE
            UPDATE one_companies SET total_cost = GREATEST(0, total_cost - OLD.amount_cny)
            WHERE id = OLD.company_id;
        END IF;
        -- 加上新值
        IF NEW.record_type = 'revenue' THEN
            UPDATE one_companies SET total_revenue = total_revenue + NEW.amount_cny
            WHERE id = NEW.company_id;
        ELSE
            UPDATE one_companies SET total_cost = total_cost + NEW.amount_cny
            WHERE id = NEW.company_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_finance_records_company_update
    AFTER INSERT OR UPDATE OR DELETE ON finance_records
    FOR EACH ROW EXECUTE FUNCTION update_company_finance();
```

### 3.3 自动更新员工任务统计

```sql
CREATE OR REPLACE FUNCTION update_employee_task_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.employee_id IS NOT NULL THEN
        UPDATE ai_employees 
        SET task_count = task_count + 1,
            current_task_id = CASE WHEN NEW.status = 'in_progress' THEN NEW.id ELSE current_task_id END
        WHERE id = NEW.employee_id;
        
    ELSIF TG_OP = 'UPDATE' AND NEW.employee_id IS NOT NULL THEN
        -- 状态变更为 completed
        IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
            UPDATE ai_employees 
            SET tasks_completed = tasks_completed + 1,
                current_task_id = CASE WHEN current_task_id = NEW.id THEN NULL ELSE current_task_id END,
                status = 'idle'
            WHERE id = NEW.employee_id;
        -- 状态变更为 in_progress
        ELSIF OLD.status = 'pending' AND NEW.status = 'in_progress' THEN
            UPDATE ai_employees 
            SET current_task_id = NEW.id,
                status = 'busy'
            WHERE id = NEW.employee_id;
        -- 状态变更为 rejected
        ELSIF OLD.status != 'rejected' AND NEW.status = 'rejected' THEN
            UPDATE ai_employees 
            SET tasks_rejected = tasks_rejected + 1,
                current_task_id = CASE WHEN current_task_id = NEW.id THEN NULL ELSE current_task_id END,
                status = 'idle'
            WHERE id = NEW.employee_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_tasks_employee_stats
    AFTER INSERT OR UPDATE ON ai_tasks
    FOR EACH ROW EXECUTE FUNCTION update_employee_task_stats();
```

### 3.4 自动更新公司任务计数

```sql
CREATE OR REPLACE FUNCTION update_company_task_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE one_companies 
        SET task_count = task_count + 1
        WHERE id = NEW.company_id;
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
            UPDATE one_companies 
            SET completed_task_count = completed_task_count + 1
            WHERE id = NEW.company_id;
        END IF;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE one_companies 
        SET task_count = GREATEST(0, task_count - 1),
            completed_task_count = GREATEST(0, completed_task_count - CASE WHEN OLD.status = 'completed' THEN 1 ELSE 0 END)
        WHERE id = OLD.company_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_tasks_company_count
    AFTER INSERT OR UPDATE OR DELETE ON ai_tasks
    FOR EACH ROW EXECUTE FUNCTION update_company_task_count();
```

---

## 四、SQLAlchemy ORM 模型（Python）

```python
"""
OHB SQLAlchemy ORM Models
Compatible with: SQLite (dev) / PostgreSQL (prod)
"""

import uuid
from datetime import datetime, date
from typing import Optional, List
from enum import Enum as PyEnum

from sqlalchemy import (
    create_engine, Column, String, Text, Integer, Boolean, 
    DateTime, Date, Decimal, ForeignKey, Index, CheckConstraint,
    UniqueConstraint, event, types
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship, Session
from sqlalchemy.sql import func

Base = declarative_base()

# ==================== 枚举定义 ====================

class CompanyStage(str, PyEnum):
    IDEATE = "IDEATE"
    VALIDATE = "VALIDATE"
    BUILD = "BUILD"
    LAUNCH = "LAUNCH"
    SCALE = "SCALE"
    ARCHIVED = "ARCHIVED"

class EmployeeRole(str, PyEnum):
    STRATEGIST = "strategist"
    WORKER = "worker"
    ADVISOR = "advisor"
    SCOUT = "scout"

class TaskStatus(str, PyEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class TaskType(str, PyEnum):
    CODE = "code"
    DESIGN = "design"
    COPY = "copy"
    RESEARCH = "research"
    ANALYSIS = "analysis"
    MARKETING = "marketing"
    LEGAL = "legal"
    FINANCE = "finance"
    REVIEW = "review"
    CUSTOM = "custom"

class Priority(str, PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class RecordType(str, PyEnum):
    REVENUE = "revenue"
    COST = "cost"

class ReviewDecision(str, PyEnum):
    PASS = "pass"
    CONDITIONAL = "conditional"
    FAIL = "fail"

class IntelType(str, PyEnum):
    COMPETITOR = "competitor"
    TREND = "trend"
    CUSTOMER_FEEDBACK = "customer_feedback"
    PRICING = "pricing"
    REGULATION = "regulation"
    OPPORTUNITY = "opportunity"
    THREAT = "threat"

class LogType(str, PyEnum):
    MILESTONE = "milestone"
    DECISION = "decision"
    REFLECTION = "reflection"
    CHALLENGE = "challenge"
    LEARNING = "learning"
    DAILY = "daily"
    WEEKLY = "weekly"

class DeliverableType(str, PyEnum):
    CODE = "code"
    DOCUMENT = "document"
    DESIGN = "design"
    DATA = "data"
    LINK = "link"
    IMAGE = "image"
    VIDEO = "video"
    SPREADSHEET = "spreadsheet"
    PRESENTATION = "presentation"
    OTHER = "other"

class StorageType(str, PyEnum):
    INLINE = "inline"
    S3 = "s3"
    URL = "url"
    GIT = "git"

class IntegrationStatus(str, PyEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    REVOKED = "revoked"


# ==================== 基础 Mixin ====================

class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


# ==================== 主表模型 ====================

class OneCompany(Base, TimestampMixin):
    __tablename__ = "one_companies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    career_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    owner_user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    tagline = Column(String(255))
    
    stage = Column(String(20), nullable=False, default=CompanyStage.IDEATE.value)
    mode = Column(String(20), nullable=False, default="simulation")
    
    business_model_canvas = Column(JSONB, default=dict)
    brand_config = Column(JSONB, default=dict)
    industry = Column(String(50))
    target_audience = Column(JSONB, default=list)
    
    total_revenue = Column(Decimal(14, 2), nullable=False, default=0)
    total_cost = Column(Decimal(14, 2), nullable=False, default=0)
    
    employee_count = Column(Integer, nullable=False, default=0)
    task_count = Column(Integer, nullable=False, default=0)
    completed_task_count = Column(Integer, nullable=False, default=0)
    
    status = Column(String(20), nullable=False, default="active")
    
    launched_at = Column(DateTime(timezone=True))
    archived_at = Column(DateTime(timezone=True))
    
    # Relationships
    employees: List["AIEmployee"] = relationship("AIEmployee", back_populates="company", cascade="all, delete-orphan")
    tasks: List["AITask"] = relationship("AITask", back_populates="company", cascade="all, delete-orphan")
    sprints: List["Sprint"] = relationship("Sprint", back_populates="company", cascade="all, delete-orphan")
    milestones: List["Milestone"] = relationship("Milestone", back_populates="company", cascade="all, delete-orphan")
    finance_records: List["FinanceRecord"] = relationship("FinanceRecord", back_populates="company", cascade="all, delete-orphan")
    market_intel: List["MarketIntel"] = relationship("MarketIntel", back_populates="company", cascade="all, delete-orphan")
    gateway_reviews: List["GatewayReview"] = relationship("GatewayReview", back_populates="company", cascade="all, delete-orphan")
    venture_logs: List["VentureLog"] = relationship("VentureLog", back_populates="company", cascade="all, delete-orphan")
    mcp_call_logs: List["MCPCallLog"] = relationship("MCPCallLog", back_populates="company", cascade="all, delete-orphan")
    settings: Optional["CompanySettings"] = relationship("CompanySettings", back_populates="company", uselist=False, cascade="all, delete-orphan")
    external_integrations: List["ExternalIntegration"] = relationship("ExternalIntegration", back_populates="company", cascade="all, delete-orphan")
    
    __table_args__ = (
        CheckConstraint("mode IN ('simulation', 'real', 'competition')", name="chk_company_mode"),
        CheckConstraint("status IN ('active', 'paused', 'archived')", name="chk_company_status"),
        CheckConstraint("stage IN ('IDEATE', 'VALIDATE', 'BUILD', 'LAUNCH', 'SCALE', 'ARCHIVED')", name="chk_company_stage"),
        Index("idx_one_companies_stage_active", "stage", postgresql_where=(status == "active")),
    )


class AIEmployee(Base, TimestampMixin):
    __tablename__ = "ai_employees"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id", ondelete="CASCADE"), nullable=False)
    
    codename = Column(String(20), nullable=False)
    display_name = Column(String(50))
    role_type = Column(String(30), nullable=False)
    avatar_emoji = Column(String(10), default="🤖")
    
    level = Column(Integer, nullable=False, default=1)
    experience_points = Column(Integer, nullable=False, default=0)
    
    skills = Column(JSONB, default=list)
    skill_tree = Column(JSONB, default=dict)
    mcp_tools = Column(JSONB, default=list)
    mcp_tool_quota = Column(JSONB, default=dict)
    
    personality_prompt = Column(Text)
    memory_vector_id = Column(String(100))
    memory_summary = Column(Text)
    
    status = Column(String(20), nullable=False, default="idle")
    current_task_id = Column(UUID(as_uuid=True), index=True)
    
    tasks_completed = Column(Integer, nullable=False, default=0)
    tasks_rejected = Column(Integer, nullable=False, default=0)
    avg_task_score = Column(Decimal(3, 2))
    satisfaction_score = Column(Decimal(3, 2))
    
    hourly_rate = Column(Decimal(8, 2), default=0)
    total_cost_generated = Column(Decimal(12, 2), default=0)
    
    hired_at = Column(DateTime(timezone=True), default=func.now())
    
    # Relationships
    company: "OneCompany" = relationship("OneCompany", back_populates="employees")
    tasks: List["AITask"] = relationship("AITask", back_populates="employee")
    skills_detail: List["EmployeeSkill"] = relationship("EmployeeSkill", back_populates="employee", cascade="all, delete-orphan")
    performances: List["EmployeePerformance"] = relationship("EmployeePerformance", back_populates="employee", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint("company_id", "codename", name="uq_employee_codename_company"),
        CheckConstraint("level BETWEEN 1 AND 10", name="chk_employee_level"),
        CheckConstraint("status IN ('idle', 'busy', 'offline', 'upgrading', 'error')", name="chk_employee_status"),
    )


class AITask(Base, TimestampMixin):
    __tablename__ = "ai_tasks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("ai_employees.id", ondelete="SET NULL"))
    sprint_id = Column(UUID(as_uuid=True), ForeignKey("sprints.id", ondelete="SET NULL"))
    milestone_id = Column(UUID(as_uuid=True), ForeignKey("milestones.id", ondelete="SET NULL"))
    parent_task_id = Column(UUID(as_uuid=True), ForeignKey("ai_tasks.id", ondelete="CASCADE"))
    
    title = Column(String(200), nullable=False)
    description = Column(Text)
    task_type = Column(String(30), nullable=False)
    priority = Column(String(10), nullable=False, default="medium")
    status = Column(String(20), nullable=False, default="pending")
    
    requirements = Column(JSONB, nullable=False, default=dict)
    acceptance_criteria = Column(JSONB, default=list)
    deliverables = Column(JSONB, default=list)
    
    estimated_hours = Column(Decimal(5, 2))
    actual_hours = Column(Decimal(5, 2))
    cost_simulated = Column(Decimal(10, 2))
    
    student_review = Column(Text)
    student_rating = Column(Integer)
    review_decision = Column(String(20))
    
    execution_summary = Column(Text)
    error_log = Column(Text)
    
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    reviewed_at = Column(DateTime(timezone=True))
    deadline_at = Column(DateTime(timezone=True))
    
    # Relationships
    company: "OneCompany" = relationship("OneCompany", back_populates="tasks")
    employee: Optional["AIEmployee"] = relationship("AIEmployee", back_populates="tasks")
    sprint: Optional["Sprint"] = relationship("Sprint", back_populates="tasks")
    milestone: Optional["Milestone"] = relationship("Milestone", back_populates="tasks")
    deliverable_list: List["Deliverable"] = relationship("Deliverable", back_populates="task", cascade="all, delete-orphan")
    
    __table_args__ = (
        CheckConstraint("priority IN ('low', 'medium', 'high', 'urgent')", name="chk_task_priority"),
        CheckConstraint("status IN ('pending', 'in_progress', 'review', 'completed', 'rejected', 'cancelled')", name="chk_task_status"),
        CheckConstraint("student_rating BETWEEN 1 AND 5", name="chk_task_rating"),
        CheckConstraint("review_decision IN ('pending', 'approved', 'rejected', 'needs_revision')", name="chk_task_review_decision"),
        Index("idx_ai_tasks_company_status_created", "company_id", "status", "created_at"),
        Index("idx_ai_tasks_deadline_active", "deadline_at", postgresql_where=(status.notin_(["completed", "rejected", "cancelled"]))),
    )


class Sprint(Base, TimestampMixin):
    __tablename__ = "sprints"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(100), nullable=False)
    goal = Column(Text)
    stage = Column(String(20), nullable=False, default=CompanyStage.IDEATE.value)
    status = Column(String(20), nullable=False, default="planning")
    
    planned_tasks = Column(Integer, nullable=False, default=0)
    completed_tasks = Column(Integer, nullable=False, default=0)
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    actual_end_date = Column(Date)
    
    review_data = Column(JSONB, default=dict)
    retrospective = Column(JSONB, default=dict)
    
    # Relationships
    company: "OneCompany" = relationship("OneCompany", back_populates="sprints")
    tasks: List["AITask"] = relationship("AITask", back_populates="sprint")
    performances: List["EmployeePerformance"] = relationship("EmployeePerformance", back_populates="sprint")
    
    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="chk_sprint_dates"),
        CheckConstraint("status IN ('planning', 'active', 'review', 'completed', 'cancelled')", name="chk_sprint_status"),
    )


class Milestone(Base):
    __tablename__ = "milestones"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(100), nullable=False)
    description = Column(Text)
    stage = Column(String(20), nullable=False)
    
    criteria = Column(JSONB, nullable=False, default=list)
    deliverables_required = Column(JSONB, default=list)
    
    status = Column(String(20), nullable=False, default="locked")
    unlock_conditions = Column(JSONB, default=dict)
    unlocked_at = Column(DateTime(timezone=True))
    achieved_at = Column(DateTime(timezone=True))
    deadline_at = Column(DateTime(timezone=True))
    
    xp_reward = Column(Integer, nullable=False, default=0)
    badge_id = Column(String(50))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    company: "OneCompany" = relationship("OneCompany", back_populates="milestones")
    tasks: List["AITask"] = relationship("AITask", back_populates="milestone")
    
    __table_args__ = (
        CheckConstraint("status IN ('locked', 'unlocked', 'in_progress', 'achieved', 'missed')", name="chk_milestone_status"),
    )


class GatewayReview(Base):
    __tablename__ = "gateway_reviews"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id", ondelete="CASCADE"), nullable=False)
    milestone_id = Column(UUID(as_uuid=True), ForeignKey("milestones.id", ondelete="SET NULL"))
    
    stage = Column(String(20), nullable=False)
    reviewer_type = Column(String(20), nullable=False)
    reviewer_id = Column(UUID(as_uuid=True))
    
    review_data = Column(JSONB, nullable=False, default=dict)
    overall_score = Column(Decimal(5, 2))
    decision = Column(String(20), nullable=False)
    
    feedback = Column(Text)
    action_items = Column(JSONB, default=list)
    student_response = Column(Text)
    
    reviewed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    responded_at = Column(DateTime(timezone=True))
    effective_until = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    company: "OneCompany" = relationship("OneCompany", back_populates="gateway_reviews")
    milestone: Optional["Milestone"] = relationship("Milestone")
    
    __table_args__ = (
        CheckConstraint("reviewer_type IN ('ai_panel', 'mentor', 'peer', 'auto')", name="chk_review_reviewer_type"),
        CheckConstraint("decision IN ('pass', 'conditional', 'fail')", name="chk_review_decision"),
    )


class FinanceRecord(Base):
    __tablename__ = "finance_records"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id", ondelete="CASCADE"), nullable=False)
    
    record_type = Column(String(20), nullable=False)
    category = Column(String(50), nullable=False)
    amount = Column(Decimal(14, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="CNY")
    exchange_rate = Column(Decimal(10, 6), default=1.0)
    
    is_real_money = Column(Boolean, nullable=False, default=False)
    payment_method = Column(String(30))
    external_transaction_id = Column(String(100))
    
    description = Column(Text)
    attachments = Column(JSONB, default=list)
    
    related_task_id = Column(UUID(as_uuid=True), ForeignKey("ai_tasks.id", ondelete="SET NULL"))
    related_employee_id = Column(UUID(as_uuid=True), ForeignKey("ai_employees.id", ondelete="SET NULL"))
    
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    company: "OneCompany" = relationship("OneCompany", back_populates="finance_records")
    related_task: Optional["AITask"] = relationship("AITask")
    related_employee: Optional["AIEmployee"] = relationship("AIEmployee")
    
    __table_args__ = (
        CheckConstraint("record_type IN ('revenue', 'cost')", name="chk_finance_record_type"),
        CheckConstraint("amount >= 0", name="chk_finance_amount"),
    )


class MarketIntel(Base):
    __tablename__ = "market_intel"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id", ondelete="CASCADE"), nullable=False)
    
    intel_type = Column(String(30), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    source_url = Column(String(500))
    source_type = Column(String(20))
    
    confidence_score = Column(Decimal(3, 2))
    relevance_score = Column(Decimal(3, 2))
    
    tags = Column(JSONB, default=list)
    metadata = Column(JSONB, default=dict)
    
    discovered_by = Column(UUID(as_uuid=True), ForeignKey("ai_employees.id", ondelete="SET NULL"))
    
    is_actioned = Column(Boolean, default=False)
    action_summary = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True))
    
    # Relationships
    company: "OneCompany" = relationship("OneCompany", back_populates="market_intel")
    discoverer: Optional["AIEmployee"] = relationship("AIEmployee")
    
    __table_args__ = (
        CheckConstraint("intel_type IN ('competitor', 'trend', 'customer_feedback', 'pricing', 'regulation', 'opportunity', 'threat')", name="chk_intel_type"),
        CheckConstraint("source_type IN ('web_scrape', 'api_fetch', 'user_input', 'ai_analysis', 'mcp_tool')", name="chk_intel_source"),
        CheckConstraint("confidence_score BETWEEN 0 AND 1", name="chk_intel_confidence"),
        CheckConstraint("relevance_score BETWEEN 0 AND 1", name="chk_intel_relevance"),
    )


class VentureLog(Base, TimestampMixin):
    __tablename__ = "venture_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    
    log_type = Column(String(20), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    
    mood = Column(String(20))
    energy_level = Column(Integer)
    
    related_stage = Column(String(20))
    related_task_id = Column(UUID(as_uuid=True), ForeignKey("ai_tasks.id", ondelete="SET NULL"))
    
    media_urls = Column(JSONB, default=list)
    
    is_shared = Column(Boolean, default=False)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    
    # Relationships
    company: "OneCompany" = relationship("OneCompany", back_populates="venture_logs")
    related_task: Optional["AITask"] = relationship("AITask")
    
    __table_args__ = (
        CheckConstraint("log_type IN ('milestone', 'decision', 'reflection', 'challenge', 'learning', 'daily', 'weekly')", name="chk_log_type"),
        CheckConstraint("energy_level BETWEEN 1 AND 10", name="chk_log_energy"),
        Index("idx_venture_logs_shared", "created_at", postgresql_where=(is_shared == True)),
    )


class MCPCallLog(Base):
    __tablename__ = "mcp_call_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("ai_employees.id", ondelete="SET NULL"))
    task_id = Column(UUID(as_uuid=True), ForeignKey("ai_tasks.id", ondelete="SET NULL"))
    
    tool_name = Column(String(50), nullable=False)
    tool_version = Column(String(20))
    
    request_payload = Column(JSONB, nullable=False)
    response_payload = Column(JSONB)
    
    status = Column(String(20), nullable=False)
    error_message = Column(Text)
    error_code = Column(String(50))
    
    latency_ms = Column(Integer)
    tokens_used = Column(Integer)
    cost_usd = Column(Decimal(10, 6))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    company: "OneCompany" = relationship("OneCompany", back_populates="mcp_call_logs")
    employee: Optional["AIEmployee"] = relationship("AIEmployee")
    task: Optional["AITask"] = relationship("AITask")
    
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'success', 'error', 'timeout', 'rate_limited')", name="chk_mcp_status"),
        Index("idx_mcp_call_logs_errors", "created_at", postgresql_where=(status.in_(["error", "timeout", "rate_limited"]))),
    )


class Deliverable(Base, TimestampMixin):
    __tablename__ = "deliverables"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("ai_tasks.id", ondelete="CASCADE"), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id", ondelete="CASCADE"), nullable=False)
    
    deliverable_type = Column(String(30), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    
    storage_type = Column(String(20), nullable=False)
    storage_path = Column(String(500))
    storage_size_bytes = Column(types.BigInteger)
    mime_type = Column(String(100))
    
    content_inline = Column(Text)
    content_summary = Column(Text)
    
    version = Column(Integer, nullable=False, default=1)
    previous_version_id = Column(UUID(as_uuid=True), ForeignKey("deliverables.id", ondelete="SET NULL"))
    
    is_final = Column(Boolean, default=False)
    student_approved = Column(Boolean, default=False)
    approved_at = Column(DateTime(timezone=True))
    
    metadata = Column(JSONB, default=dict)
    
    # Relationships
    task: "AITask" = relationship("AITask", back_populates="deliverable_list")
    company: "OneCompany" = relationship("OneCompany")
    previous_version: Optional["Deliverable"] = relationship("Deliverable", remote_side=[id])
    
    __table_args__ = (
        CheckConstraint("deliverable_type IN ('code', 'document', 'design', 'data', 'link', 'image', 'video', 'spreadsheet', 'presentation', 'other')", name="chk_deliverable_type"),
        CheckConstraint("storage_type IN ('inline', 's3', 'url', 'git')", name="chk_storage_type"),
        Index("idx_deliverables_final", "task_id", "is_final", postgresql_where=(is_final == True)),
    )


class EmployeeSkill(Base, TimestampMixin):
    __tablename__ = "employee_skills"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("ai_employees.id", ondelete="CASCADE"), nullable=False)
    
    skill_name = Column(String(50), nullable=False)
    skill_category = Column(String(30), nullable=False)
    level = Column(Integer, nullable=False, default=1)
    experience_points = Column(Integer, nullable=False, default=0)
    proficiency = Column(Decimal(3, 2))
    last_used_at = Column(DateTime(timezone=True))
    unlocked_at = Column(DateTime(timezone=True), default=func.now())
    
    # Relationships
    employee: "AIEmployee" = relationship("AIEmployee", back_populates="skills_detail")
    
    __table_args__ = (
        UniqueConstraint("employee_id", "skill_name", name="uq_employee_skill"),
        CheckConstraint("level BETWEEN 1 AND 10", name="chk_skill_level"),
        CheckConstraint("skill_category IN ('technical', 'creative', 'analytical', 'social', 'business', 'leadership')", name="chk_skill_category"),
    )


class EmployeePerformance(Base):
    __tablename__ = "employee_performances"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("ai_employees.id", ondelete="CASCADE"), nullable=False)
    sprint_id = Column(UUID(as_uuid=True), ForeignKey("sprints.id", ondelete="SET NULL"))
    
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    
    tasks_completed = Column(Integer, nullable=False, default=0)
    tasks_rejected = Column(Integer, nullable=False, default=0)
    avg_completion_hours = Column(Decimal(5, 2))
    avg_student_rating = Column(Decimal(3, 2))
    
    quality_score = Column(Decimal(5, 2))
    efficiency_score = Column(Decimal(5, 2))
    collaboration_score = Column(Decimal(5, 2))
    overall_score = Column(Decimal(5, 2))
    
    strengths = Column(JSONB, default=list)
    improvements = Column(JSONB, default=list)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    employee: "AIEmployee" = relationship("AIEmployee", back_populates="performances")
    sprint: Optional["Sprint"] = relationship("Sprint", back_populates="performances")
    
    __table_args__ = (
        CheckConstraint("period_end >= period_start", name="chk_performance_period"),
    )


class CompanySettings(Base, TimestampMixin):
    __tablename__ = "company_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    timezone = Column(String(50), default="Asia/Shanghai")
    language = Column(String(10), default="zh-CN")
    
    notify_on_task_complete = Column(Boolean, default=True)
    notify_on_review_required = Column(Boolean, default=True)
    notify_on_milestone = Column(Boolean, default=True)
    notify_on_revenue = Column(Boolean, default=True)
    notification_channels = Column(JSONB, default=dict)
    
    auto_assign_tasks = Column(Boolean, default=False)
    ai_aggressiveness = Column(String(10), default="balanced")
    max_concurrent_tasks = Column(Integer, default=3)
    
    budget_alert_threshold = Column(Decimal(5, 2), default=80.0)
    monthly_budget = Column(Decimal(12, 2), default=0)
    
    allowed_mcp_tools = Column(JSONB, default=list)
    blocked_mcp_tools = Column(JSONB, default=list)
    mcp_budget_monthly = Column(Decimal(10, 2), default=100.0)
    
    is_public_profile = Column(Boolean, default=False)
    allow_analytics_sharing = Column(Boolean, default=True)
    
    # Relationships
    company: "OneCompany" = relationship("OneCompany", back_populates="settings")
    
    __table_args__ = (
        CheckConstraint("ai_aggressiveness IN ('conservative', 'balanced', 'aggressive')", name="chk_ai_aggressiveness"),
        CheckConstraint("max_concurrent_tasks BETWEEN 1 AND 10", name="chk_max_concurrent"),
    )


class ExternalIntegration(Base, TimestampMixin):
    __tablename__ = "external_integrations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("one_companies.id", ondelete="CASCADE"), nullable=False)
    
    service_name = Column(String(30), nullable=False)
    display_name = Column(String(100))
    auth_type = Column(String(20), nullable=False)
    
    credentials_encrypted = Column(Text)
    credentials_metadata = Column(JSONB, default=dict)
    config = Column(JSONB, default=dict)
    
    status = Column(String(20), nullable=False, default="inactive")
    last_error = Column(Text)
    last_used_at = Column(DateTime(timezone=True))
    last_synced_at = Column(DateTime(timezone=True))
    
    # Relationships
    company: "OneCompany" = relationship("OneCompany", back_populates="external_integrations")
    
    __table_args__ = (
        CheckConstraint("service_name IN ('vercel', 'github', 'stripe', 'resend', 'supabase', 'figma', 'twitter', 'wechat', 'custom')", name="chk_integration_service"),
        CheckConstraint("auth_type IN ('oauth2', 'api_key', 'token', 'webhook')", name="chk_integration_auth"),
        CheckConstraint("status IN ('active', 'inactive', 'error', 'revoked')", name="chk_integration_status"),
    )


# ==================== 数据库初始化 ====================

def init_db(database_url: str = "postgresql://user:pass@localhost/ohb"):
    """初始化数据库，创建所有表"""
    engine = create_engine(database_url, echo=False)
    Base.metadata.create_all(engine)
    return engine


if __name__ == "__main__":
    # 开发环境使用 SQLite
    engine = init_db("sqlite:///ohb_dev.db")
    print("Database initialized.")
```

---

## 五、Schema 版本控制

推荐使用 Alembic 进行数据库迁移管理：

```bash
# 初始化 Alembic
alembic init alembic

# 创建迁移脚本
alembic revision --autogenerate -m "init_ohb_schema"

# 执行迁移
alembic upgrade head
```

---

## 六、ER 关系图（文本描述）

```
one_companies (1) ────< (N) ai_employees
              (1) ────< (N) ai_tasks
              (1) ────< (N) sprints
              (1) ────< (N) milestones
              (1) ────< (N) gateway_reviews
              (1) ────< (N) finance_records
              (1) ────< (N) market_intel
              (1) ────< (N) venture_logs
              (1) ────< (N) mcp_call_logs
              (1) ────< (1) company_settings
              (1) ────< (N) external_integrations

ai_employees (1) ────< (N) ai_tasks
             (1) ────< (N) employee_skills
             (1) ────< (N) employee_performances
             (1) ────< (N) mcp_call_logs
             (1) ────< (N) finance_records

ai_tasks (1) ────< (N) deliverables
         (N) ────> (1) sprints
         (N) ────> (1) milestones

sprints (1) ────< (N) ai_tasks
        (1) ────< (N) employee_performances

deliverables (N) ────> (1) ai_tasks
             (N) ────> (1) deliverables (previous_version)
```

---

*文档结束*
