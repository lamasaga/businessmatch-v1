import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import {
  Users, Play, Calculator, Clock, Plus,
  CheckCircle, Loader2, AlertCircle,
} from 'lucide-react';

interface Team {
  id: number;
  team_name: string;
  is_ai: number;
  product_name: string;
  member_count: number;
  route?: string;
  budget?: number;
  tech?: number;
  weighted_total?: number;
  last_rank?: number | null;
}

interface Round {
  id: number;
  round_no: number;
  status: string;
  event_id_r3: string;
  opened_at: string | null;
  settled_at: string | null;
}

interface AdminState {
  match_id: number;
  match_status: string;
  title: string;
  teams: Team[];
  rounds: Round[];
  current_round: {
    id: number;
    round_no: number;
    submitted_teams: number[];
    total_teams: number;
  } | null;
}

const EVENTS = [
  { id: 'none', label: '无事件' },
  { id: 'pragmaticWave', label: '用户口味大变' },
  { id: 'geekWave', label: '技术突破浪潮' },
  { id: 'trendyWave', label: '社交媒体爆发' },
  { id: 'investorBoom', label: '投资狂潮' },
  { id: 'compliance', label: '政策合规' },
  { id: 'influencerBoom', label: '网红崛起' },
];

export default function TechVentureControl() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const [state, setState] = useState<AdminState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTeamNames, setNewTeamNames] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('none');

  const fetchState = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/techventure/admin/events/${eventId}/state`);
      setState(res.data.data);
    } catch (err: any) {
      setError(err.message || '获取状态失败');
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchState();
    const timer = setInterval(fetchState, 6000);
    return () => clearInterval(timer);
  }, [fetchState]);

  const handleCreateTeams = async () => {
    const names = newTeamNames.split('\n').map(s => s.trim()).filter(Boolean);
    if (names.length === 0) return;
    setActionLoading(true);
    try {
      await api.post(`/api/v1/techventure/admin/events/${eventId}/teams`, { team_names: names });
      setNewTeamNames('');
      await fetchState();
    } catch (err: any) {
      setError(err.message || '创建队伍失败');
    }
    setActionLoading(false);
  };

  const handleOpenRound = async () => {
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/api/v1/techventure/admin/events/${eventId}/rounds/open`, {
        event_id_r3: selectedEvent,
      });
      await fetchState();
    } catch (err: any) {
      setError(err.message || '开放轮次失败');
    }
    setActionLoading(false);
  };

  const handleSettle = async () => {
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/api/v1/techventure/admin/events/${eventId}/rounds/settle`, {
        event_id_r3: selectedEvent,
      });
      await fetchState();
    } catch (err: any) {
      setError(err.message || '结算失败');
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

  const submittedSet = new Set(state.current_round?.submitted_teams || []);
  const isFinished = state.match_status === 'finished';

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">TechVenture 控场</h1>
          <p className="text-gray-400 text-sm">
            {state.title} · 场次 #{state.match_id} · {state.match_status}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{state.teams.length} 支队伍</p>
          {state.current_round && (
            <p className="text-sm text-green-400">
              第{state.current_round.round_no}轮进行中 ·
              {submittedSet.size}/{state.current_round.total_teams} 已提交
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 flex items-center gap-2 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Team Management */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <h2 className="font-medium flex items-center gap-2"><Users className="w-5 h-5" />队伍管理</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="py-2 px-3 text-left">ID</th>
                <th className="py-2 px-3 text-left">队名</th>
                <th className="py-2 px-3 text-left">产品</th>
                <th className="py-2 px-3 text-center">人数</th>
                <th className="py-2 px-3 text-center">路线</th>
                <th className="py-2 px-3 text-right">预算</th>
                <th className="py-2 px-3 text-center">本轮</th>
              </tr>
            </thead>
            <tbody>
              {state.teams.map(t => (
                <tr key={t.id} className="border-b border-gray-700/50">
                  <td className="py-2 px-3">{t.id}</td>
                  <td className="py-2 px-3 font-medium">
                    {t.team_name}
                    {t.is_ai === 1 && <span className="ml-1 text-xs text-yellow-500">(AI)</span>}
                  </td>
                  <td className="py-2 px-3 text-gray-400">{t.product_name || '—'}</td>
                  <td className="py-2 px-3 text-center">{t.member_count}</td>
                  <td className="py-2 px-3 text-center">{t.route || '—'}</td>
                  <td className="py-2 px-3 text-right font-mono">{t.budget?.toFixed(1) || '—'}</td>
                  <td className="py-2 px-3 text-center">
                    {state.current_round
                      ? submittedSet.has(t.id)
                        ? <CheckCircle className="w-4 h-4 text-green-400 inline" />
                        : <Clock className="w-4 h-4 text-gray-500 inline" />
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isFinished && (
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">批量创建队伍（每行一个队名）</label>
              <textarea
                value={newTeamNames}
                onChange={e => setNewTeamNames(e.target.value)}
                rows={3}
                className="w-full bg-gray-900 rounded px-3 py-2 text-sm"
                placeholder="队伍A&#10;队伍B&#10;队伍C"
              />
            </div>
            <button
              onClick={handleCreateTeams}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm
                flex items-center gap-1 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> 创建
            </button>
          </div>
        )}
      </div>

      {/* Round Control */}
      {!isFinished && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
          <h2 className="font-medium">轮次控制</h2>

          <div className="flex flex-wrap gap-2">
            {state.rounds.map(r => (
              <span key={r.id} className={`px-3 py-1 rounded text-xs font-medium ${
                r.status === 'settled' ? 'bg-green-900/50 text-green-400'
                : r.status === 'open' ? 'bg-blue-900/50 text-blue-400'
                : 'bg-gray-700 text-gray-400'
              }`}>
                R{r.round_no}: {r.status === 'settled' ? '已结算' : r.status === 'open' ? '进行中' : '待定'}
              </span>
            ))}
          </div>

          <div className="flex items-end gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">R3 事件（仅第3轮生效）</label>
              <select
                value={selectedEvent}
                onChange={e => setSelectedEvent(e.target.value)}
                className="bg-gray-900 rounded px-3 py-2 text-sm"
              >
                {EVENTS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>

            {!state.current_round ? (
              <button
                onClick={handleOpenRound}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm
                  flex items-center gap-1 disabled:opacity-50"
              >
                <Play className="w-4 h-4" /> 开放下一轮
              </button>
            ) : (
              <button
                onClick={handleSettle}
                disabled={actionLoading}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm
                  flex items-center gap-1 disabled:opacity-50"
              >
                <Calculator className="w-4 h-4" /> 结算当前轮
              </button>
            )}
          </div>
        </div>
      )}

      {isFinished && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-6 text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-green-400">比赛已结束</h2>
          <p className="text-gray-400 mt-1">所有轮次已完成，排名已锁定。</p>
        </div>
      )}
    </div>
  );
}
