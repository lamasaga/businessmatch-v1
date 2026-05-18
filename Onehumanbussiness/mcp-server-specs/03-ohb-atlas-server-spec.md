# ohb-atlas MCP Server 规格文档

> **文档定位**：定义 OneHumanBusiness 平台知识图谱（Knowledge Graph）MCP Server 的完整实现规格，包含商业概念查询、关联概念发现、学习路径生成、概念测验与案例搜索等核心能力。
>
> **关联文档**：`01-MCP架构总览.md`、`02-ohb-memory-server-spec.md`、`../知识卡片库/`
>
> **最后更新**：2026-05-17

---

## 一、概述

`ohb-atlas` 是 OHB 平台的商业知识中枢，以知识图谱形式组织商学、经济学、管理学等领域的核心概念。它为 AI 员工（尤其是 Advisor 类顾问角色）提供结构化的知识查询服务，使 AI 员工在回答学生问题时能够引用权威定义、关联概念和真实案例，而非仅依赖 LLM 的参数化知识。

**核心价值**：
1. **知识权威性**：所有概念均来自教材、学术文献和行业标准，经过教育专家审核
2. **概念关联性**：通过图谱关系揭示概念间的因果、层级、对比关系
3. **学习适应性**：根据学生等级和背景生成个性化学习路径
4. **与记忆系统协同**：Atlas 提供「知识」，Memory 提供「经验」，两者互补

---

## 二、知识图谱数据模型

### 2.1 实体类型

```yaml
entity_types:
  Concept:          # 核心概念
    properties:
      - name: 概念名称
      - definition: 标准定义
      - domain: 所属学科 (商学/经济学/管理学/法学/技术)
      - difficulty: 难度等级 (L1-L5)
      - keywords: 关键词列表
      - source: 来源文献
  
  CaseStudy:        # 案例研究
    properties:
      - title: 案例标题
      - industry: 行业领域
      - company: 涉及公司
      - scenario: 场景描述
      - outcome: 结果与教训
      - teaching_points: 教学要点
  
  Skill:            # 技能/能力
    properties:
      - name: 技能名称
      - description: 技能描述
      - prerequisites: 前置技能
      - applications: 应用场景
  
  Framework:        # 商业框架/模型
    properties:
      - name: 框架名称 (如 BMC, SWOT, PESTEL)
      - components: 组成要素列表
      - usage_guide: 使用指南
      - template_url: 模板链接
```

### 2.2 关系类型

```yaml
relation_types:
  - PREREQUISITE:     # 前置依赖  (A 是 B 的前置知识)
  - IS_A:             # 层级关系  (A 是 B 的子类)
  - RELATED_TO:       # 关联关系  (A 与 B 相关)
  - CONTRASTS_WITH:   # 对比关系  (A 与 B 形成对比)
  - APPLIED_IN:       # 应用场景  (概念 A 应用于案例 B)
  - LEADS_TO:         # 因果关系  (A 导致 B)
  - PART_OF:          # 组成关系  (A 是 B 的组成部分)
  - REQUIRES_SKILL:   # 技能依赖  (概念 A 需要技能 B)
```

### 2.3 图谱存储技术选型

| 方案 | 优势 | 劣势 | 适用阶段 |
|------|------|------|----------|
| **Neo4j** | 原生图数据库，Cypher查询强大 | 部署较重，许可费用 | 生产环境 |
| **PostgreSQL + pg_graph** | 与现有业务库统一，无额外运维 | 图查询性能中等 | 中小规模 |
| **内存图谱 + 向量索引** | 查询极快，适合概念匹配 | 数据持久化需额外处理 | 高频查询缓存 |

**最终方案**：Neo4j 作为主存储，Redis 缓存热门查询，向量库（Qdrant）辅助语义概念匹配。

---

## 三、与现有知识卡片库的对接

### 3.1 数据源映射

OHB 平台已有 `知识卡片库/` 目录，包含以下分类：

```
知识卡片库/
├── 商学/
│   ├── 市场营销/
│   ├── 财务管理/
│   └── 战略管理/
├── 经济学/
│   ├── 微观经济学/
│   ├── 宏观经济学/
│   └── 行为经济学/
├── 管理学/
│   ├── 组织行为/
│   ├── 运营效率/
│   └── 领导力/
└── 索引与映射/
    ├── 概念-学段映射表.md
    └── 概念-赛事主题映射表.md
```

### 3.2 数据同步管道

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Markdown      │     │   ETL Pipeline  │     │    Neo4j        │
│   知识卡片源文件 │────▶│   (定期同步)     │────▶│   知识图谱       │
│   (.md)         │     │                 │     │   (查询服务)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │   Vector DB     │
                        │   (语义索引)     │
                        └─────────────────┘
```

**同步策略**：
- **增量同步**：每24小时扫描 `知识卡片库/` 变更，更新图谱节点
- **全量重建**：每周日凌晨执行全量重建，确保数据一致性
- **人工审核**：新增概念需教育专家审核后才进入生产图谱

### 3.3 Markdown 到图谱的转换规则

```yaml
# 知识卡片 Markdown 结构示例
mapping_rules:
  frontmatter:
    concept_id: "→ 图谱节点 ID"
    domain: "→ 节点标签 (Concept|CaseStudy|Skill|Framework)"
    difficulty: "→ 节点属性 difficulty"
    related_concepts: "→ 创建 RELATED_TO 关系"
    prerequisites: "→ 创建 PREREQUISITE 关系"
  
  body:
    h1_title: "→ 节点属性 name"
    definition_block: "→ 节点属性 definition"
    case_examples: "→ 创建 CaseStudy 节点 + APPLIED_IN 关系"
    comparison_tables: "→ 创建 CONTRASTS_WITH 关系"
```

---

## 四、知识更新机制

### 4.1 更新来源

| 来源 | 频率 | 审核要求 | 示例 |
|------|------|----------|------|
| 知识卡片库同步 | 每日 | 自动 | 教学团队新增概念 |
| AI 员工反馈 | 实时 | 人工（每周批量） | AI发现的新关联 |
| 学生贡献 | 实时 | 导师审批 | 学生发现的案例 |
| 外部数据源 | 每月 | 专家审核 | 哈佛商业评论新案例 |

### 4.2 更新审批工作流

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  提交    │───▶│  自动校验 │───▶│  导师初审 │───▶│  专家终审 │───▶│  发布    │
│  Submit  │    │ Validate │    │ Teacher  │    │ Expert   │    │ Publish  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │               │               │
                     ▼               ▼               ▼
               ┌──────────┐   ┌──────────┐   ┌──────────┐
               │ 格式检查  │   │ 内容适宜性│   │ 学术准确性│
               │ 重复检测  │   │ 难度分级  │   │ 引用来源  │
               └──────────┘   └──────────┘   └──────────┘
```

---

## 五、Tools 定义

### 5.1 concept_lookup — 概念查询

查询商业概念的权威定义、属性和基本信息。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "concept_lookup_input",
  "required": ["query"],
  "properties": {
    "query": {
      "type": "string",
      "description": "概念名称或描述性查询",
      "minLength": 1,
      "maxLength": 200,
      "examples": ["商业模式画布", "SWOT分析", "现金流折现"]
    },
    "match_mode": {
      "type": "string",
      "enum": ["exact", "fuzzy", "semantic"],
      "default": "fuzzy",
      "description": "匹配模式：精确/模糊/语义"
    },
    "detail_level": {
      "type": "string",
      "enum": ["brief", "standard", "comprehensive"],
      "default": "standard",
      "description": "返回详细程度"
    },
    "include_examples": {
      "type": "boolean",
      "default": true,
      "description": "是否包含应用示例"
    },
    "include_formulas": {
      "type": "boolean",
      "default": false,
      "description": "是否包含相关公式（如财务公式）"
    },
    "target_level": {
      "type": "string",
      "enum": ["L1", "L2", "L3", "L4", "L5", "auto"],
      "default": "auto",
      "description": "目标难度等级，auto则根据学生当前等级自动适配"
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "concept_lookup_output",
  "required": ["concepts", "total_found"],
  "properties": {
    "concepts": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["concept_id", "name", "definition", "domain", "difficulty"],
        "properties": {
          "concept_id": { "type": "string" },
          "name": { "type": "string" },
          "name_en": { "type": "string", "description": "英文名称" },
          "definition": { "type": "string" },
          "domain": { "type": "string", "enum": ["商学", "经济学", "管理学", "法学", "技术", "跨学科"] },
          "difficulty": { "type": "string", "enum": ["L1", "L2", "L3", "L4", "L5"] },
          "keywords": { "type": "array", "items": { "type": "string" } },
          "related_concepts_count": { "type": "integer" },
          "examples": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "scenario": { "type": "string" },
                "explanation": { "type": "string" }
              }
            }
          },
          "formulas": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "expression": { "type": "string" },
                "variables": { "type": "array", "items": { "type": "string" } },
                "description": { "type": "string" }
              }
            }
          },
          "source": { "type": "string", "description": "来源文献或教材" },
          "match_score": { "type": "number", "description": "匹配得分 (0-1)" }
        }
      }
    },
    "total_found": { "type": "integer" },
    "suggested_queries": {
      "type": "array",
      "items": { "type": "string" },
      "description": "当精确匹配失败时推荐的相关查询"
    }
  }
}
```

#### 错误码

| 错误码 | 描述 | 示例 |
|--------|------|------|
| `ATL-1001` | 概念未找到 | `{"code": "ATL-1001", "message": "No concept found for query 'XYZ模型'"}` |
| `ATL-1002` | 查询过于宽泛 | `{"code": "ATL-1002", "message": "Query too broad, please be more specific"}` |
| `ATL-1003` | 图谱服务不可用 | `{"code": "ATL-1003", "message": "Knowledge graph database connection failed"}` |

---

### 5.2 related_concepts — 关联概念

获取与指定概念相关联的其他概念，支持按关系类型过滤。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "related_concepts_input",
  "required": ["concept_id"],
  "properties": {
    "concept_id": {
      "type": "string",
      "description": "中心概念的ID"
    },
    "relation_types": {
      "type": "array",
      "description": "要查询的关系类型，为空则返回所有关系",
      "items": {
        "type": "string",
        "enum": ["PREREQUISITE", "IS_A", "RELATED_TO", "CONTRASTS_WITH", "APPLIED_IN", "LEADS_TO", "PART_OF", "REQUIRES_SKILL"]
      },
      "default": []
    },
    "max_depth": {
      "type": "integer",
      "description": "关系遍历深度，1=直接关联，2=间接关联",
      "minimum": 1,
      "maximum": 3,
      "default": 1
    },
    "limit_per_relation": {
      "type": "integer",
      "description": "每种关系类型最多返回数量",
      "minimum": 1,
      "maximum": 20,
      "default": 5
    },
    "difficulty_filter": {
      "type": "array",
      "description": "按难度过滤",
      "items": { "type": "string", "enum": ["L1", "L2", "L3", "L4", "L5"] }
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "related_concepts_output",
  "required": ["concept_id", "relations"],
  "properties": {
    "concept_id": { "type": "string" },
    "concept_name": { "type": "string" },
    "relations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["relation_type", "concepts"],
        "properties": {
          "relation_type": { "type": "string" },
          "concepts": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "concept_id": { "type": "string" },
                "name": { "type": "string" },
                "definition_brief": { "type": "string" },
                "difficulty": { "type": "string" },
                "relation_description": { "type": "string", "description": "关系的自然语言描述" },
                "path_depth": { "type": "integer" }
              }
            }
          }
        }
      }
    },
    "graph_stats": {
      "type": "object",
      "properties": {
        "total_related": { "type": "integer" },
        "max_depth_reached": { "type": "integer" },
        "domains_covered": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

---

### 5.3 learning_path — 学习路径生成

基于学生当前知识水平和目标，生成个性化的概念学习路径。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "learning_path_input",
  "required": ["goal_concept_id"],
  "properties": {
    "goal_concept_id": {
      "type": "string",
      "description": "目标概念ID"
    },
    "known_concept_ids": {
      "type": "array",
      "description": "学生已掌握的概念ID列表",
      "items": { "type": "string" },
      "default": []
    },
    "student_level": {
      "type": "string",
      "enum": ["L1", "L2", "L3", "L4", "L5"],
      "description": "学生当前等级"
    },
    "max_steps": {
      "type": "integer",
      "description": "学习路径最大步数",
      "minimum": 3,
      "maximum": 20,
      "default": 10
    },
    "path_style": {
      "type": "string",
      "enum": ["shortest", "balanced", "thorough"],
      "default": "balanced",
      "description": "路径风格：最短/均衡/全面"
    },
    "include_quizzes": {
      "type": "boolean",
      "default": true,
      "description": "是否在每步后附推荐测验"
    },
    "include_cases": {
      "type": "boolean",
      "default": true,
      "description": "是否推荐相关案例"
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "learning_path_output",
  "required": ["path_id", "goal", "steps", "estimated_time_minutes"],
  "properties": {
    "path_id": { "type": "string", "description": "学习路径唯一标识" },
    "goal": {
      "type": "object",
      "properties": {
        "concept_id": { "type": "string" },
        "name": { "type": "string" }
      }
    },
    "steps": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["step_number", "concept", "rationale"],
        "properties": {
          "step_number": { "type": "integer" },
          "concept": {
            "type": "object",
            "properties": {
              "concept_id": { "type": "string" },
              "name": { "type": "string" },
              "difficulty": { "type": "string" },
              "definition_brief": { "type": "string" }
            }
          },
          "rationale": { "type": "string", "description": "为何推荐此步骤" },
          "prerequisites_from_path": {
            "type": "array",
            "items": { "type": "string" },
            "description": "本步骤依赖的前置步骤"
          },
          "suggested_quiz": {
            "type": "object",
            "nullable": true,
            "properties": {
              "quiz_id": { "type": "string" },
              "question_count": { "type": "integer" }
            }
          },
          "suggested_cases": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "case_id": { "type": "string" },
                "title": { "type": "string" }
              }
            }
          },
          "estimated_time_minutes": { "type": "integer" }
        }
      }
    },
    "estimated_time_minutes": { "type": "integer" },
    "path_metrics": {
      "type": "object",
      "properties": {
        "total_concepts": { "type": "integer" },
        "new_concepts": { "type": "integer", "description": "相对于已知概念的新增数量" },
        "difficulty_progression": { "type": "array", "items": { "type": "string" } },
        "domains_covered": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

---

### 5.4 concept_quiz — 概念测验

为指定概念生成测验题目，检验学生的理解程度。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "concept_quiz_input",
  "required": ["concept_id"],
  "properties": {
    "concept_id": {
      "type": "string",
      "description": "要测验的概念ID"
    },
    "question_count": {
      "type": "integer",
      "minimum": 1,
      "maximum": 20,
      "default": 5
    },
    "question_types": {
      "type": "array",
      "description": "题目类型",
      "items": {
        "type": "string",
        "enum": ["single_choice", "multiple_choice", "true_false", "fill_blank", "short_answer"]
      },
      "default": ["single_choice", "multiple_choice"]
    },
    "difficulty": {
      "type": "string",
      "enum": ["easy", "medium", "hard", "mixed"],
      "default": "mixed"
    },
    "include_explanations": {
      "type": "boolean",
      "default": true,
      "description": "是否包含答案解析"
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "concept_quiz_output",
  "required": ["quiz_id", "concept_id", "questions"],
  "properties": {
    "quiz_id": { "type": "string" },
    "concept_id": { "type": "string" },
    "concept_name": { "type": "string" },
    "questions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["question_id", "type", "question_text", "options"],
        "properties": {
          "question_id": { "type": "string" },
          "type": { "type": "string", "enum": ["single_choice", "multiple_choice", "true_false", "fill_blank", "short_answer"] },
          "question_text": { "type": "string" },
          "options": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "option_id": { "type": "string" },
                "text": { "type": "string" },
                "is_correct": { "type": "boolean" }
              }
            }
          },
          "correct_answer": {
            "type": "array",
            "items": { "type": "string" },
            "description": "正确答案的 option_id 列表"
          },
          "explanation": { "type": "string", "description": "答案解析" },
          "difficulty": { "type": "string", "enum": ["easy", "medium", "hard"] },
          "related_concept_ids": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "total_score": { "type": "integer", "description": "总分" },
    "time_limit_minutes": { "type": "integer" }
  }
}
```

---

### 5.5 case_study_search — 案例搜索

搜索与商业概念相关的真实案例。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "case_study_search_input",
  "required": ["query"],
  "properties": {
    "query": {
      "type": "string",
      "description": "搜索关键词或概念描述",
      "minLength": 1,
      "maxLength": 500
    },
    "industries": {
      "type": "array",
      "description": "行业过滤",
      "items": {
        "type": "string",
        "enum": ["科技", "零售", "金融", "制造", "医疗", "教育", "餐饮", "娱乐", "能源", "交通", "其他"]
      },
      "default": []
    },
    "company_names": {
      "type": "array",
      "description": "指定公司名称",
      "items": { "type": "string" },
      "default": []
    },
    "difficulty": {
      "type": "string",
      "enum": ["L1", "L2", "L3", "L4", "L5"],
      "description": "案例难度等级"
    },
    "time_period": {
      "type": "string",
      "enum": ["recent_1y", "recent_5y", "recent_10y", "classic", "any"],
      "default": "any"
    },
    "top_k": {
      "type": "integer",
      "minimum": 1,
      "maximum": 50,
      "default": 10
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "case_study_search_output",
  "required": ["cases", "total_found"],
  "properties": {
    "cases": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["case_id", "title", "industry", "scenario", "teaching_points"],
        "properties": {
          "case_id": { "type": "string" },
          "title": { "type": "string" },
          "industry": { "type": "string" },
          "companies": { "type": "array", "items": { "type": "string" } },
          "time_period": { "type": "string" },
          "difficulty": { "type": "string", "enum": ["L1", "L2", "L3", "L4", "L5"] },
          "scenario": { "type": "string", "description": "案例背景描述" },
          "challenge": { "type": "string", "description": "面临的核心挑战" },
          "actions_taken": { "type": "string", "description": "采取的行动" },
          "outcome": { "type": "string", "description": "结果与影响" },
          "teaching_points": {
            "type": "array",
            "items": { "type": "string" },
            "description": "教学要点"
          },
          "related_concepts": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "concept_id": { "type": "string" },
                "name": { "type": "string" }
              }
            }
          },
          "source": { "type": "string", "description": "案例来源" },
          "match_score": { "type": "number" }
        }
      }
    },
    "total_found": { "type": "integer" },
    "suggested_filters": {
      "type": "array",
      "items": { "type": "string" },
      "description": "建议的进一步过滤条件"
    }
  }
}
```

---

## 六、错误码汇总

| 错误码 | 名称 | HTTP状态 | 描述 | 处理建议 |
|--------|------|----------|------|----------|
| `ATL-0000` | `SUCCESS` | 200 | 成功 | — |
| `ATL-1001` | `CONCEPT_NOT_FOUND` | 404 | 概念未找到 | 尝试模糊搜索或语义搜索 |
| `ATL-1002` | `QUERY_TOO_BROAD` | 400 | 查询过于宽泛 | 增加更具体的关键词 |
| `ATL-1003` | `GRAPH_UNAVAILABLE` | 503 | 图谱服务不可用 | 自动降级到向量搜索 |
| `ATL-2001` | `CYCLE_DETECTED` | 400 | 学习路径中存在循环依赖 | 联系技术团队修复图谱 |
| `ATL-2002` | `PATH_TOO_LONG` | 400 | 无法在给定步数内到达目标 | 增加 max_steps 或分阶段学习 |
| `ATL-3001` | `CASE_NOT_FOUND` | 404 | 未找到符合条件的案例 | 放宽过滤条件 |
| `ATL-4001` | `INVALID_DIFFICULTY` | 400 | 难度参数不合法 | 使用 L1-L5 或 easy/hard |
| `ATL-5001` | `INTERNAL_ERROR` | 500 | 内部错误 | 联系技术支持 |

---

## 七、附录

### 7.1 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `OHB_ATLAS_NEO4J_URI` | `bolt://localhost:7687` | Neo4j 连接URI |
| `OHB_ATLAS_NEO4J_USER` | `neo4j` | Neo4j 用户名 |
| `OHB_ATLAS_NEO4J_PASSWORD` | — | Neo4j 密码 |
| `OHB_ATLAS_REDIS_URL` | `redis://localhost:6379/1` | Redis 缓存地址 |
| `OHB_KNOWLEDGE_BASE_PATH` | `../知识卡片库` | Markdown知识卡片路径 |
| `OHB_ATLAS_SYNC_INTERVAL_HOURS` | `24` | 自动同步间隔 |

### 7.2 启动方式

```bash
python -m ohb_atlas_server --transport sse --port 8082
```

### 7.3 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v0.1 | 2026-05-17 | 初稿，定义5个tools及知识图谱架构 |
