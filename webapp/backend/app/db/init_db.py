"""数据库初始化脚本 - 创建表 + 插入默认 admin 用户"""

from app.db.database import Base, engine, SessionLocal
from app.db.migrate_schema import run_migrations
from app.models.user import User, UserRole
from app.models.opc import OneCompany, AIEmployee, AITask
from app.domains.arena.models import OrganizerProfile
from app.domains.arena.models.match import ArenaMatch  # noqa: F401
from app.domains.arena.models.participant import ArenaParticipant  # noqa: F401
from app.domains.arena.models.team import ArenaTeam  # noqa: F401
from app.domains.arena.models.teaching_group import TeachingGroup, GroupMembership  # noqa: F401
from app.domains.arena.models.announcement import CampAnnouncement  # noqa: F401
from app.domains.arena.models.season import Season, SeasonMilestone  # noqa: F401
from app.domains.arena.models.camp_group import CampGroup, CampGroupMember  # noqa: F401
from app.domains.arena.models.assignment import Assignment, AssignmentSubmission  # noqa: F401
from app.domains.arena.models.camp_summer import (  # noqa: F401
    CampAgendaItem, CampTask, ScoringDimension,
    TaskSubmission, SubmissionReview,
    CampCoinBalance, CampCoinTransaction, CampCoinRule, CampShopItem,
    CampAward, AwardWinner,
)
from app.domains.career.models.xp_event import XpEvent  # noqa: F401
from app.domains.career.models.career_profile import CareerProfile  # noqa: F401
from app.games.trading.models import TradingRound, TradingDecision, TradingPrice  # noqa: F401
from app.games.techventure.models import TvTeamState, TvRound, TvSubmission, TvSnapshot, TvNews  # noqa: F401
from app.games.ops_sim.models import (  # noqa: F401
    OpsTeamState, OpsProductCard, OpsRound, OpsSubmission, OpsSnapshot,
    OpsAuctionItem, OpsAuctionBid, OpsAuctionResult,
)
from app.games.trading.bot_users import ensure_bot_traders
from app.core.security import get_password_hash


def init_database():
    """创建所有数据表并执行轻量迁移"""
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)
    print("[init] database tables created")


def create_admin_user():
    """创建默认 admin 用户"""
    db = SessionLocal()
    try:
        # 检查是否已存在 admin
        existing = db.query(User).filter(User.username == "admin").first()
        if existing:
            print(f"[init] admin already exists (id={existing.id})")
            return

        admin = User(
            email="admin@bizsim.edu",
            username="admin",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.admin,
            experience=0,
            level=1,
            gold=0,
            diamond=0,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"[init] admin created (id={admin.id}), username=admin password=admin123")
    finally:
        db.close()


def create_demo_student():
    """创建演示学生用户"""
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == "student").first()
        if existing:
            print(f"[init] student already exists (id={existing.id})")
            return

        student = User(
            email="student@bizsim.edu",
            username="student",
            hashed_password=get_password_hash("student123"),
            role=UserRole.student,
            experience=100,
            level=2,
            gold=500,
            diamond=10,
        )
        db.add(student)
        db.commit()
        db.refresh(student)
        print(f"[init] student created (id={student.id}), username=student password=student123")
    finally:
        db.close()


def create_demo_organizer():
    """创建演示组织者（基于admin用户）"""
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            print("[init] admin missing, skip organizer profile")
            return

        existing = db.query(OrganizerProfile).filter(OrganizerProfile.user_id == admin.id).first()
        if existing:
            print(f"[init] organizer profile already exists (id={existing.id})")
            return

        organizer = OrganizerProfile(
            user_id=admin.id,
            organization_name="商域教育平台",
            contact_phone="13800138000",
            verified=True,
        )
        db.add(organizer)
        db.commit()
        db.refresh(organizer)
        print(f"[init] organizer profile created (id={organizer.id})")
    finally:
        db.close()


def create_bot_traders():
    """创建 AI 交易员系统账号（练习局虚拟对手）"""
    db = SessionLocal()
    try:
        bots = ensure_bot_traders(db)
        db.commit()
        print(f"[init] trader bots ready ({len(bots)} accounts)")
    finally:
        db.close()


def init_all():
    """完整初始化"""
    init_database()
    create_admin_user()
    create_demo_student()
    create_bot_traders()
    create_demo_organizer()
    print("[init] database ready")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, ".")
    init_all()
