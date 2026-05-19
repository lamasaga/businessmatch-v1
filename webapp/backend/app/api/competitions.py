"""比赛路由 - 创建、加入、管理比赛"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.db.database import get_db
from app.models.user import User
from app.models.trading_competition import (
    OrganizerProfile, CompetitionEvent, CompetitionParticipant, TradingRound, TradingPrice,
    EventStatus, ParticipantStatus, RoundStatus, GameType,
    generate_room_code, PRODUCTS, CITIES, generate_random_events, calculate_prices,
)
from app.schemas.trading_competition import (
    CompetitionEventCreate, CompetitionEventOut, CompetitionEventUpdate,
    CompetitionEventDetail, JoinCompetitionRequest, ParticipantOut,
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


def _event_to_out(event: CompetitionEvent, db: Session) -> CompetitionEventOut:
    """将ORM对象转为输出schema"""
    participant_count = db.query(func.count(CompetitionParticipant.id)).filter(
        CompetitionParticipant.event_id == event.id
    ).scalar()
    data = {
        "id": event.id,
        "organizer_id": event.organizer_id,
        "room_code": event.room_code,
        "title": event.title,
        "description": event.description,
        "game_type": event.game_type.value if event.game_type else "trading",
        "status": event.status.value if event.status else "draft",
        "config": event.config or {},
        "max_players": event.max_players,
        "current_round": event.current_round,
        "starts_at": event.starts_at,
        "ends_at": event.ends_at,
        "created_at": event.created_at,
        "participant_count": participant_count,
    }
    return CompetitionEventOut.model_validate(data)


# ============== 公开接口 ==============

@router.get("", response_model=ApiResponse[List[CompetitionEventOut]])
def list_competitions(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """获取公开比赛列表"""
    query = db.query(CompetitionEvent)
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


@router.post("/join", response_model=ApiResponse[ParticipantOut])
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

    if event.status not in [EventStatus.draft, EventStatus.registration]:
        raise BusinessException(
            message="比赛已开始或已结束，无法加入",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # 检查是否已加入
    existing = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.event_id == event.id,
        CompetitionParticipant.user_id == current_user.id,
    ).first()
    if existing:
        raise BusinessException(
            message="您已经加入了这场比赛",
            code=ErrorCode.DUPLICATE_ENTRY,
            status_code=status.HTTP_409_CONFLICT,
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
        current_city=config.get("cities", ["jingcheng"])[0] if config.get("cities") else "jingcheng",
        total_assets=initial_capital,
    )
    db.add(participant)

    # 如果是第一个参与者，将比赛状态改为报名中
    if event.status == EventStatus.draft:
        event.status = EventStatus.registration

    db.commit()
    db.refresh(participant)

    return ApiResponse.ok(data=_participant_to_out(participant, db))


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
    profile = _get_organizer_profile(current_user.id, db)

    # 生成唯一的房间码
    room_code = generate_room_code()
    for _ in range(100):
        existing = db.query(CompetitionEvent).filter(CompetitionEvent.room_code == room_code).first()
        if not existing:
            break
        room_code = generate_room_code()
    else:
        raise BusinessException(
            message="房间码生成失败，请重试",
            code=ErrorCode.INTERNAL_ERROR,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    config_dict = data.config.model_dump() if data.config else {}

    event = CompetitionEvent(
        organizer_id=profile.id,
        room_code=room_code,
        title=data.title,
        description=data.description,
        game_type=GameType(data.game_type) if data.game_type else GameType.trading,
        status=EventStatus.draft,
        config=config_dict,
        max_players=data.max_players,
        current_round=0,
    )
    db.add(event)
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

    if event.status != EventStatus.registration:
        raise BusinessException(
            message="比赛不在报名状态，无法开始",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # 检查是否有参赛者
    participant_count = db.query(func.count(CompetitionParticipant.id)).filter(
        CompetitionParticipant.event_id == event.id
    ).scalar()
    if participant_count < 1:
        raise BusinessException(
            message="至少需要1名参赛者才能开始",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # 更新状态
    event.status = EventStatus.playing
    event.current_round = 1
    event.starts_at = func.now()

    # 初始化第1回合
    config = event.config or {}
    cities = config.get("cities", list(CITIES.keys()))
    products = config.get("products", list(PRODUCTS.keys()))
    product_dict = {k: v for k, v in PRODUCTS.items() if k in products}

    # 生成初始价格（无供需影响，只有城市和随机因素）
    initial_prices = calculate_prices(product_dict, cities, [], [], 0)

    first_round = TradingRound(
        event_id=event.id,
        round_number=1,
        status=RoundStatus.active,
        events=generate_random_events(1, cities, product_dict),
        price_snapshot=initial_prices,
    )
    db.add(first_round)

    # 保存价格记录
    for city_key, city_prices in initial_prices.items():
        for pid, price in city_prices.items():
            db.add(TradingPrice(
                event_id=event.id,
                round_id=first_round.id,
                city=city_key,
                product_id=pid,
                base_price=PRODUCTS[pid]["base_price"],
                final_price=price,
            ))

    # 更新所有参赛者为playing状态
    participants = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.event_id == event.id
    ).all()
    for p in participants:
        p.status = ParticipantStatus.playing

    db.commit()
    db.refresh(event)
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

    # 计算最终排名
    participants = db.query(CompetitionParticipant).filter(
        CompetitionParticipant.event_id == event.id
    ).order_by(CompetitionParticipant.total_assets.desc()).all()

    total = len(participants)
    for rank, p in enumerate(participants, 1):
        p.final_rank = rank
        p.status = ParticipantStatus.joined  # 恢复为joined表示已完成

        # 计算经验值
        exp = 100  # 参与奖
        if rank <= total * 0.5:
            exp += 100
        if rank <= total * 0.2:
            exp += 200
        if rank == 1:
            exp += 500

        p.experience_earned = exp

        # 更新用户总经验值
        user = p.user
        user.experience += exp
        # 简单等级计算：每1000经验升1级
        new_level = max(1, user.experience // 1000 + 1)
        if new_level > user.level:
            user.level = new_level

    # 更新组织者统计
    profile.total_events_hosted += 1
    profile.total_participants += total

    event.status = EventStatus.finished
    event.ends_at = func.now()
    event.current_round = event.config.get("rounds", 10) if event.config else 10

    db.commit()
    db.refresh(event)
    return ApiResponse.ok(data=_event_to_out(event, db))


# ============== 辅助函数 ==============

def _participant_to_out(participant: CompetitionParticipant, db: Session) -> ParticipantOut:
    """将ORM转为输出schema"""
    user = participant.user
    return ParticipantOut(
        id=participant.id,
        event_id=participant.event_id,
        user_id=participant.user_id,
        username=user.username,
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


def _calc_inventory_value(inventory: dict, event_id: int, db: Session) -> float:
    """计算库存当前价值"""
    if not inventory:
        return 0.0

    # 获取最新回合的价格
    latest_round = db.query(TradingRound).filter(
        TradingRound.event_id == event_id
    ).order_by(TradingRound.round_number.desc()).first()

    if not latest_round or not latest_round.price_snapshot:
        return 0.0

    prices = latest_round.price_snapshot
    total = 0.0
    for pid, qty in inventory.items():
        # 取第一个城市的价格作为估值基准
        for city_prices in prices.values():
            if pid in city_prices:
                total += city_prices[pid] * qty
                break

    return total
