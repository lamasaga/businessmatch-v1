"""产销运营赛 — 运行时数据模型（Pydantic）

TODO:
- [ ] TeamState：现金、库存、产能、品牌值
- [ ] RoundDecision：生产、定价、渠道、广告
- [ ] MarketResult：各分群销量、市场份额、利润
"""

from pydantic import BaseModel


class OpsTeamState(BaseModel):
    """占位：队伍运行时状态。"""
    pass
