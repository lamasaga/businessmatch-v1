# ohb-ethos MCP Server 规格文档

> **文档定位**：定义 OneHumanBusiness 平台伦理审计系统的 MCP Server 完整规格，包含隐私政策合规检查、密钥泄露扫描、内容安全审查、抄袭检测与公平性审计等核心能力。
>
> **关联文档**：`01-MCP架构总览.md`、`04-ohb-sandbox-server-spec.md`
>
> **最后更新**：2026-05-17

---

## 一、概述

`ohb-ethos` 是 OHB 平台的伦理与合规守门人。在 AI 员工执行任务的过程中，所有涉及对外发布、数据处理和代码提交的操作都必须经过 Ethos 的审计。它确保学生在使用 AI 工具的过程中遵守法律法规、平台政策和教育伦理，防止隐私泄露、内容违规和学术不端等问题的发生。

**审计范围**：
1. **隐私合规**：确保学生和用户数据不被非法收集或泄露
2. **密钥安全**：防止 API Key、密码等敏感信息意外暴露
3. **内容安全**：审查 AI 生成的文本、图像是否符合社区规范
4. **学术诚信**：检测抄袭、代写等学术不端行为
5. **公平性**：确保 AI 决策不带有偏见，对不同群体一视同仁

**设计理念**：
- **透明可解释**：每次审计都给出明确的判定理由
- **分级响应**：不同风险等级触发不同的处理流程
- **教育导向**：审计不仅是拦截，更是教育学生理解合规的重要性

---

## 二、审计规则库设计

### 2.1 规则库架构

```
ethos-rules/
├── privacy/
│   ├── gdpr_compliance.yml          # GDPR 合规规则
│   ├── coppa_protection.yml         # 儿童在线隐私保护
│   ├── data_minimization.yml        # 数据最小化原则
│   └── student_data_protection.yml  # 学生数据保护
│
├── security/
│   ├── secret_patterns.yml          # 密钥/Token 正则模式
│   ├── credential_leak.yml          # 凭证泄露检测
│   └── api_key_exposure.yml         # API Key 暴露检测
│
├── content/
│   ├── hate_speech.yml              # 仇恨言论
│   ├── harassment.yml               # 骚扰/霸凌
│   ├── misinformation.yml           # 虚假信息
│   ├── self_harm.yml                # 自伤/自杀内容
│   ├── violence.yml                 # 暴力内容
│   └── commercial_spam.yml          # 商业垃圾信息
│
├── academic/
│   ├── plagiarism_detection.yml     # 抄袭检测
│   ├── ghostwriting.yml             # 代写检测
│   ├── citation_integrity.yml       # 引用完整性
│   └── originality_threshold.yml    # 原创度阈值
│
└── fairness/
    ├── demographic_bias.yml         # 人口统计偏见
    ├── gender_bias.yml              # 性别偏见
    ├── cultural_sensitivity.yml     # 文化敏感性
    └── accessibility.yml            # 无障碍/包容性
```

### 2.2 规则定义格式

```yaml
# 示例: secret_patterns.yml
rules:
  - id: ETHOS-SEC-001
    name: "OpenAI API Key 泄露"
    category: "security"
    severity: "CRITICAL"
    pattern:
      regex: "sk-[a-zA-Z0-9]{48}"
      context_window: 20
    description: "检测到 OpenAI API Key 格式字符串"
    remediation: "请立即在对应平台撤销此 Key，并使用环境变量或密钥管理服务存储"
    false_positive_hints: ["示例", "文档", "占位符"]

  - id: ETHOS-SEC-002
    name: "Stripe 密钥泄露"
    category: "security"
    severity: "CRITICAL"
    pattern:
      regex: "sk_(live|test)_[0-9a-zA-Z]{24,}"
    description: "检测到 Stripe Secret Key"
    remediation: "请立即在 Stripe Dashboard 中撤销此密钥"

  - id: ETHOS-CON-001
    name: "仇恨言论检测"
    category: "content"
    severity: "BLOCK"
    pattern:
      type: "ml_model"
      model: "toxicity-classifier-v3"
      threshold: 0.85
    description: "检测到可能含有仇恨言论的内容"
    remediation: "请修改内容，确保语言尊重且包容"
```

---

## 三、风险等级定义

### 3.1 四级风险模型

| 等级 | 名称 | 颜色标识 | 处理方式 | 通知对象 |
|------|------|----------|----------|----------|
| `INFO` | 信息 | 蓝色 | 记录日志，不拦截 | 仅系统记录 |
| `WARNING` | 警告 | 黄色 | 记录并提示，允许继续 | 学生 + 系统 |
| `CRITICAL` | 严重 | 红色 | 拦截操作，需人工确认 | 学生 + 导师 |
| `BLOCK` | 阻断 | 红色 | 直接阻断，禁止执行 | 学生 + 导师 + 管理员 |

### 3.2 风险等级升级规则

```yaml
escalation_rules:
  single_block: "立即阻断"
  
  warning_to_critical:
    window_minutes: 10
    threshold: 3
    action: "升级并通知导师"
  
  critical_freeze:
    window_minutes: 60
    threshold: 2
    action: "冻结30分钟，通知导师"
  
  school_alert:
    condition: "单日同校 BLOCK 事件 > 10"
    action: "通知学校管理员"
```

---

## 四、人工复核触发条件

### 4.1 自动触发复核的场景

| 场景 | 触发条件 | 复核人 | 时限 |
|------|----------|--------|------|
| 内容安全争议 | 模型置信度 0.6-0.85 | 平台审核员 | 24小时 |
| 学术诚信边缘 | 原创度 30%-50% | 导师 | 48小时 |
| 隐私政策模糊 | 涉及新类型数据收集 | 法务/合规 | 72小时 |
| 公平性质疑 | 群体差异指标异常 | 教育专家 | 72小时 |
| 密钥泄露 | 任何 CRITICAL | 安全团队 | 立即 |

### 4.2 复核工作流

```
触发 -> 排队 -> 分配 -> 复核 -> 归档
         |        |        |
         v        v        v
      优先级   自动推荐   判定选项
      排序     判定       通过/驳回
               理由       备注
```

---

## 五、Tools 定义

### 5.1 check_privacy_policy — 隐私政策合规

审查学生项目的隐私政策或数据处理行为是否符合规范。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "check_privacy_policy_input",
  "required": ["content_type"],
  "oneOf": [
    {
      "required": ["policy_text"],
      "properties": {
        "content_type": { "type": "string", "enum": ["policy_text"] },
        "policy_text": {
          "type": "string",
          "description": "隐私政策全文",
          "minLength": 50,
          "maxLength": 50000
        }
      }
    },
    {
      "required": ["data_practices"],
      "properties": {
        "content_type": { "type": "string", "enum": ["data_practices"] },
        "data_practices": {
          "type": "object",
          "description": "数据处理实践描述",
          "properties": {
            "collects_personal_data": { "type": "boolean" },
            "data_types": {
              "type": "array",
              "items": { "type": "string" }
            },
            "data_retention_days": { "type": "integer" },
            "third_party_sharing": { "type": "boolean" },
            "has_opt_out": { "type": "boolean" },
            "has_data_deletion": { "type": "boolean" },
            "target_audience": { "type": "string" }
          }
        }
      }
    }
  ],
  "properties": {
    "jurisdiction": {
      "type": "string",
      "enum": ["CN", "US", "EU", "global"],
      "default": "CN"
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "check_privacy_policy_output",
  "required": ["overall_status", "findings"],
  "properties": {
    "overall_status": {
      "type": "string",
      "enum": ["COMPLIANT", "NEEDS_IMPROVEMENT", "NON_COMPLIANT"]
    },
    "risk_level": { "type": "string", "enum": ["INFO", "WARNING", "CRITICAL", "BLOCK"] },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["rule_id", "severity", "description"],
        "properties": {
          "rule_id": { "type": "string" },
          "severity": { "type": "string", "enum": ["INFO", "WARNING", "CRITICAL", "BLOCK"] },
          "category": { "type": "string" },
          "description": { "type": "string" },
          "regulation_reference": { "type": "string" },
          "suggestion": { "type": "string" },
          "location": { "type": "string" }
        }
      }
    },
    "compliance_score": { "type": "integer", "minimum": 0, "maximum": 100 },
    "missing_elements": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

---

### 5.2 scan_secrets — 密钥泄露扫描

扫描代码或文本中的敏感凭证泄露。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "scan_secrets_input",
  "required": ["content"],
  "properties": {
    "content": {
      "type": "string",
      "description": "要扫描的文本内容",
      "minLength": 1,
      "maxLength": 100000
    },
    "content_type": {
      "type": "string",
      "enum": ["code", "config", "documentation", "mixed"],
      "default": "mixed"
    },
    "scan_depth": {
      "type": "string",
      "enum": ["quick", "standard", "deep"],
      "default": "standard"
    },
    "custom_patterns": {
      "type": "array",
      "description": "自定义检测模式",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "regex": { "type": "string" }
        }
      },
      "default": []
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "scan_secrets_output",
  "required": ["leaks_found", "findings"],
  "properties": {
    "leaks_found": { "type": "boolean" },
    "total_findings": { "type": "integer" },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["rule_id", "severity", "secret_type", "matched_text"],
        "properties": {
          "rule_id": { "type": "string" },
          "severity": { "type": "string", "enum": ["INFO", "WARNING", "CRITICAL", "BLOCK"] },
          "secret_type": { "type": "string", "enum": ["api_key", "password", "token", "certificate", "private_key", "database_url", "other"] },
          "matched_text": { "type": "string" },
          "line_number": { "type": "integer" },
          "column_start": { "type": "integer" },
          "column_end": { "type": "integer" },
          "service": { "type": "string" },
          "remediation": { "type": "string" },
          "is_test_key": { "type": "boolean" }
        }
      }
    },
    "scan_time_ms": { "type": "integer" }
  }
}
```

---

### 5.3 review_content — 内容安全审查

审查文本或代码注释中的内容安全问题。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "review_content_input",
  "required": ["content"],
  "properties": {
    "content": {
      "type": "string",
      "description": "要审查的文本内容",
      "minLength": 1,
      "maxLength": 50000
    },
    "content_type": {
      "type": "string",
      "enum": ["text", "code_comment", "documentation", "marketing_copy", "social_post"],
      "default": "text"
    },
    "context": {
      "type": "string",
      "description": "内容的使用场景上下文",
      "nullable": true
    },
    "check_categories": {
      "type": "array",
      "description": "要检查的类别",
      "items": {
        "type": "string",
        "enum": ["hate_speech", "harassment", "misinformation", "self_harm", "violence", "sexual_content", "spam", "discrimination"]
      },
      "default": []
    },
    "student_age_group": {
      "type": "string",
      "enum": ["under_13", "13_17", "18_plus"]
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "review_content_output",
  "required": ["safe", "risk_level", "findings"],
  "properties": {
    "safe": { "type": "boolean" },
    "risk_level": { "type": "string", "enum": ["INFO", "WARNING", "CRITICAL", "BLOCK"] },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["category", "severity", "description"],
        "properties": {
          "category": { "type": "string" },
          "severity": { "type": "string", "enum": ["INFO", "WARNING", "CRITICAL", "BLOCK"] },
          "description": { "type": "string" },
          "location": { "type": "string", "description": "问题位置" },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "suggested_rewrite": { "type": "string", "nullable": true }
        }
      }
    },
    "overall_assessment": { "type": "string" },
    "review_time_ms": { "type": "integer" }
  }
}
```

---

### 5.4 detect_plagiarism — 抄袭检测

检测文本的原创度，识别潜在的抄袭行为。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "detect_plagiarism_input",
  "required": ["content"],
  "properties": {
    "content": {
      "type": "string",
      "description": "待检测的文本内容",
      "minLength": 50,
      "maxLength": 50000
    },
    "content_type": {
      "type": "string",
      "enum": ["essay", "code", "report", "presentation", "business_plan"],
      "default": "essay"
    },
    "reference_sources": {
      "type": "array",
      "description": "学生声明的引用来源",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "url": { "type": "string" },
          "citation_style": { "type": "string", "enum": ["apa", "mla", "chicago", "gb7714"] }
        }
      },
      "default": []
    },
    "comparison_scope": {
      "type": "string",
      "enum": ["platform_only", "internet", "academic_db"],
      "default": "platform_only",
      "description": "比对范围"
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "detect_plagiarism_output",
  "required": ["originality_score", "verdict"],
  "properties": {
    "originality_score": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "原创度得分 (0-100)"
    },
    "verdict": {
      "type": "string",
      "enum": ["original", "suspicious", "plagiarized"]
    },
    "matches": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "source_id": { "type": "string" },
          "source_title": { "type": "string" },
          "source_url": { "type": "string" },
          "similarity_percent": { "type": "number" },
          "matched_text": { "type": "string" },
          "location_in_submission": { "type": "string" },
          "location_in_source": { "type": "string" }
        }
      }
    },
    "citation_analysis": {
      "type": "object",
      "properties": {
        "total_citations": { "type": "integer" },
        "missing_citations": { "type": "integer" },
        "format_issues": { "type": "integer" }
      }
    },
    "ai_generated_probability": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "AI生成概率"
    }
  }
}
```

---

### 5.5 fairness_audit — 公平性审计

检测 AI 生成内容或决策中的偏见问题。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "fairness_audit_input",
  "required": ["content"],
  "properties": {
    "content": {
      "type": "string",
      "description": "待审计的文本或决策描述",
      "minLength": 10,
      "maxLength": 20000
    },
    "content_type": {
      "type": "string",
      "enum": ["marketing_copy", "job_description", "user_persona", "decision_criteria", "survey_questions"],
      "description": "内容类型"
    },
    "audit_dimensions": {
      "type": "array",
      "description": "审计维度",
      "items": {
        "type": "string",
        "enum": ["gender", "age", "race", "disability", "socioeconomic", "geographic", "cultural"]
      },
      "default": ["gender", "age", "race", "disability"]
    },
    "target_audience": {
      "type": "string",
      "description": "目标受众描述",
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
  "title": "fairness_audit_output",
  "required": ["fairness_score", "bias_detected", "findings"],
  "properties": {
    "fairness_score": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "公平性得分 (0-100)"
    },
    "bias_detected": { "type": "boolean" },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["dimension", "severity", "description"],
        "properties": {
          "dimension": { "type": "string" },
          "severity": { "type": "string", "enum": ["INFO", "WARNING", "CRITICAL", "BLOCK"] },
          "description": { "type": "string" },
          "location": { "type": "string" },
          "biased_phrase": { "type": "string" },
          "suggested_alternative": { "type": "string" },
          "confidence": { "type": "number" }
        }
      }
    },
    "inclusive_language_suggestions": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

---

## 六、错误码汇总

| 错误码 | 名称 | 描述 |
|--------|------|------|
| `ETH-0000` | `SUCCESS` | 审计通过 |
| `ETH-1001` | `CONTENT_TOO_SHORT` | 内容过短，无法有效审计 |
| `ETH-1002` | `CONTENT_TOO_LONG` | 内容超过最大长度限制 |
| `ETH-1003` | `ML_MODEL_UNAVAILABLE` | AI审查模型暂时不可用 |
| `ETH-2001` | `RULE_CONFLICT` | 规则冲突，需人工判定 |
| `ETH-5001` | `INTERNAL_ERROR` | 审计系统内部错误 |

---

## 七、附录

### 7.1 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `OHB_ETHOS_RULES_PATH` | `./ethos-rules` | 规则库路径 |
| `OHB_ETHOS_ML_ENDPOINT` | — | AI审查模型端点 |
| `OHB_ETHOS_PORT` | `8084` | MCP Server 端口 |

### 7.2 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v0.1 | 2026-05-17 | 初稿，定义5个tools及审计规则架构 |
