import { BarChart3, Sparkles } from 'lucide-react';

type Snap = Record<string, any> | null | undefined;

export default function TvKpiCards({ snap }: { snap: Snap }) {
  if (!snap) {
    return (
      <div className="rounded-xl border border-border-subtle bg-background-secondary p-3 text-xs text-foreground-muted text-center">
        首轮结算后显示 KPI（Tech/声量/BQI）
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="rounded-xl bg-background-secondary border border-border-subtle p-2">
        <p className="text-[10px] text-foreground-muted">Tech</p>
        <p className="font-bold text-blue-400 tabular-nums">{(snap.tech || 0).toFixed(2)}</p>
      </div>
      <div className="rounded-xl bg-background-secondary border border-border-subtle p-2">
        <p className="text-[10px] text-foreground-muted">声量</p>
        <p className="font-bold text-success tabular-nums">{(snap.eff_attention || 0).toFixed(1)}</p>
      </div>
      <div className="rounded-xl bg-background-secondary border border-border-subtle p-2">
        <p className="text-[10px] text-foreground-muted">BQI</p>
        <p className="font-bold text-purple-400 tabular-nums">{(snap.bqi || 1).toFixed(2)}</p>
      </div>
      <div className="col-span-3 grid grid-cols-2 gap-2 pt-1">
        <div className="rounded-xl bg-background-secondary border border-border-subtle p-2 flex items-center justify-between">
          <span className="text-[10px] text-foreground-muted inline-flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5" />
            排名
          </span>
          <span className="font-bold text-warning tabular-nums">#{snap.rank ?? '—'}</span>
        </div>
        <div className="rounded-xl bg-background-secondary border border-border-subtle p-2 flex items-center justify-between">
          <span className="text-[10px] text-foreground-muted inline-flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            热点
          </span>
          <span className="text-xs">{snap.hotpulse_label || '无'}</span>
        </div>
      </div>
    </div>
  );
}

