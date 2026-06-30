import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  ClipboardList,
  Gavel,
  Info,
  LayoutDashboard,
  Loader2,
  Play,
  Trophy,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useOpsStore } from '../../stores/opsStore';
import type {
  OpsDecisionPayload,
  OpsPhase,
  OpsPositioningPayload,
  OpsRankingEntry,
  OpsSnapshot,
  OpsTeamState,
} from '../../types/ops';
import ProductPositioningPanel from '../../components/ops/ProductPositioningPanel';
import DecisionForm from '../../components/ops/DecisionForm';
import AuctionHall from '../../components/ops/AuctionHall';
import FinancialStatements from '../../components/ops/FinancialStatements';
import RankingPanel from '../../components/ops/RankingPanel';
import PhaseStepper from '../../components/ops/PhaseStepper';
import TeamStatusBar from '../../components/ops/TeamStatusBar';
import RoundCountdown from '../../components/ops/RoundCountdown';
import AdvanceActionBar from '../../components/ops/AdvanceActionBar';
import SettlementBrief from '../../components/ops/SettlementBrief';

type OpsMenu = 'decision' | 'auction' | 'finance' | 'ranking' | 'brief';

function menuForPhase(phase: OpsPhase | undefined): OpsMenu {
  if (phase === 'auction' || phase === 'auction_a' || phase === 'auction_b') return 'auction';
  if (phase === 'finished') return 'ranking';
  return 'decision';
}

export default function OpsPlayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = Number(id);

  const {
    gameState, ranking, snapshots, loading, error,
    fetchState, fetchFinancials, submitPositioning, submitDecision, placeBid,
    advancePractice, fetchRanking, clearError,
  } = useOpsStore();

  const [submitting, setSubmitting] = useState(false);
  const [activeMenu, setActiveMenu] = useState<OpsMenu>('decision');

  useEffect(() => {
    if (!eventId) return;
    fetchState(eventId);
    fetchFinancials(eventId);
    fetchRanking(eventId);
  }, [eventId, fetchState, fetchFinancials, fetchRanking]);

  useEffect(() => {
    if (!eventId || gameState?.match_status === 'finished') return;
    const timer = setInterval(() => { fetchState(eventId); }, 8000);
    return () => clearInterval(timer);
  }, [eventId, fetchState, gameState?.match_status]);

  useEffect(() => {
    setActiveMenu(menuForPhase(gameState?.phase));
  }, [gameState?.phase]);

  const handlePositioning = async (payload: OpsPositioningPayload) => {
    setSubmitting(true);
    clearError();
    try {
      await submitPositioning(eventId, payload);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (payload: OpsDecisionPayload) => {
    setSubmitting(true);
    clearError();
    try {
      await submitDecision(eventId, payload);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBid = async (itemId: number, amount: number) => {
    clearError();
    try {
      await placeBid(eventId, itemId, amount);
    } catch {
      /* store handles error */
    }
  };

  const handleAdvance = async () => {
    setSubmitting(true);
    clearError();
    try {
      await advancePractice(eventId);
      await fetchFinancials(eventId);
      await fetchRanking(eventId);
    } finally {
      setSubmitting(false);
    }
  };

  const phase = gameState?.phase;
  const team = gameState?.team;
  const cfg = gameState?.config;
  const currentRound = gameState?.current_round;
  const lastSnapshot = gameState?.last_snapshot;
  const isPractice = gameState?.match_kind === 'practice';
  const isOfficial = !isPractice;
  const themeName = gameState?.theme_pack?.name;

  const phaseTitle = (() => {
    if (phase === 'positioning') return '产品定位';
    if (phase?.startsWith('operation_round_')) return `R${currentRound?.round_number || ''} 运营决策`;
    if (phase === 'auction' || phase === 'auction_a') return '拍卖 A · 基础经营资源';
    if (phase === 'auction_b') return '拍卖 B · 战略资源';
    if (phase === 'finished') return '比赛结束';
    if (phase === 'paused') return '运营暂停';
    return '生产经营销售赛';
  })();

  const showOperation = (phase?.startsWith('operation_round_') || phase === 'paused') && cfg && team;
  const showAuction = phase === 'auction' || phase === 'auction_a' || phase === 'auction_b';
  const showPositioningForm = phase === 'positioning' && cfg && !team?.category;
  const showSubmittedWaiting = !isPractice && gameState?.has_submitted && phase?.startsWith('operation_round_');

  const menus = useMemo(() => ([
    { id: 'decision' as const, label: '本阶段操作', desc: phase === 'positioning' ? '定位并开始' : '产销决策', icon: ClipboardList, enabled: true },
    { id: 'auction' as const, label: '拍卖大厅', desc: showAuction ? '正在竞拍' : '资源预览', icon: Gavel, enabled: true },
    { id: 'finance' as const, label: '经营结果', desc: lastSnapshot ? '报表与新闻' : '暂无结算', icon: BarChart3, enabled: true },
    { id: 'ranking' as const, label: '排行榜', desc: phase === 'finished' ? '最终排名' : '实时排名', icon: Trophy, enabled: true },
    { id: 'brief' as const, label: '赛程说明', desc: '规则与阶段', icon: Info, enabled: true },
  ]), [lastSnapshot, phase, showAuction]);

  const renderMainStage = () => {
    if (activeMenu === 'decision') {
      if (showPositioningForm) {
        return (
          <ProductPositioningPanel
            categories={cfg!.product_categories}
            segments={cfg!.consumer_segments}
            onSubmit={handlePositioning}
            submitting={submitting || loading}
          />
        );
      }
      if (showOperation) {
        return (
          <DecisionForm
            team={team!}
            cities={cfg!.cities}
            category={cfg!.product_categories[team!.category || 'home']}
            currentRound={currentRound ?? null}
            hasSubmitted={!!gameState?.has_submitted}
            isPractice={isPractice}
            isOfficial={isOfficial}
            onSubmit={handleDecision}
            submitting={submitting || loading}
          />
        );
      }
      return <OpsEmptyState title="当前没有可提交的经营决策" body="请切换到拍卖、报表或排行榜查看本阶段信息。" />;
    }

    if (activeMenu === 'auction') {
      if (showAuction) {
        return (
          <AuctionHall
            items={gameState?.auction_items || []}
            teamId={team?.team_id}
            cash={team?.cash || 0}
            stage={phase === 'auction_b' ? 'b' : 'a'}
            onBid={handleBid}
          />
        );
      }
      return <OpsEmptyState title="拍卖尚未开始" body="拍卖 A 在 R1 前开放，拍卖 B 在后半场前开放。到达阶段后这里会切换为拍卖大厅。" />;
    }

    if (activeMenu === 'finance') {
      return (
        <div className="space-y-4">
          {(lastSnapshot || (gameState?.last_news?.length ?? 0) > 0) ? (
            <SettlementBrief snapshot={lastSnapshot ?? null} news={gameState?.last_news} />
          ) : (
            <OpsEmptyState title="暂无结算结果" body="提交并推进后，这里会出现销量、利润、新闻和财务报表。" />
          )}
          {lastSnapshot && <FinancialStatements snapshot={lastSnapshot} history={snapshots} />}
        </div>
      );
    }

    if (activeMenu === 'ranking') {
      if (phase === 'finished' && team) {
        return (
          <OpsSettlementPanel
            team={team}
            ranking={ranking}
            snapshots={snapshots}
            lastSnapshot={lastSnapshot ?? null}
          />
        );
      }
      return <RankingPanel ranking={ranking} myTeamId={team?.team_id} />;
    }

    return <OpsBriefCard isPractice={isPractice} />;
  };

  return (
    <div className="ops-shell min-h-screen">
      <header className="ops-topbar sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/games')}
            className="ops-icon-button shrink-0"
            aria-label="返回赛事列表"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-ops-primary/10 flex items-center justify-center border border-ops-primary/25 shrink-0">
            <Building2 className="w-5 h-5 text-ops-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{phaseTitle}</h1>
            <p className="text-xs text-foreground-muted truncate">
              {team?.team_name || '队伍'}
              {themeName ? ` · ${themeName}` : ''}
              {team?.product_name ? ` · ${team.product_name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <RoundCountdown currentRound={currentRound ?? null} isOfficial={isOfficial} />
          <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white border border-ops-primary/20 px-3 py-2 shadow-sm">
            <Wallet className="w-4 h-4 text-ops-primary" />
            <span className="text-sm font-bold tabular-nums text-ops-primary">¥{team?.net_assets.toLocaleString()}</span>
          </div>
        </div>
      </header>

      <div className="ops-progress-wrap">
        <PhaseStepper phase={phase} currentRound={currentRound?.round_number} />
      </div>

      <main className="max-w-[1480px] mx-auto p-4 space-y-4">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {loading && !gameState && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-ops-primary" />
          </div>
        )}

        {team && phase !== 'finished' && <TeamStatusBar team={team} />}

        <div className="ops-console">
          <aside className="ops-side-menu" aria-label="OPS 二级菜单">
            <div className="ops-side-title">
              <LayoutDashboard className="w-4 h-4" />
              <span>经营工作台</span>
            </div>
            {menus.map((item) => {
              const Icon = item.icon;
              const selected = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!item.enabled}
                  onClick={() => setActiveMenu(item.id)}
                  className={selected ? 'is-active' : ''}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="min-w-0 text-left">
                    <span className="block text-sm font-semibold truncate">{item.label}</span>
                    <span className="block text-[11px] truncate opacity-75">{item.desc}</span>
                  </span>
                </button>
              );
            })}
          </aside>

          <section className="ops-main-stage">
            <div className="ops-stage-header">
              <div>
                <p className="ops-phase-pill">{isPractice ? '练习赛' : '正式赛'} · {phaseTitle}</p>
                <h2 className="ops-stage-title">
                  {activeMenu === 'decision' && (phase === 'positioning' ? '先完成产品定位，然后开始经营' : '填写本轮经营决策')}
                  {activeMenu === 'auction' && '资源拍卖与竞价'}
                  {activeMenu === 'finance' && '结算、新闻与财务报表'}
                  {activeMenu === 'ranking' && (phase === 'finished' ? '赛后结算与最终排名' : '排名与综合得分')}
                  {activeMenu === 'brief' && '赛程与操作说明'}
                </h2>
              </div>
              {phase === 'positioning' && activeMenu === 'decision' && (
                <div className="ops-start-hint">
                  <Play className="w-4 h-4" />
                  填完左侧表单后点击“开始经营”
                </div>
              )}
            </div>
            {renderMainStage()}
          </section>

          <aside className="ops-context-panel">
            <OpsBriefCard isPractice={isPractice} compact />

            {phase === 'positioning' && (
              <div className="ops-start-card">
                <div className="w-10 h-10 rounded-xl bg-ops-primary/10 border border-ops-primary/25 flex items-center justify-center">
                  <Play className="w-5 h-5 text-ops-primary" />
                </div>
                <div>
                  <h3>开局动作</h3>
                  <p>输入产品名，选择品类和目标客群后，点击表单顶部或底部的“开始经营”。系统会进入拍卖或首轮运营。</p>
                </div>
              </div>
            )}

            {showAuction && (
              <div className="rounded-2xl border border-ops-auction/30 bg-ops-auction/10 p-5 space-y-2">
                <h3 className="font-bold text-ops-auction">
                  {phase === 'auction_b' ? '战略资源拍卖' : '基础资源拍卖'}
                </h3>
                <div className="text-3xl font-bold tabular-nums text-ops-auction">¥{team?.cash.toLocaleString()}</div>
                <p className="text-xs text-foreground-muted">
                  出价不得超过可用现金。成交资源在后续运营轮全局生效。
                </p>
              </div>
            )}

            {gameState?.can_advance && isPractice && (
              <AdvanceActionBar
                phase={phase}
                canAdvance
                submitting={submitting || loading}
                onAdvance={handleAdvance}
              />
            )}

            {showSubmittedWaiting && (
              <div className="rounded-xl border border-border-subtle bg-white/90 p-4 text-sm text-foreground-muted text-center shadow-sm">
                已提交本轮决策，等待教师截止并结算。
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function OpsSettlementPanel({
  team,
  ranking,
  snapshots,
  lastSnapshot,
}: {
  team: OpsTeamState;
  ranking: OpsRankingEntry[];
  snapshots: OpsSnapshot[];
  lastSnapshot: OpsSnapshot | null;
}) {
  const finalRank = ranking.find((entry) => entry.team_id === team.team_id)?.rank ?? '-';
  const latest = lastSnapshot ?? snapshots[snapshots.length - 1] ?? null;
  const income = latest?.financial_statements?.income_statement;
  const result = latest?.result;
  const finalSales = Number(result?.sales ?? 0);
  const finalProfit = Number(income?.net_profit ?? team.cumulative_profit ?? 0);
  const topRanking = ranking.slice(0, 8);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-ops-primary/20 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold text-ops-primary">OPS 赛后结算</p>
            <h3 className="mt-1 text-2xl font-bold text-foreground">生产经营销售赛复盘</h3>
            <p className="mt-1 text-sm text-foreground-muted">
              {team.team_name} · {team.product_name || '未命名产品'} · 已保留最终资产、报表、轮次快照和排行榜。
            </p>
          </div>
          <div className="rounded-2xl border border-ops-auction/30 bg-ops-auction/10 px-4 py-3 text-right">
            <p className="text-xs font-semibold text-foreground-muted">最终排名</p>
            <p className="text-3xl font-bold text-ops-auction tabular-nums">#{finalRank}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <OpsSettlementMetric icon={Wallet} label="净资产" value={formatOpsMoney(team.net_assets)} tone="text-ops-primary" />
          <OpsSettlementMetric icon={BarChart3} label="累计利润" value={formatOpsMoney(team.cumulative_profit)} tone={team.cumulative_profit >= 0 ? 'text-success' : 'text-danger'} />
          <OpsSettlementMetric icon={ClipboardList} label="库存" value={`${team.inventory.toLocaleString()} 件`} tone="text-foreground" />
          <OpsSettlementMetric icon={Trophy} label="末轮销量" value={`${finalSales.toLocaleString()} 件`} tone="text-ops-auction" />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-border-subtle bg-white p-5 shadow-sm">
          <h4 className="flex items-center gap-2 font-bold text-foreground">
            <BarChart3 className="h-4 w-4 text-ops-primary" /> 轮次经营快照
          </h4>
          <div className="mt-3 grid gap-2">
            {snapshots.length ? snapshots.map((snapshot, index) => {
              const round = snapshot.result?.round_number ?? index + 1;
              const sales = Number(snapshot.result?.sales ?? 0);
              const profit = Number(snapshot.financial_statements?.income_statement?.net_profit ?? 0);
              const revenue = Number(snapshot.financial_statements?.income_statement?.revenue ?? 0);
              return (
                <div key={`${round}-${index}`} className="grid grid-cols-[52px_repeat(3,minmax(0,1fr))] items-center gap-3 rounded-2xl border border-ops-primary/10 bg-white px-3 py-2 text-sm shadow-sm">
                  <b className="text-ops-primary">R{round}</b>
                  <span className="text-foreground-muted">销量 {sales.toLocaleString()}</span>
                  <span className="text-foreground-muted">收入 {formatOpsMoney(revenue)}</span>
                  <span className={profit >= 0 ? 'text-success' : 'text-danger'}>利润 {formatOpsMoney(profit)}</span>
                </div>
              );
            }) : (
              <OpsEmptyState title="暂无轮次快照" body="后续每轮结算数据会沉淀在这里，用于复盘和研究。" />
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border-subtle bg-white p-5 shadow-sm">
          <h4 className="flex items-center gap-2 font-bold text-foreground">
            <Trophy className="h-4 w-4 text-ops-auction" /> 最终排行榜
          </h4>
          <div className="mt-3 space-y-2">
            {topRanking.length ? topRanking.map((entry) => (
              <div
                key={entry.team_id}
                className={`grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-2xl border px-3 py-2 text-sm ${
                  entry.team_id === team.team_id ? 'border-ops-primary/40 bg-ops-primary/10' : 'border-border-subtle bg-white shadow-sm'
                }`}
              >
                <b className="text-ops-primary">#{entry.rank}</b>
                <span className="font-semibold text-foreground">{entry.team_name}</span>
                <span className="tabular-nums text-foreground-muted">{formatOpsMoney(entry.net_assets)}</span>
              </div>
            )) : (
              <OpsEmptyState title="暂无排行数据" body="最终排行会在比赛结算完成后显示。" />
            )}
          </div>
        </section>
      </div>

      {latest && (
        <section className="rounded-3xl border border-border-subtle bg-white p-5 shadow-sm">
          <h4 className="mb-3 font-bold text-foreground">最终财务摘要</h4>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-ops-primary/10 bg-white p-4 shadow-sm">
              <p className="text-xs text-foreground-muted">末轮净利润</p>
              <p className={`mt-1 text-xl font-bold tabular-nums ${finalProfit >= 0 ? 'text-success' : 'text-danger'}`}>{formatOpsMoney(finalProfit)}</p>
            </div>
            <div className="rounded-2xl border border-ops-primary/10 bg-white p-4 shadow-sm">
              <p className="text-xs text-foreground-muted">现金</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-ops-primary">{formatOpsMoney(team.cash)}</p>
            </div>
            <div className="rounded-2xl border border-ops-primary/10 bg-white p-4 shadow-sm">
              <p className="text-xs text-foreground-muted">Tech / Fit / Show</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{team.tech.toFixed(1)} / {team.fit.toFixed(1)} / {team.show.toFixed(1)}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function OpsSettlementMetric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-ops-primary/10 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-white p-2 shadow-sm">
          <Icon className={`h-5 w-5 ${tone}`} />
        </div>
        <div>
          <p className="text-xs text-foreground-muted">{label}</p>
          <p className={`text-lg font-bold tabular-nums ${tone}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function formatOpsMoney(value: number) {
  const sign = value < 0 ? '-' : '';
  return `${sign}¥${Math.abs(Math.round(value)).toLocaleString()}`;
}

function OpsEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="ops-empty-state">
      <Info className="w-6 h-6 text-ops-primary" />
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

function OpsBriefCard({ isPractice, compact }: { isPractice: boolean; compact?: boolean }) {
  return (
    <div className={compact ? 'ops-info-card' : 'ops-info-card ops-info-card-wide'}>
      <h3>企业经营决策台</h3>
      <p>
        从产品定位开始，依次经历资源拍卖、多轮产销运营和最终结算。每个阶段只突出当前要做的动作，历史结果集中在经营结果中查看。
      </p>
      {!compact && (
        <ol>
          <li>产品定位：确定品类与客群。</li>
          <li>拍卖 A：争夺基础经营资源。</li>
          <li>R1-R3：完成前半场运营。</li>
          <li>拍卖 B：争夺战略资源。</li>
          <li>R4-R6：冲刺最终排名。</li>
        </ol>
      )}
      {isPractice && <span>练习赛提交后，AI 自动补齐，推进按钮会在右侧出现。</span>}
    </div>
  );
}
