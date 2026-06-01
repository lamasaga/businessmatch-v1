"""拟真城市内容包加载烟测"""

from app.domains.cybercore.registry import get_game_config
from app.domains.cybercore.world_loader import load_region, merge_world_into_game_config


def test_load_yangtze_6_region():
    region = load_region("yangtze_6")
    assert region["id"] == "yangtze_6"
    assert len(region["cities"]) == 6
    assert "shanghai" in region["cities"]


def test_fstrading_uses_real_cities():
    get_game_config.cache_clear()
    doc = get_game_config("fstrading")
    assert "shanghai" in doc.cities
    assert doc.cities["shanghai"]["name"] == "上海市"
    assert "jingcheng" not in doc.cities
    assert doc.defaults["cities"][0] == "nanjing"
    assert "shanghai-suzhou" in doc.routes


def test_merge_world_noop_without_region():
    raw = {"defaults": {"cities": ["foo"]}, "cities": {"foo": {"name": "Foo"}}}
    out = merge_world_into_game_config(raw)
    assert out["cities"]["foo"]["name"] == "Foo"
