"""赛制配置注册表 — 从 content/game-configs 加载"""

from functools import lru_cache
from pathlib import Path
from typing import Dict, List

import yaml

from app.domains.cybercore.types import GameConfigDocument
from app.domains.cybercore.world_loader import merge_world_into_game_config

_CONFIG_DIR = Path(__file__).resolve().parents[3] / "content" / "game-configs"

# 已废弃赛制包 id → 唯一 trading 配置 fstrading（兼容存量对局）
_CONFIG_ALIASES: Dict[str, str] = {
    "trading-v1": "fstrading",
    "trading-v2-rts": "fstrading",
}


def _resolve_config_id(config_id: str) -> str:
    return _CONFIG_ALIASES.get(config_id, config_id)


@lru_cache(maxsize=32)
def get_game_config(config_id: str) -> GameConfigDocument:
    config_id = _resolve_config_id(config_id)
    path = _CONFIG_DIR / f"{config_id}.yaml"
    if not path.is_file():
        raise KeyError(f"game config not found: {config_id}")
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    raw = merge_world_into_game_config(raw)
    return GameConfigDocument.model_validate(raw)


def list_game_configs() -> List[Dict[str, str]]:
    items = []
    for p in sorted(_CONFIG_DIR.glob("*.yaml")):
        doc = get_game_config(p.stem)
        items.append({
            "id": doc.id,
            "engine": doc.engine,
            "design_mode": doc.design_mode,
            "name": doc.meta.get("name", doc.id),
        })
    return items


def get_products_and_cities(config_id: str):
    doc = get_game_config(config_id)
    return doc.products, doc.cities, doc.event_types
