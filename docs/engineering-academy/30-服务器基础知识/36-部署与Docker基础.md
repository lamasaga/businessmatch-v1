# 部署与 Docker 基础

> 代码写完后要放到服务器上跑起来，这个过程叫部署。Docker 是一种常用的部署工具。

## 1. 什么是部署

部署就是把程序放到目标机器上运行：

- 开发环境：你本地的电脑
- 测试环境：给 QA 测试用
- 生产环境：给用户正式使用

## 2. 传统部署的问题

- "我电脑上能跑，服务器上怎么不行？" —— 环境不一致
- 依赖版本不同
- 配置文件不同
- 手动部署容易出错

## 3. Docker 是什么

Docker 把程序和它需要的所有依赖打包成一个「容器」。

容器特点：

- 包含操作系统、运行环境、代码
- 一次打包，到处运行
- 环境一致
- 启动快

## 4. 核心概念

| 概念 | 说明 |
|------|------|
| 镜像（Image） | 打包好的程序模板 |
| 容器（Container） | 镜像运行起来的实例 |
| Dockerfile | 定义镜像怎么构建 |
| docker-compose.yml | 定义多个容器怎么一起运行 |
| 卷（Volume） | 容器外的持久化存储 |

## 5. 本项目 Docker

项目根目录或 `webapp/` 下有：

- `Dockerfile`：定义后端镜像
- `docker-compose.yml`：定义后端、前端、组织者端如何一起启动

一键启动：

```powershell
cd webapp
docker compose up -d --build
```

## 6. 开发环境 vs 生产环境

| 环境 | 特点 |
|------|------|
| 开发 | 本地热重载，方便调试 |
| 生产 | 性能优先，关闭调试，持久化数据 |

生产部署时要注意：

- 数据库文件要挂载到 Volume，防止容器删除后数据丢失
- 环境变量（如密钥）不要写死
- 日志要收集
- 要监控健康状态

## 7. 常见命令

```bash
# 构建镜像
docker build -t myapp .

# 运行容器
docker run -p 8000:8000 myapp

# 查看运行中的容器
docker ps

# 停止容器
docker stop <container_id>

# 查看日志
docker logs <container_id>
```

## 8. 与 AI 沟通示例

```
我要把新的引擎服务加入 Docker Compose。
需求：
- 后端服务依赖 SQLite 数据库
- 数据库文件挂载到本地 ./data 目录
- 前端和组织者端分别构建
- 生产环境关闭热重载
请更新 webapp/docker-compose.yml 和 Dockerfile。
```

## 最后更新

2026-06-14
