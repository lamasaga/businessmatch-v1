import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Scale, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

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

export default function TechVentureJudge() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const [state, setState] = useState<JudgeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

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

  if (loading || !state) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale className="w-6 h-6" /> 评委视角
        </h1>
        <p className="text-gray-400 text-sm">{state.title} · {state.match_status}</p>
      </div>

      {state.rounds.filter(r => r.status === 'settled').map(round => (
        <div key={round.round_no} className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h2 className="font-bold text-lg">第 {round.round_no} 轮结算</h2>
          {round.snapshots.length === 0 && (
            <p className="text-gray-500 text-sm">无快照数据</p>
          )}
          {round.snapshots
            .sort((a, b) => (a.data?.rank || 99) - (b.data?.rank || 99))
            .map(snap => {
              const key = `${round.round_no}-${snap.team_id}`;
              const isExpanded = expandedTeam === key;
              const d = snap.data || {};
              return (
                <div key={snap.team_id} className="border border-gray-700 rounded-lg">
                  <button
                    onClick={() => setExpandedTeam(isExpanded ? null : key)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-yellow-400 font-bold">#{d.rank || '?'}</span>
                      <span className="font-medium">{snap.team_name}</span>
                      <span className="text-gray-400 text-sm">{d.product_name || ''}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>路线: {d.route}</span>
                      <span>BQI: {(d.bqi || 1).toFixed(2)}</span>
                      <span>声量: {(d.eff_attention || 0).toFixed(1)}</span>
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="p-3 border-t border-gray-700 text-sm space-y-2">
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <p className="text-xs text-gray-400">Tech</p>
                          <p className="font-mono">{(d.tech || 0).toFixed(2)} (+{(d.delta_tech || 0).toFixed(2)})</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">原始声量</p>
                          <p className="font-mono">{(d.raw_attention || 0).toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">动量</p>
                          <p className="font-mono">{(d.momentum || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">热搜</p>
                          <p className="font-mono">{d.hotpulse_label || '无'}</p>
                        </div>
                      </div>
                      {d.bqi_contribs?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">BQI 因素</p>
                          {d.bqi_contribs.map((c: any, i: number) => (
                            <p key={i} className="text-xs">
                              <span className={c.delta >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {c.delta >= 0 ? '+' : ''}{c.delta.toFixed(2)}
                              </span>
                              {' '}{c.note}
                            </p>
                          ))}
                        </div>
                      )}
                      <details className="text-xs">
                        <summary className="text-gray-400 cursor-pointer">完整 JSON</summary>
                        <pre className="mt-1 bg-gray-900 p-2 rounded overflow-auto max-h-60 text-gray-300">
                          {JSON.stringify(d, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ))}

      {state.rounds.filter(r => r.status === 'settled').length === 0 && (
        <p className="text-center text-gray-500 py-12">暂无已结算轮次</p>
      )}
    </div>
  );
}
