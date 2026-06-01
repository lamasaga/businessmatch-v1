"""拟真城市内容包 — 赛制加载时只读合并（Phase B，无 World 域表）"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

import yaml

_WORLD_DIR = Path(__file__).resolve().parents[3] / "content" / "world"


def _load_yaml(path: Path) -> Dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError(f"world content not found: {path}")
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"world YAML must be a mapping: {path}")
    return data


def load_region(region_id: str) -> Dict[str, Any]:
    return _load_yaml(_WORLD_DIR / "regions" / f"{region_id}.yaml")


def load_city(city_id: str) -> Dict[str, Any]:
    return _load_yaml(_WORLD_DIR / "cities" / f"{city_id}.yaml")


def city_to_engine_entry(city_data: Dict[str, Any]) -> Dict[str, Any]:
    """Strip world-only keys; ensure engine `name` field."""
    entry = dict(city_data)
    display = entry.get("display_name") or entry.get("name") or entry.get("city_id")
    entry.setdefault("name", display)
    for key in ("city_id", "display_name", "sim_scale", "display_population", "meta", "pop_segments"):
        entry.pop(key, None)
    return entry


def merge_world_into_game_config(raw: Dict[str, Any]) -> Dict[str, Any]:
    """If defaults.world.region_id is set, inject cities/routes from content/world/."""
    defaults = raw.setdefault("defaults", {})
    world_ref = defaults.get("world") or {}
    region_id = world_ref.get("region_id")
    if not region_id:
        return raw

    region = load_region(region_id)
    city_ids: List[str] = list(region.get("cities") or [])
    if not city_ids:
        raise ValueError(f"region {region_id} has empty cities list")

    cities: Dict[str, Dict[str, Any]] = {}
    for cid in city_ids:
        cities[cid] = city_to_engine_entry(load_city(cid))

    raw["cities"] = cities
    raw["routes"] = dict(region.get("routes") or {})
    defaults["cities"] = city_ids

    region_defaults = region.get("defaults") or {}
    logistics = dict(defaults.get("logistics") or {})
    if region_defaults.get("min_travel_ticks") is not None:
        logistics.setdefault("min_travel_ticks", region_defaults["min_travel_ticks"])
    if logistics:
        defaults["logistics"] = logistics

    meta = raw.setdefault("meta", {})
    meta.setdefault("world_region_id", region_id)
    meta.setdefault(
        "world_pack_version",
        (region.get("meta") or {}).get("world_pack_version"),
    )
    return raw
