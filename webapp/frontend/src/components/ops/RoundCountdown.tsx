import { useEffect, useState } from 'react';
import { Clock, Lock } from 'lucide-react';
import type { OpsRound } from '../../types/ops';

interface Props {
  currentRound: OpsRound | null;
  isOfficial: boolean;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function RoundCountdown({ currentRound, isOfficial }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isOfficial || !currentRound?.ended_at) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isOfficial, currentRound?.ended_at]);

  if (!isOfficial) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-ops-primary/20 bg-ops-primary/10 px-3 py-1.5 text-xs text-ops-primary">
        <Clock className="w-3.5 h-3.5" />
        <span>练习赛 · 提交后可进入下一阶段</span>
      </div>
    );
  }

  if (!currentRound?.ended_at) return null;

  const endMs = new Date(currentRound.ended_at).getTime();
  const remaining = endMs - now;
  const expired = remaining <= 0;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
        expired
          ? 'border-danger/40 bg-danger/10 text-danger'
          : remaining < 120000
            ? 'border-ops-auction/40 bg-ops-auction/10 text-ops-auction animate-pulse'
            : 'border-ops-primary/30 bg-ops-primary/10 text-ops-primary'
      }`}
    >
      {expired ? <Lock className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
      <span>
        R{currentRound.round_number} {expired ? '已截止' : `剩余 ${formatRemaining(remaining)}`}
      </span>
    </div>
  );
}
