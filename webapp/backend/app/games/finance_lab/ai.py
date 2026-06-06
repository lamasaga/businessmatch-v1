"""金融投研实验室 — AI 对手（纯规则，零 Token）"""

from __future__ import annotations

from typing import Any


def generate_ai_decision(team_state: dict[str, Any], cfg: dict[str, Any]) -> dict[str, Any]:
    """根据当前状态生成 AI 决策。"""
    return {"orders": [], "research_focus": "macro"}
