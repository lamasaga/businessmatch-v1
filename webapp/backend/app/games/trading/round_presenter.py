"""TradingRound ORM → API schema（避免 api.trading ↔ api.trading_rts_handlers 循环导入）"""

from __future__ import annotations

from datetime import datetime

from app.games.trading import TradingRound
from app.schemas.trading_competition import TradingRoundOut


def _coerce_datetime(value):
    if value is None or isinstance(value, datetime):
        return value
    return None


def round_to_out(round_obj: TradingRound) -> TradingRoundOut:
    snapshot = dict(round_obj.price_snapshot or {})
    snapshot.pop("_rts", None)
    return TradingRoundOut(
        id=round_obj.id,
        event_id=round_obj.event_id,
        round_number=round_obj.round_number,
        status=round_obj.status.value if round_obj.status else "pending",
        events=round_obj.events or [],
        price_snapshot={k: v for k, v in snapshot.items() if not k.startswith("_")},
        started_at=_coerce_datetime(round_obj.started_at),
        ended_at=_coerce_datetime(round_obj.ended_at),
    )
