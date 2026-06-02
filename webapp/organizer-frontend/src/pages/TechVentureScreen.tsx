import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Trophy, Newspaper, Loader2, Zap, Clock } from 'lucide-react';

interface LeaderEntry {
  team_id: number;
  team_name: string;
  product_name: string;
  weighted_total: number;
  attention_total: number;
  last_rank: number | null;
  route: string;
}

interface ScreenData {
  match_status: string;
  title: string;
  last_round_no: number;
  current_round_no: number | null;
  leaderboard: LeaderEntry[];
  news: Array<{ headline: string; body: string; kind: string }>;
}

const ROUTE_LABELS: Record<string, string> = {
  TECH: '技术驱动', USER: '用户深耕', BRAND: '品牌传播', PATHFINDER: '破局奇兵',
};

export default function TechVentureScreen() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const [data, setData] = useState<ScreenData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchScreen = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/techventure/admin/events/${eventId}/screen`);
      setData(res.data.data);
    } catch { /* silent */ }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchScreen();
    const timer = setInterval(fetchScreen, 5000);
    return () => clearInterval(timer);
  }, [fetchScreen]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
      </div>
    );
  }

  const phaseText = data.current_round_no
    ? `第 ${data.current_round_no} 轮进行中`
    : data.match_status === 'finished'
      ? '比赛已结束 · 最终排名'
      : `第 ${data.last_round_no} 轮已结算`;

  const top3 = data.leaderboard.slice(0, 3);
  const rest = data.leaderboard.slice(3, 10);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HUD */}
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="min-w-[320px]">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              {data.title}
            </h1>
            <p className="text-gray-400 text-lg mt-2 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {phaseText}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 px-4 py-3">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Zap className="w-4 h-4" /> 当前状态
              </p>
              <p className="text-lg font-bold">{data.match_status}</p>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 px-4 py-3">
              <p className="text-xs text-gray-400">队伍数</p>
              <p className="text-lg font-bold">{data.leaderboard.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
          {/* Left: leaderboard */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-800 bg-gray-900/50 p-6">
              <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
                <Trophy className="w-6 h-6 text-yellow-400" /> Top 3
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {top3.map((entry, i) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div
                      key={entry.team_id}
                      className="rounded-2xl border border-yellow-700/25 bg-gradient-to-b from-gray-900 to-gray-950 p-5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-3xl">{medals[i]}</span>
                        <span className="text-xs px-2 py-1 rounded bg-gray-800">
                          {ROUTE_LABELS[entry.route] || entry.route}
                        </span>
                      </div>
                      <p className="mt-3 text-xl font-bold truncate">{entry.team_name}</p>
                      <p className="text-sm text-gray-400 truncate">{entry.product_name || '未命名'}</p>
                      <p className="mt-4 text-3xl font-bold text-yellow-400">{entry.weighted_total.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">累计分</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-800 bg-gray-900/50 p-6">
              <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
                <Trophy className="w-6 h-6 text-yellow-400" /> 排行榜（Top10）
              </h2>
              <div className="space-y-2">
                {rest.map((entry, idx) => {
                  const rank = idx + 4;
                  return (
                    <div
                      key={entry.team_id}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-gray-800/40 border border-gray-800"
                    >
                      <span className="text-2xl font-bold w-12 text-center text-gray-200">{rank}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg truncate">{entry.team_name}</p>
                        <p className="text-sm text-gray-400 truncate">{entry.product_name || '未命名'}</p>
                      </div>
                      <span className="text-sm px-2 py-1 rounded bg-gray-800">
                        {ROUTE_LABELS[entry.route] || entry.route}
                      </span>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-yellow-400 tabular-nums">{entry.weighted_total.toFixed(1)}</p>
                        <p className="text-xs text-gray-500">累计分</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: news */}
          <div className="rounded-3xl border border-gray-800 bg-gray-900/50 p-6 min-h-0 flex flex-col">
            <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
              <Newspaper className="w-6 h-6 text-blue-400" /> 赛场快讯
            </h2>
            <div className="space-y-3 overflow-auto">
              {data.news.length === 0 && (
                <p className="text-gray-500 text-center py-10">暂无快讯</p>
              )}
              {data.news.map((n, i) => (
                <div key={i} className="bg-gray-800/60 border border-gray-800 rounded-2xl p-4">
                  <p className="font-semibold text-lg">{n.headline}</p>
                  <p className="text-sm text-gray-300 mt-1 leading-relaxed">{n.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
