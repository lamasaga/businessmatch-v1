"""OPS 生产经营销售赛枚举"""

import enum


class OpsRoundStatus(str, enum.Enum):
    pending = "pending"
    open = "open"
    closed = "closed"
    settled = "settled"


class OpsMatchPhase(str, enum.Enum):
    draft = "draft"
    registration = "registration"
    positioning = "positioning"
    operation_round_1 = "operation_round_1"
    settlement_1 = "settlement_1"
    operation_round_2 = "operation_round_2"
    settlement_2 = "settlement_2"
    auction = "auction"
    operation_round_3 = "operation_round_3"
    settlement_3 = "settlement_3"
    operation_round_4 = "operation_round_4"
    settlement_4 = "settlement_4"
    finished = "finished"
    paused = "paused"


class OpsCategory(str, enum.Enum):
    electronics = "electronics"
    fast_moving = "fast_moving"
    home = "home"


class OpsSegment(str, enum.Enum):
    geek = "geek"
    pragmatic = "pragmatic"
    show = "show"


class OpsAiStrategy(str, enum.Enum):
    balanced = "balanced"
    aggressive = "aggressive"
    conservative = "conservative"


class OpsAuctionItemType(str, enum.Enum):
    production = "production"
    advertising = "advertising"
    discount = "discount"


class OpsAuctionStatus(str, enum.Enum):
    pending = "pending"
    open = "open"
    closed = "closed"
    settled = "settled"
