import { Trophy, Rocket } from 'lucide-react';
import type { TvLeaderboardEntry } from '../../types/techventure';

type Props = {
  entries: TvLeaderboardEntry[];
  selfTeamId?: number;
  onReload?: () => void;
};

export default function TvLeaderboardPanel({ entries, selfTeamId, onReload }: Props) {
  return (
    <section className="glass-card overflow-hidden border-t-2 border-t-tv-primary/50">
      <div className="shrink-0 px-3 py-2 border-b border-border-subtle flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Rocket className="w-4 h-4 text-tv-primary" />
          排行榜
        </h2>
        {onReload && (
          <button type="button" onClick={onReload} className="text-xs text-tv-primary hover:underline">
            刷新
          </button>
        )}
      </div>
      <div className="p-3">
        {entries.length ? (
          <ul className="space-y-1 text-xs">
            {entries.map((e, i) => (
              <li
                key={e.team_id}
                className={`flex justify-between py-1.5 px-2 rounded-lg ${
                  e.team_id === selfTeamId ? 'bg-tv-primary/10 text-tv-primary font-medium' : 'hover:bg-white/5'
                }`}
              >
                <span className="truncate pr-2 flex items-center gap-1.5">
                  {i === 0 && <Trophy className="w-3 h-3 text-tv-pathfinder" />}
                  <span className="text-foreground-muted">#{i + 1}</span>
                  {e.team_name}
                </span>
                <span className="tabular-nums font-semibold">{e.weighted_total.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-foreground-muted text-center py-6">暂无数据</p>
        )}
      </div>
    </section>
  );
}

