"""TechVenture settle — 从 DB 模型构造引擎输入，执行结算，写回结果。"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.domains.arena.models.match import ArenaMatch
from app.domains.arena.models.team import ArenaTeam
from app.games.techventure.models import (
    TvTeamState, TvRound, TvSubmission, TvSnapshot, TvNews,
)
from app.games.techventure.enums import TvRoundStatus, StrategyRoute
from app.games.techventure.config import CITY_IDS, get_cfg
from app.games.techventure.v6_engine import (
    TeamSnapshot, RoundDecision, SettlementContext, settle_round,
)


def _build_snapshot(state: TvTeamState, team: ArenaTeam) -> TeamSnapshot:
    a_init = 2.0
    return TeamSnapshot(
        id=team.id,
        display_name=team.team_name,
        product_name=(team.metadata_ or {}).get("product_name", team.team_name),
        route=state.route.value if isinstance(state.route, StrategyRoute) else state.route,
        opened_cities=list(state.opened_cities or []),
        tech=state.tech,
        fit_by_city={c: (state.fit_by_city or {}).get(c, a_init) for c in CITY_IDS},
        show_by_city={c: (state.show_by_city or {}).get(c, a_init) for c in CITY_IDS},
        last_rank=state.last_rank,
        available_budget=state.budget,
        weighted_total_before=state.weighted_total,
        attention_total_before=state.attention_total,
    )


def _build_decision(sub: TvSubmission) -> RoundDecision:
    return RoundDecision(
        team_id=sub.team_id,
        route=sub.route.value if isinstance(sub.route, StrategyRoute) else sub.route,
        opened_cities=list(sub.opened_cities or []),
        invest_tech=sub.invest_tech,
        invest_fit_by_city=dict(sub.invest_fit_by_city or {}),
        invest_show_by_city=dict(sub.invest_show_by_city or {}),
        declaration=sub.declaration or "",
    )


def settle_tv_round(db: Session, match: ArenaMatch, tv_round: TvRound,
                    event_id: str = "none") -> dict[str, Any]:
    """执行单轮结算，写回 DB 并返回结算输出。"""
    config_id = match.game_config_id or "techventure-v1"
    cfg = get_cfg(config_id)
    defaults = cfg.get("defaults", {})
    total_rounds = defaults.get("rounds", 4)
    round_allowance = defaults.get("round_allowance", 20)
    interest_rate = defaults.get("interest_rate", 0.15)

    team_states = db.query(TvTeamState).filter(TvTeamState.event_id == match.id).all()
    teams_db = {s.team_id: db.query(ArenaTeam).get(s.team_id) for s in team_states}
    submissions = db.query(TvSubmission).filter(TvSubmission.round_id == tv_round.id).all()
    sub_map = {s.team_id: s for s in submissions}

    snapshots = [_build_snapshot(s, teams_db[s.team_id]) for s in team_states]
    decisions = [_build_decision(sub_map[s.team_id]) for s in team_states if s.team_id in sub_map]

    ctx = SettlementContext(
        round_no=tv_round.round_no,
        event_id=event_id,
        teams=snapshots,
        decisions=decisions,
        total_teams=len(team_states),
    )
    output = settle_round(ctx, config_id)

    # 写回快照 + 更新队伍状态
    for res in output["results"]:
        tid = res["team_id"]
        snap_obj = TvSnapshot(round_id=tv_round.id, team_id=tid, result_json=res)
        db.add(snap_obj)

        state = next(s for s in team_states if s.team_id == tid)
        state.tech = res["tech"]
        state.route = StrategyRoute(res["route"])
        state.opened_cities = list(res["cities"].keys())
        state.fit_by_city = {c: d["fit_after"] for c, d in res["cities"].items()}
        state.show_by_city = {c: d["show_after"] for c, d in res["cities"].items()}
        state.weighted_total = res["weighted_total"]
        state.attention_total = res["attention_total"]
        state.last_rank = res["rank"]

        # 资金结转
        sub = sub_map.get(tid)
        spent = res["spent"]["total"] if sub else 0
        reserved = state.budget - spent
        if tv_round.round_no < total_rounds:
            interest = reserved * interest_rate
            follow_on = res.get("follow_on_next_round", 0)
            state.budget = reserved + interest + round_allowance + follow_on
        else:
            state.budget = reserved

    # 写新闻
    for n in output["news"]:
        db.add(TvNews(
            round_id=tv_round.id,
            kind=n["kind"],
            headline=n["headline"],
            body=n.get("body", ""),
            team_ids=n.get("team_ids", []),
        ))

    tv_round.status = TvRoundStatus.settled
    from datetime import datetime, timezone
    tv_round.settled_at = datetime.now(timezone.utc)

    return output
