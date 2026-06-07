"""OPS AI 对手 — 占位"""

from typing import Any


def generate_ai_decision(team_state: dict[str, Any], cfg: dict[str, Any]) -> dict[str, Any]:
    """零 Token 规则 AI。"""
    return {
        "production": 100,
        "price": 50,
        "channels": {"online": 0.5, "offline": 0.5},
        "marketing": 20,
    }
