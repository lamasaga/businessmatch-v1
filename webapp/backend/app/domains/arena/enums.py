"""Arena 域枚举 — 场次生命周期（与具体赛制无关）"""

import enum


class MatchKind(str, enum.Enum):
    """体验类型：组织者正式赛 / 日常单人练习"""

    official = "official"
    practice = "practice"


class DesignMode(str, enum.Enum):
    """赛制设计形态：高独立完整包 / 声明式模块化组合"""

    standalone = "standalone"
    modular = "modular"


class MatchStatus(str, enum.Enum):
    draft = "draft"
    registration = "registration"
    playing = "playing"
    finished = "finished"
    cancelled = "cancelled"


class GameEngineId(str, enum.Enum):
    """运行时引擎插件 ID（对应 app/games/<engine>/）"""

    trading = "trading"
    techventure = "techventure"
    negotiation = "negotiation"
    strategy = "strategy"


class ParticipantStatus(str, enum.Enum):
    joined = "joined"
    playing = "playing"
    eliminated = "eliminated"
    quit = "quit"


# 向后兼容旧名
EventStatus = MatchStatus
GameType = GameEngineId
