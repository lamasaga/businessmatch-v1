"""TechVenture AI 队伍决策生成（纯规则，无 LLM）。"""

from __future__ import annotations

import random
from typing import Any

from app.games.techventure.config import CITY_IDS, ROUTE_IDS, get_cfg
from app.games.techventure.models import TvTeamState
from app.games.techventure.enums import StrategyRoute


def generate_ai_decision(state: TvTeamState,
                         round_no: int,
                         config_id: str = "techventure-v1") -> dict[str, Any]:
    """为一支 AI 队伍生成决策 dict（字段与 SubmitDecisionRequest 对齐）。"""
    cfg = get_cfg(config_id)
    defaults = cfg.get("defaults", {})
    route_switch_cost = defaults.get("route_switch_cost", 5)
    city_expand_cost = defaults.get("city_expand_cost", 10)

    budget = state.budget
    current_route = state.route.value if isinstance(state.route, StrategyRoute) else state.route
    opened = list(state.opened_cities or [CITY_IDS[0]])

    # 偶尔切换路线
    route = current_route
    if round_no >= 2 and random.random() < 0.15:
        route = random.choice(ROUTE_IDS)
    switch_cost = route_switch_cost if route != current_route else 0
    budget -= switch_cost

    # 偶尔扩城
    new_cities: list[str] = []
    if round_no >= 2 and len(opened) < len(CITY_IDS) and random.random() < 0.4:
        candidates = [c for c in CITY_IDS if c not in opened]
        if candidates and budget >= city_expand_cost + 10:
            pick = random.choice(candidates)
            new_cities.append(pick)
            budget -= city_expand_cost
    final_opened = opened + new_cities

    if budget <= 0:
        return {
            "route": route,
            "opened_cities": final_opened,
            "invest_tech": 0,
            "invest_fit_by_city": {},
            "invest_show_by_city": {},
            "declaration": _random_declaration(),
        }

    # 分配投入：Tech 30-50%，剩余平分到 Fit / Show 各城
    tech_pct = random.uniform(0.25, 0.50)
    invest_tech = round(budget * tech_pct, 1)
    remaining = budget - invest_tech

    fit_total_pct = random.uniform(0.3, 0.6)
    fit_total = round(remaining * fit_total_pct, 1)
    show_total = round(remaining - fit_total, 1)

    n_cities = len(final_opened)
    invest_fit: dict[str, float] = {}
    invest_show: dict[str, float] = {}
    for i, c in enumerate(final_opened):
        invest_fit[c] = round(fit_total / n_cities, 1) if n_cities else 0
        invest_show[c] = round(show_total / n_cities, 1) if n_cities else 0

    return {
        "route": route,
        "opened_cities": final_opened,
        "invest_tech": invest_tech,
        "invest_fit_by_city": invest_fit,
        "invest_show_by_city": invest_show,
        "declaration": _random_declaration(),
    }


_DECLARATIONS = [
    "我们将以技术创新驱动产品突破，关注用户需求与体验。",
    "聚焦研发核心能力，为用户带来实用且智能的解决方案。",
    "品牌传播与用户深耕并重，打造有温度的科技产品。",
    "用技术赋能创业梦想，以创新精神探索未来的可能。",
    "坚持以用户为中心的设计理念，让产品成为生活的一部分。",
    "我们追求品牌故事与技术实力的统一，赢得市场信任。",
]


def _random_declaration() -> str:
    return random.choice(_DECLARATIONS)
