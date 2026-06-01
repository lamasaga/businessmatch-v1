"""RTS 练习局 AI — 按参与者 ai_level 分派策略"""

from __future__ import annotations

from typing import List

from app.domains.arena.models import ArenaMatch, ArenaParticipant
from app.games.trading.rts_ai_levels import (
    AI_LEVEL_ADVANCED,
    AI_LEVEL_CHAOTIC,
    decide_advanced,
    decide_chaotic,
    get_ai_level,
)
from app.games.trading.rts_config import city_catalog, product_catalog
from app.games.trading.rts_state import player_state


def enqueue_ai_actions(
    event: ArenaMatch,
    participants: List[ArenaParticipant],
    snapshot: dict,
    runtime: dict,
) -> None:
    config = event.config or {}
    config_id = event.game_config_id or "fstrading"
    tick = int(runtime.get("tick", 0))
    products = product_catalog(config, config_id)
    cities = list(config.get("cities", []))
    city_meta = city_catalog(config, config_id)

    for p in participants:
        if not getattr(p, "is_ai", 0):
            continue
        ps = player_state(config, p.id)
        if ps.get("transit"):
            continue

        cp = snapshot.get(p.current_city, {})
        if not isinstance(cp, dict):
            continue

        level = get_ai_level(config, p.id)
        if level == AI_LEVEL_CHAOTIC:
            decide_chaotic(p, event, snapshot, runtime, tick, products, cities, ps)
        else:
            decide_advanced(
                p, event, snapshot, runtime, tick, products, cities, city_meta, ps,
            )
