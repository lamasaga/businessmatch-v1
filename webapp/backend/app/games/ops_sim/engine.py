"""OPS 结算引擎 — 纯函数、幂等、不读写数据库"""

from __future__ import annotations

import copy
import math
import random
from typing import Any

from app.games.ops_sim.config import V


def _category_config(category: str, cfg: dict[str, Any]) -> dict[str, Any]:
    return cfg.get("product_categories", {}).get(category, {})


def _segment_config(segment: str, cfg: dict[str, Any]) -> dict[str, Any]:
    return cfg.get("consumer_segments", {}).get(segment, {})


def _city_config(city_id: str, cfg: dict[str, Any]) -> dict[str, Any]:
    return cfg.get("cities", {}).get(city_id, {})


def _softmax(beta: float, utilities: dict[int, float]) -> dict[int, float]:
    if not utilities:
        return {}
    ids = list(utilities.keys())
    max_u = max(utilities.values())
    exp_vals: dict[int, float] = {}
    total = 0.0
    for uid in ids:
        e = math.exp(beta * (utilities[uid] - max_u))
        exp_vals[uid] = e
        total += e
    return {uid: (exp_vals[uid] / total if total > 0 else 1.0 / len(ids)) for uid in ids}


def _compute_max_production(state: dict[str, Any], cfg: dict[str, Any]) -> int:
    base = V("base_capacity", cfg, 200)
    bonus = 0
    for f in state.get("factories", []):
        if isinstance(f, dict):
            bonus += f.get("capacity_bonus", 0)
        elif f == "line_a":
            bonus += 150
        elif f == "line_b":
            bonus += 80
    workers = V("worker_productivity", cfg, 20)
    sales_force = state.get("sales_force", 0)
    return int(base + bonus + sales_force * workers)


def _compute_unit_cost(
    category_cfg: dict[str, Any],
    actual_production: int,
    material_cost_multiplier: float = 1.0,
    discount_rate: float = 0.0,
) -> float:
    raw = category_cfg.get("base_material_cost", 0) * material_cost_multiplier * (1 - discount_rate)
    labor = category_cfg.get("base_labor_cost", 0)
    overhead = category_cfg.get("base_overhead", 0) / max(actual_production, 1)
    return raw + labor + overhead


def _compute_score(
    state: dict[str, Any],
    unit_price: float,
    avg_price: float,
    segment_cfg: dict[str, Any],
    city_effects: dict[str, float],
) -> float:
    tech = state.get("tech", 20)
    fit = state.get("fit", 20)
    show = state.get("show", 20)
    w_tech = segment_cfg.get("tech_weight", 0.3)
    w_fit = segment_cfg.get("fit_weight", 0.4)
    w_show = segment_cfg.get("show_weight", 0.3)
    price_ratio = unit_price / max(avg_price, 1)
    price_sensitivity = city_effects.get("price_sensitivity", 0.0) + 1.0
    return w_tech * tech + w_fit * fit + w_show * show - 10 * price_ratio / price_sensitivity


def settle_round(
    match_state: dict[str, Any],
    decisions: dict[str, Any],
    cfg: dict[str, Any],
) -> dict[str, Any]:
    """OPS 单轮结算。纯函数、幂等、不读写数据库。"""
    team_states = match_state.get("team_states", {})
    event_state = match_state.get("event_state", {})
    round_no = match_state.get("round_number", 1)

    city_ids = list(cfg.get("cities", {}).keys())
    active_events = event_state.get("active_events", {})
    material_cost_multiplier = active_events.get("material_cost_multiplier", 1.0)

    # 1. 产量与成本
    team_production: dict[int, int] = {}
    team_unit_cost: dict[int, float] = {}
    team_raw_spend: dict[int, float] = {}

    for tid, decision in decisions.items():
        state = team_states.get(tid, {})
        category = state.get("category", "home")
        cat_cfg = _category_config(category, cfg)
        max_prod = _compute_max_production(state, cfg)
        target_prod = int(decision.get("production_quantity", 0))
        actual_prod = max(0, min(target_prod, max_prod))
        discount_rate = state.get("discount_rate", 0.0)
        unit_cost = _compute_unit_cost(cat_cfg, actual_prod, material_cost_multiplier, discount_rate)
        raw_cost = cat_cfg.get("base_material_cost", 0) * material_cost_multiplier * (1 - discount_rate)

        team_production[tid] = actual_prod
        team_unit_cost[tid] = unit_cost
        team_raw_spend[tid] = actual_prod * raw_cost

    # 2. 平均价格
    prices = {tid: decisions[tid].get("unit_price", 0) for tid in decisions}
    avg_price = sum(prices.values()) / max(len(prices), 1)

    # 3. 市场份额与销量
    team_sales: dict[int, int] = {tid: 0 for tid in decisions}
    for city_id in city_ids:
        city_cfg = _city_config(city_id, cfg)
        city_teams = [
            tid for tid, d in decisions.items()
            if city_id in (d.get("target_cities") or [])
        ]
        if not city_teams:
            continue

        segment_id = city_cfg.get("dominant_segment", "pragmatic")
        segment_cfg = _segment_config(segment_id, cfg)

        utilities = {}
        for tid in city_teams:
            state = team_states[tid]
            decision = decisions[tid]
            score = _compute_score(state, decision.get("unit_price", 0), avg_price, segment_cfg, {})
            utilities[tid] = score

        shares = _softmax(V("beta", cfg, 2.0), utilities)
        market_size = city_cfg.get("market_size", 5000)

        for tid in city_teams:
            demand = int(shares.get(tid, 0) * market_size)
            prod = team_production.get(tid, 0)
            inv = team_states.get(tid, {}).get("inventory", 0)
            sales = min(demand, prod + inv)
            team_sales[tid] += sales

    # 4. 财务结算
    news = []
    results: list[dict[str, Any]] = []

    for tid, decision in decisions.items():
        state = copy.deepcopy(team_states.get(tid, {}))
        category = state.get("category", "home")
        cat_cfg = _category_config(category, cfg)

        actual_prod = team_production.get(tid, 0)
        unit_cost = team_unit_cost.get(tid, 0)
        unit_price = decision.get("unit_price", 0)
        sales = team_sales.get(tid, 0)
        raw_spend = team_raw_spend.get(tid, 0)

        revenue = sales * unit_price
        cogs = sales * unit_cost
        gross_profit = revenue - cogs

        marketing = max(0, float(decision.get("marketing_spend", 0) or 0))
        rnd = max(0, float(decision.get("rnd_spend", 0) or 0))
        sales_force = max(0, int(decision.get("sales_force", 0) or 0))
        wage = V("wage_per_head", cfg, 1500)
        fixed_overhead = cat_cfg.get("base_overhead", 3500)

        opening_fees = 0
        new_cities = []
        for city_id in (decision.get("target_cities") or []):
            entered = state.get("entered_cities", []) or []
            if city_id not in entered:
                city_cfg = _city_config(city_id, cfg)
                tier = city_cfg.get("tier", 2)
                fee_multi = {1: 2.0, 2: 1.5, 3: 1.0, 4: 0.6}.get(tier, 1.0)
                fee = city_cfg.get("opening_cost", 15000) * fee_multi
                if active_events.get("policy_subsidy_city") == city_id:
                    fee *= 0.5
                opening_fees += fee
                new_cities.append(city_id)

        operating_expenses = marketing + rnd + sales_force * wage + fixed_overhead + opening_fees

        prev_inventory = state.get("inventory", 0)
        ending_inventory = max(0, prev_inventory + actual_prod - sales)
        holding_cost = ending_inventory * V("holding_cost_per_unit", cfg, 2)

        operating_profit = gross_profit - operating_expenses - holding_cost
        net_profit = operating_profit

        cash = state.get("cash", 100000)
        cash = cash - raw_spend - opening_fees - marketing - rnd - sales_force * wage + revenue - cogs - holding_cost

        tech = state.get("tech", 20) + rnd * V("tech_conversion_rate", cfg, 0.001)
        show = state.get("show", 20) + marketing * V("show_conversion_rate", cfg, 0.0008)
        fit = state.get("fit", 20)

        inventory_value = ending_inventory * unit_cost
        net_assets = cash + inventory_value
        cumulative_profit = state.get("cumulative_profit", 0) + net_profit

        state["inventory"] = ending_inventory
        state["cash"] = round(cash, 2)
        state["tech"] = round(tech, 2)
        state["show"] = round(show, 2)
        state["fit"] = round(fit, 2)
        state["net_assets"] = round(net_assets, 2)
        state["cumulative_profit"] = round(cumulative_profit, 2)

        entered = set(state.get("entered_cities", []) or [])
        entered.update(new_cities)
        state["entered_cities"] = sorted(list(entered))

        results.append({
            "team_id": tid,
            "round_number": round_no,
            "production_planned": decision.get("production_quantity", 0),
            "production_actual": actual_prod,
            "unit_price": unit_price,
            "unit_cost": round(unit_cost, 2),
            "sales": sales,
            "revenue": round(revenue, 2),
            "cogs": round(cogs, 2),
            "gross_profit": round(gross_profit, 2),
            "marketing_spend": marketing,
            "rnd_spend": rnd,
            "sales_force": sales_force,
            "operating_expenses": round(operating_expenses, 2),
            "holding_cost": round(holding_cost, 2),
            "operating_profit": round(operating_profit, 2),
            "net_profit": round(net_profit, 2),
            "cash_after": round(cash, 2),
            "inventory_after": ending_inventory,
            "inventory_value": round(inventory_value, 2),
            "net_assets": round(net_assets, 2),
            "cumulative_profit": round(cumulative_profit, 2),
            "tech": round(tech, 2),
            "fit": round(fit, 2),
            "show": round(show, 2),
            "entered_cities": list(entered),
            "new_cities": new_cities,
            "opening_fees": round(opening_fees, 2),
        })

    event = _maybe_trigger_event(round_no, cfg)
    if event:
        news.append({
            "kind": event["id"],
            "headline": f"{event['name']}：{event['desc']}",
            "body": event.get("body", ""),
        })

    return {"results": results, "news": news, "event": event}


def _maybe_trigger_event(round_no: int, cfg: dict[str, Any]) -> dict[str, Any] | None:
    if round_no < 3:
        return None
    event_types = cfg.get("event_types", {})
    if not event_types:
        return None
    if random.random() < 0.5:
        return None
    candidates = [{"id": eid, **ev} for eid, ev in event_types.items()]
    return random.choice(candidates)


def build_financial_statements(result: dict[str, Any]) -> dict[str, Any]:
    sales_force = result["sales_force"]
    labor = sales_force * 1500
    marketing = result["marketing_spend"]
    rnd = result["rnd_spend"]
    opening = result["opening_fees"]
    overhead = result["operating_expenses"] - marketing - rnd - labor - opening

    income = {
        "revenue": result["revenue"],
        "cogs": result["cogs"],
        "gross_profit": result["gross_profit"],
        "marketing_expense": marketing,
        "rnd_expense": rnd,
        "labor_expense": labor,
        "overhead_expense": overhead,
        "opening_fees": opening,
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

    return {"income_statement": income, "balance_sheet": balance}
