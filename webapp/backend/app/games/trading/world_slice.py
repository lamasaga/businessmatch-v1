"""FStrading ↔ 拟真城市内容包 — 贸易切片只读门面（无 World 域表）"""

from __future__ import annotations

from typing import Any, Dict, List

from app.domains.cybercore.world_loader import (
    build_routes_edges,
    load_geo_pack,
    load_trade_slice,
    trade_slice_for_match,
)
from app.domains.cybercore.world_loader import load_region


def region_id_from_config(config: Dict[str, Any], config_id: str = "fstrading") -> str | None:
    world = (config or {}).get("world") or {}
    if world.get("region_id"):
        return str(world["region_id"])
    from app.domains.cybercore.registry import get_game_config

    meta = get_game_config(config_id).meta or {}
    return meta.get("world_region_id")


def world_context_for_match(
    config: Dict[str, Any],
    config_id: str = "fstrading",
) -> Dict[str, Any]:
    """供 RTS state / 地图层消费的 world 摘要。"""
    return trade_slice_for_match(config, config_id)


def geo_pack_for_region(region_id: str) -> Dict[str, Any]:
    return load_geo_pack(region_id)


def routes_dict_for_match(config: Dict[str, Any], config_id: str = "fstrading") -> Dict[str, Any]:
    """兼容历史对局：event.config.routes 为空时，回退到 region 路网。"""
    routes = config.get("routes")
    if isinstance(routes, dict) and len(routes) > 0:
        return routes
    rid = region_id_from_config(config, config_id)
    if not rid:
        return {}
    try:
        region = load_region(str(rid))
    except FileNotFoundError:
        return {}
    out = region.get("routes") or {}
    return out if isinstance(out, dict) else {}


def list_route_edges(config: Dict[str, Any]) -> List[Dict[str, Any]]:
    return build_routes_edges(config.get("routes") or {})


def route_exists(from_city: str, to_city: str, routes: Dict[str, Any]) -> bool:
    if from_city == to_city:
        return True
    if from_city > to_city:
        from_city, to_city = to_city, from_city
    key = f"{from_city}-{to_city}"
    return key in routes or f"{to_city}-{from_city}" in routes


def edge_move_cost(
    from_city: str,
    to_city: str,
    routes: Dict[str, Any],
    default: int,
) -> int:
    if from_city == to_city:
        return 0
    if from_city > to_city:
        from_city, to_city = to_city, from_city
    key = f"{from_city}-{to_city}"
    edge = routes.get(key) or routes.get(f"{to_city}-{from_city}") or {}
    if isinstance(edge, dict) and edge.get("move_cost") is not None:
        return int(edge["move_cost"])
    return default


__all__ = [
    "geo_pack_for_region",
    "list_route_edges",
    "load_trade_slice",
    "region_id_from_config",
    "routes_dict_for_match",
    "route_exists",
    "edge_move_cost",
    "world_context_for_match",
]
