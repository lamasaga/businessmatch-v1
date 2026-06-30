# 数据库基础与 SQLite

> 数据库是保存数据的地方。本项目用 SQLite，理解它能帮你理解数据是怎么存的。

## 1. 什么是数据库

数据库是按一定结构组织的数据集合。与普通文件相比：

- 查询方便
- 支持多人同时读写
- 保证数据一致性
- 支持事务（要么全成功，要么全失败）

## 2. 关系型数据库

关系型数据库用「表」来存数据：

| id | name | score |
|----|------|-------|
| 1 | Alice | 100 |
| 2 | Bob | 85 |

表与表之间可以建立关系：

- 一个用户有多个比赛记录
- 一个比赛有多个参赛者
- 一个参赛者有多条操作记录

## 3. SQL 是什么

SQL 是操作数据库的语言。

```sql
-- 查询 Alice 的分数
SELECT score FROM users WHERE name = 'Alice';

-- 给 Alice 加 10 分
UPDATE users SET score = score + 10 WHERE name = 'Alice';
```

## 4. SQLite

SQLite 是一个轻量级数据库：

- 整个数据库存放在一个文件里
- 不需要单独安装服务器
- 适合中小型应用
- 本项目使用 `bizsim.db`

优点：

- 部署简单
- 开发方便

缺点：

- 并发写入能力有限
- 不适合超大规模应用

Phase B4  roadmap 中计划迁移到 PostgreSQL。

## 5. SQLAlchemy

本项目用 SQLAlchemy 作为数据库工具：

- 用 Python 类定义表结构
- 自动生成 SQL
- 支持事务
- 支持关系映射

```python
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    score = Column(Integer)
```

## 6. 表与域的对应

| 域 | 表 |
|----|----|
| identity | users |
| arena | competition_events, competition_participants, arena_teams |
| trading | trading_rounds, trading_decisions, trading_prices |
| techventure | tv_team_state, tv_rounds, tv_submissions |
| career | xp_events |

## 7. 迁移

数据库结构变更时需要迁移：

- 当前项目用 `app/db/migrate_schema.py`
- 首次运行用 `app/db/init_db.py`
- Phase B4 计划引入 Alembic

## 8. 与 AI 沟通示例

```
我要为 TechVenture 增加一个「团队投票记录」表。
需求：
- 字段：id、team_id、round、choice、created_at
- 与 tv_team_state 外键关联
- 每轮每个团队只能有一条记录
- 请在 techventure 域内新增模型，不要改 arena 表
请用 SQLAlchemy 2.0 风格定义模型并写迁移脚本。
```

## 最后更新

2026-06-14
