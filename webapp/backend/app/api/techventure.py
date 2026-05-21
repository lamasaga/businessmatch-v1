"""TechVenture 参赛端 API — 学生前端调用"""

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user
from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.db.database import get_db
from app.domains.arena.models.match import ArenaMatch
from app.domains.arena.models.participant import ArenaParticipant
from app.domains.arena.models.team import ArenaTeam
from app.domains.arena.enums import MatchStatus
from app.games.techventure.models import (
    TvTeamState, TvRound, TvSubmission, TvSnapshot, TvNews,
)
from app.games.techventure.enums import TvRoundStatus, StrategyRoute
from app.games.techventure.config import CITY_IDS, get_cfg
from app.models.user import User

router = APIRouter(prefix="/techventure", tags=["TechVenture 参赛端"])


# ── Schemas ──


class ProfileRequest(BaseModel):
    product_name: str = Field(..., max_length=40)


class SubmitDecisionRequest(BaseModel):
    route: str
    opened_cities: list[str]
    invest_tech: float = 0
    invest_fit_by_city: dict[str, float] = Field(default_factory=dict)
    invest_show_by_city: dict[str, float] = Field(default_factory=dict)
    declaration: str = ""


# ── Helpers ──


def _get_team_and_match(event_id: int, user: User, db: Session) -> tuple[ArenaMatch, ArenaTeam, ArenaParticipant]:
    match = db.query(ArenaMatch).get(event_id)
    if not match:
        raise BusinessException("场次不存在", code=ErrorCode.NOT_FOUND, status_code=404)
    part = db.query(ArenaParticipant).filter(
        ArenaParticipant.event_id == event_id,
        ArenaParticipant.user_id == user.id,
    ).first()
    if not part:
        raise BusinessException("你未加入此场次", code=ErrorCode.FORBIDDEN, status_code=403)
    if not part.team_id:
        raise BusinessException("你尚未加入任何队伍", code=ErrorCode.BAD_REQUEST, status_code=400)
    team = db.query(ArenaTeam).get(part.team_id)
    if not team:
        raise BusinessException("队伍数据异常", code=ErrorCode.NOT_FOUND, status_code=404)
    return match, team, part


def _current_round(event_id: int, db: Session) -> TvRound | None:
    return db.query(TvRound).filter(
        TvRound.event_id == event_id,
        TvRound.status == TvRoundStatus.open,
    ).first()


def _team_state_dict(state: TvTeamState, team: ArenaTeam) -> dict:
    return {
        "team_id": team.id,
        "team_name": team.team_name,
        "product_name": (team.metadata_ or {}).get("product_name", ""),
        "route": state.route.value if hasattr(state.route, "value") else state.route,
        "opened_cities": state.opened_cities or [],
        "tech": state.tech,
        "fit_by_city": state.fit_by_city or {},
        "show_by_city": state.show_by_city or {},
        "budget": state.budget,
        "weighted_total": state.weighted_total,
        "attention_total": state.attention_total,
        "last_rank": state.last_rank,
    }


def _round_dict(r: TvRound) -> dict:
    return {
        "id": r.id,
        "round_no": r.round_no,
        "status": r.status.value,
        "event_id_r3": r.event_id_r3.value if hasattr(r.event_id_r3, "value") else r.event_id_r3,
        "opened_at": r.opened_at.isoformat() if r.opened_at else None,
        "settled_at": r.settled_at.isoformat() if r.settled_at else None,
    }


# ── Lobby ──


class JoinTeamRequest(BaseModel):
    team_id: int


@router.get("/events/{event_id}/lobby", response_model=ApiResponse[dict])
def get_lobby(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """大厅：队伍列表、本人所在队伍、比赛状态。无需已选队。"""
    match = db.query(ArenaMatch).get(event_id)
    if not match:
        raise BusinessException("场次不存在", code=ErrorCode.NOT_FOUND, status_code=404)

    part = db.query(ArenaParticipant).filter(
        ArenaParticipant.event_id == event_id,
        ArenaParticipant.user_id == current_user.id,
    ).first()
    if not part:
        raise BusinessException("你未加入此场次", code=ErrorCode.FORBIDDEN, status_code=403)

    teams = db.query(ArenaTeam).filter(
        ArenaTeam.event_id == event_id,
        ArenaTeam.is_ai == 0,
    ).all()

    members_count: dict[int, int] = {}
    team_members: dict[int, list[str]] = {}
    for p in db.query(ArenaParticipant).filter(
        ArenaParticipant.event_id == event_id,
        ArenaParticipant.team_id.isnot(None),
    ).all():
        tid = p.team_id
        members_count[tid] = members_count.get(tid, 0) + 1
        u = db.query(User).get(p.user_id)
        if u:
            team_members.setdefault(tid, []).append(u.username)

    has_open_round = db.query(TvRound).filter(
        TvRound.event_id == event_id,
        TvRound.status == TvRoundStatus.open,
    ).first() is not None

    return ApiResponse.ok(data={
        "match_status": match.status.value,
        "title": match.title,
        "room_code": match.room_code,
        "my_team_id": part.team_id,
        "has_open_round": has_open_round,
        "teams": [
            {
                "id": t.id,
                "team_name": t.team_name,
                "product_name": (t.metadata_ or {}).get("product_name", ""),
                "member_count": members_count.get(t.id, 0),
                "members": team_members.get(t.id, []),
            }
            for t in teams
        ],
    })


@router.post("/events/{event_id}/join-team", response_model=ApiResponse[dict])
def join_team(
    event_id: int,
    body: JoinTeamRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """学生选择/切换队伍。"""
    match = db.query(ArenaMatch).get(event_id)
    if not match:
        raise BusinessException("场次不存在", code=ErrorCode.NOT_FOUND, status_code=404)
    if match.status not in (MatchStatus.registration, MatchStatus.playing):
        raise BusinessException("当前不可选队", code=ErrorCode.BAD_REQUEST, status_code=400)

    part = db.query(ArenaParticipant).filter(
        ArenaParticipant.event_id == event_id,
        ArenaParticipant.user_id == current_user.id,
    ).first()
    if not part:
        raise BusinessException("你未加入此场次", code=ErrorCode.FORBIDDEN, status_code=403)

    team = db.query(ArenaTeam).filter(
        ArenaTeam.id == body.team_id,
        ArenaTeam.event_id == event_id,
        ArenaTeam.is_ai == 0,
    ).first()
    if not team:
        raise BusinessException("队伍不存在", code=ErrorCode.NOT_FOUND, status_code=404)

    part.team_id = team.id
    db.commit()
    return ApiResponse.ok(data={"team_id": team.id, "team_name": team.team_name})


# ── Endpoints ──


@router.get("/events/{event_id}/state", response_model=ApiResponse[dict])
def get_state(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取参赛端完整状态。"""
    match, team, part = _get_team_and_match(event_id, current_user, db)
    state = db.query(TvTeamState).filter(TvTeamState.team_id == team.id).first()
    if not state:
        raise BusinessException("队伍状态未初始化", code=ErrorCode.NOT_FOUND, status_code=404)

    rounds = db.query(TvRound).filter(TvRound.event_id == event_id).order_by(TvRound.round_no).all()
    current_rd = next((r for r in rounds if r.status == TvRoundStatus.open), None)

    has_submitted = False
    if current_rd:
        sub = db.query(TvSubmission).filter(
            TvSubmission.round_id == current_rd.id,
            TvSubmission.team_id == team.id,
        ).first()
        has_submitted = sub is not None

    # 上一轮快照
    last_settled = next((r for r in reversed(rounds) if r.status == TvRoundStatus.settled), None)
    last_snapshot = None
    if last_settled:
        snap = db.query(TvSnapshot).filter(
            TvSnapshot.round_id == last_settled.id,
            TvSnapshot.team_id == team.id,
        ).first()
        if snap:
            last_snapshot = snap.result_json

    cfg = get_cfg(match.game_config_id or "techventure-v1")

    return ApiResponse.ok(data={
        "match_status": match.status.value,
        "team": _team_state_dict(state, team),
        "rounds": [_round_dict(r) for r in rounds],
        "current_round": _round_dict(current_rd) if current_rd else None,
        "has_submitted": has_submitted,
        "last_snapshot": last_snapshot,
        "routes": cfg.get("routes", {}),
        "cities": cfg.get("cities", {}),
        "defaults": cfg.get("defaults", {}),
    })


@router.get("/events/{event_id}/poll", response_model=ApiResponse[dict])
def poll(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """轻量轮询——前端定时调用。"""
    match, team, _p = _get_team_and_match(event_id, current_user, db)
    current_rd = _current_round(event_id, db)
    has_submitted = False
    if current_rd:
        sub = db.query(TvSubmission).filter(
            TvSubmission.round_id == current_rd.id,
            TvSubmission.team_id == team.id,
        ).first()
        has_submitted = sub is not None

    state = db.query(TvTeamState).filter(TvTeamState.team_id == team.id).first()
    return ApiResponse.ok(data={
        "match_status": match.status.value,
        "current_round": _round_dict(current_rd) if current_rd else None,
        "has_submitted": has_submitted,
        "budget": state.budget if state else 0,
        "last_rank": state.last_rank if state else None,
    })


@router.post("/events/{event_id}/profile", response_model=ApiResponse[dict])
def set_profile(
    event_id: int,
    body: ProfileRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """设置产品名。"""
    match, team, _p = _get_team_and_match(event_id, current_user, db)
    meta = dict(team.metadata_ or {})
    meta["product_name"] = body.product_name
    team.metadata_ = meta
    db.commit()
    return ApiResponse.ok(data={"product_name": body.product_name})


@router.post("/events/{event_id}/submit", response_model=ApiResponse[dict])
def submit_decision(
    event_id: int,
    body: SubmitDecisionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """提交本轮决策。"""
    match, team, _p = _get_team_and_match(event_id, current_user, db)
    if match.status != MatchStatus.playing:
        raise BusinessException("比赛未在进行中", code=ErrorCode.BAD_REQUEST, status_code=400)

    current_rd = _current_round(event_id, db)
    if not current_rd:
        raise BusinessException("当前无开放轮次", code=ErrorCode.BAD_REQUEST, status_code=400)

    existing = db.query(TvSubmission).filter(
        TvSubmission.round_id == current_rd.id,
        TvSubmission.team_id == team.id,
    ).first()
    if existing:
        raise BusinessException("本轮已提交决策", code=ErrorCode.BAD_REQUEST, status_code=400)

    state = db.query(TvTeamState).filter(TvTeamState.team_id == team.id).first()
    if not state:
        raise BusinessException("队伍状态异常", code=ErrorCode.NOT_FOUND, status_code=404)

    cfg = get_cfg(match.game_config_id or "techventure-v1")
    defaults = cfg.get("defaults", {})
    route_switch_cost = defaults.get("route_switch_cost", 5)
    city_expand_cost = defaults.get("city_expand_cost", 10)

    # 费用计算
    current_route = state.route.value if hasattr(state.route, "value") else state.route
    switch_cost = route_switch_cost if body.route != current_route else 0
    new_cities = [c for c in body.opened_cities if c not in (state.opened_cities or [])]
    expand_cost = city_expand_cost * len(new_cities)

    total_invest = body.invest_tech
    for c in CITY_IDS:
        total_invest += body.invest_fit_by_city.get(c, 0)
        total_invest += body.invest_show_by_city.get(c, 0)

    if total_invest + switch_cost + expand_cost > state.budget + 0.01:
        raise BusinessException(
            f"预算不足：需要 {total_invest + switch_cost + expand_cost:.1f}，可用 {state.budget:.1f}",
            code=ErrorCode.BAD_REQUEST, status_code=400,
        )

    sub = TvSubmission(
        round_id=current_rd.id,
        team_id=team.id,
        route=StrategyRoute(body.route),
        opened_cities=body.opened_cities,
        invest_tech=body.invest_tech,
        invest_fit_by_city=body.invest_fit_by_city,
        invest_show_by_city=body.invest_show_by_city,
        declaration=body.declaration,
        switch_cost_paid=switch_cost,
        expand_cost_paid=expand_cost,
        submitted_by=current_user.id,
    )
    db.add(sub)

    from app.domains.arena.enums import MatchKind
    if match.match_kind == MatchKind.practice:
        from app.games.techventure.practice_flow import run_ai_decisions_and_settle
        run_ai_decisions_and_settle(db, match, current_rd)

    db.commit()
    return ApiResponse.ok(data={"submitted": True, "round_no": current_rd.round_no})


@router.get("/events/{event_id}/leaderboard", response_model=ApiResponse[list])
def leaderboard(
    event_id: int,
    db: Session = Depends(get_db),
):
    """公开排行榜。"""
    states = db.query(TvTeamState).filter(TvTeamState.event_id == event_id).all()
    teams_db = {s.team_id: db.query(ArenaTeam).get(s.team_id) for s in states}
    board = []
    for s in sorted(states, key=lambda x: -x.weighted_total):
        t = teams_db.get(s.team_id)
        if not t:
            continue
        board.append({
            "team_id": s.team_id,
            "team_name": t.team_name,
            "product_name": (t.metadata_ or {}).get("product_name", ""),
            "weighted_total": s.weighted_total,
            "attention_total": s.attention_total,
            "last_rank": s.last_rank,
            "route": s.route.value if hasattr(s.route, "value") else s.route,
        })
    return ApiResponse.ok(data=board)


@router.get("/events/{event_id}/news", response_model=ApiResponse[list])
def get_news(
    event_id: int,
    db: Session = Depends(get_db),
):
    """获取所有新闻条目。"""
    rounds = db.query(TvRound).filter(TvRound.event_id == event_id).all()
    round_ids = [r.id for r in rounds]
    if not round_ids:
        return ApiResponse.ok(data=[])
    items = db.query(TvNews).filter(TvNews.round_id.in_(round_ids)).order_by(TvNews.id.desc()).all()
    return ApiResponse.ok(data=[
        {
            "id": n.id,
            "round_id": n.round_id,
            "kind": n.kind.value if hasattr(n.kind, "value") else n.kind,
            "headline": n.headline,
            "body": n.body,
            "team_ids": n.team_ids or [],
        }
        for n in items
    ])
