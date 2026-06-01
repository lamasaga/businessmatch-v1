"""沙盒用简化市场模拟（非 Arena 正式路径）"""

from __future__ import annotations

import random
from typing import Any, Dict, List, Mapping, Tuple

from app.domains.cybercore.registry import get_game_config


def aggregate_trades(
    decisions: list,
    participant_city: Mapping[int | str, str],
) -> Dict[str, Dict[str, Dict[str, int]]]:
    activity: Dict[str, Dict[str, Dict[str, int]]] = {}
    for d in decisions:
        action = d.action_type.value if hasattr(d.action_type, "value") else str(d.action_type)
        data = d.action_data or {}
        city = data.get("trade_city") or participant_city.get(d.participant_id)
        if not city:
            continue
        activity.setdefault(city, {})
        if action == "buy":
            pid = data.get("product_id")
            qty = int(data.get("quantity") or 0)
            if pid and qty > 0:
                slot = activity[city].setdefault(pid, {"buy": 0, "sell": 0})
                slot["buy"] += qty
        elif action == "sell":
            pid = data.get("product_id")
            qty = int(data.get("quantity") or 0)
            if pid and qty > 0:
                slot = activity[city].setdefault(pid, {"buy": 0, "sell": 0})
                slot["sell"] += qty
    return activity


def calculate_equilibrium_prices(
    base_products: dict,
    cities: list,
    cities_meta: dict,
) -> Tuple[dict, dict]:
    prices: Dict[str, Dict[str, int]] = {}
    meta: Dict[str, Dict[str, dict]] = {}
    for city_key in cities:
        prices[city_key] = {}
        meta[city_key] = {}
        for pid, prod in base_products.items():
            base = int(prod["base_price"])
            price = max(prod["price_range"][0], min(prod["price_range"][1], base))
            prices[city_key][pid] = price
            meta[city_key][pid] = {"buy_qty": 0, "sell_qty": 0, "net_demand": 0, "pressure": 0.0}
    return prices, meta


def calculate_market_prices(
    base_products: dict,
    cities: list,
    cities_meta: dict,
    decisions: list,
    participant_city: Mapping[int | str, str],
    events: list,
    *,
    elasticity: float = 0.12,
    ref_vol: float = 10.0,
) -> Tuple[dict, dict]:
    activity = aggregate_trades(decisions, participant_city)
    prices: Dict[str, Dict[str, int]] = {}
    meta: Dict[str, Dict[str, dict]] = {}
    for city_key in cities:
        prices[city_key] = {}
        meta[city_key] = {}
        city_activity = activity.get(city_key, {})
        for pid, prod in base_products.items():
            base = int(prod["base_price"])
            slot = city_activity.get(pid, {"buy": 0, "sell": 0})
            net_demand = slot["buy"] - slot["sell"]
            pressure = max(-1.0, min(1.0, net_demand / ref_vol))
            price = int(base * (1.0 + elasticity * pressure))
            price = max(prod["price_range"][0], min(prod["price_range"][1], price))
            prices[city_key][pid] = price
            meta[city_key][pid] = {
                "buy_qty": slot["buy"],
                "sell_qty": slot["sell"],
                "net_demand": net_demand,
                "pressure": round(pressure, 3),
            }
    return prices, meta


def generate_market_events(
    step: int,
    cities: list,
    products: dict,
    config_id: str,
) -> list:
    doc = get_game_config(config_id)
    event_types = doc.event_types or []
    if not event_types or not cities:
        return []
    num = 0 if step <= 1 else (1 if step <= 4 else random.randint(1, 2))
    events = []
    for _ in range(num):
        template = random.choice(event_types)
        city_key = random.choice(cities)
        targets = template.get("target_products") or list(products.keys())[:2]
        lo, hi = template.get("impact_range", [-0.2, 0.2])
        events.append({
            "type": template.get("type", "news"),
            "name": template.get("name", "市场动态"),
            "description": template.get("desc") or template.get("description", ""),
            "city": city_key,
            "affected_products": targets,
            "impact": round(random.uniform(lo, hi), 2),
        })
    return events
