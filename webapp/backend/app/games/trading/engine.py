"""交易赛结算引擎 — 兼容层，定价逻辑见 market.py"""

from app.games.trading.market import (
    aggregate_trades,
    calculate_equilibrium_prices,
    calculate_market_prices,
    generate_market_events,
    get_pricing_config,
)
from app.domains.cybercore.registry import get_game_config


def load_world(config_id: str = "trading-v1"):
    doc = get_game_config(config_id)
    return doc.products, doc.cities, doc.event_types


def get_products_dict(config_id: str, product_keys: list):
    products, _, _ = load_world(config_id)
    return {k: v for k, v in products.items() if k in product_keys}


def cities_meta_for(config_id: str, city_keys: list):
    _, cities, _ = load_world(config_id)
    return {k: cities[k] for k in city_keys if k in cities}


def generate_random_events(round_number, cities, products, config_id="trading-v1"):
    return generate_market_events(round_number, cities, products, config_id)


def calculate_prices(
    base_products,
    cities,
    cities_meta,
    decisions,
    events,
    round_number,
    config_id: str = "trading-v1",
    participant_city=None,
):
    """兼容旧签名；返回 {city: {product_id: price}}"""
    if round_number <= 1 and not decisions:
        prices, _ = calculate_equilibrium_prices(base_products, cities, cities_meta, config_id)
        return prices

    pc = participant_city or {}
    if not pc and decisions:
        pc = {d.participant_id: (d.action_data or {}).get("trade_city", "") for d in decisions}

    prices, _ = calculate_market_prices(
        base_products,
        cities,
        cities_meta,
        decisions,
        pc,
        events,
        config_id,
    )
    return prices
