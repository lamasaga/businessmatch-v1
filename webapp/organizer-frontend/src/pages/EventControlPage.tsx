import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, ChevronRight, Loader2, Crown, Copy, Check,
} from 'lucide-react';
import { useState } from 'react';
import { useOrganizerStore } from '../stores/organizerStore';
import { connectRtsWebSocket } from '../lib/rtsWebSocket';

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  registration: '报名中',
  playing: '进行中',
  finished: '已结束',
};

export default function EventControlPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = Number(id);
  const {
    control,
    loading,
    error,
    fetchControl,
    startEvent,
    endEvent,
    nextRound,
    clearError,
  } = useOrganizerStore();
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(() => {
    if (eventId) fetchControl(eventId);
  }, [eventId, fetchControl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isRtsEvent =
    control?.event?.config?.mode === 'rts' ||
    control?.event?.game_config_id === 'trading-v2-rts';

  useEffect(() => {
    if (!eventId || !isRtsEvent) return;
    if (control?.event?.status !== 'registration' && control?.event?.status !== 'playing') {
      return;
    }
    const disconnect = connectRtsWebSocket(eventId, {
      onTick: () => {
        void refresh();
      },
    });
    const fallback = setInterval(() => void refresh(), 30000);
    return () => {
      disconnect();
      clearInterval(fallback);
    };
  }, [eventId, isRtsEvent, control?.event?.status, refresh]);

  useEffect(() => {
    if (!control?.event || isRtsEvent) return;
    const st = control.event.status;
    if (st === 'registration' || st === 'playing') {
      const t = setInterval(refresh, 3000);
      return () => clearInterval(t);
    }
  }, [control?.event?.status, isRtsEvent, refresh]);

  const copyCode = async () => {
    if (!control?.event.room_code) return;
    await navigator.clipboard.writeText(control.event.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!control) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const { event, current_round, standings, participants, decisions_submitted, rts } = control;
  const isRts = event.config?.mode === 'rts' || event.game_config_id === 'trading-v2-rts';
  const totalRounds = isRts
    ? Number(rts?.total_ticks ?? event.config?.total_ticks ?? 120)
    : Number(event.config?.rounds ?? 10);
  const hasPlayers = participants.length >= 1;
  const isPlaying = event.status === 'playing';
  const isFinished = event.status === 'finished';
  const canStart =
    (event.status === 'registration' || event.status === 'draft') &&
    hasPlayers &&
    !isFinished;

  return (    <div>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-foreground-muted hover:text-foreground mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        返回列表
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="text-sm text-foreground-muted mt-1">
            {STATUS_LABEL[event.status] || event.status}
            {isPlaying && (isRts
              ? ` · Tick ${event.current_round}/${totalRounds}${rts?.phase ? ` (${rts.phase})` : ''}`
              : ` · 第 ${event.current_round}/${totalRounds} 回合`)}
          </p>
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="glass-card px-6 py-3 flex items-center gap-3 hover:border-primary/40"
        >
          <span className="text-xs text-foreground-muted">房间码</span>
          <span className="text-3xl font-mono font-bold text-primary tracking-widest">
            {event.room_code}
          </span>
          {copied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4 text-foreground-muted" />
          )}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <MiniStat label="已加入" value={participants.length} />
        <MiniStat label="最大人数" value={event.max_players} />
        {isPlaying && current_round && (
          <MiniStat
            label="本回合已决策"
            value={`${decisions_submitted}/${participants.length}`}
          />
        )}
      </div>

      {!isFinished && (
        <div className="glass-card p-6 mb-6 flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
          {canStart && (
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                clearError();
                try {
                  await startEvent(eventId);
                  await fetchControl(eventId);
                } catch {
                  /* error in store */
                }
              }}
              className="flex-1 min-w-[140px] py-3 bg-primary text-background rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  开始比赛
                </>
              )}
            </button>
          )}
          {isPlaying && current_round && !isRts && (
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                clearError();
                await nextRound(current_round.id);
                refresh();
              }}
              className="flex-1 min-w-[140px] py-3 bg-success/20 text-success border border-success/30 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
              推进下一回合
            </button>
          )}
          {isPlaying && (
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                if (!window.confirm('确定结束比赛并结算排名？')) return;
                clearError();
                await endEvent(eventId);
                refresh();
              }}
              className="flex-1 min-w-[140px] py-3 bg-danger/20 text-danger border border-danger/30 rounded-xl font-semibold disabled:opacity-50"
            >
              结束比赛
            </button>
          )}
          </div>
          {!hasPlayers && (event.status === 'registration' || event.status === 'draft') && (
            <p className="text-sm text-foreground-muted">
              至少 1 名学生输入房间码加入后，方可点击「开始比赛」。
            </p>
          )}
          {isPlaying && (
            <p className="text-sm text-success">
              {isRts
                ? 'RTS 模式已自动每 5 秒推进 tick；学生提交指令后下 tick 结算。'
                : '比赛已开始 — 学生可进入对局；您可在此推进回合或结束比赛。'}
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      <div className="glass-card p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Crown className="w-4 h-4 text-primary" />
          实时排行榜
        </h3>
        {standings.length === 0 ? (
          <p className="text-sm text-foreground-muted text-center py-8">
            等待学生输入房间码加入（学生端：商赛大厅）
          </p>
        ) : (
          <div className="space-y-2">
            {standings.map((row) => (
              <div
                key={row.user_id}
                className="flex items-center gap-4 p-3 bg-background-secondary rounded-lg"
              >
                <span
                  className={`w-8 text-center font-bold ${
                    row.rank === 1 ? 'text-primary' : 'text-foreground-muted'
                  }`}
                >
                  {row.rank}
                </span>
                <span className="flex-1 font-medium">{row.username}</span>
                <span className="text-sm text-foreground-muted">{row.current_city}</span>
                <span className="font-mono text-sm">
                  ¥{Math.round(row.total_assets).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {event.status === 'registration' && (
        <p className="text-xs text-foreground-muted mt-6 text-center">
          请让学生打开{' '}
          <a
            href={import.meta.env.VITE_STUDENT_URL || 'http://localhost:5173/games'}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            学生端商赛大厅
          </a>{' '}
          输入房间码 {event.room_code} 加入
        </p>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-card p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-foreground-muted mt-1">{label}</p>
    </div>
  );
}
