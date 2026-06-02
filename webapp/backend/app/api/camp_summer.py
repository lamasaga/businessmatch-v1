"""夏令营扩展 API — 任务、作品、营币、评分、奖项"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.core.response import ApiResponse
from app.models.user import User
from app.domains.arena.models.teaching_group import TeachingGroup, GroupMembership
from app.domains.arena.models.camp_group import CampGroup
from app.domains.arena.models.match import CompetitionEvent
from app.domains.arena.models.camp_summer import (
    CampAgendaItem, CampTask, ScoringDimension,
    TaskSubmission, SubmissionReview,
    CampCoinBalance, CampCoinTransaction, CampCoinRule, CampShopItem,
    CampAward, AwardWinner,
)
from app.schemas.camp_summer import (
    CampAgendaItemCreate, CampAgendaItemOut, CampAgendaItemUpdate,
    CampTaskCreate, CampTaskUpdate, CampTaskOut,
    ScoringDimensionCreate, ScoringDimensionOut,
    TaskSubmissionOut, SubmissionReviewCreate, SubmissionReviewOut,
    CoinGrantRequest, CoinTransactionOut, CoinLeaderboardEntry,
    CampCoinRuleOut, CampCoinRuleUpdate, CampShopItemCreate, CampShopItemOut,
    CampAwardCreate, CampAwardOut, AwardWinnerOut,
    CampDashboardOut,
)

router = APIRouter(prefix="/teaching-groups", tags=["camp-summer"])


def _check_teacher(group_id: int, user: User, db: Session):
    group = db.query(TeachingGroup).filter(TeachingGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="营团不存在")
    if user.role not in ("admin", "teacher") or (user.role == "teacher" and group.teacher_user_id != user.id):
        raise HTTPException(status_code=403, detail="无权操作")
    return group


# ═══════════════════════════════════════════════
# 议程
# ═══════════════════════════════════════════════

@router.get("/{group_id}/agenda", response_model=ApiResponse[List[CampAgendaItemOut]])
def list_agenda(group_id: int, day: Optional[int] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    q = db.query(CampAgendaItem).filter(CampAgendaItem.group_id == group_id)
    if day:
        q = q.filter(CampAgendaItem.day_number == day)
    items = q.order_by(CampAgendaItem.day_number, CampAgendaItem.sort_order).all()
    return ApiResponse.ok(data=items)


@router.post("/{group_id}/agenda", response_model=ApiResponse[CampAgendaItemOut])
def create_agenda(group_id: int, data: CampAgendaItemCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    item = CampAgendaItem(group_id=group_id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return ApiResponse.ok(data=item)


@router.put("/{group_id}/agenda/{item_id}", response_model=ApiResponse[CampAgendaItemOut])
def update_agenda(group_id: int, item_id: int, data: CampAgendaItemUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    item = db.query(CampAgendaItem).filter(CampAgendaItem.id == item_id, CampAgendaItem.group_id == group_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="议程项不存在")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return ApiResponse.ok(data=item)


@router.delete("/{group_id}/agenda/{item_id}", response_model=ApiResponse[dict])
def delete_agenda(group_id: int, item_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    item = db.query(CampAgendaItem).filter(CampAgendaItem.id == item_id, CampAgendaItem.group_id == group_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="议程项不存在")
    db.delete(item)
    db.commit()
    return ApiResponse.ok(data={"success": True})


@router.patch("/{group_id}/agenda/reorder", response_model=ApiResponse[List[CampAgendaItemOut]])
def reorder_agenda(group_id: int, items: List[dict], db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    for entry in items:
        db.query(CampAgendaItem).filter(
            CampAgendaItem.id == entry["id"], CampAgendaItem.group_id == group_id
        ).update({"sort_order": entry["sort_order"]})
    db.commit()
    return list_agenda(group_id, db=db, user=user)


# ═══════════════════════════════════════════════
# 任务
# ═══════════════════════════════════════════════

@router.get("/{group_id}/tasks", response_model=ApiResponse[List[CampTaskOut]])
def list_tasks(group_id: int, status: Optional[str] = None, day: Optional[int] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    q = db.query(CampTask).filter(CampTask.group_id == group_id)
    if status:
        q = q.filter(CampTask.status == status)
    if day is not None:
        q = q.filter(CampTask.day_number == day)
    tasks = q.order_by(CampTask.day_number, CampTask.created_at.desc()).all()
    return ApiResponse.ok(data=tasks)


@router.post("/{group_id}/tasks", response_model=ApiResponse[CampTaskOut])
def create_task(group_id: int, data: CampTaskCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    task = CampTask(group_id=group_id, created_by=user.id, **data.model_dump(exclude={"dimensions"}))
    db.add(task)
    db.flush()
    if data.dimensions:
        for dim in data.dimensions:
            db.add(ScoringDimension(task_id=task.id, **dim.model_dump()))
    db.commit()
    db.refresh(task)
    return ApiResponse.ok(data=task)


@router.get("/{group_id}/tasks/{task_id}", response_model=ApiResponse[CampTaskOut])
def get_task(group_id: int, task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    task = db.query(CampTask).filter(CampTask.id == task_id, CampTask.group_id == group_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return ApiResponse.ok(data=task)


@router.put("/{group_id}/tasks/{task_id}", response_model=ApiResponse[CampTaskOut])
def update_task(group_id: int, task_id: int, data: CampTaskUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    task = db.query(CampTask).filter(CampTask.id == task_id, CampTask.group_id == group_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    for k, v in data.model_dump(exclude_unset=True, exclude={"dimensions"}).items():
        setattr(task, k, v)
    db.commit()
    db.refresh(task)
    return ApiResponse.ok(data=task)


@router.delete("/{group_id}/tasks/{task_id}", response_model=ApiResponse[dict])
def delete_task(group_id: int, task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    task = db.query(CampTask).filter(CampTask.id == task_id, CampTask.group_id == group_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    db.delete(task)
    db.commit()
    return ApiResponse.ok(data={"success": True})


@router.post("/{group_id}/tasks/{task_id}/publish", response_model=ApiResponse[CampTaskOut])
def publish_task(group_id: int, task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    task = db.query(CampTask).filter(CampTask.id == task_id, CampTask.group_id == group_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    task.status = "published"
    db.commit()
    db.refresh(task)
    return ApiResponse.ok(data=task)


@router.post("/{group_id}/tasks/{task_id}/close", response_model=ApiResponse[CampTaskOut])
def close_task(group_id: int, task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    task = db.query(CampTask).filter(CampTask.id == task_id, CampTask.group_id == group_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    task.status = "closed"
    db.commit()
    db.refresh(task)
    return ApiResponse.ok(data=task)


@router.post("/{group_id}/tasks/{task_id}/remind", response_model=ApiResponse[dict])
def remind_task(group_id: int, task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    task = db.query(CampTask).filter(CampTask.id == task_id, CampTask.group_id == group_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    # TODO: 发送提醒通知
    return ApiResponse.ok(data={"notified_count": 0})


# ═══════════════════════════════════════════════
# 评分维度
# ═══════════════════════════════════════════════

@router.get("/{group_id}/tasks/{task_id}/dimensions", response_model=ApiResponse[List[ScoringDimensionOut]])
def list_dimensions(group_id: int, task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    dims = db.query(ScoringDimension).filter(ScoringDimension.task_id == task_id).order_by(ScoringDimension.sort_order).all()
    return ApiResponse.ok(data=dims)


@router.post("/{group_id}/tasks/{task_id}/dimensions", response_model=ApiResponse[List[ScoringDimensionOut]])
def create_dimensions(group_id: int, task_id: int, data: List[ScoringDimensionCreate], db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    task = db.query(CampTask).filter(CampTask.id == task_id, CampTask.group_id == group_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    # 删除旧维度
    db.query(ScoringDimension).filter(ScoringDimension.task_id == task_id).delete()
    for dim in data:
        db.add(ScoringDimension(task_id=task_id, **dim.model_dump()))
    db.commit()
    dims = db.query(ScoringDimension).filter(ScoringDimension.task_id == task_id).order_by(ScoringDimension.sort_order).all()
    return ApiResponse.ok(data=dims)


# ═══════════════════════════════════════════════
# 作品与点评
# ═══════════════════════════════════════════════

@router.get("/{group_id}/submissions", response_model=ApiResponse[List[TaskSubmissionOut]])
def list_submissions(group_id: int, task_id: Optional[int] = None, day: Optional[int] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    q = db.query(TaskSubmission).join(CampTask).filter(CampTask.group_id == group_id)
    if task_id:
        q = q.filter(TaskSubmission.task_id == task_id)
    if day is not None:
        q = q.filter(CampTask.day_number == day)
    items = q.order_by(TaskSubmission.submitted_at.desc()).all()
    return ApiResponse.ok(data=items)


@router.get("/{group_id}/submissions/{sub_id}", response_model=ApiResponse[TaskSubmissionOut])
def get_submission(group_id: int, sub_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    sub = db.query(TaskSubmission).join(CampTask).filter(
        TaskSubmission.id == sub_id, CampTask.group_id == group_id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="作品不存在")
    return ApiResponse.ok(data=sub)


@router.post("/{group_id}/submissions/{sub_id}/review", response_model=ApiResponse[TaskSubmissionOut])
def review_submission(group_id: int, sub_id: int, data: SubmissionReviewCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    sub = db.query(TaskSubmission).join(CampTask).filter(
        TaskSubmission.id == sub_id, CampTask.group_id == group_id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="作品不存在")
    # 删除旧评分
    db.query(SubmissionReview).filter(SubmissionReview.submission_id == sub_id, SubmissionReview.scorer_id == user.id).delete()
    total_weighted = 0.0
    total_weight = 0.0
    for review in data.dimensions:
        dim = db.query(ScoringDimension).filter(ScoringDimension.id == review.dimension_id).first()
        weight = dim.weight if dim else 1.0
        total_weighted += review.score * weight
        total_weight += weight
        db.add(SubmissionReview(
            submission_id=sub_id,
            dimension_id=review.dimension_id,
            scorer_id=user.id,
            score=review.score,
            comment=review.comment,
        ))
    sub.score = round(total_weighted / total_weight, 2) if total_weight > 0 else None
    sub.status = "reviewed"
    db.commit()
    db.refresh(sub)
    return ApiResponse.ok(data=sub)


@router.put("/{group_id}/submissions/{sub_id}/feature", response_model=ApiResponse[TaskSubmissionOut])
def feature_submission(group_id: int, sub_id: int, featured: bool, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    sub = db.query(TaskSubmission).join(CampTask).filter(
        TaskSubmission.id == sub_id, CampTask.group_id == group_id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="作品不存在")
    sub.status = "featured" if featured else "reviewed"
    db.commit()
    db.refresh(sub)
    return ApiResponse.ok(data=sub)


@router.get("/{group_id}/submissions/pending-count", response_model=ApiResponse[int])
def pending_review_count(group_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    count = db.query(TaskSubmission).join(CampTask).filter(
        CampTask.group_id == group_id,
        TaskSubmission.status == "pending",
    ).count()
    return ApiResponse.ok(data=count)


# ═══════════════════════════════════════════════
# 营币
# ═══════════════════════════════════════════════

@router.post("/{group_id}/coins/grant", response_model=ApiResponse[dict])
def grant_coins(group_id: int, data: CoinGrantRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    total = 0
    for target in data.targets:
        bal = db.query(CampCoinBalance).filter(
            CampCoinBalance.group_id == group_id,
            CampCoinBalance.entity_type == target.entity_type,
            CampCoinBalance.entity_id == target.entity_id,
        ).first()
        if not bal:
            bal = CampCoinBalance(group_id=group_id, entity_type=target.entity_type, entity_id=target.entity_id, balance=0)
            db.add(bal)
            db.flush()
        bal.balance += data.amount
        bal.total_earned += data.amount
        db.add(CampCoinTransaction(
            group_id=group_id,
            entity_type=target.entity_type,
            entity_id=target.entity_id,
            amount=data.amount,
            balance_after=bal.balance,
            tx_type="earn",
            source_type="teacher_grant",
            description=data.reason,
            granted_by=user.id,
        ))
        total += data.amount
    db.commit()
    return ApiResponse.ok(data={"total_amount": total})


@router.post("/{group_id}/coins/deduct", response_model=ApiResponse[dict])
def deduct_coins(group_id: int, data: CoinGrantRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    total = 0
    for target in data.targets:
        bal = db.query(CampCoinBalance).filter(
            CampCoinBalance.group_id == group_id,
            CampCoinBalance.entity_type == target.entity_type,
            CampCoinBalance.entity_id == target.entity_id,
        ).first()
        if not bal or bal.balance < data.amount:
            raise HTTPException(status_code=400, detail=f"余额不足，当前余额为 {bal.balance if bal else 0}")
        bal.balance -= data.amount
        bal.total_spent += data.amount
        db.add(CampCoinTransaction(
            group_id=group_id,
            entity_type=target.entity_type,
            entity_id=target.entity_id,
            amount=-data.amount,
            balance_after=bal.balance,
            tx_type="spend",
            source_type="teacher_deduct",
            description=data.reason,
            granted_by=user.id,
        ))
        total += data.amount
    db.commit()
    return ApiResponse.ok(data={"total_amount": total})


@router.get("/{group_id}/coins/transactions", response_model=ApiResponse[List[CoinTransactionOut]])
def list_transactions(group_id: int, entity_type: Optional[str] = None, entity_id: Optional[int] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    q = db.query(CampCoinTransaction).filter(CampCoinTransaction.group_id == group_id)
    if entity_type:
        q = q.filter(CampCoinTransaction.entity_type == entity_type)
    if entity_id:
        q = q.filter(CampCoinTransaction.entity_id == entity_id)
    items = q.order_by(CampCoinTransaction.created_at.desc()).limit(100).all()
    return ApiResponse.ok(data=items)


@router.get("/{group_id}/coin-rules", response_model=ApiResponse[List[CampCoinRuleOut]])
def list_coin_rules(group_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    rules = db.query(CampCoinRule).filter(CampCoinRule.group_id == group_id).order_by(CampCoinRule.id).all()
    return ApiResponse.ok(data=rules)


@router.put("/{group_id}/coin-rules/{rule_id}", response_model=ApiResponse[CampCoinRuleOut])
def update_coin_rule(group_id: int, rule_id: int, data: CampCoinRuleUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    rule = db.query(CampCoinRule).filter(CampCoinRule.id == rule_id, CampCoinRule.group_id == group_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="规则不存在")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(rule, k, v)
    db.commit()
    db.refresh(rule)
    return ApiResponse.ok(data=rule)


@router.get("/{group_id}/shop-items", response_model=ApiResponse[List[CampShopItemOut]])
def list_shop_items(group_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    items = db.query(CampShopItem).filter(CampShopItem.group_id == group_id).order_by(CampShopItem.id).all()
    return ApiResponse.ok(data=items)


@router.post("/{group_id}/shop-items", response_model=ApiResponse[CampShopItemOut])
def create_shop_item(group_id: int, data: CampShopItemCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    item = CampShopItem(group_id=group_id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return ApiResponse.ok(data=item)


@router.put("/{group_id}/shop-items/{item_id}", response_model=ApiResponse[CampShopItemOut])
def update_shop_item(group_id: int, item_id: int, data: CampShopItemCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    item = db.query(CampShopItem).filter(CampShopItem.id == item_id, CampShopItem.group_id == group_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="商品不存在")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return ApiResponse.ok(data=item)


@router.delete("/{group_id}/shop-items/{item_id}", response_model=ApiResponse[dict])
def delete_shop_item(group_id: int, item_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    item = db.query(CampShopItem).filter(CampShopItem.id == item_id, CampShopItem.group_id == group_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="商品不存在")
    db.delete(item)
    db.commit()
    return ApiResponse.ok(data={"success": True})


@router.get("/{group_id}/coins/leaderboard", response_model=ApiResponse[List[CoinLeaderboardEntry]])
def coin_leaderboard(group_id: int, type: str = "company", db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    entries = db.query(CampCoinBalance).filter(
        CampCoinBalance.group_id == group_id,
        CampCoinBalance.entity_type == type,
    ).order_by(CampCoinBalance.balance.desc()).limit(50).all()
    result = []
    for i, e in enumerate(entries, 1):
        name = ""
        if type == "group":
            g = db.query(CampGroup).filter(CampGroup.id == e.entity_id).first()
            name = g.name if g else f"组{e.entity_id}"
        else:
            u = db.query(User).filter(User.id == e.entity_id).first()
            name = u.username if u else f"用户{e.entity_id}"
        result.append(CoinLeaderboardEntry(rank=i, entity_type=type, entity_id=e.entity_id, entity_name=name, balance=e.balance))
    return ApiResponse.ok(data=result)


# ═══════════════════════════════════════════════
# 奖项
# ═══════════════════════════════════════════════

@router.get("/{group_id}/awards", response_model=ApiResponse[List[CampAwardOut]])
def list_awards(group_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    items = db.query(CampAward).filter(CampAward.group_id == group_id).order_by(CampAward.sort_order).all()
    return ApiResponse.ok(data=items)


@router.post("/{group_id}/awards", response_model=ApiResponse[CampAwardOut])
def create_award(group_id: int, data: CampAwardCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    award = CampAward(group_id=group_id, **data.model_dump())
    db.add(award)
    db.commit()
    db.refresh(award)
    return ApiResponse.ok(data=award)


@router.put("/{group_id}/awards/{award_id}", response_model=ApiResponse[CampAwardOut])
def update_award(group_id: int, award_id: int, data: CampAwardCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    award = db.query(CampAward).filter(CampAward.id == award_id, CampAward.group_id == group_id).first()
    if not award:
        raise HTTPException(status_code=404, detail="奖项不存在")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(award, k, v)
    db.commit()
    db.refresh(award)
    return ApiResponse.ok(data=award)


@router.delete("/{group_id}/awards/{award_id}", response_model=ApiResponse[dict])
def delete_award(group_id: int, award_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    award = db.query(CampAward).filter(CampAward.id == award_id, CampAward.group_id == group_id).first()
    if not award:
        raise HTTPException(status_code=404, detail="奖项不存在")
    db.delete(award)
    db.commit()
    return ApiResponse.ok(data={"success": True})


@router.post("/{group_id}/awards/calculate", response_model=ApiResponse[List[AwardWinnerOut]])
def calculate_winners(group_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    awards = db.query(CampAward).filter(CampAward.group_id == group_id).all()
    result = []
    for award in awards:
        # 清除旧获奖者
        db.query(AwardWinner).filter(AwardWinner.award_id == award.id).delete()
        # 根据 criteria 自动计算（简化版：取评分最高）
        best = db.query(TaskSubmission).join(CampTask).filter(
            CampTask.group_id == group_id,
            TaskSubmission.score.isnot(None),
        ).order_by(TaskSubmission.score.desc()).first()
        if best:
            w = AwardWinner(award_id=award.id, winner_type=best.submitter_type, winner_id=best.submitter_id, score_value=best.score)
            db.add(w)
            result.append(w)
    db.commit()
    for r in result:
        db.refresh(r)
    return ApiResponse.ok(data=result)


@router.post("/{group_id}/awards/{award_id}/announce", response_model=ApiResponse[AwardWinnerOut])
def announce_winner(group_id: int, award_id: int, data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    award = db.query(CampAward).filter(CampAward.id == award_id, CampAward.group_id == group_id).first()
    if not award:
        raise HTTPException(status_code=404, detail="奖项不存在")
    db.query(AwardWinner).filter(AwardWinner.award_id == award_id).delete()
    w = AwardWinner(
        award_id=award_id,
        winner_type=data.get("winner_type"),
        winner_id=data.get("winner_id"),
        announced_at=func.now(),
    )
    db.add(w)
    db.commit()
    db.refresh(w)
    return ApiResponse.ok(data=w)


# ═══════════════════════════════════════════════
# 看板扩展（与 teaching_groups.py 的 dashboard 合并）
# ═══════════════════════════════════════════════

@router.get("/{group_id}/dashboard", response_model=ApiResponse[CampDashboardOut])
def get_dashboard(group_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_teacher(group_id, user, db)
    member_count = db.query(GroupMembership).filter(GroupMembership.group_id == group_id).count()
    active_events = db.query(CompetitionEvent).filter(CompetitionEvent.teaching_group_id == group_id, CompetitionEvent.status.in_(["registration", "playing"])).count()
    company_count = db.query(CampGroup).filter(CampGroup.teaching_group_id == group_id).count()
    active_tasks = db.query(CampTask).filter(CampTask.group_id == group_id, CampTask.status == "published").count()
    pending_reviews = db.query(TaskSubmission).join(CampTask).filter(CampTask.group_id == group_id, TaskSubmission.status == "pending").count()
    unscored = db.query(CampTask).filter(CampTask.group_id == group_id, CampTask.status == "closed").count()
    has_ongoing_match = active_events > 0

    return ApiResponse.ok(data=CampDashboardOut(
        member_count=member_count,
        active_event_count=active_events,
        weekly_active_count=0,
        company_count=company_count,
        current_day=1,
        active_task_count=active_tasks,
        today_agenda=[],
        quick_actions={
            "has_ongoing_match": has_ongoing_match,
            "has_pending_reviews": pending_reviews,
            "unscored_tasks": unscored,
        },
        recent_announcements=[],
        recent_events=[],
    ))
