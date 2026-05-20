"""回合推进 — 正式赛（组织者）与练习赛（自动）共用"""

from __future__ import annotations

from typing import Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.domains.arena.enums import MatchKind, MatchStatus
from app.domains.arena.models import ArenaMatch, ArenaParticipant
from app.games.trading import TradingRound, TradingPrice, RoundStatus
from app.games.trading.models import TradingDecision
from app.games.trading.engine import cities_meta_for, get_products_dict, load_world
from app.games.trading.market import (
    calculate_equilibrium_prices,
    calculate_market_prices,
    generate_market_events,
)


def _participant_cities_at_round(decisions, participants) -> dict:
    """决策提交时 participant.current_city 即交易城市；汇总用 action_data.trade_city。"""
    mapping = {p.id: p.current_city for p in participants}
    for d in decisions:
        city = (d.action_data or {}).get("trade_city")
        if city:
            mapping[d.participant_id] = city
    return mapping


def advance_to_next_round(db: Session, event: ArenaMatch, round_obj: TradingRound) -> Tuple[TradingRound, bool]:
    """
    结束当前回合并创建下一回合。
    返回 (最新回合对象, 是否整场比赛已结束)。
    """
    round_obj.status = RoundStatus.completed
    round_obj.ended_at = func.now()

    config = event.config or {}
    max_rounds = config.get("rounds", 10)

    if round_obj.round_number >= max_rounds:
        event.status = MatchStatus.finished
        event.ends_at = func.now()
        return round_obj, True

    config_id = event.game_config_id or "trading-v1"
    products_all, cities_all, _ = load_world(config_id)
    cities = config.get("cities", list(cities_all.keys()))
    product_keys = config.get("products", list(products_all.keys()))
    product_dict = get_products_dict(config_id, product_keys)
    city_meta = cities_meta_for(config_id, cities)

    participants = (
        db.query(ArenaParticipant)
        .filter(ArenaParticipant.event_id == event.id)
        .all()
    )
    decisions = (
        db.query(TradingDecision)
        .filter(TradingDecision.round_id == round_obj.id)
        .all()
    )
    participant_city = _participant_cities_at_round(decisions, participants)

    next_num = round_obj.round_number + 1
    new_events = generate_market_events(next_num, cities, product_dict, config_id)

    new_prices, market_meta = calculate_market_prices(
        product_dict,
        cities,
        city_meta,
        decisions,
        participant_city,
        round_obj.events or [],
        config_id,
    )

    new_round = TradingRound(
        event_id=event.id,
        round_number=next_num,
        status=RoundStatus.active,
        events=new_events,
        price_snapshot={**new_prices, "_market_meta": market_meta},
    )
    db.add(new_round)
    db.flush()

    for city_key, city_prices in new_prices.items():
        city_meta_prices = (market_meta or {}).get(city_key, {})
        for pid, price in city_prices.items():
            m = city_meta_prices.get(pid, {})
            db.add(
                TradingPrice(
                    event_id=event.id,
                    round_id=new_round.id,
                    city=city_key,
                    product_id=pid,
                    base_price=product_dict[pid]["base_price"],
                    supply_factor=float(m.get("sell_qty", 0)),
                    event_factor=float(m.get("pressure", 0)),
                    final_price=price,
                )
            )

    for p in participants:
        inv_val = 0.0
        for pid, qty in (p.inventory or {}).items():
            for c_prices in new_prices.values():
                if pid in c_prices:
                    inv_val += c_prices[pid] * qty
                    break
        p.total_assets = p.cash + inv_val

    event.current_round = next_num
    return new_round, False


def create_first_round(db: Session, event: ArenaMatch) -> TradingRound:
    config = event.config or {}
    config_id = event.game_config_id or "trading-v1"
    products_all, cities_all, _ = load_world(config_id)
    cities_list = config.get("cities", list(cities_all.keys()))
    product_keys = config.get("products", list(products_all.keys()))
    product_dict = get_products_dict(config_id, product_keys)
    city_meta = cities_meta_for(config_id, cities_list)

    initial_prices, market_meta = calculate_equilibrium_prices(
        product_dict, cities_list, city_meta, config_id
    )
    events = generate_market_events(1, cities_list, product_dict, config_id)

    first_round = TradingRound(
        event_id=event.id,
        round_number=1,
        status=RoundStatus.active,
        events=events,
        price_snapshot={**initial_prices, "_market_meta": market_meta},
    )
    db.add(first_round)
    db.flush()

    for city_key, city_prices in initial_prices.items():
        for pid, price in city_prices.items():
            db.add(
                TradingPrice(
                    event_id=event.id,
                    round_id=first_round.id,
                    city=city_key,
                    product_id=pid,
                    base_price=product_dict[pid]["base_price"],
                    final_price=price,
                )
            )
    return first_round
