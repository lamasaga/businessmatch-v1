"""OPS 英式拍卖逻辑"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.domains.arena.models.match import ArenaMatch
from app.domains.arena.models.team import ArenaTeam
from app.games.ops_sim.models import OpsAuctionItem, OpsAuctionBid, OpsAuctionResult, OpsTeamState
from app.games.ops_sim.enums import OpsAuctionStatus
from app.games.ops_sim.config import get_cfg


def create_auction_items(db: Session, match: ArenaMatch, stage: str = "auction_a") -> list[OpsAuctionItem]:
    """Create auction items for a stage."""
    cfg = get_cfg(match.game_config_id or "ops-sim-v1")
    items_cfg = cfg.get("auction_items", {})
    pools = cfg.get("auction_item_pools", {})
    stages = cfg.get("auction_stages", {})
    stage_cfg = stages.get(stage, {})
    item_pool = stage_cfg.get("item_pool")
    allowed_keys = set(pools.get(item_pool, [])) if item_pool else set()
    items = []

    for key, icfg in items_cfg.items():
        item_stage = icfg.get("stage")
        if allowed_keys and key not in allowed_keys:
            continue
        if not allowed_keys and item_stage and item_stage != stage:
            continue
        exists = db.query(OpsAuctionItem).filter(
            OpsAuctionItem.event_id == match.id,
            OpsAuctionItem.item_key == key,
        ).first()
        if exists:
            continue
        item = OpsAuctionItem(
            event_id=match.id,
            item_key=key,
            name=icfg.get("name", key),
            item_type=icfg.get("type", "production"),
            base_price=icfg.get("base_price", 0),
            effect_json=icfg.get("effect", {}),
            status=OpsAuctionStatus.open,
            current_price=icfg.get("base_price", 0),
        )
        db.add(item)
        items.append(item)

    db.flush()
    return items


def place_bid(
    db: Session,
    item_id: int,
    team_id: int,
    amount: float,
) -> dict[str, Any]:
    """处理出价请求，返回当前最高价信息。"""
    item = db.query(OpsAuctionItem).with_for_update().get(item_id)
    if not item:
        return {"ok": False, "error": "拍品不存在"}

    if item.status != OpsAuctionStatus.open:
        return {"ok": False, "error": "拍卖已结束"}

    if amount <= item.current_price:
        return {"ok": False, "error": "出价必须高于当前最高价"}

    cfg = get_cfg()
    min_increment = max(
        item.base_price * cfg.get("defaults", {}).get("min_bid_increment_rate", 0.05),
        cfg.get("defaults", {}).get("min_bid_increment_abs", 500),
    )
    if amount < item.current_price + min_increment:
        return {"ok": False, "error": f"最低加价幅度为 {min_increment:.0f}"}

    team_state = db.query(OpsTeamState).filter(OpsTeamState.team_id == team_id).first()
    if not team_state:
        return {"ok": False, "error": "队伍状态不存在"}

    if amount > team_state.cash:
        return {"ok": False, "error": "出价超过可用现金"}

    # 更新最高价
    item.current_price = amount
    item.leading_team_id = team_id

    bid = OpsAuctionBid(
        item_id=item_id,
        team_id=team_id,
        bid_amount=amount,
        is_winning=1,
    )
    # 将之前领先标记取消
    db.query(OpsAuctionBid).filter(
        OpsAuctionBid.item_id == item_id,
        OpsAuctionBid.is_winning == 1,
    ).update({"is_winning": 0})

    db.add(bid)
    db.commit()

    return {
        "ok": True,
        "item_id": item_id,
        "current_price": amount,
        "leading_team_id": team_id,
    }


def settle_auction(db: Session, match: ArenaMatch) -> list[dict[str, Any]]:
    """结算所有拍卖品，更新队伍资产。"""
    items = db.query(OpsAuctionItem).filter(
        OpsAuctionItem.event_id == match.id,
        OpsAuctionItem.status == OpsAuctionStatus.open,
    ).all()

    results = []
    for item in items:
        item.status = OpsAuctionStatus.settled
        item.ended_at = datetime.now(timezone.utc)

        winner_id = item.leading_team_id
        final_price = item.current_price

        if winner_id:
            team_state = db.query(OpsTeamState).filter(OpsTeamState.team_id == winner_id).first()
            if team_state:
                team_state.cash -= final_price
                effect = item.effect_json or {}
                item_type = item.item_type.value if hasattr(item.item_type, "value") else item.item_type

                if item_type == "production":
                    factories = list(team_state.factories or [])
                    factories.append({
                        "item_key": item.item_key,
                        "effect": effect,
                        "capacity_bonus": effect.get("capacity_bonus", 0),
                        "quality_bonus": effect.get("quality_bonus", 0),
                    })
                    team_state.factories = factories
                elif item_type == "advertising":
                    ads = list(team_state.ads or [])
                    ads.append({
                        "item_key": item.item_key,
                        "effect": effect,
                        "city": effect.get("city"),
                        "show_multiplier": effect.get("show_multiplier", 1.2),
                    })
                    team_state.ads = ads
                elif item_type == "discount":
                    team_state.discount_rate = max(
                        float(team_state.discount_rate or 0.0),
                        float(effect.get("material_cost_discount", 0.0)),
                    )
                elif item_type == "exclusive_channel":
                    entered = dict(team_state.__dict__)
                    channels = list((entered.get("channels") if isinstance(entered.get("channels"), list) else []) or [])
                    channels.append({"item_key": item.item_key, "effect": effect, **effect})
                    setattr(team_state, "channels", channels) if hasattr(team_state, "channels") else None
                    team_state.entered_cities = team_state.entered_cities or []
                    # Persist in ads JSON for backward-compatible storage until a dedicated column exists.
                    ads = list(team_state.ads or [])
                    ads.append({"item_key": item.item_key, "resource_kind": "exclusive_channel", "effect": effect, **effect})
                    team_state.ads = ads
                elif item_type == "strategic_resource":
                    if effect.get("material_cost_discount"):
                        team_state.discount_rate = max(
                            float(team_state.discount_rate or 0.0),
                            float(effect.get("material_cost_discount", 0.0)),
                        )
                    team_state.tech = float(team_state.tech or 20.0) + float(effect.get("tech_bonus", 0.0))
                    factories = list(team_state.factories or [])
                    factories.append({"item_key": item.item_key, "resource_kind": "strategic_resource", "effect": effect, **effect})
                    team_state.factories = factories
                elif item_type == "brand_endorsement":
                    team_state.show = float(team_state.show or 20.0) + float(effect.get("show_bonus", 0.0))
                    ads = list(team_state.ads or [])
                    ads.append({"item_key": item.item_key, "resource_kind": "brand_endorsement", "effect": effect, **effect})
                    team_state.ads = ads
                elif item_type == "legal_protection":
                    protections = list(team_state.factories or [])
                    protections.append({"item_key": item.item_key, "resource_kind": "legal_protection", "effect": effect, **effect})
                    team_state.factories = protections

        result = OpsAuctionResult(
            item_id=item.id,
            winner_team_id=winner_id,
            final_price=final_price,
        )
        db.add(result)

        results.append({
            "item_id": item.id,
            "item_key": item.item_key,
            "name": item.name,
            "winner_team_id": winner_id,
            "final_price": final_price,
        })

    db.commit()
    return results


def auction_state_for_event(db: Session, event_id: int) -> list[dict[str, Any]]:
    """返回前端拍卖大厅所需状态。"""
    items = db.query(OpsAuctionItem).filter(
        OpsAuctionItem.event_id == event_id,
    ).order_by(OpsAuctionItem.id).all()

    team_names = {}
    for team in db.query(ArenaTeam).filter(ArenaTeam.event_id == event_id).all():
        team_names[team.id] = team.team_name

    return [
        {
            "id": item.id,
            "item_key": item.item_key,
            "name": item.name,
            "item_type": item.item_type.value if hasattr(item.item_type, "value") else item.item_type,
            "base_price": item.base_price,
            "current_price": item.current_price,
            "leading_team_id": item.leading_team_id,
            "leading_team_name": team_names.get(item.leading_team_id) if item.leading_team_id else None,
            "status": item.status.value if hasattr(item.status, "value") else item.status,
            "effect": item.effect_json or {},
        }
        for item in items
    ]
