"""RTS market events that affect production and demand, not prices directly."""

from __future__ import annotations

import random
from typing import Any, Dict, Iterable, Tuple

from app.domains.cybercore.registry import get_game_config


def _range_mid(value: Any, fallback: float) -> float:
    if isinstance(value, (list, tuple)) and len(value) >= 2:
        return (float(value[0]) + float(value[1])) / 2
    if isinstance(value, (int, float)):
        return float(value)
    return fallback


def _range_max(value: Any, fallback: int) -> int:
    if isinstance(value, (list, tuple)) and len(value) >= 2:
        return int(max(value[0], value[1]))
    if isinstance(value, int):
        return value
    return fallback


def _event_seed(event_id: int | None, tick: int) -> int:
    return int(event_id or 0) * 100_003 + tick * 97


def advance_market_events(runtime: dict, match_config: Dict[str, Any], config_id: str, event_id: int | None = None) -> None:
    doc = get_game_config(config_id)
    event_types = list(doc.event_types or [])
    if not event_types:
        runtime["market_events"] = []
        return

    tick = int(runtime.get("tick", 0))
    events = list(runtime.get("market_events") or [])
    kept = []
    for ev in events:
        starts = int(ev.get("start_tick", 0))
        active_until = int(ev.get("active_until", starts))
        decay_until = int(ev.get("decay_until", active_until))
        if tick < starts:
            ev["phase"] = "forecast"
        elif tick < active_until:
            ev["phase"] = "active"
        elif tick < decay_until:
            ev["phase"] = "decay"
        else:
            continue
        kept.append(ev)

    interval = int((match_config.get("events") or {}).get("generation_interval_ticks", 18))
    max_open = int((match_config.get("events") or {}).get("max_open", 3))
    cooldown = int((match_config.get("events") or {}).get("cooldown_ticks", 24))
    last_generated = int(runtime.get("last_market_event_tick", -interval))

    if tick >= 2 and tick - last_generated >= interval and len(kept) < max_open:
        recent_types = {
            str(ev.get("type"))
            for ev in kept
            if tick - int(ev.get("created_tick", 0)) < cooldown
        }
        choices = [ev for ev in event_types if ev.get("type") not in recent_types] or event_types
        rng = random.Random(_event_seed(event_id, tick))
        src = dict(rng.choice(choices))
        forecast = _range_max(src.get("forecast_ticks"), 2)
        active = _range_max(src.get("active_ticks"), 6)
        decay = _range_max(src.get("decay_ticks"), 3)
        start_tick = tick + forecast
        kept.append({
            "type": src.get("type"),
            "name": src.get("name", src.get("type")),
            "desc": src.get("desc", ""),
            "phase": "forecast",
            "created_tick": tick,
            "start_tick": start_tick,
            "active_until": start_tick + active,
            "decay_until": start_tick + active + decay,
            "target_cities": src.get("target_cities") or [],
            "target_products": src.get("target_products") or [],
            "affected_segments": src.get("affected_segments") or [],
            "impact": src.get("impact") or {},
            "global": bool(src.get("global", False)),
        })
        runtime["last_market_event_tick"] = tick
        runtime.setdefault("tick_events", []).append({
            "type": "market_event_forecast",
            "tick": tick,
            "event_type": src.get("type"),
            "name": src.get("name", src.get("type")),
        })

    runtime["market_events"] = kept


def production_demand_multipliers(
    runtime: dict,
    city_id: str,
    product_id: str,
) -> Tuple[float, float]:
    production_mult = 1.0
    demand_mult = 1.0
    for ev in runtime.get("market_events") or []:
        phase = ev.get("phase")
        if phase not in ("active", "decay"):
            continue
        target_cities: Iterable[str] = ev.get("target_cities") or []
        target_products: Iterable[str] = ev.get("target_products") or []
        if not ev.get("global") and target_cities and city_id not in target_cities:
            continue
        if target_products and product_id not in target_products:
            continue
        strength = 0.45 if phase == "decay" else 1.0
        impact = ev.get("impact") or {}
        prod = _range_mid(impact.get("production_mult"), 1.0)
        demand = _range_mid(impact.get("demand_mult"), 1.0)
        production_mult *= 1.0 + (prod - 1.0) * strength
        demand_mult *= 1.0 + (demand - 1.0) * strength
    return production_mult, demand_mult
