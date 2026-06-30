import { Trophy, Rocket, Medal } from 'lucide-react';
import type { TvLeaderboardEntry } from '../../types/techventure';

type Props = {
  entries: TvLeaderboardEntry[];
  selfTeamId?: number;
  onReload?: () => void;
};

export default function TvLeaderboardPanel({ entries, selfTeamId, onReload }: Props) {
  const myEntry = selfTeamId ? entries.find((e) => e.team_id === selfTeamId) : undefined;

  return (
    <section className="glass-card overflow-hidden border-t-2 border-t-tv-primary/50 flex flex-col min-h-0">
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

      {myEntry && (
        <div className="mx-3 mt-3 rounded-xl border border-tv-primary/30 bg-tv-primary/10 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Medal className="w-5 h-5 text-tv-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-foreground-muted">我的排名</p>
              <p className="font-bold text-tv-primary truncate">#{myEntry.rank ?? '—'} · {myEntry.team_name}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-foreground-muted">加权总分</p>
            <p className="font-bold tabular-nums text-tv-primary">{myEntry.weighted_total.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto p-3">
        {entries.length ? (
          <ul className="space-y-1 text-xs">
            {entries.map((e, i) => {
              const rank = e.rank ?? i + 1;
              const isSelf = e.team_id === selfTeamId;
              return (
                <li
                  key={e.team_id}
                  className={`flex justify-between py-1.5 px-2 rounded-lg ${
                    isSelf ? 'bg-tv-primary/10 text-tv-primary font-medium' : 'hover:bg-white/5'
                  }`}
                >
                  <span className="truncate pr-2 flex items-center gap-1.5 min-w-0">
                    {rank === 1 && <Trophy className="w-3 h-3 text-tv-pathfinder shrink-0" />}
                    <span className="text-foreground-muted shrink-0">#{rank}</span>
                    <span className="truncate">{e.team_name}</span>
                  </span>
                  <span className="tabular-nums font-semibold shrink-0">{e.weighted_total.toFixed(2)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-foreground-muted text-center py-6">暂无数据</p>
        )}
      </div>
    </section>
  );
}
