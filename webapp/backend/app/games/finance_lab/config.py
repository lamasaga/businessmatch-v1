"""FIN YAML 配置加载 — 占位"""

from functools import lru_cache
from pathlib import Path
from typing import Any
import yaml

_CONFIG_DIR = Path(__file__).resolve().parents[3] / "content" / "game-configs"


@lru_cache(maxsize=4)
def load_fin_config(config_id: str = "finance-lab-v1") -> dict[str, Any]:
    path = _CONFIG_DIR / f"{config_id}.yaml"
    if not path.is_file():
        raise KeyError(f"FIN config not found: {{config_id}}")
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def get_cfg(config_id: str = "finance-lab-v1") -> dict[str, Any]:
    return load_fin_config(config_id)
