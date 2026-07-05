import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTechVentureStore } from '../../stores/techventureStore';
import type {
  RouteId,
  TvCityConfig,
  TvGameState,
  TvLeaderboardEntry,
  TvNewsItem,
  TvRouteConfig,
  TvSubmitPayload,
} from '../../types/techventure';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Cpu,
  FlaskConical,
  Gauge,
  Landmark,
  LayoutDashboard,
  Loader2,
  MapPin,
  Megaphone,
  Newspaper,
  PanelRight,
  Route,
  Send,
  Target,
  Trophy,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import TvHud from '../../components/techventure/TvHud';
import TvStrategySelector from '../../components/techventure/TvStrategySelector';
import TvKpiCards from '../../components/techventure/TvKpiCards';
import TvLeaderboardPanel from '../../components/techventure/TvLeaderboardPanel';
import TvNewsPanel from '../../components/techventure/TvNewsPanel';
import TvRoundStepper from '../../components/techventure/TvRoundStepper';
import TvRoundCountdown from '../../components/techventure/TvRoundCountdown';
import TvBudgetPanel from '../../components/techventure/TvBudgetPanel';
import TvCityInvestPanel from '../../components/techventure/TvCityInvestPanel';
import { useRefreshCareerOnMatchFinish } from '../../hooks/useRefreshCareerOnMatchFinish';

type TechMenu = 'strategy' | 'investment' | 'market' | 'intel' | 'rank';

const MENU_ITEMS: Array<{ id: TechMenu; label: string; sub: string; icon: typeof LayoutDashboard }> = [
  { id: 'strategy', label: '战略', sub: '路线与城市', icon: Route },
  { id: 'investment', label: '投入', sub: 'Tech/Fit/Show', icon: Wallet },
  { id: 'market', label: '市场', sub: '三城客群', icon: Building2 },
  { id: 'intel', label: '情报', sub: '新闻与 BQI', icon: Newspaper },
  { id: 'rank', label: '排行', sub: '竞争态势', icon: Trophy },
];

const ROUTE_ACCENTS: Record<RouteId, { icon: typeof Cpu; color: string; bg: string }> = {
  TECH: { icon: Cpu, color: 'text-tv-tech', bg: 'bg-tv-tech/10 border-tv-tech/25' },
  USER: { icon: Users, color: 'text-tv-user', bg: 'bg-tv-user/10 border-tv-user/25' },
  BRAND: { icon: Megaphone, color: 'text-tv-brand', bg: 'bg-tv-brand/10 border-tv-brand/25' },
  PATHFINDER: { icon: Target, color: 'text-tv-pathfinder', bg: 'bg-tv-pathfinder/10 border-tv-pathfinder/25' },
};

export default function TechVenturePlayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = Number(id);
  const exitPath = sessionStorage.getItem('bizsim_practice_return') || '/games';
  const exitLabel = exitPath === '/activities' ? '返回日常活动' : '返回商赛大厅';

  const {
    gameState, leaderboard, news, snapshots, loading, error,
    fetchState, poll, submitDecision, setProductName,
    fetchLeaderboard, fetchNews, clearError,
  } = useTechVentureStore();

  const [activeMenu, setActiveMenu] = useState<TechMenu>('strategy');
  const [route, setRoute] = useState<RouteId>('TECH');
  const [openedCities, setOpenedCities] = useState<string[]>([]);
  const [investTech, setInvestTech] = useState(0);
  const [investFit, setInvestFit] = useState<Record<string, number>>({});
  const [investShow, setInvestShow] = useState<Record<string, number>>({});
  const [declaration, setDeclaration] = useState('');
  const [productName, setProductNameLocal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSettlement, setShowSettlement] = useState(true);
  const formScopeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (eventId) {
      fetchState(eventId);
      fetchLeaderboard(eventId);
      fetchNews(eventId);
    }
  }, [eventId, fetchState, fetchLeaderboard, fetchNews]);

  const teamRoute = gameState?.team.route;
  const teamOpenedCities = gameState?.team.opened_cities;
  const teamProductName = gameState?.team.product_name;
  const teamId = gameState?.team.team_id;
  const roundNoForInit = gameState?.current_round?.round_no ?? null;
  const hasSubmitted = gameState?.has_submitted ?? false;
  const openedCitiesKey = teamOpenedCities?.join('|') ?? '';

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!gameState) return;
    const formScopeKey = `${gameState.team.team_id}:${gameState.current_round?.round_no ?? 'waiting'}:${gameState.has_submitted ? 'submitted' : 'open'}`;
    if (formScopeKeyRef.current === formScopeKey) return;

    formScopeKeyRef.current = formScopeKey;
    setRoute(gameState.team.route);
    setOpenedCities([...gameState.team.opened_cities]);
    setProductNameLocal(gameState.team.product_name || '');
    if (!gameState.has_submitted) {
      setInvestTech(0);
      setInvestFit({});
      setInvestShow({});
      setDeclaration('');
    }
  }, [gameState, teamId, teamRoute, openedCitiesKey, teamProductName, roundNoForInit, hasSubmitted]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!eventId || gameState?.match_status === 'finished') return;
    const timer = setInterval(() => { poll(eventId); }, 5000);
    return () => clearInterval(timer);
  }, [eventId, poll, gameState?.match_status]);

  useRefreshCareerOnMatchFinish(gameState?.match_status === 'finished');

  const cfg = gameState?.defaults || {};
  const routesCfg = gameState?.routes || {};
  const citiesCfg = gameState?.cities || {};
  const routeSwitchCost = cfg.route_switch_cost || 5;
  const cityExpandCost = cfg.city_expand_cost || 10;
  const totalRounds = cfg.rounds || 6;
  const isPractice = gameState?.match_kind === 'practice';

  const switchCost = route !== gameState?.team.route ? routeSwitchCost : 0;
  const investFitTotal = Object.values(investFit).reduce((a, b) => a + b, 0);
  const investShowTotal = Object.values(investShow).reduce((a, b) => a + b, 0);
  const totalInvest = investTech + investFitTotal + investShowTotal;
  const expandCost = openedCities.filter((c) => !gameState?.team.opened_cities.includes(c)).length * cityExpandCost;
  const totalCost = totalInvest + switchCost + expandCost;
  const budget = gameState?.team.budget || 0;
  const remaining = budget - totalCost;
  const budgetUsage = Math.min(100, Math.max(0, (totalCost / Math.max(budget, 1)) * 100));

  const handleSubmit = useCallback(async () => {
    if (!gameState?.current_round || gameState.has_submitted) return;
    setSubmitting(true);
    clearError();
    try {
      const payload: TvSubmitPayload = {
        route,
        opened_cities: openedCities,
        invest_tech: investTech,
        invest_fit_by_city: investFit,
        invest_show_by_city: investShow,
        declaration,
      };
      await submitDecision(eventId, payload);
    } catch {
      /* store */
    }
    setSubmitting(false);
  }, [gameState, route, openedCities, investTech, investFit, investShow, declaration, eventId, submitDecision, clearError]);

  const handleSaveProductName = async () => {
    if (productName.trim()) await setProductName(eventId, productName.trim());
  };

  const handleToggleCity = (cityId: string) => {
    if (!gameState) return;
    if (gameState.team.opened_cities.includes(cityId)) return;
    setOpenedCities((prev) =>
      prev.includes(cityId) ? prev.filter((x) => x !== cityId) : [...prev, cityId],
    );
  };

  const topBoard = useMemo(() => leaderboard.slice(0, 10), [leaderboard]);

  if (loading && !gameState) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-[#f4f7fb]">
        <Loader2 className="w-10 h-10 animate-spin text-tv-primary" />
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-foreground-muted min-h-screen bg-[#f4f7fb]">
        <p>无法加载游戏数据</p>
        <button type="button" onClick={() => navigate(exitPath)} className="text-tv-primary hover:underline">
          {exitLabel}
        </button>
      </div>
    );
  }

  const isFinished = gameState.match_status === 'finished';
  const canSubmit = Boolean(gameState.current_round && !gameState.has_submitted && !isFinished);
  const snap = gameState.last_snapshot;
  const roundNo = gameState.current_round?.round_no;
  const routeCfg = routesCfg[route];
  const RouteIcon = ROUTE_ACCENTS[route]?.icon ?? Route;

  return (
    <div className="techventure-shell relative flex flex-col min-h-screen text-foreground">
      <TvHud
        title={gameState.title || '创想大赢家 · TechVenture'}
        subtitle={[
          gameState.team.team_name,
          gameState.team.product_name || '未命名产品',
          roundNo ? `第 ${roundNo} 轮` : '',
          isFinished ? '已结束' : '',
        ].filter(Boolean).join(' · ')}
        onExit={() => navigate(exitPath)}
        exitLabel={exitLabel}
        center={<TvRoundCountdown currentRound={gameState.current_round} isPractice={isPractice} />}
        statusLabel={isFinished ? '比赛结束' : roundNo ? `第 ${roundNo} / ${totalRounds} 轮` : '等待开始'}
        statusProgress={roundNo ? (roundNo / totalRounds) * 100 : 0}
        isSubmitted={gameState.has_submitted}
        right={(
          <>
            <HudMetric label="预算" value={`${budget.toFixed(1)} 万`} tone="text-tv-primary" />
            <HudMetric label="加权总分" value={gameState.team.weighted_total.toFixed(2)} tone="text-tv-pathfinder" />
          </>
        )}
      />

      <div className="px-3 pt-1">
        <TvRoundStepper currentRoundNo={roundNo} totalRounds={totalRounds} matchStatus={gameState.match_status} />
      </div>

      {error && (
        <div className="shrink-0 mx-3 mt-2 px-3 py-2 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">
          {error}
        </div>
      )}

      <main className="techventure-console flex-1 min-h-0 p-3">
        <aside className="techventure-side-menu">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeMenu === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveMenu(item.id)}
                className={active ? 'is-active' : ''}
              >
                <Icon className="w-4 h-4" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.sub}</small>
                </span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            );
          })}
        </aside>

        <section className="techventure-main-stage">
          <div className="techventure-stage-header">
            <div className={`techventure-route-chip ${ROUTE_ACCENTS[route].bg}`}>
              <RouteIcon className={`w-4 h-4 ${ROUTE_ACCENTS[route].color}`} />
              <span>{routeCfg?.label || route}</span>
            </div>
            <div className="techventure-budget-strip">
              <span>本轮支出 {totalCost.toFixed(1)} 万</span>
              <div>
                <i style={{ width: `${budgetUsage}%` }} />
              </div>
              <span className={remaining < -0.01 ? 'text-danger' : 'text-tv-primary'}>剩余 {remaining.toFixed(1)} 万</span>
            </div>
          </div>

          {activeMenu === 'strategy' && (
            <div className="techventure-stage-grid">
              <TvStrategySelector
                routesCfg={routesCfg}
                citiesCfg={citiesCfg}
                route={route}
                openedCities={openedCities}
                lockedCities={gameState.team.opened_cities}
                canInteract={canSubmit}
                cityExpandCost={cityExpandCost}
                routeSwitchCost={routeSwitchCost}
                onSelectRoute={setRoute}
                onToggleCity={handleToggleCity}
              />
              <MarketMap citiesCfg={citiesCfg} openedCities={openedCities} lockedCities={gameState.team.opened_cities} />
            </div>
          )}

          {activeMenu === 'investment' && (
            <div className="techventure-investment-workbench">
              <section className="glass-card border-t-2 border-t-tv-primary/50 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-tv-tech" /> 产品迭代投入
                  </h2>
                  <span className="text-[11px] text-foreground-muted">Tech / Fit / Show</span>
                </div>

                {!gameState.team.product_name && (
                  <div className="flex gap-2">
                    <input
                      value={productName}
                      onChange={(e) => setProductNameLocal(e.target.value)}
                      maxLength={40}
                      className="flex-1 px-3 py-2 text-sm bg-background-secondary border border-tv-primary/20 rounded-lg focus:outline-none focus:border-tv-primary/60"
                      placeholder="产品名称"
                    />
                    <button
                      type="button"
                      onClick={handleSaveProductName}
                      className="px-4 py-2 bg-tv-primary text-white rounded-lg text-sm font-medium"
                    >
                      确定
                    </button>
                  </div>
                )}

                <div>
                  <label className="flex justify-between text-xs text-foreground-muted mb-1">
                    <span>Tech 全局研发</span>
                    <span className="font-mono text-tv-tech">{investTech.toFixed(1)} 万</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, budget)}
                    step={0.5}
                    value={investTech}
                    onChange={(e) => setInvestTech(Number(e.target.value))}
                    disabled={!canSubmit}
                    className="w-full accent-tv-tech"
                  />
                </div>

                <TvCityInvestPanel
                  openedCities={openedCities}
                  citiesCfg={citiesCfg}
                  investFit={investFit}
                  investShow={investShow}
                  canInteract={canSubmit}
                  onFitChange={(city, v) => setInvestFit((p) => ({ ...p, [city]: v }))}
                  onShowChange={(city, v) => setInvestShow((p) => ({ ...p, [city]: v }))}
                />
              </section>

              <TvBudgetPanel
                budget={budget}
                totalCost={totalCost}
                remaining={remaining}
                switchCost={switchCost}
                expandCost={expandCost}
                investTech={investTech}
                investFitTotal={investFitTotal}
                investShowTotal={investShowTotal}
              />
            </div>
          )}

          {activeMenu === 'market' && (
            <MarketPanel citiesCfg={citiesCfg} openedCities={openedCities} team={gameState.team} />
          )}

          {activeMenu === 'intel' && (
            <div className="techventure-intel-grid">
              <section className="glass-card border-t-2 border-t-tv-primary/50">
                <div className="px-3 py-2 border-b border-border-subtle flex items-center justify-between">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-tv-primary" /> 创业数据仪表盘
                  </h2>
                  {snap?.rank != null && <span className="text-xs text-tv-pathfinder font-semibold">上轮 #{snap.rank}</span>}
                </div>
                <div className="p-3">
                  <TvKpiCards snap={snap} history={snapshots} />
                </div>
              </section>
              <BqiPanel contribs={snap?.bqi_contribs ?? []} />
            </div>
          )}

          {activeMenu === 'rank' && (
            <div className="techventure-rank-focus">
              <TvLeaderboardPanel entries={topBoard} selfTeamId={gameState.team.team_id} onReload={() => fetchLeaderboard(eventId)} />
            </div>
          )}
        </section>

        <aside className="techventure-context-panel">
          <div className="techventure-context-title">
            <PanelRight className="w-4 h-4 text-tv-primary" />
            <span>经营态势</span>
          </div>
          <StatusStack
            route={route}
            routeCfg={routeCfg}
            citiesCfg={citiesCfg}
            openedCities={openedCities}
            weightedTotal={gameState.team.weighted_total}
            attentionTotal={gameState.team.attention_total}
            rank={gameState.team.last_rank}
          />
          <TvNewsPanel news={news} onReload={() => fetchNews(eventId)} />
        </aside>
      </main>

      <section className="techventure-action-bar">
        <div className="techventure-action-summary">
          <span className="font-semibold">{routeCfg?.label || route}</span>
          <span>城市 {openedCities.length}</span>
          <span>Tech {investTech.toFixed(1)}</span>
          <span>Fit {investFitTotal.toFixed(1)}</span>
          <span>Show {investShowTotal.toFixed(1)}</span>
        </div>

        <textarea
          value={declaration}
          onChange={(e) => setDeclaration(e.target.value.slice(0, 60))}
          disabled={!canSubmit}
          rows={1}
          className="techventure-declaration-input"
          placeholder="产品宣言"
        />

        <div className="techventure-submit-wrap">
          {remaining < -0.01 && (
            <span className="text-[11px] text-danger flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              超出预算
            </span>
          )}
          {gameState.has_submitted && (
            <span className="text-[11px] text-success flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isPractice ? '已自动结算' : '已提交'}
            </span>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || remaining < -0.01 || submitting}
            className="techventure-submit-button"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {gameState.has_submitted ? '已提交' : isFinished ? '比赛已结束' : '提交本轮'}
          </button>
        </div>
      </section>

      {isFinished && showSettlement && (
        <TechSettlementOverlay
          gameState={gameState}
          leaderboard={leaderboard}
          snapshots={snapshots}
          news={news}
          onClose={() => setShowSettlement(false)}
          onExit={() => navigate(exitPath)}
          exitLabel={exitLabel}
        />
      )}
    </div>
  );
}

function TechSettlementOverlay({
  gameState,
  leaderboard,
  snapshots,
  news,
  onClose,
  onExit,
  exitLabel,
}: {
  gameState: TvGameState;
  leaderboard: TvLeaderboardEntry[];
  snapshots: Record<string, unknown>[];
  news: TvNewsItem[];
  onClose: () => void;
  onExit: () => void;
  exitLabel: string;
}) {
  const latest = snapshots[snapshots.length - 1] || gameState.last_snapshot || {};
  const myRank = leaderboard.find((entry) => entry.team_id === gameState.team.team_id)?.rank ?? gameState.team.last_rank ?? '-';
  const routeLabel = gameState.routes?.[gameState.team.route]?.label || gameState.team.route;
  const tech = Number((latest.tech as number) || gameState.team.tech || 0);
  const fit = Number((latest.fit as number) || (latest.fit_total as number) || 0);
  const show = Number((latest.show as number) || (latest.show_total as number) || 0);

  return (
    <div className="absolute inset-0 z-[60] overflow-y-auto bg-white/88 p-4 backdrop-blur-sm">
      <div className="mx-auto grid max-w-6xl gap-4">
        <section className="glass-card border border-tv-primary/30 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold text-tv-primary">TECH 赛后结算</p>
              <h3 className="mt-1 text-2xl font-bold text-foreground">创想大赢家复盘</h3>
              <p className="mt-1 text-sm text-foreground-muted">
                {gameState.team.product_name || '未命名产品'} · {routeLabel} · 共 {snapshots.length || gameState.defaults?.rounds || 6} 轮结算记录
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-border-subtle bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-background-hover">
                继续查看数据
              </button>
              <button type="button" onClick={onExit} className="rounded-lg bg-tv-primary px-4 py-2 text-sm font-semibold text-white">
                {exitLabel}
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-5">
          <TechSettlementMetric icon={Trophy} label="最终排名" value={`#${myRank}`} tone="text-tv-pathfinder" />
          <TechSettlementMetric icon={Gauge} label="加权总分" value={gameState.team.weighted_total.toFixed(2)} tone="text-tv-primary" />
          <TechSettlementMetric icon={Cpu} label="Tech" value={tech.toFixed(2)} tone="text-tv-tech" />
          <TechSettlementMetric icon={Users} label="Fit" value={fit.toFixed(2)} tone="text-tv-user" />
          <TechSettlementMetric icon={Megaphone} label="Show" value={show.toFixed(2)} tone="text-tv-brand" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <section className="glass-card p-4">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-tv-primary" /> 轮次快照
            </h4>
            <div className="mt-3 grid gap-2">
              {snapshots.length ? snapshots.map((snap) => (
                <div key={String(snap.round_no ?? snap.round_number)} className="grid grid-cols-[64px_repeat(4,minmax(0,1fr))] items-center gap-2 rounded-xl border border-border-subtle bg-white px-3 py-2 text-xs">
                  <b className="text-tv-primary">R{String(snap.round_no ?? snap.round_number ?? '-')}</b>
                  <span>Tech {Number((snap.tech as number) || 0).toFixed(1)}</span>
                  <span>Fit {Number((snap.fit as number) || (snap.fit_total as number) || 0).toFixed(1)}</span>
                  <span>Show {Number((snap.show as number) || (snap.show_total as number) || 0).toFixed(1)}</span>
                  <span>BQI {Number((snap.bqi as number) || 1).toFixed(2)}</span>
                </div>
              )) : <p className="rounded-xl bg-white p-3 text-sm text-foreground-muted">暂无轮次快照，后续结算会沉淀在这里。</p>}
            </div>
          </section>

          <section className="glass-card p-4">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-tv-pathfinder" /> 最终榜与市场快讯
            </h4>
            <div className="mt-3 grid gap-2">
              {leaderboard.slice(0, 6).map((entry) => (
                <div key={entry.team_id} className={`grid grid-cols-[52px_1fr_auto] items-center gap-3 rounded-xl border px-3 py-2 text-sm ${entry.team_id === gameState.team.team_id ? 'border-tv-primary/40 bg-tv-primary/10' : 'border-border-subtle bg-white'}`}>
                  <b className="text-tv-primary">#{entry.rank ?? '-'}</b>
                  <span className="font-semibold text-foreground">{entry.team_name}</span>
                  <span className="tabular-nums text-foreground-muted">{Number(entry.weighted_total ?? 0).toFixed(2)}</span>
                </div>
              ))}
              <div className="mt-2 space-y-2">
                {news.slice(0, 3).map((item, index) => (
                  <div key={`${item.headline || index}`} className="rounded-xl border border-tv-brand/20 bg-tv-brand/10 px-3 py-2 text-xs">
                    <b className="block text-tv-brand">{item.headline || '市场快讯'}</b>
                    {item.body && <span className="text-foreground-muted">{item.body}</span>}
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

function TechSettlementMetric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return (
    <div className="glass-card border border-border-subtle p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-tv-primary/10 p-2">
          <Icon className={`h-5 w-5 ${tone}`} />
        </div>
        <div>
          <p className="text-xs text-foreground-muted">{label}</p>
          <p className={`text-xl font-bold tabular-nums ${tone}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function HudMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-foreground-muted">{label}</p>
      <p className={`font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function MarketMap({
  citiesCfg,
  openedCities,
  lockedCities,
}: {
  citiesCfg: Record<string, TvCityConfig>;
  openedCities: string[];
  lockedCities: string[];
}) {
  const cityEntries = Object.entries(citiesCfg);
  return (
    <section className="techventure-market-map glass-card">
      <div className="techventure-map-grid">
        {cityEntries.map(([cityId, cfg], index) => {
          const active = openedCities.includes(cityId);
          const locked = lockedCities.includes(cityId);
          return (
            <div key={cityId} className={`techventure-city-node is-${index + 1} ${active ? 'is-open' : ''} ${locked ? 'is-locked' : ''}`}>
              <Landmark className="w-5 h-5" />
              <strong>{cfg.label || cityId}</strong>
              <span>规模 x{cfg.scale}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MarketPanel({
  citiesCfg,
  openedCities,
  team,
}: {
  citiesCfg: Record<string, TvCityConfig>;
  openedCities: string[];
  team: { fit_by_city: Record<string, number>; show_by_city: Record<string, number> };
}) {
  return (
    <section className="techventure-market-panel">
      {Object.entries(citiesCfg).map(([cityId, city]) => {
        const open = openedCities.includes(cityId);
        const consumers = city.consumers || {};
        return (
          <article key={cityId} className={`techventure-market-card ${open ? 'is-open' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3>{city.label || cityId}</h3>
                <p>规模 x{city.scale} · Fit x{city.eta_fit} · Show x{city.eta_show}</p>
              </div>
              <MapPin className={open ? 'text-tv-primary' : 'text-foreground-muted'} />
            </div>
            <div className="space-y-2">
              <ConsumerBar label="Geek" value={consumers.geek ?? 0} color="bg-tv-tech" />
              <ConsumerBar label="Pragmatic" value={consumers.pragmatic ?? 0} color="bg-tv-user" />
              <ConsumerBar label="Trendy" value={consumers.trendy ?? 0} color="bg-tv-brand" />
            </div>
            <div className="techventure-city-stats">
              <span>Fit {Number(team.fit_by_city?.[cityId] || 0).toFixed(1)}</span>
              <span>Show {Number(team.show_by_city?.[cityId] || 0).toFixed(1)}</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function ConsumerBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-foreground-muted">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-background-secondary overflow-hidden">
        <i className={`block h-full rounded-full ${color}`} style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  );
}

function BqiPanel({ contribs }: { contribs: Array<{ delta: number; note: string }> }) {
  return (
    <section className="glass-card p-3 text-xs border-t-2 border-t-tv-brand/40">
      <p className="font-semibold mb-2 flex items-center gap-1.5">
        <Gauge className="w-3.5 h-3.5 text-tv-brand" /> 上轮 BQI 因素
      </p>
      {contribs.length ? (
        <ul className="space-y-1.5">
          {contribs.map((c, i) => (
            <li key={i} className="flex gap-2 items-start rounded-lg bg-background-secondary/80 px-2 py-1.5">
              <span className={`font-mono font-bold shrink-0 ${c.delta >= 0 ? 'text-success' : 'text-danger'}`}>
                {c.delta >= 0 ? '+' : ''}{c.delta.toFixed(2)}
              </span>
              <span className="text-foreground-muted">{c.note}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg bg-white px-3 py-4 text-foreground-muted border border-border-subtle shadow-sm">暂无 BQI 结算记录</div>
      )}
    </section>
  );
}

function StatusStack({
  route,
  routeCfg,
  citiesCfg,
  openedCities,
  weightedTotal,
  attentionTotal,
  rank,
}: {
  route: RouteId;
  routeCfg?: TvRouteConfig;
  citiesCfg: Record<string, TvCityConfig>;
  openedCities: string[];
  weightedTotal: number;
  attentionTotal: number;
  rank: number | null;
}) {
  return (
    <div className="techventure-status-stack">
      <div className="techventure-status-card">
        <span>路线</span>
        <strong>{routeCfg?.label || route}</strong>
        <small>{routeCfg?.tagline || '本轮战略方向'}</small>
      </div>
      <div className="techventure-status-grid">
        <Metric icon={BarChart3} label="总分" value={weightedTotal.toFixed(2)} />
        <Metric icon={Activity} label="声量" value={attentionTotal.toFixed(2)} />
        <Metric icon={Trophy} label="名次" value={rank ? `#${rank}` : '-'} />
        <Metric icon={Building2} label="城市" value={`${openedCities.length}/${Object.keys(citiesCfg).length}`} />
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div>
      <Icon className="w-3.5 h-3.5 text-tv-primary" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
