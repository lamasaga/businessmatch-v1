import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import {
  Users, Play, Calculator, Clock, Plus,
  CheckCircle, Loader2, AlertCircle, Copy, Check, UserCheck,
} from 'lucide-react';

interface Participant {
  user_id: number;
  username: string;
  team_id: number | null;
  team_name: string | null;
}

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
  room_code?: string;
  max_players?: number;
  participant_count?: number;
  unassigned_count?: number;
  participants?: Participant[];
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

function isWaitingStatus(status: string) {
  return status === 'registration' || status === 'draft';
}

export default function TechVentureControl() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const [state, setState] = useState<AdminState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTeamNames, setNewTeamNames] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('none');
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<Record<number, { team_name: string; product_name: string }>>({});

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
    const timer = setInterval(fetchState, 4000);
    return () => clearInterval(timer);
  }, [fetchState]);

  const copyCode = async () => {
    if (!state?.room_code) return;
    await navigator.clipboard.writeText(state.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateTeams = async () => {
    const names = newTeamNames.split('\n').map(s => s.trim()).filter(Boolean);
    if (names.length === 0) return;
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/api/v1/techventure/admin/events/${eventId}/teams`, { team_names: names });
      setNewTeamNames('');
      await fetchState();
    } catch (err: any) {
      setError(err.message || '创建队伍失败');
    }
    setActionLoading(false);
  };

  const handleUpdateTeam = async (teamId: number) => {
    const draft = editing[teamId];
    if (!draft) return;
    setActionLoading(true);
    setError('');
    try {
      await api.patch(`/api/v1/techventure/admin/events/${eventId}/teams/${teamId}`, {
        team_name: draft.team_name.trim() || undefined,
        product_name: draft.product_name.trim() || undefined,
      });
      const next = { ...editing };
      delete next[teamId];
      setEditing(next);
      await fetchState();
    } catch (err: any) {
      setError(err.message || '更新队伍失败');
    }
    setActionLoading(false);
  };

  const handleStartMatch = async () => {
    if (!window.confirm('确定结束报名并开始比赛？所有选手须已选队。')) return;
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/api/v1/techventure/admin/events/${eventId}/start`);
      await fetchState();
    } catch (err: any) {
      setError(err.message || '开始比赛失败');
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

  const waiting = isWaitingStatus(state.match_status);
  const submittedSet = new Set(state.current_round?.submitted_teams || []);
  const isFinished = state.match_status === 'finished';
  const participants = state.participants || [];
  const unassigned = state.unassigned_count ?? 0;
  const canStart =
    waiting &&
    (state.participant_count ?? 0) >= 1 &&
    state.teams.filter(t => t.is_ai === 0).length >= 1 &&
    unassigned === 0;

  const getEdit = (t: Team) =>
    editing[t.id] ?? { team_name: t.team_name, product_name: t.product_name || '' };

  return (
    <div className="min-h-[calc(100vh-56px)] p-4 space-y-4">
      {/* Sticky action bar */}
      <div className="sticky top-2 z-20 bg-gray-950/70 backdrop-blur rounded-2xl border border-gray-800 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-[240px]">
            <h1 className="text-xl font-bold">创想大赢家 · 控场</h1>
            <p className="text-gray-400 text-xs mt-0.5">
              {state.title} · 场次 #{state.match_id} · {waiting ? '报名等待中' : state.match_status}
              {state.current_round ? ` · 第${state.current_round.round_no}轮` : ''}
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm">
            {waiting && state.room_code && (
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

            {!waiting && state.current_round && (
              <div className="text-right">
                <p className="text-xs text-gray-400">本轮提交</p>
                <p className="text-sm font-bold text-green-400">
                  {submittedSet.size}/{state.current_round.total_teams}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              {waiting && (
                <button
                  type="button"
                  onClick={handleStartMatch}
                  disabled={!canStart || actionLoading}
                  className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  开始比赛
                </button>
              )}

              {!waiting && !isFinished && (
                <>
                  <select
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm"
                  >
                    {EVENTS.map((e) => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                  {state.current_round?.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={handleOpenRound}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      开放下一轮
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSettle}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      <Calculator className="w-4 h-4" />
                      结算当前轮
                    </button>
                  )}
                </>
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

      {waiting && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <MiniStat label="已加入选手" value={state.participant_count ?? 0} />
            <MiniStat label="未选队" value={unassigned} highlight={unassigned > 0} />
            <MiniStat label="上限人数" value={state.max_players ?? '—'} />
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="font-medium flex items-center gap-2 mb-3">
              <UserCheck className="w-5 h-5" /> 已加入选手
            </h2>
            {participants.length === 0 ? (
              <p className="text-sm text-gray-400">暂无选手 — 请将 4 位房间码发给学生，学生在「商赛」页输入后加入。</p>
            ) : (
              <ul className="space-y-2">
                {participants.map(p => (
                  <li
                    key={p.user_id}
                    className="flex items-center justify-between text-sm py-2 px-3 rounded bg-gray-900/50"
                  >
                    <span>{p.username}</span>
                    {p.team_id ? (
                      <span className="text-green-400">已入队 · {p.team_name}</span>
                    ) : (
                      <span className="text-yellow-400">待选队</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4 space-y-4">
            <h2 className="font-medium flex items-center gap-2">
              <Users className="w-5 h-5" /> 队伍与组队（可编辑队名 / 产品名）
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="py-2 px-3 text-left">队名</th>
                    <th className="py-2 px-3 text-left">产品名</th>
                    <th className="py-2 px-3 text-center">人数</th>
                    <th className="py-2 px-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {state.teams.filter(t => t.is_ai === 0).map(t => {
                    const e = getEdit(t);
                    const dirty =
                      e.team_name !== t.team_name ||
                      e.product_name !== (t.product_name || '');
                    return (
                      <tr key={t.id} className="border-b border-gray-700/50">
                        <td className="py-2 px-3">
                          <input
                            value={e.team_name}
                            onChange={ev =>
                              setEditing(prev => ({
                                ...prev,
                                [t.id]: { ...e, team_name: ev.target.value },
                              }))
                            }
                            className="w-full bg-gray-900 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            value={e.product_name}
                            onChange={ev =>
                              setEditing(prev => ({
                                ...prev,
                                [t.id]: { ...e, product_name: ev.target.value },
                              }))
                            }
                            placeholder="产品名称"
                            className="w-full bg-gray-900 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">{t.member_count}</td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            disabled={!dirty || actionLoading}
                            onClick={() => handleUpdateTeam(t.id)}
                            className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40"
                          >
                            保存
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">批量创建队伍（每行一个队名）</label>
                <textarea
                  value={newTeamNames}
                  onChange={ev => setNewTeamNames(ev.target.value)}
                  rows={3}
                  className="w-full bg-gray-900 rounded px-3 py-2 text-sm"
                  placeholder="队伍A&#10;队伍B&#10;队伍C"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateTeams}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> 创建
              </button>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="font-medium mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5" /> 开赛条件检查
            </h2>
            <ul className="text-sm space-y-1 text-gray-400">
              <li className={(state.participant_count ?? 0) < 1 ? 'text-yellow-400' : 'text-green-400'}>
                {(state.participant_count ?? 0) < 1 ? '✗' : '✓'} 至少 1 名选手加入
              </li>
              <li className={unassigned > 0 ? 'text-yellow-400' : 'text-green-400'}>
                {unassigned > 0 ? '✗' : '✓'} 所有选手已选队（未选队：{unassigned}）
              </li>
              <li className={state.teams.filter(t => t.is_ai === 0).length < 1 ? 'text-yellow-400' : 'text-green-400'}>
                {state.teams.filter(t => t.is_ai === 0).length < 1 ? '✗' : '✓'} 至少 1 支真人队伍
              </li>
            </ul>
          </div>
        </>
      )}

      {!waiting && !isFinished && (
        <>
          <div className="bg-gray-800 rounded-lg p-4 space-y-4">
            <h2 className="font-medium flex items-center gap-2"><Users className="w-5 h-5" />队伍一览</h2>
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
          </div>

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
                  onChange={ev => setSelectedEvent(ev.target.value)}
                  className="bg-gray-900 rounded px-3 py-2 text-sm"
                >
                  {EVENTS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
              </div>
              {!state.current_round ? (
                <button
                  type="button"
                  onClick={handleOpenRound}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm flex items-center gap-1 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" /> 开放下一轮
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSettle}
                  disabled={actionLoading}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm flex items-center gap-1 disabled:opacity-50"
                >
                  <Calculator className="w-4 h-4" /> 结算当前轮
                </button>
              )}
            </div>
          </div>
        </>
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

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? 'text-yellow-400' : ''}`}>{value}</p>
    </div>
  );
}
