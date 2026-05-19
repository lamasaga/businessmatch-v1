# OPC-report MCP Server 规格文档

> **文档定位**：定义 OPC 平台报告生成系统的 MCP Server 完整规格，包含商业模式画布PDF、路演PPT、财务报告和周度总结等文档的自动化生成能力。
>
> **关联文档**：`01-MCP架构总览.md`、`02-OPC-memory-server-spec.md`
>
> **最后更新**：2026-05-17

---

## 一、概述

`OPC-report` 是 OPC 平台的成果输出引擎，负责将 AI 员工的工作成果转化为结构化、可分享的文档。无论是商业模式画布、路演演示文稿还是财务报告，该 Server 都提供统一的模板引擎和数据注入机制，确保生成的文档既符合教育场景的专业标准，又具备商业实战的呈现质量。

**核心价值**：
1. **统一品牌**：所有文档遵循 OPC 视觉规范和学校定制 branding
2. **数据驱动**：直接从平台数据库和 AI 员工工作流中提取数据
3. **多格式输出**：支持 PDF、PPTX、HTML 等多种格式
4. **可编辑性**：生成的文档保留可编辑层，学生可在此基础上修改

---

## 二、模板引擎设计

### 2.1 架构设计

```
模板层 (Templates)
├── 基础模板 (Base)
│   ├── 页面布局 (header/footer/margin)
│   ├── 字体规范 (typography)
│   ├── 颜色系统 (brand colors)
│   └── 组件库 (tables/charts/callouts)
│
├── 业务模板 (Business)
│   ├── BMC (Business Model Canvas)
│   ├── Pitch Deck (路演PPT)
│   ├── Financial Report (财务报告)
│   ├── Weekly Summary (周度总结)
│   └── Custom Report (自定义报告)
│
└── 学校定制 (School Custom)
    ├── 校徽/Logo 替换
    ├── 页眉页脚定制
    └── 评分标准插入
```

### 2.2 模板技术选型

| 格式 | 引擎 | 优势 | 适用场景 |
|------|------|------|----------|
| PDF | WeasyPrint / Playwright + HTML | 精确排版，CSS控制 | 正式报告、画布 |
| PPTX | python-pptx | 原生PowerPoint格式 | 路演演示 |
| HTML | Jinja2 + Tailwind | 响应式，在线预览 | 快速预览、网页嵌入 |
| DOCX | python-docx | 可编辑Word格式 | 需要后续编辑的文档 |

**最终方案**：Jinja2 作为模板语言，输出时根据需求渲染为 PDF（WeasyPrint）、PPTX（python-pptx）或 HTML。

### 2.3 模板变量规范

```yaml
# 模板变量命名规范
template_variables:
  # 元数据
  meta:
    - report_id          # 报告唯一标识
    - generated_at       # 生成时间
    - student_name       # 学生姓名
    - student_id         # 学生ID
    - company_name       # 公司名称
    - school_name        # 学校名称
    - ai_team_name       # AI员工团队名称
  
  # 内容数据
  content:
    - title              # 报告标题
    - sections[]         # 章节列表
    - sections[].heading # 章节标题
    - sections[].body    # 章节正文
    - sections[].charts  # 图表数据
  
  # 品牌元素
  branding:
    - primary_color      # 主色调
    - secondary_color    # 辅色调
    - logo_url           # Logo图片URL
    - watermark          # 水印文字
```

---

## 三、数据注入方式

### 3.1 注入管道

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   数据源        │     │   数据转换层     │     │   模板渲染      │
│                 │     │                 │     │                 │
│  PostgreSQL     │────▶│  DataFetcher    │────▶│  Jinja2 Engine  │
│  (业务数据)      │     │  (ORM查询)       │     │                 │
│                 │     │                 │     │  WeasyPrint     │
│  AI员工输出      │────▶│  DataTransformer│────▶│  python-pptx    │
│  (文本/数据)     │     │  (格式转换)      │     │                 │
│                 │     │                 │     │  HTML输出       │
│  外部API        │────▶│  DataValidator  │────▶│                 │
│  (Stripe等)     │     │  (数据校验)      │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 3.2 数据获取规范

每个报告模板声明所需的数据源和字段：

```yaml
# bmc_template.yaml
data_requirements:
  - source: "company_profile"
    table: "companies"
    fields: ["name", "industry", "founding_date", "mission_statement"]
  
  - source: "bmc_blocks"
    table: "business_model_canvases"
    fields: ["customer_segments", "value_propositions", "channels", "customer_relationships", "revenue_streams", "key_resources", "key_activities", "key_partnerships", "cost_structure"]
  
  - source: "team_info"
    table: "ai_employees"
    fields: ["codename", "role", "kpi_status"]
    filter: "company_id = {{ company_id }}"
```

---

## 四、Tools 定义

### 4.1 generate_bmc_pdf — 商业模式画布PDF

生成标准9宫格商业模式画布PDF文档。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "generate_bmc_pdf_input",
  "required": ["company_id"],
  "properties": {
    "company_id": {
      "type": "string",
      "description": "公司唯一标识"
    },
    "bmc_data": {
      "type": "object",
      "description": "BMC 9宫格数据（如不提供则从数据库获取）",
      "properties": {
        "customer_segments": { "type": "string" },
        "value_propositions": { "type": "string" },
        "channels": { "type": "string" },
        "customer_relationships": { "type": "string" },
        "revenue_streams": { "type": "string" },
        "key_resources": { "type": "string" },
        "key_activities": { "type": "string" },
        "key_partnerships": { "type": "string" },
        "cost_structure": { "type": "string" }
      }
    },
    "layout": {
      "type": "string",
      "enum": ["standard", "lean", "detailed"],
      "default": "standard",
      "description": "布局风格"
    },
    "include_assumptions": {
      "type": "boolean",
      "default": true,
      "description": "是否包含关键假设清单"
    },
    "include_validation": {
      "type": "boolean",
      "default": true,
      "description": "是否包含验证状态标记"
    },
    "language": {
      "type": "string",
      "enum": ["zh", "en"],
      "default": "zh"
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "generate_bmc_pdf_output",
  "required": ["report_id", "download_url", "format"],
  "properties": {
    "report_id": { "type": "string" },
    "download_url": { "type": "string", "format": "uri" },
    "preview_url": { "type": "string", "format": "uri", "description": "在线预览链接" },
    "format": { "type": "string", "enum": ["pdf"] },
    "page_count": { "type": "integer" },
    "file_size_bytes": { "type": "integer" },
    "generated_at": { "type": "string", "format": "date-time" },
    "sections_generated": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

---

### 4.2 generate_pitch_deck — 路演PPT

生成投资者路演演示文稿。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "generate_pitch_deck_input",
  "required": ["company_id"],
  "properties": {
    "company_id": { "type": "string" },
    "deck_data": {
      "type": "object",
      "description": "路演数据（如不提供则从数据库获取）",
      "properties": {
        "problem": { "type": "string" },
        "solution": { "type": "string" },
        "market_size": { "type": "string" },
        "product": { "type": "string" },
        "traction": { "type": "string" },
        "business_model": { "type": "string" },
        "competition": { "type": "string" },
        "team": { "type": "string" },
        "financials": { "type": "string" },
        "ask": { "type": "string" }
      }
    },
    "slide_count": {
      "type": "integer",
      "minimum": 5,
      "maximum": 20,
      "default": 12
    },
    "theme": {
      "type": "string",
      "enum": ["minimal", "bold", "gradient", "corporate", "playful"],
      "default": "minimal"
    },
    "include_charts": {
      "type": "boolean",
      "default": true
    },
    "language": {
      "type": "string",
      "enum": ["zh", "en"],
      "default": "zh"
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "generate_pitch_deck_output",
  "required": ["report_id", "download_url", "format"],
  "properties": {
    "report_id": { "type": "string" },
    "download_url": { "type": "string", "format": "uri" },
    "format": { "type": "string", "enum": ["pptx", "pdf"] },
    "slide_count": { "type": "integer" },
    "file_size_bytes": { "type": "integer" },
    "generated_at": { "type": "string", "format": "date-time" },
    "slides": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "slide_number": { "type": "integer" },
          "title": { "type": "string" },
          "layout": { "type": "string" }
        }
      }
    }
  }
}
```

---

### 4.3 generate_finance_report — 财务报告

生成包含收支、现金流和预测的财务报告。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "generate_finance_report_input",
  "required": ["company_id"],
  "properties": {
    "company_id": { "type": "string" },
    "report_period": {
      "type": "object",
      "required": ["start", "end"],
      "properties": {
        "start": { "type": "string", "format": "date" },
        "end": { "type": "string", "format": "date" }
      }
    },
    "report_type": {
      "type": "string",
      "enum": ["income_statement", "cash_flow", "balance_sheet", "full"],
      "default": "full"
    },
    "include_forecast": {
      "type": "boolean",
      "default": false,
      "description": "是否包含未来3个月预测"
    },
    "currency": {
      "type": "string",
      "enum": ["CNY", "USD"],
      "default": "CNY"
    },
    "language": {
      "type": "string",
      "enum": ["zh", "en"],
      "default": "zh"
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "generate_finance_report_output",
  "required": ["report_id", "download_url"],
  "properties": {
    "report_id": { "type": "string" },
    "download_url": { "type": "string", "format": "uri" },
    "format": { "type": "string", "enum": ["pdf", "xlsx"] },
    "generated_at": { "type": "string", "format": "date-time" },
    "summary": {
      "type": "object",
      "properties": {
        "total_revenue": { "type": "number" },
        "total_expenses": { "type": "number" },
        "net_profit": { "type": "number" },
        "cash_balance": { "type": "number" },
        "burn_rate_monthly": { "type": "number" }
      }
    },
    "charts_generated": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

---

### 4.4 generate_weekly_summary — 周度总结

生成 AI 员工团队的工作周报。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "generate_weekly_summary_input",
  "required": ["company_id", "week_start"],
  "properties": {
    "company_id": { "type": "string" },
    "week_start": {
      "type": "string",
      "format": "date",
      "description": "周报起始日期（周一）"
    },
    "include_ai_employees": {
      "type": "array",
      "description": "指定包含的AI员工，空则包含全部",
      "items": { "type": "string" },
      "default": []
    },
    "sections": {
      "type": "array",
      "description": "周报包含的章节",
      "items": {
        "type": "string",
        "enum": ["tasks_completed", "milestones", "challenges", "next_week_plan", "kpi_progress", "learning_points"]
      },
      "default": ["tasks_completed", "milestones", "challenges", "next_week_plan"]
    },
    "format": {
      "type": "string",
      "enum": ["pdf", "html", "markdown"],
      "default": "pdf"
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "generate_weekly_summary_output",
  "required": ["report_id", "download_url"],
  "properties": {
    "report_id": { "type": "string" },
    "download_url": { "type": "string", "format": "uri" },
    "format": { "type": "string", "enum": ["pdf", "html", "markdown"] },
    "generated_at": { "type": "string", "format": "date-time" },
    "week_covered": {
      "type": "object",
      "properties": {
        "start": { "type": "string", "format": "date" },
        "end": { "type": "string", "format": "date" }
      }
    },
    "highlights": {
      "type": "array",
      "items": { "type": "string" },
      "description": "本周亮点摘要"
    }
  }
}
```

---

## 五、错误码汇总

| 错误码 | 名称 | 描述 |
|--------|------|------|
| `RPT-0000` | `SUCCESS` | 生成成功 |
| `RPT-1001` | `DATA_INSUFFICIENT` | 数据不足，无法生成完整报告 |
| `RPT-1002` | `TEMPLATE_NOT_FOUND` | 指定模板不存在 |
| `RPT-1003` | `RENDER_ERROR` | 模板渲染失败 |
| `RPT-1004` | `STORAGE_ERROR` | 文件存储失败 |
| `RPT-2001` | `COMPANY_NOT_FOUND` | 公司ID不存在 |
| `RPT-5001` | `INTERNAL_ERROR` | 内部错误 |

---

## 六、附录

### 6.1 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `OPC_REPORT_TEMPLATES_PATH` | `./templates` | 模板文件路径 |
| `OPC_REPORT_OUTPUT_BUCKET` | `OPC-reports` | 文件存储桶名 |
| `OPC_REPORT_PORT` | `8085` | MCP Server 端口 |

### 6.2 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v0.1 | 2026-05-17 | 初稿，定义4个tools及模板引擎架构 |
