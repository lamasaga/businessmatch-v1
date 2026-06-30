"""RTS 指令校验与结算"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from app.domains.arena.config_json import persist_match_config
from app.domains.arena.models import ArenaMatch, ArenaParticipant
from app.games.trading.rts_config import city_catalog, pricing_config, product_catalog, vehicle_defs
from app.games.trading.rts_events import production_demand_multipliers
from app.games.trading.world_slice import route_exists
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
from app.games.trading.rts_pricing import target_pool

_VALID_ACTIONS = frozenset({"buy", "sell", "move", "buy_vehicle", "set_distributor", "hold"})


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
    pending = runtime.setdefault("pending_actions", [])
    runtime["pending_actions"] = [
        a for a in pending if a.get("participant_id") != participant_id
    ]
    runtime["pending_actions"].append({
        "participant_id": participant_id,
        "action_type": action_type,
        "payload": payload,
        "queued_at_tick": int(runtime.get("tick", 0)),
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
    config_id = event.game_config_id or "fstrading"
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
        cash_before = float(p.cash)
        assets_before = float(p.total_assets)
        atype = act.get("action_type", "hold")
        payload = act.get("payload") or {}
        ps = player_state(config, p.id)
        ok, msg = _execute_one(
            p, ps, atype, payload, config, config_id, products,
            snapshot, runtime, tick,
        )
        results.append({"participant_id": pid, "ok": ok, "message": msg, "action": atype})
        _append_tick_digest(config, p.id, {
            "action_type": atype,
            "payload": payload,
            "ok": ok,
            "message": msg,
            "cash_delta": round(p.cash - cash_before, 2),
            "assets_delta": round(p.total_assets - assets_before, 2),
        })
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
            return False, f"本城今日收购上限 {cap_abs}，已售 {int(already)}"
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
        cities = list(city_catalog(config, config_id).keys())
        from app.games.trading.world_slice import routes_dict_for_match

        routes = routes_dict_for_match(config, config_id)
        if to_city not in cities:
            return False, "目标城市无效"
        if to_city == city:
            return False, "已在目标城市"
        if not route_exists(city, to_city, routes):
            return False, "两城之间无直达路网，请选择相邻城市"
        cost = move_cash_cost(config, city, to_city)
        if cost > participant.cash:
            return False, "路费不足"
        travel = effective_travel_ticks(city, to_city, config, vehicles, config_id)
        participant.cash -= cost
        ps["transit"] = {
            "from_city": city,
            "to_city": to_city,
            "arrival_tick": tick + travel,
        }
        return True, f"已出发，预计 {travel} 日后到达"

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

    if action_type == "set_distributor":
        dist_cfg = config.get("distributors") or {}
        if not dist_cfg.get("enabled", False):
            return False, "分销商未开启"
        target_city = payload.get("city") or city
        product_id = payload.get("product_id")
        side = payload.get("side")
        limit_price = int(payload.get("limit_price") or 0)
        quantity = int(payload.get("quantity") or 0)
        if target_city != city:
            return False, "只能在当前城市设置分销商"
        if product_id not in products or side not in ("buy", "sell") or limit_price < 1 or quantity < 1:
            return False, "分销商参数无效"
        distributors = list(ps.get("distributors") or [])
        max_distributors = int(dist_cfg.get("max_per_player", 2))
        if len(distributors) >= max_distributors:
            return False, f"最多设置 {max_distributors} 个分销商"
        setup_cost = int(dist_cfg.get("setup_cost", 6000))
        if setup_cost > participant.cash:
            return False, "现金不足，无法设置分销商"
        participant.cash -= setup_cost
        distributors.append({
            "city": target_city,
            "product_id": product_id,
            "side": side,
            "limit_price": limit_price,
            "quantity": quantity,
        })
        ps["distributors"] = distributors
        return True, "分销商已设置"

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
    products = product_catalog(match_config, config_id)
    cities = city_catalog(match_config, config_id)
    pricing = pricing_config(match_config)
    ref = float(pricing.get("reference_pool", 100))
    flow_scale = float(pricing.get("natural_flow_scale", 0.20))
    rev = float(pricing.get("pool_reversion_rate", 0.03))
    min_ratio = float(pricing.get("min_pool_ratio", 0.10))

    for ck, cc in cities.items():
        cs = runtime["cities"].setdefault(ck, {})
        pools = cs.setdefault("pools", {})
        buy_t = cs.get("buy_tick") or {}
        sell_t = cs.get("sell_tick") or {}
        for pid in products:
            pool = float(pools.get(pid, 0))
            tgt = target_pool(cc, pid, ref)
            prod = float((cc.get("production") or {}).get(pid, 0))
            cons = float((cc.get("consumption") or {}).get(pid, 0))
            prod_mult, demand_mult = production_demand_multipliers(runtime, ck, pid)
            prod *= prod_mult
            cons *= demand_mult
            player_buy = float(buy_t.get(pid, 0))
            player_sell = float(sell_t.get(pid, 0))

            structural = (prod - cons) * flow_scale
            reversion = (tgt - pool) * rev
            delta = structural + reversion - player_buy + player_sell

            floor = max(0.0, tgt * min_ratio)
            pools[pid] = max(floor, pool + delta)


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


def _append_tick_digest(config: dict, participant_id: int, entry: dict) -> None:
    ps = player_state(config, participant_id)
    buf = ps.setdefault("_digest_buffer", [])
    buf.append(entry)


def finalize_tick_digests(
    config: dict,
    participants: List[ArenaParticipant],
    tick: int,
    config_id: str,
    *,
    cash_at_tick_start: dict[int, float],
    assets_at_tick_start: dict[int, float],
) -> None:
    from app.games.trading.rts_action_present import build_digest_summary

    for p in participants:
        ps = player_state(config, p.id)
        entries = list(ps.pop("_digest_buffer", []))
        if not entries:
            continue
        cash_delta = round(p.cash - cash_at_tick_start.get(p.id, p.cash), 2)
        assets_delta = round(p.total_assets - assets_at_tick_start.get(p.id, p.total_assets), 2)
        ps["last_tick_digest"] = {
            "tick": tick,
            "cash_delta": cash_delta,
            "assets_delta": assets_delta,
            "entries": entries,
            "lines": build_digest_summary(entries, config=config, config_id=config_id),
        }


def validate_queue(
    participant: ArenaParticipant,
    event: ArenaMatch,
    action_type: str,
    payload: dict,
    snapshot: dict,
    tick: int,
) -> Tuple[bool, str]:
    config = event.config or {}
    config_id = event.game_config_id or "fstrading"
    rt = get_rts_runtime(config)
    from app.games.trading.rts_state import seconds_until_next_tick_float

    if seconds_until_next_tick_float(rt) < 0.6:
        return False, "今日正在结算，请稍候再操作"

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
            return False, f"本城今日收购上限 {cap_abs}，已售 {int(already)}"
        return True, ""

    if action_type == "move":
        to = payload.get("to_city")
        from app.games.trading.world_slice import routes_dict_for_match

        routes = routes_dict_for_match(config, config_id)
        if to not in city_catalog(config, config_id):
            return False, "无效城市"
        if not route_exists(city, to, routes):
            return False, "无直达路网"
        if move_cash_cost(config, city, to) > participant.cash:
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

    if action_type == "set_distributor":
        dist_cfg = config.get("distributors") or {}
        if not dist_cfg.get("enabled", False):
            return False, "分销商未开启"
        city_to_set = payload.get("city") or city
        pid = payload.get("product_id")
        side = payload.get("side")
        limit_price = int(payload.get("limit_price") or 0)
        qty = int(payload.get("quantity") or 0)
        if city_to_set != city:
            return False, "只能在当前城市设置分销商"
        if pid not in products or side not in ("buy", "sell") or limit_price < 1 or qty < 1:
            return False, "分销商参数无效"
        distributors = list(ps.get("distributors") or [])
        if len(distributors) >= int(dist_cfg.get("max_per_player", 2)):
            return False, "分销商数量已满"
        if int(dist_cfg.get("setup_cost", 6000)) > participant.cash:
            return False, "现金不足"
        return True, ""

    if action_type not in _VALID_ACTIONS:
        return False, "未知指令类型"
    return True, ""


def apply_distributors(
    event: ArenaMatch,
    participants: List[ArenaParticipant],
    snapshot: dict,
    runtime: dict,
    tick: int,
) -> List[dict]:
    config = event.config or {}
    dist_cfg = config.get("distributors") or {}
    if not dist_cfg.get("enabled", False):
        return []

    config_id = event.game_config_id or "fstrading"
    products = product_catalog(config, config_id)
    upkeep = int(dist_cfg.get("upkeep_per_tick", 120))
    max_volume = int(dist_cfg.get("max_daily_volume", 12))
    results: List[dict] = []

    for p in participants:
        ps = player_state(config, p.id)
        distributors = list(ps.get("distributors") or [])
        if not distributors:
            continue
        p.cash = max(0, p.cash - upkeep * len(distributors))
        inventory = dict(p.inventory or {})
        for dist in distributors:
            city = dist.get("city")
            pid = dist.get("product_id")
            side = dist.get("side")
            if pid not in products or not city:
                continue
            ask, bid = _city_prices(snapshot, city, pid)
            qty = max(1, min(int(dist.get("quantity") or 1), max_volume))
            limit_price = int(dist.get("limit_price") or 0)
            cs = runtime["cities"].setdefault(city, {})
            pools = cs.setdefault("pools", {})
            if side == "buy" and ask > 0 and ask <= limit_price:
                affordable = int(p.cash // ask)
                vehicles = list(ps.get("vehicles") or [])
                cap = storage_capacity(config, vehicles, config_id)
                buy_qty = max(0, min(qty, affordable))
                while buy_qty > 0:
                    ok, _ = can_add_inventory(inventory, pid, buy_qty, products, cap)
                    if ok:
                        break
                    buy_qty -= 1
                if buy_qty:
                    p.cash -= ask * buy_qty
                    inventory[pid] = inventory.get(pid, 0) + buy_qty
                    pools[pid] = float(pools.get(pid, 0)) - buy_qty
                    bt = cs.setdefault("buy_tick", {})
                    bt[pid] = float(bt.get(pid, 0)) + buy_qty
                    results.append({"participant_id": p.id, "city": city, "product_id": pid, "side": side, "quantity": buy_qty})
            elif side == "sell" and bid > 0 and bid >= limit_price:
                held = int(inventory.get(pid, 0))
                sell_qty = max(0, min(qty, held))
                if sell_qty:
                    p.cash += bid * sell_qty
                    inventory[pid] = held - sell_qty
                    if inventory[pid] <= 0:
                        del inventory[pid]
                    pools[pid] = float(pools.get(pid, 0)) + sell_qty
                    st = cs.setdefault("sell_tick", {})
                    st[pid] = float(st.get(pid, 0)) + sell_qty
                    results.append({"participant_id": p.id, "city": city, "product_id": pid, "side": side, "quantity": sell_qty})
        p.inventory = inventory

    if results:
        runtime.setdefault("tick_events", []).append({"type": "distributor_trades", "tick": tick, "trades": results[:20]})
    persist_match_config(event, config)
    return results
