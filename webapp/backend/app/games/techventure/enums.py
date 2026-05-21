"""TechVenture 赛制枚举"""

import enum


class TvRoundStatus(str, enum.Enum):
    pending = "pending"
    open = "open"
    settled = "settled"


class StrategyRoute(str, enum.Enum):
    TECH = "TECH"
    USER = "USER"
    BRAND = "BRAND"
    PATHFINDER = "PATHFINDER"


class TvEventId(str, enum.Enum):
    none = "none"
    pragmaticWave = "pragmaticWave"
    geekWave = "geekWave"
    trendyWave = "trendyWave"
    investorBoom = "investorBoom"
    compliance = "compliance"
    influencerBoom = "influencerBoom"


class TvNewsKind(str, enum.Enum):
    hot_pulse = "hot_pulse"
    pathfinder_boom = "pathfinder_boom"
    pathfinder_crowd = "pathfinder_crowd"
    marketing_over = "marketing_over"
    declaration_win = "declaration_win"
    declaration_miss = "declaration_miss"
    tech_last = "tech_last"
    fit_last = "fit_last"
    all_round = "all_round"
    city_debut = "city_debut"
    route_switch = "route_switch"
    ceiling_boost = "ceiling_boost"
    rank_top = "rank_top"
    event_r3 = "event_r3"
