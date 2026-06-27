"""认证与权限单元测试

使用内存 SQLite 数据库，避免污染本地 bizsim.db。
必须在导入 app 模块前设置 DATABASE_URL 环境变量。
"""

import os
import tempfile

# 使用临时文件数据库，避免污染本地 bizsim.db，同时规避 :memory: 多连接隔离问题。
_test_db_path = os.path.join(tempfile.gettempdir(), "bizsim_test_auth.db")
if os.path.exists(_test_db_path):
    os.remove(_test_db_path)
os.environ["DATABASE_URL"] = f"sqlite:///{_test_db_path}"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import engine, Base, SessionLocal
from app.db.init_db import init_database
from app.models.user import User, UserRole
from app.core.security import get_password_hash


@pytest.fixture(scope="session", autouse=True)
def _setup_database():
    """创建所有表并插入默认测试账号。"""
    Base.metadata.create_all(bind=engine)
    init_database()

    db = SessionLocal()
    # 补充教师账号
    db.add(
        User(
            email="teacher@bizsim.edu",
            username="teacher",
            hashed_password=get_password_hash("teacher123"),
            role=UserRole.teacher,
        )
    )
    db.commit()
    db.close()
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _token_for(client: TestClient, username: str, password: str) -> str:
    res = client.post("/api/v1/auth/login", json={"email": username, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["data"]["tokens"]["access_token"]


class TestRegister:
    def test_register_success(self, client: TestClient):
        res = client.post(
            "/api/v1/auth/register",
            json={"email": "new@example.com", "username": "newuser", "password": "newpass123"},
        )
        assert res.status_code == 201
        data = res.json()["data"]
        assert data["user"]["role"] == "student"
        assert "access_token" in data["tokens"]
        assert "refresh_token" in data["tokens"]

    def test_register_duplicate_email(self, client: TestClient):
        res = client.post(
            "/api/v1/auth/register",
            json={"email": "student@bizsim.edu", "username": "unique", "password": "pass123"},
        )
        assert res.status_code == 409
        assert res.json()["success"] is False

    def test_register_duplicate_username(self, client: TestClient):
        res = client.post(
            "/api/v1/auth/register",
            json={"email": "unique@example.com", "username": "student", "password": "pass123"},
        )
        assert res.status_code == 409
        assert res.json()["success"] is False


class TestLogin:
    def test_login_by_email(self, client: TestClient):
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "student@bizsim.edu", "password": "student123"},
        )
        assert res.status_code == 200
        assert res.json()["data"]["user"]["username"] == "student"

    def test_login_by_username(self, client: TestClient):
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "student", "password": "student123"},
        )
        assert res.status_code == 200
        assert res.json()["data"]["user"]["email"] == "student@bizsim.edu"

    def test_login_wrong_password(self, client: TestClient):
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "student@bizsim.edu", "password": "wrongpass"},
        )
        assert res.status_code == 401
        assert res.json()["success"] is False

    def test_login_nonexistent_user(self, client: TestClient):
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "nobody", "password": "wrongpass"},
        )
        assert res.status_code == 401


class TestMeAndRefresh:
    def test_get_me(self, client: TestClient):
        token = _token_for(client, "student", "student123")
        res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert res.json()["data"]["username"] == "student"

    def test_get_me_invalid_token(self, client: TestClient):
        res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid"})
        assert res.status_code == 401

    def test_get_me_no_token(self, client: TestClient):
        res = client.get("/api/v1/auth/me")
        assert res.status_code == 401

    def test_refresh_token(self, client: TestClient):
        login = client.post(
            "/api/v1/auth/login",
            json={"email": "student@bizsim.edu", "password": "student123"},
        )
        refresh_token = login.json()["data"]["tokens"]["refresh_token"]

        res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert res.status_code == 200
        new_access = res.json()["data"]["access_token"]

        me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {new_access}"})
        assert me.status_code == 200

    def test_refresh_invalid_token(self, client: TestClient):
        res = client.post("/api/v1/auth/refresh", json={"refresh_token": "bad"})
        assert res.status_code == 401


class TestRoleAccess:
    def test_student_cannot_create_teaching_group(self, client: TestClient):
        token = _token_for(client, "student", "student123")
        res = client.post(
            "/api/v1/teaching-groups",
            json={"name": "student group"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 403

    def test_teacher_can_create_teaching_group(self, client: TestClient):
        token = _token_for(client, "teacher", "teacher123")
        res = client.post(
            "/api/v1/teaching-groups",
            json={"name": "teacher group"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 201

    def test_admin_can_create_teaching_group(self, client: TestClient):
        token = _token_for(client, "admin", "admin123")
        res = client.post(
            "/api/v1/teaching-groups",
            json={"name": "admin group"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 201
