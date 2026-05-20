import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTradingStore } from '../../stores/tradingStore';
import { useAuthStore } from '../../stores/authStore';
import TradingRTSView from './TradingRTSView';
import { connectRtsWebSocket } from '../../lib/rtsWebSocket';
import {
  TrendingUp, TrendingDown, Minus, MapPin, Wallet, Package,
  Loader2, Crown, Clock, ShoppingCart, Truck,
  PauseCircle, ChevronRight, BarChart3
} from 'lucide-react';

export default function TradingGamePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { gameState, fetchGameState, submitDecision, loading, error } = useTradingStore();

  const eventId = Number(id);

  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [actionType, setActionType] = useState<'buy' | 'sell' | 'move' | 'hold'>('hold');
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    return fetchGameState(eventId);
  }, [eventId, fetchGameState]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // RTS：WebSocket 推送 tick，HTTP 只读拉状态；断线时 30s 兜底轮询
  useEffect(() => {
    if (!eventId || gameState?.game_mode !== 'rts') return;
    const disconnect = connectRtsWebSocket(eventId, {
      onTick: () => {
        void refresh();
      },
    });
    const fallback = setInterval(() => void refresh(), 30000);
    return () => {
      disconnect();
      clearInterval(fallback);
    };
  }, [eventId, gameState?.game_mode, refresh]);

  // 回合制：固定 5 秒轮询
  useEffect(() => {
    if (gameState?.game_mode === 'rts') return;
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh, gameState?.game_mode]);

  // 新回合重置表单
  useEffect(() => {
    if (gameState?.current_round?.id) {
      setSelectedProduct('');
      setSelectedCity('');
      setQuantity(1);
      setActionType('hold');
    }
  }, [gameState?.current_round?.id]);

  const currentMarket = gameState?.markets?.find(m => m.city === gameState?.participant?.current_city);
  const currentCityPrices = currentMarket?.products || [];

  const handleSubmit = async () => {
    if (!gameState?.current_round || submitting) return;
    if (!gameState.can_submit_decision) return;

    let actionData: Record<string, any> = {};

    if (actionType === 'buy') {
      if (!selectedProduct || quantity < 1) return;
      actionData = { product_id: selectedProduct, quantity };
    } else if (actionType === 'sell') {
      if (!selectedProduct || quantity < 1) return;
      actionData = { product_id: selectedProduct, quantity };
    } else if (actionType === 'move') {
      if (!selectedCity) return;
      actionData = { to_city: selectedCity };
    }

    const roundIdBefore = gameState.current_round.id;
    setSubmitting(true);
    try {
      await submitDecision(roundIdBefore, actionType, actionData);
      await refresh();
    } catch {
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (gameState.game_mode === 'rts') {
    return (
      <TradingRTSView
        gameState={gameState}
        eventId={eventId}
        onRefresh={refresh}
      />
    );
  }

  const { event, participant, current_round, inventory, standings, is_practice, market_insights, inventory_capacity } = gameState;
  const isFinished = event.status === 'finished';
  const isPlaying = event.status === 'playing';
  const canAct = isPlaying && (gameState.can_submit_decision ?? false) && !submitting;
  const isWaiting = isPlaying && !canAct && !submitting && (gameState.has_submitted_this_round ?? false);
  const productLimit = inventory_capacity?.limit_per_product
    ?? event.config?.inventory_limit_per_product
    ?? event.config?.inventory_limit
    ?? 99;
  const selectedHeld = selectedProduct
    ? (inventory.find((i) => i.product_id === selectedProduct)?.quantity ?? 0)
    : 0;
  const maxQuantity = actionType === 'sell'
    ? selectedHeld
    : Math.max(0, productLimit - selectedHeld);
  const cityLabel = currentMarket?.city_name || participant.current_city;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Top Bar */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-foreground-muted">回合</p>
              <p className="text-lg font-bold text-foreground">
                {current_round?.round_number || 0} / {event.config?.rounds || 10}
              </p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">现金</p>
              <p className="text-lg font-bold text-success">¥{participant.cash.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">总资产</p>
              <p className="text-lg font-bold text-primary">¥{participant.total_assets.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">排名</p>
              <p className="text-lg font-bold text-foreground flex items-center gap-1">
                <Crown className="w-4 h-4 text-primary" />
                #{standings.find(s => s.user_id === user?.id)?.rank || '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <MapPin className="w-4 h-4 text-primary" />
            {cityLabel}
            {is_practice && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-teal/15 text-accent-teal">练习局</span>
            )}
          </div>
        </div>
      </div>

      {isFinished && (
        <div className="glass-card p-6 mb-6 border border-primary/20 text-center">
          <Crown className="w-10 h-10 mx-auto text-primary mb-2" />
          <h3 className="text-lg font-semibold text-foreground">本局练习已结束</h3>
          <p className="text-sm text-foreground-muted mt-1">
            最终排名 #{standings.find(s => s.user_id === user?.id)?.rank || '-'} · 总资产 ¥{participant.total_assets.toLocaleString()}
          </p>
          <button
            onClick={() => navigate('/games')}
            className="mt-4 px-6 py-2.5 bg-primary text-background rounded-lg font-medium hover:bg-primary/90"
          >
            返回游戏大厅
          </button>
        </div>
      )}

      {/* Events */}
      {/* 供需教学 */}
      {gameState.pricing_mode === 'market' && (
        <div className="glass-card p-4 mb-6 border border-accent-teal/15">
          <h3 className="text-sm font-semibold text-accent-teal mb-2">供需定价（浮生记机制）</h3>
          <p className="text-xs text-foreground-muted mb-3">
            上一回合某城某商品的<strong className="text-foreground">买入越多 → 需求上升 → 下回合涨价</strong>；
            <strong className="text-foreground">卖出越多 → 供给增加 → 下回合降价</strong>。正式赛由全体玩家共同塑造市场，练习局由 AI 交易员模拟其他玩家。
          </p>
          {market_insights && market_insights.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {market_insights.slice(0, 6).map((ins) => (
                <div key={`${ins.city}-${ins.product_id}`} className="text-xs p-2 rounded-lg bg-background-secondary">
                  <span className="font-medium text-foreground">{ins.city_name} · {ins.product_name}</span>
                  <div className="flex justify-between mt-1 text-foreground-muted">
                    <span>买 {ins.buy_qty} / 卖 {ins.sell_qty}</span>
                    <span className={ins.pressure > 0.05 ? 'text-danger' : ins.pressure < -0.05 ? 'text-success' : ''}>
                      {ins.pressure > 0 ? '需求↑' : ins.pressure < 0 ? '供给↑' : '均衡'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-foreground-muted">第 1 回合：各城基准价由城市特性决定；本回合结束后将根据买卖量更新物价。</p>
          )}
        </div>
      )}

      {current_round?.events && current_round.events.length > 0 && (
        <div className="bg-primary-soft border border-primary/20 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            本回合事件
          </h3>
          {current_round.events.map((evt, idx) => (
            <p key={idx} className="text-sm text-foreground-secondary">
              📰 <strong>{evt.name}</strong>：{evt.description}
              {evt.impact > 0 ? ' (需求侧利好)' : ' (供给增加/需求走弱)'}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              市场行情（当前城市）
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-foreground-muted border-b border-border-subtle">
                    <th className="pb-3 font-medium">商品</th>
                    <th className="pb-3 font-medium">买入价</th>
                    <th className="pb-3 font-medium">卖出价</th>
                    <th className="pb-3 font-medium">供需</th>
                    <th className="pb-3 font-medium">趋势</th>
                  </tr>
                </thead>
                <tbody>
                  {currentCityPrices.map((product) => (
                    <tr
                      key={product.product_id}
                      onClick={() => {
                        if (canAct) {
                          setSelectedProduct(product.product_id);
                          setActionType('buy');
                        }
                      }}
                      className={`border-b border-border-subtle/50 transition-colors ${
                        canAct ? 'cursor-pointer hover:bg-background-hover' : ''
                      } ${selectedProduct === product.product_id ? 'bg-primary-soft' : ''}`}
                    >
                      <td className="py-3">
                        <span className="font-medium text-foreground">{product.name}</span>
                        <span className="text-xs text-foreground-muted ml-2">({product.category})</span>
                      </td>
                      <td className="py-3 text-foreground">¥{product.buy_price}</td>
                      <td className="py-3 text-foreground">¥{product.sell_price}</td>
                      <td className="py-3 text-xs text-foreground-muted">
                        {(product.pressure ?? 0) > 0.05 ? (
                          <span className="text-danger">需求偏强</span>
                        ) : (product.pressure ?? 0) < -0.05 ? (
                          <span className="text-success">供给偏强</span>
                        ) : (
                          '均衡'
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`flex items-center gap-1 text-xs ${
                          product.trend === 'up' ? 'text-success' :
                          product.trend === 'down' ? 'text-danger' :
                          'text-foreground-muted'
                        }`}>
                          {product.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> :
                           product.trend === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> :
                           <Minus className="w-3.5 h-3.5" />}
                          {product.trend_percent > 0 ? '+' : ''}{product.trend_percent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Decision Panel */}
          {!isFinished && isPlaying && (
            <div className="glass-card p-6">
              <h3 className="font-semibold text-foreground mb-4">本回合决策</h3>
              <p className="text-xs text-foreground-muted mb-4">
                每回合仅可执行一次操作（买入 / 卖出 / 移动 / 持有）。每种商品最多持有 {productLimit} 件。
              </p>

              {isWaiting ? (
                <div className="text-center py-8">
                  <Loader2 className="w-12 h-12 mx-auto text-primary mb-3 animate-spin" />
                  <p className="text-foreground">本回合决策已提交</p>
                  <p className="text-sm text-foreground-muted mt-1">
                    {is_practice
                      ? 'AI 交易员正在行动，即将进入下一回合…'
                      : '等待组织者推进下一回合'}
                  </p>
                </div>
              ) : canAct ? (
                <>
                  {/* Action Type */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { type: 'buy' as const, label: '买入', icon: ShoppingCart },
                      { type: 'sell' as const, label: '卖出', icon: Wallet },
                      { type: 'move' as const, label: '移动', icon: Truck },
                      { type: 'hold' as const, label: '持有', icon: PauseCircle },
                    ].map(({ type, label, icon: Icon }) => (
                      <button
                        key={type}
                        onClick={() => {
                          setActionType(type);
                          setSelectedProduct('');
                          setSelectedCity('');
                        }}
                        className={`py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                          actionType === type
                            ? 'bg-primary text-background'
                            : 'bg-background-secondary text-foreground-secondary hover:bg-background-hover'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Buy/Sell Form */}
                  {(actionType === 'buy' || actionType === 'sell') && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-foreground-muted mb-1 block">选择商品</label>
                        <select
                          value={selectedProduct}
                          onChange={(e) => setSelectedProduct(e.target.value)}
                          className="w-full px-3 py-2.5 bg-background-secondary border border-border-subtle rounded-lg text-foreground focus:outline-none focus:border-primary"
                        >
                          <option value="">请选择</option>
                          {currentCityPrices.map((p) => (
                            <option key={p.product_id} value={p.product_id}>
                              {p.name} - 买¥{p.buy_price} / 卖¥{p.sell_price}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-foreground-muted mb-1 block">数量</label>
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, maxQuantity)}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), Math.max(1, maxQuantity)))}
                          className="w-full px-3 py-2.5 bg-background-secondary border border-border-subtle rounded-lg text-foreground focus:outline-none focus:border-primary"
                        />
                        {actionType === 'buy' && selectedProduct && (
                          <p className="text-xs text-foreground-muted mt-1">
                            该商品已持有 {selectedHeld} 件，还可买入 {Math.max(0, productLimit - selectedHeld)} 件
                          </p>
                        )}
                      </div>
                      {selectedProduct && (
                        <p className="text-sm text-foreground-muted">
                          {actionType === 'buy' ? '预计花费' : '预计收入'}:
                          <span className="text-foreground font-semibold ml-1">
                            ¥{((actionType === 'buy'
                              ? currentCityPrices.find(p => p.product_id === selectedProduct)?.buy_price
                              : currentCityPrices.find(p => p.product_id === selectedProduct)?.sell_price
                            ) || 0) * quantity}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Move Form */}
                  {actionType === 'move' && (
                    <div>
                      <label className="text-sm text-foreground-muted mb-1 block">目标城市</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(event.config?.cities || []).map((city) => (
                          <button
                            key={city}
                            onClick={() => setSelectedCity(city)}
                            disabled={city === participant.current_city}
                            className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              selectedCity === city
                                ? 'bg-primary text-background'
                                : city === participant.current_city
                                ? 'bg-background-secondary/50 text-foreground-muted cursor-not-allowed'
                                : 'bg-background-secondary text-foreground-secondary hover:bg-background-hover'
                            }`}
                          >
                            {city === participant.current_city ? cityLabel : (gameState.markets.find(m => m.city === city)?.city_name || city)}
                          </button>
                        ))}
                      </div>
                      <p className="text-sm text-foreground-muted mt-2">
                        路费: ¥{event.config?.move_cost || 1000}
                      </p>
                    </div>
                  )}

                  {/* Hold */}
                  {actionType === 'hold' && (
                    <p className="text-sm text-foreground-muted py-4 text-center">
                      本回合不进行操作，等待市场变化
                    </p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={loading || submitting || (actionType !== 'hold' && !selectedProduct && !selectedCity) || (actionType !== 'hold' && maxQuantity < 1)}
                    className="w-full mt-4 py-3 bg-primary text-background rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {(loading || submitting) ? <Loader2 className="w-5 h-5 animate-spin" /> : '确认决策'}
                  </button>
                </>
              ) : (
                <div className="text-center py-8 text-sm text-foreground-muted">
                  <Loader2 className="w-8 h-8 mx-auto text-primary mb-2 animate-spin" />
                  正在同步对局状态…
                </div>
              )}
            </div>
          )}

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Inventory */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              我的库存
              <span className="text-xs font-normal text-foreground-muted ml-auto">
                共 {inventory_capacity?.total_items ?? inventory.reduce((s, i) => s + i.quantity, 0)} 件 · 单品种上限 {productLimit}
              </span>
            </h3>
            {inventory.length > 0 ? (
              <div className="space-y-3">
                {inventory.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex items-center justify-between p-3 bg-background-secondary rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-foreground text-sm">{item.name}</p>
                      <p className="text-xs text-foreground-muted">
                        {item.quantity}件 · 成本¥{item.avg_cost}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">¥{item.current_value}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-muted text-center py-4">库存为空</p>
            )}
          </div>

          {/* Standings */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              排行榜
            </h3>
            <div className="space-y-2">
              {standings.slice(0, 10).map((entry) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg ${
                    entry.user_id === user?.id ? 'bg-primary-soft' : ''
                  }`}
                >
                  <span className={`w-6 text-center text-sm font-bold ${
                    entry.rank === 1 ? 'text-primary' :
                    entry.rank === 2 ? 'text-foreground-secondary' :
                    entry.rank === 3 ? 'text-warning' :
                    'text-foreground-muted'
                  }`}>
                    {entry.rank}
                  </span>
                  <span className="flex-1 text-sm text-foreground truncate">{entry.username}</span>
                  <span className="text-sm font-medium text-foreground">
                    ¥{entry.total_assets.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-center text-sm text-danger">{error}</p>
      )}
    </div>
  );
}
