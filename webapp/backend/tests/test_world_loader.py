"""拟真城市内容包加载烟测"""

from app.domains.cybercore.registry import get_game_config
from app.domains.cybercore.world_loader import (
    load_geo_pack,
    load_region,
    load_trade_slice,
    merge_world_into_game_config,
)
from app.games.trading.world_slice import edge_move_cost, route_exists


def test_load_yangtze_6_region():
    region = load_region("yangtze_6")
    assert region["id"] == "yangtze_6"
    assert len(region["cities"]) == 6
    assert "shanghai" in region["cities"]
    assert "shanghai" in region["hub_cities"]


def test_fstrading_uses_real_cities():
    get_game_config.cache_clear()
    doc = get_game_config("fstrading")
    assert "shanghai" in doc.cities
    assert doc.cities["shanghai"]["name"] == "上海市"
    assert doc.cities["shanghai"].get("geo", {}).get("lng") == 121.4737
    assert "jingcheng" not in doc.cities
    assert doc.defaults["cities"][0] == "nanjing"
    assert "shanghai-suzhou" in doc.routes
    assert doc.defaults.get("hub_cities") == ["shanghai", "suzhou"]


def test_merge_world_noop_without_region():
    raw = {"defaults": {"cities": ["foo"]}, "cities": {"foo": {"name": "Foo"}}}
    out = merge_world_into_game_config(raw)
    assert out["cities"]["foo"]["name"] == "Foo"


def test_trade_slice_geo_pack():
    slice_doc = load_trade_slice("yangtze_6")
    assert slice_doc["region_id"] == "yangtze_6"
    assert len(slice_doc["cities"]) == 6
    sh = next(c for c in slice_doc["cities"] if c["city_id"] == "shanghai")
    assert sh["geo"]["lng"] == 121.4737
    assert sh["hub"] is True
    assert any(e["edge_id"] == "shanghai-suzhou" for e in slice_doc["routes"])


def test_load_geo_pack_assets():
    pack = load_geo_pack("yangtze_6")
    assert pack["projection"] == "equirectangular"
    assert "basemap_schematic" in pack["assets"]


def test_route_exists_and_edge_cost():
    routes = {
        "shanghai-suzhou": {"base_travel_ticks": 2, "move_cost": 600},
    }
    assert route_exists("shanghai", "suzhou", routes)
    assert not route_exists("shanghai", "nanjing", routes)
    assert edge_move_cost("shanghai", "suzhou", routes, 800) == 600
    assert edge_move_cost("shanghai", "nanjing", routes, 800) == 800
