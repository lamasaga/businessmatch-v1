import { useEffect, useState } from 'react';
import { Clock, Lock, Zap } from 'lucide-react';
import type { TvRound } from '../../types/techventure';

interface Props {
  currentRound: TvRound | null;
  isPractice: boolean;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function TvRoundCountdown({ currentRound, isPractice }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (isPractice || !currentRound?.ended_at) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isPractice, currentRound?.ended_at]);

  if (!currentRound) return null;

  if (isPractice) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-tv-primary/25 bg-tv-primary/10 px-2.5 py-1 text-[11px] text-tv-primary">
        <Zap className="w-3 h-3" />
        <span>练习赛 · 提交后自动结算</span>
      </div>
    );
  }

  if (!currentRound.ended_at) return null;

  const remaining = new Date(currentRound.ended_at).getTime() - now;
  const expired = remaining <= 0;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
        expired
          ? 'border-danger/40 bg-danger/10 text-danger'
          : remaining < 120000
            ? 'border-tv-pathfinder/40 bg-tv-pathfinder/10 text-tv-pathfinder'
            : 'border-tv-primary/30 bg-tv-primary/10 text-tv-primary'
      }`}
    >
      {expired ? <Lock className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      R{currentRound.round_no} {expired ? '已截止' : formatRemaining(remaining)}
    </div>
  );
}
