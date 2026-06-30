import { ListOrdered } from 'lucide-react';
import type { RtsPendingAction } from '../../types';

type Props = {
  pending: RtsPendingAction[];
  actionHint?: string | null;
};

function formatEstimate(delta?: number | null) {
  if (delta == null || delta === 0) return null;
  const sign = delta > 0 ? '+' : '';
  return `预估现金 ${sign}¥${Math.round(delta).toLocaleString()}`;
}

export default function FstPendingQueue({ pending, actionHint }: Props) {
  if (!pending.length && !actionHint) return null;

  return (
    <div className="fst-pending-queue">
      <div className="fst-pending-queue__title">
        <ListOrdered className="h-4 w-4" />
        <span>待结算指令</span>
      </div>
      {actionHint && (
        <p className="fst-pending-queue__flash">{actionHint}</p>
      )}
      {pending.map((item, i) => (
        <div key={`${item.action_type}-${i}`} className="fst-pending-queue__item">
          <span className="fst-pending-queue__label">{item.label}</span>
          <span className="fst-pending-queue__detail">{item.detail}</span>
          {item.estimate_cash_delta != null && (
            <b>{formatEstimate(item.estimate_cash_delta)}</b>
          )}
        </div>
      ))}
    </div>
  );
}
