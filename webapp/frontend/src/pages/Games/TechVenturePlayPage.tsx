import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTechVentureStore } from '../../stores/techventureStore';
import type { RouteId, TvSubmitPayload } from '../../types/techventure';
import {
  Cpu, Users, Megaphone, Compass, MapPin, TrendingUp,
  Trophy, Send, Loader2, ChevronRight, Newspaper, ArrowLeft,
  DollarSign, Target, Sparkles,
} from 'lucide-react';

const ROUTE_ICONS: Record<string, typeof Cpu> = {
  TECH: Cpu,
  USER: Users,
  BRAND: Megaphone,
  PATHFINDER: Compass,
};
const ROUTE_COLORS: Record<string, string> = {
  TECH: 'text-blue-400 border-blue-500',
  USER: 'text-green-400 border-green-500',
  BRAND: 'text-pink-400 border-pink-500',
  PATHFINDER: 'text-yellow-400 border-yellow-500',
};

export default function TechVenturePlayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = Number(id);
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
    if (eventId) fetchState(eventId);
  }, [eventId, fetchState]);

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

  const cfg = gameState?.defaults || {};
  const routesCfg = gameState?.routes || {};
  const citiesCfg = gameState?.cities || {};
  const allCities = useMemo(() => Object.keys(citiesCfg), [citiesCfg]);
  const routeSwitchCost = cfg.route_switch_cost || 5;
  const cityExpandCost = cfg.city_expand_cost || 10;

  const switchCost = route !== gameState?.team.route ? routeSwitchCost : 0;
  const newCities = openedCities.filter(c => !gameState?.team.opened_cities.includes(c));
  const expandCost = newCities.length * cityExpandCost;
  const totalInvest = investTech
    + Object.values(investFit).reduce((a, b) => a + b, 0)
    + Object.values(investShow).reduce((a, b) => a + b, 0);
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
    } catch { /* error handled by store */ }
    setSubmitting(false);
  }, [gameState, route, openedCities, investTech, investFit, investShow, declaration, eventId, submitDecision, fetchState, clearError]);

  const handleSaveProductName = async () => {
    if (productName.trim()) {
      await setProductName(eventId, productName.trim());
    }
  };

  if (loading && !gameState) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>无法加载游戏数据</p>
        <button onClick={() => navigate('/games')} className="mt-4 text-blue-400 hover:underline">
          返回商赛大厅
        </button>
      </div>
    );
  }

  const isFinished = gameState.match_status === 'finished';
  const canSubmit = gameState.current_round && !gameState.has_submitted && !isFinished;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/games')} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">创想大赢家 · TechVenture</h1>
          <p className="text-gray-400 text-sm">
            {gameState.team.team_name} — {gameState.team.product_name || '未命名产品'}
            {gameState.current_round && ` · 第${gameState.current_round.round_no}轮`}
            {isFinished && ' · 比赛已结束'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-yellow-400">
            <DollarSign className="w-4 h-4 inline" /> {budget.toFixed(1)} 万
          </p>
          {gameState.team.last_rank && (
            <p className="text-sm text-gray-400">上轮第{gameState.team.last_rank}名</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-1">
        {[
          { key: 'decide', label: '决策面板', icon: Target },
          { key: 'feedback', label: '上轮反馈', icon: TrendingUp },
          { key: 'board', label: '排行榜', icon: Trophy },
          { key: 'news', label: '赛场快讯', icon: Newspaper },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key as any);
              if (key === 'board') fetchLeaderboard(eventId);
              if (key === 'news') fetchNews(eventId);
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-t text-sm font-medium transition-colors
              ${activeTab === key
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Tab: Decision */}
      {activeTab === 'decide' && (
        <div className="space-y-6">
          {/* Product name */}
          {!gameState.team.product_name && (
            <div className="bg-gray-800 rounded-lg p-4">
              <label className="block text-sm text-gray-400 mb-2">为你的产品起个名字</label>
              <div className="flex gap-2">
                <input
                  value={productName}
                  onChange={e => setProductNameLocal(e.target.value)}
                  maxLength={40}
                  className="flex-1 bg-gray-900 rounded px-3 py-2 text-sm"
                  placeholder="例如：星辰智学"
                />
                <button onClick={handleSaveProductName}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
                  确定
                </button>
              </div>
            </div>
          )}

          {/* Route selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">战略路线</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(routesCfg).map(([rid, rcfg]) => {
                const Icon = ROUTE_ICONS[rid] || Compass;
                const isActive = route === rid;
                return (
                  <button
                    key={rid}
                    onClick={() => setRoute(rid as RouteId)}
                    disabled={!canSubmit}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      isActive
                        ? `${ROUTE_COLORS[rid]} bg-gray-800`
                        : 'border-gray-700 text-gray-400 hover:border-gray-500'
                    } ${!canSubmit ? 'opacity-50' : ''}`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <p className="font-medium text-sm">{rcfg.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{rcfg.tagline}</p>
                  </button>
                );
              })}
            </div>
            {switchCost > 0 && (
              <p className="text-xs text-yellow-400 mt-1">切换路线需支付 {switchCost} 万</p>
            )}
          </div>

          {/* City expansion */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">城市经营</h3>
            <div className="flex flex-wrap gap-3">
              {allCities.map(c => {
                const isOpen = openedCities.includes(c);
                const isNew = isOpen && !gameState.team.opened_cities.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => {
                      if (!canSubmit) return;
                      if (isOpen && !gameState.team.opened_cities.includes(c)) {
                        setOpenedCities(prev => prev.filter(x => x !== c));
                      } else if (!isOpen) {
                        setOpenedCities(prev => [...prev, c]);
                      }
                    }}
                    disabled={!canSubmit || gameState.team.opened_cities.includes(c)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm
                      ${isOpen ? 'border-green-600 text-green-400' : 'border-gray-600 text-gray-400 hover:border-gray-400'}
                      ${gameState.team.opened_cities.includes(c) ? 'cursor-default' : ''}
                    `}
                  >
                    <MapPin className="w-4 h-4" />
                    {citiesCfg[c]?.label || c}
                    {isNew && <span className="text-xs text-yellow-400 ml-1">(新 +{cityExpandCost}万)</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Investment sliders */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-medium text-gray-300">资金分配</h3>

            <div>
              <label className="flex items-center justify-between text-sm text-gray-400">
                <span><Cpu className="w-4 h-4 inline mr-1" />Tech 研发投入</span>
                <span className="text-white font-mono">{investTech.toFixed(1)} 万</span>
              </label>
              <input type="range" min={0} max={Math.max(0, budget - switchCost - expandCost)}
                step={0.5} value={investTech}
                onChange={e => setInvestTech(Number(e.target.value))}
                disabled={!canSubmit}
                className="w-full mt-1" />
            </div>

            {openedCities.map(city => (
              <div key={city} className="space-y-2 border-t border-gray-700 pt-3">
                <p className="text-sm text-gray-300">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />
                  {citiesCfg[city]?.label || city}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center justify-between text-xs text-gray-500">
                      <span>Fit 用户匹配</span>
                      <span className="text-white font-mono">{(investFit[city] || 0).toFixed(1)}</span>
                    </label>
                    <input type="range" min={0} max={30} step={0.5}
                      value={investFit[city] || 0}
                      onChange={e => setInvestFit(prev => ({ ...prev, [city]: Number(e.target.value) }))}
                      disabled={!canSubmit}
                      className="w-full" />
                  </div>
                  <div>
                    <label className="flex items-center justify-between text-xs text-gray-500">
                      <span>Show 展示声量</span>
                      <span className="text-white font-mono">{(investShow[city] || 0).toFixed(1)}</span>
                    </label>
                    <input type="range" min={0} max={30} step={0.5}
                      value={investShow[city] || 0}
                      onChange={e => setInvestShow(prev => ({ ...prev, [city]: Number(e.target.value) }))}
                      disabled={!canSubmit}
                      className="w-full" />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-between text-sm pt-2 border-t border-gray-700">
              <span className="text-gray-400">总支出</span>
              <span className={remaining < -0.01 ? 'text-red-400 font-bold' : 'text-white font-mono'}>
                {totalCost.toFixed(1)} 万 / 剩余 {remaining.toFixed(1)} 万
              </span>
            </div>
          </div>

          {/* Declaration */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">产品宣言（≤60字）</h3>
            <textarea
              value={declaration}
              onChange={e => setDeclaration(e.target.value.slice(0, 60))}
              disabled={!canSubmit}
              rows={2}
              className="w-full bg-gray-800 rounded-lg p-3 text-sm resize-none"
              placeholder="用一句话描述你们本轮的核心策略与愿景..."
            />
            <p className="text-xs text-gray-500 mt-1">{declaration.length}/60</p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || remaining < -0.01 || submitting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700
              disabled:bg-gray-700 disabled:text-gray-500 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {gameState.has_submitted ? '已提交' : isFinished ? '比赛已结束' : '提交决策'}
          </button>
        </div>
      )}

      {/* Tab: Feedback */}
      {activeTab === 'feedback' && (
        <div className="bg-gray-800 rounded-lg p-6">
          {gameState.last_snapshot ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  第{gameState.last_snapshot.route ? '' : '?'}轮结算反馈
                </h3>
                <span className="text-2xl font-bold text-yellow-400">
                  #{gameState.last_snapshot.rank}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Tech</p>
                  <p className="text-lg font-bold text-blue-400">
                    {(gameState.last_snapshot.tech || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-400">有效声量</p>
                  <p className="text-lg font-bold text-green-400">
                    {(gameState.last_snapshot.eff_attention || 0).toFixed(1)}
                  </p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-400">BQI</p>
                  <p className="text-lg font-bold text-purple-400">
                    {(gameState.last_snapshot.bqi || 1).toFixed(2)}
                  </p>
                </div>
              </div>
              {gameState.last_snapshot.bqi_contribs?.length > 0 && (
                <div>
                  <h4 className="text-sm text-gray-400 mb-2">BQI 影响因素</h4>
                  <ul className="space-y-1">
                    {gameState.last_snapshot.bqi_contribs.map((c: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className={`font-mono ${c.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {c.delta >= 0 ? '+' : ''}{c.delta.toFixed(2)}
                        </span>
                        <span className="text-gray-300">{c.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {gameState.last_snapshot.route_crowd && (
                <p className="text-sm text-gray-400">
                  路线拥挤度：
                  <span className="text-white ml-1">
                    {gameState.last_snapshot.route_crowd.label}
                  </span>
                  {gameState.last_snapshot.route_crowd.has_blue_ocean_somewhere && (
                    <span className="text-blue-400 ml-2">场上存在蓝海路线</span>
                  )}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">暂无结算数据（第一轮尚未完成）</p>
          )}
        </div>
      )}

      {/* Tab: Leaderboard */}
      {activeTab === 'board' && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="py-3 px-4 text-left">#</th>
                <th className="py-3 px-4 text-left">队伍</th>
                <th className="py-3 px-4 text-left">产品</th>
                <th className="py-3 px-4 text-right">累计分</th>
                <th className="py-3 px-4 text-right">路线</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => (
                <tr key={entry.team_id}
                  className={`border-b border-gray-700/50 ${entry.team_id === gameState.team.team_id ? 'bg-blue-900/20' : ''}`}>
                  <td className="py-3 px-4 font-bold text-yellow-400">{i + 1}</td>
                  <td className="py-3 px-4">{entry.team_name}</td>
                  <td className="py-3 px-4 text-gray-400">{entry.product_name || '—'}</td>
                  <td className="py-3 px-4 text-right font-mono">{entry.weighted_total.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={ROUTE_COLORS[entry.route] || 'text-gray-400'}>
                      {routesCfg[entry.route]?.label || entry.route}
                    </span>
                  </td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: News */}
      {activeTab === 'news' && (
        <div className="space-y-3">
          {news.length === 0 && (
            <p className="text-center text-gray-500 py-8">暂无赛场快讯</p>
          )}
          {news.map(item => (
            <div key={item.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{item.headline}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
