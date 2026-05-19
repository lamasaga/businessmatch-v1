# 组织者控制台（Organizer Frontend）

> Phase 1 独立入口，端口 **5174**。复用 `webapp/backend` 组织者 / 比赛 / 交易 API。

## 功能

- 登录（演示：`admin` / `admin123`，需已有组织者档案）
- 申请组织者档案
- 创建交易赛 → 房间码
- 控场：开始 / 推进回合 / 结束、实时排行榜

## 启动

```powershell
Set-Location "d:\businessmatch-v1\webapp\organizer-frontend"
npm install
npm run dev
```

　　先启动后端（`webapp/backend`），再访问 http://localhost:5174

## 与学生端协作

| 角色 | 本地 dev | Docker Compose |
|------|----------|----------------|
| 组织者 | http://localhost:5174 | http://localhost:5174 |
| 学生 | http://localhost:5173/games | http://localhost/games |

　　Docker 三端一键启动（在 `webapp/` 目录）：

```powershell
docker compose up -d --build
```
