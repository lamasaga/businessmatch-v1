import { Trophy } from 'lucide-react';
import type { TvLeaderboardEntry } from '../../types/techventure';

type Props = {
  entries: TvLeaderboardEntry[];
  selfTeamId?: number;
  onReload?: () => void;
};

export default function TvLeaderboardPanel({ entries, selfTeamId, onReload }: Props) {
  return (
    <section className="glass-card overflow-hidden">
      <div className="shrink-0 px-3 py-2 border-b border-border-subtle flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-warning" />
          排行榜
        </h2>
        {onReload && (
          <button type="button" onClick={onReload} className="text-xs text-primary hover:underline">
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
                className={`flex justify-between py-1 ${
                  e.team_id === selfTeamId ? 'text-primary font-medium' : ''
                }`}
              >
                <span className="truncate pr-2">
                  #{i + 1} {e.team_name}
                </span>
                <span className="tabular-nums">{e.weighted_total.toFixed(2)}</span>
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

