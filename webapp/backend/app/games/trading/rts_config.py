"""RTS 赛制配置解析"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

from app.domains.cybercore.registry import get_game_config
from app.games.trading.constants import DEFAULT_TRADING_CONFIG_ID


def is_rts_mode(config: Dict[str, Any] | None) -> bool:
    return (config or {}).get("mode") == "rts"


def load_rts_world(config_id: str = DEFAULT_TRADING_CONFIG_ID):
    doc = get_game_config(config_id)
    return doc.products, doc.cities, doc.event_types, doc.defaults


def resolve_match_config(event_config: Dict[str, Any], config_id: str = DEFAULT_TRADING_CONFIG_ID) -> Dict[str, Any]:
    doc = get_game_config(config_id)
    return doc.merged_match_config(event_config)


def product_catalog(config: Dict[str, Any], config_id: str) -> Dict[str, Dict[str, Any]]:
    products, _, _, _ = load_rts_world(config_id)
    keys = config.get("products", list(products.keys()))
    return {k: products[k] for k in keys if k in products}


def city_catalog(config: Dict[str, Any], config_id: str) -> Dict[str, Dict[str, Any]]:
    """对局城市表：以赛制母本为准，剔除已废弃 id（如 wuxi），补全新城（如 hangzhou）。"""
    _, cities, _, _ = load_rts_world(config_id)
    canonical = list(cities.keys())
    keys: List[str] = list(config.get("cities") or canonical)
    keys = [k for k in keys if k in cities]
    for cid in canonical:
        if cid not in keys:
            keys.append(cid)
    return {k: cities[k] for k in keys}


def route_key(a: str, b: str) -> str:
    if a > b:
        a, b = b, a
    return f"{a}-{b}"


def base_travel_ticks(
    from_city: str,
    to_city: str,
    routes: Dict[str, Any],
    default: int = 5,
) -> int:
    if from_city == to_city:
        return 0
    key = route_key(from_city, to_city)
    edge = routes.get(key) or routes.get(f"{to_city}-{from_city}")
    if edge:
        return int(edge.get("base_travel_ticks", default))
    return default


def vehicle_defs(config: Dict[str, Any], config_id: str) -> Dict[str, Dict[str, Any]]:
    doc = get_game_config(config_id)
    return doc.vehicles or {}


def pricing_config(config: Dict[str, Any]) -> Dict[str, Any]:
    p = config.get("pricing") or {}
    return {
        "min_spread": float(p.get("min_spread", 0.08)),
        "elasticity": float(p.get("elasticity", 0.12)),
        "reference_pool": float(p.get("reference_pool", 100)),
        "absorption_cap_per_tick": int(p.get("absorption_cap_per_tick", 25)),
        "natural_flow_scale": float(p.get("natural_flow_scale", 0.20)),
        "pool_reversion_rate": float(p.get("pool_reversion_rate", 0.03)),
        "min_pool_ratio": float(p.get("min_pool_ratio", 0.10)),
    }


def logistics_config(config: Dict[str, Any]) -> Dict[str, Any]:
    lg = config.get("logistics") or {}
    return {
        "min_travel_ticks": int(lg.get("min_travel_ticks", lg.get("min_travel_days", 2))),
        "move_cost_per_edge": int(lg.get("move_cost_per_edge", 800)),
    }
