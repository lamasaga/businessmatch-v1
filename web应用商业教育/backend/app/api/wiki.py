from fastapi import APIRouter, Depends
from typing import List
from app.api.auth import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/wiki", tags=["wiki"])

WIKI_ARTICLES = [
    {
        "id": "wealth-of-nations",
        "title": "《国富论》导读",
        "excerpt": "亚当·斯密的传世之作，奠定了现代经济学的基础。从劳动分工到看不见的手，理解财富的本质...",
        "category": "经济学经典",
        "tags": ["亚当·斯密", "古典经济学", "劳动分工"],
        "viewCount": 3420,
    },
    {
        "id": "division-of-labor",
        "title": "劳动分工理论",
        "excerpt": "斯密以别针厂为例，说明分工如何将日产量从1枚提升到4800枚。理解专业化如何创造效率...",
        "category": "经济学经典",
        "tags": ["效率", "专业化", "生产理论"],
        "viewCount": 2850,
    },
    {
        "id": "wage-theory",
        "title": "工资理论",
        "excerpt": "自然工资与市场工资的决定机制。工资是劳动的报酬，受劳动力供需、生活必需品价格影响...",
        "category": "微观经济学",
        "tags": ["工资", "劳动力市场", "收入分配"],
        "viewCount": 2100,
    },
    {
        "id": "invisible-hand",
        "title": "看不见的手",
        "excerpt": "个人追求私利的行为，如何通过市场机制促进社会整体福利。市场自我调节的哲学基础...",
        "category": "经济学经典",
        "tags": ["市场机制", "自由主义", "福利经济学"],
        "viewCount": 4560,
    },
    {
        "id": "supply-demand",
        "title": "供需法则",
        "excerpt": "市场价格由供给与需求的交点决定。理解弹性、均衡、剩余等核心概念...",
        "category": "微观经济学",
        "tags": ["价格", "市场均衡", "弹性"],
        "viewCount": 3890,
    },
    {
        "id": "nash-equilibrium",
        "title": "纳什均衡",
        "excerpt": "博弈论中的核心概念：在已知他人策略的情况下，没有任何一方能单独改变策略而获得更好结果...",
        "category": "博弈论",
        "tags": ["博弈论", "策略", "均衡"],
        "viewCount": 1950,
    },
]

KNOWLEDGE_GRAPH = {
    "nodes": [
        {"id": "wealth-of-nations", "label": "国富论", "category": "经典"},
        {"id": "division-of-labor", "label": "劳动分工", "category": "生产"},
        {"id": "invisible-hand", "label": "看不见的手", "category": "市场"},
        {"id": "wage-theory", "label": "工资理论", "category": "分配"},
        {"id": "supply-demand", "label": "供需法则", "category": "市场"},
        {"id": "nash-equilibrium", "label": "纳什均衡", "category": "博弈"},
        {"id": "comparative-advantage", "label": "比较优势", "category": "贸易"},
        {"id": "marginal-utility", "label": "边际效用", "category": "消费"},
    ],
    "edges": [
        {"source": "wealth-of-nations", "target": "division-of-labor", "label": "包含"},
        {"source": "wealth-of-nations", "target": "invisible-hand", "label": "包含"},
        {"source": "wealth-of-nations", "target": "wage-theory", "label": "包含"},
        {"source": "division-of-labor", "target": "wage-theory", "label": "影响"},
        {"source": "invisible-hand", "target": "supply-demand", "label": "基础"},
        {"source": "supply-demand", "target": "marginal-utility", "label": "相关"},
        {"source": "nash-equilibrium", "target": "comparative-advantage", "label": "相关"},
    ],
}


@router.get("/articles")
def get_articles(
    category: str = None,
    search: str = None,
    current_user: User = Depends(get_current_active_user),
):
    articles = WIKI_ARTICLES
    if category and category != "全部":
        articles = [a for a in articles if a["category"] == category]
    if search:
        articles = [
            a for a in articles
            if search.lower() in a["title"].lower() or search.lower() in a["excerpt"].lower()
        ]
    return {"success": True, "data": articles}


@router.get("/articles/{article_id}")
def get_article(article_id: str, current_user: User = Depends(get_current_active_user)):
    article = next((a for a in WIKI_ARTICLES if a["id"] == article_id), None)
    if not article:
        return {"success": False, "error": "Article not found"}
    return {"success": True, "data": article}


@router.get("/graph")
def get_graph(current_user: User = Depends(get_current_active_user)):
    return {"success": True, "data": KNOWLEDGE_GRAPH}
