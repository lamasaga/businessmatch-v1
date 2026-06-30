"""RTS 指令展示文案 — 供 API 与结算摘要使用"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.games.trading.rts_config import city_catalog, product_catalog, vehicle_defs

_ACTION_LABELS = {
    "buy": "买入",
    "sell": "卖出",
    "move": "发车",
    "buy_vehicle": "购车",
    "set_distributor": "设分销",
    "hold": "待命",
}

_VEHICLE_LABELS = {
    "van": "小货车",
    "truck": "大卡车",
}


def product_name(config: dict, config_id: str, product_id: str) -> str:
    return product_catalog(config, config_id).get(product_id, {}).get("name", product_id)


def city_name(config: dict, config_id: str, city_id: str) -> str:
    return city_catalog(config, config_id).get(city_id, {}).get("name", city_id)


def format_pending_action(
    action: dict,
    *,
    config: dict,
    config_id: str,
    snapshot: Optional[dict] = None,
    city: Optional[str] = None,
) -> dict:
    """将排队指令格式化为前端可展示结构。"""
    atype = str(action.get("action_type") or "hold")
    payload = action.get("payload") or {}
    label = _ACTION_LABELS.get(atype, atype)
    detail = ""
    estimate_cash: Optional[int] = None

    if atype == "buy":
        pid = payload.get("product_id", "")
        qty = int(payload.get("quantity") or 0)
        pname = product_name(config, config_id, pid)
        detail = f"{pname} ×{qty}"
        if snapshot and city and pid:
            row = (snapshot.get(city) or {}).get(pid)
            ask = int(row.get("ask", 0)) if isinstance(row, dict) else int(row or 0)
            if ask > 0:
                estimate_cash = -ask * qty
    elif atype == "sell":
        pid = payload.get("product_id", "")
        qty = int(payload.get("quantity") or 0)
        pname = product_name(config, config_id, pid)
        detail = f"{pname} ×{qty}"
        if snapshot and city and pid:
            row = (snapshot.get(city) or {}).get(pid)
            bid = int(row.get("bid", 0)) if isinstance(row, dict) else int(row or 0) * 0.92
            if bid > 0:
                estimate_cash = bid * qty
    elif atype == "move":
        to_id = payload.get("to_city", "")
        detail = f"前往 {city_name(config, config_id, to_id)}"
    elif atype == "buy_vehicle":
        vtype = payload.get("vehicle_type", "")
        defs = vehicle_defs(config, config_id)
        vlabel = defs.get(vtype, {}).get("name") or _VEHICLE_LABELS.get(vtype, vtype)
        detail = str(vlabel)
        estimate_cash = -int(defs.get(vtype, {}).get("cost", 0))
    elif atype == "set_distributor":
        pid = payload.get("product_id", "")
        side = "收购" if payload.get("side") == "buy" else "出货"
        detail = f"{side} {product_name(config, config_id, pid)}"

    return {
        "action_type": atype,
        "label": label,
        "detail": detail,
        "estimate_cash_delta": estimate_cash,
        "payload": payload,
    }


def format_digest_entry(entry: dict, *, config: dict, config_id: str) -> str:
    atype = entry.get("action_type", "")
    payload = entry.get("payload") or {}
    ok = bool(entry.get("ok"))
    cash_delta = float(entry.get("cash_delta") or 0)
    prefix = "✓" if ok else "✗"
    base = format_pending_action(
        {"action_type": atype, "payload": payload},
        config=config,
        config_id=config_id,
    )
    line = f"{prefix} {base['label']} {base['detail']}".strip()
    if ok and abs(cash_delta) >= 1:
        sign = "+" if cash_delta > 0 else ""
        line += f" ({sign}{int(round(cash_delta)):,} 现金)"
    elif not ok:
        line += f" — {entry.get('message', '未执行')}"
    return line


def build_digest_summary(entries: List[dict], *, config: dict, config_id: str) -> List[str]:
    return [format_digest_entry(e, config=config, config_id=config_id) for e in entries]
