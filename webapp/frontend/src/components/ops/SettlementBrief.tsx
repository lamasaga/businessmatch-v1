import { Newspaper, Zap } from 'lucide-react';
import type { OpsNewsItem, OpsSnapshot } from '../../types/ops';

interface Props {
  snapshot: OpsSnapshot | null;
  news?: OpsNewsItem[];
}

export default function SettlementBrief({ snapshot, news = [] }: Props) {
  const result = snapshot?.result;
  if (!result && news.length === 0) return null;

  const profit = snapshot?.financial_statements?.income_statement?.net_profit ?? 0;
  const sales = result?.sales ?? 0;

  return (
    <div className="rounded-2xl border border-border-subtle bg-background-secondary/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Newspaper className="w-4 h-4 text-ops-primary" />
        <h3 className="text-sm font-bold">本轮经营简报</h3>
      </div>

      {result && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-background/60 p-2.5">
            <p className="text-foreground-muted">实际销量</p>
            <p className="font-bold text-lg tabular-nums mt-0.5">{sales} 件</p>
          </div>
          <div className="rounded-lg bg-background/60 p-2.5">
            <p className="text-foreground-muted">净利润</p>
            <p className={`font-bold text-lg tabular-nums mt-0.5 ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
              {profit >= 0 ? '' : '-'}¥{Math.abs(profit).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {news.map((item, i) => (
        <div
          key={`${item.kind}-${i}`}
          className="flex gap-2 rounded-lg border border-ops-auction/20 bg-ops-auction/5 px-3 py-2 text-xs"
        >
          <Zap className="w-3.5 h-3.5 text-ops-auction shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-ops-auction">{item.headline}</p>
            {item.body && <p className="text-foreground-muted mt-0.5">{item.body}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
