"""RTS 市场池与 ask/bid 定价"""

from __future__ import annotations

from typing import Any, Dict, Tuple

from app.games.trading.rts_events import production_demand_multipliers


def target_pool(city_cfg: dict, product_id: str, reference: float) -> float:
    cons = float(city_cfg.get("consumption", {}).get(product_id, 10))
    prod = float(city_cfg.get("production", {}).get(product_id, 5))
    return max(20.0, reference * 0.5 + cons * 0.8 + prod * 0.3)


def structural_mid(
    product: dict,
    city_cfg: dict,
    product_id: str,
) -> float:
    base = float(product.get("base_price", 100))
    prod = float(city_cfg.get("production", {}).get(product_id, 0))
    cons = float(city_cfg.get("consumption", {}).get(product_id, 10))
    demand_mult = float(city_cfg.get("demand_profile", {}).get(product_id, 1.0))
    surplus = prod - cons
    factor = 1.0 - 0.04 * (surplus / max(cons, 1))
    factor *= demand_mult ** 0.25
    lo, hi = product.get("price_range", [base * 0.5, base * 2])
    mid = base * factor
    return max(float(lo), min(float(hi), mid))


def pool_pressure(pool_qty: float, target: float, net_player: float) -> float:
    ratio = pool_qty / target if target > 0 else 1.0
    if ratio > 1.5:
        p = -0.25 - 0.08 * min(2.0, ratio - 1.5)
    elif ratio < 0.5:
        p = 0.25 + 0.08 * min(2.0, 0.5 - ratio) * 2
    else:
        p = (1.0 - ratio) * 0.35
    p += max(-0.15, min(0.15, net_player / max(target, 1) * 0.1))
    return max(-0.45, min(0.45, p))


def demand_gap_state(
    pool_qty: float,
    production: float,
    consumption: float,
    pricing: Dict[str, Any],
) -> tuple[float, str]:
    cover_ticks = float(pricing.get("target_cover_ticks", 6))
    available_per_tick = pool_qty / max(cover_ticks, 1.0)
    gap = consumption - production - available_per_tick
    if gap > max(4.0, consumption * 0.35):
        state = "severe_shortage"
    elif gap > max(1.5, consumption * 0.12):
        state = "shortage"
    elif gap < -max(2.0, consumption * 0.18):
        state = "surplus"
    else:
        state = "balanced"
    return round(gap, 2), state


def calc_ask_bid(
    mid: float,
    pressure: float,
    pricing: Dict[str, Any],
) -> Tuple[int, int]:
    spread = pricing["min_spread"]
    elast = pricing["elasticity"]
    half = spread / 2
    ask = mid * (1 + half + pressure * elast)
    bid = mid * (1 - half + pressure * elast * 0.6)
    bid = min(bid, ask * (1 - spread))
    return max(1, int(round(ask))), max(1, int(round(bid)))


def tick_pool_delta(
    city_cfg: dict,
    product_id: str,
    player_buy: float,
    player_sell: float,
) -> float:
    prod = float(city_cfg.get("production", {}).get(product_id, 0))
    cons = float(city_cfg.get("consumption", {}).get(product_id, 0))
    return prod - cons - player_buy + player_sell


def update_city_prices(
    city_key: str,
    city_cfg: dict,
    products: Dict[str, Dict[str, Any]],
    city_state: dict,
    pricing: Dict[str, Any],
    market_events: list | None = None,
) -> Dict[str, Dict[str, Any]]:
    pools = city_state.setdefault("pools", {})
    out: Dict[str, Dict[str, Any]] = {}
    ref = pricing["reference_pool"]
    buy_tick = city_state.get("buy_tick") or {}
    sell_tick = city_state.get("sell_tick") or {}

    for pid, prod in products.items():
        pool = float(pools.get(pid, target_pool(city_cfg, pid, ref)))
        tgt = target_pool(city_cfg, pid, ref)
        production = float(city_cfg.get("production", {}).get(pid, 0))
        consumption = float(city_cfg.get("consumption", {}).get(pid, 0))
        prod_mult, demand_mult = production_demand_multipliers({"market_events": market_events or []}, city_key, pid)
        production *= prod_mult
        consumption *= demand_mult
        net = float(buy_tick.get(pid, 0)) - float(sell_tick.get(pid, 0))
        pressure = pool_pressure(pool, tgt, net)
        mid = structural_mid(prod, city_cfg, pid)
        ask, bid = calc_ask_bid(mid, pressure, pricing)
        gap, supply_state = demand_gap_state(pool, production, consumption, pricing)
        out[pid] = {
            "ask": ask,
            "bid": bid,
            "pool": round(pool, 1),
            "pressure": round(pressure, 3),
            "production": round(production, 2),
            "consumption": round(consumption, 2),
            "demand_gap": gap,
            "supply_state": supply_state,
            "city_role": (city_cfg.get("product_roles") or {}).get(pid, "neutral"),
        }
    city_state["buy_tick"] = {}
    city_state["sell_tick"] = {}
    return out
