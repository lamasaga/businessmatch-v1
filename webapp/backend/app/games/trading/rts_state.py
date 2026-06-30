"""RTS 运行时状态 — 存于 match.config"""

from __future__ import annotations

import copy
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.games.trading.rts_config import city_catalog, product_catalog, pricing_config
from app.games.trading.rts_pricing import target_pool, update_city_prices


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_rts_runtime(config: dict) -> dict:
    return config.setdefault("rts_runtime", {})


def get_rts_players(config: dict) -> dict:
    return config.setdefault("rts_players", {})


def player_state(config: dict, participant_id: int) -> dict:
    players = get_rts_players(config)
    key = str(participant_id)
    if key not in players:
        players[key] = {"vehicles": [], "transit": None}
    return players[key]


def init_rts_runtime(
    match_config: Dict[str, Any],
    config_id: str,
) -> Dict[str, Any]:
    products = product_catalog(match_config, config_id)
    cities = city_catalog(match_config, config_id)
    pricing = pricing_config(match_config)
    ref = pricing["reference_pool"]

    city_states = {}
    for ck, cc in cities.items():
        pools = {}
        for pid in products:
            pools[pid] = target_pool(cc, pid, ref)
        city_states[ck] = {
            "pools": pools,
            "buy_tick": {},
            "sell_tick": {},
        }

    total = int(match_config.get("total_ticks", match_config.get("total_days", 150)))
    warmup = int(match_config.get("warmup_ticks", match_config.get("warmup_days", 6)))
    interval = int(match_config.get("tick_interval_sec", match_config.get("day_interval_sec", 4)))

    return {
        "tick": 0,
        "phase": "warmup",
        "total_ticks": total,
        "warmup_ticks": warmup,
        "tick_interval_sec": interval,
        "last_tick_at": _utc_now_iso(),
        "cities": city_states,
        "pending_actions": [],
        "tick_events": [],
    }


def build_price_snapshot(
    runtime: dict,
    match_config: Dict[str, Any],
    config_id: str,
) -> Dict[str, Any]:
    products = product_catalog(match_config, config_id)
    cities = city_catalog(match_config, config_id)
    pricing = pricing_config(match_config)
    snapshot: Dict[str, Any] = {"_rts": {
        "tick": runtime.get("tick", 0),
        "phase": runtime.get("phase", "warmup"),
        "events": runtime.get("tick_events", [])[-3:],
    }}

    for ck, cc in cities.items():
        cs = runtime.get("cities", {}).get(ck, {})
        prices = update_city_prices(ck, cc, products, cs, pricing)
        snapshot[ck] = prices
    return snapshot


def phase_for_tick(tick: int, runtime: dict) -> str:
    total = int(runtime.get("total_ticks", runtime.get("total_days", 150)))
    warmup = int(runtime.get("warmup_ticks", runtime.get("warmup_days", 6)))
    if tick >= total:
        return "finished"
    if tick < warmup:
        return "warmup"
    return "running"


def ensure_player_registered(event, config: dict, participant_id: int) -> bool:
    """确保 rts_players 有条目；新建时返回 True 供调用方 persist。"""
    players = config.setdefault("rts_players", {})
    key = str(participant_id)
    if key in players:
        return False
    players[key] = {"vehicles": [], "transit": None}
    return True


def seconds_until_next_tick(runtime: dict) -> int:
    interval = int(runtime.get("tick_interval_sec", runtime.get("day_interval_sec", 4)))
    last = runtime.get("last_tick_at")
    if not last:
        return 0
    try:
        last_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
    except ValueError:
        return 0
    elapsed = (datetime.now(timezone.utc) - last_dt).total_seconds()
    return max(0, int(interval - elapsed))


def should_advance_tick(runtime: dict) -> bool:
    return seconds_until_next_tick(runtime) <= 0


def deep_copy_config(config: dict) -> dict:
    return copy.deepcopy(config or {})
