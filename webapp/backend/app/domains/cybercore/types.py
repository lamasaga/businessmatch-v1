"""CyberCore 配置类型"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RewardTier(BaseModel):
    participate: int = 100
    top50_bonus: int = 100
    top20_bonus: int = 200
    first_place_bonus: int = 500


class GameConfigDocument(BaseModel):
    id: str
    engine: str
    design_mode: str = "standalone"
    version: str = "1.0.0"
    meta: Dict[str, Any] = Field(default_factory=dict)
    defaults: Dict[str, Any] = Field(default_factory=dict)
    products: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    cities: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    event_types: List[Dict[str, Any]] = Field(default_factory=list)
    rewards: Dict[str, RewardTier] = Field(default_factory=dict)

    def merged_match_config(self, overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        base = dict(self.defaults)
        if overrides:
            base.update(overrides)
        return base
