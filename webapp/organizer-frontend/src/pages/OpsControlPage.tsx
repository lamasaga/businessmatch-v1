import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  Factory, Play, Loader2, AlertCircle, Copy, Check,
  Users, TrendingUp, Pause, ArrowRight, Calculator,
} from 'lucide-react';

interface OpsTeam {
  id: number;
  team_name: string;
  product_name?: string;
  category?: string;
  target_segment?: string;
  member_count: number;
  cash: number;
  net_assets: number;
  is_ai: boolean;
}

interface OpsRound {
  id: number;
  round_number: number;
  status: string;
}

interface OpsControlState {
  match_id: number;
  match_status: string;
  phase: string;
  title: string;
  room_code?: string;
  max_players?: number;
  participant_count?: number;
  teams: OpsTeam[];
  rounds: OpsRound[];
  current_round: OpsRound | null;
  ranking: {
    team_id: number;
    team_name: string;
    net_assets: number;
    cumulative_profit: number;
    score: number;
    rank: number;
  }[];
}

const PHASE_LABEL: Record<string, string> = {
  registration: '报名中',
  positioning: '产品定位',
  auction_a: '拍卖A · 基础资源',
  operation_round_1: '运营第1轮',
  operation_round_2: '运营第2轮',
  operation_round_3: '运营第3轮',
  auction_b: '拍卖B · 战略资源',
  operation_round_4: '运营第4轮',
  operation_round_5: '运营第5轮',
  operation_round_6: '运营第6轮',
  auction: '资源竞价',
  finished: '已结束',
  paused: '已暂停',
};

export default function OpsControlPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = Number(id);

  const [state, setState] = useState<OpsControlState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/ops/events/${eventId}/screen`);
      setState(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || '获取状态失败');
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchState();
    const timer = setInterval(fetchState, 4000);
    return () => clearInterval(timer);
  }, [fetchState]);

  const copyCode = async () => {
    if (!state?.room_code) return;
    await navigator.clipboard.writeText(state.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    if (!window.confirm('确定开始比赛？将初始化所有队伍状态并进入产品定位阶段。')) return;
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/api/v1/ops/events/${eventId}/start`);
      await fetchState();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || '开始失败');
    }
    setActionLoading(false);
  };

  const handleAdvance = async () => {
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/api/v1/ops/events/${eventId}/advance`);
      await fetchState();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || '推进失败');
    }
    setActionLoading(false);
  };

  const handlePause = async () => {
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/api/v1/ops/events/${eventId}/pause`);
      await fetchState();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || '暂停失败');
    }
    setActionLoading(false);
  };

  const handleResume = async () => {
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/api/v1/ops/events/${eventId}/resume`);
      await fetchState();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || '恢复失败');
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!state) return <p className="text-center text-gray-400 py-20">无法加载场次数据</p>;

  const teams = state.teams ?? [];
  const rounds = state.rounds ?? [];
  const ranking = state.ranking ?? [];

  const isWaiting = state.match_status === 'registration' || state.match_status === 'draft';
  const isPlaying = state.match_status === 'playing';
  const isFinished = state.phase === 'finished';
  const isPaused = state.phase === 'paused';
  const canStart = isWaiting && (state.participant_count ?? 0) >= 1;

  return (
    <div className="min-h-[calc(100vh-56px)] p-4 space-y-4">
      {/* Sticky action bar */}
      <div className="sticky top-2 z-20 bg-gray-950/70 backdrop-blur rounded-2xl border border-gray-800 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-[240px]">
            <h1 className="text-xl font-bold">生产经营销售赛 · 控场</h1>
            <p className="text-gray-400 text-xs mt-0.5">
              {state.title} · 场次 #{state.match_id} · {PHASE_LABEL[state.phase] || state.phase}
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm">
            {isWaiting && state.room_code && (
              <button
                type="button"
                onClick={copyCode}
                className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 flex items-center gap-3 hover:border-blue-500/50"
              >
                <span className="text-[10px] text-gray-400">房间码</span>
                <span className="text-2xl font-mono font-bold text-blue-400 tracking-widest">
                  {state.room_code}
                </span>
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>
            )}

            <div className="flex items-center gap-2">
              {canStart && (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  开始比赛
                </button>
              )}

              {isPlaying && !isFinished && !isPaused && (
                <>
                  <button
                    type="button"
                    onClick={handleAdvance}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    推进阶段
                  </button>
                  <button
                    type="button"
                    onClick={handlePause}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
                  >
                    <Pause className="w-4 h-4" />
                    暂停
                  </button>
                </>
              )}

              {isPaused && (
                <button
                  type="button"
                  onClick={handleResume}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
                >
                  <Play className="w-4 h-4" />
                  恢复比赛
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 flex items-center gap-2 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <MiniStat label="已加入选手" value={state.participant_count ?? 0} />
        <MiniStat label="队伍数" value={teams.length} />
        <MiniStat label="当前阶段" value={PHASE_LABEL[state.phase] || state.phase} />
        <MiniStat label="上限人数" value={state.max_players ?? '—'} />
      </div>

      {/* Teams */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <h2 className="font-medium flex items-center gap-2">
          <Users className="w-5 h-5" /> 队伍一览
        </h2>
        {teams.length === 0 ? (
          <p className="text-sm text-gray-400">暂无队伍 — 学生输入房间码加入后将自动分配。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="py-2 px-3 text-left">队名</th>
                  <th className="py-2 px-3 text-left">产品</th>
                  <th className="py-2 px-3 text-left">品类/客群</th>
                  <th className="py-2 px-3 text-center">人数</th>
                  <th className="py-2 px-3 text-right">现金</th>
                  <th className="py-2 px-3 text-right">净资产</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.id} className="border-b border-gray-700/50">
                    <td className="py-2 px-3 font-medium">
                      {t.team_name}
                      {t.is_ai && <span className="ml-1 text-xs text-yellow-500">(AI)</span>}
                    </td>
                    <td className="py-2 px-3 text-gray-400">{t.product_name || '—'}</td>
                    <td className="py-2 px-3 text-gray-400">
                      {t.category && t.target_segment
                        ? `${t.category} · ${t.target_segment}`
                        : '—'}
                    </td>
                    <td className="py-2 px-3 text-center">{t.member_count}</td>
                    <td className="py-2 px-3 text-right font-mono">¥{Math.round(t.cash).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono">¥{Math.round(t.net_assets).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ranking */}
      {(isPlaying || isFinished) && ranking.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
          <h2 className="font-medium flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> 实时排行榜
          </h2>
          <div className="space-y-2">
            {ranking.map((row) => (
              <div
                key={row.team_id}
                className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg"
              >
                <span className={`w-8 text-center font-bold ${row.rank === 1 ? 'text-blue-400' : 'text-gray-400'}`}>
                  {row.rank}
                </span>
                <span className="flex-1 font-medium">{row.team_name}</span>
                <span className="text-sm text-gray-400">利润 ¥{Math.round(row.cumulative_profit).toLocaleString()}</span>
                <span className="font-mono text-sm font-bold">¥{Math.round(row.net_assets).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rounds */}
      {isPlaying && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
          <h2 className="font-medium flex items-center gap-2">
            <Calculator className="w-5 h-5" /> 轮次状态
          </h2>
          <div className="flex flex-wrap gap-2">
            {rounds.map((r) => (
              <span
                key={r.id}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  r.status === 'settled'
                    ? 'bg-green-900/50 text-green-400'
                    : r.status === 'open'
                    ? 'bg-blue-900/50 text-blue-400'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                R{r.round_number}: {r.status === 'settled' ? '已结算' : r.status === 'open' ? '进行中' : '待定'}
              </span>
            ))}
          </div>
        </div>
      )}

      {isFinished && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-6 text-center">
          <TrendingUp className="w-10 h-10 text-green-400 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-green-400">比赛已结束</h2>
          <p className="text-gray-400 mt-1">所有轮次已完成，排名已锁定。</p>
        </div>
      )}

      {isWaiting && (
        <p className="text-xs text-gray-400 mt-6 text-center">
          请让学生打开{' '}
          <a
            href={import.meta.env.VITE_STUDENT_URL || 'http://localhost:5173/games'}
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 underline"
          >
            学生端商赛大厅
          </a>{' '}
          输入房间码 {state.room_code} 加入
        </p>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
