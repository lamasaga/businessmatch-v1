"""练习局 — 人类决策后 AI 行动并自动推进回合"""

from sqlalchemy.orm import Session

from app.domains.arena.enums import MatchKind
from app.domains.arena.models import ArenaMatch
from app.games.trading.models import TradingDecision, TradingRound
from app.domains.arena.models import ArenaParticipant
from app.games.trading.enums import RoundStatus
from app.games.trading.ai_trader import run_ai_round_decisions
from app.games.trading.rts_config import is_rts_mode
from app.games.trading.round_advance import advance_to_next_round


def _count_decisions(db: Session, round_id: int) -> int:
    return db.query(TradingDecision).filter(TradingDecision.round_id == round_id).count()


def _count_participants(db: Session, event_id: int) -> int:
    return db.query(ArenaParticipant).filter(ArenaParticipant.event_id == event_id).count()


def try_advance_practice_round(
    db: Session,
    event: ArenaMatch,
    round_obj: TradingRound,
) -> tuple[bool, bool]:
    """
    练习局：补全 AI 决策并在全员就绪时推进下一回合。
    返回 (是否推进了回合, 比赛是否已结束)。
    """
    if event.match_kind != MatchKind.practice:
        return False, False
    # RTS 练习局由 rts_tick + rts_ai 驱动，勿走回合制 AI
    if is_rts_mode(event.config):
        return False, False
    if round_obj.status != RoundStatus.active:
        return False, event.status.value == "finished"

    run_ai_round_decisions(db, round_obj, event)
    db.flush()

    total = _count_participants(db, event.id)
    decided = _count_decisions(db, round_obj.id)
    if decided < total:
        return False, False

    _, finished = advance_to_next_round(db, event, round_obj)
    return True, finished


def settle_practice_if_finished(db: Session, event: ArenaMatch) -> None:
    if event.status.value != "finished":
        return
    from app.domains.career.services.rewards import settle_match_rewards

    participants = (
        db.query(ArenaParticipant)
        .filter(ArenaParticipant.event_id == event.id)
        .all()
    )
    settle_match_rewards(db, event, participants)
