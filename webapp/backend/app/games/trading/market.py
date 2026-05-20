"""市场定价 — 由玩家/AI 买卖行为驱动供需（替代随机定价）"""

from __future__ import annotations

from typing import Any, Dict, List, Mapping, Optional, Tuple

from app.domains.cybercore.registry import get_game_config


def get_pricing_config(config_id: str = "trading-v1") -> Dict[str, Any]:
    doc = get_game_config(config_id)
    defaults = doc.defaults or {}
    pricing = defaults.get("pricing") or {}
    return {
        "mode": pricing.get("mode", "market"),
        "elasticity": float(pricing.get("elasticity", 0.08)),
        "reference_volume": float(pricing.get("reference_volume", 10)),
        "sell_spread": float(pricing.get("sell_spread", 0.95)),
        "event_weight": float(pricing.get("event_weight", 0.6)),
    }


def strip_price_snapshot(snapshot: Optional[dict]) -> Dict[str, Dict[str, int]]:
    """去掉 _market_meta，只保留城市→商品→价格。"""
    if not snapshot:
        return {}
    return {
        k: v for k, v in snapshot.items()
        if k != "_market_meta" and isinstance(v, dict)
    }


def city_product_factor(city_info: dict, product_id: str, product: dict) -> float:
    """城市结构性价差（长期供给差异，非随机）"""
    city_type = city_info.get("type", "")
    category = product.get("category", "low")
    factor = 1.0

    if city_type == "political" and category == "high":
        factor += 0.12
    elif city_type == "tech" and product_id == "electronics":
        factor -= 0.18
    elif city_type == "freeport":
        factor -= 0.08
    elif city_type == "border":
        factor += 0.05
    elif city_type == "leisure" and category == "low":
        factor -= 0.10
    elif city_type == "finance" and category == "mid":
        factor += 0.06

    preferred = city_info.get("preferred_products") or []
    if product_id in preferred:
        factor += 0.10

    return factor


def aggregate_trades(
    decisions: list,
    participant_city: Mapping[int, str],
) -> Dict[str, Dict[str, Dict[str, int]]]:
    """
    汇总本回合各城市各商品的买入量（需求）与卖出量（供给）。
    返回 {city: {product_id: {buy, sell}}}
    """
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


def event_demand_shift(events: list, city: str, product_id: str, event_weight: float) -> float:
    """叙事事件对需求曲线的平移（可教学，非纯随机价格波动）"""
    shift = 0.0
    for evt in events or []:
        if product_id not in evt.get("affected_products", []):
            continue
        impact = float(evt.get("impact", 0))
        if evt.get("city") == city:
            shift += impact * event_weight
        else:
            shift += impact * event_weight * 0.25
    return shift


def calculate_equilibrium_prices(
    base_products: dict,
    cities: list,
    cities_meta: dict,
    config_id: str = "trading-v1",
) -> Tuple[dict, dict]:
    """开赛首回合：仅城市基准价，无交易历史。"""
    pricing = get_pricing_config(config_id)
    prices: Dict[str, Dict[str, int]] = {}
    meta: Dict[str, Dict[str, dict]] = {}

    for city_key in cities:
        prices[city_key] = {}
        meta[city_key] = {}
        city_info = cities_meta.get(city_key, {})

        for pid, prod in base_products.items():
            base = int(prod["base_price"])
            factor = city_product_factor(city_info, pid, prod)
            price = int(base * factor)
            min_p, max_p = prod["price_range"]
            price = max(min_p, min(max_p, price))
            prices[city_key][pid] = price
            meta[city_key][pid] = {
                "buy_qty": 0,
                "sell_qty": 0,
                "net_demand": 0,
                "pressure": 0.0,
                "demand_factor": 1.0,
            }

    return prices, meta


def calculate_market_prices(
    base_products: dict,
    cities: list,
    cities_meta: dict,
    decisions: list,
    participant_city: Mapping[int, str],
    events: list,
    config_id: str = "trading-v1",
) -> Tuple[dict, dict]:
    """
    根据上一回合全体玩家/AI 的买卖量，计算下一回合各城市价格。
    需求 > 供给 → 涨价；供给 > 需求 → 降价（供需曲线直觉）。
    """
    pricing = get_pricing_config(config_id)
    elasticity = pricing["elasticity"]
    ref_vol = pricing["reference_volume"]
    event_weight = pricing["event_weight"]

    activity = aggregate_trades(decisions, participant_city)
    prices: Dict[str, Dict[str, int]] = {}
    meta: Dict[str, Dict[str, dict]] = {}

    for city_key in cities:
        prices[city_key] = {}
        meta[city_key] = {}
        city_info = cities_meta.get(city_key, {})
        city_activity = activity.get(city_key, {})

        for pid, prod in base_products.items():
            base = int(prod["base_price"])
            slot = city_activity.get(pid, {"buy": 0, "sell": 0})
            buy_qty = slot["buy"]
            sell_qty = slot["sell"]
            net_demand = buy_qty - sell_qty
            pressure = max(-1.0, min(1.0, net_demand / ref_vol))

            structural = city_product_factor(city_info, pid, prod)
            demand_factor = 1.0 + elasticity * pressure
            narrative = event_demand_shift(events, city_key, pid, event_weight)

            price = int(base * structural * demand_factor * (1 + narrative))
            min_p, max_p = prod["price_range"]
            price = max(min_p, min(max_p, price))

            prices[city_key][pid] = price
            meta[city_key][pid] = {
                "buy_qty": buy_qty,
                "sell_qty": sell_qty,
                "net_demand": net_demand,
                "pressure": round(pressure, 3),
                "demand_factor": round(demand_factor, 3),
            }

    return prices, meta


def generate_market_events(
    round_number: int,
    cities: list,
    products: dict,
    config_id: str = "trading-v1",
) -> list:
    """
    生成可教学的「市场新闻」——影响下一回合需求，而非直接随机改价。
    早期回合少发，中后期略增。
    """
    doc = get_game_config(config_id)
    event_types = doc.event_types or []
    if not event_types:
        return []

    import random

    num = 0 if round_number <= 1 else (1 if round_number <= 4 else random.randint(1, 2))
    events = []

    for _ in range(num):
        template = random.choice(event_types)
        city_key = random.choice(cities)

        target_cat = template.get("target_category")
        if target_cat == "random":
            target_cat = random.choice(["low", "mid", "high"])

        affected = [k for k, v in products.items() if v.get("category") == target_cat]
        if not affected:
            continue
        picked = random.sample(affected, min(2, len(affected)))

        lo, hi = template.get("impact_range", [-0.2, 0.2])
        impact = round(random.uniform(lo, hi), 2)

        events.append({
            "type": template.get("type", "news"),
            "name": template.get("name", "市场动态"),
            "description": template.get("desc") or template.get("description", ""),
            "city": city_key,
            "affected_products": picked,
            "impact": impact,
            "target_category": target_cat,
            "source": "market_news",
        })

    return events
