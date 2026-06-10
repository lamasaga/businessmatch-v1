"""OPS 配置读取与辅助函数"""

from __future__ import annotations

import math
import random
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

_CONFIG_DIR = Path(__file__).resolve().parents[3] / "content" / "game-configs"


@lru_cache(maxsize=4)
def load_ops_config(config_id: str = "ops-sim-v1") -> dict[str, Any]:
    path = _CONFIG_DIR / f"{config_id}.yaml"
    if not path.is_file():
        raise KeyError(f"OPS config not found: {config_id}")
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def get_cfg(config_id: str = "ops-sim-v1") -> dict[str, Any]:
    return load_ops_config(config_id)


def V(key: str, cfg: dict[str, Any] | None = None, default: Any = None) -> Any:
    if cfg is None:
        cfg = get_cfg()
    if key in cfg:
        return cfg[key]
    return cfg.get("defaults", {}).get(key, default)


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def softmax(beta: float, utilities: dict[str, float]) -> dict[str, float]:
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
    return {uid: (exp_vals[uid] / total if total > 0 else 1.0 / len(ids)) for uid in ids}


def seeded_random(seed_text: str) -> random.Random:
    return random.Random(hash(seed_text) % (2**32))


def city_tier_multiplier(tier: int) -> float:
    return {1: 2.0, 2: 1.5, 3: 1.0, 4: 0.6}.get(tier, 1.0)
