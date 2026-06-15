# REST API 设计

> 前端和后端通过 API 通信。REST 是一种最常见的 API 设计风格。本文讲它的基本约定。

## 1. 什么是 API

API（Application Programming Interface）是程序之间的接口。

前端通过 API 告诉后端：

- 我要查数据
- 我要提交操作
- 我要修改状态

后端通过 API 返回：

- 你要的数据
- 操作是否成功
- 错误信息

## 2. REST 风格

REST 用 URL 表示资源，用 HTTP 方法表示动作：

| HTTP 方法 | 含义 | 例子 |
|-----------|------|------|
| GET | 获取资源 | `GET /api/v1/competitions` 获取比赛列表 |
| POST | 创建资源 | `POST /api/v1/competitions` 创建比赛 |
| PUT/PATCH | 更新资源 | `PATCH /api/v1/competitions/123` 更新比赛 |
| DELETE | 删除资源 | `DELETE /api/v1/competitions/123` 删除比赛 |

## 3. URL 设计

| URL | 含义 |
|-----|------|
| `/api/v1/competitions` | 比赛集合 |
| `/api/v1/competitions/123` | ID 为 123 的比赛 |
| `/api/v1/competitions/123/participants` | 该比赛的参赛者 |
| `/api/v1/users/me` | 当前登录用户 |

注意：

- 用名词，不用动词（如不用 `/getCompetitions`）
- 用复数
- 版本号放在前面（`/api/v1/`）

## 4. 请求与响应

请求：

```http
GET /api/v1/competitions/123 HTTP/1.1
Authorization: Bearer xxx
```

响应：

```json
{
  "id": 123,
  "name": "夏季挑战赛",
  "status": "running",
  "participants": [...]
}
```

## 5. 状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未登录 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 6. 本项目 API

所有路由挂载在 `webapp/backend/app/main.py`：

```python
app.include_router(competitions.router, prefix="/api/v1")
app.include_router(trading.router, prefix="/api/v1")
app.include_router(techventure_api.router, prefix="/api/v1")
```

API 文档可通过 Swagger 查看：启动后端后访问 `http://localhost:8000/docs`

## 7. 与 AI 沟通示例

```
我要新增一个「获取比赛排行榜」的 API。
需求：
- GET /api/v1/competitions/{id}/leaderboard
- 返回玩家排名、分数、奖励
- 比赛进行中实时更新
- 仅已登录用户可访问
请在 arena 域内实现，返回 Pydantic schema。
```

## 最后更新

2026-06-14
