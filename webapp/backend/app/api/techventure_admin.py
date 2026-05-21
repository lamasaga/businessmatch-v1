"""TechVenture 组织端 / 大屏 / 评委 API"""

from datetime import datetime, timezone
from typing import Optional

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
from app.games.techventure.enums import TvRoundStatus, TvEventId, StrategyRoute
from app.games.techventure.config import CITY_IDS, get_cfg
from app.games.techventure.settle import settle_tv_round
from app.models.user import User

router = APIRouter(prefix="/techventure/admin", tags=["TechVenture 组织端"])


# ── Schemas ──


class CreateTeamsRequest(BaseModel):
    team_names: list[str] = Field(..., min_length=1)


class UpdateTeamRequest(BaseModel):
    team_name: Optional[str] = None
    product_name: Optional[str] = None


class OpenRoundRequest(BaseModel):
    event_id_r3: str = "none"


class SettleRoundRequest(BaseModel):
    event_id_r3: Optional[str] = None


# ── Helpers ──


def _require_organizer(event_id: int, user: User, db: Session) -> ArenaMatch:
    match = db.query(ArenaMatch).get(event_id)
    if not match:
        raise BusinessException("场次不存在", code=ErrorCode.NOT_FOUND, status_code=404)
    if match.organizer_id != user.id and user.role.value != "admin":
        raise BusinessException("无权操作此场次", code=ErrorCode.FORBIDDEN, status_code=403)
    return match


def _team_out(team: ArenaTeam, state: TvTeamState | None = None) -> dict:
    base = {
        "id": team.id,
        "team_name": team.team_name,
        "is_ai": team.is_ai,
        "product_name": (team.metadata_ or {}).get("product_name", ""),
        "member_count": 0,
    }
    if state:
        base.update({
            "route": state.route.value if hasattr(state.route, "value") else state.route,
            "budget": state.budget,
            "tech": state.tech,
            "weighted_total": state.weighted_total,
            "last_rank": state.last_rank,
        })
    return base


# ── Endpoints ──


@router.get("/events/{event_id}/state", response_model=ApiResponse[dict])
def admin_state(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """组织者端完整状态。"""
    match = _require_organizer(event_id, current_user, db)
    teams = db.query(ArenaTeam).filter(ArenaTeam.event_id == event_id).all()
    states_db = {
        s.team_id: s for s in
        db.query(TvTeamState).filter(TvTeamState.event_id == event_id).all()
    }
    members_count: dict[int, int] = {}
    for p in db.query(ArenaParticipant).filter(ArenaParticipant.event_id == event_id).all():
        if p.team_id:
            members_count[p.team_id] = members_count.get(p.team_id, 0) + 1

    team_list = []
    for t in teams:
        out = _team_out(t, states_db.get(t.id))
        out["member_count"] = members_count.get(t.id, 0)
        # 当前轮提交状态
        team_list.append(out)

    rounds = db.query(TvRound).filter(TvRound.event_id == event_id).order_by(TvRound.round_no).all()
    current_rd = next((r for r in rounds if r.status == TvRoundStatus.open), None)

    submitted_teams: list[int] = []
    if current_rd:
        subs = db.query(TvSubmission.team_id).filter(TvSubmission.round_id == current_rd.id).all()
        submitted_teams = [s[0] for s in subs]

    participants_out: list[dict] = []
    for p in db.query(ArenaParticipant).filter(ArenaParticipant.event_id == event_id).all():
        u = db.query(User).get(p.user_id)
        team_name = None
        if p.team_id:
            t = db.query(ArenaTeam).get(p.team_id)
            team_name = t.team_name if t else None
        participants_out.append({
            "user_id": p.user_id,
            "username": u.username if u else f"用户{p.user_id}",
            "team_id": p.team_id,
            "team_name": team_name,
        })

    unassigned = sum(1 for x in participants_out if not x["team_id"])

    return ApiResponse.ok(data={
        "match_id": match.id,
        "match_status": match.status.value,
        "title": match.title,
        "room_code": match.room_code,
        "max_players": match.max_players,
        "participant_count": len(participants_out),
        "unassigned_count": unassigned,
        "participants": participants_out,
        "teams": team_list,
        "rounds": [
            {
                "id": r.id, "round_no": r.round_no, "status": r.status.value,
                "event_id_r3": r.event_id_r3.value if hasattr(r.event_id_r3, "value") else r.event_id_r3,
                "opened_at": r.opened_at.isoformat() if r.opened_at else None,
                "settled_at": r.settled_at.isoformat() if r.settled_at else None,
            }
            for r in rounds
        ],
        "current_round": {
            "id": current_rd.id, "round_no": current_rd.round_no,
            "submitted_teams": submitted_teams,
            "total_teams": len(teams),
        } if current_rd else None,
    })


@router.post("/events/{event_id}/teams", response_model=ApiResponse[list], status_code=201)
def create_teams(
    event_id: int,
    body: CreateTeamsRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """批量创建队伍（仅报名阶段）。"""
    match = _require_organizer(event_id, current_user, db)
    if match.status not in (MatchStatus.registration, MatchStatus.draft):
        raise BusinessException("比赛已开始，不可新建队伍", code=ErrorCode.BAD_REQUEST, status_code=400)
    cfg = get_cfg(match.game_config_id or "techventure-v1")
    defaults = cfg.get("defaults", {})
    seed = defaults.get("seed_budget", 100)
    a_init = defaults.get("a_init", 2.0)
    home_city = CITY_IDS[0]

    created = []
    for name in body.team_names:
        team = ArenaTeam(event_id=event_id, team_name=name)
        db.add(team)
        db.flush()
        state = TvTeamState(
            team_id=team.id, event_id=event_id,
            route=StrategyRoute.TECH, home_city=home_city,
            opened_cities=[home_city],
            tech=a_init,
            fit_by_city={c: a_init for c in CITY_IDS},
            show_by_city={c: a_init for c in CITY_IDS},
            budget=seed,
        )
        db.add(state)
        created.append(_team_out(team, state))
    db.commit()
    return ApiResponse.ok(data=created)


@router.patch("/events/{event_id}/teams/{team_id}", response_model=ApiResponse[dict])
def update_team(
    event_id: int,
    team_id: int,
    body: UpdateTeamRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """更新队伍信息（报名阶段可改队名/产品名）。"""
    match = _require_organizer(event_id, current_user, db)
    if match.status not in (MatchStatus.registration, MatchStatus.draft):
        raise BusinessException("比赛已开始，不可修改队伍信息", code=ErrorCode.BAD_REQUEST, status_code=400)
    team = db.query(ArenaTeam).filter(ArenaTeam.id == team_id, ArenaTeam.event_id == event_id).first()
    if not team:
        raise BusinessException("队伍不存在", code=ErrorCode.NOT_FOUND, status_code=404)
    if body.team_name:
        team.team_name = body.team_name
    if body.product_name is not None:
        meta = dict(team.metadata_ or {})
        meta["product_name"] = body.product_name
        team.metadata_ = meta
    db.commit()
    state = db.query(TvTeamState).filter(TvTeamState.team_id == team_id).first()
    return ApiResponse.ok(data=_team_out(team, state))


@router.post("/events/{event_id}/start", response_model=ApiResponse[dict])
def start_match(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """报名结束、进入控场态（不自动开放第一轮）。"""
    match = _require_organizer(event_id, current_user, db)
    if match.status not in (MatchStatus.registration, MatchStatus.draft):
        raise BusinessException("比赛不在可开始状态", code=ErrorCode.BAD_REQUEST, status_code=400)

    participants = db.query(ArenaParticipant).filter(ArenaParticipant.event_id == event_id).all()
    if len(participants) < 1:
        raise BusinessException("至少需要 1 名选手加入后才能开始", code=ErrorCode.BAD_REQUEST, status_code=400)

    team_count = db.query(ArenaTeam).filter(
        ArenaTeam.event_id == event_id,
        ArenaTeam.is_ai == 0,
    ).count()
    if team_count < 1:
        raise BusinessException("请先创建至少 1 支队伍", code=ErrorCode.BAD_REQUEST, status_code=400)

    unassigned = [p for p in participants if not p.team_id]
    if unassigned:
        raise BusinessException(
            f"仍有 {len(unassigned)} 名选手未选队，请提醒选手完成组队后再开始",
            code=ErrorCode.BAD_REQUEST,
            status_code=400,
        )

    match.status = MatchStatus.playing
    match.current_round = 0
    db.commit()
    return ApiResponse.ok(data={"match_status": match.status.value, "title": match.title})


@router.post("/events/{event_id}/rounds/open", response_model=ApiResponse[dict])
def open_round(
    event_id: int,
    body: OpenRoundRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """开放下一轮。"""
    match = _require_organizer(event_id, current_user, db)
    if match.status != MatchStatus.playing:
        raise BusinessException("请先点击「开始比赛」结束报名阶段", code=ErrorCode.BAD_REQUEST, status_code=400)

    existing = db.query(TvRound).filter(TvRound.event_id == event_id).order_by(TvRound.round_no.desc()).first()
    if existing and existing.status == TvRoundStatus.open:
        raise BusinessException("上一轮尚未结算", code=ErrorCode.BAD_REQUEST, status_code=400)

    next_no = (existing.round_no + 1) if existing else 1
    cfg = get_cfg(match.game_config_id or "techventure-v1")
    total_rounds = cfg.get("defaults", {}).get("rounds", 4)
    if next_no > total_rounds:
        raise BusinessException("所有轮次已完成", code=ErrorCode.BAD_REQUEST, status_code=400)

    new_round = TvRound(
        event_id=event_id,
        round_no=next_no,
        status=TvRoundStatus.open,
        event_id_r3=TvEventId(body.event_id_r3) if next_no == 3 and body.event_id_r3 != "none" else TvEventId.none,
        opened_at=datetime.now(timezone.utc),
    )
    db.add(new_round)
    db.commit()
    db.refresh(new_round)
    return ApiResponse.ok(data={
        "round_id": new_round.id, "round_no": new_round.round_no,
        "status": new_round.status.value,
    })


@router.post("/events/{event_id}/rounds/settle", response_model=ApiResponse[dict])
def settle_current_round(
    event_id: int,
    body: SettleRoundRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """结算当前轮。"""
    match = _require_organizer(event_id, current_user, db)
    current_rd = db.query(TvRound).filter(
        TvRound.event_id == event_id,
        TvRound.status == TvRoundStatus.open,
    ).first()
    if not current_rd:
        raise BusinessException("无开放轮次", code=ErrorCode.BAD_REQUEST, status_code=400)

    ev = body.event_id_r3 or (current_rd.event_id_r3.value if hasattr(current_rd.event_id_r3, "value") else current_rd.event_id_r3)
    output = settle_tv_round(db, match, current_rd, event_id=ev or "none")

    # 最后一轮？更新队伍排名并结束比赛
    cfg = get_cfg(match.game_config_id or "techventure-v1")
    total_rounds = cfg.get("defaults", {}).get("rounds", 4)
    if current_rd.round_no >= total_rounds:
        states = db.query(TvTeamState).filter(TvTeamState.event_id == event_id).order_by(
            TvTeamState.weighted_total.desc()
        ).all()
        for i, s in enumerate(states):
            team = db.query(ArenaTeam).get(s.team_id)
            if team:
                team.final_rank = i + 1
        match.status = MatchStatus.finished

    db.commit()
    return ApiResponse.ok(data={
        "round_no": output["round_no"],
        "event_label": output["event_label"],
        "results_count": len(output["results"]),
        "news_count": len(output["news"]),
        "match_finished": match.status == MatchStatus.finished,
    })


# ── 大屏 / 评委 ──


@router.get("/events/{event_id}/screen", response_model=ApiResponse[dict])
def screen_data(
    event_id: int,
    db: Session = Depends(get_db),
):
    """大屏投影数据。"""
    match = db.query(ArenaMatch).get(event_id)
    if not match:
        raise BusinessException("场次不存在", code=ErrorCode.NOT_FOUND, status_code=404)

    last_settled = db.query(TvRound).filter(
        TvRound.event_id == event_id,
        TvRound.status == TvRoundStatus.settled,
    ).order_by(TvRound.round_no.desc()).first()

    snapshots_data: list[dict] = []
    city_pies: list[dict] = []
    news: list[dict] = []
    if last_settled:
        snaps = db.query(TvSnapshot).filter(TvSnapshot.round_id == last_settled.id).all()
        snapshots_data = [s.result_json for s in snaps]
        news_items = db.query(TvNews).filter(TvNews.round_id == last_settled.id).all()
        news = [{"headline": n.headline, "body": n.body, "kind": n.kind.value if hasattr(n.kind, "value") else n.kind} for n in news_items]

    states = db.query(TvTeamState).filter(TvTeamState.event_id == event_id).order_by(
        TvTeamState.weighted_total.desc()
    ).all()
    teams_db = {t.id: t for t in db.query(ArenaTeam).filter(ArenaTeam.event_id == event_id).all()}
    leaderboard = []
    for s in states:
        t = teams_db.get(s.team_id)
        if t:
            leaderboard.append({
                "team_id": s.team_id,
                "team_name": t.team_name,
                "product_name": (t.metadata_ or {}).get("product_name", ""),
                "weighted_total": s.weighted_total,
                "attention_total": s.attention_total,
                "last_rank": s.last_rank,
                "route": s.route.value if hasattr(s.route, "value") else s.route,
            })

    current_rd = db.query(TvRound).filter(
        TvRound.event_id == event_id,
        TvRound.status == TvRoundStatus.open,
    ).first()

    return ApiResponse.ok(data={
        "match_status": match.status.value,
        "title": match.title,
        "last_round_no": last_settled.round_no if last_settled else 0,
        "current_round_no": current_rd.round_no if current_rd else None,
        "leaderboard": leaderboard,
        "snapshots": snapshots_data,
        "news": news,
    })


@router.get("/judge/events/{event_id}/state", response_model=ApiResponse[dict])
def judge_state(
    event_id: int,
    db: Session = Depends(get_db),
):
    """评委视角：每队每轮详细快照。"""
    match = db.query(ArenaMatch).get(event_id)
    if not match:
        raise BusinessException("场次不存在", code=ErrorCode.NOT_FOUND, status_code=404)

    rounds = db.query(TvRound).filter(TvRound.event_id == event_id).order_by(TvRound.round_no).all()
    teams = db.query(ArenaTeam).filter(ArenaTeam.event_id == event_id).all()
    teams_map = {t.id: t.team_name for t in teams}

    rounds_data = []
    for r in rounds:
        snaps = db.query(TvSnapshot).filter(TvSnapshot.round_id == r.id).all()
        rounds_data.append({
            "round_no": r.round_no,
            "status": r.status.value,
            "snapshots": [
                {"team_id": s.team_id, "team_name": teams_map.get(s.team_id, ""), "data": s.result_json}
                for s in snaps
            ],
        })

    return ApiResponse.ok(data={
        "match_status": match.status.value,
        "title": match.title,
        "teams": [{"id": t.id, "team_name": t.team_name} for t in teams],
        "rounds": rounds_data,
    })
