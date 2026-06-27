# Webapp 启动说明

> 适用目录：`D:\1XFAwork\businessmatch-v1`
> 最后更新：2026-06-16

本文档用于快速启动本项目的主应用 `webapp`，包括后端、学生端和教师端。

## 一、推荐方式：一键启动

在 PowerShell 中执行：

```powershell
cd D:\1XFAwork\businessmatch-v1\webapp
.\启动.ps1
```

启动脚本会依次打开三个服务窗口：

| 服务 | 地址 | 说明 |
|---|---|---|
| 后端 FastAPI | `http://localhost:8000` | API 服务 |
| 学生端 | `http://localhost:5173` | 学生登录、练习赛、比赛局内页 |
| 教师端 | `http://localhost:5174` | 教师/组织者控场端 |

后端健康检查：

```text
http://localhost:8000/health
```

## 二、测试账号

| 角色 | 用户名 | 密码 |
|---|---|---|
| 学生 | `student` | `student123` |
| 教师/管理员 | `admin` | `admin123` |

## 三、手动启动方式

如果一键脚本失败，可以分别打开三个 PowerShell 窗口启动。

### 1. 启动后端

```powershell
cd D:\1XFAwork\businessmatch-v1\webapp\backend
.\venv\Scripts\python run.py
```

如果 `venv` 不存在，先创建并安装依赖：

```powershell
cd D:\1XFAwork\businessmatch-v1\webapp\backend
python -m venv venv
.\venv\Scripts\python -m pip install -r requirements.txt
.\venv\Scripts\python run.py
```

后端默认监听：

```text
http://localhost:8000
```

### 2. 启动学生端

```powershell
cd D:\1XFAwork\businessmatch-v1\webapp\frontend
npm install
npm run dev
```

学生端默认监听：

```text
http://localhost:5173
```

### 3. 启动教师端

```powershell
cd D:\1XFAwork\businessmatch-v1\webapp\organizer-frontend
npm install
npm run dev
```

教师端默认监听：

```text
http://localhost:5174
```

## 四、OPS 测试入口

本轮重点测试 OPS 产销运营赛。

学生端：

```text
http://localhost:5173
```

教师端：

```text
http://localhost:5174
```

建议先测试：

1. 学生登录 `student / student123`
2. 进入商赛大厅或练习入口
3. 开始 OPS 练习赛
4. 跑通流程：

```text
positioning
-> auction_a
-> R1
-> R2
-> R3
-> auction_b
-> R4
-> R5
-> R6
-> finished
```

正式赛测试建议：

1. 教师端登录 `admin / admin123`
2. 创建 OPS 正式赛
3. 学生端使用房间码加入
4. 教师端推进阶段
5. 检查每轮 20 分钟倒计时、提交截止和最终结算

## 五、常见问题

### 端口被占用

检查 8000、5173、5174 是否被占用：

```powershell
Get-NetTCPConnection -LocalPort 8000,5173,5174 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

查看对应进程：

```powershell
Get-Process -Id <OwningProcess>
```

结束占用进程：

```powershell
Stop-Process -Id <OwningProcess>
```

### 后端启动失败：venv 指向旧 Python

如果看到类似：

```text
No Python at '...\Python312\python.exe'
```

说明 `webapp/backend/venv` 是旧环境。可以删除并重建：

```powershell
cd D:\1XFAwork\businessmatch-v1\webapp\backend
Remove-Item -Recurse -Force .\venv
python -m venv venv
.\venv\Scripts\python -m pip install -r requirements.txt
.\venv\Scripts\python run.py
```

### 前端依赖缺失

如果 `npm run dev` 报找不到依赖：

```powershell
cd D:\1XFAwork\businessmatch-v1\webapp\frontend
npm install
npm run dev
```

教师端同理：

```powershell
cd D:\1XFAwork\businessmatch-v1\webapp\organizer-frontend
npm install
npm run dev
```

### 浏览器仍显示旧页面

可以尝试：

```text
Ctrl + F5
```

或关闭旧的 Vite 窗口后重新启动前端。

## 六、构建验证

后端 OPS 单测：

```powershell
cd D:\1XFAwork\businessmatch-v1\webapp\backend
python -m pytest tests/test_ops_economy_engine.py -q
```

学生端构建：

```powershell
cd D:\1XFAwork\businessmatch-v1\webapp\frontend
npm run build
```

教师端构建：

```powershell
cd D:\1XFAwork\businessmatch-v1\webapp\organizer-frontend
npm run build
```

OpenAPI 契约导出：

```powershell
cd D:\1XFAwork\businessmatch-v1\webapp
python scripts\export_openapi.py
```

## 七、Docker 启动

类生产环境可使用 Docker：

```powershell
cd D:\1XFAwork\businessmatch-v1\webapp
docker compose up -d --build
```

访问：

| 服务 | 地址 |
|---|---|
| 学生端 | `http://localhost` |
| 教师端 | `http://localhost:5174` |
| 后端 API | `http://localhost:8000` |

