import { Wallet, Package, TrendingUp, Cpu, Heart, Sparkles } from 'lucide-react';
import type { OpsTeamState } from '../../types/ops';

interface Props {
  team: OpsTeamState;
  compact?: boolean;
}

export default function TeamStatusBar({ team, compact }: Props) {
  const metrics = [
    { label: '现金', value: `¥${team.cash.toLocaleString()}`, icon: Wallet, color: 'text-ops-primary' },
    { label: '库存', value: `${team.inventory} 件`, icon: Package, color: 'text-foreground' },
    { label: '累计利润', value: `¥${team.cumulative_profit.toLocaleString()}`, icon: TrendingUp, color: team.cumulative_profit >= 0 ? 'text-success' : 'text-danger' },
    { label: 'Tech', value: team.tech.toFixed(1), icon: Cpu, color: 'text-ops-primary' },
    { label: 'Fit', value: team.fit.toFixed(1), icon: Heart, color: 'text-success' },
    { label: 'Show', value: team.show.toFixed(1), icon: Sparkles, color: 'text-ops-auction' },
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {metrics.slice(0, 3).map((m) => (
          <span key={m.label} className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-border-subtle px-2 py-1 text-xs">
            <m.icon className={`w-3 h-3 ${m.color}`} />
            <span className="text-foreground-muted">{m.label}</span>
            <span className={`font-semibold tabular-nums ${m.color}`}>{m.value}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-xl border border-border-subtle bg-background/60 px-3 py-2.5 flex items-center gap-2.5"
        >
          <div className="p-1.5 rounded-lg bg-ops-primary/10">
            <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-foreground-muted truncate">{m.label}</p>
            <p className={`text-sm font-bold tabular-nums truncate ${m.color}`}>{m.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
