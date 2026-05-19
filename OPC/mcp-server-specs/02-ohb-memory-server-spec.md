# OPC-memory MCP Server 规格文档

> **文档定位**：定义 OPC 平台 AI 员工长期记忆系统的 MCP Server 完整实现规格，包含所有工具的输入输出 Schema、向量存储技术选型、记忆分片策略与隐私隔离机制。
>
> **关联文档**：`01-MCP架构总览.md`、`03-OPC-atlas-server-spec.md`
>
> **最后更新**：2026-05-17

---

## 一、概述

`OPC-memory` 是 OPC 平台的核心内部 MCP Server 之一，负责为所有 AI 员工提供长期记忆能力。不同于 LLM 的上下文窗口限制，`OPC-memory` 通过向量数据库存储和检索 AI 员工的历史经验、对话上下文、项目决策与反思，使 AI 员工能够「记住」过往任务、从经验中学习，并在新任务中引用相关知识。

**核心设计原则**：
1. **语义检索优先**：基于向量相似度而非关键词匹配
2. **多层级记忆**：区分短期工作记忆、长期经验记忆和跨项目元记忆
3. **严格隐私隔离**：学生 A 的记忆对学生 B 完全不可见
4. **可控遗忘**：支持记忆的更新、摘要与主动删除

---

## 二、向量存储技术选型

### 2.1 技术对比

| 特性 | ChromaDB | Qdrant | 选型结论 |
|------|----------|--------|----------|
| 部署复杂度 | 低（嵌入式/SQLite） | 中（需独立服务） | 开发用 ChromaDB，生产用 Qdrant |
| 多租户隔离 | 需手动实现命名空间 | 原生支持 Collections | Qdrant 更适合教育场景 |
| 混合检索 | 支持 | 支持（+ 过滤） | Qdrant 过滤性能更优 |
| 分布式 | 实验性 | 生产级 | Qdrant 适合规模化 |
| 自托管成本 | 极低 | 低 | 两者均可接受 |
| Python SDK | 优秀 | 优秀 | 无差异 |

### 2.2 最终方案：双模式部署

```yaml
vector_store:
  development:
    engine: "ChromaDB"
    mode: "persistent"
    path: "./data/chroma_db"
    embedding_model: "text-embedding-3-small"
    dimension: 1536
  
  production:
    engine: "Qdrant"
    host: "qdrant.OPC.internal"
    port: 6333
    grpc_port: 6334
    embedding_model: "text-embedding-3-large"
    dimension: 3072
    replication_factor: 2
    
  common_config:
    distance_metric: "Cosine"
    default_limit: 10
    max_limit: 100
```

### 2.3 嵌入模型选择

| 模型 | 维度 | 适用场景 | 成本 |
|------|------|----------|------|
| `text-embedding-3-small` | 1536 | 快速检索、开发测试 | 极低 |
| `text-embedding-3-large` | 3072 | 生产环境、高精度匹配 | 低 |
| `bge-large-zh-v1.5` (本地) | 1024 | 中文语义优化场景 | 零API成本 |

---

## 三、记忆分片策略

### 3.1 三层分片模型

记忆数据按照 **公司(Company) → 员工(Employee) → 项目(Project)** 三级层次结构进行物理与逻辑隔离。

```
qdrant collections/
├── company_{company_id}/                    # 公司级共享记忆
│   ├── project_contexts                     # 项目上下文集合
│   ├── team_knowledge                       # 团队协作知识
│   └── market_intelligence                  # 市场情报
│
├── employee_{employee_id}/                  # 员工级私有记忆
│   ├── task_experiences                     # 任务执行经验
│   ├── conversation_history                 # 对话历史摘要
│   ├── skills_learned                       # 技能学习记录
│   └── reflections                          # 反思与总结
│
└── project_{project_id}/                    # 项目级记忆
    ├── decisions                            # 关键决策记录
    ├── milestones                           # 里程碑成果
    ├── feedback_loops                       # 反馈循环
    └── artifacts                            # 产出物索引
```

### 3.2 分片访问规则

```yaml
shard_access_rules:
  company_level:
    readable_by: ["同公司所有员工", "公司导师", "学校管理员"]
    writable_by: ["同公司所有员工"]
    retention: "公司存续期间"
  
  employee_level:
    readable_by: ["该员工自身", "公司导师（只读）"]
    writable_by: ["该员工自身"]
    retention: "员工注销后90天删除"
  
  project_level:
    readable_by: ["项目成员", "公司导师"]
    writable_by: ["项目成员"]
    retention: "项目结束后180天归档，365天后删除"
```

### 3.3 Qdrant Collection 命名规范

```python
# Collection 命名规则
def get_collection_name(scope: str, scope_id: str, memory_type: str) -> str:
    """
    scope: "company" | "employee" | "project"
    scope_id: 对应的UUID
    memory_type: "context" | "experience" | "decision" | "reflection"
    """
    return f"OPC_{scope}_{scope_id}_{memory_type}"

# 示例
collection_name = get_collection_name("employee", "emp_dev01_abc123", "experience")
# 结果: "OPC_employee_emp_dev01_abc123_experience"
```

---

## 四、隐私隔离机制

### 4.1 数据隔离原则

1. **物理隔离**：不同学生的记忆存储在不同的 Collection 中
2. **查询过滤**：每次检索自动附加 `student_id` / `company_id` 过滤条件
3. **权限校验**：MCP Router 在请求到达 Memory Server 前已完成权限验证
4. **审计日志**：所有记忆访问记录不可篡改地存入审计库

### 4.2 隔离实现代码示例

```python
# 在 memory_search 工具内部实现
def memory_search(query: str, employee_id: str, company_id: str, 
                  top_k: int = 10, filters: dict = None):
    # 1. 权限校验（由Router完成，此处二次确认）
    assert employee_belongs_to(employee_id, company_id)
    
    # 2. 限定查询范围到该员工和公司的Collection
    collections = [
        f"OPC_employee_{employee_id}_experience",
        f"OPC_employee_{employee_id}_reflection",
        f"OPC_company_{company_id}_project_context",
    ]
    
    # 3. 自动注入访问控制过滤
    must_filters = [
        {"key": "access_scope", "match": {"any": [employee_id, company_id]}}
    ]
    
    # 4. 执行向量搜索
    results = qdrant.search(
        collection_names=collections,
        query_vector=embed(query),
        query_filter=Filter(must=must_filters),
        limit=top_k
    )
    
    # 5. 返回前再次过滤（防御性编程）
    return [r for r in results if r.metadata.get("company_id") == company_id]
```

### 4.3 跨公司记忆访问阻断

```json
{
  "security_policy": {
    "cross_company_access": "FORBIDDEN",
    "cross_student_access": "FORBIDDEN",
    "teacher_override": {
      "allowed": true,
      "requires_audit_log": true,
      "requires_student_consent": true
    },
    "data_export": {
      "student_can_export_own": true,
      "format": ["json", "markdown"],
      "anonymization_option": true
    }
  }
}
```

---

## 五、Tools 定义

### 5.1 memory_search — 语义检索

基于向量相似度检索 AI 员工的历史记忆。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "memory_search_input",
  "required": ["query"],
  "properties": {
    "query": {
      "type": "string",
      "description": "自然语言查询，用于语义匹配记忆内容",
      "minLength": 1,
      "maxLength": 2000,
      "examples": ["之前设计用户登录功能时遇到的安全问题", "用户画像分析的最佳实践"]
    },
    "memory_types": {
      "type": "array",
      "description": "要检索的记忆类型，不指定则搜索全部",
      "items": {
        "type": "string",
        "enum": ["experience", "conversation", "decision", "reflection", "skill", "artifact"]
      },
      "default": ["experience", "conversation", "decision"]
    },
    "top_k": {
      "type": "integer",
      "description": "返回结果数量",
      "minimum": 1,
      "maximum": 50,
      "default": 10
    },
    "time_range": {
      "type": "object",
      "description": "时间范围过滤",
      "properties": {
        "from": { "type": "string", "format": "date-time", "description": "起始时间" },
        "to": { "type": "string", "format": "date-time", "description": "结束时间" }
      }
    },
    "min_score": {
      "type": "number",
      "description": "相似度阈值，低于此值的结果将被过滤",
      "minimum": 0.0,
      "maximum": 1.0,
      "default": 0.7
    },
    "project_id": {
      "type": "string",
      "description": "限定特定项目的记忆，不指定则搜索全部有权限的项目",
      "nullable": true
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "memory_search_output",
  "required": ["results", "total_found", "query_embedding_time_ms"],
  "properties": {
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["memory_id", "content", "score", "metadata"],
        "properties": {
          "memory_id": { "type": "string", "description": "记忆唯一标识" },
          "content": { "type": "string", "description": "记忆文本内容" },
          "score": { "type": "number", "description": "相似度得分 (0-1)" },
          "metadata": {
            "type": "object",
            "properties": {
              "memory_type": { "type": "string", "enum": ["experience", "conversation", "decision", "reflection", "skill", "artifact"] },
              "created_at": { "type": "string", "format": "date-time" },
              "project_id": { "type": "string" },
              "task_id": { "type": "string" },
              "employee_id": { "type": "string" },
              "tags": { "type": "array", "items": { "type": "string" } }
            }
          }
        }
      }
    },
    "total_found": { "type": "integer", "description": "命中总数" },
    "query_embedding_time_ms": { "type": "integer" },
    "search_time_ms": { "type": "integer" }
  }
}
```

#### 错误码

| 错误码 | 描述 | 示例 |
|--------|------|------|
| `MEM-1001` | 查询为空或过长 | `{"code": "MEM-1001", "message": "query length must be between 1 and 2000"}` |
| `MEM-1002` | 无可访问的记忆集合 | `{"code": "MEM-1002", "message": "No memory collections found for employee"}` |
| `MEM-1003` | 向量服务不可用 | `{"code": "MEM-1003", "message": "Embedding service temporarily unavailable"}` |

---

### 5.2 memory_store — 存储经验

将新的经验片段持久化到向量数据库中。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "memory_store_input",
  "required": ["content", "memory_type"],
  "properties": {
    "content": {
      "type": "string",
      "description": "要存储的记忆文本内容",
      "minLength": 10,
      "maxLength": 10000
    },
    "memory_type": {
      "type": "string",
      "enum": ["experience", "conversation", "decision", "reflection", "skill", "artifact"],
      "description": "记忆类型，决定存储的目标Collection"
    },
    "project_id": {
      "type": "string",
      "description": "关联项目ID，必填用于项目级隔离"
    },
    "task_id": {
      "type": "string",
      "description": "关联任务ID",
      "nullable": true
    },
    "tags": {
      "type": "array",
      "description": "自定义标签，用于后续过滤检索",
      "items": { "type": "string", "maxLength": 50 },
      "maxItems": 20,
      "default": []
    },
    "importance": {
      "type": "integer",
      "description": "重要性评分，1-5，越高越不容易被自动清理",
      "minimum": 1,
      "maximum": 5,
      "default": 3
    },
    "expires_at": {
      "type": "string",
      "format": "date-time",
      "description": "过期时间，到达后自动归档或删除",
      "nullable": true
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "memory_store_output",
  "required": ["memory_id", "stored", "embedding_status"],
  "properties": {
    "memory_id": { "type": "string", "description": "生成的记忆唯一标识" },
    "stored": { "type": "boolean" },
    "embedding_status": {
      "type": "string",
      "enum": ["success", "queued", "failed"]
    },
    "vector_id": { "type": "string", "description": "向量数据库中的记录ID" },
    "collection": { "type": "string", "description": "存储的目标Collection名称" },
    "storage_time_ms": { "type": "integer" }
  }
}
```

---

### 5.3 memory_update — 更新记忆

更新已有记忆的内容或元数据。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "memory_update_input",
  "required": ["memory_id"],
  "properties": {
    "memory_id": {
      "type": "string",
      "description": "要更新的记忆ID"
    },
    "content": {
      "type": "string",
      "description": "新的记忆内容，提供则重新生成向量",
      "minLength": 10,
      "maxLength": 10000
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "完全替换原有标签"
    },
    "importance": {
      "type": "integer",
      "minimum": 1,
      "maximum": 5
    },
    "expires_at": {
      "type": "string",
      "format": "date-time",
      "nullable": true
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "memory_update_output",
  "required": ["memory_id", "updated", "previous_version_id"],
  "properties": {
    "memory_id": { "type": "string" },
    "updated": { "type": "boolean" },
    "previous_version_id": { "type": "string", "description": "旧版本ID，用于审计追踪" },
    "embedding_regenerated": { "type": "boolean" },
    "update_time_ms": { "type": "integer" }
  }
}
```

---

### 5.4 memory_summarize — 生成摘要

对一组记忆进行自动摘要，生成阶段性总结。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "memory_summarize_input",
  "required": ["scope"],
  "properties": {
    "scope": {
      "type": "string",
      "enum": ["employee", "project", "company"],
      "description": "摘要范围"
    },
    "scope_id": {
      "type": "string",
      "description": "范围对应的ID"
    },
    "time_range": {
      "type": "object",
      "properties": {
        "from": { "type": "string", "format": "date-time" },
        "to": { "type": "string", "format": "date-time" }
      }
    },
    "memory_types": {
      "type": "array",
      "items": { "type": "string", "enum": ["experience", "conversation", "decision", "reflection", "skill"] },
      "default": ["experience", "decision", "reflection"]
    },
    "summary_depth": {
      "type": "string",
      "enum": ["brief", "standard", "detailed"],
      "default": "standard",
      "description": "摘要详细程度"
    },
    "output_format": {
      "type": "string",
      "enum": ["narrative", "bullet_points", "structured"],
      "default": "narrative"
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "memory_summarize_output",
  "required": ["summary", "source_count", "stored_summary_id"],
  "properties": {
    "summary": { "type": "string", "description": "生成的摘要文本" },
    "source_count": { "type": "integer", "description": "参与摘要的原始记忆数量" },
    "source_memory_ids": {
      "type": "array",
      "items": { "type": "string" }
    },
    "stored_summary_id": { "type": "string", "description": "自动存储的摘要记忆ID" },
    "key_insights": {
      "type": "array",
      "items": { "type": "string" },
      "description": "提取的关键洞察列表"
    },
    "generation_time_ms": { "type": "integer" }
  }
}
```

---

### 5.5 memory_delete — 删除记忆

删除指定记忆或批量清理过期记忆。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "memory_delete_input",
  "oneOf": [
    {
      "required": ["memory_id"],
      "properties": {
        "memory_id": {
          "type": "string",
          "description": "要删除的单个记忆ID"
        }
      }
    },
    {
      "required": ["filter"],
      "properties": {
        "filter": {
          "type": "object",
          "description": "批量删除条件",
          "properties": {
            "memory_types": { "type": "array", "items": { "type": "string" } },
            "older_than": { "type": "string", "format": "date-time" },
            "project_id": { "type": "string" },
            "tags": { "type": "array", "items": { "type": "string" } },
            "importance_below": { "type": "integer", "minimum": 1, "maximum": 5 }
          }
        },
        "dry_run": {
          "type": "boolean",
          "default": true,
          "description": "仅预览将要删除的记录数，不实际执行"
        }
      }
    }
  ]
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "memory_delete_output",
  "required": ["deleted_count", "deleted_ids"],
  "properties": {
    "deleted_count": { "type": "integer" },
    "deleted_ids": {
      "type": "array",
      "items": { "type": "string" }
    },
    "dry_run": { "type": "boolean" },
    "preview_count": { "type": "integer", "description": "dry_run=true时返回的预览数量" },
    "archived": {
      "type": "boolean",
      "description": "是否已归档（软删除）"
    }
  }
}
```

---

## 六、元数据与标签系统

### 6.1 自动提取的元数据

每条记忆存储时，系统自动提取以下元数据：

```json
{
  "auto_metadata": {
    "embedding_model": "text-embedding-3-large",
    "embedding_version": "2024-02",
    "content_hash": "sha256:a1b2c3...",
    "language_detected": "zh",
    "content_length": 1250,
    "sentiment_score": 0.6,
    "topic_keywords": ["用户登录", "JWT", "安全性"],
    "extracted_entities": ["React", "Node.js", "OAuth2"]
  }
}
```

### 6.2 标签推荐

`memory_store` 调用时，如未提供 `tags`，系统基于内容自动推荐标签：

```python
def auto_suggest_tags(content: str) -> list[str]:
    """
    基于LLM或规则引擎自动推荐标签
    """
    # 示例输出: ["前端开发", "安全", "用户系统", "React"]
    pass
```

---

## 七、记忆生命周期管理

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  创建   │───▶│  活跃   │───▶│  归档   │───▶│  清理   │───▶│  删除   │
│ Created │    │ Active  │    │Archived │    │ Cleanup │    │Deleted  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
    │              │              │              │              │
    │ 存储到向量库  │ 频繁检索命中  │ 超过保留期   │ 重要性低且   │ 物理删除
    │ 生成Embedding│ 参与摘要生成  │ 或项目结束   │ 长期未访问   │ 释放空间
    │              │              │              │              │
    └──────────────┴──────────────┴──────────────┴──────────────┘
```

---

## 八、附录

### 8.1 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `OPC_MEMORY_ENGINE` | `chroma` | 向量存储引擎 (`chroma` / `qdrant`) |
| `OPC_CHROMA_PATH` | `./data/chroma` | ChromaDB 持久化路径 |
| `OPC_QDRANT_HOST` | `localhost` | Qdrant 服务地址 |
| `OPC_QDRANT_PORT` | `6333` | Qdrant HTTP 端口 |
| `OPC_EMBEDDING_MODEL` | `text-embedding-3-small` | 默认嵌入模型 |
| `OPC_OPENAI_API_KEY` | — | OpenAI API Key |
| `OPC_MEMORY_MAX_QUERY_LEN` | `2000` | 最大查询长度 |
| `OPC_MEMORY_DEFAULT_TOPK` | `10` | 默认返回结果数 |

### 8.2 启动方式

```bash
# stdio 模式（MCP 标准）
python -m OPC_memory_server --transport stdio

# SSE 模式（HTTP Server-Sent Events）
python -m OPC_memory_server --transport sse --port 8081
```

### 8.3 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v0.1 | 2026-05-17 | 初稿，定义全部5个tools及存储架构 |
