"""市场定价配置 — FST / FStrading（RTS，PRD-FST §9）"""

from __future__ import annotations

from typing import Any, Dict, Optional

from app.domains.cybercore.registry import get_game_config
from app.games.trading.constants import DEFAULT_TRADING_CONFIG_ID


def get_pricing_config(config_id: str = DEFAULT_TRADING_CONFIG_ID) -> Dict[str, Any]:
    doc = get_game_config(config_id)
    defaults = doc.defaults or {}
    pricing = defaults.get("pricing") or {}
    return {
        "mode": pricing.get("mode", "pool_ask_bid"),
        "elasticity": float(pricing.get("elasticity", 0.12)),
        "min_spread": float(pricing.get("min_spread", 0.08)),
        "reference_pool": float(pricing.get("reference_pool", 100)),
        "absorption_cap_per_tick": int(pricing.get("absorption_cap_per_tick", 25)),
        "natural_flow_scale": float(pricing.get("natural_flow_scale", 0.20)),
        "pool_reversion_rate": float(pricing.get("pool_reversion_rate", 0.03)),
        "min_pool_ratio": float(pricing.get("min_pool_ratio", 0.10)),
    }


def strip_price_snapshot(snapshot: Optional[dict]) -> Dict[str, Dict[str, int]]:
    """去掉 _market_meta / _rts，只保留城市→商品→价格。"""
    if not snapshot:
        return {}
    return {
        k: v
        for k, v in snapshot.items()
        if k not in ("_market_meta", "_rts") and isinstance(v, dict)
    }
