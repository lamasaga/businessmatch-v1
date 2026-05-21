"""TechVenture 练习模式流程管理。

练习赛自动推进：玩家提交 → AI 队伍生成决策 → 自动结算 → 自动开下一轮。
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.domains.arena.models.match import ArenaMatch
from app.domains.arena.models.team import ArenaTeam
from app.domains.arena.enums import MatchStatus
from app.games.techventure.models import TvTeamState, TvRound, TvSubmission
from app.games.techventure.enums import TvRoundStatus, TvEventId, StrategyRoute
from app.games.techventure.config import get_cfg
from app.games.techventure.ai_team import generate_ai_decision
from app.games.techventure.settle import settle_tv_round


def run_ai_decisions_and_settle(db: Session, match: ArenaMatch, tv_round: TvRound) -> None:
    """为所有 AI 队伍生成决策，然后结算当前轮，若未到最后一轮则自动开下一轮。"""
    config_id = match.game_config_id or "techventure-v1"
    cfg = get_cfg(config_id)
    defaults = cfg.get("defaults", {})
    total_rounds = defaults.get("rounds", 4)

    ai_teams = (
        db.query(ArenaTeam)
        .filter(ArenaTeam.event_id == match.id, ArenaTeam.is_ai == 1)
        .all()
    )

    for team in ai_teams:
        existing = db.query(TvSubmission).filter(
            TvSubmission.round_id == tv_round.id,
            TvSubmission.team_id == team.id,
        ).first()
        if existing:
            continue

        state = db.query(TvTeamState).filter(TvTeamState.team_id == team.id).first()
        if not state:
            continue

        dec = generate_ai_decision(state, tv_round.round_no, config_id)
        sub = TvSubmission(
            round_id=tv_round.id,
            team_id=team.id,
            route=StrategyRoute(dec["route"]),
            opened_cities=dec["opened_cities"],
            invest_tech=dec["invest_tech"],
            invest_fit_by_city=dec["invest_fit_by_city"],
            invest_show_by_city=dec["invest_show_by_city"],
            declaration=dec["declaration"],
        )
        db.add(sub)

    event_id = tv_round.event_id_r3.value if hasattr(tv_round.event_id_r3, "value") else tv_round.event_id_r3
    settle_tv_round(db, match, tv_round, event_id=event_id or "none")

    if tv_round.round_no < total_rounds:
        next_round = TvRound(
            event_id=match.id,
            round_no=tv_round.round_no + 1,
            status=TvRoundStatus.open,
            event_id_r3=TvEventId.none,
            opened_at=datetime.now(timezone.utc),
        )
        db.add(next_round)
    else:
        states = db.query(TvTeamState).filter(TvTeamState.event_id == match.id).order_by(
            TvTeamState.weighted_total.desc()
        ).all()
        for i, s in enumerate(states):
            team = db.query(ArenaTeam).get(s.team_id)
            if team:
                team.final_rank = i + 1
        match.status = MatchStatus.finished
