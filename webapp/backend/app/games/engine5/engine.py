"""引擎五 — 结算内核入口占位"""

from __future__ import annotations

from typing import Any


def settle_round(match_state: dict[str, Any], decisions: dict[str, Any]) -> dict[str, Any]:
    raise NotImplementedError("engine5 settle_round 待实现")


def ai_decision(team_state: dict[str, Any], cfg: dict[str, Any]) -> dict[str, Any]:
    raise NotImplementedError("engine5 ai_decision 待实现")
