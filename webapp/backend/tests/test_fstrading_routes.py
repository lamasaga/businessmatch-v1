"""FStrading 路网移动 — 边路费与直达校验"""

from app.games.trading.rts_logistics import move_cash_cost


def test_move_cash_cost_uses_edge():
    config = {
        "logistics": {"move_cost_per_edge": 800},
        "routes": {"shanghai-suzhou": {"move_cost": 600, "base_travel_ticks": 2}},
    }
    assert move_cash_cost(config, "shanghai", "suzhou") == 600
    assert move_cash_cost(config) == 800
