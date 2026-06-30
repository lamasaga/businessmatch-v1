"""CyberCore 配置类型"""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class RewardTier(BaseModel):
    participate: int = 100
    top50_bonus: int = 100
    top20_bonus: int = 200
    first_place_bonus: int = 500


class GameConfigDocument(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    engine: str
    design_mode: str = "standalone"
    version: str = "1.0.0"
    meta: Dict[str, Any] = Field(default_factory=dict)
    defaults: Dict[str, Any] = Field(default_factory=dict)
    products: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    cities: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    vehicles: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    routes: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    # trading/techventure 为列表；ops_sim 为 id -> 定义 的字典
    event_types: Union[List[Dict[str, Any]], Dict[str, Dict[str, Any]]] = Field(default_factory=list)
    product_categories: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    consumer_segments: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    auction_items: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    scoring_weights: Dict[str, float] = Field(default_factory=dict)
    rewards: Dict[str, RewardTier] = Field(default_factory=dict)

    def merged_match_config(self, overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        base = dict(self.defaults)
        if overrides:
            base.update(overrides)
        if base.get("mode") == "rts":
            # FST 3.2：PRD 对外用 day_*，运行时内部仍映射为 tick_*（见 docs/prd/PRD-FST.md §3.3）
            if base.get("day_interval_sec") is not None:
                base.setdefault("tick_interval_sec", int(base["day_interval_sec"]))
            if base.get("warmup_days") is not None:
                base.setdefault("warmup_ticks", int(base["warmup_days"]))
            if base.get("total_days") is not None:
                base.setdefault("total_ticks", int(base["total_days"]))
            presets = base.get("duration_presets") or {}
            preset_key = base.get("duration_preset") or "standard"
            if preset_key in presets:
                p = presets[preset_key]
                if p.get("days") is not None:
                    base["total_ticks"] = int(p["days"])
                else:
                    base["total_ticks"] = int(p.get("total_ticks", 150))
                base["duration_minutes"] = int(p.get("minutes", 10))
            else:
                base.setdefault("total_ticks", int(base.get("total_days", 150)))
                base.setdefault("duration_minutes", 10)
            base.setdefault("tick_interval_sec", int(base.get("day_interval_sec", 4)))
            base.setdefault("warmup_ticks", int(base.get("warmup_days", 6)))
            base.setdefault("start_date", "07-01")
        return base
