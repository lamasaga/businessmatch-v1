"""日常练习 — 单人独立商赛（practice + AI 对手占位）"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user
from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.db.database import get_db
from app.domains.arena.enums import DesignMode, GameEngineId, MatchKind, MatchStatus
from app.domains.arena.models import ArenaMatch, OrganizerProfile
from app.domains.arena.services.match_factory import create_practice_match
from app.domains.arena.services.match_lifecycle import begin_match
from app.domains.cybercore.registry import get_game_config, list_game_configs
from app.models.user import User
from app.domains.arena.serializers import event_to_out
from app.schemas.trading_competition import CompetitionEventOut, PracticeStartRequest

router = APIRouter(prefix="/practice", tags=["日常练习"])


def _platform_organizer(db: Session) -> OrganizerProfile:
    """日常练习场次挂靠平台组织者（与演示 admin 组织者共用档案）"""
    profile = db.query(OrganizerProfile).first()
    if not profile:
        raise BusinessException(
            message="组织者档案未初始化，请重启后端",
            code=ErrorCode.INTERNAL_ERROR,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    return profile


@router.get("/game-configs", response_model=ApiResponse[list])
def list_configs():
    return ApiResponse.ok(data=list_game_configs())


@router.post("/trading/start", response_model=ApiResponse[CompetitionEventOut], status_code=status.HTTP_201_CREATED)
def start_trading_practice(
    data: PracticeStartRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """创建并自动开始一场交易赛日常练习（单人，低权重 XP）"""
    config_id = data.game_config_id or "trading-v1"
    doc = get_game_config(config_id)
    if doc.engine != GameEngineId.trading.value:
        raise BusinessException(
            message="该配置非交易引擎，请使用对应练习接口",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    design = DesignMode(data.design_mode) if data.design_mode else DesignMode.standalone
    platform = _platform_organizer(db)
    overrides = data.config.model_dump() if data.config else {}
    if data.practice_ai_slots:
        overrides["practice_ai_slots"] = data.practice_ai_slots

    match, _participant = create_practice_match(
        db,
        platform_organizer=platform,
        user_id=current_user.id,
        game_config_id=config_id,
        design_mode=design,
        title=data.title,
        config_overrides=overrides,
    )
    begin_match(db, match)
    db.commit()
    db.refresh(match)
    from app.games.trading.rts_config import is_rts_mode
    from app.games.trading.rts_scheduler import start_rts_scheduler

    if is_rts_mode(match.config):
        start_rts_scheduler(match.id)
    return ApiResponse.ok(data=event_to_out(match, db))


@router.post("/techventure/start", response_model=ApiResponse[dict], status_code=status.HTTP_201_CREATED)
def start_techventure_practice(
    data: PracticeStartRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """创建并自动开始一场 TechVenture 日常练习（单人 + AI 队伍）"""
    config_id = data.game_config_id or "techventure-v1"
    doc = get_game_config(config_id)
    if doc.engine != GameEngineId.techventure.value:
        raise BusinessException(
            message="该配置非 TechVenture 引擎",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    from app.games.techventure.config import CITY_IDS, get_cfg
    from app.domains.arena.models.team import ArenaTeam
    from app.games.techventure.models import TvTeamState, TvRound
    from app.games.techventure.enums import TvRoundStatus, TvEventId, StrategyRoute
    from app.domains.arena.models.participant import ArenaParticipant
    from datetime import datetime, timezone

    cfg = get_cfg(config_id)
    defaults = cfg.get("defaults", {})
    seed = defaults.get("seed_budget", 100)
    a_init = defaults.get("a_init", 2.0)
    ai_count = int(defaults.get("practice_ai_count", 5))
    home_city = CITY_IDS[0]

    platform = _platform_organizer(db)
    config = doc.merged_match_config(data.config.model_dump() if data.config else {})

    match = ArenaMatch(
        organizer_id=platform.id,
        room_code="",
        title=data.title or f"日常练习 · {doc.meta.get('name', config_id)}",
        description="TechVenture 练习：AI 队伍与你共同竞技",
        match_kind=MatchKind.practice,
        design_mode=DesignMode.standalone,
        game_config_id=config_id,
        game_type=GameEngineId.techventure,
        status=MatchStatus.playing,
        config=config,
        max_players=50,
        current_round=0,
    )
    db.add(match)
    db.flush()

    from app.domains.arena.utils import generate_room_code
    match.room_code = generate_room_code()

    # 玩家队伍
    player_team = ArenaTeam(event_id=match.id, team_name=current_user.username + "的队伍", is_ai=0)
    db.add(player_team)
    db.flush()
    player_state = TvTeamState(
        team_id=player_team.id, event_id=match.id,
        route=StrategyRoute.TECH, home_city=home_city, opened_cities=[home_city],
        tech=a_init, fit_by_city={c: a_init for c in CITY_IDS},
        show_by_city={c: a_init for c in CITY_IDS}, budget=seed,
    )
    db.add(player_state)

    player_part = ArenaParticipant(
        event_id=match.id, user_id=current_user.id, is_ai=0,
        team_id=player_team.id,
    )
    db.add(player_part)

    # AI 队伍
    ai_names = ["星辰科技", "云端创新", "数智先锋", "破晓创投", "信达科技",
                "瀚海智能", "晨曦互联", "锐进数据", "融通未来", "启明创科"]
    from app.games.trading.bot_users import ensure_bot_traders
    bots = ensure_bot_traders(db)
    for i in range(min(ai_count, len(bots))):
        ai_team = ArenaTeam(
            event_id=match.id,
            team_name=ai_names[i % len(ai_names)],
            is_ai=1,
            metadata_={"product_name": f"AI产品{i+1}号"},
        )
        db.add(ai_team)
        db.flush()
        ai_state = TvTeamState(
            team_id=ai_team.id, event_id=match.id,
            route=StrategyRoute(["TECH", "USER", "BRAND", "PATHFINDER"][i % 4]),
            home_city=home_city, opened_cities=[home_city],
            tech=a_init, fit_by_city={c: a_init for c in CITY_IDS},
            show_by_city={c: a_init for c in CITY_IDS}, budget=seed,
        )
        db.add(ai_state)
        ai_part = ArenaParticipant(
            event_id=match.id, user_id=bots[i].id, is_ai=1,
            team_id=ai_team.id,
        )
        db.add(ai_part)

    # 自动开第一轮
    first_round = TvRound(
        event_id=match.id, round_no=1, status=TvRoundStatus.open,
        event_id_r3=TvEventId.none, opened_at=datetime.now(timezone.utc),
    )
    db.add(first_round)

    db.commit()
    db.refresh(match)
    return ApiResponse.ok(data={"event_id": match.id, "team_id": player_team.id, "round_no": 1})


@router.get("/my", response_model=ApiResponse[list])
def my_practice_matches(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    from app.domains.arena.models import ArenaParticipant

    event_ids = [
        row[0]
        for row in db.query(ArenaParticipant.event_id)
        .filter(ArenaParticipant.user_id == current_user.id)
        .all()
    ]
    if not event_ids:
        return ApiResponse.ok(data=[])

    matches = (
        db.query(ArenaMatch)
        .filter(
            ArenaMatch.id.in_(event_ids),
            ArenaMatch.match_kind == MatchKind.practice,
        )
        .order_by(ArenaMatch.created_at.desc())
        .limit(20)
        .all()
    )
    return ApiResponse.ok(data=[event_to_out(m, db) for m in matches])
