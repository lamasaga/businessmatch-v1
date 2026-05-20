"""RTS 游戏状态构建 — 供 trading API 使用"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.domains.arena.models import ArenaMatch, ArenaParticipant
from app.games.trading.models import TradingRound
from app.games.trading.rts_config import city_catalog, is_rts_mode, product_catalog, vehicle_defs
from app.games.trading.rts_logistics import (
    inventory_volume_used,
    player_can_trade,
    storage_capacity,
)
from app.games.trading.rts_state import get_rts_runtime, player_state, seconds_until_next_tick


def build_rts_markets(
    event: ArenaMatch,
    current_round: Optional[TradingRound],
    db: Session,
) -> List[dict]:
    if not current_round or not current_round.price_snapshot:
        return []

    config = event.config or {}
    config_id = event.game_config_id or "trading-v2-rts"
    products = product_catalog(config, config_id)
    cities = city_catalog(config, config_id)
    raw = current_round.price_snapshot or {}

    prev = (
        db.query(TradingRound)
        .filter(
            TradingRound.event_id == event.id,
            TradingRound.round_number < current_round.round_number,
        )
        .order_by(TradingRound.round_number.desc())
        .first()
    )
    prev_raw = prev.price_snapshot if prev else {}

    markets = []
    for ck in config.get("cities", list(cities.keys())):
        if ck not in raw or ck.startswith("_"):
            continue
        city_prices = raw[ck]
        if not isinstance(city_prices, dict):
            continue
        city_name = cities.get(ck, {}).get("name", ck)
        product_list = []
        for pid, prod in products.items():
            if pid not in city_prices:
                continue
            row = city_prices[pid]
            if isinstance(row, dict):
                ask = int(row.get("ask", 0))
                bid = int(row.get("bid", 0))
                pool = float(row.get("pool", 0))
                pressure = float(row.get("pressure", 0))
            else:
                ask = int(row)
                bid = int(ask * 0.92)
                pool = 0
                pressure = 0

            trend = "stable"
            trend_pct = 0.0
            if prev_raw and ck in prev_raw and pid in prev_raw[ck]:
                prev_row = prev_raw[ck][pid]
                prev_ask = prev_row.get("ask", prev_row) if isinstance(prev_row, dict) else prev_row
                if prev_ask and ask:
                    change = (ask - int(prev_ask)) / int(prev_ask)
                    trend_pct = round(change * 100, 1)
                    if change > 0.05:
                        trend = "up"
                    elif change < -0.05:
                        trend = "down"

            product_list.append({
                "product_id": pid,
                "name": prod.get("name", pid),
                "category": prod.get("category", ""),
                "volume": int(prod.get("volume", 1)),
                "buy_price": ask,
                "sell_price": bid,
                "trend": trend,
                "trend_percent": trend_pct,
                "pool_qty": pool,
                "pressure": pressure,
            })
        markets.append({
            "city": ck,
            "city_name": city_name,
            "products": product_list,
        })
    return markets


def build_rts_inventory(
    participant: ArenaParticipant,
    event: ArenaMatch,
    current_round: Optional[TradingRound],
) -> List[dict]:
    config = event.config or {}
    config_id = event.game_config_id or "trading-v2-rts"
    products = product_catalog(config, config_id)
    inventory = participant.inventory or {}
    if not inventory:
        return []

    city = participant.current_city
    cp = {}
    if current_round and current_round.price_snapshot:
        cp = current_round.price_snapshot.get(city, {})

    items = []
    for pid, qty in inventory.items():
        prod = products.get(pid, {})
        bid = 0
        if pid in cp and isinstance(cp[pid], dict):
            bid = int(cp[pid].get("bid", 0))
        items.append({
            "product_id": pid,
            "name": prod.get("name", pid),
            "quantity": int(qty),
            "volume": int(prod.get("volume", 1)),
            "avg_cost": 0.0,
            "current_value": bid * int(qty),
        })
    return items


def build_rts_capacity(participant: ArenaParticipant, event: ArenaMatch) -> dict:
    config = event.config or {}
    config_id = event.game_config_id or "trading-v2-rts"
    products = product_catalog(config, config_id)
    ps = player_state(config, participant.id)
    vehicles = list(ps.get("vehicles") or [])
    cap = storage_capacity(config, vehicles, config_id)
    used = inventory_volume_used(participant.inventory or {}, products)
    by_product = {}
    for pid, qty in (participant.inventory or {}).items():
        vol = int(products.get(pid, {}).get("volume", 1))
        by_product[pid] = {
            "quantity": int(qty),
            "volume_used": int(qty) * vol,
            "volume_per_unit": vol,
        }
    return {
        "storage_capacity": cap,
        "storage_used": used,
        "storage_remaining": max(0, cap - used),
        "vehicles": vehicles,
        "max_vehicles": int(config.get("max_vehicles_per_player", 3)),
        "by_product": by_product,
    }


def build_rts_meta(event: ArenaMatch, participant: ArenaParticipant) -> Dict[str, Any]:
    config = event.config or {}
    rt = get_rts_runtime(config)
    ps = player_state(config, participant.id)
    tick = int(rt.get("tick", 0))
    total = int(rt.get("total_ticks", 120))
    transit = ps.get("transit")
    can_trade = player_can_trade(transit, tick) and rt.get("phase") in ("warmup", "running")

    return {
        "mode": "rts",
        "tick": tick,
        "total_ticks": total,
        "phase": rt.get("phase", "warmup"),
        "tick_interval_sec": int(rt.get("tick_interval_sec", 5)),
        "seconds_until_next_tick": seconds_until_next_tick(rt),
        "duration_minutes": int(config.get("duration_minutes", 10)),
        "duration_preset": config.get("duration_preset", "standard"),
        "transit": transit,
        "can_trade": can_trade,
        "vehicles_available": vehicle_defs(config, event.game_config_id or "trading-v2-rts"),
    }
