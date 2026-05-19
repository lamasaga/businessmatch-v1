import { Users, TrendingUp, TrendingDown } from 'lucide-react';
import { POP_SEGMENTS } from '../../data/mockPlatform';

export default function PopPanel() {
  return (
    <section className="glass-card p-5 space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          Demia POP
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300">规则 + 叙事</span>
      </header>
      <p className="text-xs text-foreground-muted">
        市场由多元人群构成；满意度由决策驱动，舆情由 AI 生成（演示）。
      </p>
      <ul className="space-y-3 list-none p-0 m-0">
        {POP_SEGMENTS.map((pop) => (
          <li key={pop.id} className="p-3 rounded-lg bg-background-hover/50">
            <p className="flex justify-between text-sm mb-2">
              <span className="font-medium text-foreground">{pop.name}</span>
              <span className="font-mono">{pop.satisfaction}%</span>
            </p>
            <p className="h-2 bg-background rounded-full overflow-hidden mb-2">
              <span
                className="block h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                style={{ width: `${pop.satisfaction}%` }}
              />
            </p>
            <p className="flex items-center gap-2 text-xs text-foreground-muted">
              {pop.trend.startsWith('+') ? (
                <TrendingUp className="w-3 h-3 text-success" />
              ) : (
                <TrendingDown className="w-3 h-3 text-danger" />
              )}
              <span>{pop.trend}</span>
              <span>{pop.mood}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
