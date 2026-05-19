"""交易商赛模型 - 《北京浮生记》式倒卖游戏"""

import enum
import random
import string
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey,
    Enum, JSON, UniqueConstraint, Index, CheckConstraint
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base


# ============== 枚举定义 ==============

class EventStatus(str, enum.Enum):
    draft = "draft"           # 草稿
    registration = "registration"  # 报名中
    playing = "playing"       # 进行中
    finished = "finished"     # 已结束
    cancelled = "cancelled"   # 已取消


class GameType(str, enum.Enum):
    trading = "trading"       # 倒卖交易
    negotiation = "negotiation"  # 谈判
    strategy = "strategy"     # 策略


class ParticipantStatus(str, enum.Enum):
    joined = "joined"         # 已加入
    playing = "playing"       # 进行中
    eliminated = "eliminated"  # 淘汰
    quit = "quit"             # 退出


class RoundStatus(str, enum.Enum):
    pending = "pending"       # 待开始
    active = "active"         # 进行中（可提交决策）
    calculating = "calculating"  # 计算中
    completed = "completed"   # 已完成


class ActionType(str, enum.Enum):
    buy = "buy"
    sell = "sell"
    move = "move"
    hold = "hold"


# ============== 商品与城市配置（游戏常量） ==============

PRODUCTS = {
    "fruit":      {"name": "水果",     "category": "low",    "base_price": 30,   "price_range": [15, 60]},
    "vegetable":  {"name": "蔬菜",     "category": "low",    "base_price": 25,   "price_range": [12, 50]},
    "daily":      {"name": "日用品",   "category": "low",    "base_price": 40,   "price_range": [20, 80]},
    "electronics":{"name": "电子产品", "category": "mid",    "base_price": 600,  "price_range": [300, 1200]},
    "clothing":   {"name": "服装",     "category": "mid",    "base_price": 400,  "price_range": [200, 800]},
    "cosmetics":  {"name": "化妆品",   "category": "mid",    "base_price": 500,  "price_range": [250, 1000]},
    "jewelry":    {"name": "珠宝",     "category": "high",   "base_price": 15000,"price_range": [8000, 30000]},
    "antique":    {"name": "古董",     "category": "high",   "base_price": 20000,"price_range": [10000, 40000]},
    "art":        {"name": "艺术品",   "category": "high",   "base_price": 25000,"price_range": [12000, 50000]},
    "snack":      {"name": "零食",     "category": "low",    "base_price": 20,   "price_range": [10, 40]},
}

CITIES = {
    "jingcheng": {"name": "京城", "type": "political", "description": "政治中心，高档品需求高"},
    "hushi":     {"name": "沪市", "type": "finance",   "description": "金融中心，中档品交易活跃"},
    "shenshi":   {"name": "深市", "type": "tech",      "description": "科技中心，电子产品价格低"},
    "rongcheng": {"name": "蓉城", "type": "leisure",   "description": "休闲中心，食品价格低"},
    "bingcheng": {"name": "冰城", "type": "border",    "description": "边境口岸，价格波动大"},
    "gangcheng": {"name": "港城", "type": "freeport",  "description": "自由港，免税价格低"},
}

EVENT_TYPES = [
    {"type": "harvest",      "name": "丰收",         "desc": "本地农产品大丰收，食品价格暴跌", "target_category": "low", "impact_range": [-0.35, -0.15]},
    {"type": "famine",       "name": "歉收",         "desc": "天灾导致农作物减产，食品价格飞涨", "target_category": "low", "impact_range": [0.20, 0.50]},
    {"type": "trend",        "name": "流行趋势",     "desc": "某类商品突然成为潮流，需求暴增", "target_category": "random", "impact_range": [0.30, 0.80]},
    {"type": "policy",       "name": "政策调控",     "desc": "政府出台限价政策，某类商品价格受限", "target_category": "random", "impact_range": [-0.25, 0.10]},
    {"type": "rumor",        "name": "市场谣言",     "desc": "关于某商品的谣言四起，价格剧烈波动", "target_category": "random", "impact_range": [-0.30, 0.40]},
    {"type": "disaster",     "name": "自然灾害",     "desc": "突发天灾，本地商品供应中断", "target_category": "random", "impact_range": [0.25, 0.60]},
    {"type": "tech",         "name": "技术突破",     "desc": "新技术发布，电子产品成本下降", "target_category": "mid", "impact_range": [-0.30, -0.10]},
    {"type": "holiday",      "name": "节日消费",     "desc": "节日临近，消费需求旺盛", "target_category": "random", "impact_range": [0.15, 0.35]},
    {"type": "scandal",      "name": "质量丑闻",     "desc": "某类商品爆出质量问题，需求骤降", "target_category": "random", "impact_range": [-0.40, -0.15]},
    {"type": "investment",   "name": "投资热潮",     "desc": "投资者涌入，高档品价格飙升", "target_category": "high", "impact_range": [0.20, 0.50]},
]


def generate_room_code() -> str:
    """生成4位数字房间码"""
    return ''.join(random.choices(string.digits, k=4))


def generate_random_events(round_number: int, cities: list, products: dict) -> list:
    """生成本回合随机事件"""
    events = []
    num_events = 1 if round_number <= 2 else random.randint(1, 2)
    
    for _ in range(num_events):
        event_template = random.choice(EVENT_TYPES)
        city_key = random.choice(cities)
        
        # 确定影响商品类别
        if event_template["target_category"] == "random":
            categories = ["low", "mid", "high"]
            target_cat = random.choice(categories)
        else:
            target_cat = event_template["target_category"]
        
        # 该类别的所有商品
        target_products = [k for k, v in products.items() if v["category"] == target_cat]
        affected_products = random.sample(target_products, min(2, len(target_products)))
        
        impact = round(random.uniform(
            event_template["impact_range"][0],
            event_template["impact_range"][1]
        ), 2)
        
        events.append({
            "type": event_template["type"],
            "name": event_template["name"],
            "description": event_template["desc"],
            "city": city_key,
            "affected_products": affected_products,
            "impact": impact,
            "target_category": target_cat,
        })
    
    return events


def calculate_prices(
    base_products: dict,
    cities: list,
    decisions: list,
    events: list,
    round_number: int
) -> dict:
    """
    计算新价格
    返回: {city: {product_id: price}}
    """
    prices = {}
    
    # 统计供需
    supply_demand = {}  # {product_id: net_demand}
    for d in decisions:
        action = d.action_type
        data = d.action_data
        if action == "buy":
            pid = data.get("product_id")
            qty = data.get("quantity", 0)
            supply_demand[pid] = supply_demand.get(pid, 0) + qty
        elif action == "sell":
            pid = data.get("product_id")
            qty = data.get("quantity", 0)
            supply_demand[pid] = supply_demand.get(pid, 0) - qty
    
    for city_key in cities:
        prices[city_key] = {}
        city_info = CITIES[city_key]
        
        for pid, prod in base_products.items():
            base = prod["base_price"]
            
            # 1. 城市基础调整
            city_factor = 0.0
            if city_info["type"] == "political" and prod["category"] == "high":
                city_factor = 0.15
            elif city_info["type"] == "tech" and pid == "electronics":
                city_factor = -0.20
            elif city_info["type"] == "freeport":
                city_factor = -0.10
            elif city_info["type"] == "border":
                city_factor = random.uniform(-0.15, 0.15)
            elif city_info["type"] == "leisure" and prod["category"] == "low":
                city_factor = -0.10
            
            # 2. 供需系数
            sd_factor = 0.0
            if pid in supply_demand:
                net = supply_demand[pid]
                if net > 0:  # 净买入（需求大）
                    sd_factor = min(net * 0.02, 0.30)
                elif net < 0:  # 净卖出（供给大）
                    sd_factor = max(net * 0.02, -0.30)
            
            # 3. 随机波动（随回合增加波动）
            volatility = 0.05 + (round_number * 0.01)
            random_factor = random.uniform(-volatility, volatility)
            
            # 4. 事件影响
            event_factor = 0.0
            for evt in events:
                if pid in evt.get("affected_products", []) and city_key == evt.get("city"):
                    event_factor += evt["impact"]
                # 事件对相邻城市也有部分影响
                elif pid in evt.get("affected_products", []):
                    event_factor += evt["impact"] * 0.3
            
            # 综合计算
            total_factor = city_factor + sd_factor + random_factor + event_factor
            price = int(base * (1 + total_factor))
            
            # 限制在价格区间内
            min_p, max_p = prod["price_range"]
            price = max(min_p, min(max_p, price))
            
            prices[city_key][pid] = price
    
    return prices


# ============== 模型定义 ==============

class OrganizerProfile(Base):
    """组织者档案"""
    __tablename__ = "organizer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    organization_name = Column(String(100), nullable=False)
    contact_phone = Column(String(20), nullable=True)
    verified = Column(Boolean, default=False, nullable=False)
    total_events_hosted = Column(Integer, default=0, nullable=False)
    total_participants = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", backref="organizer_profile")


class CompetitionEvent(Base):
    """比赛活动"""
    __tablename__ = "competition_events"

    id = Column(Integer, primary_key=True, index=True)
    organizer_id = Column(Integer, ForeignKey("organizer_profiles.id"), nullable=False)
    room_code = Column(String(4), unique=True, nullable=False, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    game_type = Column(Enum(GameType), default=GameType.trading, nullable=False)
    status = Column(Enum(EventStatus), default=EventStatus.draft, nullable=False)
    config = Column(JSON, default=dict)  # 赛制参数
    max_players = Column(Integer, default=50, nullable=False)
    current_round = Column(Integer, default=0, nullable=False)
    starts_at = Column(DateTime(timezone=True), nullable=True)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organizer = relationship("OrganizerProfile", backref="events")
    participants = relationship("CompetitionParticipant", back_populates="event", cascade="all, delete-orphan")
    rounds = relationship("TradingRound", back_populates="event", cascade="all, delete-orphan")
    prices = relationship("TradingPrice", back_populates="event", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_comp_events_status", "status", "game_type"),
        Index("idx_comp_events_organizer", "organizer_id", "status"),
    )


class CompetitionParticipant(Base):
    """参赛成员"""
    __tablename__ = "competition_participants"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("competition_events.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cash = Column(Float, default=0, nullable=False)
    inventory = Column(JSON, default=dict)  # {product_id: quantity}
    current_city = Column(String(20), default="jingcheng", nullable=False)
    total_assets = Column(Float, default=0, nullable=False)
    status = Column(Enum(ParticipantStatus), default=ParticipantStatus.joined, nullable=False)
    final_rank = Column(Integer, nullable=True)
    experience_earned = Column(Integer, default=0, nullable=False)
    achievements_earned = Column(JSON, default=list)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("CompetitionEvent", back_populates="participants")
    user = relationship("User", backref="competition_participations")
    decisions = relationship("TradingDecision", back_populates="participant", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_participant_event_user"),
        Index("idx_comp_participants_event", "event_id", "status"),
        Index("idx_comp_participants_user", "user_id", "status"),
    )


class TradingRound(Base):
    """交易回合"""
    __tablename__ = "trading_rounds"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("competition_events.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    status = Column(Enum(RoundStatus), default=RoundStatus.pending, nullable=False)
    events = Column(JSON, default=list)  # 随机事件
    price_snapshot = Column(JSON, default=dict)  # 价格快照 {city: {product: price}}
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    event = relationship("CompetitionEvent", back_populates="rounds")
    decisions = relationship("TradingDecision", back_populates="round", cascade="all, delete-orphan")
    prices = relationship("TradingPrice", back_populates="round", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("event_id", "round_number", name="uq_round_event_number"),
        Index("idx_trading_rounds_event", "event_id", "status"),
    )


class TradingDecision(Base):
    """交易决策"""
    __tablename__ = "trading_decisions"

    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("trading_rounds.id"), nullable=False)
    participant_id = Column(Integer, ForeignKey("competition_participants.id"), nullable=False)
    action_type = Column(Enum(ActionType), nullable=False)
    action_data = Column(JSON, default=dict)
    cash_after = Column(Float, default=0, nullable=False)
    inventory_after = Column(JSON, default=dict)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    round = relationship("TradingRound", back_populates="decisions")
    participant = relationship("CompetitionParticipant", back_populates="decisions")

    __table_args__ = (
        UniqueConstraint("round_id", "participant_id", name="uq_decision_round_participant"),
        Index("idx_trading_decisions_round", "round_id", "action_type"),
    )


class TradingPrice(Base):
    """历史价格记录"""
    __tablename__ = "trading_prices"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("competition_events.id"), nullable=False)
    round_id = Column(Integer, ForeignKey("trading_rounds.id"), nullable=False)
    city = Column(String(20), nullable=False)
    product_id = Column(String(20), nullable=False)
    base_price = Column(Float, nullable=False)
    supply_factor = Column(Float, default=0, nullable=False)
    event_factor = Column(Float, default=0, nullable=False)
    final_price = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("CompetitionEvent", back_populates="prices")
    round = relationship("TradingRound", back_populates="prices")

    __table_args__ = (
        Index("idx_trading_prices_event", "event_id", "round_id"),
        Index("idx_trading_prices_lookup", "event_id", "city", "product_id"),
    )
