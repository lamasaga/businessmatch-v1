import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Trophy, Newspaper, Loader2 } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            {data.title}
          </h1>
          <p className="text-gray-400 text-lg mt-2">
            {data.current_round_no
              ? `第 ${data.current_round_no} 轮进行中`
              : data.match_status === 'finished'
                ? '比赛已结束 · 最终排名'
                : `第 ${data.last_round_no} 轮已结算`
            }
          </p>
        </div>

        {/* Leaderboard */}
        <div className="bg-gray-900/80 backdrop-blur rounded-2xl p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <Trophy className="w-6 h-6 text-yellow-400" /> 排行榜
          </h2>
          <div className="space-y-2">
            {data.leaderboard.map((entry, i) => {
              const isTop3 = i < 3;
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div key={entry.team_id}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    isTop3 ? 'bg-gradient-to-r from-gray-800 to-gray-900 border border-yellow-700/30' : 'bg-gray-800/50'
                  }`}
                >
                  <span className="text-2xl font-bold w-12 text-center">
                    {isTop3 ? medals[i] : i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-lg">{entry.team_name}</p>
                    <p className="text-sm text-gray-400">{entry.product_name || '未命名'}</p>
                  </div>
                  <span className="text-sm px-2 py-1 rounded bg-gray-700">
                    {ROUTE_LABELS[entry.route] || entry.route}
                  </span>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-yellow-400">{entry.weighted_total.toFixed(1)}</p>
                    <p className="text-xs text-gray-500">累计分</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* News ticker */}
        {data.news.length > 0 && (
          <div className="bg-gray-900/80 backdrop-blur rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
              <Newspaper className="w-6 h-6 text-blue-400" /> 赛场快讯
            </h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data.news.map((n, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-3">
                  <p className="font-medium">{n.headline}</p>
                  <p className="text-sm text-gray-400 mt-1">{n.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
