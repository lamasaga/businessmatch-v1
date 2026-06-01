"""体验营 teaching_groups API 冒烟测试"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal
from app.db.init_db import init_database
from app.models.user import User
from app.core.security import get_password_hash


@pytest.fixture(scope="module", autouse=True)
def _setup_db():
    init_database()


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def _token_for(client: TestClient, username: str, password: str) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    assert res.status_code == 200, res.text
    return res.json()["data"]["tokens"]["access_token"]


def test_teaching_group_create_join_flow(client: TestClient):
    admin_token = _token_for(client, "admin", "admin123")
    student_token = _token_for(client, "student", "student123")

    create = client.post(
        "/api/v1/teaching-groups",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "pytest 体验营", "description": "auto"},
    )
    assert create.status_code == 201, create.text
    body = create.json()["data"]
    assert len(body["invite_code"]) == 6
    group_id = body["id"]

    join = client.post(
        "/api/v1/teaching-groups/join",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"invite_code": body["invite_code"]},
    )
    assert join.status_code == 200, join.text

    joined = client.get(
        "/api/v1/teaching-groups/joined",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert joined.status_code == 200
    ids = [g["id"] for g in joined.json()["data"]]
    assert group_id in ids

    event = client.post(
        "/api/v1/competitions",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "pytest 营内赛",
            "game_config_id": "fstrading",
            "game_type": "trading",
            "teaching_group_id": group_id,
            "config": {"mode": "rts", "duration_preset": "short"},
        },
    )
    assert event.status_code == 200, event.text
    assert event.json()["data"]["teaching_group_id"] == group_id
    assert len(event.json()["data"]["room_code"]) == 4
