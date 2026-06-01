import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus, MapPin, Wallet, Package,
  Loader2, Crown, Clock, ShoppingCart, Truck, BarChart3, Box,
} from 'lucide-react';
import { useTradingStore } from '../../stores/tradingStore';
import { useAuthStore } from '../../stores/authStore';
import type { GameState } from '../../types';
import FushengjiMapStage from '../../components/fushengji/FushengjiMapStage';
import { neighborCityIds } from '../../lib/fstradingGeo';

const VEHICLE_LABELS: Record<string, string> = {
  van: '小货车',
  truck: '大卡车',
};

type Props = {
  gameState: GameState;
  eventId: number;
  onRefresh: () => Promise<unknown>;
};

export default function TradingRTSView({ gameState, eventId, onRefresh }: Props) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { submitRtsAction, loading, error } = useTradingStore();

  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [actionType, setActionType] = useState<'buy' | 'sell' | 'move' | 'buy_vehicle'>('buy');
  const [selectedCity, setSelectedCity] = useState('');
  const [mapFocusCity, setMapFocusCity] = useState('');
  const [vehicleType, setVehicleType] = useState<'van' | 'truck'>('van');
  const [submitting, setSubmitting] = useState(false);
  const [lastMsg, setLastMsg] = useState('');

  const { event, participant, inventory, standings, rts, inventory_capacity } = gameState;
  const isFinished = event.status === 'finished';
  const isPlaying = event.status === 'playing';
  const canAct = isPlaying && (gameState.can_submit_decision ?? false);
  const currentMarket = gameState.markets?.find((m) => m.city === participant.current_city);
  const currentCityPrices = currentMarket?.products || [];
  const worldSlice = rts?.world;
  const worldRoutes = worldSlice?.routes ?? [];
  const moveTargets = (() => {
    const all = (event.config?.cities as string[] | undefined) || [];
    if (worldRoutes.length) {
      return neighborCityIds(participant.current_city, worldRoutes).filter((id) => id !== participant.current_city);
    }
    return all.filter((id) => id !== participant.current_city);
  })();

  const quoteCity = mapFocusCity || participant.current_city;
  const quoteMarket = gameState.markets?.find((m) => m.city === quoteCity);
  const quotePrices = quoteMarket?.products || [];
  const viewingRemote = quoteCity !== participant.current_city;
  const displayPrices = viewingRemote ? quotePrices : currentCityPrices;
  const gameConfigId = (event.config?.game_config_id as string | undefined) || 'fstrading';
  const cap = inventory_capacity;
  const storageUsed = cap?.storage_used ?? 0;
  const storageCap = cap?.storage_capacity ?? 99;
  const vehicles = cap?.vehicles ?? [];
  const maxVehicles = cap?.max_vehicles ?? 3;
  const tick = rts?.tick ?? 0;
  const totalTicks = rts?.total_ticks ?? 120;
  const phase = rts?.phase ?? 'warmup';
  const transit = rts?.transit as { from_city?: string; to_city?: string; arrival_tick?: number } | null | undefined;
  const vehicleDefs = (rts?.vehicles_available ?? {}) as Record<string, { name?: string; cost?: number; capacity_bonus?: number; speed_bonus?: number }>;

  const cityLabel = currentMarket?.city_name || participant.current_city;
  const resolveCityName = (cityId: string) =>
    gameState.markets?.find((m) => m.city === cityId)?.city_name || cityId;

  const maxBuyQty = (() => {
    if (!selectedProduct || actionType !== 'buy') return 99;
    const p = currentCityPrices.find((x) => x.product_id === selectedProduct);
    const vol = p?.volume ?? 1;
    const ask = p?.buy_price ?? 0;
    const remainVol = Math.max(0, storageCap - storageUsed);
    const byCash = ask > 0 ? Math.floor(participant.cash / ask) : 0;
    const byVol = vol > 0 ? Math.floor(remainVol / vol) : 0;
    return Math.max(0, Math.min(byCash, byVol, 50));
  })();

  const selectedHeld = selectedProduct
    ? inventory.find((i) => i.product_id === selectedProduct)?.quantity ?? 0
    : 0;

  const handleSubmit = async () => {
    if (!canAct || submitting) return;
    let payload: Record<string, unknown> = {};
    if (actionType === 'buy' || actionType === 'sell') {
      if (!selectedProduct || quantity < 1) return;
      payload = { product_id: selectedProduct, quantity };
    } else if (actionType === 'move') {
      if (!selectedCity) return;
      payload = { to_city: selectedCity };
    } else if (actionType === 'buy_vehicle') {
      payload = { vehicle_type: vehicleType };
    }

    setSubmitting(true);
    try {
      const res = await submitRtsAction(eventId, actionType, payload);
      setLastMsg(res.message || (res.accepted ? '指令已排队' : '操作失败'));
      await onRefresh();
    } catch {
      await onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-xs text-foreground-muted">Tick</p>
              <p className="text-lg font-bold text-foreground">
                {tick} / {totalTicks}
                <span className="text-xs font-normal text-foreground-muted ml-2">
                  ({phase === 'warmup' ? '热身' : phase === 'running' ? '正赛' : phase})
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-foreground-muted">下 tick</p>
              <p className="text-lg font-bold text-accent-teal flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {rts?.seconds_until_next_tick ?? 0}s
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
              <p className="text-xs text-foreground-muted">仓储</p>
              <p className="text-lg font-bold text-foreground">
                {storageUsed}/{storageCap}
              </p>
            </div>
          </div>
          <div className="text-sm text-foreground-muted">
            <MapPin className="w-4 h-4 text-primary inline mr-1" />
            {cityLabel}
            {transit && (
              <span className="ml-2 text-warning">
                → {resolveCityName(transit.to_city || '')}（{transit.arrival_tick} tick 到）
              </span>
            )}
            {gameState.is_practice && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-accent-teal/15 text-accent-teal">练习</span>
            )}
          </div>
        </div>
        <div className="mt-3 h-1.5 bg-background-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(100, (tick / totalTicks) * 100)}%` }}
          />
        </div>
      </div>

      <div className="glass-card p-4 mb-6">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          商路地图
        </h3>
        <FushengjiMapStage
          configId={gameConfigId}
          world={worldSlice}
          currentCity={participant.current_city}
          selectedCity={mapFocusCity || selectedCity || null}
          onSelectCity={(id) => {
            setMapFocusCity(id);
            if (actionType === 'move' && moveTargets.includes(id)) setSelectedCity(id);
          }}
          tick={tick}
          transit={transit}
        />
      </div>

      {isFinished && (
        <div className="glass-card p-6 mb-6 border border-primary/20 text-center">
          <Crown className="w-10 h-10 mx-auto text-primary mb-2" />
          <h3 className="text-lg font-semibold">比赛结束</h3>
          <p className="text-sm text-foreground-muted mt-1">
            排名 #{standings.find((s) => s.user_id === user?.id)?.rank ?? '-'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/games')}
            className="mt-4 px-6 py-2.5 bg-primary text-background rounded-lg font-medium"
          >
            返回大厅
          </button>
        </div>
      )}

      {lastMsg && (
        <p className="text-sm text-accent-teal mb-4 text-center">{lastMsg}</p>
      )}

      <div className="glass-card p-4 mb-6 border border-accent-teal/15">
        <h3 className="text-sm font-semibold text-accent-teal mb-1">即时物流商战</h3>
        <p className="text-xs text-foreground-muted">
          每 {gameState.rts?.tick_interval_sec ?? 5} 秒结算一次：买入价 ask、卖出价 bid，同城买卖必有价差。工业城产日用品，科技/工业产家电，农业城产粮与生鲜。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              {viewingRemote ? `${resolveCityName(quoteCity)} · 报价预览` : '本城市场'}
            </h3>
            {viewingRemote && (
              <p className="text-xs text-warning mb-3">仅可查看邻城报价；买入/卖出须在本城执行</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-foreground-muted border-b border-border-subtle">
                    <th className="pb-2">商品</th>
                    <th className="pb-2">体积</th>
                    <th className="pb-2">买入 ask</th>
                    <th className="pb-2">卖出 bid</th>
                    <th className="pb-2">池</th>
                    <th className="pb-2">趋势</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPrices.map((product) => (
                    <tr
                      key={product.product_id}
                      onClick={() => canAct && !viewingRemote && setSelectedProduct(product.product_id)}
                      className={`border-b border-border-subtle/50 ${
                        canAct && !viewingRemote ? 'cursor-pointer hover:bg-background-hover' : ''
                      } ${selectedProduct === product.product_id ? 'bg-primary-soft' : ''}`}
                    >
                      <td className="py-2 font-medium">{product.name}</td>
                      <td className="py-2 text-foreground-muted">{product.volume ?? 1}</td>
                      <td className="py-2 text-danger">¥{product.buy_price}</td>
                      <td className="py-2 text-success">¥{product.sell_price}</td>
                      <td className="py-2 text-xs text-foreground-muted">{Math.round(product.pool_qty ?? 0)}</td>
                      <td className="py-2">
                        {product.trend === 'up' ? (
                          <TrendingUp className="w-4 h-4 text-success inline" />
                        ) : product.trend === 'down' ? (
                          <TrendingDown className="w-4 h-4 text-danger inline" />
                        ) : (
                          <Minus className="w-4 h-4 text-foreground-muted inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {!isFinished && isPlaying && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3">操作（下 tick 执行）</h3>
              {!canAct && transit && (
                <p className="text-sm text-warning mb-4">运输途中，到达后可交易</p>
              )}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {(
                  [
                    { type: 'buy' as const, label: '买入', icon: ShoppingCart },
                    { type: 'sell' as const, label: '卖出', icon: Wallet },
                    { type: 'move' as const, label: '移动', icon: Truck },
                    { type: 'buy_vehicle' as const, label: '购车', icon: Box },
                  ] as const
                ).map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    type="button"
                    disabled={!canAct || (viewingRemote && (type === 'buy' || type === 'sell'))}
                    onClick={() => setActionType(type)}
                    className={`py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${
                      actionType === type ? 'bg-primary text-background' : 'bg-background-secondary'
                    } disabled:opacity-40`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {(actionType === 'buy' || actionType === 'sell') && (
                <div className="space-y-3">
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    disabled={!canAct || viewingRemote}
                    className="w-full px-3 py-2 bg-background-secondary border border-border-subtle rounded-lg"
                  >
                    <option value="">选择商品</option>
                    {currentCityPrices.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.name} · ask ¥{p.buy_price} / bid ¥{p.sell_price}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={actionType === 'sell' ? selectedHeld : maxBuyQty}
                    value={quantity}
                    disabled={!canAct || viewingRemote}
                    onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-background-secondary border border-border-subtle rounded-lg"
                  />
                </div>
              )}

              {actionType === 'move' && (
                <div className="grid grid-cols-3 gap-2">
                  {moveTargets.map((city) => (
                    <button
                      key={city}
                      type="button"
                      disabled={!canAct || !!transit}
                      onClick={() => setSelectedCity(city)}
                      className={`py-2 rounded-lg text-sm ${
                        selectedCity === city ? 'bg-primary text-background' : 'bg-background-secondary'
                      }`}
                    >
                      {resolveCityName(city)}
                      {worldRoutes.length > 0 && (
                        <span className="block text-[10px] opacity-70">
                          {worldRoutes.find(
                            (e) =>
                              (e.from_city === participant.current_city && e.to_city === city) ||
                              (e.to_city === participant.current_city && e.from_city === city),
                          )?.base_travel_ticks ?? '?'}
                          {' '}
                          tick
                        </span>
                      )}
                    </button>
                  ))}
                  {moveTargets.length === 0 && (
                    <p className="col-span-3 text-sm text-foreground-muted">当前无可达邻城</p>
                  )}
                </div>
              )}

              {actionType === 'buy_vehicle' && (
                <div className="space-y-2">
                  <p className="text-xs text-foreground-muted">
                    已购 {vehicles.length}/{maxVehicles} 辆
                  </p>
                  {(['van', 'truck'] as const).map((v) => {
                    const def = vehicleDefs[v] || {};
                    return (
                      <button
                        key={v}
                        type="button"
                        disabled={!canAct || vehicles.length >= maxVehicles}
                        onClick={() => setVehicleType(v)}
                        className={`w-full text-left p-3 rounded-lg border ${
                          vehicleType === v ? 'border-primary bg-primary-soft' : 'border-border-subtle'
                        }`}
                      >
                        <span className="font-medium">{VEHICLE_LABELS[v] || def.name || v}</span>
                        <span className="text-xs text-foreground-muted block">
                          ¥{def.cost} · +{def.capacity_bonus} 格 · 速度 -{def.speed_bonus} tick
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canAct || submitting || loading}
                className="w-full mt-4 py-3 bg-primary text-background rounded-xl font-semibold disabled:opacity-50 flex justify-center gap-2"
              >
                {(submitting || loading) && <Loader2 className="w-5 h-5 animate-spin" />}
                提交指令
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              库存 · {storageUsed}/{storageCap} 格
            </h3>
            {vehicles.length > 0 && (
              <p className="text-xs text-foreground-muted mb-2">
                车辆：{vehicles.map((v) => VEHICLE_LABELS[v] || v).join('、')}
              </p>
            )}
            {inventory.length ? (
              inventory.map((item) => (
                <div key={item.product_id} className="flex justify-between py-2 text-sm border-b border-border-subtle/30">
                  <span>
                    {item.name} ×{item.quantity}
                    <span className="text-xs text-foreground-muted ml-1">({(item.volume ?? 1) * item.quantity}格)</span>
                  </span>
                  <span>¥{item.current_value}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-foreground-muted text-center py-4">空</p>
            )}
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              排行榜
            </h3>
            {standings.slice(0, 8).map((e) => (
              <div
                key={e.user_id}
                className={`flex justify-between py-2 text-sm ${e.user_id === user?.id ? 'text-primary font-medium' : ''}`}
              >
                <span>
                  #{e.rank} {e.username}
                </span>
                <span>¥{e.total_assets.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
