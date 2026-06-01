"""RTS 仓储、车辆、移动"""

from __future__ import annotations

from typing import Any, Dict, List, Mapping, Optional, Tuple

from app.games.trading.rts_config import base_travel_ticks, logistics_config, vehicle_defs


def inventory_volume_used(inventory: Mapping[str, int], products: Dict[str, Dict[str, Any]]) -> int:
    total = 0
    for pid, qty in (inventory or {}).items():
        vol = int(products.get(pid, {}).get("volume", 1))
        total += int(qty) * vol
    return total


def storage_capacity(
    config: Dict[str, Any],
    vehicles: List[str],
    config_id: str,
) -> int:
    base = int(config.get("storage_capacity_base", 99))
    defs = vehicle_defs(config, config_id)
    bonus = sum(int(defs.get(v, {}).get("capacity_bonus", 0)) for v in vehicles)
    return base + bonus


def speed_bonus(vehicles: List[str], config_id: str, config: Dict[str, Any]) -> int:
    defs = vehicle_defs(config, config_id)
    return sum(int(defs.get(v, {}).get("speed_bonus", 0)) for v in vehicles)


def effective_travel_ticks(
    from_city: str,
    to_city: str,
    config: Dict[str, Any],
    vehicles: List[str],
    config_id: str,
) -> int:
    routes = config.get("routes") or {}
    base = base_travel_ticks(from_city, to_city, routes)
    lg = logistics_config(config)
    sb = speed_bonus(vehicles, config_id, config)
    return max(lg["min_travel_ticks"], base - sb)


def move_cash_cost(
    config: Dict[str, Any],
    from_city: Optional[str] = None,
    to_city: Optional[str] = None,
) -> int:
    default = logistics_config(config)["move_cost_per_edge"]
    if from_city and to_city and from_city != to_city:
        from app.games.trading.world_slice import edge_move_cost

        routes = config.get("routes") or {}
        return edge_move_cost(from_city, to_city, routes, default)
    return default


def can_add_inventory(
    inventory: Dict[str, int],
    product_id: str,
    quantity: int,
    products: Dict[str, Dict[str, Any]],
    capacity: int,
) -> Tuple[bool, str]:
    used = inventory_volume_used(inventory, products)
    vol = int(products.get(product_id, {}).get("volume", 1))
    need = vol * quantity
    if used + need > capacity:
        return False, f"仓储空间不足（已用 {used}/{capacity} 格，需要 {need} 格）"
    return True, ""


def player_can_trade(transit: Optional[Dict[str, Any]], tick: int) -> bool:
    if not transit:
        return True
    arrival = int(transit.get("arrival_tick", 0))
    return tick >= arrival


def max_vehicles(config: Dict[str, Any]) -> int:
    return int(config.get("max_vehicles_per_player", 3))
