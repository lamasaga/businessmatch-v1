"""
向后兼容层 — 旧代码 `from app.models.trading_competition import ...` 仍可用。

新代码请使用：
- app.domains.arena.*
- app.games.trading.*
- app.domains.cybercore.*
"""

from app.domains.arena.enums import (
    DesignMode,
    EventStatus,
    GameEngineId,
    GameType,
    MatchKind,
    MatchStatus,
    ParticipantStatus,
)
from app.games.trading.enums import ActionType, RoundStatus
from app.domains.arena.models import (
    ArenaMatch,
    ArenaParticipant,
    CompetitionEvent,
    CompetitionParticipant,
    OrganizerProfile,
)
from app.domains.arena.utils import generate_room_code
from app.games.trading import (
    PRODUCTS,
    CITIES,
    TradingDecision,
    TradingPrice,
    TradingRound,
)

__all__ = [
    "ActionType",
    "DesignMode",
    "EventStatus",
    "GameEngineId",
    "GameType",
    "MatchKind",
    "MatchStatus",
    "ParticipantStatus",
    "RoundStatus",
    "OrganizerProfile",
    "ArenaMatch",
    "CompetitionEvent",
    "ArenaParticipant",
    "CompetitionParticipant",
    "TradingRound",
    "TradingDecision",
    "TradingPrice",
    "PRODUCTS",
    "CITIES",
    "generate_room_code",
]
