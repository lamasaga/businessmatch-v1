"""AI 交易员系统账号 — 练习局虚拟对手"""

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.user import User, UserRole

BOT_TRADERS = [
    ("trader_bot_a", "市集摊贩·老陈", "bot_a@bizsim.internal"),
    ("trader_bot_b", "倒卖客·小美", "bot_b@bizsim.internal"),
    ("trader_bot_c", "行商·大周", "bot_c@bizsim.internal"),
]


def ensure_bot_traders(db: Session) -> list[User]:
    users: list[User] = []
    for username, _display, email in BOT_TRADERS:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            user = User(
                email=email,
                username=username,
                hashed_password=get_password_hash("bot-not-for-login"),
                role=UserRole.student,
                experience=0,
                level=1,
            )
            db.add(user)
            db.flush()
        users.append(user)
    return users


def bot_display_name(username: str) -> str:
    for u, display, _ in BOT_TRADERS:
        if u == username:
            return display
    return username
