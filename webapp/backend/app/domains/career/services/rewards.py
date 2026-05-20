"""比赛结束 XP 发放 — 正式赛 / 日常练习分流"""

from typing import List, Optional

from sqlalchemy.orm import Session

from app.domains.arena.enums import MatchKind
from app.domains.arena.models import ArenaMatch, ArenaParticipant
from app.domains.career.models.xp_event import XpEvent
from app.domains.cybercore.registry import get_game_config
from app.domains.cybercore.types import RewardTier
from app.models.user import User


def _tier_for_match(match: ArenaMatch) -> RewardTier:
    doc = get_game_config(match.game_config_id)
    key = match.match_kind.value
    tier = doc.rewards.get(key)
    if tier is None:
        tier = doc.rewards.get("official") or RewardTier()
    if isinstance(tier, dict):
        return RewardTier.model_validate(tier)
    return tier


def _rank_exp(rank: int, total: int, tier: RewardTier) -> int:
    exp = tier.participate
    if total > 0 and rank <= total * 0.5:
        exp += tier.top50_bonus
    if total > 0 and rank <= total * 0.2:
        exp += tier.top20_bonus
    if rank == 1:
        exp += tier.first_place_bonus
    return exp


def grant_xp(
    db: Session,
    *,
    user_id: int,
    amount: int,
    match_kind: MatchKind,
    source: str,
    idempotency_key: str,
    match_id: Optional[int] = None,
    meta: Optional[str] = None,
) -> Optional[XpEvent]:
    if amount <= 0:
        return None
    existing = db.query(XpEvent).filter(XpEvent.idempotency_key == idempotency_key).first()
    if existing:
        return existing

    event = XpEvent(
        user_id=user_id,
        match_id=match_id,
        match_kind=match_kind,
        source=source,
        amount=amount,
        idempotency_key=idempotency_key,
        meta=meta,
    )
    db.add(event)

    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.experience += amount
        user.level = max(1, user.experience // 1000 + 1)

    return event


def settle_match_rewards(
    db: Session,
    match: ArenaMatch,
    participants: List[ArenaParticipant],
) -> None:
    """按排名为真人参赛者发放 XP（写入 xp_events + user.experience）"""
    tier = _tier_for_match(match)
    total = len([p for p in participants if not p.is_ai])

    ranked = sorted(participants, key=lambda p: p.total_assets, reverse=True)
    human_rank = 0
    for p in ranked:
        if p.is_ai:
            continue
        human_rank += 1
        exp = _rank_exp(human_rank, total, tier)
        p.experience_earned = exp
        grant_xp(
            db,
            user_id=p.user_id,
            amount=exp,
            match_kind=match.match_kind,
            source="match.finish",
            idempotency_key=f"match:{match.id}:user:{p.user_id}:finish",
            match_id=match.id,
            meta=f"rank={human_rank}",
        )
