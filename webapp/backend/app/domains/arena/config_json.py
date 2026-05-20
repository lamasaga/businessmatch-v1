"""ArenaMatch.config JSON 持久化 — 避免就地修改不被 SQLAlchemy 跟踪"""

from __future__ import annotations

import copy
from typing import Any, Dict

from sqlalchemy.orm.attributes import flag_modified

from app.domains.arena.models import ArenaMatch


def persist_match_config(event: ArenaMatch, config: Dict[str, Any]) -> None:
    """写入并标记 config 列已变更（RTS tick / 排队指令 / 玩家状态依赖此项）。"""
    event.config = copy.deepcopy(config)
    flag_modified(event, "config")
