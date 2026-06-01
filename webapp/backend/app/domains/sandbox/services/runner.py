"""沙盒引擎驱动器 — 直接驱动引擎运行，绕过 Arena 完整生命周期"""

import random
from copy import deepcopy
from typing import Any, Dict, List, Optional

from app.domains.cybercore.types import GameConfigDocument
from app.domains.sandbox.models import SandboxRunState, SandboxSession
from app.domains.sandbox.services.debugger import DebugCollector
from app.domains.sandbox.services.ai_engine import AiStrategyEngine, DecisionResult
from app.domains.sandbox.services.market_sim import (
    calculate_equilibrium_prices,
    calculate_market_prices,
    generate_market_events,
)


class SandboxRunner:
    """沙盒运行器：直接驱动游戏引擎，支持 auto / step 模式"""

    def __init__(self, session: SandboxSession):
        self.session = session
        self.debug = DebugCollector()
        self._ai_engine = AiStrategyEngine()
        self._rng_seed: Optional[int] = None

    def setup(self, doc: GameConfigDocument):
        """根据配置初始化沙盒世界"""
        self.session.engine = doc.engine
        config = doc.merged_match_config()
        self.session.world_state = {
            "config": config,
            "products": deepcopy(doc.products),
            "cities": deepcopy(doc.cities),
            "cities_order": list(doc.cities.keys()) if doc.cities else [],
            "vehicles": deepcopy(doc.vehicles) if doc.vehicles else {},
            "routes": deepcopy(doc.routes) if doc.routes else {},
            "event_types": deepcopy(doc.event_types) if doc.event_types else [],
            "rewards": deepcopy(doc.rewards) if doc.rewards else {},
            "participants": [],       # AI 交易员列表
            "prices": {},             # 当前价格快照
            "round_events": [],       # 本回合事件
            "history": [],            # 历史价格
        }

        # 保存原始 doc 配置供 AI 引擎使用
        self.session.world_state["_doc_config"] = doc.model_dump()

        # 根据引擎类型初始化
        if doc.engine == "trading":
            self._setup_trading(doc, config)
        elif doc.engine == "techventure":
            self._setup_techventure(doc, config)

        self.session.run_state = SandboxRunState.idle
        self.session.touch()

    def _setup_trading(self, doc: GameConfigDocument, config: Dict[str, Any]):
        """初始化 FStrading（RTS）沙盒"""
        ws = self.session.world_state
        ws["config_id"] = doc.id
        self.session.step_label = "tick"
        self.session.total_steps = config.get("total_ticks", 120)
        ws["mode"] = "rts"
        ws["tick_interval"] = config.get("tick_interval_sec", 5)
        ws["warmup_ticks"] = config.get("warmup_ticks", 6)
        ws["current_tick"] = 0
        ws["pending_actions"] = []
        ws["phase"] = "warmup"

        # 初始化价格（首回合均衡价）
        cities = ws["cities_order"]
        products = ws["products"]
        cities_meta = ws["cities"]
        prices, meta = calculate_equilibrium_prices(products, cities, cities_meta)
        ws["prices"] = prices
        ws["price_meta"] = meta
        ws["history"].append({"step": 0, "prices": deepcopy(prices)})

        # 初始化 AI 交易员
        ai_count = config.get("practice_ai_count", 3)
        ai_slots = config.get("practice_ai_slots", ["chaotic"] * ai_count)
        ws["participants"] = self._init_ai_traders(ai_count, ai_slots, cities)

        # 初始化玩家
        ws["player"] = {
            "name": "玩家",
            "is_ai": False,
            "cash": config.get("initial_capital", 50000),
            "inventory": {pid: 0 for pid in products},
            "city": cities[0] if cities else "",
            "total_assets": config.get("initial_capital", 50000),
        }

    def _setup_techventure(self, doc: GameConfigDocument, config: Dict[str, Any]):
        """初始化 TechVenture 引擎沙盒（简化版）"""
        ws = self.session.world_state
        self.session.step_label = "round"
        self.session.total_steps = config.get("rounds", 4)
        ws["mode"] = "turn"
        ws["current_round"] = 0
        ws["teams"] = []
        ws["player_team"] = {
            "name": "玩家队伍",
            "route": "TECH",
            "home_city": "city_0",
            "budget": config.get("seed_budget", 100),
            "tech": 2.0,
        }

    def _init_ai_traders(
        self,
        count: int,
        slots: List[str],
        cities: List[str],
    ) -> List[Dict[str, Any]]:
        """初始化 AI 交易员，加载策略配置"""
        names = ["张 traders", "李 merchants", "王 dealers", "赵 brokers", "陈 vendors"]
        traders = []
        ws = self.session.world_state
        initial_cash = ws["config"].get("initial_capital", 50000)
        products = ws["products"]

        # 从 world_state 获取 ai_strategies 配置
        doc_config = ws.get("_doc_config", {})
        ai_strategies = doc_config.get("ai_strategies", {})

        for i in range(min(count, len(names))):
            slot_id = slots[i] if i < len(slots) else "chaotic"
            # 优先使用 ai_strategies 中的配置，否则回退到 ai_levels
            strategy_config = ai_strategies.get(slot_id)
            if not strategy_config:
                # 回退：根据 slot_id 映射到默认策略
                strategy_config = self._fallback_strategy_config(slot_id)

            traders.append({
                "id": f"ai_{i}",
                "name": names[i],
                "is_ai": True,
                "level": slot_id,
                "strategy_config": strategy_config,
                "cash": initial_cash,
                "inventory": {pid: 0 for pid in products},
                "city": random.choice(cities) if cities else "",
                "total_assets": initial_cash,
            })
        return traders

    def _fallback_strategy_config(self, slot_id: str) -> Dict[str, Any]:
        """旧版 slot_id 回退到默认策略配置"""
        if slot_id == "advanced":
            return {
                "name": "精英型",
                "behavior": {"type": "arbitrage", "params": {"min_spread_ratio": 0.1, "risk_appetite": 0.8}},
            }
        return {
            "name": "混乱型",
            "behavior": {"type": "random", "params": {"irrationality": 0.8}},
        }

    # ==================== 运行控制 ====================

    def start(self) -> Dict[str, Any]:
        """开始自动运行"""
        if self.session.run_state == SandboxRunState.finished:
            return {"status": "already_finished", "message": "运行已结束，请重置"}

        self.session.run_state = SandboxRunState.running
        self.session.touch()

        # 沙盒模式下执行一步（前端可轮询或持续调用 step）
        return {
            "status": "started",
            "run_state": self.session.run_state.value,
            "current_step": self.session.current_step,
            "total_steps": self.session.total_steps,
        }

    def step(self) -> Dict[str, Any]:
        """单步推进"""
        if self.session.run_state == SandboxRunState.finished:
            return {"status": "finished", "message": "运行已结束"}

        self.session.run_state = SandboxRunState.running
        self.session.current_step += 1

        ws = self.session.world_state
        if ws.get("mode") == "rts":
            result = self._step_rts()
        else:
            result = {"step": self.session.current_step, "message": "unsupported engine mode"}

        # 检查是否结束
        if self.session.current_step >= self.session.total_steps:
            self.session.run_state = SandboxRunState.finished
            result["finished"] = True

        self.session.touch()
        return result

    def pause(self) -> Dict[str, Any]:
        """暂停运行"""
        if self.session.run_state == SandboxRunState.running:
            self.session.run_state = SandboxRunState.paused
            self.session.touch()
        return {"status": "paused", "run_state": self.session.run_state.value}

    def reset(self):
        """重置运行状态"""
        self.session.reset()
        self.debug.clear()
        # 重新初始化世界（保留配置）
        # 注意：这里不重新 setup，由调用方在更新配置后重新 setup

    # ==================== RTS tick 推进 ====================

    def _step_rts(self) -> Dict[str, Any]:
        """推进一个 tick（RTS 模式）"""
        ws = self.session.world_state
        step = self.session.current_step
        cities = ws["cities_order"]
        products = ws["products"]
        cities_meta = ws["cities"]

        # 简化版 RTS：每 tick AI 随机行动，价格随供需调整
        # 实际可复用 rts_tick.py 中的逻辑
        ai_actions = self._generate_ai_actions_rts()

        # 汇总行动为类决策格式
        decisions = self._rts_actions_to_decisions(ai_actions)
        config_id = ws.get("config_id", "fstrading")
        events = generate_market_events(step, cities, products, config_id)

        participant_city = {f"ai_{i}": t["city"] for i, t in enumerate(ws["participants"])}
        prices, meta = calculate_market_prices(
            products, cities, cities_meta,
            decisions, participant_city, events,
        )

        # 更新 AI 状态
        self._apply_ai_actions_rts(ai_actions, prices)

        ws["prices"] = prices
        ws["price_meta"] = meta
        ws["history"].append({"step": step, "prices": deepcopy(prices)})

        standings = self._calculate_standings()
        self.debug.record_world_state(step, prices, standings)

        # warmup 阶段处理
        if step <= ws.get("warmup_ticks", 6):
            ws["phase"] = "warmup"
        else:
            ws["phase"] = "running"

        return {
            "step": step,
            "tick": step,
            "phase": ws["phase"],
            "prices": prices,
            "events": events,
            "standings": standings,
            "finished": self.session.current_step >= self.session.total_steps,
        }

    # ==================== AI 决策生成 ====================

    def _generate_ai_actions_rts(self) -> List[Dict[str, Any]]:
        """生成 RTS AI 行动 — 使用策略引擎"""
        ws = self.session.world_state
        actions = []
        step = self.session.current_step

        for i, ai in enumerate(ws["participants"]):
            strategy_config = ai.get("strategy_config")
            result = self._ai_engine.decide(ai, ws, strategy_config)

            # 记录调试数据
            self.debug.record_ai_decision(
                step_number=step,
                ai_name=ai["name"],
                ai_level=ai.get("level", "unknown"),
                decision={
                    "action": result.action,
                    "product_id": result.product_id,
                    "quantity": result.quantity,
                    "target_city": result.target_city,
                },
                reasoning=result.reasoning,
                city=ai["city"],
                cash=ai["cash"],
                inventory=ai["inventory"],
                expected_profit=result.expected_profit,
                confidence=result.confidence,
            )

            if result.action == "move" and result.target_city:
                ai["city"] = result.target_city

            if result.action in ("buy", "sell") and result.quantity > 0:
                actions.append({
                    "ai_id": f"ai_{i}",
                    "action": result.action,
                    "city": ai["city"],
                    "product_id": result.product_id,
                    "quantity": result.quantity,
                })

        return actions

    def _rts_actions_to_decisions(self, actions: List[Dict[str, Any]]) -> List[Any]:
        """将 RTS 行动转换为类决策格式"""
        from app.games.trading.enums import ActionType
        decisions = []
        for a in actions:
            if a["action"] in ("buy", "sell"):
                decisions.append(_MockDecision(
                    participant_id=a["ai_id"],
                    action_type=ActionType.buy if a["action"] == "buy" else ActionType.sell,
                    action_data={
                        "trade_city": a["city"],
                        "product_id": a.get("product_id", ""),
                        "quantity": a.get("quantity", 1),
                    },
                ))
        return decisions

    def _apply_ai_trades(self, decisions: List[Any], prices: Dict[str, Dict[str, int]]):
        """应用 AI 的买卖决策到其状态"""
        ws = self.session.world_state
        for d in decisions:
            ai_id = d.participant_id
            idx = int(ai_id.split("_")[1])
            if idx >= len(ws["participants"]):
                continue
            ai = ws["participants"][idx]
            data = d.action_data or {}
            pid = data.get("product_id", "")
            qty = data.get("quantity", 0)
            city = data.get("trade_city", ai["city"])
            price = prices.get(city, {}).get(pid, 0)

            action = d.action_type.value if hasattr(d.action_type, "value") else str(d.action_type)
            if action == "buy" and ai["cash"] >= price * qty:
                ai["cash"] -= price * qty
                ai["inventory"][pid] = ai["inventory"].get(pid, 0) + qty
            elif action == "sell" and ai["inventory"].get(pid, 0) >= qty:
                ai["cash"] += price * qty
                ai["inventory"][pid] -= qty

            # 更新总资产
            inventory_value = sum(
                prices.get(ai["city"], {}).get(p, 0) * q
                for p, q in ai["inventory"].items()
            )
            ai["total_assets"] = ai["cash"] + inventory_value

    def _apply_ai_actions_rts(self, actions: List[Dict[str, Any]], prices: Dict[str, Dict[str, int]]):
        """应用 RTS AI 行动"""
        ws = self.session.world_state
        for a in actions:
            idx = int(a["ai_id"].split("_")[1])
            if idx >= len(ws["participants"]):
                continue
            ai = ws["participants"][idx]
            if a.get("action") == "move" and a.get("target_city"):
                ai["city"] = a["target_city"]
        # 买卖在 _apply_ai_trades 中处理
        self._apply_ai_trades(self._rts_actions_to_decisions(actions), prices)

    # ==================== 结算与排名 ====================

    def _calculate_standings(self) -> List[Dict[str, Any]]:
        """计算当前排名"""
        ws = self.session.world_state
        standings = []

        # 玩家
        player = ws.get("player")
        if player:
            standings.append({
                "rank": 0,
                "name": player["name"],
                "is_ai": False,
                "cash": player["cash"],
                "total_assets": player["total_assets"],
                "city": player["city"],
            })

        # AI
        for i, ai in enumerate(ws.get("participants", [])):
            standings.append({
                "rank": 0,
                "name": ai["name"],
                "is_ai": True,
                "cash": ai["cash"],
                "total_assets": ai["total_assets"],
                "city": ai["city"],
            })

        # 排序
        standings.sort(key=lambda x: x["total_assets"], reverse=True)
        for i, s in enumerate(standings):
            s["rank"] = i + 1

        return standings


class _MockDecision:
    """模拟决策对象，兼容引擎函数的参数签名"""
    def __init__(self, participant_id: str, action_type, action_data: dict):
        self.participant_id = participant_id
        self.action_type = action_type
        self.action_data = action_data
