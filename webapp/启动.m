# 商域 BizSim Edu — 项目启动指南

> 本文档记录项目的启动方式，方便快速开发和演示。

---

## 📁 项目路径

```
D:\1XFAwork\businessmatch-v1\webapp
```

---

## 🧩 项目结构

```
webapp/
├── frontend/          # React + Vite 前端
├── backend/           # FastAPI + SQLite 后端
├── docker-compose.yml # Docker 一键部署
└── 启动.m             # 本文件
```

---

## 🚀 方式一：手动启动（开发模式）

### 1. 启动后端

打开 PowerShell 或终端，执行：

```powershell
cd "D:\1XFAwork\businessmatch-v1\webapp\backend"

# 首次：创建虚拟环境（如已创建可跳过）
python -m venv venv

# 安装依赖（如已安装可跳过）
.\venv\Scripts\pip install -r requirements.txt

# 启动后端服务
.\venv\Scripts\python run.py
```

- 后端地址：**http://localhost:8000**
- API 文档：**http://localhost:8000/docs**

### 2. 启动前端

另开一个终端窗口，执行：

```powershell
cd "D:\1XFAwork\businessmatch-v1\webapp\frontend"

# 首次：安装依赖（如已安装可跳过）
npm install

# 启动前端开发服务器
npm run dev
```

- 前端地址：**http://localhost:5173**

### 3. 访问系统

浏览器打开 **http://localhost:5173**

默认测试账户：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员/组织者 |
| student | student123 | 学生 |

---

## 🚀 方式二：一键启动（推荐）

在 `webapp` 目录任选一种方式（**不要用 `py` 运行 `.ps1`**，否则会报 Python 语法错误）：

```powershell
cd "D:\1XFAwork\businessmatch-v1\webapp"
.\启动.ps1
```

或双击 **`启动.bat`**（自动调用 PowerShell / pwsh）。

将依次打开三个窗口：后端 `:8000`、学生端 `:5173`、组织者端 `:5174`。

---

## 🐳 方式三：Docker 部署

确保已安装 Docker Desktop，然后在项目根目录执行：

```powershell
cd "D:\1XFAwork\businessmatch-v1\webapp"
docker-compose up -d
```

- 前端：**http://localhost**
- 后端：**http://localhost:8000**

停止服务：

```powershell
docker-compose down
```

---

## 📋 环境要求

| 环境 | 版本要求 | 当前版本 |
|------|---------|---------|
| Node.js | >= 20 | v24.13.1 |
| npm | >= 10 | 11.8.0 |
| Python | >= 3.11 | 3.11.9 |

---

## 🔧 常用命令速查

```powershell
# 前端
npm install          # 安装依赖
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm run lint         # 代码检查

# 后端
python -m venv venv              # 创建虚拟环境
.\venv\Scripts\pip install -r requirements.txt   # 安装依赖
.\venv\Scripts\python run.py     # 启动服务
.\venv\Scripts\python -m pytest  # 运行测试（如有）

# Docker
docker-compose up -d     # 启动
docker-compose down      # 停止
docker-compose logs -f   # 查看日志
```

---

## 🗺️ 核心页面导航

启动后可通过以下路径访问主要功能：

| 功能 | 路径 |
|------|------|
| 登录/注册 | `/login` |
| 生涯中枢 | `/career` |
| 商赛大厅 | `/games` |
| 交易游戏 | `/games/:id/play` |
| 创建比赛 | `/organizer/events/create` |
| 知识图谱 | `/wiki` |
| 课程学院 | `/courses` |
| 每日任务 | `/quests` |
| 成就中心 | `/achievements` |
| 国富论游戏 | `/wealth-of-nations` |
| 一人公司 | `/opc` |

---

> 文档生成时间：2026-05-19
