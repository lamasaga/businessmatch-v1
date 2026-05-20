"""创建 Arena 场次 — 正式赛 / 日常练习共用工厂"""

from typing import Optional

from sqlalchemy.orm import Session

from app.domains.arena.enums import DesignMode, GameEngineId, MatchKind, MatchStatus
from app.domains.arena.models import ArenaMatch, ArenaParticipant, OrganizerProfile
from app.domains.arena.utils import generate_room_code
from app.domains.cybercore.registry import get_game_config
from app.games.trading.bot_users import ensure_bot_traders


def _unique_room_code(db: Session) -> str:
    for _ in range(100):
        code = generate_room_code()
        if not db.query(ArenaMatch).filter(ArenaMatch.room_code == code).first():
            return code
    raise RuntimeError("room code generation failed")


def create_official_match(
    db: Session,
    *,
    organizer: OrganizerProfile,
    title: str,
    description: Optional[str],
    game_config_id: str,
    design_mode: DesignMode,
    max_players: int,
    config_overrides: Optional[dict] = None,
) -> ArenaMatch:
    doc = get_game_config(game_config_id)
    engine = GameEngineId(doc.engine)
    config = doc.merged_match_config(config_overrides)

    match = ArenaMatch(
        organizer_id=organizer.id,
        room_code=_unique_room_code(db),
        title=title,
        description=description,
        match_kind=MatchKind.official,
        design_mode=design_mode,
        game_config_id=game_config_id,
        game_type=engine,
        status=MatchStatus.registration,
        config=config,
        max_players=max_players,
        current_round=0,
    )
    db.add(match)
    db.flush()
    return match


def create_practice_match(
    db: Session,
    *,
    platform_organizer: OrganizerProfile,
    user_id: int,
    game_config_id: str = "trading-v1",
    design_mode: DesignMode = DesignMode.standalone,
    title: Optional[str] = None,
    config_overrides: Optional[dict] = None,
) -> tuple[ArenaMatch, ArenaParticipant]:
    doc = get_game_config(game_config_id)
    engine = GameEngineId(doc.engine)
    config = doc.merged_match_config(config_overrides)
    initial_capital = config.get("initial_capital", 50000)
    start_city = config.get("cities", ["jingcheng"])[0]
    ai_count = int(config.get("practice_ai_count", 3))

    match = ArenaMatch(
        organizer_id=platform_organizer.id,
        room_code=_unique_room_code(db),
        title=title or f"日常练习 · {doc.meta.get('name', game_config_id)}",
        description="商战练习：AI 交易员与你共同驱动各城市场",
        match_kind=MatchKind.practice,
        design_mode=design_mode,
        game_config_id=game_config_id,
        game_type=engine,
        status=MatchStatus.registration,
        config=config,
        max_players=1 + ai_count,
        current_round=0,
    )
    db.add(match)
    db.flush()

    participant = ArenaParticipant(
        event_id=match.id,
        user_id=user_id,
        is_ai=0,
        cash=float(initial_capital),
        inventory={},
        current_city=start_city,
        total_assets=float(initial_capital),
    )
    db.add(participant)

    bots = ensure_bot_traders(db)
    import random
    from app.domains.arena.config_json import persist_match_config
    from app.games.trading.rts_config import is_rts_mode
    from app.games.trading.rts_ai_levels import init_ai_player_levels, normalize_ai_slots

    bot_cities = list(config.get("cities", [start_city]))
    ai_slots = normalize_ai_slots(config, ai_count)
    bot_participant_ids: list[int] = []

    for bot in bots[:ai_count]:
        bp = ArenaParticipant(
            event_id=match.id,
            user_id=bot.id,
            is_ai=1,
            cash=float(initial_capital),
            inventory={},
            current_city=random.choice(bot_cities),
            total_assets=float(initial_capital),
        )
        db.add(bp)
        db.flush()
        bot_participant_ids.append(bp.id)

    if is_rts_mode(config):
        init_ai_player_levels(config, bot_participant_ids, ai_slots)
        persist_match_config(match, config)

    db.flush()
    return match, participant
