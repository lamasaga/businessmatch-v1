import { ArrowRight, Loader2, SkipForward } from 'lucide-react';
import type { OpsPhase } from '../../types/ops';

interface Props {
  phase: OpsPhase | undefined;
  canAdvance: boolean;
  submitting: boolean;
  onAdvance: () => void;
}

function advanceLabel(phase: OpsPhase | undefined): string {
  if (phase === 'operation_round_6') return '完成比赛';
  if (phase === 'auction_b') return '结算拍卖 · 进入 R4';
  if (phase === 'auction' || phase === 'auction_a') return '结算拍卖 · 进入 R1';
  if (phase?.startsWith('operation_round_')) return '进入下一回合';
  return '进入下一阶段';
}

export default function AdvanceActionBar({ phase, canAdvance, submitting, onAdvance }: Props) {
  if (!canAdvance) return null;

  const isAuction = phase === 'auction' || phase === 'auction_a' || phase === 'auction_b';

  return (
    <div
      className={`rounded-2xl border p-4 space-y-3 ${
        isAuction ? 'border-ops-auction/30 bg-ops-auction/5' : 'border-ops-primary/30 bg-ops-primary/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            isAuction ? 'bg-ops-auction/15' : 'bg-ops-primary/15'
          }`}
        >
          {isAuction ? (
            <SkipForward className="w-4 h-4 text-ops-auction" />
          ) : (
            <ArrowRight className="w-4 h-4 text-ops-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {isAuction ? '本阶段可结算拍卖' : '全员决策已就绪'}
          </p>
          <p className="text-xs text-foreground-muted mt-0.5">
            {isAuction
              ? '完成出价后点击推进，拍品将结算并进入下一运营轮。'
              : 'AI 对手已补齐策略，点击推进将结算本轮并生成财务报表。'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAdvance}
        disabled={submitting}
        className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50 transition-all ${
          isAuction
            ? 'bg-ops-auction hover:bg-ops-auction/90 shadow-[0_0_16px_rgba(245,158,11,0.25)]'
            : 'bg-ops-primary hover:bg-ops-primary/90 shadow-[0_0_16px_rgba(59,130,246,0.25)]'
        }`}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="h-4 w-4" />
        )}
        {advanceLabel(phase)}
      </button>
    </div>
  );
}
