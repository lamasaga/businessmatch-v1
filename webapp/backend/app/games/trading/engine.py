"""交易赛结算引擎 — 纯规则，不依赖 ORM"""

import random
from typing import Any, Dict, List

from app.domains.cybercore.registry import get_game_config


def load_world(config_id: str = "trading-v1"):
    doc = get_game_config(config_id)
    return doc.products, doc.cities, doc.event_types


def get_products_dict(config_id: str, product_keys: List[str]) -> Dict[str, Any]:
    products, _, _ = load_world(config_id)
    return {k: v for k, v in products.items() if k in product_keys}


def cities_meta_for(config_id: str, city_keys: List[str]) -> Dict[str, Any]:
    _, cities, _ = load_world(config_id)
    return {k: cities[k] for k in city_keys if k in cities}


def generate_random_events(
    round_number: int,
    cities: list,
    products: dict,
    config_id: str = "trading-v1",
) -> list:
    _, _, event_types = load_world(config_id)
    events = []
    num_events = 1 if round_number <= 2 else random.randint(1, 2)

    for _ in range(num_events):
        event_template = random.choice(event_types)
        city_key = random.choice(cities)

        if event_template["target_category"] == "random":
            target_cat = random.choice(["low", "mid", "high"])
        else:
            target_cat = event_template["target_category"]

        target_products = [k for k, v in products.items() if v["category"] == target_cat]
        affected_products = random.sample(target_products, min(2, len(target_products)))

        impact = round(
            random.uniform(
                event_template["impact_range"][0],
                event_template["impact_range"][1],
            ),
            2,
        )

        events.append({
            "type": event_template["type"],
            "name": event_template["name"],
            "description": event_template.get("desc") or event_template.get("description", ""),
            "city": city_key,
            "affected_products": affected_products,
            "impact": impact,
            "target_category": target_cat,
        })

    return events


def calculate_prices(
    base_products: dict,
    cities: list,
    cities_meta: dict,
    decisions: list,
    events: list,
    round_number: int,
) -> dict:
    """返回 {city: {product_id: price}}"""
    prices = {}

    supply_demand = {}
    for d in decisions:
        action = d.action_type.value if hasattr(d.action_type, "value") else d.action_type
        data = d.action_data
        if action == "buy":
            pid = data.get("product_id")
            qty = data.get("quantity", 0)
            supply_demand[pid] = supply_demand.get(pid, 0) + qty
        elif action == "sell":
            pid = data.get("product_id")
            qty = data.get("quantity", 0)
            supply_demand[pid] = supply_demand.get(pid, 0) - qty

    for city_key in cities:
        prices[city_key] = {}
        city_info = cities_meta[city_key]

        for pid, prod in base_products.items():
            base = prod["base_price"]

            city_factor = 0.0
            if city_info["type"] == "political" and prod["category"] == "high":
                city_factor = 0.15
            elif city_info["type"] == "tech" and pid == "electronics":
                city_factor = -0.20
            elif city_info["type"] == "freeport":
                city_factor = -0.10
            elif city_info["type"] == "border":
                city_factor = random.uniform(-0.15, 0.15)
            elif city_info["type"] == "leisure" and prod["category"] == "low":
                city_factor = -0.10

            sd_factor = 0.0
            if pid in supply_demand:
                net = supply_demand[pid]
                if net > 0:
                    sd_factor = min(net * 0.02, 0.30)
                elif net < 0:
                    sd_factor = max(net * 0.02, -0.30)

            volatility = 0.05 + (round_number * 0.01)
            random_factor = random.uniform(-volatility, volatility)

            event_factor = 0.0
            for evt in events:
                if pid in evt.get("affected_products", []) and city_key == evt.get("city"):
                    event_factor += evt["impact"]
                elif pid in evt.get("affected_products", []):
                    event_factor += evt["impact"] * 0.3

            total_factor = city_factor + sd_factor + random_factor + event_factor
            price = int(base * (1 + total_factor))

            min_p, max_p = prod["price_range"]
            price = max(min_p, min(max_p, price))
            prices[city_key][pid] = price

    return prices
