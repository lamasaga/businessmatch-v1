import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOpsStore } from '../../stores/opsStore';
import type { OpsDecisionPayload, OpsPositioningPayload } from '../../types/ops';
import ProductPositioningPanel from '../../components/ops/ProductPositioningPanel';
import DecisionForm from '../../components/ops/DecisionForm';
import AuctionHall from '../../components/ops/AuctionHall';
import FinancialStatements from '../../components/ops/FinancialStatements';
import RankingPanel from '../../components/ops/RankingPanel';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function OpsPlayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = Number(id);

  const {
    gameState, ranking, loading, error,
    fetchState, submitPositioning, submitDecision, placeBid, fetchRanking, clearError,
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

  const phase = gameState?.phase;
  const team = gameState?.team;
  const cfg = gameState?.config;
  const currentRound = gameState?.current_round;
  const lastSnapshot = gameState?.last_snapshot;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/games')}
            className="p-2 rounded-lg hover:bg-background-secondary"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">生产经营销售赛</h1>
            <p className="text-xs text-foreground-muted">
              {team?.team_name} · 现金 ¥{team?.cash.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">
            {phase === 'positioning' && '产品定位'}
            {phase?.startsWith('operation_round_') && `R${currentRound?.round_number || ''} 运营决策`}
            {phase === 'auction' && '资源竞价'}
            {phase === 'finished' && '比赛结束'}
          </div>
          <div className="text-xs text-foreground-muted">
            净资产 ¥{team?.net_assets.toLocaleString()}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && !gameState && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {phase === 'positioning' && cfg && !team?.category && (
          <ProductPositioningPanel
            categories={cfg.product_categories}
            segments={cfg.consumer_segments}
            onSubmit={handlePositioning}
            submitting={submitting || loading}
          />
        )}

        {phase === 'positioning' && team?.category && (
          <div className="rounded-2xl border border-border-subtle bg-background-secondary p-6 text-center space-y-2">
            <p className="font-semibold">产品定位已提交</p>
            <p className="text-sm text-foreground-muted">
              {team.product_name} · 等待进入运营决策…
            </p>
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mt-2" />
          </div>
        )}

        {(phase?.startsWith('operation_round_') || phase === 'paused') && cfg && team && (
          <>
            {lastSnapshot && <FinancialStatements snapshot={lastSnapshot} />}
            <DecisionForm
              team={team}
              cities={cfg.cities}
              category={cfg.product_categories[team.category || 'home']}
              currentRound={currentRound ?? null}
              hasSubmitted={!!gameState?.has_submitted}
              onSubmit={handleDecision}
              submitting={submitting || loading}
            />
          </>
        )}

        {phase === 'auction' && (
          <AuctionHall
            items={gameState?.auction_items || []}
            teamId={team?.team_id}
            cash={team?.cash || 0}
            onBid={handleBid}
          />
        )}

        {phase === 'finished' && (
          <>
            {lastSnapshot && <FinancialStatements snapshot={lastSnapshot} />}
            <RankingPanel ranking={ranking} myTeamId={team?.team_id} />
          </>
        )}
      </main>
    </div>
  );
}
