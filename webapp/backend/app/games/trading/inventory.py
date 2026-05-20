"""库存规则 — 每种商品独立上限（浮生记式堆叠，非全局格位）"""

from __future__ import annotations

from typing import Mapping


def product_inventory_limit(config: dict | None) -> int:
    cfg = config or {}
    # 新字段优先；旧字段 inventory_limit 在 v1.1 起语义改为「单品种上限」
    return int(cfg.get("inventory_limit_per_product") or cfg.get("inventory_limit", 99))


def inventory_total(items: Mapping[str, int] | None) -> int:
    if not items:
        return 0
    return sum(int(q) for q in items.values())


def can_add_product(inventory: Mapping[str, int] | None, product_id: str, quantity: int, config: dict | None) -> bool:
    limit = product_inventory_limit(config)
    current = int((inventory or {}).get(product_id, 0))
    return current + quantity <= limit


def inventory_capacity_hint(inventory: Mapping[str, int] | None, config: dict | None) -> dict:
    limit = product_inventory_limit(config)
    inv = inventory or {}
    return {
        "limit_per_product": limit,
        "total_items": inventory_total(inv),
        "by_product": {pid: {"quantity": int(qty), "remaining": max(0, limit - int(qty))} for pid, qty in inv.items()},
    }
