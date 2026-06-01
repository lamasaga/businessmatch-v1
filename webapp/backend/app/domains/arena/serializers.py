"""Arena 输出序列化"""

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.domains.arena.models import ArenaMatch, ArenaParticipant
from app.schemas.trading_competition import CompetitionEventOut


def event_to_out(event: ArenaMatch, db: Session) -> CompetitionEventOut:
    participant_count = db.query(func.count(ArenaParticipant.id)).filter(
        ArenaParticipant.event_id == event.id
    ).scalar()
    data = {
        "id": event.id,
        "organizer_id": event.organizer_id,
        "teaching_group_id": event.teaching_group_id,
        "room_code": event.room_code,
        "title": event.title,
        "description": event.description,
        "match_kind": event.match_kind.value if event.match_kind else "official",
        "design_mode": event.design_mode.value if event.design_mode else "standalone",
        "game_config_id": event.game_config_id or "fstrading",
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
