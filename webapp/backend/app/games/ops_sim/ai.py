"""OPS AI 对手 — 零 Token 纯规则"""

from __future__ import annotations

import random
from typing import Any

from app.games.ops_sim.config import V, get_cfg
from app.games.ops_sim.enums import OpsCategory, OpsSegment


def generate_ai_decision(
    team_state: dict[str, Any],
    cfg: dict[str, Any] | None = None,
    round_number: int = 1,
) -> dict[str, Any]:
    """根据策略类型生成 AI 决策。"""
    if cfg is None:
        cfg = get_cfg()

    strategy = team_state.get("ai_strategy", "balanced")
    cash = team_state.get("cash", 100000)
    category = team_state.get("category", "home")
    cat_cfg = cfg.get("product_categories", {}).get(category, {})
    base_price = cat_cfg.get("base_price", 100)
    cities_cfg = cfg.get("cities", {})

    rng = random.Random(team_state.get("team_id", 0) + round_number * 1000)

    # 已开拓城市
    entered = team_state.get("entered_cities", []) or []

    # 目标城市：已开拓 + 可能新增 0~1 个
    target_cities = list(entered)
    if rng.random() < 0.4 and len(target_cities) < 3:
        candidates = [c for c in cities_cfg if c not in target_cities]
        if candidates:
            target_cities.append(rng.choice(candidates))

    # 按策略生成预算比例
    if strategy == "aggressive":
        production_pct = 0.35
        marketing_pct = 0.30
        rnd_pct = 0.20
        price_mult = 0.90
    elif strategy == "conservative":
        production_pct = 0.25
        marketing_pct = 0.15
        rnd_pct = 0.30
        price_mult = 1.10
    else:  # balanced
        production_pct = 0.30
        marketing_pct = 0.25
        rnd_pct = 0.20
        price_mult = 1.00

    # 原材料成本
    material_cost = cat_cfg.get("base_material_cost", 50)
    # 生产量
    max_by_cash = int((cash * production_pct) / max(material_cost, 1))
    production = max_by_cash

    # 定价
    unit_price = round(base_price * price_mult)

    # 营销和研发
    remaining = cash - production * material_cost
    if target_cities and target_cities != entered:
        # 预留开城费
        new_city = [c for c in target_cities if c not in entered][0]
        city_cfg = cities_cfg.get(new_city, {})
        opening = city_cfg.get("opening_cost", 15000) * {1: 2.0, 2: 1.5, 3: 1.0}.get(city_cfg.get("tier", 2), 1.0)
        remaining -= opening

    marketing = max(0, remaining * marketing_pct)
    rnd = max(0, remaining * rnd_pct)

    # 销售人员
    sales_force = rng.randint(1, 5)

    return {
        "production_quantity": production,
        "unit_price": unit_price,
        "marketing_spend": round(marketing, 2),
        "rnd_spend": round(rnd, 2),
        "sales_force": sales_force,
        "target_cities": target_cities,
    }


def generate_ai_bid(
    team_state: dict[str, Any],
    item: dict[str, Any],
    current_price: float,
    cfg: dict[str, Any] | None = None,
) -> float | None:
    """AI 决定是否出价及出价金额。返回 None 表示不出价。"""
    if cfg is None:
        cfg = get_cfg()

    strategy = team_state.get("ai_strategy", "balanced")
    cash = team_state.get("cash", 0)
    base_price = item.get("base_price", 0)

    rng = random.Random(team_state.get("team_id", 0) + hash(item.get("item_key", "")))

    # 估值倍数
    if strategy == "aggressive":
        max_mult = 1.10
    elif strategy == "conservative":
        max_mult = 0.60
    else:
        max_mult = 0.80

    valuation = base_price * max_mult * (0.9 + rng.random() * 0.2)

    if current_price >= valuation:
        return None
    if current_price >= cash * 0.6:
        return None

    # 加价
    increment = max(base_price * 0.05, 500)
    bid = max(current_price + increment, base_price)
    bid = min(bid, valuation, cash * 0.5)

    if bid <= current_price:
        return None
    return round(bid, 2)


def generate_ai_positioning(
    team_id: int,
    team_name: str,
    metadata: dict[str, Any] | None = None,
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """为 AI 队伍生成产品定位（品类 + 客群 + 名称）。"""
    if cfg is None:
        cfg = get_cfg()
    rng = random.Random(team_id)
    categories = list(OpsCategory)
    segments = list(OpsSegment)
    meta = metadata or {}
    return {
        "product_name": meta.get("product_name") or f"{team_name}旗舰款",
        "category": rng.choice(categories),
        "target_segment": rng.choice(segments),
    }
