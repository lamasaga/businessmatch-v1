"""TechVenture v6 配置读取与辅助函数。

引擎专属参数直接从 YAML 读取（绕过 CyberCore 通用 Pydantic 模型，
因为 consumer_weights / bqi_rules 等属于 TechVenture 独有节）。
通用字段（id / engine / meta / defaults / cities / routes / rewards）
仍由 CyberCore registry 校验。
"""

from __future__ import annotations

import math
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

CITY_IDS: list[str] = ["南京", "合肥", "杭州"]
ROUTE_IDS: list[str] = ["TECH", "USER", "BRAND", "PATHFINDER"]
GROUP_IDS: list[str] = ["geek", "pragmatic", "trendy"]

_CONFIG_DIR = Path(__file__).resolve().parents[3] / "content" / "game-configs"


@lru_cache(maxsize=4)
def load_tv_config(config_id: str = "techventure-v1") -> dict[str, Any]:
    """返回 YAML 文档的完整 dict。"""
    path = _CONFIG_DIR / f"{config_id}.yaml"
    if not path.is_file():
        raise KeyError(f"TechVenture config not found: {config_id}")
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def get_cfg(config_id: str = "techventure-v1") -> dict[str, Any]:
    return load_tv_config(config_id)


def V(key: str, cfg: dict[str, Any] | None = None) -> Any:
    """快速取值：先找顶层 key，再找 defaults[key]。"""
    if cfg is None:
        cfg = get_cfg()
    if key in cfg:
        return cfg[key]
    return cfg.get("defaults", {}).get(key)


# ── 辅助函数（对应 config.ts 导出函数）──────────────────


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def round1(x: float) -> float:
    return round(x, 1)


def round2(x: float) -> float:
    return round(x, 2)


def growth_rate(v: float, cfg: dict[str, Any] | None = None) -> float:
    """g(V)：属性增长率查表。"""
    table = V("growth_rate_table", cfg) or []
    for seg in table:
        if v <= seg["upto"]:
            return seg["rate"]
    return 0.02


def tech_i_eff(invest: float) -> float:
    """等效 Tech 投入（过载衰减的分段积分）。"""
    i = max(0.0, invest)
    if i <= 20:
        return i
    if i <= 30:
        return 20 + 0.80 * (i - 20)
    if i <= 45:
        return 28 + 0.50 * (i - 30)
    if i <= 65:
        return 35.5 + 0.30 * (i - 45)
    return 41.5 + 0.15 * (i - 65)


def pathfinder_m_crowd(n: int, cfg: dict[str, Any] | None = None) -> float:
    """PATHFINDER 独占红利曲线：相邻档线性插值。"""
    if cfg is None:
        cfg = get_cfg()
    curve_raw = cfg.get("routes", {}).get("PATHFINDER", {}).get("crowd_curve", {})
    curve = {int(k): float(v) for k, v in curve_raw.items()}
    keys = sorted(curve.keys())
    if not keys:
        return 1.0
    if n <= keys[0]:
        return curve[keys[0]]
    if n >= keys[-1]:
        return curve[keys[-1]]
    for i in range(len(keys) - 1):
        a, b = keys[i], keys[i + 1]
        if a <= n <= b:
            t = (n - a) / (b - a)
            return curve[a] + t * (curve[b] - curve[a])
    return 1.0


def softmax(beta: float, utilities: dict[str, float]) -> dict[str, float]:
    """Softmax 概率分配。"""
    if not utilities:
        return {}
    ids = list(utilities.keys())
    max_u = max(utilities.values())
    exp_vals: dict[str, float] = {}
    total = 0.0
    for uid in ids:
        e = math.exp(beta * (utilities[uid] - max_u))
        exp_vals[uid] = e
        total += e
    return {uid: (exp_vals[uid] / total if total > 0 else 1 / len(ids)) for uid in ids}
