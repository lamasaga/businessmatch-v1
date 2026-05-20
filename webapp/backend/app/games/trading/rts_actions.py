"""RTS 指令校验与结算"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from app.domains.arena.config_json import persist_match_config
from app.domains.arena.models import ArenaMatch, ArenaParticipant
from app.games.trading.rts_config import city_catalog, product_catalog, vehicle_defs
from app.games.trading.rts_logistics import (
    can_add_inventory,
    effective_travel_ticks,
    inventory_volume_used,
    max_vehicles,
    move_cash_cost,
    player_can_trade,
    storage_capacity,
)
from app.games.trading.rts_state import get_rts_runtime, player_state

_VALID_ACTIONS = frozenset({"buy", "sell", "move", "buy_vehicle", "hold"})


def _city_prices(snapshot: dict, city: str, product_id: str) -> Tuple[int, int]:
    cp = snapshot.get(city, {})
    if product_id not in cp:
        return 0, 0
    row = cp[product_id]
    if isinstance(row, dict):
        return int(row.get("ask", 0)), int(row.get("bid", 0))
    return int(row), int(row * 0.92)


def queue_action(
    runtime: dict,
    participant_id: int,
    action_type: str,
    payload: dict,
) -> None:
    runtime.setdefault("pending_actions", []).append({
        "participant_id": participant_id,
        "action_type": action_type,
        "payload": payload,
    })


def apply_pending_actions(
    db,
    event: ArenaMatch,
    participants: List[ArenaParticipant],
    snapshot: dict,
    runtime: dict,
    tick: int,
) -> List[dict]:
    config = event.config or {}
    config_id = event.game_config_id or "trading-v2-rts"
    products = product_catalog(config, config_id)
    pmap = {p.id: p for p in participants}
    results: List[dict] = []
    pending = list(runtime.get("pending_actions") or [])
    runtime["pending_actions"] = []

    for act in pending:
        pid = act.get("participant_id")
        p = pmap.get(pid)
        if not p:
            continue
        atype = act.get("action_type", "hold")
        payload = act.get("payload") or {}
        ps = player_state(config, p.id)
        ok, msg = _execute_one(
            p, ps, atype, payload, config, config_id, products,
            snapshot, runtime, tick,
        )
        results.append({"participant_id": pid, "ok": ok, "message": msg, "action": atype})
        _refresh_assets(p, snapshot, config_id, config)

    persist_match_config(event, config)
    return results


def _execute_one(
    participant: ArenaParticipant,
    ps: dict,
    action_type: str,
    payload: dict,
    config: dict,
    config_id: str,
    products: dict,
    snapshot: dict,
    runtime: dict,
    tick: int,
) -> Tuple[bool, str]:
    if not player_can_trade(ps.get("transit"), tick):
        return False, "运输途中无法交易"

    city = participant.current_city
    inventory = dict(participant.inventory or {})
    vehicles = list(ps.get("vehicles") or [])
    cap = storage_capacity(config, vehicles, config_id)

    if action_type == "buy":
        product_id = payload.get("product_id")
        qty = int(payload.get("quantity") or 0)
        if qty < 1 or product_id not in products:
            return False, "无效购买"
        ask, _ = _city_prices(snapshot, city, product_id)
        if ask <= 0:
            return False, "该商品在本城不可交易"
        cost = ask * qty
        if cost > participant.cash:
            return False, "现金不足"
        ok, msg = can_add_inventory(inventory, product_id, qty, products, cap)
        if not ok:
            return False, msg
        participant.cash -= cost
        inventory[product_id] = inventory.get(product_id, 0) + qty
        participant.inventory = inventory
        cs = runtime["cities"].setdefault(city, {})
        pools = cs.setdefault("pools", {})
        pools[product_id] = float(pools.get(product_id, 0)) - qty
        bt = cs.setdefault("buy_tick", {})
        bt[product_id] = float(bt.get(product_id, 0)) + qty
        return True, "购买成功"

    if action_type == "sell":
        product_id = payload.get("product_id")
        qty = int(payload.get("quantity") or 0)
        if qty < 1 or product_id not in products:
            return False, "无效出售"
        held = int(inventory.get(product_id, 0))
        if qty > held:
            return False, "库存不足"
        _, bid = _city_prices(snapshot, city, product_id)
        if bid <= 0:
            return False, "该商品在本城不可交易"
        pricing = config.get("pricing") or {}
        cap_abs = int(pricing.get("absorption_cap_per_tick", 25))
        cs = runtime["cities"].setdefault(city, {})
        st = cs.setdefault("sell_tick", {})
        already = float(st.get(product_id, 0))
        if already + qty > cap_abs:
            return False, f"本城本 tick 收购上限 {cap_abs}，已售 {int(already)}"
        revenue = bid * qty
        participant.cash += revenue
        inventory[product_id] = held - qty
        if inventory[product_id] <= 0:
            del inventory[product_id]
        participant.inventory = inventory
        pools = cs.setdefault("pools", {})
        pools[product_id] = float(pools.get(product_id, 0)) + qty
        st[product_id] = already + qty
        return True, "出售成功"

    if action_type == "move":
        to_city = payload.get("to_city")
        cities = config.get("cities", [])
        if to_city not in cities:
            return False, "目标城市无效"
        if to_city == city:
            return False, "已在目标城市"
        cost = move_cash_cost(config)
        if cost > participant.cash:
            return False, "路费不足"
        travel = effective_travel_ticks(city, to_city, config, vehicles, config_id)
        participant.cash -= cost
        ps["transit"] = {
            "from_city": city,
            "to_city": to_city,
            "arrival_tick": tick + travel,
        }
        return True, f"已出发，预计 {travel} tick 后到达"

    if action_type == "buy_vehicle":
        vtype = payload.get("vehicle_type")
        defs = vehicle_defs(config, config_id)
        if vtype not in defs:
            return False, "车型无效"
        if len(vehicles) >= max_vehicles(config):
            return False, f"最多购置 {max_vehicles(config)} 辆车"
        price = int(defs[vtype].get("cost", 0))
        if price > participant.cash:
            return False, "现金不足"
        participant.cash -= price
        vehicles.append(vtype)
        ps["vehicles"] = vehicles
        return True, "购车成功"

    if action_type == "hold":
        return True, "待命"
    return False, "未知指令类型"


def advance_transits(config: dict, participants: List[ArenaParticipant], tick: int) -> None:
    for p in participants:
        ps = player_state(config, p.id)
        tr = ps.get("transit")
        if not tr:
            continue
        if tick >= int(tr.get("arrival_tick", 0)):
            p.current_city = tr.get("to_city", p.current_city)
            ps["transit"] = None


def natural_pool_tick(runtime: dict, match_config: dict, config_id: str) -> None:
    from app.games.trading.rts_pricing import tick_pool_delta

    products = product_catalog(match_config, config_id)
    cities = city_catalog(match_config, config_id)
    for ck, cc in cities.items():
        cs = runtime["cities"].setdefault(ck, {})
        pools = cs.setdefault("pools", {})
        buy_t = cs.get("buy_tick") or {}
        sell_t = cs.get("sell_tick") or {}
        for pid in products:
            delta = tick_pool_delta(
                cc, pid,
                float(buy_t.get(pid, 0)),
                float(sell_t.get(pid, 0)),
            )
            pools[pid] = max(0.0, float(pools.get(pid, 0)) + delta)


def _refresh_assets(
    participant: ArenaParticipant,
    snapshot: dict,
    config_id: str,
    config: dict,
) -> None:
    city = participant.current_city
    inv = participant.inventory or {}
    products = product_catalog(config, config_id)
    value = 0.0
    for pid, qty in inv.items():
        _, bid = _city_prices(snapshot, city, pid)
        if bid > 0:
            value += bid * qty
        else:
            for ck, cp in snapshot.items():
                if ck.startswith("_") or not isinstance(cp, dict):
                    continue
                if pid in cp and isinstance(cp[pid], dict):
                    value += int(cp[pid].get("bid", 0)) * qty
                    break
    participant.total_assets = round(participant.cash + value, 2)


def validate_queue(
    participant: ArenaParticipant,
    event: ArenaMatch,
    action_type: str,
    payload: dict,
    snapshot: dict,
    tick: int,
) -> Tuple[bool, str]:
    config = event.config or {}
    config_id = event.game_config_id or "trading-v2-rts"
    ps = player_state(config, participant.id)
    if not player_can_trade(ps.get("transit"), tick):
        return False, "运输途中无法操作"

    products = product_catalog(config, config_id)
    vehicles = list(ps.get("vehicles") or [])
    cap = storage_capacity(config, vehicles, config_id)
    city = participant.current_city

    if action_type == "buy":
        pid = payload.get("product_id")
        qty = int(payload.get("quantity") or 0)
        ask, _ = _city_prices(snapshot, city, pid)
        if qty < 1 or ask <= 0:
            return False, "无法购买"
        if ask * qty > participant.cash:
            return False, "现金不足"
        inv = dict(participant.inventory or {})
        ok, msg = can_add_inventory(inv, pid, qty, products, cap)
        return ok, msg

    if action_type == "sell":
        pid = payload.get("product_id")
        qty = int(payload.get("quantity") or 0)
        if qty < 1 or int((participant.inventory or {}).get(pid, 0)) < qty:
            return False, "库存不足"
        pricing = config.get("pricing") or {}
        cap_abs = int(pricing.get("absorption_cap_per_tick", 25))
        rt = get_rts_runtime(config)
        cs = rt.get("cities", {}).get(city, {})
        already = float((cs.get("sell_tick") or {}).get(pid, 0))
        if already + qty > cap_abs:
            return False, f"本城本 tick 收购上限 {cap_abs}，已售 {int(already)}"
        return True, ""

    if action_type == "move":
        to = payload.get("to_city")
        if to not in config.get("cities", []):
            return False, "无效城市"
        if move_cash_cost(config) > participant.cash:
            return False, "路费不足"
        if ps.get("transit"):
            return False, "已在途中"
        return True, ""

    if action_type == "buy_vehicle":
        vtype = payload.get("vehicle_type")
        defs = vehicle_defs(config, config_id)
        if vtype not in defs:
            return False, "无效车型"
        if len(vehicles) >= max_vehicles(config):
            return False, "车辆已满"
        if int(defs[vtype].get("cost", 0)) > participant.cash:
            return False, "现金不足"
        return True, ""

    if action_type not in _VALID_ACTIONS:
        return False, "未知指令类型"
    return True, ""
