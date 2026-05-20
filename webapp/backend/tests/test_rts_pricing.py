"""RTS 定价：同城 ask 买 + bid 卖 必亏"""

from app.games.trading.rts_pricing import calc_ask_bid


def test_same_city_no_arbitrage():
    pricing = {"min_spread": 0.08, "elasticity": 0.12}
    mid = 100.0
    ask, bid = calc_ask_bid(mid, 0.0, pricing)
    assert ask > bid
    profit = bid - ask
    assert profit < 0
    assert bid <= ask * (1 - pricing["min_spread"])
