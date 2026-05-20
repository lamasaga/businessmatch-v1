"""AI 交易员 — 练习局模拟其他玩家买卖，驱动供需波动"""

from __future__ import annotations

import random
from typing import Any, Dict, Tuple

from sqlalchemy.orm import Session

from app.domains.arena.models import ArenaMatch, ArenaParticipant
from app.games.trading.enums import ActionType
from app.games.trading.models import TradingDecision, TradingRound
from app.games.trading.market import strip_price_snapshot
from app.games.trading.inventory import product_inventory_limit


def _inventory_value(inventory: dict, prices: Dict[str, Dict[str, int]]) -> float:
    total = 0.0
    for pid, qty in inventory.items():
        for city_prices in prices.values():
            if pid in city_prices and isinstance(city_prices[pid], (int, float)):
                total += float(city_prices[pid]) * qty
                break
    return total


def _cheapest_expensive(
    prices: Dict[str, Dict[str, int]],
    current_city: str,
    product_ids: list,
) -> Tuple[str | None, str | None, str | None]:
    local = prices.get(current_city, {})
    if not local:
        return None, None, None

    available = {p: local[p] for p in product_ids if p in local and isinstance(local[p], (int, float))}
    if not available:
        return None, None, None

    cheap_pid = min(available, key=available.get)
    exp_pid = max(available, key=available.get)

    best_city = None
    best_price = 0
    for pid in product_ids:
        for city, city_prices in prices.items():
            if pid in city_prices and isinstance(city_prices[pid], (int, float)):
                if city_prices[pid] > best_price:
                    best_price = city_prices[pid]
                    best_city = city
    return cheap_pid, exp_pid, best_city if best_city and best_city != current_city else None


def decide_ai_action(
    participant: ArenaParticipant,
    round_obj: TradingRound,
    event: ArenaMatch,
) -> Tuple[str, Dict[str, Any]]:
    config = event.config or {}
    prices = strip_price_snapshot(round_obj.price_snapshot)
    inventory = dict(participant.inventory or {})
    cash = participant.cash
    city = participant.current_city
    product_ids = config.get("products", list(prices.get(city, {}).keys()))
    cities = config.get("cities", list(prices.keys()))
    product_limit = product_inventory_limit(config)
    move_cost = config.get("move_cost", 1000)

    cheap, expensive, hot_city = _cheapest_expensive(prices, city, product_ids)
    local_prices = prices.get(city, {})
    roll = random.random()

    if inventory and expensive and roll < 0.45:
        pid = random.choice(list(inventory.keys()))
        qty = min(inventory[pid], random.randint(1, max(1, inventory[pid])))
        if pid in local_prices:
            return "sell", {"product_id": pid, "quantity": qty, "trade_city": city}

    if cheap and cash > local_prices.get(cheap, 999999) * 2 and roll < 0.75:
        price = local_prices[cheap]
        held = inventory.get(cheap, 0)
        max_qty = min(3, product_limit - held, int(cash // max(price, 1)))
        if max_qty >= 1:
            return "buy", {"product_id": cheap, "quantity": qty if (qty := random.randint(1, max_qty)) else 1, "trade_city": city}

    if hot_city and cash >= move_cost and roll < 0.55:
        return "move", {"to_city": hot_city, "from_city": city}

    if cash >= move_cost and roll < 0.35:
        options = [c for c in cities if c != city]
        if options:
            return "move", {"to_city": random.choice(options), "from_city": city}

    return "hold", {}


def apply_decision_to_participant(
    participant: ArenaParticipant,
    round_obj: TradingRound,
    event: ArenaMatch,
    action_type: str,
    action_data: Dict[str, Any],
) -> Tuple[float, Dict[str, int], Dict[str, Any], str]:
    config = event.config or {}
    prices = strip_price_snapshot(round_obj.price_snapshot)
    city = participant.current_city
    city_prices = prices.get(city, {})
    product_limit = product_inventory_limit(config)
    move_cost = config.get("move_cost", 1000)

    cash = participant.cash
    inventory = dict(participant.inventory or {})
    data = dict(action_data)
    final_action = action_type

    if action_type == "buy":
        pid = data.get("product_id")
        qty = int(data.get("quantity") or 0)
        price = city_prices.get(pid)
        if not pid or not price or qty < 1:
            return cash, inventory, {}, "hold"
        total = price * qty
        if total > cash or inventory.get(pid, 0) + qty > product_limit:
            return cash, inventory, {}, "hold"
        cash -= total
        inventory[pid] = inventory.get(pid, 0) + qty
        data.update({"price": price, "total_cost": total, "trade_city": city})
    elif action_type == "sell":
        pid = data.get("product_id")
        qty = int(data.get("quantity") or 0)
        price = city_prices.get(pid)
        if not pid or not price or qty < 1 or inventory.get(pid, 0) < qty:
            return cash, inventory, {}, "hold"
        cash += price * qty
        inventory[pid] -= qty
        if inventory[pid] <= 0:
            del inventory[pid]
        data.update({"price": price, "total_revenue": price * qty, "trade_city": city})
    elif action_type == "move":
        to_city = data.get("to_city")
        valid = config.get("cities", [])
        if to_city not in valid or to_city == city or cash < move_cost:
            return cash, inventory, {}, "hold"
        data["from_city"] = city
        data["move_cost"] = move_cost
        cash -= move_cost
        participant.current_city = to_city
    else:
        final_action = "hold"
        data = {}

    return cash, inventory, data, final_action


def run_ai_round_decisions(db: Session, round_obj: TradingRound, event: ArenaMatch) -> int:
    """为尚未决策的 AI 参赛者提交决策，返回新增决策数。"""
    prices = strip_price_snapshot(round_obj.price_snapshot)
    ai_participants = (
        db.query(ArenaParticipant)
        .filter(
            ArenaParticipant.event_id == round_obj.event_id,
            ArenaParticipant.is_ai == 1,
        )
        .all()
    )
    created = 0
    for p in ai_participants:
        exists = (
            db.query(TradingDecision)
            .filter(
                TradingDecision.round_id == round_obj.id,
                TradingDecision.participant_id == p.id,
            )
            .first()
        )
        if exists:
            continue

        action_type, action_data = decide_ai_action(p, round_obj, event)
        cash_after, inv_after, action_data, action_type = apply_decision_to_participant(
            p, round_obj, event, action_type, action_data
        )

        p.cash = cash_after
        p.inventory = inv_after
        p.total_assets = cash_after + _inventory_value(inv_after, prices)

        db.add(
            TradingDecision(
                round_id=round_obj.id,
                participant_id=p.id,
                action_type=ActionType(action_type),
                action_data=action_data,
                cash_after=cash_after,
                inventory_after=inv_after,
            )
        )
        created += 1

    return created
