"""调试数据收集器 — 在引擎关键节点记录中间值"""

from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class DebugCollector:
    """收集一场沙盒运行的调试数据"""

    logs: List[Dict[str, Any]] = field(default_factory=list)
    step_index: int = 0

    def record_step(
        self,
        step_type: str,           # "tick" / "round" / "price_calc" / "ai_decision" / "event"
        step_number: int,
        data: Dict[str, Any],
    ):
        """记录一步调试数据"""
        self.logs.append({
            "index": len(self.logs),
            "step_type": step_type,
            "step_number": step_number,
            "timestamp": _now_iso(),
            "data": data,
        })

    def record_price_calc(
        self,
        step_number: int,
        city: str,
        product_id: str,
        base_price: int,
        buy_qty: int,
        sell_qty: int,
        net_demand: int,
        pressure: float,
        demand_factor: float,
        final_price: int,
        narrative_events: List[Dict] = None,
    ):
        """记录价格计算过程"""
        self.record_step("price_calc", step_number, {
            "city": city,
            "product_id": product_id,
            "base_price": base_price,
            "buy_qty": buy_qty,
            "sell_qty": sell_qty,
            "net_demand": net_demand,
            "pressure": pressure,
            "demand_factor": demand_factor,
            "final_price": final_price,
            "narrative_events": narrative_events or [],
        })

    def record_ai_decision(
        self,
        step_number: int,
        ai_name: str,
        ai_level: str,
        decision: Dict[str, Any],
        reasoning: str = "",
        city: str = "",
        cash: int = 0,
        inventory: Dict[str, int] = None,
        expected_profit: int = 0,
        confidence: float = 0.0,
    ):
        """记录 AI 决策及其理由"""
        self.record_step("ai_decision", step_number, {
            "ai_name": ai_name,
            "ai_level": ai_level,
            "decision": decision,
            "reasoning": reasoning,
            "city": city,
            "cash": cash,
            "inventory": inventory or {},
            "expected_profit": expected_profit,
            "confidence": round(confidence, 2),
        })

    def record_event(
        self,
        step_number: int,
        event: Dict[str, Any],
        affected_cities: List[str] = None,
        affected_products: List[str] = None,
    ):
        """记录随机事件触发"""
        self.record_step("event", step_number, {
            "event": event,
            "affected_cities": affected_cities or [],
            "affected_products": affected_products or [],
        })

    def record_world_state(
        self,
        step_number: int,
        prices: Dict[str, Dict[str, int]],
        standings: List[Dict[str, Any]] = None,
    ):
        """记录每步结束后的世界快照"""
        self.record_step("world_state", step_number, {
            "prices": prices,
            "standings": standings or [],
        })

    def get_logs(self, step_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取调试日志，可按类型过滤"""
        if step_type:
            return [log for log in self.logs if log["step_type"] == step_type]
        return list(self.logs)

    def get_summary(self) -> Dict[str, Any]:
        """获取调试数据摘要"""
        return {
            "total_logs": len(self.logs),
            "by_type": self._count_by_type(),
        }

    def _count_by_type(self) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for log in self.logs:
            t = log["step_type"]
            counts[t] = counts.get(t, 0) + 1
        return counts

    def clear(self):
        self.logs = []
        self.step_index = 0


def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()
