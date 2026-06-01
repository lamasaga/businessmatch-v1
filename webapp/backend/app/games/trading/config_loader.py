"""FStrading 赛制包读取 — 城市/商品元数据"""

from app.domains.cybercore.registry import get_game_config
from app.games.trading.constants import DEFAULT_TRADING_CONFIG_ID


def load_world(config_id: str = DEFAULT_TRADING_CONFIG_ID):
    doc = get_game_config(config_id)
    return doc.products, doc.cities, doc.event_types


def get_products_dict(config_id: str, product_keys: list):
    products, _, _ = load_world(config_id)
    return {k: v for k, v in products.items() if k in product_keys}


def cities_meta_for(config_id: str, city_keys: list):
    _, cities, _ = load_world(config_id)
    return {k: cities[k] for k in city_keys if k in cities}
