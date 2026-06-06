"""产销运营赛 — 结算内核入口

TODO(Phase A→B):
- [ ] 定义单轮决策 schema（生产量、定价、渠道分配、广告投入）
- [ ] 实现市场需求计算（按 POP 分群 + 价格弹性）
- [ ] 实现库存与物流成本结算
- [ ] 实现团队排名与 XP 载荷生成
"""

from __future__ import annotations

from typing import Any


def settle_round(match_state: dict[str, Any], decisions: dict[str, Any]) -> dict[str, Any]:
    """结算单轮，返回新状态。幂等：同一 (round_id, decisions_hash) 多次调用结果相同。"""
    raise NotImplementedError("ops-sim settle_round 待实现")


def ai_decision(team_state: dict[str, Any], cfg: dict[str, Any]) -> dict[str, Any]:
    """AI 对手决策生成。零 Token，纯规则。"""
    raise NotImplementedError("ops-sim ai_decision 待实现")
