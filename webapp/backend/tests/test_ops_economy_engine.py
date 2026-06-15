from app.games.ops_sim.config import get_cfg
from app.games.ops_sim.engine import settle_round


def _base_match_state():
    return {
        "event_id": 100,
        "round_number": 1,
        "team_states": {
            1: {
                "team_id": 1,
                "cash": 100000,
                "inventory": 0,
                "net_assets": 100000,
                "cumulative_profit": 0,
                "tech": 20,
                "fit": 24,
                "show": 18,
                "category": "home",
                "entered_cities": [],
                "factories": [],
                "ads": [],
                "discount_rate": 0,
            },
            2: {
                "team_id": 2,
                "cash": 100000,
                "inventory": 0,
                "net_assets": 100000,
                "cumulative_profit": 0,
                "tech": 24,
                "fit": 20,
                "show": 18,
                "category": "electronics",
                "entered_cities": [],
                "factories": [],
                "ads": [],
                "discount_rate": 0,
            },
        },
        "event_state": {},
    }


def _decisions():
    return {
        1: {
            "production_quantity": 200,
            "unit_price": 150,
            "marketing_spend": 8000,
            "rnd_spend": 5000,
            "sales_force": 3,
            "target_cities": ["hangzhou"],
        },
        2: {
            "production_quantity": 180,
            "unit_price": 220,
            "marketing_spend": 5000,
            "rnd_spend": 8000,
            "sales_force": 2,
            "target_cities": ["hangzhou"],
        },
    }


def test_ops_config_declares_6_rounds_and_dual_auctions():
    cfg = get_cfg("ops-sim-v1")

    assert cfg["defaults"]["rounds"] == 6
    assert set(cfg["auction_stages"]) == {"auction_a", "auction_b"}
    assert cfg["auction_stages"]["auction_a"]["before_round"] == 1
    assert cfg["auction_stages"]["auction_b"]["before_round"] == 4


def test_cash_flow_does_not_double_count_cogs():
    cfg = get_cfg("ops-sim-v1")
    out = settle_round(_base_match_state(), _decisions(), cfg)
    row = next(r for r in out["results"] if r["team_id"] == 1)

    expected_cash = (
        100000
        - row["raw_spend"]
        - row["marketing_spend"]
        - row["rnd_spend"]
        - row["labor_expense"]
        - row["fixed_overhead"]
        - row["opening_fees"]
        - row["holding_cost"]
        + row["revenue"]
    )

    assert row["cash_after"] == round(expected_cash, 2)
    assert row["cash_after"] != round(expected_cash - row["cogs"], 2)


def test_city_ad_and_channel_effects_improve_city_demand():
    cfg = get_cfg("ops-sim-v1")
    plain = settle_round(_base_match_state(), _decisions(), cfg)
    boosted_state = _base_match_state()
    boosted_state["team_states"][1]["ads"] = [
        {
            "item_key": "ad_hangzhou",
            "effect": {"city": "hangzhou", "show_multiplier": 1.5},
            "city": "hangzhou",
            "show_multiplier": 1.5,
        },
        {
            "item_key": "exclusive_campus_channel",
            "resource_kind": "exclusive_channel",
            "effect": {"demand_multiplier": 1.2, "utility_bonus": 0.3},
            "demand_multiplier": 1.2,
            "utility_bonus": 0.3,
        },
    ]
    boosted = settle_round(boosted_state, _decisions(), cfg)

    plain_row = next(r for r in plain["results"] if r["team_id"] == 1)
    boosted_row = next(r for r in boosted["results"] if r["team_id"] == 1)

    assert boosted_row["demand"] > plain_row["demand"]
