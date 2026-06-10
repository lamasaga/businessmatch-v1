"""OPS DB 结算编排：构造输入、调用引擎、写回结果"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.domains.arena.models.match import ArenaMatch
from app.domains.arena.models.team import ArenaTeam
from app.domains.arena.enums import MatchStatus
from app.games.ops_sim.models import (
    OpsTeamState, OpsRound, OpsSubmission, OpsSnapshot, OpsProductCard,
)
from app.games.ops_sim.enums import OpsRoundStatus, OpsMatchPhase
from app.games.ops_sim.config import get_cfg
from app.games.ops_sim.engine import settle_round, build_financial_statements
from app.games.ops_sim.ai import generate_ai_decision


def _team_state_dict(state: OpsTeamState) -> dict[str, Any]:
    return {
        "team_id": state.team_id,
        "cash": state.cash,
        "inventory": state.inventory,
        "cumulative_profit": state.cumulative_profit,
        "net_assets": state.net_assets,
        "tech": state.tech,
        "fit": state.fit,
        "show": state.show,
        "factories": state.factories or [],
        "ads": state.ads or [],
        "discount_rate": state.discount_rate,
        "entered_cities": state.entered_cities or [],
        "category": state.category.value if state.category else "home",
        "target_segment": state.target_segment.value if state.target_segment else "pragmatic",
        "product_name": state.product_name or "",
        "ai_strategy": state.ai_strategy.value if state.ai_strategy else None,
    }


def _decision_dict(sub: OpsSubmission) -> dict[str, Any]:
    return dict(sub.decision_json or {})


def _event_state(match: ArenaMatch) -> dict[str, Any]:
    return (match.config or {}).get("ops_event_state", {})


def ensure_ai_submissions(db: Session, match: ArenaMatch, ops_round: OpsRound) -> None:
    """练习赛中为 AI 队自动生成决策。"""
    ai_states = db.query(OpsTeamState).filter(
        OpsTeamState.event_id == match.id,
        OpsTeamState.ai_strategy.isnot(None),
    ).all()

    existing = db.query(OpsSubmission).filter(
        OpsSubmission.round_id == ops_round.id,
    ).all()
    existing_team_ids = {s.team_id for s in existing}

    for state in ai_states:
        if state.team_id in existing_team_ids:
            continue
        decision = generate_ai_decision(
            _team_state_dict(state),
            get_cfg(match.game_config_id or "ops-sim-v1"),
            ops_round.round_number,
        )
        key = f"ops_decision:{match.id}:{ops_round.id}:{state.team_id}"
        db.add(OpsSubmission(
            round_id=ops_round.id,
            team_id=state.team_id,
            decision_json=decision,
            idempotency_key=key,
        ))

    db.commit()


def settle_ops_round(db: Session, match: ArenaMatch, ops_round: OpsRound) -> dict[str, Any]:
    """执行单轮结算并写回 DB。"""
    cfg = get_cfg(match.game_config_id or "ops-sim-v1")

    # AI 自动提交
    ensure_ai_submissions(db, match, ops_round)

    team_states_db = db.query(OpsTeamState).filter(OpsTeamState.event_id == match.id).all()
    submissions = db.query(OpsSubmission).filter(OpsSubmission.round_id == ops_round.id).all()

    team_states = {s.team_id: _team_state_dict(s) for s in team_states_db}
    decisions = {s.team_id: _decision_dict(s) for s in submissions}

    match_state = {
        "event_id": match.id,
        "round_number": ops_round.round_number,
        "team_states": team_states,
        "event_state": _event_state(match),
    }

    output = settle_round(match_state, decisions, cfg)

    # 更新队伍状态 + 写快照
    for res in output["results"]:
        tid = res["team_id"]
        state = next(s for s in team_states_db if s.team_id == tid)
        state.cash = res["cash_after"]
        state.inventory = res["inventory_after"]
        state.cumulative_profit = res["cumulative_profit"]
        state.net_assets = res["net_assets"]
        state.tech = res["tech"]
        state.fit = res["fit"]
        state.show = res["show"]
        state.entered_cities = res["entered_cities"]

        statements = build_financial_statements(res)
        db.add(OpsSnapshot(
            round_id=ops_round.id,
            team_id=tid,
            result_json=res,
            financial_statements=statements,
        ))

    # 保存事件到 match.config
    if output.get("event"):
        event = output["event"]
        ops_event_state = _event_state(match)
        if event["id"] == "raw_material_spike":
            ops_event_state["material_cost_multiplier"] = event["effects"].get("material_cost_multiplier", 1.0)
        elif event["id"] == "consumer_downgrade":
            ops_event_state["show_preference_delta"] = event["effects"].get("show_preference_delta", 0)
            ops_event_state["price_sensitivity_delta"] = event["effects"].get("price_sensitivity_delta", 0)
        elif event["id"] == "policy_subsidy":
            import random
            cities = list(cfg.get("cities", {}).keys())
            ops_event_state["policy_subsidy_city"] = random.choice(cities) if cities else None
        match.config = {**(match.config or {}), "ops_event_state": ops_event_state}

    ops_round.status = OpsRoundStatus.settled
    ops_round.settled_at = datetime.now(timezone.utc)

    # 更新比赛阶段
    next_phases = {
        OpsMatchPhase.operation_round_1: OpsMatchPhase.operation_round_2,
        OpsMatchPhase.operation_round_2: OpsMatchPhase.auction,
        OpsMatchPhase.operation_round_3: OpsMatchPhase.operation_round_4,
        OpsMatchPhase.operation_round_4: OpsMatchPhase.finished,
    }
    current_phase = OpsMatchPhase(match.status.value)
    if current_phase in next_phases:
        if current_phase == OpsMatchPhase.operation_round_2:
            match.status = MatchStatus.playing  # 进入拍卖，保持 playing
            match.config = {**(match.config or {}), "ops_phase": OpsMatchPhase.auction.value}
        elif current_phase == OpsMatchPhase.operation_round_4:
            match.status = MatchStatus.finished
        else:
            match.status = MatchStatus.playing

    db.commit()
    return output


def final_ranking(db: Session, match: ArenaMatch) -> list[dict[str, Any]]:
    """计算最终排名和特殊奖项。"""
    states = db.query(OpsTeamState).filter(OpsTeamState.event_id == match.id).all()
    teams = {t.id: t for t in db.query(ArenaTeam).filter(ArenaTeam.event_id == match.id).all()}
    cards = {c.team_id: c for c in db.query(OpsProductCard).filter(OpsProductCard.event_id == match.id).all()}

    rows = []
    for s in states:
        team = teams.get(s.team_id)
        card = cards.get(s.team_id)
        score = s.net_assets * 0.7 + s.cumulative_profit * 0.3
        rows.append({
            "team_id": s.team_id,
            "team_name": team.team_name if team else f"Team {s.team_id}",
            "net_assets": s.net_assets,
            "cumulative_profit": s.cumulative_profit,
            "score": round(score, 2),
            "category": card.category.value if card and card.category else None,
            "target_segment": card.target_segment.value if card and card.target_segment else None,
        })

    rows.sort(key=lambda x: x["score"], reverse=True)
    for i, r in enumerate(rows):
        r["rank"] = i + 1

    return rows
