"""比赛结束奖励发放 — XP / 金币 / 钻石"""

from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.domains.arena.enums import MatchKind
from app.domains.arena.models import ArenaMatch, ArenaParticipant
from app.domains.career.models.xp_event import XpEvent
from app.domains.cybercore.registry import get_game_config
from app.domains.cybercore.types import RewardTier
from app.models.user import User


# Phase A 硬编码资源常量（B2 迁移至 economy.yaml）
# 当前 MatchKind 枚举仅支持 official / practice；t2/t1 区分在后续 match_kind 扩展时启用
_REWARD_CONSTANTS: Dict[str, Dict[str, int]] = {
    "practice": {"gold": 30, "diamond": 0},
    "official": {"gold": 100, "diamond": 2},
}

_RANK_BONUS_GOLD: Dict[int, float] = {
    1: 1.5,
    2: 1.25,
    3: 1.1,
}


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


def _calc_gold(match_kind: str, rank: int) -> int:
    """根据比赛类型和排名计算金币奖励"""
    base = _REWARD_CONSTANTS.get(match_kind, {"gold": 0, "diamond": 0})["gold"]
    multiplier = _RANK_BONUS_GOLD.get(rank, 1.0)
    return int(base * multiplier)


def _calc_diamond(match_kind: str) -> int:
    """根据比赛类型计算钻石奖励（固定，不随排名变化）"""
    return _REWARD_CONSTANTS.get(match_kind, {"gold": 0, "diamond": 0})["diamond"]


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


def _grant_resource(
    db: Session,
    *,
    user_id: int,
    gold: int = 0,
    diamond: int = 0,
) -> None:
    """发放金币和钻石到用户余额"""
    if gold <= 0 and diamond <= 0:
        return
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return
    if gold > 0:
        user.gold += gold
    if diamond > 0:
        user.diamond += diamond


def settle_match_rewards(
    db: Session,
    match: ArenaMatch,
    participants: List[ArenaParticipant],
) -> None:
    """按排名为真人参赛者发放 XP、金币、钻石"""
    tier = _tier_for_match(match)
    total = len([p for p in participants if not p.is_ai])

    ranked = sorted(participants, key=lambda p: p.total_assets, reverse=True)
    human_rank = 0
    for p in ranked:
        if p.is_ai:
            continue
        human_rank += 1

        # 1. XP 发放
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

        # 2. 金币/钻石发放（Phase A 新增）
        match_kind_value = match.match_kind.value
        gold_amount = _calc_gold(match_kind_value, human_rank)
        diamond_amount = _calc_diamond(match_kind_value)
        _grant_resource(
            db,
            user_id=p.user_id,
            gold=gold_amount,
            diamond=diamond_amount,
        )
