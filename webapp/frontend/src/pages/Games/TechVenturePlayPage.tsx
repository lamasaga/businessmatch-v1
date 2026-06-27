import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTechVentureStore } from '../../stores/techventureStore';
import type { RouteId, TvSubmitPayload } from '../../types/techventure';
import {
  Send,
  Loader2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  Trophy,
  Activity,
} from 'lucide-react';
import TvHud from '../../components/techventure/TvHud';
import TvStrategySelector from '../../components/techventure/TvStrategySelector';
import TvKpiCards from '../../components/techventure/TvKpiCards';
import TvLeaderboardPanel from '../../components/techventure/TvLeaderboardPanel';
import TvNewsPanel from '../../components/techventure/TvNewsPanel';

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

  const [route, setRoute] = useState<RouteId>('TECH');
  const [openedCities, setOpenedCities] = useState<string[]>([]);
  const [investTech, setInvestTech] = useState(0);
  const [investFit, setInvestFit] = useState<Record<string, number>>({});
  const [investShow, setInvestShow] = useState<Record<string, number>>({});
  const [declaration, setDeclaration] = useState('');
  const [productName, setProductNameLocal] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchState(eventId);
      fetchLeaderboard(eventId);
    }
  }, [eventId, fetchState, fetchLeaderboard]);

  const teamRoute = gameState?.team.route;
  const teamOpenedCities = gameState?.team.opened_cities;
  const teamProductName = gameState?.team.product_name;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!gameState) return;
    setRoute(gameState.team.route);
    setOpenedCities([...gameState.team.opened_cities]);
    setProductNameLocal(gameState.team.product_name || '');
  }, [gameState, teamRoute, teamOpenedCities, teamProductName]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!eventId || gameState?.match_status === 'finished') return;
    const timer = setInterval(() => { poll(eventId); }, 5000);
    return () => clearInterval(timer);
  }, [eventId, poll, gameState?.match_status]);

  const cfg = gameState?.defaults || {};
  const routesCfg = gameState?.routes || {};
  const citiesCfg = gameState?.cities || {};
  const routeSwitchCost = cfg.route_switch_cost || 5;
  const cityExpandCost = cfg.city_expand_cost || 10;

  const switchCost = route !== gameState?.team.route ? routeSwitchCost : 0;
  const totalInvest = investTech
    + Object.values(investFit).reduce((a, b) => a + b, 0)
    + Object.values(investShow).reduce((a, b) => a + b, 0);
  const expandCost = openedCities.filter(
    (c) => !gameState?.team.opened_cities.includes(c),
  ).length * cityExpandCost;
  const totalCost = totalInvest + switchCost + expandCost;
  const budget = gameState?.team.budget || 0;
  const remaining = budget - totalCost;

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
      await fetchState(eventId);
    } catch {
      /* store */
    }
    setSubmitting(false);
  }, [gameState, route, openedCities, investTech, investFit, investShow, declaration, eventId, submitDecision, fetchState, clearError]);

  const handleSaveProductName = async () => {
    if (productName.trim()) await setProductName(eventId, productName.trim());
  };

  const handleToggleCity = (cityId: string) => {
    if (!gameState) return;
    const locked = gameState.team.opened_cities.includes(cityId);
    if (locked) return;
    if (openedCities.includes(cityId)) {
      setOpenedCities((prev) => prev.filter((x) => x !== cityId));
    } else {
      setOpenedCities((prev) => [...prev, cityId]);
    }
  };

  const topBoard = useMemo(() => {
    if (leaderboard.length) return leaderboard.slice(0, 6);
    return [];
  }, [leaderboard]);

  if (loading && !gameState) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-0">
        <Loader2 className="w-10 h-10 animate-spin text-tv-primary" />
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-foreground-muted">
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

  return (
    <div className="relative flex flex-col h-full min-h-0 text-foreground">
      <TvHud
        title="创想大赢家 · TechVenture"
        subtitle={[
          gameState.team.team_name,
          gameState.team.product_name || '未命名产品',
          gameState.current_round ? `第 ${gameState.current_round.round_no} 轮` : '',
          isFinished ? '已结束' : '',
        ].filter(Boolean).join(' · ')}
        onExit={() => navigate(exitPath)}
        exitLabel={exitLabel}
        statusLabel={isFinished ? '比赛结束' : gameState.current_round ? `第 ${gameState.current_round.round_no} 轮` : '等待开始'}
        statusProgress={gameState.current_round ? ((gameState.current_round.round_no / (gameState.rounds.length || 6)) * 100) : 0}
        isSubmitted={gameState.has_submitted}
        right={(
          <>
            <div className="text-center">
              <p className="text-[10px] text-foreground-muted">预算</p>
              <p className="font-bold text-tv-primary tabular-nums flex items-center gap-0.5">
                <DollarSign className="w-3.5 h-3.5" />
                {budget.toFixed(1)} 万
              </p>
            </div>
            {gameState.team.last_rank != null && (
              <div className="text-center">
                <p className="text-[10px] text-foreground-muted">上轮排名</p>
                <p className="font-bold text-tv-primary">#{gameState.team.last_rank}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-[10px] text-foreground-muted">本轮剩余</p>
              <p className={`font-bold tabular-nums ${remaining < -0.01 ? 'text-danger' : 'text-foreground'}`}>
                {remaining.toFixed(1)} 万
              </p>
            </div>
          </>
        )}
      />

      {error && (
        <div className="shrink-0 mx-3 mt-2 px-3 py-2 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">
          {error}
        </div>
      )}

      {/* 主战区：三栏全屏（无地图） */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[400px_1fr_400px] gap-3 p-3 overflow-hidden">
        <div className="min-h-0 flex flex-col gap-3 overflow-hidden">
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

          <section className="glass-card overflow-hidden flex-1 min-h-0 flex flex-col border-t-2 border-t-tv-primary/50">
            <div className="shrink-0 px-3 py-2 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-tv-primary" /> 资金分配
              </h2>
              <span className="text-[10px] text-foreground-muted">本轮支出：{totalCost.toFixed(1)} 万</span>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-3 space-y-3">
              {!gameState.team.product_name && (
                <div className="flex gap-2">
                  <input
                    value={productName}
                    onChange={(e) => setProductNameLocal(e.target.value)}
                    maxLength={40}
                    className="flex-1 px-3 py-2 text-sm bg-background-secondary border border-tv-primary/20 rounded-lg focus:outline-none focus:border-tv-primary/60 focus:ring-1 focus:ring-tv-primary/30"
                    placeholder="为产品起名（例如：星辰智学）"
                  />
                  <button
                    type="button"
                    onClick={handleSaveProductName}
                    className="px-4 py-2 bg-tv-primary text-white rounded-lg text-sm font-medium hover:bg-tv-primary/90 shadow-[0_0_12px_rgba(168,85,247,0.25)]"
                  >
                    确定
                  </button>
                </div>
              )}

              <div className="rounded-xl border border-tv-primary/20 bg-background-secondary p-3 space-y-3">
                <div>
                  <label className="flex justify-between text-xs text-foreground-muted mb-1">
                    <span>Tech 研发</span>
                    <span className="font-mono">{investTech.toFixed(1)} 万</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, budget)}
                    step={0.5}
                    value={investTech}
                    onChange={(e) => setInvestTech(Number(e.target.value))}
                    disabled={!canSubmit}
                    className="w-full accent-tv-primary"
                  />
                </div>

                {openedCities.map((city) => (
                  <div key={city} className="border-t border-border-subtle pt-2">
                    <p className="text-xs font-medium mb-2">{citiesCfg[city]?.label || city}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="flex justify-between text-[10px] text-foreground-muted">
                          <span>Fit</span>
                          <span>{(investFit[city] || 0).toFixed(1)}</span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={30}
                          step={0.5}
                          value={investFit[city] || 0}
                          onChange={(e) =>
                            setInvestFit((prev) => ({ ...prev, [city]: Number(e.target.value) }))
                          }
                          disabled={!canSubmit}
                          className="w-full accent-tv-user"
                        />
                      </div>
                      <div>
                        <label className="flex justify-between text-[10px] text-foreground-muted">
                          <span>Show</span>
                          <span>{(investShow[city] || 0).toFixed(1)}</span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={30}
                          step={0.5}
                          value={investShow[city] || 0}
                          onChange={(e) =>
                            setInvestShow((prev) => ({ ...prev, [city]: Number(e.target.value) }))
                          }
                          disabled={!canSubmit}
                          className="w-full accent-tv-brand"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs text-foreground-muted">产品宣言（≤60字）</label>
                <textarea
                  value={declaration}
                  onChange={(e) => setDeclaration(e.target.value.slice(0, 60))}
                  disabled={!canSubmit}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 text-sm bg-background-secondary border border-tv-primary/20 rounded-lg resize-none focus:outline-none focus:border-tv-primary/60 focus:ring-1 focus:ring-tv-primary/30"
                  placeholder="本轮核心策略与愿景…"
                />
                <p className="text-[10px] text-foreground-muted mt-0.5">{declaration.length}/60</p>
              </div>
            </div>

            <div className="shrink-0 p-3 border-t border-border-subtle space-y-2 bg-background-secondary/70">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground-muted inline-flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  预算校验
                </span>
                <span className={`font-mono ${remaining < -0.01 ? 'text-danger font-bold' : 'text-foreground-muted'}`}>
                  剩余 {remaining.toFixed(1)} 万
                </span>
              </div>
              {remaining < -0.01 && (
                <p className="text-[10px] text-danger flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  超出预算，需下调投入或减少开拓城市
                </p>
              )}
              {gameState.has_submitted && (
                <p className="text-[10px] text-success flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  已提交，等待结算
                </p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || remaining < -0.01 || submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-tv-primary hover:bg-tv-primary/90 disabled:opacity-50 text-white font-semibold text-sm shadow-[0_0_24px_rgba(168,85,247,0.25)] transition-all"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {gameState.has_submitted ? '已提交' : isFinished ? '比赛已结束' : '提交本轮决策'}
              </button>
            </div>
          </section>
        </div>

        <div className="min-h-0 flex flex-col gap-3 overflow-hidden">
          <section className="glass-card overflow-hidden border-t-2 border-t-tv-primary/50">
            <div className="shrink-0 px-3 py-2 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-tv-primary" /> 数据仪表盘
              </h2>
              {snap?.rank != null && (
                <span className="text-xs text-tv-pathfinder font-semibold">上轮 #{snap.rank}</span>
              )}
            </div>
            <div className="p-3 space-y-3">
              <TvKpiCards snap={snap} history={snapshots} />
              <div className="rounded-xl border border-border-subtle bg-background-secondary p-3 text-xs">
                <p className="text-foreground-muted font-semibold mb-2">本轮变化预览</p>
                <ul className="space-y-1 text-foreground-muted">
                  {switchCost > 0 && <li>路线切换成本：+{switchCost} 万</li>}
                  {expandCost > 0 && <li>新增开拓城市：+{expandCost} 万</li>}
                  {investTech > 0 && <li>Tech 研发投入：+{investTech.toFixed(1)} 万</li>}
                  {openedCities.length === 0 && <li>尚未选择开拓城市（可提高 Fit/Show 的生效范围）</li>}
                </ul>
              </div>

              {(snap?.bqi_contribs?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-border-subtle bg-background-secondary p-3 text-xs">
                  <p className="text-foreground-muted font-semibold mb-2">上轮 BQI 因素</p>
                  <ul className="space-y-1">
                    {(snap?.bqi_contribs ?? []).map((c: { delta: number; note: string }, i: number) => (
                      <li key={i} className="flex gap-2">
                        <span className={c.delta >= 0 ? 'text-success' : 'text-danger'}>
                          {c.delta >= 0 ? '+' : ''}
                          {c.delta.toFixed(2)}
                        </span>
                        <span className="text-foreground-muted">{c.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="min-h-0 flex flex-col gap-3 overflow-hidden">
          <TvLeaderboardPanel
            entries={topBoard}
            selfTeamId={gameState.team.team_id}
            onReload={() => fetchLeaderboard(eventId)}
          />
          <TvNewsPanel news={news} onReload={() => fetchNews(eventId)} />
        </div>
      </div>

      {isFinished && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/85 backdrop-blur-sm p-6">
          <div className="glass-card p-8 max-w-md w-full text-center border border-tv-primary/40 relative shadow-[0_0_40px_rgba(168,85,247,0.2)]">
            <button
              type="button"
              onClick={() => navigate(exitPath)}
              className="absolute top-3 right-3 p-1 rounded-lg hover:bg-background-hover text-foreground-muted"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
            <Trophy className="w-12 h-12 mx-auto text-warning mb-3" />
            <h3 className="text-xl font-semibold">比赛结束</h3>
            <p className="text-sm text-foreground-muted mt-2">感谢参与创想大赢家</p>
            <button
              type="button"
              onClick={() => navigate(exitPath)}
              className="mt-6 px-8 py-2.5 bg-tv-primary text-white rounded-xl font-medium hover:bg-tv-primary/90 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
            >
              {exitLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
