"""场次生命周期 — 开赛、首回合初始化（正式赛 / 练习赛共用）"""

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.domains.arena.enums import MatchStatus, ParticipantStatus
from app.domains.arena.models import ArenaMatch, ArenaParticipant
from app.games.trading.round_advance import create_first_round
from app.games.trading.rts_config import is_rts_mode
from app.games.trading.rts_tick import create_rts_first_round
from app.core.response import BusinessException, ErrorCode
from fastapi import status


def begin_match(db: Session, event: ArenaMatch) -> ArenaMatch:
    """将场次从报名态推进为进行中，并创建第 1 回合。"""
    if event.status not in (MatchStatus.registration, MatchStatus.draft):
        raise BusinessException(
            message="比赛不在可开始状态",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    participant_count = (
        db.query(ArenaParticipant)
        .filter(ArenaParticipant.event_id == event.id)
        .count()
    )
    if participant_count < 1:
        raise BusinessException(
            message="至少需要1名参赛者才能开始",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    event.status = MatchStatus.playing
    event.current_round = 0
    event.starts_at = func.now()

    if is_rts_mode(event.config):
        create_rts_first_round(db, event)
    else:
        event.current_round = 1
        create_first_round(db, event)

    participants = (
        db.query(ArenaParticipant)
        .filter(ArenaParticipant.event_id == event.id)
        .all()
    )
    for p in participants:
        p.status = ParticipantStatus.playing

    return event
