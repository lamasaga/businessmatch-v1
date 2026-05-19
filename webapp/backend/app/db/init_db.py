"""数据库初始化脚本 - 创建表 + 插入默认 admin 用户"""

from app.db.database import Base, engine, SessionLocal
from app.models.user import User, UserRole
from app.models.ohb import OneCompany, AIEmployee, AITask
from app.models.trading_competition import OrganizerProfile
from app.core.security import get_password_hash


def init_database():
    """创建所有数据表"""
    Base.metadata.create_all(bind=engine)
    print("✅ 数据库表创建完成")


def create_admin_user():
    """创建默认 admin 用户"""
    db = SessionLocal()
    try:
        # 检查是否已存在 admin
        existing = db.query(User).filter(User.username == "admin").first()
        if existing:
            print(f"⚠️ admin 用户已存在 (id={existing.id})")
            return

        admin = User(
            email="admin@bizsim.edu",
            username="admin",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.admin,
            experience=0,
            level=1,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"✅ admin 用户创建成功 (id={admin.id})")
        print("   用户名: admin")
        print("   密码: admin123")
        print("   邮箱: admin@bizsim.edu")
    finally:
        db.close()


def create_demo_student():
    """创建演示学生用户"""
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == "student").first()
        if existing:
            print(f"⚠️ student 用户已存在 (id={existing.id})")
            return

        student = User(
            email="student@bizsim.edu",
            username="student",
            hashed_password=get_password_hash("student123"),
            role=UserRole.student,
            experience=100,
            level=2,
        )
        db.add(student)
        db.commit()
        db.refresh(student)
        print(f"✅ student 用户创建成功 (id={student.id})")
        print("   用户名: student")
        print("   密码: student123")
    finally:
        db.close()


def create_demo_organizer():
    """创建演示组织者（基于admin用户）"""
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            print("⚠️ admin 用户不存在，跳过创建组织者")
            return

        existing = db.query(OrganizerProfile).filter(OrganizerProfile.user_id == admin.id).first()
        if existing:
            print(f"⚠️ organizer 档案已存在 (id={existing.id})")
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
        print(f"✅ organizer 档案创建成功 (id={organizer.id})")
        print("   机构: 商域教育平台")
        print("   关联用户: admin")
    finally:
        db.close()


def init_all():
    """完整初始化"""
    init_database()
    create_admin_user()
    create_demo_student()
    create_demo_organizer()
    print("\n🎉 数据库初始化完成！")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, ".")
    init_all()
