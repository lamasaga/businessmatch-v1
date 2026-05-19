"""课程路由"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.api.auth import get_current_active_user
from app.models.user import User
from app.core.response import ApiResponse

router = APIRouter(prefix="/courses", tags=["课程"])

COURSES = [
    {
        "id": "1",
        "title": "国富论入门：从分工到财富",
        "description": "以亚当·斯密的经典著作为线索，通过游戏化体验理解劳动分工、工资决定与财富积累的基本原理",
        "price": 99,
        "original_price": 199,
        "thumbnail": "📚",
        "category": "经济学基础",
        "tags": ["国富论", "斯密", "分工"],
        "instructor": "经济学教研组",
        "rating": 4.8,
        "student_count": 1250,
        "lesson_count": 12,
        "duration": 360,
        "level": "入门",
    },
    {
        "id": "2",
        "title": "商业模拟实战：回合制策略",
        "description": "完整体验回合制策略商赛，学习资源分配、战略预判与博弈推理",
        "price": 149,
        "category": "商赛实战",
        "tags": ["策略", "博弈", "决策"],
        "instructor": "商赛教练团队",
        "rating": 4.9,
        "student_count": 890,
        "lesson_count": 8,
        "duration": 240,
        "level": "中级",
    },
    {
        "id": "3",
        "title": "创业生存：现金流管理",
        "description": "模拟真实创业环境，理解现金流为王的核心法则，训练风险意识与危机决策",
        "price": 129,
        "category": "创业管理",
        "tags": ["现金流", "创业", "风险"],
        "instructor": "创业导师",
        "rating": 4.7,
        "student_count": 650,
        "lesson_count": 10,
        "duration": 300,
        "level": "中级",
    },
    {
        "id": "4",
        "title": "博弈论基础与商业应用",
        "description": "从囚徒困境到纳什均衡，理解博弈论在商业竞争中的核心应用",
        "price": 199,
        "original_price": 299,
        "thumbnail": "♟️",
        "category": "经济学基础",
        "tags": ["博弈论", "竞争", "策略"],
        "instructor": "数学建模团队",
        "rating": 4.9,
        "student_count": 2100,
        "lesson_count": 15,
        "duration": 450,
        "level": "进阶",
    },
    {
        "id": "5",
        "title": "ESG 与可持续经营",
        "description": "引入环保、社会、治理三维指标，理解可持续发展与商业成功的共生关系",
        "price": 179,
        "thumbnail": "🌱",
        "category": "ESG 专题",
        "tags": ["ESG", "可持续", "伦理"],
        "instructor": "ESG 研究中心",
        "rating": 4.6,
        "student_count": 420,
        "lesson_count": 12,
        "duration": 360,
        "level": "进阶",
    },
    {
        "id": "6",
        "title": "宏观经济沙盘推演",
        "description": "作为央行行长调控经济，理解通胀、紧缩、政策工具对微观企业的影响",
        "price": 159,
        "thumbnail": "🌊",
        "category": "宏观经济学",
        "tags": ["宏观", "政策", "周期"],
        "instructor": "宏观经济学组",
        "rating": 4.8,
        "student_count": 780,
        "lesson_count": 10,
        "duration": 300,
        "level": "进阶",
    },
]


@router.get("", response_model=ApiResponse[list])
def get_courses(
    category: Optional[str] = Query(None, description="课程分类"),
    level: Optional[str] = Query(None, description="难度等级"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    current_user: User = Depends(get_current_active_user),
):
    """获取课程列表，支持分类、等级和搜索筛选"""
    result = COURSES.copy()
    if category and category != "全部":
        result = [c for c in result if c["category"] == category]
    if level and level != "全部":
        result = [c for c in result if c["level"] == level]
    if search:
        s = search.lower()
        result = [c for c in result if s in c["title"].lower() or s in c["description"].lower()]
    return ApiResponse.ok(data=result)


@router.get("/{course_id}", response_model=ApiResponse[dict])
def get_course(course_id: str, current_user: User = Depends(get_current_active_user)):
    """获取单个课程详情"""
    course = next((c for c in COURSES if c["id"] == course_id), None)
    if not course:
        from app.core.response import BusinessException, ErrorCode
        raise BusinessException(
            message="课程不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=404,
        )
    return ApiResponse.ok(data=course)
