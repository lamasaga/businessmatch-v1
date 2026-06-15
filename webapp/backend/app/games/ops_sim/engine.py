"""OPS settlement engine.

Pure functions only: no database reads/writes. The formulas follow
docs/prd/SPEC-OPS-ECONOMY.md.
"""

from __future__ import annotations

import copy
import math
import random
from typing import Any

from app.games.ops_sim.config import V, city_tier_multiplier


def _cfg_map(cfg: dict[str, Any], key: str) -> dict[str, Any]:
    val = cfg.get(key, {})
    return val if isinstance(val, dict) else {}


def _defaults(cfg: dict[str, Any]) -> dict[str, Any]:
    return _cfg_map(cfg, "defaults")


def _category_config(category: str, cfg: dict[str, Any]) -> dict[str, Any]:
    return _cfg_map(cfg, "product_categories").get(category, {})


def _segments(cfg: dict[str, Any]) -> dict[str, Any]:
    return _cfg_map(cfg, "consumer_segments")


def _city_config(city_id: str, cfg: dict[str, Any]) -> dict[str, Any]:
    return _cfg_map(cfg, "cities").get(city_id, {})


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def _round_money(x: float) -> float:
    return round(float(x), 2)


def _normalize_attr(value: float) -> float:
    return value / 20.0


def _softmax(beta: float, utilities: dict[int, float]) -> dict[int, float]:
    if not utilities:
        return {}
    max_u = max(utilities.values())
    exp_vals = {uid: math.exp(beta * (u - max_u)) for uid, u in utilities.items()}
    total = sum(exp_vals.values())
    if total <= 0:
        return {uid: 1.0 / len(exp_vals) for uid in exp_vals}
    return {uid: val / total for uid, val in exp_vals.items()}


def _city_weights(city_cfg: dict[str, Any], cfg: dict[str, Any]) -> dict[str, float]:
    """Blend segment weights by the city's consumer composition."""
    segs = _segments(cfg)
    ratios = {
        "geek": _safe_float(city_cfg.get("geek_ratio"), 0.0),
        "pragmatic": _safe_float(city_cfg.get("pragmatic_ratio"), 0.0),
        "show": _safe_float(city_cfg.get("show_ratio"), 0.0),
    }
    ratio_total = sum(ratios.values())
    if ratio_total <= 0:
        ratios = {"geek": 0.0, "pragmatic": 1.0, "show": 0.0}
        ratio_total = 1.0

    weights = {"tech": 0.0, "fit": 0.0, "show": 0.0}
    for seg_id, ratio in ratios.items():
        seg = segs.get(seg_id, {})
        factor = ratio / ratio_total
        weights["tech"] += factor * _safe_float(seg.get("tech_weight"), 0.3)
        weights["fit"] += factor * _safe_float(seg.get("fit_weight"), 0.4)
        weights["show"] += factor * _safe_float(seg.get("show_weight"), 0.3)

    total = sum(weights.values())
    if total <= 0:
        return {"tech": 0.3, "fit": 0.4, "show": 0.3}
    return {k: v / total for k, v in weights.items()}


def _resources(state: dict[str, Any], key: str) -> list[dict[str, Any]]:
    val = state.get(key, [])
    if not isinstance(val, list):
        return []
    return [x for x in val if isinstance(x, dict)]


def _all_resource_effects(state: dict[str, Any]) -> list[dict[str, Any]]:
    effects: list[dict[str, Any]] = []
    for key in ("factories", "ads", "channels", "protections", "strategic_resources", "endorsements"):
        for res in _resources(state, key):
            effect = res.get("effect") if isinstance(res.get("effect"), dict) else res
            effects.append(effect)
    return effects


def _resource_sum(state: dict[str, Any], field: str, city_id: str | None = None) -> float:
    total = 0.0
    for effect in _all_resource_effects(state):
        if city_id and effect.get("city") not in (None, city_id):
            continue
        total += _safe_float(effect.get(field), 0.0)
    return total


def _resource_multiplier(state: dict[str, Any], field: str, city_id: str | None = None, default: float = 1.0) -> float:
    multiplier = default
    for effect in _all_resource_effects(state):
        if city_id and effect.get("city") not in (None, city_id):
            continue
        if field in effect:
            multiplier *= _safe_float(effect.get(field), 1.0)
    return multiplier


def compute_capacity(state: dict[str, Any], decision: dict[str, Any], cfg: dict[str, Any]) -> int:
    base = _safe_float(V("base_capacity", cfg, 200), 200)
    worker_productivity = _safe_float(V("worker_productivity", cfg, 20), 20)
    sales_force = _safe_int(decision.get("sales_force", 0), 0)
    capacity_bonus = _resource_sum(state, "capacity_bonus")
    channel_bonus = _resource_sum(state, "capacity_bonus_from_channel")
    return int(max(0, base + capacity_bonus + channel_bonus + worker_productivity * sales_force))


def compute_unit_cost(
    state: dict[str, Any],
    category_cfg: dict[str, Any],
    actual_production: int,
    event_state: dict[str, Any],
) -> dict[str, float]:
    discount = _safe_float(state.get("discount_rate"), 0.0)
    discount += _resource_sum(state, "material_cost_discount")
    discount = _clamp(discount, 0.0, 0.8)
    material_multiplier = _safe_float(event_state.get("material_cost_multiplier"), 1.0)
    raw_cost = _safe_float(category_cfg.get("base_material_cost"), 0.0) * material_multiplier * (1 - discount)
    labor_cost = _safe_float(category_cfg.get("base_labor_cost"), 0.0)
    overhead = _safe_float(category_cfg.get("base_overhead"), 0.0) / max(actual_production, 1)
    return {
        "raw_cost": raw_cost,
        "labor_cost": labor_cost,
        "overhead_per_unit": overhead,
        "unit_cost": raw_cost + labor_cost + overhead,
        "discount_rate": discount,
    }


def update_tech(state: dict[str, Any], decision: dict[str, Any], cfg: dict[str, Any]) -> float:
    current = _safe_float(state.get("tech"), 20.0)
    spend = max(0.0, _safe_float(decision.get("rnd_spend"), 0.0))
    alpha = _safe_float(V("tech_response_alpha", cfg, 2.0), 2.0)
    scale = max(_safe_float(V("tech_response_scale", cfg, 5000), 5000), 1.0)
    decay = _safe_float(V("tech_decay", cfg, 0.0), 0.0)
    quality_bonus = _resource_sum(state, "quality_bonus") * 20.0
    tech_bonus = _resource_sum(state, "tech_bonus")
    return round((1 - decay) * current + alpha * math.log1p(spend / scale) + quality_bonus + tech_bonus, 2)


def update_fit(state: dict[str, Any], decision: dict[str, Any], cfg: dict[str, Any]) -> float:
    current = _safe_float(state.get("fit"), 20.0)
    spend = max(0.0, _safe_float(decision.get("rnd_spend"), 0.0))
    alpha = _safe_float(V("fit_response_alpha", cfg, 0.25), 0.25)
    scale = max(_safe_float(V("fit_response_scale", cfg, 8000), 8000), 1.0)
    fit_max = _safe_float(V("fit_max", cfg, 80), 80)
    return round(min(fit_max, current + alpha * math.log1p(spend / scale)), 2)


def update_show(state: dict[str, Any], decision: dict[str, Any], cfg: dict[str, Any]) -> float:
    current = _safe_float(state.get("show"), 20.0)
    spend = max(0.0, _safe_float(decision.get("marketing_spend"), 0.0))
    alpha = _safe_float(V("show_response_alpha", cfg, 1.6), 1.6)
    scale = max(_safe_float(V("show_response_scale", cfg, 5000), 5000), 1.0)
    decay = _safe_float(V("show_decay", cfg, 0.05), 0.05)
    show_bonus = _resource_sum(state, "show_bonus")
    return round((1 - decay) * current + alpha * math.log1p(spend / scale) + show_bonus, 2)


def _effective_show(state: dict[str, Any], show_value: float, city_id: str) -> float:
    city_multiplier = _resource_multiplier(state, "show_multiplier", city_id=city_id, default=1.0)
    return show_value * city_multiplier


def _price_reference(decisions: dict[int, dict[str, Any]], city_team_ids: list[int], category_cfg: dict[str, Any], cfg: dict[str, Any]) -> float:
    base_price = _safe_float(category_cfg.get("base_price"), 100.0)
    prices = [_safe_float(decisions[tid].get("unit_price"), base_price) for tid in city_team_ids]
    avg_price = sum(prices) / max(len(prices), 1)
    base_weight = _safe_float(V("price_reference_base_weight", cfg, 0.65), 0.65)
    return max(base_weight * base_price + (1 - base_weight) * avg_price, 1.0)


def compute_utility(
    state: dict[str, Any],
    decision: dict[str, Any],
    city_id: str,
    city_cfg: dict[str, Any],
    category_cfg: dict[str, Any],
    price_ref: float,
    cfg: dict[str, Any],
) -> float:
    weights = _city_weights(city_cfg, cfg)
    unit_price = max(_safe_float(decision.get("unit_price"), category_cfg.get("base_price", 100)), 1.0)
    sensitivity = _safe_float(city_cfg.get("price_sensitivity"), _safe_float(V("price_sensitivity", cfg, 1.5), 1.5))
    price_penalty = sensitivity * math.log(unit_price / max(price_ref, 1.0))
    show = _effective_show(state, _safe_float(state.get("_next_show", state.get("show", 20.0))), city_id)
    utility = (
        weights["tech"] * _normalize_attr(_safe_float(state.get("_next_tech", state.get("tech", 20.0))))
        + weights["fit"] * _normalize_attr(_safe_float(state.get("_next_fit", state.get("fit", 20.0))))
        + weights["show"] * _normalize_attr(show)
        - price_penalty
        + _resource_sum(state, "utility_bonus", city_id=city_id)
    )
    return utility


def _opening_fee(state: dict[str, Any], city_id: str, city_cfg: dict[str, Any], event_state: dict[str, Any], cfg: dict[str, Any]) -> float:
    entered = set(state.get("entered_cities") or [])
    if city_id in entered:
        return 0.0
    tier = _safe_int(city_cfg.get("tier"), 2)
    tier_multipliers = V("city_tier_opening_multiplier", cfg, None)
    if isinstance(tier_multipliers, dict):
        tier_multiplier = _safe_float(tier_multipliers.get(tier) or tier_multipliers.get(str(tier)), city_tier_multiplier(tier))
    else:
        tier_multiplier = city_tier_multiplier(tier)
    fee = _safe_float(city_cfg.get("opening_cost"), 15000) * tier_multiplier
    if event_state.get("policy_subsidy_city") == city_id:
        fee *= _safe_float(event_state.get("policy_subsidy_multiplier"), 0.5)
    fee *= max(0.0, 1 - _resource_sum(state, "opening_cost_discount", city_id=city_id))
    return fee


def _target_cities_for_market(state: dict[str, Any], decision: dict[str, Any]) -> list[str]:
    cities = set(state.get("entered_cities") or [])
    cities.update(decision.get("target_cities") or [])
    return sorted(c for c in cities if isinstance(c, str))


def _trigger_event(match_state: dict[str, Any], cfg: dict[str, Any]) -> dict[str, Any] | None:
    round_no = _safe_int(match_state.get("round_number"), 1)
    if round_no not in (3, 5):
        return None
    event_types = _cfg_map(cfg, "event_types")
    if not event_types:
        return None
    seed = f"{match_state.get('event_id', 'ops')}:{round_no}:ops_event"
    rng = random.Random(hash(seed) % (2**32))
    candidates = []
    for event_id, event_cfg in event_types.items():
        probability = _safe_float(event_cfg.get("probability"), 0.0)
        if probability > 0:
            candidates.append((event_id, event_cfg, probability))
    if not candidates:
        return None
    total_prob = min(sum(p for _, _, p in candidates), 0.85)
    if rng.random() > total_prob:
        return None
    pick = rng.random() * sum(p for _, _, p in candidates)
    acc = 0.0
    for event_id, event_cfg, probability in candidates:
        acc += probability
        if pick <= acc:
            return {"id": event_id, **event_cfg}
    event_id, event_cfg, _ = candidates[-1]
    return {"id": event_id, **event_cfg}


def settle_round(match_state: dict[str, Any], decisions: dict[int, dict[str, Any]], cfg: dict[str, Any]) -> dict[str, Any]:
    """Settle one OPS operation round."""
    team_states = copy.deepcopy(match_state.get("team_states", {}))
    event_state = copy.deepcopy(match_state.get("event_state", {}))
    round_no = _safe_int(match_state.get("round_number"), 1)
    defaults = _defaults(cfg)
    max_production = _safe_int(defaults.get("max_production_per_round"), 500)

    normalized_decisions: dict[int, dict[str, Any]] = {}
    for tid_raw, decision in decisions.items():
        tid = int(tid_raw)
        state = team_states.get(tid) or team_states.get(str(tid)) or {}
        category = state.get("category") or "home"
        cat_cfg = _category_config(category, cfg)
        base_price = _safe_float(cat_cfg.get("base_price"), 100)
        min_price = base_price * _safe_float(V("min_price_multiplier", cfg, 0.5), 0.5)
        max_price = base_price * _safe_float(V("max_price_multiplier", cfg, 2.5), 2.5)
        normalized_decisions[tid] = {
            "production_quantity": max(0, _safe_int(decision.get("production_quantity"), 0)),
            "unit_price": _clamp(_safe_float(decision.get("unit_price"), base_price), min_price, max_price),
            "marketing_spend": max(0.0, _safe_float(decision.get("marketing_spend"), 0.0)),
            "rnd_spend": max(0.0, _safe_float(decision.get("rnd_spend"), 0.0)),
            "sales_force": max(0, _safe_int(decision.get("sales_force"), 0)),
            "target_cities": [c for c in (decision.get("target_cities") or []) if c in _cfg_map(cfg, "cities")],
        }

    production: dict[int, int] = {}
    unit_costs: dict[int, dict[str, float]] = {}
    raw_spend: dict[int, float] = {}
    opening_fees: dict[int, float] = {}
    new_cities_by_team: dict[int, list[str]] = {}

    for tid, decision in normalized_decisions.items():
        state = team_states.get(tid) or team_states.get(str(tid)) or {}
        category = state.get("category") or "home"
        cat_cfg = _category_config(category, cfg)
        cap = compute_capacity(state, decision, cfg)
        actual = min(decision["production_quantity"], cap, max_production)
        costs = compute_unit_cost(state, cat_cfg, actual, event_state)
        fees = 0.0
        new_cities: list[str] = []
        for city_id in decision["target_cities"]:
            fee = _opening_fee(state, city_id, _city_config(city_id, cfg), event_state, cfg)
            if fee > 0:
                new_cities.append(city_id)
                fees += fee
        next_tech = update_tech(state, decision, cfg)
        next_fit = update_fit(state, decision, cfg)
        next_show = update_show(state, decision, cfg)
        state["_next_tech"] = next_tech
        state["_next_fit"] = next_fit
        state["_next_show"] = next_show
        production[tid] = actual
        unit_costs[tid] = costs
        raw_spend[tid] = actual * costs["raw_cost"]
        opening_fees[tid] = fees
        new_cities_by_team[tid] = new_cities

    demand_by_team: dict[int, int] = {tid: 0 for tid in normalized_decisions}
    city_details: dict[int, list[dict[str, Any]]] = {tid: [] for tid in normalized_decisions}
    cities_cfg = _cfg_map(cfg, "cities")
    beta = _safe_float(V("logit_beta", cfg, V("beta", cfg, 0.25)), 0.25)

    for city_id, city_cfg in cities_cfg.items():
        city_team_ids = [
            tid for tid, decision in normalized_decisions.items()
            if city_id in _target_cities_for_market(team_states.get(tid) or team_states.get(str(tid)) or {}, decision)
        ]
        if not city_team_ids:
            continue

        utilities: dict[int, float] = {}
        for tid in city_team_ids:
            state = team_states.get(tid) or team_states.get(str(tid)) or {}
            category = state.get("category") or "home"
            cat_cfg = _category_config(category, cfg)
            price_ref = _price_reference(normalized_decisions, city_team_ids, cat_cfg, cfg)
            utilities[tid] = compute_utility(state, normalized_decisions[tid], city_id, city_cfg, cat_cfg, price_ref, cfg)

        shares = _softmax(beta, utilities)
        for tid in city_team_ids:
            state = team_states.get(tid) or team_states.get(str(tid)) or {}
            category = state.get("category") or "home"
            cat_cfg = _category_config(category, cfg)
            base_market = _safe_float(city_cfg.get("market_size"), 5000)
            category_multiplier = _safe_float(cat_cfg.get("market_size_multiplier"), 1.0)
            event_multiplier = _safe_float(event_state.get("market_size_multiplier"), 1.0)
            if event_state.get("market_boost_city") == city_id:
                event_multiplier *= _safe_float(event_state.get("market_boost_multiplier"), 1.05)
            channel_multiplier = _resource_multiplier(state, "demand_multiplier", city_id=city_id, default=1.0)
            demand = int(base_market * category_multiplier * shares.get(tid, 0.0) * channel_multiplier * event_multiplier)
            demand_by_team[tid] += demand
            city_details[tid].append({
                "city_id": city_id,
                "market_size": round(base_market * category_multiplier, 2),
                "utility": round(utilities[tid], 4),
                "share": round(shares.get(tid, 0.0), 4),
                "demand": demand,
            })

    results: list[dict[str, Any]] = []
    for tid, decision in normalized_decisions.items():
        state = copy.deepcopy(team_states.get(tid) or team_states.get(str(tid)) or {})
        category = state.get("category") or "home"
        cat_cfg = _category_config(category, cfg)
        actual_prod = production.get(tid, 0)
        unit_cost = unit_costs[tid]["unit_cost"]
        demand = demand_by_team.get(tid, 0)
        prev_inventory = _safe_int(state.get("inventory"), 0)
        available = prev_inventory + actual_prod
        sales = min(demand, available)
        ending_inventory = max(0, available - sales)
        stockout = max(demand - available, 0)

        revenue = sales * decision["unit_price"]
        cogs = sales * unit_cost
        gross_profit = revenue - cogs
        labor_expense = decision["sales_force"] * _safe_float(V("wage_per_head", cfg, 1500), 1500)
        fixed_overhead = _safe_float(cat_cfg.get("base_overhead"), _safe_float(V("fixed_overhead", cfg, 3500), 3500))
        holding_cost = ending_inventory * _safe_float(V("holding_cost_per_unit", cfg, 2), 2)
        operating_expenses = (
            decision["marketing_spend"]
            + decision["rnd_spend"]
            + labor_expense
            + fixed_overhead
            + opening_fees.get(tid, 0.0)
            + holding_cost
        )
        net_profit = gross_profit - operating_expenses
        cash = (
            _safe_float(state.get("cash"), 100000)
            - raw_spend.get(tid, 0.0)
            - decision["marketing_spend"]
            - decision["rnd_spend"]
            - labor_expense
            - fixed_overhead
            - opening_fees.get(tid, 0.0)
            - holding_cost
            + revenue
        )
        inventory_value = ending_inventory * unit_cost
        net_assets = cash + inventory_value
        cumulative_profit = _safe_float(state.get("cumulative_profit"), 0.0) + net_profit
        entered = set(state.get("entered_cities") or [])
        entered.update(new_cities_by_team.get(tid, []))

        results.append({
            "team_id": tid,
            "round_number": round_no,
            "production_planned": decision["production_quantity"],
            "production_actual": actual_prod,
            "capacity": compute_capacity(state, decision, cfg),
            "unit_price": _round_money(decision["unit_price"]),
            "unit_cost": _round_money(unit_cost),
            "raw_cost": _round_money(unit_costs[tid]["raw_cost"]),
            "raw_spend": _round_money(raw_spend.get(tid, 0.0)),
            "demand": demand,
            "sales": sales,
            "stockout": stockout,
            "revenue": _round_money(revenue),
            "cogs": _round_money(cogs),
            "gross_profit": _round_money(gross_profit),
            "marketing_spend": _round_money(decision["marketing_spend"]),
            "rnd_spend": _round_money(decision["rnd_spend"]),
            "sales_force": decision["sales_force"],
            "labor_expense": _round_money(labor_expense),
            "fixed_overhead": _round_money(fixed_overhead),
            "operating_expenses": _round_money(operating_expenses),
            "holding_cost": _round_money(holding_cost),
            "operating_profit": _round_money(net_profit),
            "net_profit": _round_money(net_profit),
            "cash_after": _round_money(cash),
            "inventory_after": ending_inventory,
            "inventory_value": _round_money(inventory_value),
            "net_assets": _round_money(net_assets),
            "cumulative_profit": _round_money(cumulative_profit),
            "tech": _round_money(state.get("_next_tech", state.get("tech", 20))),
            "fit": _round_money(state.get("_next_fit", state.get("fit", 20))),
            "show": _round_money(state.get("_next_show", state.get("show", 20))),
            "entered_cities": sorted(entered),
            "new_cities": new_cities_by_team.get(tid, []),
            "opening_fees": _round_money(opening_fees.get(tid, 0.0)),
            "city_details": city_details.get(tid, []),
        })

    event = _trigger_event(match_state, cfg)
    news: list[dict[str, Any]] = []
    if event:
        news.append({
            "kind": event["id"],
            "headline": f"{event.get('name', event['id'])}：{event.get('desc', '')}",
            "body": event.get("body", ""),
        })

    return {"results": results, "news": news, "event": event}


def build_financial_statements(result: dict[str, Any]) -> dict[str, Any]:
    income = {
        "revenue": result["revenue"],
        "cogs": result["cogs"],
        "gross_profit": result["gross_profit"],
        "marketing_expense": result["marketing_spend"],
        "rnd_expense": result["rnd_spend"],
        "labor_expense": result.get("labor_expense", result["sales_force"] * 1500),
        "overhead_expense": result.get("fixed_overhead", 0),
        "opening_fees": result["opening_fees"],
        "holding_cost": result["holding_cost"],
        "operating_profit": result["operating_profit"],
        "net_profit": result["net_profit"],
    }

    balance = {
        "cash": result["cash_after"],
        "inventory": result["inventory_after"],
        "inventory_value": result["inventory_value"],
        "net_assets": result["net_assets"],
    }

    explanation = {
        "demand": result.get("demand", 0),
        "sales": result.get("sales", 0),
        "stockout": result.get("stockout", 0),
        "capacity": result.get("capacity", 0),
        "city_details": result.get("city_details", []),
    }

    return {"income_statement": income, "balance_sheet": balance, "explanation": explanation}
