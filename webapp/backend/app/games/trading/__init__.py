"""FStrading 交易引擎插件"""

from app.domains.cybercore.registry import get_game_config
from app.games.trading.config_loader import get_products_dict, load_world
from app.games.trading.enums import ActionType, RoundStatus
from app.games.trading.models import TradingDecision, TradingPrice, TradingRound

_doc = get_game_config("fstrading")
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
    "get_products_dict",
    "load_world",
]
