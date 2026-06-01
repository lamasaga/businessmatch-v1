# OPC API 接口完整规格

> **文档定位**：OPC 模块全部 REST API 端点的 OpenAPI 3.0 风格规格定义，涵盖请求/响应 Schema、认证、限流与错误处理。
>
> **关联文档**：`01-完整数据库Schema.md`、`04-技术栈选型与实现路线.md`
>
> **最后更新**：2026-05-17
>
> **基础 URL**：`https://api.OPC.edu/v1`
> **API 前缀**：`/api/v1/opc`

---

## 一、通用规范

### 1.1 认证与授权

| 项目 | 说明 |
|------|------|
| 认证方式 | JWT Bearer Token（复用现有平台认证体系） |
| Token 位置 | `Authorization: Bearer <token>` |
| 权限模型 | RBAC + 资源所有权校验 |
| Token 有效期 | Access Token 15分钟，Refresh Token 7天 |

### 1.2 请求/响应格式

- 请求 Body 统一为 `application/json`
- 响应统一包装：
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "per_page": 20, "total": 100 },
  "error": null
}
```

### 1.3 错误响应标准

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      { "field": "name", "message": "公司名称不能为空" }
    ],
    "request_id": "req_abc123xyz"
  }
}
```

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 400 | `VALIDATION_ERROR` | 参数验证失败 |
| 401 | `UNAUTHORIZED` | 未提供有效 Token |
| 403 | `FORBIDDEN` | 无权访问该资源 |
| 404 | `NOT_FOUND` | 资源不存在 |
| 409 | `CONFLICT` | 资源冲突（如 slug 已存在） |
| 429 | `RATE_LIMITED` | 请求频率超限 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |
| 503 | `SERVICE_UNAVAILABLE` | 依赖服务暂不可用 |

### 1.4 速率限制

| 端点类别 | 限制策略 | 响应头 |
|---------|---------|--------|
| 读操作 (GET) | 100次/分钟/用户 | `X-RateLimit-Limit`, `X-RateLimit-Remaining` |
| 写操作 (POST/PATCH/DELETE) | 30次/分钟/用户 | 同上 |
| MCP 调用 | 20次/分钟/公司 | 同上 + MCP 专属配额头 |
| 报告生成 | 5次/小时/公司 | 同上 |

### 1.5 分页规范

所有列表接口统一使用 Cursor/Offset 混合分页：

```yaml
Query:
  page: integer   # 页码，从 1 开始，默认 1
  per_page: integer  # 每页条数，默认 20，最大 100
  
Response Meta:
  page: integer
  per_page: integer
  total: integer
  total_pages: integer
  has_next: boolean
  has_prev: boolean
```

### 1.6 排序与过滤

```yaml
Query:
  sort: string    # 排序字段，如 "-created_at" 表示倒序
  filter[field]: string  # 字段过滤，如 "filter[status]=active"
  search: string  # 全文搜索关键词
```

---

## 二、公司管理 (/api/v1/opc/companies/*)

### 2.1 创建公司

```yaml
POST /api/v1/opc/companies
认证: 必填 (JWT)
速率限制: 写操作级别

Request Body:
  type: object
  required: [name, mode]
  properties:
    name:
      type: string
      minLength: 2
      maxLength: 100
      description: 公司名称
      example: "绿洲科技"
    slug:
      type: string
      minLength: 3
      maxLength: 100
      pattern: "^[a-z0-9-]+$"
      description: URL 友好标识，不填则自动生成
      example: "oasis-tech"
    tagline:
      type: string
      maxLength: 255
      description: 公司标语
      example: "让每个学生都能创业"
    mode:
      type: string
      enum: [simulation, real, competition]
      description: 创业模式
      example: "simulation"
    industry:
      type: string
      maxLength: 50
      description: 行业分类
      example: "教育科技"
    business_model_canvas:
      type: object
      description: 初始 BMC 数据（可选）
      properties:
        customer_segments: { type: string }
        value_propositions: { type: string }
        # ... 其余 7 个格子

Response 201:
  data:
    type: object
    properties:
      id: { type: string, format: uuid }
      name: { type: string }
      slug: { type: string }
      stage: { type: string, enum: [IDEATE, VALIDATE, BUILD, LAUNCH, SCALE, ARCHIVED] }
      mode: { type: string }
      status: { type: string }
      created_at: { type: string, format: date-time }
      # ... 完整 Company 对象

Response 409:
  error:
    code: "CONFLICT"
    message: "公司名称或 slug 已存在"
```

### 2.2 获取公司列表

```yaml
GET /api/v1/opc/companies
认证: 必填 (JWT)
速率限制: 读操作级别

Query Parameters:
  page: { type: integer, default: 1 }
  per_page: { type: integer, default: 20, maximum: 100 }
  sort: { type: string, default: "-created_at", enum: ["created_at", "-created_at", "name", "-total_revenue"] }
  filter[stage]: { type: string, description: "按阶段过滤" }
  filter[status]: { type: string, enum: [active, paused, archived] }
  filter[mode]: { type: string, enum: [simulation, real, competition] }
  search: { type: string, description: "搜索公司名称/标语" }

Response 200:
  data:
    type: array
    items:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        slug: { type: string }
        stage: { type: string }
        mode: { type: string }
        status: { type: string }
        total_revenue: { type: number }
        total_cost: { type: number }
        employee_count: { type: integer }
        task_count: { type: integer }
        created_at: { type: string, format: date-time }
  meta:
    page: { type: integer }
    per_page: { type: integer }
    total: { type: integer }
    total_pages: { type: integer }
    has_next: { type: boolean }
    has_prev: { type: boolean }
```

### 2.3 获取公司详情

```yaml
GET /api/v1/opc/companies/{company_id}
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  company_id: { type: string, format: uuid, description: "公司 ID" }

Query Parameters:
  include: { type: string, description: "关联数据，逗号分隔：employees,tasks,sprints,milestones" }

Response 200:
  data:
    type: object
    # 完整 Company 对象 + include 指定的关联数据
    properties:
      id: { type: string }
      name: { type: string }
      slug: { type: string }
      stage: { type: string }
      mode: { type: string }
      status: { type: string }
      business_model_canvas: { type: object }
      brand_config: { type: object }
      total_revenue: { type: number }
      total_cost: { type: number }
      net_profit: { type: number }
      employee_count: { type: integer }
      task_count: { type: integer }
      completed_task_count: { type: integer }
      launched_at: { type: string, format: date-time, nullable: true }
      created_at: { type: string, format: date-time }
      updated_at: { type: string, format: date-time }
      employees: { type: array, description: "当 include=employees 时返回" }
      tasks: { type: array, description: "当 include=tasks 时返回" }
      sprints: { type: array, description: "当 include=sprints 时返回" }

Response 404:
  error:
    code: "NOT_FOUND"
    message: "公司不存在或无权访问"
```

### 2.4 更新公司信息

```yaml
PATCH /api/v1/opc/companies/{company_id}
认证: 必填 (JWT)
速率限制: 写操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Request Body:
  type: object
  properties:
    name:
      type: string
      minLength: 2
      maxLength: 100
    tagline:
      type: string
      maxLength: 255
    business_model_canvas:
      type: object
      description: "BMC 数据，部分更新"
    brand_config:
      type: object
      description: "品牌配置"
    industry:
      type: string
      maxLength: 50
    target_audience:
      type: array
      items: { type: object }

Response 200:
  data:
    type: object
    description: "更新后的完整 Company 对象"

Response 403:
  error:
    code: "FORBIDDEN"
    message: "只有公司所有者可以修改"
```

### 2.5 归档/删除公司

```yaml
DELETE /api/v1/opc/companies/{company_id}
认证: 必填 (JWT)
速率限制: 写操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Query Parameters:
  hard: { type: boolean, default: false, description: "是否物理删除（仅管理员）" }

Response 200:
  data:
    type: object
    properties:
      id: { type: string }
      status: { type: string, enum: [archived] }
      archived_at: { type: string, format: date-time }

Response 403:
  error:
    code: "FORBIDDEN"
    message: "无权归档此公司"
```

### 2.6 获取公司仪表盘数据

```yaml
GET /api/v1/opc/companies/{company_id}/dashboard
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Response 200:
  data:
    type: object
    properties:
      company:
        type: object
        description: "公司基础信息"
      stats:
        type: object
        properties:
          active_tasks: { type: integer }
          pending_reviews: { type: integer }
          current_sprint_progress: { type: number, description: "0-100" }
          weekly_revenue: { type: number }
          weekly_cost: { type: number }
          employee_utilization: { type: number, description: "员工利用率 0-100" }
      recent_activities:
        type: array
        items:
          type: object
          properties:
            type: { type: string, enum: [task, review, finance, milestone] }
            title: { type: string }
            timestamp: { type: string, format: date-time }
      upcoming_deadlines:
        type: array
        items:
          type: object
          properties:
            task_id: { type: string }
            title: { type: string }
            deadline_at: { type: string, format: date-time }
            days_remaining: { type: integer }
```

---

## 三、AI 员工管理 (/api/v1/opc/employees/*)

### 3.1 获取员工列表

```yaml
GET /api/v1/opc/companies/{company_id}/employees
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Query Parameters:
  page: { type: integer, default: 1 }
  per_page: { type: integer, default: 20 }
  filter[role_type]: { type: string, enum: [strategist, worker, advisor, scout] }
  filter[status]: { type: string, enum: [idle, busy, offline, upgrading, error] }
  filter[level_min]: { type: integer, minimum: 1, maximum: 10 }
  sort: { type: string, default: "-level", enum: ["level", "-level", "created_at", "-created_at", "tasks_completed", "-tasks_completed"] }

Response 200:
  data:
    type: array
    items:
      type: object
      properties:
        id: { type: string }
        codename: { type: string }
        display_name: { type: string }
        role_type: { type: string }
        avatar_emoji: { type: string }
        level: { type: integer }
        experience_points: { type: integer }
        status: { type: string }
        current_task_id: { type: string, nullable: true }
        tasks_completed: { type: integer }
        satisfaction_score: { type: number }
        hourly_rate: { type: number }
        created_at: { type: string }
```

### 3.2 雇佣新员工

```yaml
POST /api/v1/opc/companies/{company_id}/employees
认证: 必填 (JWT)
速率限制: 写操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Request Body:
  type: object
  required: [role_type]
  properties:
    role_type:
      type: string
      enum: [strategist, worker, advisor, scout]
      description: "员工角色类型"
    display_name:
      type: string
      maxLength: 50
      description: "自定义昵称"
      example: "代码小助手"
    personality_preset:
      type: string
      enum: [default, aggressive, cautious, creative, analytical]
      default: "default"
      description: "性格预设模板"
    initial_skills:
      type: array
      description: "初始技能（可选，默认根据角色分配）"
      items:
        type: object
        properties:
          skill_name: { type: string }
          level: { type: integer, minimum: 1, maximum: 5 }
    mcp_tools:
      type: array
      description: "授权的工具列表"
      items: { type: string }

Response 201:
  data:
    type: object
    properties:
      id: { type: string }
      codename: { type: string }
      display_name: { type: string }
      role_type: { type: string }
      level: { type: integer }
      skills: { type: array }
      mcp_tools: { type: array }
      personality_prompt: { type: string }
      status: { type: string }
      created_at: { type: string }

Response 403:
  error:
    code: "FORBIDDEN"
    message: "已达到当前阶段员工数量上限"
```

### 3.3 获取员工详情

```yaml
GET /api/v1/opc/employees/{employee_id}
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  employee_id: { type: string, format: uuid }

Query Parameters:
  include: { type: string, description: "skills,performances,current_task,recent_tasks" }
  task_limit: { type: integer, default: 5, description: "最近任务数量" }

Response 200:
  data:
    type: object
    properties:
      id: { type: string }
      codename: { type: string }
      display_name: { type: string }
      role_type: { type: string }
      avatar_emoji: { type: string }
      level: { type: integer }
      experience_points: { type: integer }
      skills: { type: array }
      skill_tree: { type: object }
      mcp_tools: { type: array }
      personality_prompt: { type: string }
      memory_summary: { type: string }
      status: { type: string }
      current_task_id: { type: string }
      tasks_completed: { type: integer }
      tasks_rejected: { type: integer }
      avg_task_score: { type: number }
      satisfaction_score: { type: number }
      hourly_rate: { type: number }
      total_cost_generated: { type: number }
      hired_at: { type: string }
      created_at: { type: string }
      skills_detail: { type: array, description: "当 include=skills 时返回" }
      performances: { type: array, description: "当 include=performances 时返回" }
      current_task: { type: object, description: "当 include=current_task 时返回" }
      recent_tasks: { type: array, description: "当 include=recent_tasks 时返回" }
```

### 3.4 更新员工信息

```yaml
PATCH /api/v1/opc/employees/{employee_id}
认证: 必填 (JWT)
速率限制: 写操作级别

Path Parameters:
  employee_id: { type: string, format: uuid }

Request Body:
  type: object
  properties:
    display_name:
      type: string
      maxLength: 50
    avatar_emoji:
      type: string
      maxLength: 10
    personality_prompt:
      type: string
      maxLength: 5000
      description: "自定义角色设定 Prompt"
    mcp_tools:
      type: array
      items: { type: string }
    hourly_rate:
      type: number
      minimum: 0
      description: "模拟时薪"
    status:
      type: string
      enum: [idle, offline]
      description: "只能切换到 idle 或 offline"

Response 200:
  data:
    type: object
    description: "更新后的完整 Employee 对象"
```

### 3.5 升级员工技能

```yaml
POST /api/v1/opc/employees/{employee_id}/skills/upgrade
认证: 必填 (JWT)
速率限制: 写操作级别

Path Parameters:
  employee_id: { type: string, format: uuid }

Request Body:
  type: object
  required: [skill_name]
  properties:
    skill_name:
      type: string
      description: "要升级的技能名称"
    use_xp:
      type: boolean
      default: true
      description: "是否使用经验值升级"

Response 200:
  data:
    type: object
    properties:
      employee_id: { type: string }
      skill_name: { type: string }
      old_level: { type: integer }
      new_level: { type: integer }
      experience_points_remaining: { type: integer }
      upgrade_cost: { type: integer }

Response 400:
  error:
    code: "VALIDATION_ERROR"
    message: "经验值不足以升级此技能"
```

### 3.6 解雇员工

```yaml
DELETE /api/v1/opc/employees/{employee_id}
认证: 必填 (JWT)
速率限制: 写操作级别

Path Parameters:
  employee_id: { type: string, format: uuid }

Query Parameters:
  transfer_tasks_to: { type: string, format: uuid, description: "将未完成任务转给其他员工" }

Response 200:
  data:
    type: object
    properties:
      id: { type: string }
      status: { type: string, enum: [fired] }
      fired_at: { type: string, format: date-time }
      transferred_tasks: { type: integer }
```

---

## 四、任务管理 (/api/v1/opc/tasks/*)

### 4.1 创建任务

```yaml
POST /api/v1/opc/companies/{company_id}/tasks
认证: 必填 (JWT)
速率限制: 写操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Request Body:
  type: object
  required: [title, task_type]
  properties:
    title:
      type: string
      minLength: 2
      maxLength: 200
      example: "设计着陆页原型"
    description:
      type: string
      maxLength: 5000
      example: "为新产品设计一个高转化率的着陆页"
    task_type:
      type: string
      enum: [code, design, copy, research, analysis, marketing, legal, finance, review, custom]
    priority:
      type: string
      enum: [low, medium, high, urgent]
      default: "medium"
    employee_id:
      type: string
      format: uuid
      description: "指派员工，不填则进入待分配池"
    sprint_id:
      type: string
      format: uuid
      description: "所属 Sprint"
    milestone_id:
      type: string
      format: uuid
      description: "关联里程碑"
    parent_task_id:
      type: string
      format: uuid
      description: "父任务 ID（子任务）"
    requirements:
      type: object
      description: "结构化需求"
      example:
        output_format: "figma"
        target_audience: "大学生"
        style_guide: "minimalist"
    acceptance_criteria:
      type: array
      items: { type: string }
      example: ["包含 Hero 区域", "有 CTA 按钮", "移动端适配"]
    estimated_hours:
      type: number
      minimum: 0.5
      maximum: 999
    deadline_at:
      type: string
      format: date-time
      description: "截止日期"

Response 201:
  data:
    type: object
    properties:
      id: { type: string }
      title: { type: string }
      task_type: { type: string }
      priority: { type: string }
      status: { type: string, enum: [pending] }
      employee_id: { type: string, nullable: true }
      sprint_id: { type: string, nullable: true }
      requirements: { type: object }
      estimated_hours: { type: number }
      deadline_at: { type: string }
      created_at: { type: string }

Response 400:
  error:
    code: "VALIDATION_ERROR"
    message: "指派的员工不属于该公司或当前不可用"
```

### 4.2 分配任务给员工

```yaml
POST /api/v1/opc/tasks/{task_id}/assign
认证: 必填 (JWT)
速率限制: 写操作级别

Path Parameters:
  task_id: { type: string, format: uuid }

Request Body:
  type: object
  required: [employee_id]
  properties:
    employee_id:
      type: string
      format: uuid
    auto_start:
      type: boolean
      default: false
      description: "分配后是否立即开始执行"

Response 200:
  data:
    type: object
    properties:
      id: { type: string }
      employee_id: { type: string }
      status: { type: string }
      assigned_at: { type: string }

Response 409:
  error:
    code: "CONFLICT"
    message: "员工当前状态为 busy，无法分配新任务"
```

### 4.3 获取任务详情

```yaml
GET /api/v1/opc/tasks/{task_id}
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  task_id: { type: string, format: uuid }

Query Parameters:
  include: { type: string, description: "employee,deliverables,sprint,milestone,subtasks" }

Response 200:
  data:
    type: object
    properties:
      id: { type: string }
      title: { type: string }
      description: { type: string }
      task_type: { type: string }
      priority: { type: string }
      status: { type: string }
      requirements: { type: object }
      acceptance_criteria: { type: array }
      deliverables: { type: array }
      estimated_hours: { type: number }
      actual_hours: { type: number }
      cost_simulated: { type: number }
      student_review: { type: string }
      student_rating: { type: integer }
      review_decision: { type: string }
      execution_summary: { type: string }
      error_log: { type: string }
      started_at: { type: string }
      completed_at: { type: string }
      reviewed_at: { type: string }
      deadline_at: { type: string }
      created_at: { type: string }
      updated_at: { type: string }
      employee: { type: object }
      sprint: { type: object }
      milestone: { type: object }
      subtasks: { type: array }
      deliverable_list: { type: array }
```

### 4.4 获取任务列表

```yaml
GET /api/v1/opc/companies/{company_id}/tasks
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Query Parameters:
  page: { type: integer, default: 1 }
  per_page: { type: integer, default: 20 }
  filter[status]: { type: string, enum: [pending, in_progress, review, completed, rejected, cancelled] }
  filter[task_type]: { type: string }
  filter[employee_id]: { type: string, format: uuid }
  filter[sprint_id]: { type: string, format: uuid }
  filter[priority]: { type: string, enum: [low, medium, high, urgent] }
  filter[overdue]: { type: boolean, description: "是否只显示逾期任务" }
  sort: { type: string, default: "-created_at", enum: ["created_at", "-created_at", "deadline_at", "priority"] }

Response 200:
  data:
    type: array
    items:
      type: object
      properties:
        id: { type: string }
        title: { type: string }
        task_type: { type: string }
        priority: { type: string }
        status: { type: string }
        employee_id: { type: string }
        sprint_id: { type: string }
        deadline_at: { type: string }
        created_at: { type: string }
  meta: { type: object }
```

### 4.5 更新任务

```yaml
PATCH /api/v1/opc/tasks/{task_id}
认证: 必填 (JWT)
速率限制: 写操作级别

Path Parameters:
  task_id: { type: string, format: uuid }

Request Body:
  type: object
  properties:
    title: { type: string, maxLength: 200 }
    description: { type: string, maxLength: 5000 }
    priority: { type: string, enum: [low, medium, high, urgent] }
    requirements: { type: object }
    acceptance_criteria: { type: array, items: { type: string } }
    estimated_hours: { type: number, minimum: 0.5 }
    deadline_at: { type: string, format: date-time }
    status:
      type: string
      enum: [cancelled]
      description: "用户只能取消任务，其他状态由系统管理"

Response 200:
  data:
    type: object
    description: "更新后的 Task 对象"

Response 403:
  error:
    code: "FORBIDDEN"
    message: "任务已处于执行中状态，无法修改"
```

### 4.6 学生验收任务

```yaml
POST /api/v1/opc/tasks/{task_id}/review
认证: 必填 (JWT)
速率限制: 写操作级别

Path Parameters:
  task_id: { type: string, format: uuid }

Request Body:
  type: object
  required: [decision]
  properties:
    decision:
      type: string
      enum: [approved, rejected, needs_revision]
      description: "验收决定"
    rating:
      type: integer
      minimum: 1
      maximum: 5
      description: "任务评分"
    review:
      type: string
      maxLength: 2000
      description: "验收评语"
    revision_requirements:
      type: string
      maxLength: 2000
      description: "如需修改，说明修改要求"

Response 200:
  data:
    type: object
    properties:
      id: { type: string }
      status: { type: string }
      review_decision: { type: string }
      student_rating: { type: integer }
      student_review: { type: string }
      reviewed_at: { type: string }
      employee:
        type: object
        properties:
          id: { type: string }
          tasks_completed: { type: integer }
          avg_task_score: { type: number }

Response 400:
  error:
    code: "VALIDATION_ERROR"
    message: "任务尚未提交审核，无法验收"
```

### 4.7 获取任务执行日志

```yaml
GET /api/v1/opc/tasks/{task_id}/logs
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  task_id: { type: string, format: uuid }

Query Parameters:
  page: { type: integer, default: 1 }
  per_page: { type: integer, default: 50 }
  type: { type: string, enum: [all, mcp, llm, system, error], default: "all" }

Response 200:
  data:
    type: array
    items:
      type: object
      properties:
        timestamp: { type: string }
        type: { type: string }
        level: { type: string, enum: [info, warning, error, debug] }
        message: { type: string }
        metadata: { type: object }
```

---

## 五、流水线管理 (/api/v1/opc/pipeline/*)

### 5.1 创建 Sprint

```yaml
POST /api/v1/opc/companies/{company_id}/sprints
认证: 必填 (JWT)
速率限制: 写操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Request Body:
  type: object
  required: [name, start_date, end_date]
  properties:
    name:
      type: string
      minLength: 2
      maxLength: 100
      example: "Sprint 1 - 创意验证"
    goal:
      type: string
      maxLength: 1000
      example: "完成 BMC 设计并通过第一次 Gateway Review"
    stage:
      type: string
      enum: [IDEATE, VALIDATE, BUILD, LAUNCH, SCALE]
      description: "不填则继承公司当前阶段"
    start_date:
      type: string
      format: date
      example: "2026-06-01"
    end_date:
      type: string
      format: date
      example: "2026-06-14"

Response 201:
  data:
    type: object
    properties:
      id: { type: string }
      name: { type: string }
      goal: { type: string }
      stage: { type: string }
      status: { type: string, enum: [planning] }
      start_date: { type: string }
      end_date: { type: string }
      created_at: { type: string }

Response 400:
  error:
    code: "VALIDATION_ERROR"
    message: "end_date 必须晚于 start_date"
```

### 5.2 获取 Sprint 列表

```yaml
GET /api/v1/opc/companies/{company_id}/sprints
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Query Parameters:
  page: { type: integer, default: 1 }
  per_page: { type: integer, default: 20 }
  filter[status]: { type: string, enum: [planning, active, review, completed, cancelled] }
  filter[stage]: { type: string }
  sort: { type: string, default: "-start_date" }

Response 200:
  data:
    type: array
    items:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        goal: { type: string }
        stage: { type: string }
        status: { type: string }
        planned_tasks: { type: integer }
        completed_tasks: { type: integer }
        start_date: { type: string }
        end_date: { type: string }
        actual_end_date: { type: string }
        progress_percentage: { type: number }
        created_at: { type: string }
```

### 5.3 更新 Sprint 状态

```yaml
PATCH /api/v1/opc/sprints/{sprint_id}
认证: 必填 (JWT)
速率限制: 写操作级别

Path Parameters:
  sprint_id: { type: string, format: uuid }

Request Body:
  type: object
  properties:
    status:
      type: string
      enum: [active, review, completed, cancelled]
    goal: { type: string, maxLength: 1000 }
    end_date: { type: string, format: date }
    retrospective:
      type: object
      description: "Sprint 复盘数据"
      properties:
        what_went_well: { type: array, items: { type: string } }
        what_to_improve: { type: array, items: { type: string } }
        action_items: { type: array, items: { type: string } }

Response 200:
  data:
    type: object
    description: "更新后的 Sprint 对象"
```

### 5.4 提交阶段评审

```yaml
POST /api/v1/opc/companies/{company_id}/gateway-reviews
认证: 必填 (JWT)
速率限制: 写操作级别（限 5次/小时）

Path Parameters:
  company_id: { type: string, format: uuid }

Request Body:
  type: object
  required: [stage]
  properties:
    stage:
      type: string
      enum: [IDEATE, VALIDATE, BUILD, LAUNCH, SCALE]
    milestone_id:
      type: string
      format: uuid
      description: "关联里程碑"
    submit_data:
      type: object
      description: "提交评审的材料"
      properties:
        deliverable_ids: { type: array, items: { type: string } }
        notes: { type: string }

Response 202:
  data:
    type: object
    properties:
      review_id: { type: string }
      status: { type: string, enum: [pending] }
      estimated_completion: { type: string, description: "预计评审完成时间" }
      message: { type: string, example: "AI 评审面板已接收申请，预计 5 分钟内完成评审" }

Response 400:
  error:
    code: "VALIDATION_ERROR"
    message: "该阶段尚有未完成的里程碑"
```

### 5.5 获取评审历史

```yaml
GET /api/v1/opc/companies/{company_id}/gateway-reviews
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Query Parameters:
  page: { type: integer, default: 1 }
  per_page: { type: integer, default: 20 }
  filter[stage]: { type: string }
  filter[decision]: { type: string, enum: [pass, conditional, fail] }

Response 200:
  data:
    type: array
    items:
      type: object
      properties:
        id: { type: string }
        stage: { type: string }
        reviewer_type: { type: string }
        review_data: { type: object }
        overall_score: { type: number }
        decision: { type: string }
        feedback: { type: string }
        action_items: { type: array }
        student_response: { type: string }
        reviewed_at: { type: string }
        effective_until: { type: string }
```

### 5.6 获取里程碑列表

```yaml
GET /api/v1/opc/companies/{company_id}/milestones
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Query Parameters:
  filter[stage]: { type: string }
  filter[status]: { type: string }

Response 200:
  data:
    type: array
    items:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        description: { type: string }
        stage: { type: string }
        criteria: { type: array }
        status: { type: string }
        progress: { type: number, description: "0-100 完成度" }
        xp_reward: { type: integer }
        badge_id: { type: string }
        deadline_at: { type: string }
```

---

## 六、财务管理 (/api/v1/opc/finance/*)

### 6.1 记账

```yaml
POST /api/v1/opc/companies/{company_id}/finance/records
认证: 必填 (JWT)
速率限制: 写操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Request Body:
  type: object
  required: [record_type, category, amount]
  properties:
    record_type:
      type: string
      enum: [revenue, cost]
    category:
      type: string
      description: "revenue: product_sales, service_fee, subscription, investment, other / cost: salary, tool_subscription, hosting, marketing, legal, other"
    amount:
      type: number
      minimum: 0
    currency:
      type: string
      default: "CNY"
    exchange_rate:
      type: number
      default: 1.0
    is_real_money:
      type: boolean
      default: false
    payment_method:
      type: string
      maxLength: 30
    description:
      type: string
      maxLength: 1000
    attachments:
      type: array
      items:
        type: object
        properties:
          name: { type: string }
          url: { type: string }
          mime_type: { type: string }
    related_task_id:
      type: string
      format: uuid
    related_employee_id:
      type: string
      format: uuid
    recorded_at:
      type: string
      format: date-time
      description: "交易发生时间，默认当前时间"

Response 201:
  data:
    type: object
    properties:
      id: { type: string }
      record_type: { type: string }
      category: { type: string }
      amount: { type: number }
      currency: { type: string }
      amount_cny: { type: number }
      is_real_money: { type: boolean }
      description: { type: string }
      recorded_at: { type: string }
      created_at: { type: string }

Response 400:
  error:
    code: "VALIDATION_ERROR"
    message: "真实资金交易需要补充支付凭证"
```

### 6.2 获取财务报表

```yaml
GET /api/v1/opc/companies/{company_id}/finance
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Query Parameters:
  period: { type: string, enum: [daily, weekly, monthly, quarterly, yearly, all], default: "monthly" }
  start_date: { type: string, format: date }
  end_date: { type: string, format: date }
  group_by: { type: string, enum: [category, date, employee], default: "category" }

Response 200:
  data:
    type: object
    properties:
      summary:
        type: object
        properties:
          total_revenue: { type: number }
          total_cost: { type: number }
          net_profit: { type: number }
          profit_margin: { type: number }
          real_revenue: { type: number }
          real_cost: { type: number }
          simulation_revenue: { type: number }
          simulation_cost: { type: number }
      breakdown:
        type: array
        description: "按 group_by 参数分组的数据"
        items:
          type: object
          properties:
            group_key: { type: string }
            revenue: { type: number }
            cost: { type: number }
            net: { type: number }
            count: { type: integer }
      trend:
        type: array
        description: "时间序列趋势数据"
        items:
          type: object
          properties:
            period: { type: string }
            revenue: { type: number }
            cost: { type: number }
            net: { type: number }
      top_costs:
        type: array
        description: "最大支出项"
        items:
          type: object
          properties:
            category: { type: string }
            amount: { type: number }
            percentage: { type: number }
```

### 6.3 获取财务记录列表

```yaml
GET /api/v1/opc/companies/{company_id}/finance/records
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Query Parameters:
  page: { type: integer, default: 1 }
  per_page: { type: integer, default: 20 }
  filter[record_type]: { type: string, enum: [revenue, cost] }
  filter[category]: { type: string }
  filter[is_real_money]: { type: boolean }
  filter[start_date]: { type: string, format: date }
  filter[end_date]: { type: string, format: date }
  sort: { type: string, default: "-recorded_at" }

Response 200:
  data:
    type: array
    items:
      type: object
      properties:
        id: { type: string }
        record_type: { type: string }
        category: { type: string }
        amount: { type: number }
        currency: { type: string }
        is_real_money: { type: boolean }
        description: { type: string }
        related_task_id: { type: string }
        related_employee_id: { type: string }
        recorded_at: { type: string }
  meta: { type: object }
```

---

## 七、MCP 工具 (/api/v1/opc/mcp/*)

### 7.1 获取可用 MCP 工具列表

```yaml
GET /api/v1/opc/companies/{company_id}/mcp/tools
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Query Parameters:
  filter[category]: { type: string, enum: [search, code, design, deploy, payment, communication, data] }
  available_only: { type: boolean, default: true, description: "仅显示当前套餐可用的工具" }

Response 200:
  data:
    type: array
    items:
      type: object
      properties:
        tool_id: { type: string }
        name: { type: string }
        description: { type: string }
        category: { type: string }
        icon: { type: string }
        version: { type: string }
        is_available: { type: boolean }
        requires_integration: { type: boolean }
        required_integration: { type: string, nullable: true }
        quota_limit: { type: integer, description: "月度调用次数上限，-1=无限制" }
        quota_used: { type: integer }
        cost_per_call: { type: number, description: "预估单次调用成本（USD）" }
        parameters_schema: { type: object, description: "JSON Schema 参数定义" }
```

### 7.2 调用 MCP 工具（调试用）

```yaml
POST /api/v1/opc/companies/{company_id}/mcp/tools/{tool_id}/call
认证: 必填 (JWT)
速率限制: MCP 级别（20次/分钟）

Path Parameters:
  company_id: { type: string, format: uuid }
  tool_id: { type: string, description: "工具标识" }

Request Body:
  type: object
  required: [parameters]
  properties:
    parameters:
      type: object
      description: "工具特定参数，由 parameters_schema 定义"
    employee_id:
      type: string
      format: uuid
      description: "代哪个员工调用"
    task_id:
      type: string
      format: uuid
      description: "关联任务"
    async:
      type: boolean
      default: false
      description: "是否异步执行"

Response 200 (同步):
  data:
    type: object
    properties:
      call_id: { type: string }
      status: { type: string, enum: [success] }
      result: { type: object }
      latency_ms: { type: integer }
      tokens_used: { type: integer }
      cost_usd: { type: number }

Response 202 (异步):
  data:
    type: object
    properties:
      call_id: { type: string }
      status: { type: string, enum: [pending] }
      poll_url: { type: string }
      estimated_duration_ms: { type: integer }

Response 429:
  error:
    code: "RATE_LIMITED"
    message: "MCP 工具调用配额已用完"
    details:
      - { field: "quota", message: "本月已使用 120/120 次" }
      - { field: "reset_at", message: "2026-06-01T00:00:00Z" }
```

### 7.3 获取 MCP 调用结果

```yaml
GET /api/v1/opc/mcp/calls/{call_id}
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  call_id: { type: string, format: uuid }

Response 200:
  data:
    type: object
    properties:
      call_id: { type: string }
      status: { type: string, enum: [pending, running, success, error, timeout] }
      tool_name: { type: string }
      parameters: { type: object }
      result: { type: object }
      error_message: { type: string }
      latency_ms: { type: integer }
      tokens_used: { type: integer }
      cost_usd: { type: number }
      created_at: { type: string }
      completed_at: { type: string }

Response 404:
  error:
    code: "NOT_FOUND"
    message: "调用记录不存在"
```

### 7.4 获取 MCP 调用历史

```yaml
GET /api/v1/opc/companies/{company_id}/mcp/calls
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Query Parameters:
  page: { type: integer, default: 1 }
  per_page: { type: integer, default: 20 }
  filter[tool_name]: { type: string }
  filter[status]: { type: string, enum: [pending, success, error, timeout, rate_limited] }
  filter[employee_id]: { type: string, format: uuid }
  filter[start_date]: { type: string, format: date }
  filter[end_date]: { type: string, format: date }
  sort: { type: string, default: "-created_at" }

Response 200:
  data:
    type: array
    items:
      type: object
      properties:
        id: { type: string }
        tool_name: { type: string }
        status: { type: string }
        latency_ms: { type: integer }
        tokens_used: { type: integer }
        cost_usd: { type: number }
        employee_id: { type: string }
        task_id: { type: string }
        created_at: { type: string }
  meta: { type: object }
```

---

## 八、报告生成 (/api/v1/opc/reports/*)

### 8.1 生成 BMC 报告

```yaml
POST /api/v1/opc/companies/{company_id}/reports/bmc
认证: 必填 (JWT)
速率限制: 报告级别（5次/小时）

Path Parameters:
  company_id: { type: string, format: uuid }

Request Body:
  type: object
  properties:
    format:
      type: string
      enum: [pdf, html, markdown]
      default: "pdf"
    include_ai_suggestions:
      type: boolean
      default: true
      description: "是否包含 AI 改进建议"

Response 202:
  data:
    type: object
    properties:
      report_id: { type: string }
      status: { type: string, enum: [generating] }
      estimated_seconds: { type: integer }
      download_url: { type: string, nullable: true }

Response 200 (缓存命中):
  data:
    type: object
    properties:
      report_id: { type: string }
      status: { type: string, enum: [completed] }
      download_url: { type: string }
      expires_at: { type: string }
      file_size: { type: integer }
```

### 8.2 生成财务报告

```yaml
POST /api/v1/opc/companies/{company_id}/reports/finance
认证: 必填 (JWT)
速率限制: 报告级别（5次/小时）

Path Parameters:
  company_id: { type: string, format: uuid }

Request Body:
  type: object
  properties:
    format:
      type: string
      enum: [pdf, excel, csv]
      default: "pdf"
    period:
      type: string
      enum: [current_month, last_month, current_quarter, ytd, custom]
      default: "current_month"
    start_date:
      type: string
      format: date
    end_date:
      type: string
      format: date
    include_charts:
      type: boolean
      default: true

Response 202:
  data:
    type: object
    properties:
      report_id: { type: string }
      status: { type: string, enum: [generating] }
      estimated_seconds: { type: integer }

Response 200:
  data:
    type: object
    properties:
      report_id: { type: string }
      status: { type: string, enum: [completed] }
      download_url: { type: string }
      summary: { type: object }
```

### 8.3 获取报告生成状态

```yaml
GET /api/v1/opc/reports/{report_id}
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  report_id: { type: string, format: uuid }

Response 200:
  data:
    type: object
    properties:
      id: { type: string }
      report_type: { type: string }
      status: { type: string, enum: [pending, generating, completed, failed] }
      progress: { type: integer, description: "0-100" }
      download_url: { type: string, nullable: true }
      file_size: { type: integer }
      expires_at: { type: string }
      created_at: { type: string }
      completed_at: { type: string }
      error: { type: string, nullable: true }
```

### 8.4 生成 AI 员工绩效报告

```yaml
POST /api/v1/opc/employees/{employee_id}/reports/performance
认证: 必填 (JWT)
速率限制: 报告级别（5次/小时）

Path Parameters:
  employee_id: { type: string, format: uuid }

Request Body:
  type: object
  properties:
    format:
      type: string
      enum: [pdf, html]
      default: "pdf"
    period:
      type: string
      enum: [current_sprint, last_sprint, all_time]
      default: "current_sprint"

Response 202:
  data:
    type: object
    properties:
      report_id: { type: string }
      status: { type: string, enum: [generating] }
      estimated_seconds: { type: integer }
```

---

## 九、市场情报 (/api/v1/opc/intel/*)

### 9.1 获取市场情报列表

```yaml
GET /api/v1/opc/companies/{company_id}/intel
认证: 必填 (JWT)
速率限制: 读操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Query Parameters:
  page: { type: integer, default: 1 }
  per_page: { type: integer, default: 20 }
  filter[intel_type]: { type: string, enum: [competitor, trend, customer_feedback, pricing, regulation, opportunity, threat] }
  filter[is_actioned]: { type: boolean }
  filter[min_relevance]: { type: number, minimum: 0, maximum: 1 }
  sort: { type: string, default: "-relevance_score", enum: ["created_at", "-created_at", "relevance_score", "-relevance_score", "confidence_score", "-confidence_score"] }

Response 200:
  data:
    type: array
    items:
      type: object
      properties:
        id: { type: string }
        intel_type: { type: string }
        title: { type: string }
        content: { type: string }
        source_url: { type: string }
        source_type: { type: string }
        confidence_score: { type: number }
        relevance_score: { type: number }
        tags: { type: array }
        is_actioned: { type: boolean }
        action_summary: { type: string }
        discovered_by: { type: string }
        created_at: { type: string }
        expires_at: { type: string }
  meta: { type: object }
```

### 9.2 创建市场情报（手动录入）

```yaml
POST /api/v1/opc/companies/{company_id}/intel
认证: 必填 (JWT)
速率限制: 写操作级别

Path Parameters:
  company_id: { type: string, format: uuid }

Request Body:
  type: object
  required: [intel_type, title, content]
  properties:
    intel_type:
      type: string
      enum: [competitor, trend, customer_feedback, pricing, regulation, opportunity, threat]
    title:
      type: string
      maxLength: 200
    content:
      type: string
      maxLength: 10000
    source_url:
      type: string
      maxLength: 500
    source_type:
      type: string
      enum: [web_scrape, api_fetch, user_input, ai_analysis, mcp_tool]
      default: "user_input"
    tags:
      type: array
      items: { type: string }
    confidence_score:
      type: number
      minimum: 0
      maximum: 1
    relevance_score:
      type: number
      minimum: 0
      maximum: 1

Response 201:
  data:
    type: object
    properties:
      id: { type: string }
      intel_type: { type: string }
      title: { type: string }
      content: { type: string }
      source_type: { type: string }
      tags: { type: array }
      is_actioned: { type: boolean }
      created_at: { type: string }
```

### 9.3 触发情报收集

```yaml
POST /api/v1/opc/companies/{company_id}/intel/collect
认证: 必填 (JWT)
速率限制: 写操作级别（10次/小时）

Path Parameters:
  company_id: { type: string, format: uuid }

Request Body:
  type: object
  properties:
    focus_areas:
      type: array
      description: "重点关注领域"
      items:
        type: string
        enum: [competitors, pricing, trends, regulations, customers]
    keywords:
      type: array
      description: "搜索关键词"
      items: { type: string }
    scout_employee_id:
      type: string
      format: uuid
      description: "指定 Scout 员工执行"
    depth:
      type: string
      enum: [quick, standard, deep]
      default: "standard"
      description: "收集深度"

Response 202:
  data:
    type: object
    properties:
      job_id: { type: string }
      status: { type: string, enum: [queued] }
      estimated_duration_minutes: { type: integer }
      message: { type: string }
```

### 9.4 标记情报已处理

```yaml
PATCH /api/v1/opc/intel/{intel_id}
认证: 必填 (JWT)
速率限制: 写操作级别

Path Parameters:
  intel_id: { type: string, format: uuid }

Request Body:
  type: object
  properties:
    is_actioned:
      type: boolean
    action_summary:
      type: string
      maxLength: 1000

Response 200:
  data:
    type: object
    description: "更新后的 Intel 对象"
```

---

## 十、WebSocket 实时通信

### 10.1 公司实时状态推送

```yaml
WS /ws/opc/companies/{company_id}
认证: JWT Token 通过 query param: ?token=<jwt>

连接建立:
  客户端 → 服务端: 发起 WebSocket 连接
  服务端 → 客户端: {"type": "connected", "company_id": "...", "timestamp": "..."}

心跳机制:
  客户端 → 服务端: {"type": "ping"} 每 30 秒
  服务端 → 客户端: {"type": "pong"}

事件推送:
  服务端 → 客户端: 
    {
      "type": "task.status_changed",
      "payload": {
        "task_id": "...",
        "old_status": "pending",
        "new_status": "in_progress",
        "employee_id": "...",
        "timestamp": "2026-05-17T10:30:00Z"
      }
    }

支持的事件类型:
  - task.status_changed      # 任务状态变更
  - task.completed           # 任务完成
  - task.review_required     # 任务待验收
  - employee.status_changed  # 员工状态变更
  - employee.leveled_up      # 员工升级
  - finance.new_record       # 新财务记录
  - milestone.achieved       # 里程碑达成
  - gateway.review_completed # 评审完成
  - mcp.call_completed       # MCP 调用完成
  - company.stage_changed    # 公司阶段变更

连接断开:
  服务端 → 客户端: {"type": "disconnected", "reason": "token_expired"}
```

### 10.2 AI 员工实时进度推送

```yaml
WS /ws/opc/employees/{employee_id}
认证: JWT Token 通过 query param: ?token=<jwt>

连接建立:
  服务端 → 客户端: {"type": "connected", "employee_id": "...", "current_task": "..."}

事件推送:
  服务端 → 客户端:
    {
      "type": "task.progress",
      "payload": {
        "task_id": "...",
        "progress": 45,
        "message": "正在生成着陆页 HTML...",
        "deliverable_preview": "...",
        "timestamp": "2026-05-17T10:30:00Z"
      }
    }

    {
      "type": "mcp.call_executed",
      "payload": {
        "tool_name": "web_search",
        "status": "success",
        "result_summary": "找到 5 条相关结果",
        "timestamp": "..."
      }
    }

支持的事件类型:
  - task.progress            # 任务执行进度（0-100）
  - task.deliverable_ready   # 交付物就绪
  - task.error               # 任务执行错误
  - mcp.call_executed        # MCP 工具调用完成
  - mcp.call_failed          # MCP 工具调用失败
  - llm.thinking             # LLM 思考过程（流式）
  - llm.response_chunk       # LLM 响应片段（流式）
```

---

## 十一、附录：完整端点清单

| # | 方法 | 端点 | 认证 | 限流类别 |
|---|------|------|------|----------|
| 1 | POST | `/api/v1/opc/companies` | JWT | 写操作 |
| 2 | GET | `/api/v1/opc/companies` | JWT | 读操作 |
| 3 | GET | `/api/v1/opc/companies/{id}` | JWT | 读操作 |
| 4 | PATCH | `/api/v1/opc/companies/{id}` | JWT | 写操作 |
| 5 | DELETE | `/api/v1/opc/companies/{id}` | JWT | 写操作 |
| 6 | GET | `/api/v1/opc/companies/{id}/dashboard` | JWT | 读操作 |
| 7 | GET | `/api/v1/opc/companies/{id}/employees` | JWT | 读操作 |
| 8 | POST | `/api/v1/opc/companies/{id}/employees` | JWT | 写操作 |
| 9 | GET | `/api/v1/opc/employees/{id}` | JWT | 读操作 |
| 10 | PATCH | `/api/v1/opc/employees/{id}` | JWT | 写操作 |
| 11 | DELETE | `/api/v1/opc/employees/{id}` | JWT | 写操作 |
| 12 | POST | `/api/v1/opc/employees/{id}/skills/upgrade` | JWT | 写操作 |
| 13 | POST | `/api/v1/opc/companies/{id}/tasks` | JWT | 写操作 |
| 14 | GET | `/api/v1/opc/companies/{id}/tasks` | JWT | 读操作 |
| 15 | GET | `/api/v1/opc/tasks/{id}` | JWT | 读操作 |
| 16 | PATCH | `/api/v1/opc/tasks/{id}` | JWT | 写操作 |
| 17 | POST | `/api/v1/opc/tasks/{id}/assign` | JWT | 写操作 |
| 18 | POST | `/api/v1/opc/tasks/{id}/review` | JWT | 写操作 |
| 19 | GET | `/api/v1/opc/tasks/{id}/logs` | JWT | 读操作 |
| 20 | POST | `/api/v1/opc/companies/{id}/sprints` | JWT | 写操作 |
| 21 | GET | `/api/v1/opc/companies/{id}/sprints` | JWT | 读操作 |
| 22 | PATCH | `/api/v1/opc/sprints/{id}` | JWT | 写操作 |
| 23 | POST | `/api/v1/opc/companies/{id}/gateway-reviews` | JWT | 评审 |
| 24 | GET | `/api/v1/opc/companies/{id}/gateway-reviews` | JWT | 读操作 |
| 25 | GET | `/api/v1/opc/companies/{id}/milestones` | JWT | 读操作 |
| 26 | POST | `/api/v1/opc/companies/{id}/finance/records` | JWT | 写操作 |
| 27 | GET | `/api/v1/opc/companies/{id}/finance` | JWT | 读操作 |
| 28 | GET | `/api/v1/opc/companies/{id}/finance/records` | JWT | 读操作 |
| 29 | GET | `/api/v1/opc/companies/{id}/mcp/tools` | JWT | 读操作 |
| 30 | POST | `/api/v1/opc/companies/{id}/mcp/tools/{tool}/call` | JWT | MCP |
| 31 | GET | `/api/v1/opc/mcp/calls/{call_id}` | JWT | 读操作 |
| 32 | GET | `/api/v1/opc/companies/{id}/mcp/calls` | JWT | 读操作 |
| 33 | POST | `/api/v1/opc/companies/{id}/reports/bmc` | JWT | 报告 |
| 34 | POST | `/api/v1/opc/companies/{id}/reports/finance` | JWT | 报告 |
| 35 | GET | `/api/v1/opc/reports/{report_id}` | JWT | 读操作 |
| 36 | POST | `/api/v1/opc/employees/{id}/reports/performance` | JWT | 报告 |
| 37 | GET | `/api/v1/opc/companies/{id}/intel` | JWT | 读操作 |
| 38 | POST | `/api/v1/opc/companies/{id}/intel` | JWT | 写操作 |
| 39 | POST | `/api/v1/opc/companies/{id}/intel/collect` | JWT | 写操作 |
| 40 | PATCH | `/api/v1/opc/intel/{id}` | JWT | 写操作 |
| 41 | WS | `/ws/opc/companies/{id}` | JWT | - |
| 42 | WS | `/ws/opc/employees/{id}` | JWT | - |

---

*文档结束*
