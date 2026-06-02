import { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Scale, Loader2, Users, GitCompare, RefreshCw } from 'lucide-react';

interface JudgeState {
  match_status: string;
  title: string;
  teams: Array<{ id: number; team_name: string }>;
  rounds: Array<{
    round_no: number;
    status: string;
    snapshots: Array<{
      team_id: number;
      team_name: string;
      data: Record<string, any>;
    }>;
  }>;
}

type RoundView = {
  round_no: number;
  status: string;
  snapshots: Array<{
    team_id: number;
    team_name: string;
    data: Record<string, any>;
  }>;
};

export default function TechVentureJudge() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const [state, setState] = useState<JudgeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoundNo, setSelectedRoundNo] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [compareTeamIds, setCompareTeamIds] = useState<number[]>([]);

  const fetchState = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/techventure/admin/judge/events/${eventId}/state`);
      setState(res.data.data);
    } catch { /* silent */ }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchState();
    const timer = setInterval(fetchState, 8000);
    return () => clearInterval(timer);
  }, [fetchState]);

  const settledRounds = useMemo(
    () => (state?.rounds || []).filter((r) => r.status === 'settled') as RoundView[],
    [state?.rounds],
  );

  useEffect(() => {
    if (!settledRounds.length) return;
    const newest = settledRounds[settledRounds.length - 1];
    setSelectedRoundNo((prev) => prev ?? newest.round_no);
  }, [settledRounds]);

  const activeRound = useMemo(() => {
    if (!selectedRoundNo) return null;
    return settledRounds.find((r) => r.round_no === selectedRoundNo) || null;
  }, [settledRounds, selectedRoundNo]);

  const roundSnapshots = useMemo(() => {
    const snaps = activeRound?.snapshots || [];
    return [...snaps].sort((a, b) => (a.data?.rank || 99) - (b.data?.rank || 99));
  }, [activeRound]);

  useEffect(() => {
    if (!roundSnapshots.length) return;
    setSelectedTeamId((prev) => prev ?? roundSnapshots[0].team_id);
  }, [roundSnapshots]);

  const selectedSnap = useMemo(() => {
    if (!selectedTeamId) return null;
    return roundSnapshots.find((s) => s.team_id === selectedTeamId) || null;
  }, [roundSnapshots, selectedTeamId]);

  const compareSnaps = useMemo(
    () => compareTeamIds.map((id) => roundSnapshots.find((s) => s.team_id === id)).filter(Boolean) as typeof roundSnapshots,
    [compareTeamIds, roundSnapshots],
  );

  if (loading || !state) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const d = (selectedSnap?.data || {}) as Record<string, any>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="sticky top-2 z-20 bg-gray-950/70 backdrop-blur rounded-2xl border border-gray-800 px-4 py-3 mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Scale className="w-5 h-5" /> 评委视角
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">{state.title} · {state.match_status}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedRoundNo ?? ''}
              onChange={(e) => setSelectedRoundNo(Number(e.target.value))}
              className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm"
            >
              {settledRounds.map((r) => (
                <option key={r.round_no} value={r.round_no}>第 {r.round_no} 轮（已结算）</option>
              ))}
            </select>
            <button
              type="button"
              onClick={fetchState}
              className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 hover:border-blue-500/40 text-sm flex items-center gap-2"
              title="刷新"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
          </div>
        </div>
      </div>

      {!settledRounds.length && (
        <p className="text-center text-gray-500 py-12">暂无已结算轮次</p>
      )}

      {settledRounds.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr_360px] gap-4 min-h-0">
          {/* Left list */}
          <section className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden min-h-0 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" /> 队伍列表
              </h2>
              <span className="text-xs text-gray-400">{roundSnapshots.length} 支</span>
            </div>
            <div className="p-2 overflow-auto">
              {roundSnapshots.map((s) => {
                const sd = s.data || {};
                const active = s.team_id === selectedTeamId;
                const inCompare = compareTeamIds.includes(s.team_id);
                return (
                  <button
                    key={s.team_id}
                    type="button"
                    onClick={() => setSelectedTeamId(s.team_id)}
                    className={`w-full text-left rounded-xl px-3 py-2 border mb-2 ${
                      active ? 'border-blue-500/60 bg-blue-500/10' : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          <span className="text-yellow-400 mr-2">#{sd.rank ?? '?'}</span>
                          {s.team_name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{sd.product_name || ''}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCompareTeamIds((prev) => {
                            if (prev.includes(s.team_id)) return prev.filter((x) => x !== s.team_id);
                            return prev.length >= 3 ? prev : [...prev, s.team_id];
                          });
                        }}
                        className={`shrink-0 text-xs px-2 py-1 rounded-lg border ${
                          inCompare ? 'border-purple-500/60 bg-purple-500/15 text-purple-200' : 'border-gray-700 text-gray-300'
                        }`}
                        title="加入对比（最多3队）"
                      >
                        对比
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-300">
                      <div className="rounded-lg bg-gray-950/40 px-2 py-1">BQI {(sd.bqi || 1).toFixed(2)}</div>
                      <div className="rounded-lg bg-gray-950/40 px-2 py-1">声量 {(sd.eff_attention || 0).toFixed(1)}</div>
                      <div className="rounded-lg bg-gray-950/40 px-2 py-1">路线 {sd.route || '—'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Center detail */}
          <section className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden min-h-0 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold">队伍详情</h2>
              <span className="text-xs text-gray-400">{selectedSnap?.team_name || ''}</span>
            </div>
            <div className="p-4 space-y-4 overflow-auto">
              <div className="grid grid-cols-4 gap-3">
                <MiniKpi label="排名" value={`#${d.rank ?? '—'}`} accent="text-yellow-400" />
                <MiniKpi label="BQI" value={(d.bqi || 1).toFixed(2)} accent="text-purple-300" />
                <MiniKpi label="声量" value={(d.eff_attention || 0).toFixed(1)} accent="text-green-300" />
                <MiniKpi label="路线" value={d.route || '—'} accent="text-blue-300" />
              </div>

              <div className="grid grid-cols-4 gap-3 text-sm">
                <MiniKpi label="Tech" value={`${(d.tech || 0).toFixed(2)} (+${(d.delta_tech || 0).toFixed(2)})`} />
                <MiniKpi label="原始声量" value={(d.raw_attention || 0).toFixed(1)} />
                <MiniKpi label="动量" value={(d.momentum || 0).toFixed(2)} />
                <MiniKpi label="热搜" value={d.hotpulse_label || '无'} />
              </div>

              {d.bqi_contribs?.length > 0 && (
                <div className="rounded-xl border border-gray-800 bg-gray-950/30 p-3">
                  <p className="text-xs text-gray-400 mb-2">BQI 因素</p>
                  <div className="space-y-1 text-xs">
                    {d.bqi_contribs.map((c: any, i: number) => (
                      <div key={i} className="flex gap-2">
                        <span className={c.delta >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {c.delta >= 0 ? '+' : ''}{Number(c.delta || 0).toFixed(2)}
                        </span>
                        <span className="text-gray-300">{c.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <details className="text-xs rounded-xl border border-gray-800 bg-gray-950/30 p-3">
                <summary className="text-gray-400 cursor-pointer">完整 JSON（debug）</summary>
                <pre className="mt-2 bg-gray-950 p-2 rounded overflow-auto max-h-80 text-gray-300">
                  {JSON.stringify(d, null, 2)}
                </pre>
              </details>
            </div>
          </section>

          {/* Right compare */}
          <section className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden min-h-0 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <GitCompare className="w-4 h-4" /> 对比
              </h2>
              <button
                type="button"
                onClick={() => setCompareTeamIds([])}
                className="text-xs text-gray-300 hover:text-white"
              >
                清空
              </button>
            </div>
            <div className="p-3 space-y-2 overflow-auto">
              {compareSnaps.length === 0 && (
                <p className="text-xs text-gray-500 py-6 text-center">从左侧列表选择 1～3 支队伍加入对比</p>
              )}
              {compareSnaps.map((s) => {
                const sd = s.data || {};
                return (
                  <div key={s.team_id} className="rounded-xl border border-gray-800 bg-gray-950/30 p-3">
                    <p className="font-semibold truncate">
                      <span className="text-yellow-400 mr-2">#{sd.rank ?? '?'}</span>
                      {s.team_name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{sd.product_name || ''}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-gray-950/40 px-2 py-1">BQI {(sd.bqi || 1).toFixed(2)}</div>
                      <div className="rounded-lg bg-gray-950/40 px-2 py-1">声量 {(sd.eff_attention || 0).toFixed(1)}</div>
                      <div className="rounded-lg bg-gray-950/40 px-2 py-1">Tech {(sd.tech || 0).toFixed(2)}</div>
                      <div className="rounded-lg bg-gray-950/40 px-2 py-1">路线 {sd.route || '—'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function MiniKpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/30 p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-1 font-mono text-sm ${accent || ''}`}>{value}</p>
    </div>
  );
}
