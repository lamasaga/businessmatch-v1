"""RTS 练习局 AI — 两档策略：advanced（逐利）/ chaotic（混乱）"""

from __future__ import annotations

import random
from typing import Any, Dict, List, Optional, Tuple

from app.domains.arena.models import ArenaMatch, ArenaParticipant
from app.games.trading.rts_actions import queue_action, validate_queue
from app.games.trading.rts_config import city_catalog, product_catalog
from app.games.trading.rts_logistics import (
    inventory_volume_used,
    move_cash_cost,
    storage_capacity,
)
from app.games.trading.rts_state import player_state

AI_LEVEL_CHAOTIC = "chaotic"
AI_LEVEL_ADVANCED = "advanced"
DEFAULT_AI_SLOTS = [AI_LEVEL_CHAOTIC, AI_LEVEL_ADVANCED, AI_LEVEL_ADVANCED]


def normalize_ai_slots(config: dict, ai_count: int) -> List[str]:
    slots = list(config.get("practice_ai_slots") or DEFAULT_AI_SLOTS)
    out: List[str] = []
    for i in range(ai_count):
        if i < len(slots):
            lv = str(slots[i]).lower()
        else:
            lv = AI_LEVEL_ADVANCED
        out.append(lv if lv in (AI_LEVEL_CHAOTIC, AI_LEVEL_ADVANCED) else AI_LEVEL_ADVANCED)
    return out


def init_ai_player_levels(config: dict, participant_ids: List[int], levels: List[str]) -> None:
    for pid, level in zip(participant_ids, levels):
        ps = player_state(config, pid)
        ps["ai_level"] = level


def get_ai_level(config: dict, participant_id: int) -> str:
    ps = player_state(config, participant_id)
    return ps.get("ai_level") or AI_LEVEL_ADVANCED


def _row(snapshot: dict, city: str, pid: str) -> Tuple[int, int]:
    cp = snapshot.get(city, {})
    if pid not in cp or not isinstance(cp[pid], dict):
        return 0, 0
    r = cp[pid]
    return int(r.get("ask", 0)), int(r.get("bid", 0))


def _max_buy_qty(
    p: ArenaParticipant,
    pid: str,
    ask: int,
    products: dict,
    config: dict,
    config_id: str,
    ps: dict,
    inventory: dict,
) -> int:
    cap = storage_capacity(config, list(ps.get("vehicles") or []), config_id)
    used = inventory_volume_used(inventory, products)
    vol = max(1, int(products.get(pid, {}).get("volume", 1)))
    max_by_vol = max(0, (cap - used) // vol)
    max_by_cash = max(0, int(p.cash // max(ask, 1)))
    return min(max_by_vol, max_by_cash, 8)


def _try_queue(
    runtime: dict,
    p: ArenaParticipant,
    event: ArenaMatch,
    action_type: str,
    payload: dict,
    snapshot: dict,
    tick: int,
) -> bool:
    ok, _ = validate_queue(p, event, action_type, payload, snapshot, tick)
    if ok:
        queue_action(runtime, p.id, action_type, payload)
    return ok


def decide_chaotic(
    p: ArenaParticipant,
    event: ArenaMatch,
    snapshot: dict,
    runtime: dict,
    tick: int,
    products: dict,
    cities: List[str],
    ps: dict,
) -> None:
    """低级别：高随机、常做错方向，仍能搅动市场。"""
    config = event.config or {}
    config_id = event.game_config_id or "fstrading"
    city = p.current_city
    cp = snapshot.get(city, {})
    inventory = dict(p.inventory or {})
    pids = list(products.keys())

    roll = random.random()

    # 约 20%：故意「亏着卖、贵着买」
    if roll < 0.20:
        if inventory and random.random() < 0.6:
            pid = random.choice(list(inventory.keys()))
            _, bid = _row(snapshot, city, pid)
            if bid > 0:
                qty = random.randint(1, min(inventory[pid], 5))
                _try_queue(runtime, p, event, "sell", {"product_id": pid, "quantity": qty}, snapshot, tick)
                return
        pid = random.choice(pids)
        ask, _ = _row(snapshot, city, pid)
        if ask > 0 and ask * 2 < p.cash:
            qty = random.randint(1, 3)
            _try_queue(runtime, p, event, "buy", {"product_id": pid, "quantity": qty}, snapshot, tick)
        return

    if inventory and roll < 0.55:
        pid = random.choice(list(inventory.keys()))
        qty = random.randint(1, max(1, inventory[pid]))
        _try_queue(runtime, p, event, "sell", {"product_id": pid, "quantity": qty}, snapshot, tick)
        return

    if roll < 0.78:
        candidates = []
        for pid in pids:
            ask, _ = _row(snapshot, city, pid)
            if ask > 0:
                candidates.append((pid, ask))
        if candidates:
            pid, ask = random.choice(candidates)
            qty = min(random.randint(1, 5), _max_buy_qty(p, pid, ask, products, config, config_id, ps, inventory))
            if qty >= 1:
                _try_queue(runtime, p, event, "buy", {"product_id": pid, "quantity": qty}, snapshot, tick)
        return

    if roll < 0.88 and len(ps.get("vehicles") or []) < int(config.get("max_vehicles_per_player", 3)):
        if random.random() < 0.4:
            vtype = random.choice(["van", "truck"])
            _try_queue(runtime, p, event, "buy_vehicle", {"vehicle_type": vtype}, snapshot, tick)
        return

    others = [c for c in cities if c != city]
    if others:
        _try_queue(runtime, p, event, "move", {"to_city": random.choice(others)}, snapshot, tick)


def decide_advanced(
    p: ArenaParticipant,
    event: ArenaMatch,
    snapshot: dict,
    runtime: dict,
    tick: int,
    products: dict,
    cities: List[str],
    city_meta: dict,
    ps: dict,
) -> None:
    """高级别：跨城 bid/ask 套利、产销地采购、高 bid 城市出货。"""
    config = event.config or {}
    config_id = event.game_config_id or "fstrading"
    city = p.current_city
    inventory = dict(p.inventory or {})
    move_cost = move_cash_cost(config)
    vehicles = list(ps.get("vehicles") or [])

    def best_bid_for(pid: str) -> Tuple[str, int]:
        best_c, best_b = city, 0
        for ck in cities:
            _, bid = _row(snapshot, ck, pid)
            if bid > best_b:
                best_b, best_c = bid, ck
        return best_c, best_b

    def min_ask_for(pid: str) -> Tuple[str, int]:
        best_c, best_a = city, 0
        for ck in cities:
            ask, _ = _row(snapshot, ck, pid)
            if ask > 0 and (best_a == 0 or ask < best_a):
                best_a, best_c = ask, ck
        return best_c, best_a

    # 1) 持仓：已在最高 bid 城 → 卖出
    if inventory:
        best_pid = None
        best_margin = 0
        for pid, qty in inventory.items():
            if qty <= 0:
                continue
            sell_city, bid = best_bid_for(pid)
            _, here_bid = _row(snapshot, city, pid)
            if sell_city == city and bid > 0:
                margin = bid * min(qty, 8)
                if margin > best_margin:
                    best_margin = margin
                    best_pid = pid
        if best_pid:
            sell_qty = min(inventory[best_pid], 8)
            if _try_queue(
                runtime, p, event, "sell",
                {"product_id": best_pid, "quantity": sell_qty},
                snapshot, tick,
            ):
                return

        # 2) 持仓：不在最优城 → 前往最高 bid 城
        pid = max(inventory.keys(), key=lambda k: inventory[k] * products.get(k, {}).get("base_price", 1))
        target, remote_bid = best_bid_for(pid)
        _, here_bid = _row(snapshot, city, pid)
        if target != city and remote_bid > here_bid + move_cost // max(inventory[pid], 1):
            if not ps.get("transit"):
                _try_queue(runtime, p, event, "move", {"to_city": target}, snapshot, tick)
            return

    # 3) 仓储紧 → 购车
    cap = storage_capacity(config, vehicles, config_id)
    used = inventory_volume_used(inventory, products)
    if len(vehicles) < int(config.get("max_vehicles_per_player", 3)):
        if used > cap * 0.72 and p.cash > 9000 and "van" not in vehicles:
            if _try_queue(runtime, p, event, "buy_vehicle", {"vehicle_type": "van"}, snapshot, tick):
                return
        if used > cap * 0.55 and p.cash > 22000 and len(vehicles) >= 1 and "truck" not in vehicles:
            if _try_queue(runtime, p, event, "buy_vehicle", {"vehicle_type": "truck"}, snapshot, tick):
                return

    # 4) 套利扫描：找 max(bid_remote - ask_local) 且人在低价城或需移过去
    best_opp: Optional[Tuple[float, str, str, int]] = None  # score, pid, buy_city, ask
    for pid in products:
        buy_city, ask = min_ask_for(pid)
        if ask <= 0:
            continue
        sell_city, bid = best_bid_for(pid)
        if sell_city == buy_city or bid <= ask:
            continue
        cc = city_meta.get(buy_city, {})
        prod = float(cc.get("production", {}).get(pid, 0))
        cons = float(cc.get("consumption", {}).get(pid, 1))
        supply_bonus = 1.0 + max(0, (prod - cons) * 0.05)
        score = (bid - ask) * supply_bonus - (move_cost if buy_city != city else 0)
        if best_opp is None or score > best_opp[0]:
            best_opp = (score, pid, buy_city, ask)

    if best_opp and best_opp[0] > move_cost * 0.5:
        _, pid, buy_city, ask = best_opp
        if city != buy_city:
            if _try_queue(runtime, p, event, "move", {"to_city": buy_city}, snapshot, tick):
                return
        qty = _max_buy_qty(p, pid, ask, products, config, config_id, ps, inventory)
        qty = min(qty, 6)
        if qty >= 1:
            if _try_queue(runtime, p, event, "buy", {"product_id": pid, "quantity": qty}, snapshot, tick):
                return

    # 5) 人在产地：买本地便宜货
    local_meta = city_meta.get(city, {})
    for pid in products:
        prod = float(local_meta.get("production", {}).get(pid, 0))
        cons = float(local_meta.get("consumption", {}).get(pid, 1))
        if prod <= cons:
            continue
        ask, _ = _row(snapshot, city, pid)
        if ask <= 0 or ask * 2 > p.cash:
            continue
        sell_city, bid = best_bid_for(pid)
        if bid > ask * 1.12 and sell_city != city:
            qty = min(_max_buy_qty(p, pid, ask, products, config, config_id, ps, inventory), 5)
            if qty >= 1:
                if _try_queue(runtime, p, event, "buy", {"product_id": pid, "quantity": qty}, snapshot, tick):
                    return

    # 6) 现金闲置：去需求高的城碰机会
    if p.cash > move_cost * 2:
        demand_cities = sorted(
            cities,
            key=lambda ck: sum(
                float(city_meta.get(ck, {}).get("consumption", {}).get(pid, 0))
                for pid in products
            ),
            reverse=True,
        )
        for target in demand_cities:
            if target != city:
                if _try_queue(runtime, p, event, "move", {"to_city": target}, snapshot, tick):
                    return
