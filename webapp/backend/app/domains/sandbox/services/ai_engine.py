"""AI 策略引擎 — 根据 YAML 配置驱动 AI 决策"""

import random
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class DecisionResult:
    """AI 决策结果"""
    action: str                       # buy / sell / move / hold
    product_id: str = ""              # 商品 ID（buy/sell 时）
    quantity: int = 0                 # 数量
    target_city: str = ""             # 目标城市（move 时）
    reasoning: str = ""               # 决策理由（人类可读）
    expected_profit: int = 0          # 预期利润
    confidence: float = 0.0           # 置信度 0-1


class AiStrategyEngine:
    """AI 策略引擎：解析 YAML 配置，执行策略决策"""

    def decide(
        self,
        ai_state: Dict[str, Any],
        world_state: Dict[str, Any],
        strategy_config: Optional[Dict[str, Any]] = None,
    ) -> DecisionResult:
        """根据策略配置做出决策"""
        if not strategy_config:
            return self._fallback_decide(ai_state, world_state)

        behavior = strategy_config.get("behavior", {})
        behavior_type = behavior.get("type", "random")
        params = behavior.get("params", {})

        # 根据行为类型分发
        if behavior_type == "arbitrage":
            return self._arbitrage_decide(ai_state, world_state, params)
        elif behavior_type == "value_hoarding":
            return self._hoarder_decide(ai_state, world_state, params)
        elif behavior_type == "momentum":
            return self._momentum_decide(ai_state, world_state, params)
        elif behavior_type == "conservative":
            return self._conservative_decide(ai_state, world_state, params)
        else:
            return self._random_decide(ai_state, world_state, params)

    # ==================== 套利型策略 ====================

    def _arbitrage_decide(
        self,
        ai: Dict[str, Any],
        world: Dict[str, Any],
        params: Dict[str, Any],
    ) -> DecisionResult:
        """套利型：寻找跨城价差，低买高卖"""
        cities = world.get("cities_order", [])
        products = list(world.get("products", {}).keys())
        prices = world.get("prices", {})
        city = ai["city"]
        cash = ai["cash"]
        inventory = ai["inventory"]

        min_spread = params.get("min_spread_ratio", 0.15)
        max_inv_ratio = params.get("max_inventory_ratio", 0.3)
        risk = params.get("risk_appetite", 0.7)
        total_assets = ai.get("total_assets", cash)
        max_inventory_value = total_assets * max_inv_ratio

        # 1. 找最佳套利机会
        best_opportunity = None
        best_profit_rate = 0.0

        for pid in products:
            base_price = world.get("products", {}).get(pid, {}).get("base_price", 100)
            city_prices = {c: prices.get(c, {}).get(pid, 0) for c in cities}
            if len(city_prices) < 2:
                continue

            min_city = min(city_prices, key=city_prices.get)
            max_city = max(city_prices, key=city_prices.get)
            buy_price = city_prices[min_city]
            sell_price = city_prices[max_city]

            if buy_price <= 0:
                continue
            spread_rate = (sell_price - buy_price) / buy_price

            if spread_rate >= min_spread and spread_rate > best_profit_rate:
                best_profit_rate = spread_rate
                profit_per_unit = sell_price - buy_price
                best_opportunity = {
                    "product_id": pid,
                    "buy_city": min_city,
                    "sell_city": max_city,
                    "buy_price": buy_price,
                    "sell_price": sell_price,
                    "spread_rate": spread_rate,
                    "profit_per_unit": profit_per_unit,
                }

        # 2. 根据当前位置和行动决策
        if best_opportunity:
            opp = best_opportunity
            pid = opp["product_id"]
            inv_value = sum(
                prices.get(city, {}).get(p, 0) * q
                for p, q in inventory.items()
            )

            # 如果在最低价城市 → 买入
            if city == opp["buy_city"]:
                volume = world.get("products", {}).get(pid, {}).get("volume", 1)
                max_afford = int(cash * risk / opp["buy_price"])
                max_by_inv = int((max_inventory_value - inv_value) / opp["buy_price"]) if opp["buy_price"] > 0 else 0
                qty = max(1, min(max_afford, max_by_inv, 10))
                expected = qty * opp["profit_per_unit"]
                return DecisionResult(
                    action="buy",
                    product_id=pid,
                    quantity=qty,
                    reasoning=f"{city}{pid} ¥{opp['buy_price']} 为全图最低价，{opp['sell_city']} 售价 ¥{opp['sell_price']}，价差 {opp['spread_rate']*100:.0f}%，买入 {qty} 单位运往 {opp['sell_city']} 卖出，预期利润 ¥{expected}",
                    expected_profit=expected,
                    confidence=min(0.95, opp["spread_rate"] * 3),
                )

            # 如果在最高价城市且有库存 → 卖出
            if city == opp["sell_city"] and inventory.get(pid, 0) > 0:
                qty = min(inventory[pid], random.randint(1, 5))
                expected = qty * opp["sell_price"]
                return DecisionResult(
                    action="sell",
                    product_id=pid,
                    quantity=qty,
                    reasoning=f"{city}{pid} 售价 ¥{opp['sell_price']} 为全图最高价，卖出 {qty} 单位兑现利润",
                    expected_profit=expected,
                    confidence=0.9,
                )

            # 如果有库存 → 前往最高价城市
            if inventory.get(pid, 0) > 0:
                return DecisionResult(
                    action="move",
                    target_city=opp["sell_city"],
                    reasoning=f"持有 {pid} {inventory[pid]} 单位，前往最高价城市 {opp['sell_city']}（¥{opp['sell_price']}）出货",
                    expected_profit=inventory[pid] * opp["profit_per_unit"],
                    confidence=0.85,
                )

            # 否则 → 前往最低价城市买入
            return DecisionResult(
                action="move",
                target_city=opp["buy_city"],
                reasoning=f"前往最低价城市 {opp['buy_city']} 买入 {pid}（¥{opp['buy_price']}），再运往 {opp['sell_city']}（¥{opp['sell_price']}）套利",
                expected_profit=opp["profit_per_unit"] * 5,
                confidence=0.8,
            )

        # 无套利机会 → hold
        return DecisionResult(
            action="hold",
            reasoning="当前市场无满足最小价差条件的套利机会，等待价格分化",
            confidence=0.5,
        )

    # ==================== 囤积型策略 ====================

    def _hoarder_decide(
        self,
        ai: Dict[str, Any],
        world: Dict[str, Any],
        params: Dict[str, Any],
    ) -> DecisionResult:
        """囤积型：低于阈值买入，高于阈值卖出"""
        city = ai["city"]
        cash = ai["cash"]
        inventory = ai["inventory"]
        prices = world.get("prices", {})
        products = world.get("products", {})

        buy_threshold = params.get("buy_threshold", 0.85)
        sell_threshold = params.get("sell_threshold", 1.35)
        target_products = params.get("target_products", list(products.keys()))
        max_buy_ratio = params.get("max_single_buy_ratio", 0.25)

        # 1. 先检查是否有可卖出的（高于阈值）
        for pid in target_products:
            if inventory.get(pid, 0) <= 0:
                continue
            current_price = prices.get(city, {}).get(pid, 0)
            base_price = products.get(pid, {}).get("base_price", 100)
            if base_price <= 0:
                continue
            price_ratio = current_price / base_price

            if price_ratio >= sell_threshold:
                qty = min(inventory[pid], random.randint(3, 8))
                expected = qty * current_price
                return DecisionResult(
                    action="sell",
                    product_id=pid,
                    quantity=qty,
                    reasoning=f"{pid} 当前 ¥{current_price} 已达基准价 {price_ratio*100:.0f}%，超过卖出阈值 {sell_threshold*100:.0f}%，卖出 {qty} 单位兑现",
                    expected_profit=expected,
                    confidence=min(0.95, (price_ratio - 1) * 2),
                )

        # 2. 找低于买入阈值的商品
        best_buy = None
        best_discount = 0.0

        for pid in target_products:
            current_price = prices.get(city, {}).get(pid, 0)
            base_price = products.get(pid, {}).get("base_price", 100)
            if base_price <= 0:
                continue
            price_ratio = current_price / base_price

            if price_ratio <= buy_threshold and (buy_threshold - price_ratio) > best_discount:
                best_discount = buy_threshold - price_ratio
                best_buy = {
                    "product_id": pid,
                    "price": current_price,
                    "base_price": base_price,
                    "ratio": price_ratio,
                }

        if best_buy:
            pid = best_buy["product_id"]
            max_spend = cash * max_buy_ratio
            qty = max(1, int(max_spend / best_buy["price"])) if best_buy["price"] > 0 else 1
            expected_future = qty * best_buy["base_price"] * sell_threshold
            return DecisionResult(
                action="buy",
                product_id=pid,
                quantity=qty,
                reasoning=f"{pid} 当前 ¥{best_buy['price']} 仅基准价的 {best_buy['ratio']*100:.0f}%，低于买入阈值 {buy_threshold*100:.0f}%，买入 {qty} 单位囤积，待涨至 {sell_threshold*100:.0f}% 后抛售",
                expected_profit=int(expected_future - qty * best_buy["price"]),
                confidence=min(0.9, best_discount * 3),
            )

        return DecisionResult(
            action="hold",
            reasoning=f"当前 {city} 无满足条件的低价买入或高价卖出机会，持有等待",
            confidence=0.5,
        )

    # ==================== 趋势型策略 ====================

    def _momentum_decide(
        self,
        ai: Dict[str, Any],
        world: Dict[str, Any],
        params: Dict[str, Any],
    ) -> DecisionResult:
        """趋势型：追涨杀跌，跟随价格趋势"""
        city = ai["city"]
        cash = ai["cash"]
        inventory = ai["inventory"]
        prices = world.get("prices", {})
        products = world.get("products", {})
        history = world.get("history", [])

        window = params.get("trend_window", 3)
        threshold = params.get("momentum_threshold", 0.08)
        contrarian = params.get("contrarian", False)

        if len(history) < window + 1:
            return DecisionResult(
                action="hold",
                reasoning=f"历史数据不足 {window} 轮，无法判断趋势，观望",
                confidence=0.3,
            )

        # 计算各商品在 current city 的价格趋势
        best_momentum = None
        best_change = 0.0

        for pid in products:
            recent = []
            for h in history[-window:]:
                p = h.get("prices", {}).get(city, {}).get(pid)
                if p is not None:
                    recent.append(p)

            if len(recent) < 2:
                continue

            old_price = recent[0]
            new_price = recent[-1]
            if old_price <= 0:
                continue
            change_rate = (new_price - old_price) / old_price

            abs_change = abs(change_rate)
            if abs_change >= threshold and abs_change > best_change:
                best_change = abs_change
                best_momentum = {
                    "product_id": pid,
                    "change_rate": change_rate,
                    "old_price": old_price,
                    "new_price": new_price,
                }

        if best_momentum:
            m = best_momentum
            pid = m["product_id"]
            current_price = prices.get(city, {}).get(pid, 0)

            # 趋势向上
            if m["change_rate"] > 0:
                if not contrarian:
                    # 追涨：买入
                    qty = max(1, int(cash * 0.15 / current_price)) if current_price > 0 else 1
                    return DecisionResult(
                        action="buy",
                        product_id=pid,
                        quantity=qty,
                        reasoning=f"{pid} 连续 {window} 轮上涨 {m['change_rate']*100:.1f}%，趋势向上，追涨买入 {qty} 单位",
                        expected_profit=int(qty * current_price * m["change_rate"]),
                        confidence=min(0.9, m["change_rate"] * 5),
                    )
                else:
                    # 反向：如果持有则卖出
                    if inventory.get(pid, 0) > 0:
                        qty = min(inventory[pid], random.randint(2, 5))
                        return DecisionResult(
                            action="sell",
                            product_id=pid,
                            quantity=qty,
                            reasoning=f"{pid} 连续上涨 {m['change_rate']*100:.1f}%，反向操作认为即将回调，卖出 {qty} 单位",
                            expected_profit=qty * current_price,
                            confidence=0.6,
                        )

            # 趋势向下
            else:
                if not contrarian:
                    # 杀跌：如果持有则卖出
                    if inventory.get(pid, 0) > 0:
                        qty = min(inventory[pid], random.randint(2, 5))
                        return DecisionResult(
                            action="sell",
                            product_id=pid,
                            quantity=qty,
                            reasoning=f"{pid} 连续 {window} 轮下跌 {abs(m['change_rate'])*100:.1f}%，趋势向下，止损卖出 {qty} 单位",
                            expected_profit=qty * current_price,
                            confidence=0.7,
                        )
                else:
                    # 反向：抄底买入
                    qty = max(1, int(cash * 0.15 / current_price)) if current_price > 0 else 1
                    return DecisionResult(
                        action="buy",
                        product_id=pid,
                        quantity=qty,
                        reasoning=f"{pid} 连续下跌 {abs(m['change_rate'])*100:.1f}%，反向操作认为即将反弹，抄底买入 {qty} 单位",
                        expected_profit=int(qty * current_price * abs(m["change_rate"])),
                        confidence=0.6,
                    )

        return DecisionResult(
            action="hold",
            reasoning=f"当前市场无明显趋势（变化未超过 {threshold*100:.0f}% 阈值），观望",
            confidence=0.4,
        )

    # ==================== 保守型策略 ====================

    def _conservative_decide(
        self,
        ai: Dict[str, Any],
        world: Dict[str, Any],
        params: Dict[str, Any],
    ) -> DecisionResult:
        """保守型：严格风控，小步交易"""
        city = ai["city"]
        cash = ai["cash"]
        inventory = ai["inventory"]
        total_assets = ai.get("total_assets", cash)
        prices = world.get("prices", {})
        products = world.get("products", {})

        max_trade_ratio = params.get("max_single_trade_ratio", 0.1)
        cash_reserve = params.get("cash_reserve_ratio", 0.5)
        min_margin = params.get("min_profit_margin", 0.2)

        available_cash = cash - total_assets * cash_reserve
        max_trade_amount = total_assets * max_trade_ratio

        # 找低风险套利机会（利润率 > min_margin）
        best = None
        best_margin = 0.0
        cities = world.get("cities_order", [])

        for pid in products:
            base_price = products.get(pid, {}).get("base_price", 100)
            current_price = prices.get(city, {}).get(pid, 0)
            if base_price <= 0:
                continue

            # 买入：价格远低于基准
            if current_price < base_price * (1 - min_margin):
                margin = (base_price - current_price) / current_price if current_price > 0 else 0
                if margin > best_margin:
                    best_margin = margin
                    best = {"action": "buy", "pid": pid, "price": current_price, "margin": margin}

            # 卖出：价格远高于基准且有库存
            elif current_price > base_price * (1 + min_margin) and inventory.get(pid, 0) > 0:
                margin = (current_price - base_price) / base_price
                if margin > best_margin:
                    best_margin = margin
                    best = {"action": "sell", "pid": pid, "price": current_price, "margin": margin}

        if best and best["action"] == "buy":
            pid = best["pid"]
            trade_budget = min(available_cash, max_trade_amount)
            qty = max(1, int(trade_budget / best["price"])) if best["price"] > 0 else 1
            expected = int(qty * (products[pid]["base_price"] - best["price"]))
            return DecisionResult(
                action="buy",
                product_id=pid,
                quantity=qty,
                reasoning=f"{pid} 当前 ¥{best['price']} 低于基准 ¥{products[pid]['base_price']}，利润率 {best['margin']*100:.0f}% ≥ 最小要求 {min_margin*100:.0f}%，在风控限额内买入 {qty} 单位（交易额 ¥{qty*best['price']} ≤ 总资产 {max_trade_ratio*100:.0f}%）",
                expected_profit=expected,
                confidence=0.8,
            )

        if best and best["action"] == "sell":
            pid = best["pid"]
            qty = min(inventory[pid], random.randint(1, 3))
            expected = qty * best["price"]
            return DecisionResult(
                action="sell",
                product_id=pid,
                quantity=qty,
                reasoning=f"{pid} 当前 ¥{best['price']} 高于基准，利润率 {best['margin']*100:.0f}% ≥ 最小要求，卖出 {qty} 单位兑现利润",
                expected_profit=expected,
                confidence=0.85,
            )

        return DecisionResult(
            action="hold",
            reasoning=f"当前无满足最小利润率 {min_margin*100:.0f}% 且符合风控要求的交易机会，保留 {cash_reserve*100:.0f}% 现金储备",
            confidence=0.6,
        )

    # ==================== 混乱型（随机）策略 ====================

    def _random_decide(
        self,
        ai: Dict[str, Any],
        world: Dict[str, Any],
        params: Dict[str, Any],
    ) -> DecisionResult:
        """混乱型：高随机 + 少量非理性"""
        city = ai["city"]
        cash = ai["cash"]
        inventory = ai["inventory"]
        products = list(world.get("products", {}).keys())
        prices = world.get("prices", {})
        irrationality = params.get("irrationality", 0.8)

        actions = ["buy", "sell", "move", "hold"]
        weights = [0.3, 0.25, 0.25, 0.2]
        action = random.choices(actions, weights=weights)[0]

        if action == "buy" and cash > 1000:
            pid = random.choice(products)
            price = prices.get(city, {}).get(pid, 100)
            qty = random.randint(1, 5)
            return DecisionResult(
                action="buy",
                product_id=pid,
                quantity=qty,
                reasoning=f"混乱型 AI 随机决定买入 {pid} {qty} 单位，非理性系数 {irrationality}",
                expected_profit=random.randint(-50, 100),
                confidence=random.uniform(0.2, 0.5),
            )

        if action == "sell":
            owned = [p for p, q in inventory.items() if q > 0]
            if owned:
                pid = random.choice(owned)
                qty = min(inventory[pid], random.randint(1, 3))
                return DecisionResult(
                    action="sell",
                    product_id=pid,
                    quantity=qty,
                    reasoning=f"混乱型 AI 随机决定卖出 {pid} {qty} 单位，可能卖在低位",
                    expected_profit=random.randint(-30, 80),
                    confidence=random.uniform(0.1, 0.4),
                )

        if action == "move":
            cities = world.get("cities_order", [])
            new_city = random.choice([c for c in cities if c != city]) if len(cities) > 1 else city
            return DecisionResult(
                action="move",
                target_city=new_city,
                reasoning=f"混乱型 AI 随机移动到 {new_city}",
                confidence=random.uniform(0.1, 0.3),
            )

        return DecisionResult(
            action="hold",
            reasoning="混乱型 AI 选择观望",
            confidence=random.uniform(0.1, 0.3),
        )

    # ==================== 回退策略 ====================

    def _fallback_decide(
        self,
        ai: Dict[str, Any],
        world: Dict[str, Any],
    ) -> DecisionResult:
        """无策略配置时的回退：简单套利"""
        return self._arbitrage_decide(ai, world, {"min_spread_ratio": 0.1})
