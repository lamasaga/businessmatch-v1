import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOpsStore } from '../../stores/opsStore';
import type { OpsDecisionPayload, OpsPositioningPayload } from '../../types/ops';
import ProductPositioningPanel from '../../components/ops/ProductPositioningPanel';
import DecisionForm from '../../components/ops/DecisionForm';
import AuctionHall from '../../components/ops/AuctionHall';
import FinancialStatements from '../../components/ops/FinancialStatements';
import RankingPanel from '../../components/ops/RankingPanel';
import PhaseStepper from '../../components/ops/PhaseStepper';
import { ArrowLeft, Loader2, ArrowRight, Building2, Wallet, TrendingUp, BarChart3 } from 'lucide-react';

export default function OpsPlayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = Number(id);

  const {
    gameState, ranking, snapshots, loading, error,
    fetchState, submitPositioning, submitDecision, placeBid, advancePractice, fetchRanking, clearError,
  } = useOpsStore();

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchState(eventId);
      fetchRanking(eventId);
    }
  }, [eventId, fetchState, fetchRanking]);

  useEffect(() => {
    if (!eventId || gameState?.match_status === 'finished') return;
    const timer = setInterval(() => { fetchState(eventId); }, 8000);
    return () => clearInterval(timer);
  }, [eventId, fetchState, gameState?.match_status]);

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

  const phaseTitle = (() => {
    if (phase === 'positioning') return '产品定位';
    if (phase?.startsWith('operation_round_')) return `R${currentRound?.round_number || ''} 运营决策`;
    if (phase === 'auction' || phase === 'auction_a') return '拍卖 A · 基础资源';
    if (phase === 'auction_b') return '拍卖 B · 战略资源';
    if (phase === 'finished') return '比赛结束';
    if (phase === 'paused') return '运营暂停';
    return '生产经营销售赛';
  })();

  return (
    <div className="min-h-screen bg-[#0a1628] text-foreground">
      <header className="flex items-center justify-between border-b border-ops-primary/20 bg-[#0a1628]/80 backdrop-blur px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/games')}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-ops-primary/15 flex items-center justify-center border border-ops-primary/30">
              <Building2 className="w-4 h-4 text-ops-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{phaseTitle}</h1>
              <p className="text-xs text-foreground-muted">
                {team?.team_name} · 现金 ¥{team?.cash.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-ops-primary/10 border border-ops-primary/20 px-3 py-1.5">
            <Wallet className="w-3.5 h-3.5 text-ops-primary" />
            <span className="text-xs font-medium text-foreground-secondary">净资产</span>
            <span className="text-sm font-bold tabular-nums text-ops-primary">¥{team?.net_assets.toLocaleString()}</span>
          </div>
          <div className="sm:hidden">
            <div className="text-xs text-foreground-muted">净资产</div>
            <div className="text-sm font-bold text-ops-primary">¥{team?.net_assets.toLocaleString()}</div>
          </div>
        </div>
      </header>

      <div className="border-b border-ops-primary/10 bg-[#0a1628]/60 backdrop-blur">
        <div className="max-w-7xl mx-auto">
          <PhaseStepper phase={phase} />
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger mb-4">
            {error}
          </div>
        )}

        {loading && !gameState && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-ops-primary" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
          {/* 左侧：操作面板 */}
          <div className="space-y-4">
            {phase === 'positioning' && cfg && !team?.category && (
              <ProductPositioningPanel
                categories={cfg.product_categories}
                segments={cfg.consumer_segments}
                onSubmit={handlePositioning}
                submitting={submitting || loading}
              />
            )}

            {phase === 'positioning' && team?.category && (
              <div className="rounded-2xl border border-ops-primary/20 bg-background-secondary/60 p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-ops-primary/15 flex items-center justify-center mx-auto">
                  <Loader2 className="w-6 h-6 animate-spin text-ops-primary" />
                </div>
                <p className="font-semibold text-lg">产品定位已提交</p>
                <p className="text-sm text-foreground-muted">
                  {team.product_name} · {cfg?.product_categories[team.category]?.name} · {cfg?.consumer_segments[team.target_segment || 'pragmatic']?.name}
                </p>
                <p className="text-xs text-foreground-muted">等待组织者推进至拍卖 A</p>
              </div>
            )}

            {(phase?.startsWith('operation_round_') || phase === 'paused') && cfg && team && (
              <DecisionForm
                team={team}
                cities={cfg.cities}
                category={cfg.product_categories[team.category || 'home']}
                currentRound={currentRound ?? null}
                hasSubmitted={!!gameState?.has_submitted}
                onSubmit={handleDecision}
                submitting={submitting || loading}
              />
            )}

            {(phase === 'auction' || phase === 'auction_a' || phase === 'auction_b') && (
              <AuctionHall
                items={gameState?.auction_items || []}
                teamId={team?.team_id}
                cash={team?.cash || 0}
                onBid={handleBid}
              />
            )}

            {phase === 'finished' && (
              <RankingPanel ranking={ranking} myTeamId={team?.team_id} />
            )}
          </div>

          {/* 右侧：财务 / 拍卖信息 */}
          <div className="space-y-4">
            {phase === 'positioning' && (
              <div className="rounded-2xl border border-ops-primary/20 bg-background-secondary/60 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-ops-primary" />
                  <h3 className="font-bold">经营决策台</h3>
                </div>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  你将模拟经营一家公司：先确定产品定位，随后通过拍卖获取稀缺资源，在多轮运营中制定生产、定价、营销与渠道策略。
                </p>
                <div className="space-y-2 text-xs text-foreground-muted">
                  <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ops-primary" /> 产品定位决定成本结构与客群偏好</div>
                  <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ops-auction" /> 拍卖获取产能、渠道、品牌等资源</div>
                  <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-success" /> 每轮提交决策，查看财务报表反馈</div>
                </div>
              </div>
            )}

            {(phase === 'auction' || phase === 'auction_a' || phase === 'auction_b') && (
              <div className="rounded-2xl border border-ops-auction/30 bg-ops-auction/10 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-ops-auction" />
                  <h3 className="font-bold">拍卖资金</h3>
                </div>
                <div className="text-3xl font-bold tabular-nums text-ops-auction">¥{team?.cash.toLocaleString()}</div>
                <p className="text-xs text-foreground-muted">出价不得超过可用现金。资源成交后立即扣款并在后续运营中生效。</p>
              </div>
            )}

            {lastSnapshot && <FinancialStatements snapshot={lastSnapshot} history={snapshots} />}

            {gameState?.can_advance && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAdvance}
                  disabled={submitting || loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-ops-primary px-4 py-2 text-sm font-semibold text-white hover:bg-ops-primary/90 disabled:opacity-50 shadow-[0_0_16px_rgba(59,130,246,0.25)]"
                >
                  {submitting || loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {phase === 'operation_round_6' ? '完成比赛' : phase === 'auction_b' ? '进入 R4' : phase === 'auction' || phase === 'auction_a' ? '进入 R1' : '进入下一回合'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
