import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import type { OpsGameState } from '../../types/ops';
import PhaseStepper from '../../components/ops/PhaseStepper';
import {
  Factory, CheckCircle2, Loader2, Users, Clock, Building2,
} from 'lucide-react';

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

export default function OpsLobbyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = Number(id);

  const [state, setState] = useState<OpsGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLobby = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/ops/events/${eventId}/state`);
      setState(res.data.data as OpsGameState);
      setError('');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      setError(msg || (err instanceof Error ? err.message : '加载大厅失败'));
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchLobby();
  }, [fetchLobby]);

  useEffect(() => {
    if (!state) return;
    const interval = setInterval(fetchLobby, 4000);
    return () => clearInterval(interval);
  }, [state, fetchLobby]);

  useEffect(() => {
    if (state && state.match_status !== 'registration' && state.match_status !== 'draft' && state.team?.team_id) {
      navigate(`/games/${eventId}/ops`, { replace: true });
    }
  }, [state, eventId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-[#0a1628]">
        <Loader2 className="w-8 h-8 text-ops-primary animate-spin" />
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  if (!state) return null;

  const peers = state.teams_peers ?? [];
  const hasTeam = state.team?.team_id != null;
  const isWaiting = state.match_status === 'registration' || state.match_status === 'draft';

  return (
    <div className="min-h-screen bg-[#0a1628] text-foreground">
      <div className="max-w-3xl mx-auto p-4">
        <div className="text-center mb-8 pt-6">
          <div className="w-16 h-16 rounded-2xl bg-ops-primary/15 border border-ops-primary/30 flex items-center justify-center mx-auto mb-4">
            <Factory className="w-8 h-8 text-ops-primary" />
          </div>
          <h1 className="text-2xl font-bold">{state.title || '生产经营销售赛'}</h1>
          <p className="text-foreground-muted mt-2 text-sm">
            {state.theme_pack?.name || 'OPS · 6 轮运营 + 双拍卖'}
          </p>
          {state.room_code && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ops-primary/10 border border-ops-primary/20 text-ops-primary text-sm font-mono">
              房间码: {state.room_code}
            </div>
          )}
        </div>

        {!isWaiting && (
          <div className="mb-6 rounded-2xl border border-ops-primary/10 bg-background-secondary/40 overflow-hidden">
            <PhaseStepper phase={state.phase} />
          </div>
        )}

        <div className="rounded-2xl border border-ops-primary/20 bg-background-secondary/60 p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isWaiting ? 'bg-ops-auction animate-pulse' : 'bg-success animate-pulse'}`} />
            <span className="text-sm font-medium">
              {isWaiting ? '等待教师开始比赛' : PHASE_LABEL[state.phase] || state.phase}
            </span>
          </div>
          {hasTeam ? (
            <span className="text-sm text-ops-primary flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {state.team.team_name}
            </span>
          ) : (
            <span className="text-sm text-ops-auction flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              等待分配队伍
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-danger/10 text-danger text-sm">{error}</div>
        )}

        <div className="rounded-2xl border border-ops-primary/20 bg-background-secondary/60 p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-ops-primary" />
            参赛队伍
          </h2>
          {peers.length === 0 ? (
            <div className="text-center py-8 text-foreground-muted text-sm">
              暂无队伍 — 学生加入后将显示在此
            </div>
          ) : (
            <div className="space-y-2">
              {peers.map((team) => {
                const isMine = team.team_id === state.team?.team_id;
                return (
                  <div
                    key={team.team_id}
                    className={`rounded-xl border p-4 flex items-center justify-between ${
                      isMine ? 'border-ops-primary/40 bg-ops-primary/10' : 'border-border-subtle bg-background/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                        isMine ? 'bg-ops-primary/20 text-ops-primary' : 'bg-background-secondary text-foreground-muted'
                      }`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {team.team_name}
                          {team.is_ai && <span className="ml-1 text-[10px] text-ops-auction">AI</span>}
                          {isMine && <span className="ml-2 text-[10px] text-ops-primary">我的队伍</span>}
                        </p>
                        <p className="text-xs text-foreground-muted truncate">
                          {team.product_name || (team.has_positioned ? '已定位' : '等待产品定位')}
                        </p>
                      </div>
                    </div>
                    {isMine && <CheckCircle2 className="w-5 h-5 text-ops-primary shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isWaiting && hasTeam && (
          <div className="mt-8 rounded-2xl border border-ops-primary/20 bg-ops-primary/5 p-6 text-center">
            <Loader2 className="w-6 h-6 text-ops-primary animate-spin mx-auto mb-3" />
            <p className="font-medium">已就位，等待教师开始比赛</p>
            <p className="text-sm text-foreground-muted mt-1">开赛后将自动进入决策台</p>
          </div>
        )}
      </div>
    </div>
  );
}
