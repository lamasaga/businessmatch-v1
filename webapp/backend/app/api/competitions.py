"""比赛路由 - 创建、加入、管理比赛"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.db.database import get_db
from app.models.user import User, UserRole
from app.domains.arena.enums import DesignMode, GameEngineId, MatchKind, MatchStatus, ParticipantStatus
from app.domains.arena.models import OrganizerProfile, ArenaMatch, ArenaParticipant, ArenaTeam, TeachingGroup
from app.domains.arena.services.teaching_group_service import (
    assert_group_teacher,
    ensure_organizer_profile,
)
from app.domains.arena.serializers import event_to_out
from app.domains.arena.services.match_factory import create_official_match
from app.domains.arena.services.match_lifecycle import begin_match
from app.domains.career.services.rewards import finalize_match_rewards
from app.games.trading import TradingRound, RoundStatus

EventStatus = MatchStatus
CompetitionEvent = ArenaMatch
CompetitionParticipant = ArenaParticipant
GameType = GameEngineId
from app.schemas.trading_competition import (
    CompetitionEventCreate, CompetitionEventOut, CompetitionEventUpdate,
    CompetitionEventDetail, JoinCompetitionRequest, JoinCompetitionResult, ParticipantOut,
    MyCompetitionStatus, GameConfig,
)
from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.core.dependencies import get_current_active_user

router = APIRouter(prefix="/competitions", tags=["比赛"])


def _get_organizer_profile(user_id: int, db: Session) -> OrganizerProfile:
    """获取用户对应的组织者档案"""
    profile = db.query(OrganizerProfile).filter(OrganizerProfile.user_id == user_id).first()
    if not profile:
        raise BusinessException(
            message="您还不是组织者，无法创建比赛",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    return profile


def _event_to_out(event: ArenaMatch, db: Session) -> CompetitionEventOut:
    return event_to_out(event, db)


# ============== 公开接口 ==============

@router.get("", response_model=ApiResponse[List[CompetitionEventOut]])
def list_competitions(
    status: Optional[str] = None,
    match_kind: str = MatchKind.official.value,
    db: Session = Depends(get_db),
):
    """获取公开比赛列表（默认仅正式赛）"""
    query = db.query(CompetitionEvent).filter(CompetitionEvent.match_kind == MatchKind(match_kind))
    if status:
        query = query.filter(CompetitionEvent.status == status)
    else:
        query = query.filter(CompetitionEvent.status.in_([
            EventStatus.registration, EventStatus.playing
        ]))

    events = query.order_by(CompetitionEvent.created_at.desc()).all()
    return ApiResponse.ok(data=[_event_to_out(e, db) for e in events])


@router.get("/{event_id}", response_model=ApiResponse[CompetitionEventOut])
def get_competition(event_id: int, db: Session = Depends(get_db)):
    """获取比赛详情"""
    event = db.query(CompetitionEvent).filter(CompetitionEvent.id == event_id).first()
    if not event:
        raise BusinessException(
            message="比赛不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return ApiResponse.ok(data=_event_to_out(event, db))


@router.post("/join", response_model=ApiResponse[JoinCompetitionResult])
def join_competition(
    data: JoinCompetitionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """通过房间码加入比赛"""
    event = db.query(CompetitionEvent).filter(
        CompetitionEvent.room_code == data.room_code
    ).first()

    if not event:
        raise BusinessException(
            message="房间码无效",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    # 已加入：幂等返回，便于房间码重复进入大厅
    existing = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.event_id == event.id,
        CompetitionParticipant.user_id == current_user.id,
    ).first()
    if existing:
        return ApiResponse.ok(
            data=JoinCompetitionResult(
                participant=_participant_to_out(existing, db),
                event_id=event.id,
                game_config_id=event.game_config_id or "",
                event_status=event.status.value if event.status else "registration",
                title=event.title or f"商赛 #{event.id}",
                already_joined=True,
            ),
            message="您已在比赛中",
        )

    if event.status not in [EventStatus.draft, EventStatus.registration]:
        raise BusinessException(
            message="比赛已开始或已结束，无法加入",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # 检查人数上限
    participant_count = db.query(func.count(CompetitionParticipant.id)).filter(
        CompetitionParticipant.event_id == event.id
    ).scalar()
    if participant_count >= event.max_players:
        raise BusinessException(
            message="比赛人数已满",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    config = event.config or {}
    initial_capital = config.get("initial_capital", 50000)

    participant = CompetitionParticipant(
        event_id=event.id,
        user_id=current_user.id,
        cash=initial_capital,
        inventory={},
        current_city=config.get("cities", ["nanjing"])[0] if config.get("cities") else "nanjing",
        total_assets=initial_capital,
    )
    db.add(participant)

    # OPS 队伍制：加入时自动创建独立队伍
    if event.game_type == GameEngineId.ops_sim:
        team = ArenaTeam(
            event_id=event.id,
            team_name=f"{current_user.username}的队伍",
            is_ai=0,
        )
        db.add(team)
        db.flush()
        participant.team_id = team.id

    # 如果是第一个参与者，将比赛状态改为报名中
    if event.status == EventStatus.draft:
        event.status = EventStatus.registration

    db.commit()
    db.refresh(participant)

    return ApiResponse.ok(
        data=JoinCompetitionResult(
            participant=_participant_to_out(participant, db),
            event_id=event.id,
            game_config_id=event.game_config_id or "",
            event_status=event.status.value if event.status else "registration",
            title=event.title or f"商赛 #{event.id}",
            already_joined=False,
        ),
        message="加入成功",
    )


@router.post("/{event_id}/leave", response_model=ApiResponse[dict])
def leave_competition(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """退出比赛"""
    participant = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.event_id == event_id,
        CompetitionParticipant.user_id == current_user.id,
    ).first()

    if not participant:
        raise BusinessException(
            message="您未参加这场比赛",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    if participant.event.status == EventStatus.playing:
        raise BusinessException(
            message="比赛进行中，无法退出",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    db.delete(participant)
    db.commit()
    return ApiResponse.ok(data={"message": "已退出比赛"})


@router.get("/{event_id}/standings", response_model=ApiResponse[List[dict]])
def get_standings(event_id: int, db: Session = Depends(get_db)):
    """获取排行榜"""
    participants = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.event_id == event_id,
    ).order_by(CompetitionParticipant.total_assets.desc()).all()

    standings = []
    for rank, p in enumerate(participants, 1):
        user = p.user
        inventory_value = _calc_inventory_value(p.inventory, event_id, db)
        standings.append({
            "rank": rank,
            "user_id": user.id,
            "username": user.username,
            "avatar": user.avatar,
            "cash": p.cash,
            "inventory_value": inventory_value,
            "total_assets": p.total_assets,
            "current_city": p.current_city,
        })

    return ApiResponse.ok(data=standings)


@router.get("/{event_id}/my-status", response_model=ApiResponse[MyCompetitionStatus])
def get_my_status(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取我的参赛状态"""
    event = db.query(CompetitionEvent).filter(CompetitionEvent.id == event_id).first()
    if not event:
        raise BusinessException(
            message="比赛不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    participant = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.event_id == event_id,
        CompetitionParticipant.user_id == current_user.id,
    ).first()

    is_organizer = False
    organizer = db.query(OrganizerProfile).filter(
        OrganizerProfile.user_id == current_user.id
    ).first()
    if organizer and event.organizer_id == organizer.id:
        is_organizer = True

    return ApiResponse.ok(data=MyCompetitionStatus(
        event=_event_to_out(event, db),
        participant=_participant_to_out(participant, db) if participant else None,
        is_organizer=is_organizer,
    ))


# ============== 组织者接口 ==============

@router.post("", response_model=ApiResponse[CompetitionEventOut], status_code=status.HTTP_201_CREATED)
def create_competition(
    data: CompetitionEventCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """创建比赛"""
    if current_user.role in (UserRole.admin, UserRole.teacher):
        profile = ensure_organizer_profile(db, current_user)
    else:
        profile = _get_organizer_profile(current_user.id, db)
    config_dict = data.config.model_dump() if data.config else {}
    design = DesignMode(data.design_mode) if data.design_mode else DesignMode.standalone
    config_id = data.game_config_id or "fstrading"

    group_id = data.teaching_group_id
    if group_id is not None:
        group = db.query(TeachingGroup).filter(TeachingGroup.id == group_id).first()
        if not group:
            raise BusinessException(
                message="体验营不存在",
                code=ErrorCode.NOT_FOUND,
                status_code=status.HTTP_404_NOT_FOUND,
            )
        try:
            assert_group_teacher(group, current_user)
        except PermissionError:
            raise BusinessException(
                message="无权在该体验营下创建商赛",
                code=ErrorCode.FORBIDDEN,
                status_code=status.HTTP_403_FORBIDDEN,
            )

    event = create_official_match(
        db,
        organizer=profile,
        title=data.title,
        description=data.description,
        game_config_id=config_id,
        design_mode=design,
        max_players=data.max_players,
        config_overrides=config_dict,
        teaching_group_id=group_id,
    )
    db.commit()
    db.refresh(event)

    return ApiResponse.ok(data=_event_to_out(event, db))


@router.put("/{event_id}", response_model=ApiResponse[CompetitionEventOut])
def update_competition(
    event_id: int,
    data: CompetitionEventUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """更新比赛信息"""
    event = db.query(CompetitionEvent).filter(CompetitionEvent.id == event_id).first()
    if not event:
        raise BusinessException(
            message="比赛不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    profile = _get_organizer_profile(current_user.id, db)
    if event.organizer_id != profile.id:
        raise BusinessException(
            message="您不是这场比赛的组织者",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    if data.title is not None:
        event.title = data.title
    if data.description is not None:
        event.description = data.description

    db.commit()
    db.refresh(event)
    return ApiResponse.ok(data=_event_to_out(event, db))


@router.post("/{event_id}/start", response_model=ApiResponse[CompetitionEventOut])
def start_competition(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """开始比赛"""
    event = db.query(CompetitionEvent).filter(CompetitionEvent.id == event_id).first()
    if not event:
        raise BusinessException(
            message="比赛不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    profile = _get_organizer_profile(current_user.id, db)
    if event.organizer_id != profile.id:
        raise BusinessException(
            message="您不是这场比赛的组织者",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    begin_match(db, event)
    db.commit()
    db.refresh(event)
    from app.games.trading.rts_config import is_rts_mode
    from app.games.trading.rts_scheduler import start_rts_scheduler

    if is_rts_mode(event.config):
        start_rts_scheduler(event.id)
    return ApiResponse.ok(data=_event_to_out(event, db))


@router.post("/{event_id}/end", response_model=ApiResponse[CompetitionEventOut])
def end_competition(
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """结束比赛并计算结果"""
    event = db.query(CompetitionEvent).filter(CompetitionEvent.id == event_id).first()
    if not event:
        raise BusinessException(
            message="比赛不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    profile = _get_organizer_profile(current_user.id, db)
    if event.organizer_id != profile.id:
        raise BusinessException(
            message="您不是这场比赛的组织者",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    if event.status != EventStatus.playing:
        raise BusinessException(
            message="比赛不在进行中",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    participants = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.event_id == event.id
    ).order_by(CompetitionParticipant.total_assets.desc()).all()

    total = len(participants)
    profile.total_events_hosted += 1
    profile.total_participants += total

    from app.games.trading.rts_config import is_rts_mode
    from app.games.trading.rts_tick import finish_rts_match

    rts_early_end = is_rts_mode(event.config)
    if rts_early_end:
        finish_rts_match(db, event, participants)
    else:
        for rank, p in enumerate(participants, 1):
            p.final_rank = rank
            p.status = ParticipantStatus.joined
        finalize_match_rewards(db, event, participants)
        event.current_round = event.config.get("rounds", 10) if event.config else 10
        event.status = EventStatus.finished
        event.ends_at = func.now()

    db.commit()
    db.refresh(event)
    if rts_early_end:
        from app.games.trading.rts_ws import broadcast_rts_from_match

        broadcast_rts_from_match(event, finished=True)
    return ApiResponse.ok(data=_event_to_out(event, db))


# ============== 辅助函数 ==============

def _participant_to_out(participant: CompetitionParticipant, db: Session) -> ParticipantOut:
    """将ORM转为输出schema"""
    from app.games.trading.bot_users import bot_display_name

    user = participant.user
    username = bot_display_name(user.username) if getattr(participant, "is_ai", 0) else user.username
    return ParticipantOut(
        id=participant.id,
        event_id=participant.event_id,
        user_id=participant.user_id,
        username=username,
        avatar=user.avatar,
        cash=participant.cash,
        inventory=participant.inventory or {},
        current_city=participant.current_city,
        total_assets=participant.total_assets,
        status=participant.status.value if participant.status else "joined",
        final_rank=participant.final_rank,
        experience_earned=participant.experience_earned,
        joined_at=participant.joined_at,
    )


def _unit_price_for_valuation(city_prices: dict, pid: str) -> float:
    if pid not in city_prices:
        return 0.0
    row = city_prices[pid]
    if isinstance(row, dict):
        return float(row.get("bid") or row.get("ask") or 0)
    return float(row)


def _calc_inventory_value(inventory: dict, event_id: int, db: Session) -> float:
    """计算库存当前价值（兼容回合制标量价与 RTS ask/bid 结构）"""
    if not inventory:
        return 0.0

    latest_round = db.query(TradingRound).filter(
        TradingRound.event_id == event_id
    ).order_by(TradingRound.round_number.desc()).first()

    if not latest_round or not latest_round.price_snapshot:
        return 0.0

    prices = latest_round.price_snapshot
    total = 0.0
    for pid, qty in inventory.items():
        for city_key, city_prices in prices.items():
            if city_key.startswith("_") or not isinstance(city_prices, dict):
                continue
            unit = _unit_price_for_valuation(city_prices, pid)
            if unit > 0:
                total += unit * qty
                break

    return total
