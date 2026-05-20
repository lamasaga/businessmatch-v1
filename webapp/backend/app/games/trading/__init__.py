"""交易赛引擎插件"""

from app.domains.cybercore.registry import get_game_config
from app.games.trading.engine import (
    calculate_prices,
    generate_random_events,
    get_products_dict,
    load_world,
)
from app.games.trading.enums import ActionType, RoundStatus
from app.games.trading.models import TradingDecision, TradingPrice, TradingRound

_doc = get_game_config("trading-v1")
PRODUCTS = _doc.products
CITIES = _doc.cities

__all__ = [
    "ActionType",
    "RoundStatus",
    "TradingRound",
    "TradingDecision",
    "TradingPrice",
    "PRODUCTS",
    "CITIES",
    "calculate_prices",
    "generate_random_events",
    "get_products_dict",
    "load_world",
]
