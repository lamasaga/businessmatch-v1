import { Trophy, Medal } from 'lucide-react';
import type { OpsRankingEntry } from '../../types/ops';

interface Props {
  ranking: OpsRankingEntry[];
  myTeamId?: number;
}

export default function RankingPanel({ ranking, myTeamId }: Props) {
  if (!ranking.length) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-background-secondary p-6 text-center text-foreground-muted">
        暂无排名数据
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ops-primary/20 bg-background-secondary/60 p-6 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ops-primary/15 border border-ops-primary/30 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-ops-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">最终排名</h2>
          <p className="text-xs text-foreground-muted">按净资产、累计利润与综合得分排序</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-foreground-muted border-b border-border-subtle">
              <th className="py-2 pl-2">排名</th>
              <th className="py-2">队伍</th>
              <th className="py-2 text-right">净资产</th>
              <th className="py-2 text-right">累计净利润</th>
              <th className="py-2 text-right">总得分</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((entry) => (
              <tr
                key={entry.team_id}
                className={`border-b border-border-subtle last:border-0 transition-colors ${
                  entry.team_id === myTeamId ? 'bg-ops-primary/10' : 'hover:bg-white/5'
                }`}
              >
                <td className="py-2 pl-2">
                  <div className="flex items-center gap-1.5">
                    {entry.rank <= 3 && <Medal className={`w-4 h-4 ${entry.rank === 1 ? 'text-ops-auction' : entry.rank === 2 ? 'text-foreground-secondary' : 'text-amber-600'}`} />}
                    <span className="font-bold">{entry.rank}</span>
                  </div>
                </td>
                <td className={`py-2 ${entry.team_id === myTeamId ? 'font-semibold text-ops-primary' : ''}`}>{entry.team_name}</td>
                <td className="py-2 text-right tabular-nums">¥{entry.net_assets.toLocaleString()}</td>
                <td className={`py-2 text-right tabular-nums ${entry.cumulative_profit >= 0 ? 'text-success' : 'text-danger'}`}>
                  ¥{entry.cumulative_profit.toLocaleString()}
                </td>
                <td className="py-2 text-right tabular-nums font-bold text-ops-primary">{entry.score.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
