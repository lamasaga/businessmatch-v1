"""商赛 Pydantic Schemas"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


# ============== Organizer Schemas ==============

class OrganizerProfileBase(BaseModel):
    organization_name: str = Field(..., min_length=1, max_length=100)
    contact_phone: Optional[str] = Field(None, max_length=20)


class OrganizerProfileCreate(OrganizerProfileBase):
    pass


class OrganizerProfileUpdate(BaseModel):
    organization_name: Optional[str] = Field(None, min_length=1, max_length=100)
    contact_phone: Optional[str] = Field(None, max_length=20)


class OrganizerProfileOut(OrganizerProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    verified: bool
    total_events_hosted: int
    total_participants: int
    created_at: datetime


class OrganizerStats(BaseModel):
    total_events_hosted: int
    total_participants: int
    active_events: int
    finished_events: int


# ============== Competition Event Schemas ==============

class GameConfig(BaseModel):
    rounds: int = Field(default=10, ge=3, le=20)
    initial_capital: int = Field(default=50000, ge=10000, le=100000)
    inventory_limit: int = Field(default=99, ge=5, le=999, description="每种商品的最大持有数量")
    inventory_limit_per_product: int = Field(default=99, ge=5, le=999)
    move_cost: int = Field(default=1000, ge=100, le=5000)
    decision_time: int = Field(default=60, ge=15, le=300)
    cities: List[str] = Field(default=["jingcheng", "hushi", "shenshi", "rongcheng", "bingcheng", "gangcheng"])
    products: List[str] = Field(default=["fruit", "vegetable", "daily", "electronics", "clothing", "cosmetics", "jewelry", "antique", "art", "snack"])


class CompetitionEventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    game_type: str = "trading"
    max_players: int = Field(default=50, ge=2, le=200)
    config: GameConfig = Field(default_factory=GameConfig)


class CompetitionEventCreate(CompetitionEventBase):
    game_config_id: str = Field(default="trading-v1", max_length=64)
    design_mode: str = Field(default="standalone", description="standalone | modular")
    match_kind: str = Field(default="official", description="official | practice")


class CompetitionEventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    status: Optional[str] = None


class PracticeStartRequest(BaseModel):
    game_config_id: str = Field(default="trading-v1")
    design_mode: str = Field(default="standalone")
    title: Optional[str] = None
    config: Optional[GameConfig] = None


class CompetitionEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organizer_id: Optional[int] = None
    room_code: str
    title: str
    description: Optional[str]
    match_kind: str = "official"
    design_mode: str = "standalone"
    game_config_id: str = "trading-v1"
    game_type: str
    status: str
    config: Dict[str, Any]
    max_players: int
    current_round: int
    starts_at: Optional[datetime]
    ends_at: Optional[datetime]
    created_at: datetime
    participant_count: int = 0


class CompetitionEventDetail(CompetitionEventOut):
    participants: List["ParticipantOut"] = []
    rounds: List["TradingRoundOut"] = []


# ============== Participant Schemas ==============

class ParticipantBase(BaseModel):
    pass


class ParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    user_id: int
    username: str
    avatar: Optional[str]
    cash: float
    inventory: Dict[str, int]
    current_city: str
    total_assets: float
    status: str
    final_rank: Optional[int]
    experience_earned: int
    joined_at: datetime


class JoinCompetitionRequest(BaseModel):
    room_code: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")


class MyCompetitionStatus(BaseModel):
    event: CompetitionEventOut
    participant: Optional[ParticipantOut]
    is_organizer: bool


# ============== Trading Round Schemas ==============

class TradingRoundBase(BaseModel):
    pass


class TradingRoundOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    round_number: int
    status: str
    events: List[Dict[str, Any]]
    price_snapshot: Dict[str, Dict[str, int]]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]


class TradingRoundResult(BaseModel):
    round: TradingRoundOut
    standings: List[Dict[str, Any]]
    my_decision: Optional[Dict[str, Any]]


# ============== Trading Decision Schemas ==============

class BuyAction(BaseModel):
    product_id: str
    quantity: int = Field(..., ge=1)


class SellAction(BaseModel):
    product_id: str
    quantity: int = Field(..., ge=1)


class MoveAction(BaseModel):
    to_city: str


class DecisionRequest(BaseModel):
    action_type: str  # buy, sell, move, hold
    action_data: Dict[str, Any] = {}


class DecisionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    round_id: int
    participant_id: int
    action_type: str
    action_data: Dict[str, Any]
    cash_after: float
    inventory_after: Dict[str, int]
    submitted_at: datetime


# ============== Game State Schemas ==============

class ProductPrice(BaseModel):
    product_id: str
    name: str
    category: str
    buy_price: int
    sell_price: int
    trend: str  # up, down, stable
    trend_percent: float
    buy_qty: int = 0
    sell_qty: int = 0
    net_demand: int = 0
    pressure: float = 0.0  # 供需压力 -1~1，正=需求偏强


class MarketInsight(BaseModel):
    city: str
    city_name: str
    product_id: str
    product_name: str
    buy_qty: int
    sell_qty: int
    net_demand: int
    pressure: float


class CityMarket(BaseModel):
    city: str
    city_name: str
    products: List[ProductPrice]


class PlayerInventoryItem(BaseModel):
    product_id: str
    name: str
    quantity: int
    avg_cost: float
    current_value: float


class InventoryCapacity(BaseModel):
    limit_per_product: int
    total_items: int
    by_product: Dict[str, Dict[str, int]] = {}


class GameState(BaseModel):
    event: CompetitionEventOut
    participant: ParticipantOut
    current_round: Optional[TradingRoundOut]
    markets: List[CityMarket]
    inventory: List[PlayerInventoryItem]
    standings: List[Dict[str, Any]]
    time_remaining: Optional[int] = None
    is_practice: bool = False
    pricing_mode: str = "market"
    market_insights: List[MarketInsight] = []
    has_submitted_this_round: bool = False
    can_submit_decision: bool = False
    inventory_capacity: Optional[InventoryCapacity] = None


class SubmitDecisionResult(BaseModel):
    decision: DecisionOut
    practice_advanced: bool = False
    event_finished: bool = False
    current_round: Optional[TradingRoundOut] = None
    has_submitted_this_round: bool = True
    can_submit_decision: bool = False


class StandingsEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    avatar: Optional[str]
    cash: float
    inventory_value: float
    total_assets: float
    current_city: str


# ============== Competition Result Schemas ==============

class CompetitionResult(BaseModel):
    event: CompetitionEventOut
    final_standings: List[StandingsEntry]
    my_result: Optional[Dict[str, Any]]
    experience_earned: int
    achievements: List[str]


class OrganizerControlOut(BaseModel):
    """组织者控场面板数据（无需参赛即可查看）"""
    event: CompetitionEventOut
    current_round: Optional[TradingRoundOut] = None
    standings: List[Dict[str, Any]] = []
    participants: List[ParticipantOut] = []
    decisions_submitted: int = 0


# 解决前向引用
CompetitionEventDetail.model_rebuild()
