import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTechVentureStore } from '../../stores/techventureStore';
import type { RouteId, TvSubmitPayload } from '../../types/techventure';
import TvStrategyMapPanel from '../../components/techventure/TvStrategyMapPanel';
import {
  TrendingUp, Trophy, Send, Loader2, Newspaper, ArrowLeft,
  DollarSign, Target, Sparkles, X, BarChart3,
} from 'lucide-react';

export default function TechVenturePlayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = Number(id);
  const exitPath = sessionStorage.getItem('bizsim_practice_return') || '/games';
  const exitLabel = exitPath === '/activities' ? '返回日常活动' : '返回商赛大厅';

  const {
    gameState, leaderboard, news, loading, error,
    fetchState, poll, submitDecision, setProductName,
    fetchLeaderboard, fetchNews, clearError,
  } = useTechVentureStore();

  const [activeTab, setActiveTab] = useState<'decide' | 'feedback' | 'board' | 'news'>('decide');
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

  useEffect(() => {
    if (!gameState) return;
    setRoute(gameState.team.route);
    setOpenedCities([...gameState.team.opened_cities]);
    setProductNameLocal(gameState.team.product_name || '');
  }, [gameState?.team.route, gameState?.team.opened_cities.join(','), gameState?.team.product_name]);

  useEffect(() => {
    if (!eventId || gameState?.match_status === 'finished') return;
    const timer = setInterval(() => { poll(eventId); }, 5000);
    return () => clearInterval(timer);
  }, [eventId, poll, gameState?.match_status]);

  useEffect(() => {
    if (activeTab === 'board') fetchLeaderboard(eventId);
    if (activeTab === 'news') fetchNews(eventId);
  }, [activeTab, eventId, fetchLeaderboard, fetchNews]);

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
      setActiveTab('feedback');
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
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-foreground-muted">
        <p>无法加载游戏数据</p>
        <button type="button" onClick={() => navigate(exitPath)} className="text-primary hover:underline">
          {exitLabel}
        </button>
      </div>
    );
  }

  const isFinished = gameState.match_status === 'finished';
  const canSubmit = Boolean(gameState.current_round && !gameState.has_submitted && !isFinished);
  const snap = gameState.last_snapshot;

  const intelTabs = [
    { key: 'decide' as const, label: '概览', icon: Target },
    { key: 'feedback' as const, label: '上轮反馈', icon: TrendingUp },
    { key: 'board' as const, label: '排行榜', icon: Trophy },
    { key: 'news' as const, label: '快讯', icon: Newspaper },
  ];

  return (
    <div className="relative flex flex-col h-full min-h-0 text-foreground">
      {/* HUD */}
      <header className="shrink-0 border-b border-border-subtle bg-background-secondary/90 backdrop-blur-md px-4 py-2.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(exitPath)}
              className="p-2 rounded-lg hover:bg-background-hover text-foreground-muted"
              title={exitLabel}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold leading-tight">创想大赢家 · TechVenture</h1>
              <p className="text-[11px] text-foreground-muted">
                {gameState.team.team_name}
                {' · '}
                {gameState.team.product_name || '未命名产品'}
                {gameState.current_round && ` · 第 ${gameState.current_round.round_no} 轮`}
                {isFinished && ' · 已结束'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <div className="text-center">
              <p className="text-[10px] text-foreground-muted">预算</p>
              <p className="font-bold text-warning tabular-nums flex items-center gap-0.5">
                <DollarSign className="w-3.5 h-3.5" />
                {budget.toFixed(1)} 万
              </p>
            </div>
            {gameState.team.last_rank != null && (
              <div className="text-center">
                <p className="text-[10px] text-foreground-muted">上轮排名</p>
                <p className="font-bold text-primary">#{gameState.team.last_rank}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-[10px] text-foreground-muted">本轮支出</p>
              <p className={`font-bold tabular-nums ${remaining < -0.01 ? 'text-danger' : ''}`}>
                {totalCost.toFixed(1)} 万
              </p>
            </div>
            {gameState.has_submitted && (
              <span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success">已提交</span>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="shrink-0 mx-3 mt-2 px-3 py-2 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">
          {error}
        </div>
      )}

      {/* 主战区：战略地图 | 赛场情报 */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden">
        <section className="flex-1 min-h-[220px] lg:min-h-0 flex flex-col glass-card overflow-hidden p-2">
          <div className="shrink-0 px-2 py-1.5 border-b border-border-subtle mb-2">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              三城战略地图
            </h2>
          </div>
          <div className="flex-1 min-h-0">
            <TvStrategyMapPanel
              citiesCfg={citiesCfg}
              routesCfg={routesCfg}
              route={route}
              openedCities={openedCities}
              lockedCities={gameState.team.opened_cities}
              canInteract={canSubmit}
              onSelectRoute={setRoute}
              onToggleCity={handleToggleCity}
            />
          </div>
        </section>

        <section className="flex-1 min-h-[280px] lg:min-h-0 lg:max-w-[44%] xl:max-w-[42%] flex flex-col glass-card overflow-hidden">
          <div className="shrink-0 flex gap-1 p-2 border-b border-border-subtle overflow-x-auto">
            {intelTabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  activeTab === key
                    ? 'bg-primary/20 text-primary border border-primary/40'
                    : 'text-foreground-muted hover:bg-background-hover'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-auto p-3">
            {activeTab === 'decide' && (
              <div className="space-y-4">
                {snap ? (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-background-secondary p-2">
                      <p className="text-[10px] text-foreground-muted">Tech</p>
                      <p className="font-bold text-blue-400">{(snap.tech || 0).toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-background-secondary p-2">
                      <p className="text-[10px] text-foreground-muted">声量</p>
                      <p className="font-bold text-success">{(snap.eff_attention || 0).toFixed(1)}</p>
                    </div>
                    <div className="rounded-lg bg-background-secondary p-2">
                      <p className="text-[10px] text-foreground-muted">BQI</p>
                      <p className="font-bold text-purple-400">{(snap.bqi || 1).toFixed(2)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-foreground-muted text-center py-4">首轮结束后显示 BQI 等指标</p>
                )}

                <div>
                  <h3 className="text-xs font-semibold text-foreground-muted mb-2 flex items-center gap-1">
                    <BarChart3 className="w-3.5 h-3.5" />
                    实时排行
                  </h3>
                  {topBoard.length ? (
                    <ul className="space-y-1 text-xs">
                      {topBoard.map((e, i) => (
                        <li
                          key={e.team_id}
                          className={`flex justify-between py-1 ${
                            e.team_id === gameState.team.team_id ? 'text-primary font-medium' : ''
                          }`}
                        >
                          <span>
                            #{i + 1} {e.team_name}
                          </span>
                          <span className="tabular-nums">{e.weighted_total.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fetchLeaderboard(eventId)}
                      className="text-xs text-primary hover:underline"
                    >
                      加载排行榜
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'feedback' && (
              <div>
                {snap ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-sm">上轮结算</h3>
                      <span className="text-xl font-bold text-warning">#{snap.rank}</span>
                    </div>
                    {snap.bqi_contribs?.length > 0 && (
                      <ul className="space-y-1 text-xs">
                        {snap.bqi_contribs.map((c: { delta: number; note: string }, i: number) => (
                          <li key={i} className="flex gap-2">
                            <span className={c.delta >= 0 ? 'text-success' : 'text-danger'}>
                              {c.delta >= 0 ? '+' : ''}
                              {c.delta.toFixed(2)}
                            </span>
                            <span className="text-foreground-muted">{c.note}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-foreground-muted text-center py-8">暂无结算数据</p>
                )}
              </div>
            )}

            {activeTab === 'board' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-foreground-muted border-b border-border-subtle">
                    <th className="py-2 text-left">#</th>
                    <th className="py-2 text-left">队伍</th>
                    <th className="py-2 text-right">得分</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr
                      key={entry.team_id}
                      className={`border-b border-border-subtle/40 ${
                        entry.team_id === gameState.team.team_id ? 'bg-primary-soft' : ''
                      }`}
                    >
                      <td className="py-2 text-warning font-bold">{i + 1}</td>
                      <td className="py-2">{entry.team_name}</td>
                      <td className="py-2 text-right font-mono">{entry.weighted_total.toFixed(2)}</td>
                    </tr>
                  ))}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-foreground-muted">
                        暂无数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'news' && (
              <div className="space-y-2">
                {news.length === 0 && (
                  <p className="text-center text-foreground-muted text-sm py-6">暂无赛场快讯</p>
                )}
                {news.map((item) => (
                  <div key={item.id} className="rounded-lg bg-background-secondary p-3">
                    <p className="font-medium text-sm flex gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-warning shrink-0" />
                      {item.headline}
                    </p>
                    <p className="text-xs text-foreground-muted mt-1">{item.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 底栏：决策 */}
      {activeTab === 'decide' && (
        <footer className="shrink-0 border-t border-border-subtle bg-background-secondary/80 backdrop-blur-md p-3 max-h-[40vh] overflow-y-auto">
          {!gameState.team.product_name && (
            <div className="mb-3 flex gap-2">
              <input
                value={productName}
                onChange={(e) => setProductNameLocal(e.target.value)}
                maxLength={40}
                className="flex-1 px-3 py-2 text-sm bg-background-secondary border border-border-subtle rounded-lg"
                placeholder="为产品起名（例如：星辰智学）"
              />
              <button
                type="button"
                onClick={handleSaveProductName}
                className="px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium"
              >
                确定
              </button>
            </div>
          )}

          <div className="space-y-3">
            <div className="glass-card p-3 space-y-3">
              <h3 className="text-xs font-semibold text-foreground-muted">资金分配</h3>
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
                  className="w-full"
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
                        className="w-full"
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
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-foreground-muted flex justify-between pt-1">
                <span>剩余预算</span>
                <span className={remaining < -0.01 ? 'text-danger font-bold' : 'font-mono'}>
                  {remaining.toFixed(1)} 万
                </span>
              </p>
            </div>

            <div>
              <label className="text-xs text-foreground-muted">产品宣言（≤60字）</label>
              <textarea
                value={declaration}
                onChange={(e) => setDeclaration(e.target.value.slice(0, 60))}
                disabled={!canSubmit}
                rows={2}
                className="w-full mt-1 px-3 py-2 text-sm bg-background-secondary border border-border-subtle rounded-lg resize-none"
                placeholder="本轮核心策略与愿景…"
              />
              <p className="text-[10px] text-foreground-muted mt-0.5">{declaration.length}/60</p>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || remaining < -0.01 || submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {gameState.has_submitted ? '已提交' : isFinished ? '比赛已结束' : '提交本轮决策'}
            </button>
          </div>
        </footer>
      )}

      {isFinished && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/85 backdrop-blur-sm p-6">
          <div className="glass-card p-8 max-w-md w-full text-center border border-purple-500/30 relative">
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
              className="mt-6 px-8 py-2.5 bg-purple-600 text-white rounded-xl font-medium"
            >
              {exitLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
