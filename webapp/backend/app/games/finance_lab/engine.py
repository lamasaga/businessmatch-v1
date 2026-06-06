"""金融投研实验室 — 结算内核入口

TODO(Phase B):
- [ ] 定义资产价格运动模型（随机游走 + 事件冲击）
- [ ] 实现投资组合结算（买入/卖出、手续费、收益）
- [ ] 实现研报评分与市场反馈
- [ ] 实现团队排名与 XP 载荷生成
"""

from __future__ import annotations

from typing import Any


def settle_round(match_state: dict[str, Any], decisions: dict[str, Any]) -> dict[str, Any]:
    """结算单轮。幂等。"""
    raise NotImplementedError("finance-lab settle_round 待实现")


def ai_decision(team_state: dict[str, Any], cfg: dict[str, Any]) -> dict[str, Any]:
    """AI 对手决策。零 Token，纯规则。"""
    raise NotImplementedError("finance-lab ai_decision 待实现")
