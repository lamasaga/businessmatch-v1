"""比赛结束奖励发放 — XP / 金币 / 钻石"""

from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.domains.arena.enums import GameEngineId, MatchKind
from app.domains.arena.models import ArenaMatch, ArenaParticipant, ArenaTeam
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


def _finish_idempotency_key(match_id: int, user_id: int) -> str:
    return f"match:{match_id}:user:{user_id}:finish"


def sync_participants_for_settlement(
    db: Session,
    match: ArenaMatch,
    participants: List[ArenaParticipant],
) -> List[ArenaParticipant]:
    """将队伍制引擎终局资产/名次写回 ArenaParticipant，供生涯结算使用。"""
    engine = match.game_type

    if engine == GameEngineId.techventure:
        from app.games.techventure.models import TvTeamState

        states = {
            s.team_id: s
            for s in db.query(TvTeamState).filter(TvTeamState.event_id == match.id).all()
        }
        team_ids = sorted(
            states.keys(),
            key=lambda tid: float(states[tid].weighted_total or 0),
            reverse=True,
        )
        rank_map = {tid: i + 1 for i, tid in enumerate(team_ids)}
        teams = {
            t.id: t
            for t in db.query(ArenaTeam).filter(ArenaTeam.event_id == match.id).all()
        }
        for p in participants:
            if not p.team_id or p.team_id not in states:
                continue
            st = states[p.team_id]
            p.total_assets = float(st.weighted_total or 0)
            rank = rank_map.get(p.team_id)
            if rank:
                p.final_rank = rank
                team = teams.get(p.team_id)
                if team:
                    team.final_rank = rank

    elif engine == GameEngineId.ops_sim:
        from app.games.ops_sim.models import OpsTeamState
        from app.games.ops_sim.settle import final_ranking

        ranking = final_ranking(db, match)
        rank_map = {row["team_id"]: row["rank"] for row in ranking}
        assets_map = {row["team_id"]: float(row["net_assets"] or 0) for row in ranking}
        teams = {
            t.id: t
            for t in db.query(ArenaTeam).filter(ArenaTeam.event_id == match.id).all()
        }
        for p in participants:
            if not p.team_id:
                continue
            if p.team_id in assets_map:
                p.total_assets = assets_map[p.team_id]
            rank = rank_map.get(p.team_id)
            if rank:
                p.final_rank = rank
                team = teams.get(p.team_id)
                if team:
                    team.final_rank = rank

    db.flush()
    return participants


def finalize_match_rewards(
    db: Session,
    match: ArenaMatch,
    participants: Optional[List[ArenaParticipant]] = None,
) -> None:
    """同步终局数据并发放 XP / 金币 / 钻石（三引擎统一入口）。"""
    if participants is None:
        participants = (
            db.query(ArenaParticipant)
            .filter(ArenaParticipant.event_id == match.id)
            .all()
        )
    synced = sync_participants_for_settlement(db, match, participants)
    settle_match_rewards(db, match, synced)


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

        finish_key = _finish_idempotency_key(match.id, p.user_id)
        if db.query(XpEvent).filter(XpEvent.idempotency_key == finish_key).first():
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
            idempotency_key=finish_key,
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
