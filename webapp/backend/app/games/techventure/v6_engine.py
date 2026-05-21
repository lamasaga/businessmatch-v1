"""TechVenture v6.0 结算引擎 — 从 v6Engine.ts 精确翻译。

与原 v6.0 核心公式文档 Step 0-9 严格对齐。
所有数值由 config.py 读取 YAML，本文件不含硬编码常量。
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Any

from app.games.techventure.config import (
    CITY_IDS, ROUTE_IDS, GROUP_IDS,
    V, get_cfg, clamp, round2, growth_rate, tech_i_eff,
    pathfinder_m_crowd, softmax,
)

# ── 数据结构 ────────────────────────────────────────────


@dataclass
class TeamSnapshot:
    id: int
    display_name: str
    product_name: str
    route: str
    opened_cities: list[str]
    tech: float
    fit_by_city: dict[str, float]
    show_by_city: dict[str, float]
    last_rank: int | None
    available_budget: float
    weighted_total_before: float
    attention_total_before: float


@dataclass
class RoundDecision:
    team_id: int
    route: str
    opened_cities: list[str]
    invest_tech: float
    invest_fit_by_city: dict[str, float]
    invest_show_by_city: dict[str, float]
    declaration: str


@dataclass
class SettlementContext:
    round_no: int
    event_id: str
    teams: list[TeamSnapshot]
    decisions: list[RoundDecision]
    total_teams: int


@dataclass
class CityDetail:
    city_id: str
    just_expanded: bool = False
    inv_fit: float = 0.0
    inv_show: float = 0.0
    fit_rank: int = 0
    show_rank: int = 0
    k_city: int = 0
    delta_fit: float = 0.0
    delta_show: float = 0.0
    fit_after: float = 2.0
    show_after: float = 2.0
    halo_factor: float = 1.0
    raw_share: float = 0.0
    raw_share_by_group: dict[str, float] = field(default_factory=dict)
    ceiling: float = 0.0
    slice_val: float = 0.0
    attention_raw: float = 0.0


def _empty_city_detail(city_id: str, a_init: float = 2.0) -> CityDetail:
    return CityDetail(
        city_id=city_id,
        fit_after=a_init,
        show_after=a_init,
        raw_share_by_group={g: 0.0 for g in GROUP_IDS},
    )


# ── 辅助 ────────────────────────────────────────────────


def _hash32s(s: str) -> int:
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def _say2(seed: str, a: str, b: str) -> str:
    return a if _hash32s(seed) % 2 == 0 else b


def _rank_desc(values: list[tuple[int, float]]) -> dict[int, int]:
    sorted_v = sorted(values, key=lambda x: -x[1])
    return {item[0]: rank + 1 for rank, item in enumerate(sorted_v)}


def _build_city_shift(event_id: str) -> dict[str, float]:
    if event_id == "pragmaticWave":
        return {"pragmatic": 0.10}
    if event_id == "geekWave":
        return {"geek": 0.15}
    if event_id == "trendyWave":
        return {"trendy": 0.10}
    return {}


def _apply_group_shift(base: dict[str, float], shift: dict[str, float]) -> dict[str, float]:
    mapped = {
        "geek": base.get("geek", 0),
        "pragmatic": base.get("pragmatic", 0),
        "trendy": base.get("trendy", 0),
    }
    add = 0.0
    for g in GROUP_IDS:
        d = shift.get(g, 0.0)
        add += d
        mapped[g] += d
    if add == 0:
        return mapped
    others = [g for g in GROUP_IDS if shift.get(g, 0.0) == 0]
    sum_others = sum(mapped[g] for g in others)
    if sum_others <= 0:
        return mapped
    for g in others:
        mapped[g] -= (mapped[g] / sum_others) * add
    return {g: clamp(mapped[g], 0.0, 1.0) for g in GROUP_IDS}


def _get_city_market_scale(city_id: str, event_id: str, cfg: dict) -> float:
    if event_id == "influencerBoom" and city_id == "合肥":
        return 1.10
    return cfg["cities"][city_id].get("scale", 1.0)


def _bounded_rank_in_city(rank_map: dict[int, int], team_id: int, k_city: int, show_b_max: float
                          ) -> tuple[int, float, float]:
    r = rank_map.get(team_id, k_city)
    b_fit = max(0.0, 1 - (r - 1) / max(1, k_city))
    b_show = max(0.0, show_b_max - show_b_max * ((r - 1) / max(1, k_city)))
    return r, b_fit, b_show


def _fit_threshold_bonus_sum(route: str, fit_by_city: dict[str, float],
                             opened_cities: list[str], cfg: dict) -> float:
    routes_cfg = cfg.get("routes", {})
    if route == "USER":
        t1 = routes_cfg.get("USER", {}).get("fit_t1", cfg.get("fit_t1", 5.0))
        t2 = routes_cfg.get("USER", {}).get("fit_t2", cfg.get("fit_t2", 7.5))
    else:
        t1 = cfg.get("fit_t1", 5.0)
        t2 = cfg.get("fit_t2", 7.5)
    bonus_t1 = cfg.get("fit_t1_bonus", 0.05)
    bonus_t2 = cfg.get("fit_t2_bonus", 0.08)
    a_init = cfg.get("defaults", {}).get("a_init", 2.0)
    total = 0.0
    for c in opened_cities:
        v = fit_by_city.get(c, a_init)
        if v >= t2:
            total += bonus_t2
        elif v >= t1:
            total += bonus_t1
    return total


def _detect_hits(declaration: str, cfg: dict) -> dict[str, list[str]]:
    text = (declaration or "").strip()
    keywords = cfg.get("declaration_keywords", {})
    out: dict[str, list[str]] = {"tech": [], "fit": [], "show": [], "vision": []}
    if not text:
        return out
    for cat in ("tech", "fit", "show", "vision"):
        for kw in keywords.get(cat, []):
            if kw in text:
                out[cat].append(kw)
    return out


def _compute_invest_shares(inv_tech: float, sum_fit: float, sum_show: float
                           ) -> dict[str, float]:
    total = inv_tech + sum_fit + sum_show
    if total <= 0:
        return {"tech": 0, "fit": 0, "show": 0, "total": 0}
    return {"tech": inv_tech / total, "fit": sum_fit / total,
            "show": sum_show / total, "total": total}


def _noise_sample(sigma: float) -> float:
    return (random.random() * 2 - 1) * sigma


def _crowd_level(n: int) -> dict[str, str]:
    if n <= 2:
        return {"level": "blue_ocean", "label": "蓝海"}
    if n <= 4:
        return {"level": "normal", "label": "正常"}
    if n <= 6:
        return {"level": "crowded", "label": "拥挤"}
    return {"level": "very_crowded", "label": "非常拥挤"}


def _event_r3_narrative(event_id: str, desc: str, round_no: int) -> str:
    seed = f"ev-{event_id}-r{round_no}"
    narratives = {
        "pragmaticWave": (
            "三城用户口味更偏实用，体验与落地能力正在升值。",
            "市场审美更稳健，会讲故事不如把产品做出手感与确定性。",
        ),
        "geekWave": (
            "极客与参数党抬头，技术底色的对撞比上一回合更直接。",
            "硬核叙事占据主动权，会亮指标、敢对打的队伍更有舞台。",
        ),
        "trendyWave": (
            "社媒与情绪传播更快，展示与声量比往常更容易出圈。",
            "潮向话题更密，会抓热点的品牌更容易被看见、被转述。",
        ),
        "investorBoom": (
            "资本端情绪转暖，后续到账的追加投资预期更厚。",
            "投资人更愿意给支票，为下一阶段留足弹药与底气。",
        ),
        "compliance": (
            "监管与合规模块被反复提及，对\u201c高曝光、弱产品\u201d的容忍在下降。",
            "营销尺度被放大检视，过火者更容易被拿来做镜鉴。",
        ),
        "influencerBoom": (
            "区域网红与潮流注意力升温，部分城市的水位在结构性重塑。",
            "流量与话题向热点城市与腰部达人倾斜，地理红利在切换。",
        ),
    }
    if event_id == "none":
        return desc
    pair = narratives.get(event_id)
    if pair:
        return _say2(seed, pair[0], pair[1])
    return _say2(seed, desc, "赛场出现新的外生扰动，各队需跟着节奏重排优先级。")


# ── 主入口 ──────────────────────────────────────────────


def settle_round(ctx: SettlementContext,
                 config_id: str = "techventure-v1") -> dict[str, Any]:
    """v6.0 结算主函数，返回 SettlementOutput dict。"""
    cfg = get_cfg(config_id)
    defaults = cfg.get("defaults", {})
    a_init = defaults.get("a_init", 2.0)
    a_hard = defaults.get("a_hard", 12.0)
    beta = defaults.get("beta", 0.5)
    sigma = defaults.get("sigma", 0.05)
    total_rounds = defaults.get("rounds", 4)

    round_weights_list = defaults.get("round_weights", [0.15, 0.20, 0.25, 0.40])
    round_weights = {i + 1: w for i, w in enumerate(round_weights_list)}

    routes_cfg = cfg.get("routes", {})
    cities_cfg = cfg.get("cities", {})
    consumer_weights = cfg.get("consumer_weights", {})
    route_crowd_utility = cfg.get("route_crowd_utility", {})
    ceiling_params = cfg.get("ceiling_city", {})
    bqi_rules = cfg.get("bqi_rules", {})
    momentum_cfg = cfg.get("momentum", {})
    hot_pulse_cfg = cfg.get("hot_pulse", {})
    follow_on_cfg = cfg.get("follow_on", {})
    fit_weights = cfg.get("fit_weights", {"investment": 0.5, "rank": 0.5})
    show_weights = cfg.get("show_weights", {"investment": 0.1, "rank": 0.9})
    show_b_max = cfg.get("show_b_max", 2.5)
    fit_growth_scale = cfg.get("fit_growth_scale", 2.0)
    show_halo_weight = cfg.get("show_halo_weight", 0.10)
    bqi_last_count = defaults.get("bqi_last_count", 4)

    round_no = ctx.round_no
    event_id = ctx.event_id
    teams = ctx.teams
    N = max(ctx.total_teams, len(teams))

    dec_map: dict[int, RoundDecision] = {d.team_id: d for d in ctx.decisions}

    # ── 路线计数 ──
    route_count: dict[str, int] = {r: 0 for r in ROUTE_IDS}
    for t in teams:
        d = dec_map.get(t.id)
        route = d.route if d else t.route
        route_count[route] = route_count.get(route, 0) + 1
    has_blue_ocean = any(n <= 2 for n in route_count.values())

    # ── 全场 Tech 投入排名（BQI） ──
    tech_invests = [(t.id, dec_map[t.id].invest_tech if t.id in dec_map else 0.0) for t in teams]
    tech_invest_rank = _rank_desc(tech_invests)

    # ── 全场 Fit 总投入排名 ──
    fit_invest_sum: dict[int, float] = {}
    for t in teams:
        d = dec_map.get(t.id)
        s = sum(d.invest_fit_by_city.get(c, 0.0) for c in CITY_IDS) if d else 0.0
        fit_invest_sum[t.id] = s
    fit_invest_rank = _rank_desc([(tid, v) for tid, v in fit_invest_sum.items()])

    # ── 同城投入排名 ──
    fit_rank_by_city: dict[str, dict[int, int]] = {}
    show_rank_by_city: dict[str, dict[int, int]] = {}
    fit_rank_k: dict[str, int] = {}
    show_rank_k: dict[str, int] = {}
    teams_by_city: dict[str, list[int]] = {}

    for c in CITY_IDS:
        arr_fit: list[tuple[int, float]] = []
        arr_show: list[tuple[int, float]] = []
        opened: list[int] = []
        for t in teams:
            d = dec_map.get(t.id)
            oc = d.opened_cities if d else t.opened_cities
            if c not in oc:
                continue
            opened.append(t.id)
            inv_f = max(0.0, d.invest_fit_by_city.get(c, 0.0)) if d else 0.0
            inv_s = max(0.0, d.invest_show_by_city.get(c, 0.0)) if d else 0.0
            if inv_f > 0:
                arr_fit.append((t.id, inv_f))
            if inv_s > 0:
                arr_show.append((t.id, inv_s))
        fit_rank_by_city[c] = _rank_desc(arr_fit)
        show_rank_by_city[c] = _rank_desc(arr_show)
        fit_rank_k[c] = len(arr_fit)
        show_rank_k[c] = len(arr_show)
        teams_by_city[c] = opened

    # ── Step 1-3：属性增长 ──
    @dataclass
    class _TeamWork:
        snap: TeamSnapshot
        dec: RoundDecision
        route: str
        tech_after: float = 0.0
        delta_tech: float = 0.0
        tech_i_eff_val: float = 0.0
        f_bonus: float = 1.0
        m_crowd: float = 1.0
        fit_after: dict[str, float] = field(default_factory=dict)
        show_after: dict[str, float] = field(default_factory=dict)
        delta_fit: dict[str, float] = field(default_factory=dict)
        delta_show: dict[str, float] = field(default_factory=dict)
        halo_factor: dict[str, float] = field(default_factory=dict)
        inv_fit: dict[str, float] = field(default_factory=dict)
        inv_show: dict[str, float] = field(default_factory=dict)
        fit_rank_in_city: dict[str, int] = field(default_factory=dict)
        show_rank_in_city: dict[str, int] = field(default_factory=dict)
        just_expanded: list[str] = field(default_factory=list)
        opened_cities: list[str] = field(default_factory=list)

    works: list[_TeamWork] = []

    for t in teams:
        d = dec_map.get(t.id)
        dec = d or RoundDecision(
            team_id=t.id, route=t.route, opened_cities=list(t.opened_cities),
            invest_tech=0, invest_fit_by_city={}, invest_show_by_city={}, declaration="",
        )
        route = dec.route
        opened = list(dec.opened_cities)

        # Step 3 — Tech 增长
        r_cfg = routes_cfg.get(route, {})
        r_tech = r_cfg.get("r_tech", 1.0)
        boost = r_cfg.get("tech_invest_boost", 1.0)
        i_tech_raw = max(0.0, dec.invest_tech)
        i_tech_boosted = i_tech_raw * boost
        i_tech_eff = tech_i_eff(i_tech_boosted)
        f_bonus = 1.0 + _fit_threshold_bonus_sum(route, t.fit_by_city, opened, cfg)
        m_crowd = pathfinder_m_crowd(route_count.get("PATHFINDER", 0), cfg) if route == "PATHFINDER" else 1.0
        g_tech = growth_rate(t.tech, cfg)
        delta_tech = g_tech * math.sqrt(i_tech_eff / 10) * r_tech * m_crowd * f_bonus
        tech_after = clamp(t.tech + delta_tech, 0, a_hard)

        show_max = max(a_init, *(t.show_by_city.get(c, a_init) for c in CITY_IDS))

        fit_after: dict[str, float] = {}
        show_after: dict[str, float] = {}
        delta_fit: dict[str, float] = {}
        delta_show: dict[str, float] = {}
        halo: dict[str, float] = {}
        inv_fit_w: dict[str, float] = {}
        inv_show_w: dict[str, float] = {}
        fit_rank_in: dict[str, int] = {}
        show_rank_in: dict[str, int] = {}

        for c in CITY_IDS:
            curr_fit = t.fit_by_city.get(c, a_init)
            curr_show = t.show_by_city.get(c, a_init)
            fit_after[c] = curr_fit
            show_after[c] = curr_show
            delta_fit[c] = 0.0
            delta_show[c] = 0.0
            halo[c] = 1.0
            inv_fit_w[c] = 0.0
            inv_show_w[c] = 0.0
            fit_rank_in[c] = 0
            show_rank_in[c] = 0

            if c not in opened:
                continue

            k_city_local = len(teams_by_city.get(c, []))
            inv_f = max(0.0, dec.invest_fit_by_city.get(c, 0.0))
            inv_s = max(0.0, dec.invest_show_by_city.get(c, 0.0))
            inv_fit_w[c] = inv_f
            inv_show_w[c] = inv_s

            k_fit_r = fit_rank_k.get(c, 0)
            k_show_r = show_rank_k.get(c, 0)
            f_rank = fit_rank_by_city[c].get(t.id, k_fit_r) if inv_f > 0 else 0
            s_rank = show_rank_by_city[c].get(t.id, k_show_r) if inv_s > 0 else 0
            fit_rank_in[c] = f_rank
            show_rank_in[c] = s_rank

            b_fit = max(0.0, 1 - (f_rank - 1) / max(1, k_fit_r)) if (inv_f > 0 and k_fit_r > 0) else 0.0
            b_show_val = max(0.0, show_b_max - show_b_max * ((s_rank - 1) / max(1, k_show_r))) if (inv_s > 0 and k_show_r > 0) else 0.0

            # Fit 增长
            g_fit = growth_rate(curr_fit, cfg)
            r_fit = r_cfg.get("r_fit", 1.0)
            city_cfg = cities_cfg.get(c, {})
            eta_fit = city_cfg.get("eta_fit", 1.0)
            d_fit = (g_fit
                     * (fit_weights["investment"] * math.sqrt(inv_f / 10)
                        + fit_weights["rank"] * b_fit)
                     * r_fit * m_crowd * eta_fit * fit_growth_scale)

            # Show 增长
            halo_delta = clamp((show_max - curr_show) / show_max, 0, 1) if show_max > 0 else 0
            halo_val = 1 + show_halo_weight * halo_delta
            halo[c] = halo_val
            g_show = growth_rate(curr_show, cfg)
            r_show = r_cfg.get("r_show", 1.0)
            eta_show = city_cfg.get("eta_show", 1.0)
            d_show = (g_show
                      * (show_weights["rank"] * b_show_val
                         + show_weights["investment"] * math.sqrt(inv_s / 5))
                      * halo_val * r_show * m_crowd * eta_show)

            delta_fit[c] = d_fit
            delta_show[c] = d_show
            fit_after[c] = clamp(curr_fit + d_fit, 0, a_hard)
            show_after[c] = clamp(curr_show + d_show, 0, a_hard)

        just_expanded = [c for c in opened if c not in t.opened_cities]

        works.append(_TeamWork(
            snap=t, dec=dec, route=route,
            tech_after=tech_after, delta_tech=delta_tech,
            tech_i_eff_val=i_tech_eff, f_bonus=f_bonus, m_crowd=m_crowd,
            fit_after=fit_after, show_after=show_after,
            delta_fit=delta_fit, delta_show=delta_show,
            halo_factor=halo, inv_fit=inv_fit_w, inv_show=inv_show_w,
            fit_rank_in_city=fit_rank_in, show_rank_in_city=show_rank_in,
            just_expanded=just_expanded, opened_cities=opened,
        ))

    # ── Step 4-6：城市份额、Ceiling、attention_raw ──
    city_pies: list[dict] = []
    raw_attention_by_team: dict[int, float] = {w.snap.id: 0.0 for w in works}
    cities_detail_by_team: dict[int, dict[str, CityDetail]] = {
        w.snap.id: {c: _empty_city_detail(c, a_init) for c in CITY_IDS} for w in works
    }
    work_by_id: dict[int, _TeamWork] = {w.snap.id: w for w in works}

    for c in CITY_IDS:
        opened_ids = teams_by_city.get(c, [])
        city_cfg = cities_cfg.get(c, {})
        mkt_scale = _get_city_market_scale(c, event_id, cfg)

        if not opened_ids:
            city_pies.append({
                "city_id": c, "ceiling": 0, "market_scale": mkt_scale,
                "k_city": 0, "slices": [], "unmet_percent": 1,
            })
            continue

        k_city = len(opened_ids)
        consumers_base = city_cfg.get("consumers", {})
        group_shares = _apply_group_shift(consumers_base, _build_city_shift(event_id))

        raw_share_by_team: dict[int, float] = {tid: 0.0 for tid in opened_ids}
        raw_share_by_group: dict[int, dict[str, float]] = {
            tid: {g: 0.0 for g in GROUP_IDS} for tid in opened_ids
        }

        for group in GROUP_IDS:
            cw = consumer_weights.get(group, {"tech": 0.33, "fit": 0.33, "show": 0.33})
            utilities: dict[str, float] = {}
            for tid in opened_ids:
                w = work_by_id[tid]
                tau_tech = city_cfg.get("tau_tech", 1.0)
                tech_adj = w.tech_after * tau_tech
                base_u = cw["tech"] * tech_adj + cw["fit"] * w.fit_after[c] + cw["show"] * w.show_after[c]
                rcu = route_crowd_utility.get(w.route, {}).get(group, 0.15)
                crowd_tax = max(0.0, 1 - rcu * ((route_count.get(w.route, 1) - 1) / max(1, N - 1)))
                utilities[str(tid)] = base_u * crowd_tax
            s = softmax(beta, utilities)
            for tid in opened_ids:
                val = s.get(str(tid), 0)
                raw_share_by_group[tid][group] = val
                raw_share_by_team[tid] += group_shares.get(group, 0) * val

        # Ceiling
        avg_q = sum(
            (work_by_id[tid].tech_after + work_by_id[tid].fit_after[c] + work_by_id[tid].show_after[c]) / 3
            for tid in opened_ids
        ) / k_city
        sum_show_inv = sum(work_by_id[tid].inv_show.get(c, 0) for tid in opened_ids)
        P = ceiling_params
        base = P.get("base_const", 0.1) + P.get("q_coeff", 0.1) * avg_q
        maturity = P.get("maturity_min", 0.7) + P.get("maturity_range", 0.3) * ((k_city - 1) / max(1, N - 1))
        crowd_lift = P.get("crowd_lift", 0.1) * ((k_city - 1) / max(1, N - 1))
        show_lift = P.get("show_lift", 0.18) * (1 - math.exp(-sum_show_inv / P.get("show_lift_ref", 30)))
        ceiling = min(P.get("cap", 0.95), base * maturity + crowd_lift + show_lift)

        slices: list[dict] = []
        for tid in opened_ids:
            w = work_by_id[tid]
            raw = raw_share_by_team[tid]
            slice_val = raw * ceiling
            attention_raw = slice_val * 100 * mkt_scale
            raw_attention_by_team[tid] += attention_raw

            detail = CityDetail(
                city_id=c, just_expanded=c in w.just_expanded,
                inv_fit=w.inv_fit.get(c, 0), inv_show=w.inv_show.get(c, 0),
                fit_rank=w.fit_rank_in_city.get(c, 0), show_rank=w.show_rank_in_city.get(c, 0),
                k_city=k_city, delta_fit=w.delta_fit.get(c, 0), delta_show=w.delta_show.get(c, 0),
                fit_after=w.fit_after[c], show_after=w.show_after[c],
                halo_factor=w.halo_factor.get(c, 1),
                raw_share=raw, raw_share_by_group=raw_share_by_group[tid],
                ceiling=ceiling, slice_val=slice_val, attention_raw=attention_raw,
            )
            cities_detail_by_team[tid][c] = detail
            slices.append({
                "team_id": tid, "display_name": w.snap.display_name,
                "product_name": w.snap.product_name,
                "value": slice_val, "percent": slice_val,
            })

        city_pies.append({
            "city_id": c, "ceiling": ceiling, "market_scale": mkt_scale,
            "k_city": k_city, "slices": slices, "unmet_percent": 1 - ceiling,
        })

    # ── Step 7：momentum、hotpulse、totalRaw ──
    momentum_base = {1: momentum_cfg.get("r1", 0.6),
                     2: momentum_cfg.get("r2", 0.3),
                     3: momentum_cfg.get("r3", 0.1)}
    total_raw_by_team: dict[int, float] = {}
    momentum_by_team: dict[int, float] = {}
    hotpulse_by_team: dict[int, float] = {}
    hotpulse_label_by_team: dict[int, str | None] = {}
    hp_tiers = hot_pulse_cfg.get("tiers", [])
    hp_routes = set(hot_pulse_cfg.get("eligible_routes", ["BRAND"]))

    for w in works:
        sum_show_delta = sum(w.delta_show.get(c, 0) for c in CITY_IDS)
        hotpulse = 0.0
        hotpulse_label: str | None = None
        if round_no >= 1 and w.route in hp_routes:
            for tier in hp_tiers:
                if sum_show_delta >= tier["threshold"]:
                    hotpulse = tier["bonus"]
                    hotpulse_label = tier["label"]

        mom = 0.0 if round_no == 1 else (
            momentum_cfg.get("decay", 0.4) * momentum_base.get(w.snap.last_rank or 99, 0)
        )
        momentum_by_team[w.snap.id] = mom
        hotpulse_by_team[w.snap.id] = hotpulse
        hotpulse_label_by_team[w.snap.id] = hotpulse_label
        total_raw_by_team[w.snap.id] = raw_attention_by_team[w.snap.id] + mom + hotpulse

    # ── Step 8：BQI + noise → EffAttention ──
    tech_rank_map = _rank_desc([(w.snap.id, w.tech_after) for w in works])
    fit_sum_by_team: dict[int, float] = {}
    show_sum_by_team: dict[int, float] = {}
    for w in works:
        fit_sum_by_team[w.snap.id] = sum(w.fit_after.get(c, a_init) for c in CITY_IDS)
        show_sum_by_team[w.snap.id] = sum(w.show_after.get(c, a_init) for c in CITY_IDS)

    BL = bqi_last_count
    tail_tech_ids = set(
        w.snap.id for w in sorted(works, key=lambda x: x.tech_after)[:min(BL, len(works))]
    )
    tail_fit_invest_ids = set(
        tid for tid, _ in sorted(fit_invest_sum.items(), key=lambda x: x[1])[:min(BL, len(works))]
    )

    top_cut = max(1, math.ceil(len(works) / 3))
    top_tech = set(w.snap.id for w in sorted(works, key=lambda x: -x.tech_after)[:top_cut])
    top_fit = set(
        tid for tid, _ in sorted(fit_sum_by_team.items(), key=lambda x: -x[1])[:top_cut]
    )
    top_show = set(
        tid for tid, _ in sorted(show_sum_by_team.items(), key=lambda x: -x[1])[:top_cut]
    )

    news: list[dict] = []

    def push_news(**item: Any) -> None:
        item.setdefault("id", f"r{item.get('round_no', round_no)}-{item.get('kind', '')}-{len(news)}")
        item.setdefault("team_ids", [])
        news.append(item)

    results: list[dict] = []

    for w in works:
        bqi_contribs: list[dict] = []
        tid = w.snap.id

        # R1: Tech 末位
        if tid in tail_tech_ids:
            bqi_contribs.append({
                "rule": "techLastThird",
                "delta": bqi_rules.get("tech_last_third", -0.1),
                "note": "技术力排名处于全场最末 4 位，市场怀疑你们的技术成熟度。",
            })

        # R2: Fit 投入末位
        if tid in tail_fit_invest_ids:
            bqi_contribs.append({
                "rule": "fitLastThird",
                "delta": bqi_rules.get("fit_last_third", -0.1),
                "note": "全场用户调研投入处于最末 4 位，用户觉得你们没听懂他们要什么。",
            })

        # R3: 营销过度
        city_show_sorted = sorted(CITY_IDS, key=lambda c: -w.show_after.get(c, a_init))
        max_city = city_show_sorted[0]
        max_city_show = w.show_after.get(max_city, a_init)
        other_max = max(
            (ow.show_after.get(max_city, a_init) for ow in works if ow.snap.id != tid),
            default=0,
        )
        is_marketing_over = max_city_show >= other_max - 0.5 and max_city_show > w.tech_after + 2
        if is_marketing_over:
            is_compliance = event_id == "compliance"
            delta = bqi_rules.get("marketing_over", -0.15) * (1.5 if is_compliance else 1)
            bqi_contribs.append({
                "rule": "marketingOver", "delta": delta,
                "note": f"{max_city}市一枝独秀刷屏（Show {round2(max_city_show)}），且远超自家技术盘（Tech {round2(w.tech_after)}）。"
                        + ("政策合规监管加倍处罚。" if is_compliance else ""),
            })
            push_news(
                round_no=round_no, kind="marketing_over",
                headline=f"【{w.snap.display_name}】{max_city}市投放过火 遭监管点名",
                body=_say2(
                    f"mo-{tid}-{round_no}",
                    f"《{w.snap.product_name}》在{max_city}{'合规模块里质疑被同步放大' if is_compliance else '展示端很抢眼，与研发底色拉出距离'}。",
                    f"《{w.snap.product_name}》在{max_city}{'市场曝光过量，与产品内功不够匹配' if is_compliance else '形成高曝光低后坐力的观感'}。",
                ),
                team_ids=[tid],
            )

        # R4: 实力派
        if tid in top_tech and tid in top_fit and tid in top_show:
            bqi_contribs.append({
                "rule": "allRound",
                "delta": bqi_rules.get("all_round", 0.12),
                "note": "三项指标均进入前 1/3，稳扎稳打的口碑正在形成。",
            })
            push_news(
                round_no=round_no, kind="all_round",
                headline=f"【{w.snap.display_name}】三项全能 实力派口碑持续扩散",
                body=_say2(
                    f"ar-{tid}-{round_no}",
                    f"三指标同时站在上游区，《{w.snap.product_name}》更像能打的全垒手型项目。",
                    f"《{w.snap.product_name}》在技术、匹配与声量上更均衡。",
                ),
                team_ids=[tid],
            )

        # R5: 宣言
        inv_tech_spent = w.dec.invest_tech
        inv_fit_spent = sum(w.dec.invest_fit_by_city.get(c, 0) for c in CITY_IDS)
        inv_show_spent = sum(w.dec.invest_show_by_city.get(c, 0) for c in CITY_IDS)
        shares = _compute_invest_shares(inv_tech_spent, inv_fit_spent, inv_show_spent)
        hits = _detect_hits(w.dec.declaration, cfg)
        min_inv = cfg.get("declaration_min_investment", {"tech": 0.30, "fit": 0.25, "show": 0.20})
        met_directions: list[str] = []
        if hits["tech"] and shares["tech"] >= min_inv.get("tech", 0.3):
            met_directions.append("tech")
        if hits["fit"] and shares["fit"] >= min_inv.get("fit", 0.25):
            met_directions.append("fit")
        if hits["show"] and shares["show"] >= min_inv.get("show", 0.2):
            met_directions.append("show")

        decl_reward = 0.0
        if len(met_directions) >= 3:
            decl_reward += bqi_rules.get("declaration_direction_triple", 0.09)
        elif len(met_directions) == 2:
            decl_reward += bqi_rules.get("declaration_direction_double", 0.06)
        elif len(met_directions) == 1:
            decl_reward += bqi_rules.get("declaration_direction_base", 0.04)
        if hits["vision"]:
            decl_reward += bqi_rules.get("declaration_vision_bonus", 0.03)
        cap = bqi_rules.get("declaration_reward_cap", 0.10)
        if decl_reward > cap:
            decl_reward = cap
        if decl_reward > 0:
            bqi_contribs.append({
                "rule": "declarationReward", "delta": decl_reward,
                "note": f"宣言说到做到：命中方向 {' / '.join(d.upper() for d in met_directions) or '无'}"
                        + ("；带有愿景口吻" if hits["vision"] else "") + "。",
            })
            push_news(
                round_no=round_no, kind="declaration_win",
                headline=f"【{w.snap.display_name}】宣言走心 市场留下印象",
                body=_say2(
                    f"dw-{tid}-{round_no}",
                    f"《{w.snap.product_name}》把宣言里押注的方向，落实到了本回合资金盘的分配中。",
                    f"《{w.snap.product_name}》对外讲的故事与钱流去向更一致。",
                ),
                team_ids=[tid],
            )

        # R6: 偏差
        th = cfg.get("declaration_deviation_threshold_pp", 0.25)
        deviation_hits: list[str] = []
        if hits["tech"] and shares["tech"] < min_inv.get("tech", 0.3) - th:
            deviation_hits.append("tech")
        if hits["fit"] and shares["fit"] < min_inv.get("fit", 0.25) - th:
            deviation_hits.append("fit")
        if hits["show"] and shares["show"] < min_inv.get("show", 0.2) - th:
            deviation_hits.append("show")
        if deviation_hits:
            bqi_contribs.append({
                "rule": "declarationDeviationMinor",
                "delta": bqi_rules.get("declaration_deviation_minor", -0.03),
                "note": f"口号喊得响，钱却没投在刀口上（{' / '.join(deviation_hits)}）。",
            })
            push_news(
                round_no=round_no, kind="declaration_miss",
                headline=f"【{w.snap.display_name}】宣言与投入出现落差",
                body=_say2(
                    f"dm-{tid}-{round_no}",
                    f"《{w.snap.product_name}》在口号中强调 {' / '.join(deviation_hits)} 等方向，但资源倾斜仍显不足。",
                    f"《{w.snap.product_name}》的对外重点与实际投入结构略不对齐。",
                ),
                team_ids=[tid],
            )

        bqi_raw = 1.0 + sum(x["delta"] for x in bqi_contribs)
        bqi = clamp(bqi_raw, bqi_rules.get("floor", 0.6), bqi_rules.get("ceil", 1.2))
        clipped = abs(bqi - bqi_raw) > 1e-6

        noise = _noise_sample(sigma)
        eff = total_raw_by_team[tid] * bqi * (1 + noise)

        hotpulse = hotpulse_by_team[tid]
        if hotpulse > 0:
            push_news(
                round_no=round_no, kind="hot_pulse",
                headline=f"【{w.snap.display_name}】{hotpulse_label_by_team[tid]}",
                body=_say2(
                    f"hp-{tid}-{round_no}",
                    f"《{w.snap.product_name}》展示面热度抬升明显，话题发酵带来一段额外的公众注意力。",
                    f"《{w.snap.product_name}》在公众侧完成一次有效出圈。",
                ),
                team_ids=[tid],
            )

        total_spent = inv_tech_spent + inv_fit_spent + inv_show_spent
        sum_show_delta = sum(w.delta_show.get(c, 0) for c in CITY_IDS)

        cities_dict = {}
        for c in CITY_IDS:
            cd = cities_detail_by_team[tid][c]
            cities_dict[c] = {
                "city_id": cd.city_id, "just_expanded": cd.just_expanded,
                "inv_fit": cd.inv_fit, "inv_show": cd.inv_show,
                "fit_rank": cd.fit_rank, "show_rank": cd.show_rank,
                "k_city": cd.k_city, "delta_fit": cd.delta_fit, "delta_show": cd.delta_show,
                "fit_after": cd.fit_after, "show_after": cd.show_after,
                "halo_factor": cd.halo_factor, "raw_share": cd.raw_share,
                "raw_share_by_group": cd.raw_share_by_group,
                "ceiling": cd.ceiling, "slice": cd.slice_val, "attention_raw": cd.attention_raw,
            }

        results.append({
            "team_id": tid,
            "display_name": w.snap.display_name,
            "product_name": w.snap.product_name,
            "route": w.route,
            "tech": w.tech_after,
            "delta_tech": w.delta_tech,
            "tech_i_eff": w.tech_i_eff_val,
            "tech_invest_raw": inv_tech_spent,
            "f_bonus": w.f_bonus,
            "m_crowd": w.m_crowd,
            "cities": cities_dict,
            "sum_show_delta": sum_show_delta,
            "raw_attention": raw_attention_by_team[tid],
            "momentum": momentum_by_team[tid],
            "hotpulse": hotpulse,
            "hotpulse_label": hotpulse_label_by_team[tid],
            "total_raw": total_raw_by_team[tid],
            "bqi": bqi,
            "bqi_clipped": clipped,
            "bqi_contribs": bqi_contribs,
            "noise": noise,
            "eff_attention": eff,
            "rank": 0,
            "weighted_round_score": 0.0,
            "weighted_total": w.snap.weighted_total_before,
            "attention_total": w.snap.attention_total_before,
            "declaration_hits": hits,
            "invest_shares": {"tech": shares["tech"], "fit": shares["fit"], "show": shares["show"]},
            "follow_on_next_round": 0.0,
            "spent": {
                "tech": inv_tech_spent, "fit": inv_fit_spent, "show": inv_show_spent,
                "switch_cost": 0, "expand_cost": 0, "total": total_spent, "reserved": 0,
            },
            "route_crowd": {**_crowd_level(route_count.get(w.route, 0)),
                            "has_blue_ocean_somewhere": has_blue_ocean},
        })

    # ── Step 9：排名、加权累计、follow_on ──
    results.sort(key=lambda r: -r["eff_attention"])
    weight = round_weights.get(round_no, 0.25)
    for i, r in enumerate(results):
        r["rank"] = i + 1
        r["weighted_round_score"] = r["eff_attention"] * weight
        r["weighted_total"] = round2(r["weighted_total"] + r["weighted_round_score"])
        r["attention_total"] = round2(r["attention_total"] + r["eff_attention"])
        if round_no < total_rounds:
            base = max(0, follow_on_cfg.get("max_base", 15) - r["rank"])
            r["follow_on_next_round"] = max(follow_on_cfg.get("floor", 3), base)
        else:
            r["follow_on_next_round"] = 0

    # ── 附加新闻 ──
    event_types = cfg.get("event_types", [])
    event_meta = next((e for e in event_types if e.get("id") == event_id), None)
    if event_id != "none" and event_meta:
        push_news(
            round_no=round_no, kind="event_r3",
            headline=f"R{round_no} 突发事件 · {event_meta.get('label', event_id)}",
            body=_event_r3_narrative(event_id, event_meta.get("desc", ""), round_no),
            team_ids=[],
        )

    pf_count = route_count.get("PATHFINDER", 0)
    if pf_count == 1:
        only = next((w for w in works if w.route == "PATHFINDER"), None)
        if only:
            push_news(
                round_no=round_no, kind="pathfinder_boom",
                headline=f"【{only.snap.display_name}】破局独行 独占红利 +28.5%",
                body=_say2(
                    f"pfb-{only.snap.id}-{round_no}",
                    "全场仅此一队押注破局奇兵，本回合在差异化上吃到更清亮的加成。",
                    f"在更拥挤的常规路径之外，《{only.snap.product_name}》的打法显得更稀缺。",
                ),
                team_ids=[only.snap.id],
            )
    elif pf_count >= 3:
        pfs = [w for w in works if w.route == "PATHFINDER"]
        push_news(
            round_no=round_no, kind="pathfinder_crowd",
            headline=f"{pf_count} 队扎堆破局 红利消散",
            body=_say2(
                f"pfc-{pf_count}-r{round_no}",
                "多支队伍同时挤上同一条破局线，独占有色眼镜红利被迅速冲散。",
                "当大家都往同一头押注，边际收益更像大锅饭，路越走越挤。",
            ),
            team_ids=[w.snap.id for w in pfs],
        )

    for w in works:
        if w.just_expanded:
            push_news(
                round_no=round_no, kind="city_debut",
                headline=f"【{w.snap.display_name}】开辟新战场",
                body=_say2(
                    f"cd-{w.snap.id}-{round_no}-{''.join(w.just_expanded)}",
                    f"《{w.snap.product_name}》在 {'、'.join(w.just_expanded)} 挂出新灯牌。",
                    f"新市场开张，《{w.snap.product_name}》把存在感铺到更多城市。",
                ),
                team_ids=[w.snap.id],
            )
        if w.snap.route != w.route:
            r_label = routes_cfg.get(w.route, {}).get("label", w.route)
            r_brief = routes_cfg.get(w.route, {}).get("brief", "")
            push_news(
                round_no=round_no, kind="route_switch",
                headline=f"【{w.snap.display_name}】战略调转 转向 {r_label}",
                body=_say2(
                    f"rs-{w.snap.id}-{round_no}",
                    f"《{w.snap.product_name}》本回合将主航道收束到 {r_label}，为下一阶段重定调。",
                    f"《{w.snap.product_name}》在打法上更强调 {r_label}：{r_brief}",
                ),
                team_ids=[w.snap.id],
            )

    if results:
        champ = results[0]
        push_news(
            round_no=round_no, kind="rank_top",
            headline=f"R{round_no} 冠军 · 【{champ['display_name']}】拿下全场最高市场声量",
            body=_say2(
                f"rt-{champ['team_id']}-{round_no}",
                f"《{champ['product_name']}》以本轮最强综合表现站上榜首。",
                f"《{champ['product_name']}》在有效市场声量上拔得头筹。",
            ),
            team_ids=[champ["team_id"]],
        )

    for pie in city_pies:
        if pie["ceiling"] >= 0.75 and pie["slices"]:
            top_s = max(pie["slices"], key=lambda x: x["value"])
            push_news(
                round_no=round_no, kind="ceiling_boost",
                headline=f"{pie['city_id']}市可触达声量上限冲至 {int(pie['ceiling'] * 100)}%",
                body=_say2(
                    f"cb-{pie['city_id']}-{round_no}",
                    f"{pie['city_id']}市多队同场竞逐，把可承载的舆论注意力也一并托高。",
                    f"{pie['city_id']}市投放更密集，本城能吃下的蛋糕盘面与上限同步抬升。",
                ),
                team_ids=[top_s["team_id"]] if top_s.get("team_id") else [],
            )

    return {
        "round_no": round_no,
        "event_id": event_id,
        "event_label": event_meta["label"] if event_meta else "无事件",
        "results": results,
        "city_pies": city_pies,
        "news": news,
    }
