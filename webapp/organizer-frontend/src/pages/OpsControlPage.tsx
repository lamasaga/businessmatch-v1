import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import OpsPhaseStepper from '../components/ops/OpsPhaseStepper';
import {
  Factory, Play, Loader2, AlertCircle, Copy, Check,
  Users, TrendingUp, Pause, ArrowRight, Calculator, Clock, Building2,
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
  opened_at?: string | null;
  ended_at?: string | null;
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
  operation_round_1: '运营 R1',
  operation_round_2: '运营 R2',
  operation_round_3: '运营 R3',
  auction_b: '拍卖B · 战略资源',
  operation_round_4: '运营 R4',
  operation_round_5: '运营 R5',
  operation_round_6: '运营 R6',
  auction: '资源竞价',
  finished: '已结束',
  paused: '已暂停',
};

function formatCountdown(endedAt: string | null | undefined): string | null {
  if (!endedAt) return null;
  const ms = new Date(endedAt).getTime() - Date.now();
  if (ms <= 0) return '已截止';
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function OpsControlPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);

  const [state, setState] = useState<OpsControlState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);

  const fetchState = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/ops/events/${eventId}/screen`);
      setState(res.data.data);
      setError('');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      setError(msg || (err instanceof Error ? err.message : '获取状态失败'));
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchState();
    const timer = setInterval(fetchState, 4000);
    return () => clearInterval(timer);
  }, [fetchState]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const copyCode = async () => {
    if (!state?.room_code) return;
    await navigator.clipboard.writeText(state.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runAction = async (path: string, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/api/v1/ops/events/${eventId}/${path}`);
      await fetchState();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      setError(msg || (err instanceof Error ? err.message : '操作失败'));
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#0a1628]">
        <Loader2 className="w-8 h-8 animate-spin text-ops-primary" />
      </div>
    );
  }

  if (!state) {
    return <p className="text-center text-foreground-muted py-20">无法加载场次数据</p>;
  }

  const teams = state.teams ?? [];
  const rounds = state.rounds ?? [];
  const ranking = state.ranking ?? [];
  const isWaiting = state.match_status === 'registration' || state.match_status === 'draft';
  const isPlaying = state.match_status === 'playing';
  const isFinished = state.phase === 'finished';
  const isPaused = state.phase === 'paused';
  const canStart = isWaiting && (state.participant_count ?? 0) >= 1;
  const countdown = formatCountdown(state.current_round?.ended_at);
  void tick;

  const advanceLabel = (() => {
    if (state.phase.startsWith('operation_round_')) return '截止并结算';
    if (state.phase === 'auction_a' || state.phase === 'auction_b' || state.phase === 'auction') return '结算拍卖';
    if (state.phase === 'positioning') return '进入拍卖 A';
    return '推进阶段';
  })();

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#0a1628] text-foreground p-4 space-y-4">
      <div className="sticky top-2 z-20 rounded-2xl border border-ops-primary/20 bg-[#0a1628]/90 backdrop-blur px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-ops-primary/15 border border-ops-primary/30 flex items-center justify-center shrink-0">
              <Factory className="w-5 h-5 text-ops-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">OPS 教师控场</h1>
              <p className="text-foreground-muted text-xs truncate">
                {state.title} · #{state.match_id} · {PHASE_LABEL[state.phase] || state.phase}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {countdown && isPlaying && !isFinished && !isPaused && (
              <div className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                countdown === '已截止' ? 'border-danger/40 bg-danger/10 text-danger' : 'border-ops-primary/30 bg-ops-primary/10 text-ops-primary'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                R{state.current_round?.round_number} {countdown}
              </div>
            )}

            {isWaiting && state.room_code && (
              <button
                type="button"
                onClick={copyCode}
                className="rounded-xl border border-ops-primary/30 bg-ops-primary/10 px-4 py-2 flex items-center gap-3 hover:border-ops-primary/50"
              >
                <span className="text-[10px] text-foreground-muted">房间码</span>
                <span className="text-xl font-mono font-bold text-ops-primary tracking-widest">{state.room_code}</span>
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-foreground-muted" />}
              </button>
            )}

            {canStart && (
              <button
                type="button"
                onClick={() => runAction('start', '确定开始比赛？将初始化队伍并进入产品定位。')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-success hover:bg-success/90 text-background text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                开始比赛
              </button>
            )}

            {isPlaying && !isFinished && !isPaused && (
              <>
                <button
                  type="button"
                  onClick={() => runAction('advance')}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-ops-primary hover:bg-ops-primary/90 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {advanceLabel}
                </button>
                <button
                  type="button"
                  onClick={() => runAction('pause')}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-ops-auction/90 hover:bg-ops-auction text-background text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
                >
                  <Pause className="w-4 h-4" />
                  暂停
                </button>
              </>
            )}

            {isPaused && (
              <button
                type="button"
                onClick={() => runAction('resume')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-success hover:bg-success/90 text-background text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
              >
                <Play className="w-4 h-4" />
                恢复比赛
              </button>
            )}
          </div>
        </div>

        {!isWaiting && <OpsPhaseStepper phase={state.phase} />}
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 flex items-center gap-2 text-danger text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="已加入选手" value={state.participant_count ?? 0} />
        <StatCard label="队伍数" value={teams.length} />
        <StatCard label="当前阶段" value={PHASE_LABEL[state.phase] || state.phase} small />
        <StatCard label="上限人数" value={state.max_players ?? '—'} />
      </div>

      <div className="rounded-2xl border border-ops-primary/20 bg-background-secondary/60 p-4 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-ops-primary" /> 队伍一览
        </h2>
        {teams.length === 0 ? (
          <p className="text-sm text-foreground-muted">暂无队伍 — 学生输入房间码加入后将自动分配。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-foreground-muted text-xs">
                  <th className="py-2 px-3 text-left">队名</th>
                  <th className="py-2 px-3 text-left">产品</th>
                  <th className="py-2 px-3 text-center">人数</th>
                  <th className="py-2 px-3 text-right">现金</th>
                  <th className="py-2 px-3 text-right">净资产</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.id} className="border-b border-border-subtle/50">
                    <td className="py-2.5 px-3 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-ops-primary/70" />
                        {t.team_name}
                        {t.is_ai && <span className="text-[10px] text-ops-auction">AI</span>}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-foreground-muted">{t.product_name || '—'}</td>
                    <td className="py-2.5 px-3 text-center">{t.member_count}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">¥{Math.round(t.cash).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-ops-primary">¥{Math.round(t.net_assets).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(isPlaying || isFinished) && ranking.length > 0 && (
        <div className="rounded-2xl border border-ops-primary/20 bg-background-secondary/60 p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-ops-primary" /> 实时排行榜
          </h2>
          <div className="space-y-2">
            {ranking.map((row) => (
              <div key={row.team_id} className="flex items-center gap-4 p-3 rounded-xl bg-background/50 border border-border-subtle">
                <span className={`w-8 text-center font-bold ${row.rank === 1 ? 'text-ops-auction' : 'text-foreground-muted'}`}>
                  {row.rank}
                </span>
                <span className="flex-1 font-medium truncate">{row.team_name}</span>
                <span className="text-xs text-foreground-muted hidden sm:inline">
                  利润 ¥{Math.round(row.cumulative_profit).toLocaleString()}
                </span>
                <span className="font-mono text-sm font-bold text-ops-primary">¥{Math.round(row.net_assets).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isPlaying && rounds.length > 0 && (
        <div className="rounded-2xl border border-ops-primary/20 bg-background-secondary/60 p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-ops-primary" /> 轮次状态
          </h2>
          <div className="flex flex-wrap gap-2">
            {rounds.map((r) => (
              <span
                key={r.id}
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                  r.status === 'settled'
                    ? 'border-success/30 bg-success/10 text-success'
                    : r.status === 'open'
                      ? 'border-ops-primary/30 bg-ops-primary/10 text-ops-primary'
                      : 'border-border-subtle bg-background/40 text-foreground-muted'
                }`}
              >
                R{r.round_number}: {r.status === 'settled' ? '已结算' : r.status === 'open' ? '进行中' : '待定'}
              </span>
            ))}
          </div>
        </div>
      )}

      {isFinished && (
        <div className="rounded-2xl border border-success/30 bg-success/10 p-6 text-center">
          <TrendingUp className="w-10 h-10 text-success mx-auto mb-2" />
          <h2 className="text-xl font-bold text-success">比赛已结束</h2>
          <p className="text-foreground-muted mt-1 text-sm">6 轮运营与双拍卖已完成，排名已锁定。</p>
        </div>
      )}

      {isWaiting && (
        <p className="text-xs text-foreground-muted text-center">
          请让学生打开学生端商赛大厅，输入房间码 <span className="text-ops-primary font-mono">{state.room_code}</span> 加入
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-xl border border-ops-primary/15 bg-background-secondary/60 p-4 text-center">
      <p className="text-xs text-foreground-muted">{label}</p>
      <p className={`font-bold mt-1 ${small ? 'text-sm' : 'text-2xl'} text-ops-primary`}>{value}</p>
    </div>
  );
}
