import { Trophy } from 'lucide-react';
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
    <div className="rounded-2xl border border-border-subtle bg-background-secondary p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-warning" />
        <h2 className="text-lg font-bold">最终排名</h2>
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
                className={`border-b border-border-subtle last:border-0 ${
                  entry.team_id === myTeamId ? 'bg-primary/10' : ''
                }`}
              >
                <td className="py-2 pl-2 font-bold">{entry.rank}</td>
                <td className="py-2">{entry.team_name}</td>
                <td className="py-2 text-right tabular-nums">¥{entry.net_assets.toLocaleString()}</td>
                <td className={`py-2 text-right tabular-nums ${entry.cumulative_profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ¥{entry.cumulative_profit.toLocaleString()}
                </td>
                <td className="py-2 text-right tabular-nums font-semibold">{entry.score.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
