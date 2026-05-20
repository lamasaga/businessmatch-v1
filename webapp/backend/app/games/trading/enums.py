"""交易赛回合与动作枚举"""

import enum


class RoundStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    calculating = "calculating"
    completed = "completed"


class ActionType(str, enum.Enum):
    buy = "buy"
    sell = "sell"
    move = "move"
    hold = "hold"
