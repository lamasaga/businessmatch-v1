"""AI 交易员系统账号 — 练习局虚拟对手（怪诞商业街 NPC 池）"""

from __future__ import annotations

import random
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.user import User, UserRole

ROLE_PORTRAIT_BASE = "/assets/role-portraits"


@dataclass(frozen=True)
class BotTraderDef:
    username: str
    display_name: str
    email: str
    avatar_id: str
    default_level: str  # chaotic | advanced


# 与 art-assets/角色背景/头像/01.jpg … 10.jpg 及 NPC 设定集对齐
BOT_TRADERS: tuple[BotTraderDef, ...] = (
    BotTraderDef("trader_bot_01", "霓虹猫账房·米娅 [精英]", "bot_01@bizsim.internal", "01", "advanced"),
    BotTraderDef("trader_bot_02", "爆款殡仪师·白爆 [混乱]", "bot_02@bizsim.internal", "02", "chaotic"),
    BotTraderDef("trader_bot_03", "反向折扣王·老折 [混乱]", "bot_03@bizsim.internal", "03", "chaotic"),
    BotTraderDef("trader_bot_04", "云端盐商·盐鸽 [精英]", "bot_04@bizsim.internal", "04", "advanced"),
    BotTraderDef("trader_bot_05", "玻璃胃CEO·唐甜 [精英]", "bot_05@bizsim.internal", "05", "advanced"),
    BotTraderDef("trader_bot_06", "黑胶董事长·阿盘 [精英]", "bot_06@bizsim.internal", "06", "advanced"),
    BotTraderDef("trader_bot_07", "退货女巫·洛栖 [混乱]", "bot_07@bizsim.internal", "07", "chaotic"),
    BotTraderDef("trader_bot_08", "拆台偶像·KIKI [混乱]", "bot_08@bizsim.internal", "08", "chaotic"),
    BotTraderDef("trader_bot_09", "货架占卜师·七排 [精英]", "bot_09@bizsim.internal", "09", "advanced"),
    BotTraderDef("trader_bot_10", "预算刺客·沈剪 [精英]", "bot_10@bizsim.internal", "10", "advanced"),
)

_BOT_BY_USERNAME = {b.username: b for b in BOT_TRADERS}

# 旧账号兼容（历史对局）
_LEGACY_NAMES = {
    "trader_bot_a": "市集摊贩·老陈 [混乱]",
    "trader_bot_b": "倒卖客·小美 [精英]",
    "trader_bot_c": "行商·大周 [精英]",
}


def ensure_bot_traders(db: Session) -> list[User]:
    users: list[User] = []
    for spec in BOT_TRADERS:
        user = db.query(User).filter(User.username == spec.username).first()
        if not user:
            user = User(
                email=spec.email,
                username=spec.username,
                hashed_password=get_password_hash("bot-not-for-login"),
                role=UserRole.student,
                experience=0,
                level=1,
            )
            db.add(user)
            db.flush()
        users.append(user)
    return users


def pick_bot_traders(db: Session, count: int, seed: int) -> list[User]:
    """从 10 人 NPC 池中无放回随机抽取 count 名对手。"""
    pool = ensure_bot_traders(db)
    n = max(0, min(count, len(pool)))
    if n == 0:
        return []
    if n >= len(pool):
        return list(pool)
    rng = random.Random(seed)
    return rng.sample(pool, n)


def bot_display_name(username: str) -> str:
    spec = _BOT_BY_USERNAME.get(username)
    if spec:
        return spec.display_name
    return _LEGACY_NAMES.get(username, username)


def bot_avatar_url(username: str) -> str:
    spec = _BOT_BY_USERNAME.get(username)
    if spec:
        return f"{ROLE_PORTRAIT_BASE}/{spec.avatar_id}.jpg"
    legacy_avatar = {"trader_bot_a": "01", "trader_bot_b": "02", "trader_bot_c": "03"}
    aid = legacy_avatar.get(username, "01")
    return f"{ROLE_PORTRAIT_BASE}/{aid}.jpg"


def bot_default_level(username: str) -> str:
    spec = _BOT_BY_USERNAME.get(username)
    if spec:
        return spec.default_level
    return "advanced"


def ai_levels_for_bots(bots: list[User], config: dict) -> list[str]:
    """优先 YAML practice_ai_slots；未配置则按 NPC 人设默认档位。"""
    from app.games.trading.rts_ai_levels import normalize_ai_slots

    slots = config.get("practice_ai_slots")
    if slots:
        return normalize_ai_slots(config, len(bots))
    return [bot_default_level(b.username) for b in bots]
