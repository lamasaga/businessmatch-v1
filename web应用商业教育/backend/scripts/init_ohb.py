"""初始化 OHB 数据表和演示数据"""

import sys
sys.path.insert(0, "D:/1XFAwork/商业模拟比赛架构思考/web应用商业教育/backend")

from app.db.database import engine, Base, SessionLocal
from app.models.ohb import OneCompany, AIEmployee, AITask, CompanyStage, EmployeeStatus, TaskStatus, TaskType


def init_tables():
    """创建 OHB 表"""
    from app.models import ohb
    Base.metadata.create_all(bind=engine)
    print("✅ OHB 表创建完成")


def seed_demo_data():
    """插入演示数据"""
    db = SessionLocal()

    # 检查是否已有数据
    if db.query(OneCompany).first():
        print("⚠️ 演示数据已存在，跳过")
        db.close()
        return

    # 创建演示公司
    company = OneCompany(
        user_id=1,
        name="智创未来",
        slug="zhichuang-weilai-demo",
        description="面向大学生的智能学习助手",
        stage=CompanyStage.IDEATE,
        mode="simulation",
        total_revenue=0.0,
        total_cost=500.0,
        business_model_canvas={
            "customer_segments": "大学生群体",
            "value_propositions": "AI驱动的个性化学习路径",
            "channels": "校园推广、小红书、B站",
            "customer_relationships": "社群运营、私域流量",
            "revenue_streams": "会员订阅、课程分销",
            "key_resources": "AI模型、内容库、用户数据",
            "key_activities": "内容生产、算法优化、用户运营",
            "key_partnerships": "高校社团、教育博主",
            "cost_structure": "云服务、内容采购、推广费用"
        }
    )
    db.add(company)
    db.flush()

    # 雇佣 AI 员工
    employees_data = [
        {
            "codename": "BA-01",
            "name": "商业分析师",
            "avatar_emoji": "📊",
            "role_type": "strategist",
            "level": 2,
            "skills": [
                {"name": "市场调研", "level": 4, "category": "core"},
                {"name": "竞品分析", "level": 3, "category": "core"},
                {"name": "数据分析", "level": 3, "category": "core"}
            ]
        },
        {
            "codename": "DEV-01",
            "name": "全栈工程师",
            "avatar_emoji": "💻",
            "role_type": "worker",
            "level": 3,
            "skills": [
                {"name": "React", "level": 5, "category": "core"},
                {"name": "Python", "level": 4, "category": "core"},
                {"name": "数据库设计", "level": 3, "category": "core"}
            ]
        },
        {
            "codename": "DES-01",
            "name": "UI设计师",
            "avatar_emoji": "🎨",
            "role_type": "worker",
            "level": 2,
            "skills": [
                {"name": "Figma", "level": 5, "category": "core"},
                {"name": "品牌设计", "level": 3, "category": "core"},
                {"name": "交互设计", "level": 4, "category": "core"}
            ]
        },
        {
            "codename": "MKT-01",
            "name": "增长黑客",
            "avatar_emoji": "🚀",
            "role_type": "worker",
            "level": 2,
            "skills": [
                {"name": "社媒运营", "level": 4, "category": "core"},
                {"name": "内容营销", "level": 3, "category": "core"},
                {"name": "SEO", "level": 2, "category": "core"}
            ]
        },
    ]

    employee_objs = []
    for data in employees_data:
        emp = AIEmployee(
            company_id=company.id,
            codename=data["codename"],
            name=data["name"],
            avatar_emoji=data["avatar_emoji"],
            role_type=data["role_type"],
            level=data["level"],
            skills=data["skills"],
            personality_prompt=f"You are {data['name']} ({data['codename']}), a {data['role_type']} AI employee."
        )
        db.add(emp)
        employee_objs.append(emp)
    db.flush()

    # 创建示例任务
    tasks_data = [
        {
            "title": "竞品分析报告：时间管理App市场",
            "description": "分析Top 5竞品的功能、定价和差异化策略",
            "task_type": TaskType.RESEARCH,
            "status": TaskStatus.COMPLETED,
            "priority": "high",
            "progress": 100,
            "assignee_id": employee_objs[0].id,
            "student_rating": 4,
        },
        {
            "title": "着陆页UI设计稿",
            "description": "设计产品官网的首页，包含Hero区域、功能介绍和CTA",
            "task_type": TaskType.DESIGN,
            "status": TaskStatus.IN_PROGRESS,
            "priority": "high",
            "progress": 65,
            "assignee_id": employee_objs[2].id,
        },
        {
            "title": "用户注册与登录API开发",
            "description": "实现JWT认证、密码哈希、邮箱验证",
            "task_type": TaskType.CODE,
            "status": TaskStatus.PENDING,
            "priority": "urgent",
            "progress": 0,
            "assignee_id": employee_objs[1].id,
        },
        {
            "title": "小红书推广文案 x 10篇",
            "description": "针对大学生群体的学习痛点，撰写10篇引流文案",
            "task_type": TaskType.COPYWRITING,
            "status": TaskStatus.PENDING,
            "priority": "normal",
            "progress": 0,
            "assignee_id": employee_objs[3].id,
        },
    ]

    for data in tasks_data:
        task = AITask(
            company_id=company.id,
            assignee_id=data["assignee_id"],
            title=data["title"],
            description=data["description"],
            task_type=data["task_type"],
            status=data["status"],
            priority=data["priority"],
            progress=data["progress"],
            student_rating=data.get("student_rating"),
        )
        db.add(task)

    # 更新员工状态
    employee_objs[0].status = EmployeeStatus.IDLE  # BA-01 已完成任务
    employee_objs[2].status = EmployeeStatus.BUSY   # DES-01 工作中
    employee_objs[1].status = EmployeeStatus.IDLE   # DEV-01 待机
    employee_objs[3].status = EmployeeStatus.IDLE   # MKT-01 待机

    db.commit()
    db.close()
    print(f"✅ 演示数据创建完成：1家公司 + {len(employees_data)}名员工 + {len(tasks_data)}个任务")


if __name__ == "__main__":
    init_tables()
    seed_demo_data()
    print("🎉 OHB 初始化完成！")
