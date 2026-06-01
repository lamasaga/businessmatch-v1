import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus, MapPin, Wallet, Package,
  Loader2, Crown, Clock, ShoppingCart, Truck, BarChart3, Box,
  ArrowLeft, X,
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

  const exitPath = gameState.is_practice ? '/activities' : '/games';

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
    <div className="relative flex flex-col h-full min-h-0">
      {/* 顶栏 HUD */}
      <header className="shrink-0 border-b border-border-subtle bg-background-secondary/90 backdrop-blur-md px-4 py-2.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(exitPath)}
              className="p-2 rounded-lg hover:bg-background-hover text-foreground-muted hover:text-foreground"
              title="退出对局"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">
                {event.title || '浮生记 · 商战'}
              </h1>
              <p className="text-[11px] text-foreground-muted">
                {gameState.is_practice ? '单人练习' : '正式对局'}
                {' · '}
                每 {rts?.tick_interval_sec ?? 5}s 一 tick
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-sm">
            <div className="text-center">
              <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Tick</p>
              <p className="font-bold tabular-nums">
                {tick}/{totalTicks}
                <span className="text-xs font-normal text-foreground-muted ml-1">
                  {phase === 'warmup' ? '热身' : phase === 'running' ? '正赛' : phase}
                </span>
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-foreground-muted">倒计时</p>
              <p className="font-bold text-accent-teal flex items-center gap-1 tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                {rts?.seconds_until_next_tick ?? 0}s
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-foreground-muted">现金</p>
              <p className="font-bold text-success tabular-nums">¥{participant.cash.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-foreground-muted">总资产</p>
              <p className="font-bold text-primary tabular-nums">¥{participant.total_assets.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-foreground-muted">仓储</p>
              <p className="font-bold tabular-nums">
                {storageUsed}/{storageCap}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-foreground-muted max-w-[200px]">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate text-xs">{cityLabel}</span>
              {transit && (
                <span className="text-warning text-xs truncate">
                  →{resolveCityName(transit.to_city || '')}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-2 h-1 bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(100, (tick / totalTicks) * 100)}%` }}
          />
        </div>
      </header>

      {lastMsg && (
        <p className="shrink-0 text-center text-xs text-accent-teal py-1 bg-accent-teal/10 border-b border-accent-teal/20">
          {lastMsg}
        </p>
      )}

      {/* 主战区：地图 | 物价 */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden">
        <section className="flex-1 min-h-[220px] lg:min-h-0 flex flex-col glass-card overflow-hidden">
          <div className="shrink-0 px-3 py-2 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              商路地图
            </h2>
            <span className="text-[10px] text-foreground-muted">点击城市查看邻城报价</span>
          </div>
          <div className="flex-1 min-h-0 p-2">
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
              className="h-full"
            />
          </div>
        </section>

        <section className="flex-1 min-h-[280px] lg:min-h-0 lg:max-w-[44%] xl:max-w-[42%] flex flex-col glass-card overflow-hidden">
          <div className="shrink-0 px-3 py-2 border-b border-border-subtle">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              {viewingRemote ? `${resolveCityName(quoteCity)} · 报价` : '本城物价'}
            </h2>
            {viewingRemote && (
              <p className="text-[10px] text-warning mt-0.5">预览邻城；买卖须在本城执行</p>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background-card z-10">
                <tr className="text-left text-[10px] text-foreground-muted border-b border-border-subtle">
                  <th className="px-3 py-2">商品</th>
                  <th className="px-2 py-2">体</th>
                  <th className="px-2 py-2">ask</th>
                  <th className="px-2 py-2">bid</th>
                  <th className="px-2 py-2">池</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {displayPrices.map((product) => (
                  <tr
                    key={product.product_id}
                    onClick={() => canAct && !viewingRemote && setSelectedProduct(product.product_id)}
                    className={`border-b border-border-subtle/40 ${
                      canAct && !viewingRemote ? 'cursor-pointer hover:bg-background-hover' : ''
                    } ${selectedProduct === product.product_id ? 'bg-primary-soft' : ''}`}
                  >
                    <td className="px-3 py-2 font-medium">{product.name}</td>
                    <td className="px-2 py-2 text-foreground-muted">{product.volume ?? 1}</td>
                    <td className="px-2 py-2 text-danger">¥{product.buy_price}</td>
                    <td className="px-2 py-2 text-success">¥{product.sell_price}</td>
                    <td className="px-2 py-2 text-xs text-foreground-muted">
                      {Math.round(product.pool_qty ?? 0)}
                    </td>
                    <td className="px-2 py-2">
                      {product.trend === 'up' ? (
                        <TrendingUp className="w-3.5 h-3.5 text-success" />
                      ) : product.trend === 'down' ? (
                        <TrendingDown className="w-3.5 h-3.5 text-danger" />
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-foreground-muted" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* 底栏：操作 + 库存 + 排行 */}
      <footer className="shrink-0 border-t border-border-subtle bg-background-secondary/80 backdrop-blur-md p-3">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 max-h-[38vh] xl:max-h-[32vh] overflow-y-auto xl:overflow-visible">
          {!isFinished && isPlaying && (
            <div className="xl:col-span-5 glass-card p-3">
              <h3 className="text-xs font-semibold text-foreground-muted mb-2">操作 · 下 tick 执行</h3>
              {!canAct && transit && (
                <p className="text-xs text-warning mb-2">运输途中，到达后可交易</p>
              )}
              <div className="grid grid-cols-4 gap-1.5 mb-2">
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
                    className={`py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${
                      actionType === type ? 'bg-primary text-background' : 'bg-background-secondary'
                    } disabled:opacity-40`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {(actionType === 'buy' || actionType === 'sell') && (
                <div className="flex gap-2 mb-2">
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    disabled={!canAct || viewingRemote}
                    className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-background-secondary border border-border-subtle rounded-lg"
                  >
                    <option value="">商品</option>
                    {currentCityPrices.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.name}
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
                    className="w-16 px-2 py-1.5 text-xs bg-background-secondary border border-border-subtle rounded-lg"
                  />
                </div>
              )}

              {actionType === 'move' && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {moveTargets.map((city) => (
                    <button
                      key={city}
                      type="button"
                      disabled={!canAct || !!transit}
                      onClick={() => setSelectedCity(city)}
                      className={`px-2.5 py-1 rounded-lg text-xs ${
                        selectedCity === city ? 'bg-primary text-background' : 'bg-background-secondary'
                      }`}
                    >
                      {resolveCityName(city)}
                    </button>
                  ))}
                </div>
              )}

              {actionType === 'buy_vehicle' && (
                <div className="flex gap-2 mb-2">
                  {(['van', 'truck'] as const).map((v) => {
                    const def = vehicleDefs[v] || {};
                    return (
                      <button
                        key={v}
                        type="button"
                        disabled={!canAct || vehicles.length >= maxVehicles}
                        onClick={() => setVehicleType(v)}
                        className={`flex-1 text-left px-2 py-1.5 rounded-lg border text-xs ${
                          vehicleType === v ? 'border-primary bg-primary-soft' : 'border-border-subtle'
                        }`}
                      >
                        {VEHICLE_LABELS[v] || v} ¥{def.cost}
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canAct || submitting || loading}
                className="w-full py-2 bg-primary text-background rounded-lg text-sm font-semibold disabled:opacity-50 flex justify-center gap-2"
              >
                {(submitting || loading) && <Loader2 className="w-4 h-4 animate-spin" />}
                提交指令
              </button>
            </div>
          )}

          <div className={`glass-card p-3 ${!isFinished && isPlaying ? 'xl:col-span-4' : 'xl:col-span-6'}`}>
            <h3 className="text-xs font-semibold flex items-center gap-1 mb-2">
              <Package className="w-3.5 h-3.5 text-primary" />
              库存 {storageUsed}/{storageCap}
            </h3>
            <div className="max-h-24 overflow-y-auto text-xs space-y-1">
              {inventory.length ? (
                inventory.map((item) => (
                  <div key={item.product_id} className="flex justify-between">
                    <span>
                      {item.name} ×{item.quantity}
                    </span>
                    <span className="text-foreground-muted">¥{item.current_value}</span>
                  </div>
                ))
              ) : (
                <p className="text-foreground-muted">空</p>
              )}
            </div>
          </div>

          <div className={`glass-card p-3 ${!isFinished && isPlaying ? 'xl:col-span-3' : 'xl:col-span-6'}`}>
            <h3 className="text-xs font-semibold flex items-center gap-1 mb-2">
              <Crown className="w-3.5 h-3.5 text-primary" />
              排行榜
            </h3>
            <div className="max-h-24 overflow-y-auto text-xs space-y-1">
              {standings.slice(0, 6).map((e) => (
                <div
                  key={e.user_id}
                  className={`flex justify-between ${e.user_id === user?.id ? 'text-primary font-medium' : ''}`}
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
      </footer>

      {isFinished && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/85 backdrop-blur-sm p-6">
          <div className="glass-card p-8 max-w-md w-full text-center border border-primary/30 relative">
            <button
              type="button"
              onClick={() => navigate(exitPath)}
              className="absolute top-3 right-3 p-1 rounded-lg hover:bg-background-hover text-foreground-muted"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
            <Crown className="w-12 h-12 mx-auto text-primary mb-3" />
            <h3 className="text-xl font-semibold">比赛结束</h3>
            <p className="text-sm text-foreground-muted mt-2">
              你的排名 #{standings.find((s) => s.user_id === user?.id)?.rank ?? '-'}
            </p>
            <button
              type="button"
              onClick={() => navigate(exitPath)}
              className="mt-6 px-8 py-2.5 bg-primary text-background rounded-xl font-medium"
            >
              {gameState.is_practice ? '返回日常活动' : '返回商赛大厅'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-danger bg-background/90 px-3 py-1 rounded-full">
          {error}
        </p>
      )}
    </div>
  );
}
