"""产销运营赛 — AI 对手（纯规则，零 Token）"""

from __future__ import annotations

from typing import Any


def generate_ai_decision(team_state: dict[str, Any], cfg: dict[str, Any]) -> dict[str, Any]:
    """根据当前状态生成 AI 决策。"""
    # 占位：返回保守策略
    return {
        "production": 100,
        "price": 50,
        "channels": {"online": 0.5, "offline": 0.5},
        "marketing": 20,
    }
