import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeDollarSign,
  BarChart3,
  Boxes,
  Clock,
  Crown,
  Loader2,
  MapPin,
  Package,
  Route,
  ShoppingCart,
  Store,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCircle,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTradingStore } from '../../stores/tradingStore';
import { useAuthStore } from '../../stores/authStore';
import type { GameState, ProductPrice, StandingsEntry } from '../../types';
import FushengjiMapStage from '../../components/fushengji/FushengjiMapStage';
import FstDayClock from '../../components/fushengji/FstDayClock';
import FstPendingQueue from '../../components/fushengji/FstPendingQueue';
import FstDayDigestToast from '../../components/fushengji/FstDayDigestToast';
import AnimatedMetric from '../../components/fushengji/AnimatedMetric';
import { useRtsCountdown } from '../../hooks/useRtsCountdown';
import { formatGameDate } from '../../lib/fstGameTime';
import { neighborCityIds } from '../../lib/fstradingGeo';
import { resolveCityZhLabel } from '../../lib/fushengjiCityMarkers';

const ASSET_ROOT = '/assets/fushengji/v1';
const PRODUCT_ICON_FILES: Record<string, string> = {
  grain: '2liangshi.jpg',
  produce: '2xiaofeipin.jpg',
  raw_materials: '2yuancailiao.jpg',
  energy: '2nengyuan.jpg',
  chemicals: '2huagongp.jpg',
  medicine: '2baogao.jpg',
  furniture: '2jiaju.jpg',
  textile: '2xiaofei.jpg',
  apparel: '2shechiping.jpg',
  machinery: '2chengjiao.jpg',
  daily_goods: '2riyongp.jpg',
  appliances: '2dianshijiadian.jpg',
  digital_device: '2duyangdeshuma.jpg',
  passenger_car: '2dianzichanp.jpg',
  cultural_goods: '2yule.jpg',
  luxury: '2shujuku.jpg',
};
const PRODUCT_ICON = (id: string) => {
  const file = PRODUCT_ICON_FILES[id];
  return file ? `${ASSET_ROOT}/items-v2/${file}` : `${ASSET_ROOT}/items/${id}.svg`;
};
const DEFAULT_OPPONENT_AVATAR = '/assets/role-portraits/01.jpg';
const MENU = [
  { id: 'market', label: '市场', icon: BarChart3 },
  { id: 'fleet', label: '车队', icon: Truck },
  { id: 'distributor', label: '分销', icon: Store },
  { id: 'orders', label: '订单', icon: BadgeDollarSign },
  { id: 'opponents', label: '对手', icon: Users },
  { id: 'profile', label: '自己', icon: UserCircle },
  { id: 'rank', label: '排行', icon: Crown },
] as const;

type MenuId = (typeof MENU)[number]['id'];
type ActionType = 'buy' | 'sell' | 'move' | 'buy_vehicle' | 'set_distributor';

const VEHICLE_LABELS: Record<string, string> = {
  van: '小货车',
  truck: '大卡车',
};

const SUPPLY_LABELS: Record<string, { label: string; className: string }> = {
  severe_shortage: { label: '急缺', className: 'fst-chip fst-chip--danger' },
  shortage: { label: '缺货', className: 'fst-chip fst-chip--warning' },
  balanced: { label: '平衡', className: 'fst-chip' },
  surplus: { label: '过剩', className: 'fst-chip fst-chip--success' },
};

const ROLE_LABELS: Record<string, string> = {
  producer: '产地',
  consumer: '销地',
  hub: '枢纽',
  import_only: '纯需求',
  neutral: '常规',
};

type Props = {
  gameState: GameState;
  eventId: number;
};

function formatMoney(value: number) {
  return `¥${Math.round(value).toLocaleString()}`;
}

function stateMeta(product?: ProductPrice) {
  return SUPPLY_LABELS[product?.supply_state || 'balanced'] || SUPPLY_LABELS.balanced;
}

function bestRemoteRoute(product: ProductPrice | undefined, markets: GameState['markets'], fromCity: string) {
  if (!product) return null;
  const candidates = markets
    .filter((market) => market.city !== fromCity)
    .map((market) => {
      const remote = market.products.find((p) => p.product_id === product.product_id);
      return remote
        ? {
            city: market.city,
            cityName: market.city_name,
            bid: remote.sell_price,
            gross: remote.sell_price - product.buy_price,
            state: remote.supply_state,
          }
        : null;
    })
    .filter(Boolean) as Array<{ city: string; cityName: string; bid: number; gross: number; state?: string }>;
  return candidates.sort((a, b) => b.gross - a.gross)[0] || null;
}

export default function TradingRTSView({ gameState, eventId }: Props) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { submitRtsAction, error, lastActionHint } = useTradingStore();

  const [activeMenu, setActiveMenu] = useState<MenuId>('market');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [actionType, setActionType] = useState<ActionType>('buy');
  const [selectedCity, setSelectedCity] = useState('');
  const [mapFocusCity, setMapFocusCity] = useState('');
  const [vehicleType, setVehicleType] = useState<'van' | 'truck'>('van');
  const [distributorSide, setDistributorSide] = useState<'buy' | 'sell'>('buy');
  const [limitPrice, setLimitPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSettlement, setShowSettlement] = useState(true);

  const { event, participant, inventory, standings, rts, inventory_capacity } = gameState;
  const isFinished = event.status === 'finished';
  const isPlaying = event.status === 'playing';
  const countdown = useRtsCountdown(rts);
  const settlementLocked = Boolean(rts?.settlement_locked) || countdown.locked;
  const canAct = isPlaying && (gameState.can_submit_decision ?? false) && !settlementLocked;
  const pendingActions = rts?.pending_actions ?? [];
  const lastDigest = rts?.last_tick_digest;
  const exitPath = gameState.is_practice ? '/activities' : '/games';

  const currentMarket = gameState.markets?.find((m) => m.city === participant.current_city);
  const currentCityPrices = currentMarket?.products || [];
  const quoteCity = mapFocusCity || participant.current_city;
  const quoteMarket = gameState.markets?.find((m) => m.city === quoteCity);
  const displayPrices = quoteMarket?.products || currentCityPrices;
  const viewingRemote = quoteCity !== participant.current_city;
  const selectedProductObj =
    displayPrices.find((p) => p.product_id === selectedProduct) ||
    currentCityPrices.find((p) => p.product_id === selectedProduct) ||
    displayPrices[0];

  const worldSlice = rts?.world;
  const worldRoutes = worldSlice?.routes ?? [];
  const moveTargets = useMemo(() => {
    const all = (event.config?.cities as string[] | undefined) || [];
    if (worldRoutes.length) {
      return neighborCityIds(participant.current_city, worldRoutes).filter((id) => id !== participant.current_city);
    }
    return all.filter((id) => id !== participant.current_city);
  }, [event.config?.cities, participant.current_city, worldRoutes]);

  const cap = inventory_capacity;
  const storageUsed = cap?.storage_used ?? 0;
  const storageCap = cap?.storage_capacity ?? 99;
  const vehicles = cap?.vehicles ?? [];
  const maxVehicles = cap?.max_vehicles ?? 3;
  const gameDay = rts?.tick ?? 0;
  const totalDays = rts?.total_ticks ?? 180;
  const gameDate = formatGameDate(gameDay, totalDays);
  const phase = rts?.phase ?? 'warmup';
  const transit = rts?.transit as { from_city?: string; to_city?: string; arrival_tick?: number } | null | undefined;
  const vehicleDefs = (rts?.vehicles_available ?? {}) as Record<string, { name?: string; cost?: number; capacity_bonus?: number; speed_bonus?: number }>;
  const distributors = rts?.distributors ?? [];
  const marketEvents = rts?.market_events ?? [];

  const resolveCityName = (cityId: string) => {
    const marketName = gameState.markets?.find((m) => m.city === cityId)?.city_name;
    return resolveCityZhLabel(cityId, marketName);
  };

  const selectedHeld = selectedProductObj
    ? inventory.find((i) => i.product_id === selectedProductObj.product_id)?.quantity ?? 0
    : 0;
  const maxBuyQty = (() => {
    const p = selectedProductObj;
    if (!p) return 0;
    const remainVol = Math.max(0, storageCap - storageUsed);
    const byCash = p.buy_price > 0 ? Math.floor(participant.cash / p.buy_price) : 0;
    const byVol = p.volume ? Math.floor(remainVol / p.volume) : remainVol;
    return Math.max(0, Math.min(byCash, byVol, 50));
  })();
  const bestRoute = bestRemoteRoute(selectedProductObj, gameState.markets || [], participant.current_city);
  const cityLabel = currentMarket?.city_name || participant.current_city;
  const supplyMeta = stateMeta(selectedProductObj);

  const executeAction = async (type: ActionType, payload: Record<string, unknown>) => {
    if (!canAct || submitting) return;
    setSubmitting(true);
    try {
      await submitRtsAction(eventId, type, payload);
    } finally {
      setSubmitting(false);
    }
  };

  const trade = (type: 'buy' | 'sell') => {
    if (!selectedProductObj) return;
    const max = type === 'sell' ? selectedHeld : maxBuyQty;
    const safeQty = Math.max(1, Math.min(quantity, max || 1));
    void executeAction(type, { product_id: selectedProductObj.product_id, quantity: safeQty });
  };

  const moveToCity = (city: string) => {
    if (!moveTargets.includes(city) || transit) return;
    setSelectedCity(city);
    setActionType('move');
    void executeAction('move', { to_city: city });
  };

  const buyVehicle = () => {
    void executeAction('buy_vehicle', { vehicle_type: vehicleType });
  };

  const setDistributor = () => {
    if (!selectedProductObj) return;
    void executeAction('set_distributor', {
      city: participant.current_city,
      product_id: selectedProductObj.product_id,
      side: distributorSide,
      limit_price: limitPrice || (distributorSide === 'buy' ? selectedProductObj.buy_price : selectedProductObj.sell_price) || 1,
      quantity,
    });
  };

  const selectProduct = (product: ProductPrice) => {
    setSelectedProduct(product.product_id);
    if (!limitPrice) setLimitPrice(product.buy_price);
  };

  return (
    <div className="fst-theme fst-command-ui relative flex h-full min-h-0 flex-col overflow-hidden">
      <header className="fst-topbar">
        <button type="button" onClick={() => navigate(exitPath)} className="fst-icon-button" title="退出对局">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-[170px]">
          <h1 className="text-sm font-bold leading-tight text-foreground">{event.title || '浮生记 · 商战'}</h1>
          <p className="text-[11px] text-foreground-muted">
            {gameState.is_practice ? '练习赛' : '正式赛'} · {phase === 'warmup' ? '热身' : phase === 'running' ? '正赛' : phase}
          </p>
        </div>
        <div className="fst-hud-grid">
        <FstDayClock dateLabel={gameDate} countdown={countdown} playing={isPlaying && !isFinished} />
          <HudMetric icon={Wallet} label="现金" value={formatMoney(participant.cash)} tone="green" animated />
          <HudMetric icon={Crown} label="总资产" value={formatMoney(participant.total_assets)} tone="gold" animated />
          <HudMetric icon={Boxes} label="仓储" value={`${storageUsed}/${storageCap}`} />
        </div>
        <div className="fst-location-chip">
          <MapPin className="h-4 w-4" />
          <span>{cityLabel}</span>
          {transit && <b>→ {resolveCityName(transit.to_city || '')}</b>}
        </div>
      </header>

      <FstDayDigestToast digest={lastDigest} gameDay={gameDay} totalDays={totalDays} />

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 xl:grid-cols-[72px_minmax(0,1fr)_390px]">
        <nav className="fst-side-menu">
          {MENU.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={activeMenu === id ? 'is-active' : ''}
              onClick={() => setActiveMenu(id)}
              title={label}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <section className="fst-map-shell">
          <div className="fst-map-title">
            <div>
              <p>长三角商路</p>
              <strong>{viewingRemote ? `${resolveCityName(quoteCity)} · 预览` : `${cityLabel} · 当前`}</strong>
            </div>
            <div className="fst-event-strip">
              {marketEvents.slice(0, 2).map((ev, index) => (
                <span key={`${String(ev.type)}-${index}`}>
                  {String(ev.phase || 'event')} · {String(ev.name || ev.type)}
                </span>
              ))}
              {!marketEvents.length && <span>暂无事件预告</span>}
            </div>
          </div>
          <FushengjiMapStage
            configId={event.game_config_id || 'fstrading'}
            world={worldSlice}
            currentCity={participant.current_city}
            selectedCity={mapFocusCity || selectedCity || null}
            highlightCityIds={actionType === 'move' ? moveTargets : []}
            onSelectCity={(id) => {
              setMapFocusCity(id);
              setActiveMenu('market');
              if (actionType === 'move' && moveTargets.includes(id)) {
                moveToCity(id);
              }
            }}
            tick={gameDay}
            transit={transit}
            className="fst-map-stage"
          />
        </section>

        <aside className="fst-context-panel">
          {activeMenu === 'market' && (
            <MarketPanel
              products={displayPrices}
              selectedProduct={selectedProductObj}
              quoteName={resolveCityName(quoteCity)}
              viewingRemote={viewingRemote}
              onSelect={selectProduct}
            />
          )}
          {activeMenu === 'fleet' && (
            <FleetPanel
              vehicles={vehicles}
              maxVehicles={maxVehicles}
              vehicleDefs={vehicleDefs}
              selectedVehicle={vehicleType}
              onSelectVehicle={setVehicleType}
              onBuy={buyVehicle}
              canAct={canAct && vehicles.length < maxVehicles && !submitting}
            />
          )}
          {activeMenu === 'distributor' && (
            <DistributorPanel
              distributors={distributors}
              product={selectedProductObj}
              side={distributorSide}
              limitPrice={limitPrice}
              quantity={quantity}
              onSide={setDistributorSide}
              onLimit={setLimitPrice}
              onQuantity={setQuantity}
              onSubmit={setDistributor}
              canAct={canAct && !viewingRemote && !submitting}
            />
          )}
          {activeMenu === 'orders' && <OrdersPanel product={selectedProductObj} route={bestRoute} />}
          {activeMenu === 'opponents' && <OpponentsPanel standings={standings} currentUserId={user?.id} resolveCityName={resolveCityName} />}
          {activeMenu === 'profile' && (
            <MyPanel
              participant={participant}
              inventory={inventory}
              standings={standings}
              currentUserId={user?.id}
              cityName={cityLabel}
              gameDate={gameDate}
              storageUsed={storageUsed}
              storageCap={storageCap}
            />
          )}
          {activeMenu === 'rank' && <RankPanel standings={standings} currentUserId={user?.id} />}
        </aside>
      </main>

      {!isFinished && isPlaying && (
        <footer className="fst-command-slot">
          <FstPendingQueue pending={pendingActions} actionHint={lastActionHint} />

          <div className="fst-selected-good">
            {selectedProductObj ? (
              <>
                <img src={PRODUCT_ICON(selectedProductObj.product_id)} alt="" />
                <div>
                  <strong>{selectedProductObj.name}</strong>
                  <span>
                    {ROLE_LABELS[selectedProductObj.city_role || 'neutral'] || selectedProductObj.city_role} · {supplyMeta.label}
                  </span>
                </div>
              </>
            ) : (
              <span>选择商品开始操作</span>
            )}
          </div>

          <div className="fst-command-buttons">
            <button type="button" onClick={() => trade('buy')} disabled={!canAct || viewingRemote || maxBuyQty < 1 || submitting || settlementLocked}>
              <ShoppingCart className="h-4 w-4" />
              买入 {quantity}
            </button>
            <button type="button" onClick={() => trade('sell')} disabled={!canAct || viewingRemote || selectedHeld < 1 || submitting || settlementLocked}>
              <Wallet className="h-4 w-4" />
              卖出 {Math.min(quantity, Math.max(selectedHeld, 0))}
            </button>
            <button type="button" className={actionType === 'move' ? 'is-active' : ''} onClick={() => setActionType('move')} disabled={!canAct || !!transit || settlementLocked}>
              <Route className="h-4 w-4" />
              {actionType === 'move' ? '点地图发车' : '移动'}
            </button>
            <button type="button" className={actionType === 'set_distributor' ? 'is-active' : ''} onClick={() => { setActionType('set_distributor'); setActiveMenu('distributor'); }} disabled={!canAct || viewingRemote || settlementLocked}>
              <Store className="h-4 w-4" />
              分销
            </button>
          </div>

          <QuantityStepper
            value={quantity}
            max={Math.max(maxBuyQty, selectedHeld, 1)}
            onChange={setQuantity}
          />

          {actionType === 'move' && (
            <div className="fst-target-list">
              {moveTargets.map((city) => (
                <button
                  key={city}
                  type="button"
                  className={selectedCity === city ? 'is-active' : ''}
                  onClick={() => moveToCity(city)}
                  disabled={submitting || settlementLocked || !canAct}
                >
                  {resolveCityName(city)}
                </button>
              ))}
            </div>
          )}

          {submitting && (
            <div className="fst-command-busy">
              <Loader2 className="h-4 w-4 animate-spin" />
              排队中
            </div>
          )}
          {settlementLocked && !submitting && (
            <div className="fst-command-busy fst-command-busy--lock">
              <Clock className="h-4 w-4" />
              日末结算 · 请稍候
            </div>
          )}
        </footer>
      )}

      {isFinished && showSettlement && (
        <FstSettlementOverlay
          gameState={gameState}
          currentUserId={user?.id}
          onClose={() => setShowSettlement(false)}
          onExit={() => navigate(exitPath)}
        />
      )}

      {error && <p className="fst-error-pill">{error}</p>}
    </div>
  );
}

function FstSettlementOverlay({
  gameState,
  currentUserId,
  onClose,
  onExit,
}: {
  gameState: GameState;
  currentUserId?: number;
  onClose: () => void;
  onExit: () => void;
}) {
  const { participant, standings, inventory, markets, rts } = gameState;
  const myRank = standings.find((s) => s.user_id === currentUserId)?.rank ?? participant.final_rank ?? '-';
  const inventoryValue = inventory.reduce((sum, item) => sum + Number(item.current_value || 0), 0);
  const topProducts = [...inventory]
    .sort((a, b) => Number(b.current_value || 0) - Number(a.current_value || 0))
    .slice(0, 5);
  const topCities = markets
    .map((market) => ({
      name: market.city_name || market.city,
      shortages: market.products.filter((p) => p.supply_state === 'shortage' || p.supply_state === 'severe_shortage').length,
      surplus: market.products.filter((p) => p.supply_state === 'surplus').length,
    }))
    .slice(0, 6);

  return (
    <div className="absolute inset-0 z-[60] bg-white/88 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="mx-auto grid max-w-6xl gap-4">
        <div className="glass-card border border-primary/30 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold text-primary">FST 赛后结算</p>
              <h3 className="mt-1 text-2xl font-bold text-foreground">浮生记交易复盘</h3>
              <p className="mt-1 text-sm text-foreground-muted">
                {formatGameDate(rts?.tick ?? 0, rts?.total_ticks ?? 180)} · 赛季结束 · 可关闭此面板继续查看地图、市场、车队和排行。
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-border-subtle bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-background-hover">
                继续查看对局
              </button>
              <button type="button" onClick={onExit} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background">
                返回
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <SettlementMetric icon={Crown} label="最终排名" value={`#${myRank}`} />
          <SettlementMetric icon={Wallet} label="现金" value={formatMoney(participant.cash)} />
          <SettlementMetric icon={Boxes} label="库存价值" value={formatMoney(inventoryValue)} />
          <SettlementMetric icon={BarChart3} label="总资产" value={formatMoney(participant.total_assets)} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="glass-card p-4">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" /> 最终排行榜
            </h4>
            <div className="mt-3 grid gap-2">
              {standings.slice(0, 8).map((row) => (
                <div key={row.user_id} className={`grid grid-cols-[52px_1fr_auto] items-center gap-3 rounded-xl border px-3 py-2 text-sm ${row.user_id === currentUserId ? 'border-primary/40 bg-primary/10' : 'border-border-subtle bg-white'}`}>
                  <span className="font-bold text-primary">#{row.rank}</span>
                  <span className="font-semibold text-foreground">{row.username}</span>
                  <span className="tabular-nums text-foreground">{formatMoney(row.total_assets)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card p-4">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> 持仓与市场状态
            </h4>
            <div className="mt-3 space-y-3">
              {topProducts.length ? topProducts.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between rounded-xl border border-border-subtle bg-white px-3 py-2 text-sm">
                  <span className="font-semibold text-foreground">{item.name} × {item.quantity}</span>
                  <span className="tabular-nums text-foreground-muted">{formatMoney(item.current_value)}</span>
                </div>
              )) : <p className="rounded-xl bg-white p-3 text-sm text-foreground-muted">没有持仓。</p>}
              <div className="grid grid-cols-2 gap-2">
                {topCities.map((city) => (
                  <div key={city.name} className="rounded-xl border border-border-subtle bg-white px-3 py-2 text-xs text-foreground-muted">
                    <b className="block text-foreground">{city.name}</b>
                    缺货 {city.shortages} · 过剩 {city.surplus}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
      <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-lg bg-white p-2 text-foreground-muted shadow hover:bg-background-hover" aria-label="关闭结算面板">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function SettlementMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="glass-card border border-border-subtle p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/15 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-foreground-muted">{label}</p>
          <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );
}

function HudMetric({ icon: Icon, label, value, tone, animated }: { icon: typeof Wallet; label: string; value: string; tone?: 'cyan' | 'green' | 'gold'; animated?: boolean }) {
  return (
    <div className={`fst-hud-metric ${tone ? `fst-hud-metric--${tone}` : ''}`}>
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {animated ? <AnimatedMetric value={value} /> : <strong>{value}</strong>}
    </div>
  );
}

function MarketPanel({
  products,
  selectedProduct,
  quoteName,
  viewingRemote,
  onSelect,
}: {
  products: ProductPrice[];
  selectedProduct?: ProductPrice;
  quoteName: string;
  viewingRemote: boolean;
  onSelect: (product: ProductPrice) => void;
}) {
  return (
    <>
      <PanelHeader icon={BarChart3} title={`${quoteName} · 市场`} subtitle={viewingRemote ? '预览报价，买卖须回到本城' : '点击商品直接操作'} />
      <div className="fst-product-grid">
        {products.map((product) => {
          const meta = stateMeta(product);
          const selected = selectedProduct?.product_id === product.product_id;
          return (
            <button
              key={product.product_id}
              type="button"
              className={`fst-product-card ${selected ? 'is-selected' : ''}`}
              onClick={() => onSelect(product)}
            >
              <img src={PRODUCT_ICON(product.product_id)} alt="" />
              <span className="fst-product-card__name">{product.name}</span>
              <span className={meta.className}>{meta.label}</span>
              <span className="fst-product-card__prices">
                <b>买 {product.buy_price}</b>
                <b>卖 {product.sell_price}</b>
              </span>
              <span className="fst-product-card__meta">
                {ROLE_LABELS[product.city_role || 'neutral'] || product.city_role} · 供 {product.production ?? 0} / 需 {product.consumption ?? 0}
              </span>
              {product.trend === 'up' ? <TrendingUp className="trend trend-up" /> : product.trend === 'down' ? <TrendingDown className="trend trend-down" /> : null}
            </button>
          );
        })}
      </div>
    </>
  );
}

function FleetPanel({
  vehicles,
  maxVehicles,
  vehicleDefs,
  selectedVehicle,
  onSelectVehicle,
  onBuy,
  canAct,
}: {
  vehicles: string[];
  maxVehicles: number;
  vehicleDefs: Record<string, { name?: string; cost?: number; capacity_bonus?: number; speed_bonus?: number }>;
  selectedVehicle: 'van' | 'truck';
  onSelectVehicle: (v: 'van' | 'truck') => void;
  onBuy: () => void;
  canAct: boolean;
}) {
  return (
    <>
      <PanelHeader icon={Truck} title="车队" subtitle={`车辆 ${vehicles.length}/${maxVehicles}`} />
      <div className="fst-vehicle-list">
        {(['van', 'truck'] as const).map((type) => {
          const def = vehicleDefs[type] || {};
          return (
            <button key={type} type="button" className={selectedVehicle === type ? 'is-selected' : ''} onClick={() => onSelectVehicle(type)}>
              <img src={`${ASSET_ROOT}/vehicles/${type}.svg`} alt="" />
              <span>
                <strong>{VEHICLE_LABELS[type]}</strong>
                <small>容量 +{def.capacity_bonus ?? 0} · 速度 +{def.speed_bonus ?? 0}</small>
              </span>
              <b>{formatMoney(def.cost ?? 0)}</b>
            </button>
          );
        })}
      </div>
      <button type="button" onClick={onBuy} disabled={!canAct} className="fst-panel-action">
        <Truck className="h-4 w-4" />
        购置车辆
      </button>
    </>
  );
}

function DistributorPanel({
  distributors,
  product,
  side,
  limitPrice,
  quantity,
  onSide,
  onLimit,
  onQuantity,
  onSubmit,
  canAct,
}: {
  distributors: NonNullable<GameState['rts']>['distributors'];
  product?: ProductPrice;
  side: 'buy' | 'sell';
  limitPrice: number;
  quantity: number;
  onSide: (side: 'buy' | 'sell') => void;
  onLimit: (value: number) => void;
  onQuantity: (value: number) => void;
  onSubmit: () => void;
  canAct: boolean;
}) {
  return (
    <>
      <PanelHeader icon={Store} title="分销商" subtitle="限价自动买卖，有经营成本" />
      <div className="fst-distributor-form">
        <div className="fst-selected-good compact">
          {product && <img src={PRODUCT_ICON(product.product_id)} alt="" />}
          <div>
            <strong>{product?.name || '选择商品'}</strong>
            <span>{product ? `当前买 ${product.buy_price} / 卖 ${product.sell_price}` : '在市场中点选商品'}</span>
          </div>
        </div>
        <div className="fst-segmented">
          <button type="button" className={side === 'buy' ? 'is-active' : ''} onClick={() => onSide('buy')}>收购</button>
          <button type="button" className={side === 'sell' ? 'is-active' : ''} onClick={() => onSide('sell')}>卖出</button>
        </div>
        <label>
          限价
          <input type="number" min={1} value={limitPrice || ''} onChange={(e) => onLimit(Number(e.target.value) || 0)} />
        </label>
        <label>
          每日数量
          <input type="number" min={1} max={12} value={quantity} onChange={(e) => onQuantity(Number(e.target.value) || 1)} />
        </label>
        <button type="button" className="fst-panel-action" onClick={onSubmit} disabled={!canAct || !product}>
          <Store className="h-4 w-4" />
          设置分销商
        </button>
      </div>
      <div className="fst-mini-list">
        {(distributors || []).length ? (distributors || []).map((d, index) => (
          <div key={`${d.city}-${d.product_id}-${index}`}>
            <span>{d.side === 'buy' ? '收购' : '卖出'} {d.product_id}</span>
            <b>{d.limit_price} × {d.quantity}</b>
          </div>
        )) : <p>暂无分销商</p>}
      </div>
    </>
  );
}

function OrdersPanel({ product, route }: { product?: ProductPrice; route: ReturnType<typeof bestRemoteRoute> }) {
  return (
    <>
      <PanelHeader icon={BadgeDollarSign} title="机会与订单" subtitle="公共订单系统待完整接入" />
      <div className="fst-opportunity-card">
        <Route className="h-5 w-5" />
        <div>
          <strong>{product ? `${product.name} 推荐路线` : '选择商品查看路线'}</strong>
          {route ? (
            <span>运往 {route.cityName}，当前毛差 {formatMoney(route.gross)}</span>
          ) : (
            <span>暂无正向路线</span>
          )}
        </div>
      </div>
      <div className="fst-opportunity-card muted">
        <Package className="h-5 w-5" />
        <div>
          <strong>公共订单</strong>
          <span>后续会由城市短缺与事件生成限时交付目标</span>
        </div>
      </div>
    </>
  );
}

function RankPanel({ standings, currentUserId }: { standings: StandingsEntry[]; currentUserId?: number }) {
  return (
    <>
      <PanelHeader icon={Crown} title="排行榜" subtitle="实时总资产" />
      <div className="fst-rank-list">
        {standings.map((row) => (
          <div key={row.user_id} className={row.user_id === currentUserId ? 'is-me' : ''}>
            <span>#{row.rank}</span>
            <strong>{row.username}</strong>
            <b>{formatMoney(row.total_assets)}</b>
          </div>
        ))}
      </div>
    </>
  );
}

function OpponentsPanel({
  standings,
  currentUserId,
  resolveCityName,
}: {
  standings: StandingsEntry[];
  currentUserId?: number;
  resolveCityName: (cityId: string) => string;
}) {
  const opponents = standings.filter((row) => row.user_id !== currentUserId);
  return (
    <>
      <PanelHeader icon={Users} title="比赛对手" subtitle={`${opponents.length} 名竞争者`} />
      <div className="fst-opponent-list">
        {opponents.map((row) => (
          <div key={row.user_id}>
            <div className="fst-opponent-avatar">
              <img src={row.avatar || DEFAULT_OPPONENT_AVATAR} alt="" />
            </div>
            <div className="fst-opponent-info">
              <strong>{row.username}</strong>
              <small>{resolveCityName(row.current_city)} · 现金 {formatMoney(row.cash)}</small>
            </div>
            <b>{formatMoney(row.total_assets)}</b>
          </div>
        ))}
        {!opponents.length && <p className="fst-empty-note">暂无其他对手。</p>}
      </div>
    </>
  );
}

function MyPanel({
  participant,
  inventory,
  standings,
  currentUserId,
  cityName,
  gameDate,
  storageUsed,
  storageCap,
}: {
  participant: GameState['participant'];
  inventory: GameState['inventory'];
  standings: StandingsEntry[];
  currentUserId?: number;
  cityName: string;
  gameDate: string;
  storageUsed: number;
  storageCap: number;
}) {
  const myRank = standings.find((row) => row.user_id === currentUserId)?.rank ?? participant.final_rank ?? '-';
  const heldItems = inventory.filter((item) => item.quantity > 0);
  return (
    <>
      <PanelHeader icon={UserCircle} title="我的信息" subtitle={`${cityName} · ${gameDate}`} />
      <div className="fst-profile-summary">
        <div>
          <span>当前排名</span>
          <strong>#{myRank}</strong>
        </div>
        <div>
          <span>现金</span>
          <strong>{formatMoney(participant.cash)}</strong>
        </div>
        <div>
          <span>总资产</span>
          <strong>{formatMoney(participant.total_assets)}</strong>
        </div>
        <div>
          <span>仓储</span>
          <strong>{storageUsed}/{storageCap}</strong>
        </div>
      </div>
      <div className="fst-inventory-list">
        {heldItems.map((item) => (
          <div key={item.product_id}>
            <img src={PRODUCT_ICON(item.product_id)} alt="" />
            <div>
              <strong>{item.name}</strong>
              <small>持有 {item.quantity} · 均价 {Math.round(item.avg_cost || 0)}</small>
            </div>
            <b>{formatMoney(item.current_value)}</b>
          </div>
        ))}
        {!heldItems.length && <p className="fst-empty-note">当前没有持仓。</p>}
      </div>
    </>
  );
}

function QuantityStepper({ value, max, onChange }: { value: number; max: number; onChange: (value: number) => void }) {
  const safeMax = Math.max(1, max || 1);
  const set = (next: number) => onChange(Math.max(1, Math.min(safeMax, next)));
  return (
    <div className="fst-qty">
      <button type="button" onClick={() => set(value - 1)}>-</button>
      <input type="number" min={1} max={safeMax} value={value} onChange={(e) => set(Number(e.target.value) || 1)} />
      <button type="button" onClick={() => set(value + 1)}>+</button>
      {[1, 5, 10].map((n) => (
        <button key={n} type="button" onClick={() => set(n)}>×{n}</button>
      ))}
      <button type="button" onClick={() => set(safeMax)}>全部</button>
    </div>
  );
}

function PanelHeader({ icon: Icon, title, subtitle }: { icon: typeof BarChart3; title: string; subtitle: string }) {
  return (
    <div className="fst-panel-header">
      <Icon className="h-5 w-5" />
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
