"""生涯路由 — Career Hub 聚合读取"""

import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, PaginationParams
from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.db.database import get_db
from app.domains.arena.models.match import ArenaMatch
from app.domains.arena.models.participant import ArenaParticipant
from app.domains.career.models.career_profile import CareerProfile
from app.domains.career.models.xp_event import XpEvent
from app.models.user import User

router = APIRouter(prefix="/career", tags=["生涯模式"])


# ─────────────────────────────────────────────────────────────────────────────
# 辅助函数
# ─────────────────────────────────────────────────────────────────────────────

def _ensure_career_profile(db: Session, user_id: int) -> CareerProfile:
    """确保用户有生涯档案；无则创建"""
    profile = db.query(CareerProfile).filter(CareerProfile.user_id == user_id).first()
    if profile is None:
        profile = CareerProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def _parse_json_safe(value: Optional[str], default: Any) -> Any:
    """安全解析 JSON 字符串"""
    if not value:
        return default
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return default


def _format_dt(dt: Optional[datetime]) -> Optional[str]:
    """将 datetime 格式化为 ISO 8601 字符串"""
    if dt is None:
        return None
    return dt.isoformat()


def _recent_xp_stats(db: Session, user_id: int) -> Dict[str, int]:
    """近 7 天 XP 获取统计"""
    since = datetime.utcnow() - timedelta(days=7)
    total = (
        db.query(func.coalesce(func.sum(XpEvent.amount), 0))
        .filter(XpEvent.user_id == user_id, XpEvent.created_at >= since)
        .scalar()
    )
    match_count = (
        db.query(func.count(func.distinct(XpEvent.match_id)))
        .filter(XpEvent.user_id == user_id, XpEvent.created_at >= since)
        .scalar()
    )
    return {
        "total_earned_7d": int(total or 0),
        "total_matches_7d": int(match_count or 0),
    }


def _match_stats(db: Session, user_id: int) -> Dict[str, int]:
    """用户比赛统计"""
    total_matches = (
        db.query(func.count(ArenaParticipant.id))
        .filter(ArenaParticipant.user_id == user_id, ArenaParticipant.is_ai == 0)
        .scalar()
    )
    practice_count = (
        db.query(func.count(ArenaParticipant.id))
        .join(ArenaMatch, ArenaParticipant.event_id == ArenaMatch.id)
        .filter(
            ArenaParticipant.user_id == user_id,
            ArenaParticipant.is_ai == 0,
            ArenaMatch.match_kind == "practice",
        )
        .scalar()
    )
    official_count = (
        db.query(func.count(ArenaParticipant.id))
        .join(ArenaMatch, ArenaParticipant.event_id == ArenaMatch.id)
        .filter(
            ArenaParticipant.user_id == user_id,
            ArenaParticipant.is_ai == 0,
            ArenaMatch.match_kind == "official",
        )
        .scalar()
    )
    return {
        "total_matches": int(total_matches or 0),
        "practice_count": int(practice_count or 0),
        "official_count": int(official_count or 0),
    }


# ─────────────────────────────────────────────────────────────────────────────
# API 路由
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/start", response_model=ApiResponse[dict])
def start_career(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """首次开启生涯模式；幂等"""
    profile = _ensure_career_profile(db, current_user.id)
    return ApiResponse.ok(
        data={
            "profile_id": profile.id,
            "user_id": profile.user_id,
            "title": profile.title,
            "season_id": profile.season_id,
            "started_at": _format_dt(profile.started_at),
        },
        message="生涯模式已开启",
    )


@router.get("/profile", response_model=ApiResponse[dict])
def get_career_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """读取生涯聚合数据"""
    profile = _ensure_career_profile(db, current_user.id)
    radar = _parse_json_safe(
        profile.competency_json,
        {"financial": 50, "marketing": 50, "strategic": 50, "collaborative": 50, "ethical": 50},
    )
    homestead = _parse_json_safe(
        profile.homestead_json,
        {"unlocked_slots": 0, "total_slots": 5},
    )

    recent_stats = _recent_xp_stats(db, current_user.id)
    stats = _match_stats(db, current_user.id)
    stats["total_xp_earned"] = current_user.experience

    return ApiResponse.ok(
        data={
            "user": {
                "id": current_user.id,
                "username": current_user.username,
                "avatar": current_user.avatar,
                "level": current_user.level,
                "experience": current_user.experience,
                "next_level_xp": current_user.level * 1000,
                "gold": current_user.gold,
                "diamond": current_user.diamond,
            },
            "profile": {
                "title": profile.title,
                "season": profile.season_id,
                "is_started": bool(profile.is_started),
                "started_at": _format_dt(profile.started_at),
            },
            "radar": radar,
            "resources": {
                "gold_total_earned": current_user.gold,
                "diamond_total_earned": current_user.diamond,
                **recent_stats,
            },
            "homestead": {
                **homestead,
                "status": "locked",
                "unlock_hint": "B2 阶段开放家园系统",
            },
            "stats": stats,
        }
    )


@router.get("/recent-matches", response_model=ApiResponse[List[dict]])
def get_recent_matches(
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """近期比赛列表（含获得 XP/金币/钻石）"""
    rows = (
        db.query(ArenaParticipant, ArenaMatch)
        .join(ArenaMatch, ArenaParticipant.event_id == ArenaMatch.id)
        .filter(
            ArenaParticipant.user_id == current_user.id,
            ArenaParticipant.is_ai == 0,
        )
        .order_by(ArenaParticipant.joined_at.desc())
        .limit(limit)
        .all()
    )

    match_ids = [match.id for _, match in rows]
    xp_map: Dict[int, int] = {}
    if match_ids:
        xp_rows = (
            db.query(XpEvent.match_id, XpEvent.amount)
            .filter(
                XpEvent.user_id == current_user.id,
                XpEvent.match_id.in_(match_ids),
            )
            .all()
        )
        xp_map = {row.match_id: row.amount for row in xp_rows}

    # 当前阶段：金币/钻石不记录单条明细，按经验规则反推展示
    # 实际发放金额 = base * rank_bonus，简化展示时读取 participant.experience_earned 作为 XP
    # 金币/钻石从 xp_events 不可直接获取，展示基于规则的计算值
    from app.domains.career.services.rewards import _calc_gold, _calc_diamond

    data: List[dict] = []
    for participant, match in rows:
        rank = participant.final_rank or 0
        match_kind_value = match.match_kind.value if match.match_kind else "official"
        xp_earned = xp_map.get(match.id, participant.experience_earned or 0)
        gold_earned = _calc_gold(match_kind_value, rank) if rank > 0 else 0
        diamond_earned = _calc_diamond(match_kind_value) if rank > 0 else 0

        data.append(
            {
                "match_id": match.id,
                "match_title": match.title or f"商赛 #{match.id}",
                "match_kind": match_kind_value,
                "game_config_id": match.game_config_id,
                "finished_at": _format_dt(match.ends_at),
                "final_rank": rank,
                "total_participants": match.max_players,
                "xp_earned": xp_earned,
                "gold_earned": gold_earned,
                "diamond_earned": diamond_earned,
                "total_assets": participant.total_assets,
            }
        )

    return ApiResponse.ok(data=data)


@router.get("/matches/{match_id}/debrief", response_model=ApiResponse[dict])
def get_match_debrief(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """规则模板赛后复盘（Phase A：零 LLM）"""
    match = db.query(ArenaMatch).filter(ArenaMatch.id == match_id).first()
    if not match:
        raise BusinessException(
            message="比赛不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    participant = (
        db.query(ArenaParticipant)
        .filter(
            ArenaParticipant.event_id == match_id,
            ArenaParticipant.user_id == current_user.id,
            ArenaParticipant.is_ai == 0,
        )
        .first()
    )
    if not participant:
        raise BusinessException(
            message="您未参与该场比赛",
            code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    rank = int(participant.final_rank or 0)
    total = int(match.max_players or 0)
    match_kind_value = match.match_kind.value if match.match_kind else "practice"
    xp_row = (
        db.query(XpEvent.amount)
        .filter(XpEvent.user_id == current_user.id, XpEvent.match_id == match_id)
        .first()
    )
    xp_earned = int(xp_row[0]) if xp_row else int(participant.experience_earned or 0)
    from app.domains.career.services.rewards import _calc_gold, _calc_diamond

    gold_earned = _calc_gold(match_kind_value, rank) if rank > 0 else 0
    diamond_earned = _calc_diamond(match_kind_value) if rank > 0 else 0

    kind_label = "练习局" if match_kind_value == "practice" else "正式赛"
    if rank == 1:
        narrative = f"你在本场{kind_label}中夺得冠军，总资产 ¥{int(participant.total_assets or 0):,}，决策节奏与仓位管理表现突出。"
    elif rank > 0 and total > 0 and rank <= max(1, total // 2):
        narrative = f"你本场{kind_label}排名第 {rank}，处于上游梯队；可复盘高毛利路线与周转效率。"
    elif rank > 0:
        narrative = f"你本场{kind_label}排名第 {rank}，仍有提升空间；建议关注跨城套利与库存周转。"
    else:
        narrative = f"本场{kind_label}已结束；完赛数据已入账，可结合资产变化回顾关键决策。"

    facts = [
        f"赛制：{match.game_config_id or '未知'} · {kind_label}",
        f"名次：{rank or '—'} / {total or '—'}",
        f"终局总资产：¥{int(participant.total_assets or 0):,}",
        f"经验 +{xp_earned} · 金币 +{gold_earned} · 钻石 +{diamond_earned}",
    ]

    suggestions = []
    if match_kind_value == "practice":
        suggestions.append("尝试在正式赛中验证今日练出的路线。")
    if rank and rank > 3:
        suggestions.append("优先复盘「买入城市 / 卖出城市」与在途时间。")
    suggestions.append("前往商赛大厅继续练习或加入教师房间码对局。")

    return ApiResponse.ok(
        data={
            "match_id": match_id,
            "match_title": match.title or f"商赛 #{match_id}",
            "match_kind": match_kind_value,
            "rank": rank,
            "total_teams": total,
            "narrative": narrative,
            "facts": facts,
            "suggestions": suggestions,
            "rewards": {
                "xp": xp_earned,
                "gold": gold_earned,
                "diamond": diamond_earned,
            },
        }
    )
