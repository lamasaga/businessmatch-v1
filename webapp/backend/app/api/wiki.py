"""知识图谱路由 - 提供真实的知识卡片数据"""

import json
import os
from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.api.auth import get_current_active_user
from app.models.user import User
from app.core.response import ApiResponse, BusinessException, ErrorCode

router = APIRouter(prefix="/wiki", tags=["知识图谱"])

# Load real knowledge graph data
_DATA_PATH = os.path.join(os.path.dirname(__file__), "../data/knowledge_graph.json")
_WIKI_ARTICLES: list[dict] = []
_KNOWLEDGE_GRAPH: dict = {"nodes": [], "edges": []}


def _load_data():
    global _WIKI_ARTICLES, _KNOWLEDGE_GRAPH
    if os.path.exists(_DATA_PATH):
        with open(_DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        _WIKI_ARTICLES = data.get("nodes", [])
        _KNOWLEDGE_GRAPH = data
    else:
        # Fallback to empty
        _WIKI_ARTICLES = []
        _KNOWLEDGE_GRAPH = {"nodes": [], "edges": []}


_load_data()

# Category mapping from file paths
def _get_category_map():
    cats = {}
    for a in _WIKI_ARTICLES:
        d = a.get("discipline", "其他")
        c = a.get("category", "其他")
        if d not in cats:
            cats[d] = set()
        cats[d].add(c)
    return {k: sorted(list(v)) for k, v in cats.items()}


@router.get("/articles", response_model=ApiResponse[list])
def get_articles(
    discipline: Optional[str] = Query(None, description="学科筛选：经济学/商学/管理学"),
    category: Optional[str] = Query(None, description="分类筛选"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    current_user: User = Depends(get_current_active_user),
):
    """获取知识卡片列表，支持学科、分类和搜索筛选"""
    result = _WIKI_ARTICLES.copy()
    if discipline:
        result = [a for a in result if a.get("discipline") == discipline]
    if category:
        result = [a for a in result if a.get("category") == category]
    if search:
        s = search.lower()
        result = [
            a for a in result
            if s in a.get("title", "").lower()
            or s in a.get("subtitle", "").lower()
            or s in a.get("definition", "").lower()
            or any(s in t.lower() for t in a.get("tags", []))
        ]
    # Return lightweight fields for list view
    return ApiResponse.ok(data=[
        {
            "id": a["id"],
            "title": a["title"],
            "subtitle": a["subtitle"],
            "category": a["category"],
            "discipline": a["discipline"],
            "tags": a.get("tags", []),
            "difficulty": a.get("difficulty", 1),
        }
        for a in result
    ])


@router.get("/articles/{article_id}", response_model=ApiResponse[dict])
def get_article(article_id: str, current_user: User = Depends(get_current_active_user)):
    """获取单张知识卡片详情"""
    article = next((a for a in _WIKI_ARTICLES if a["id"] == article_id), None)
    if not article:
        raise BusinessException(
            message="知识卡片不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=404,
        )
    # Enrich with related cards info
    enriched = dict(article)
    prereq_ids = article.get("prerequisites", [])
    ext_ids = article.get("extensions", [])
    enriched["related_cards"] = [
        {"id": a["id"], "title": a["title"], "discipline": a["discipline"]}
        for a in _WIKI_ARTICLES
        if a["id"] in prereq_ids or a["id"] in ext_ids
    ]
    return ApiResponse.ok(data=enriched)


@router.get("/graph", response_model=ApiResponse[dict])
def get_graph(current_user: User = Depends(get_current_active_user)):
    """获取完整知识关联图谱数据（节点+边）"""
    return ApiResponse.ok(data=_KNOWLEDGE_GRAPH)


@router.get("/disciplines", response_model=ApiResponse[dict])
def get_disciplines(current_user: User = Depends(get_current_active_user)):
    """获取学科与分类结构"""
    return ApiResponse.ok(data=_get_category_map())
