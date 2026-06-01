"""拟真城市内容包 — 赛制加载时只读合并（Phase B，无 World 域表）"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

_WORLD_DIR = Path(__file__).resolve().parents[3] / "content" / "world"
_GEO_DIR = _WORLD_DIR / "geo"


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


def load_geo_anchors(region_id: str) -> Dict[str, Dict[str, Any]]:
    path = _GEO_DIR / region_id / "anchors.yaml"
    if not path.is_file():
        return {}
    data = _load_yaml(path)
    return dict(data.get("cities") or {})


def load_geo_manifest(region_id: str) -> Dict[str, Any]:
    path = _GEO_DIR / region_id / "manifest.yaml"
    if not path.is_file():
        return {"region_id": region_id, "geo_pack_version": "0.0.0"}
    return _load_yaml(path)


def city_to_engine_entry(
    city_data: Dict[str, Any],
    anchor: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """L2 母本 → FStrading 引擎可读条目（保留产业/物流/地理锚点）。"""
    display = city_data.get("display_name") or city_data.get("name") or city_data.get("city_id")
    entry: Dict[str, Any] = {
        "name": display,
        "type": city_data.get("type"),
        "description": city_data.get("description"),
        "production": dict(city_data.get("production") or {}),
        "consumption": dict(city_data.get("consumption") or {}),
        "demographics": dict(city_data.get("demographics") or {}),
        "demand_profile": dict(city_data.get("demand_profile") or {}),
        "logistics": dict(city_data.get("logistics") or {}),
    }
    if city_data.get("population") is not None:
        entry["population"] = city_data["population"]
    if city_data.get("display_population") is not None:
        entry["display_population"] = city_data["display_population"]
    if anchor:
        entry["geo"] = {
            "lng": float(anchor["lng"]),
            "lat": float(anchor["lat"]),
            "label_offset": list(anchor.get("label_offset") or [0, 0]),
        }
    return entry


def build_routes_edges(routes: Dict[str, Any]) -> List[Dict[str, Any]]:
    edges: List[Dict[str, Any]] = []
    for key, val in (routes or {}).items():
        if not isinstance(val, dict) or "-" not in key:
            continue
        a, b = key.split("-", 1)
        edges.append({
            "edge_id": key,
            "from_city": a,
            "to_city": b,
            "base_travel_ticks": int(val.get("base_travel_ticks", 3)),
            "move_cost": int(val.get("move_cost", 800)),
        })
    return edges


def build_cities_catalog(
    city_ids: List[str],
    anchors: Dict[str, Dict[str, Any]],
) -> List[Dict[str, Any]]:
    catalog: List[Dict[str, Any]] = []
    for cid in city_ids:
        raw = load_city(cid)
        anchor = anchors.get(cid) or {}
        engine = city_to_engine_entry(raw, anchor or None)
        geo = engine.get("geo")
        catalog.append({
            "city_id": cid,
            "name": raw.get("display_name") or raw.get("name") or cid,
            "type": raw.get("type"),
            "description": raw.get("description"),
            "hub": bool((raw.get("logistics") or {}).get("hub")),
            "display_population": raw.get("display_population"),
            "geo": geo,
        })
    return catalog


def load_trade_slice(region_id: str) -> Dict[str, Any]:
    """完整贸易切片：城母本 + 区域路网 + 地理 manifest（供 API / 预加载）。"""
    region = load_region(region_id)
    city_ids: List[str] = list(region.get("cities") or [])
    anchors = load_geo_anchors(region_id)
    manifest = load_geo_manifest(region_id)
    return {
        "region_id": region_id,
        "world_pack_version": (region.get("meta") or {}).get("world_pack_version"),
        "geo_pack_version": manifest.get("geo_pack_version"),
        "hub_cities": list(region.get("hub_cities") or []),
        "cities": build_cities_catalog(city_ids, anchors),
        "routes": build_routes_edges(region.get("routes") or {}),
        "geo": {
            "bbox": manifest.get("bbox"),
            "projection": manifest.get("projection"),
            "stage_aspect": manifest.get("stage_aspect"),
            "assets": dict(manifest.get("assets") or {}),
            "attribution": list(manifest.get("attribution") or []),
        },
    }


def load_geo_pack(region_id: str) -> Dict[str, Any]:
    """地理包 manifest + 锚点 + 边（地图层专用，不含 POP 深字段）。"""
    slice_doc = load_trade_slice(region_id)
    return {
        "region_id": slice_doc["region_id"],
        "geo_pack_version": slice_doc.get("geo_pack_version"),
        "world_pack_version": slice_doc.get("world_pack_version"),
        "bbox": slice_doc["geo"]["bbox"],
        "projection": slice_doc["geo"]["projection"],
        "stage_aspect": slice_doc["geo"]["stage_aspect"],
        "assets": slice_doc["geo"]["assets"],
        "attribution": slice_doc["geo"]["attribution"],
        "cities": slice_doc["cities"],
        "routes": slice_doc["routes"],
    }


def trade_slice_for_match(
    match_config: Dict[str, Any],
    config_id: str = "fstrading",
) -> Dict[str, Any]:
    region_id = (match_config.get("world") or {}).get("region_id")
    if not region_id:
        from app.domains.cybercore.registry import get_game_config

        region_id = (get_game_config(config_id).meta or {}).get("world_region_id")
    if not region_id:
        return {}
    out = load_trade_slice(str(region_id))
    out["behavior_pack"] = (match_config.get("world") or {}).get("behavior_pack")
    return out


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

    anchors = load_geo_anchors(region_id)
    cities: Dict[str, Dict[str, Any]] = {}
    for cid in city_ids:
        cities[cid] = city_to_engine_entry(load_city(cid), anchors.get(cid))

    raw["cities"] = cities
    raw["routes"] = dict(region.get("routes") or {})
    defaults["cities"] = city_ids
    defaults["hub_cities"] = list(region.get("hub_cities") or [])

    region_defaults = region.get("defaults") or {}
    logistics = dict(defaults.get("logistics") or {})
    if region_defaults.get("min_travel_ticks") is not None:
        logistics.setdefault("min_travel_ticks", region_defaults["min_travel_ticks"])
    if logistics:
        defaults["logistics"] = logistics

    meta = raw.setdefault("meta", {})
    geo_manifest = load_geo_manifest(region_id)
    meta.setdefault("world_region_id", region_id)
    meta.setdefault(
        "world_pack_version",
        (region.get("meta") or {}).get("world_pack_version"),
    )
    meta.setdefault("geo_pack_version", geo_manifest.get("geo_pack_version"))
    return raw
