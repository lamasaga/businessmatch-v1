"""OPS 引擎结算入口 — 占位"""

from __future__ import annotations
from typing import Any


def settle_round(match_state: dict[str, Any], decisions: dict[str, Any], cfg: dict[str, Any]) -> dict[str, Any]:
    """结算单轮。纯函数、幂等、不读写数据库。"""
    raise NotImplementedError("OPS 引擎结算逻辑待实现，参考 PRD-OPS.md")


def ai_decision(team_state: dict[str, Any], cfg: dict[str, Any]) -> dict[str, Any]:
    """AI 对手决策。零 Token，纯规则。"""
    raise NotImplementedError("OPS 引擎 AI 逻辑待实现，参考 PRD-OPS.md")
