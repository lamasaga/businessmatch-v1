import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import type { RtsTickDigest } from '../../types';
import { formatGameDate } from '../../lib/fstGameTime';

type Props = {
  digest?: RtsTickDigest | null;
  gameDay: number;
  totalDays: number;
};

function formatDelta(value: number, label: string) {
  if (Math.abs(value) < 1) return null;
  const sign = value > 0 ? '+' : '';
  return `${label} ${sign}¥${Math.round(value).toLocaleString()}`;
}

export default function FstDayDigestToast({ digest, gameDay, totalDays }: Props) {
  const [visible, setVisible] = useState(false);
  const [shownDay, setShownDay] = useState(0);

  useEffect(() => {
    if (!digest || digest.tick <= 0 || digest.tick === shownDay) return;
    if (digest.tick > gameDay) return;
    setShownDay(digest.tick);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 5200);
    return () => clearTimeout(t);
  }, [digest, gameDay, shownDay]);

  if (!visible || !digest) return null;

  const cashLine = formatDelta(digest.cash_delta, '现金');
  const assetsLine = formatDelta(digest.assets_delta, '总资产');
  const dateLabel = formatGameDate(digest.tick, totalDays);

  return (
    <div className="fst-day-digest" role="status">
      <div className="fst-day-digest__head">
        <Sparkles className="h-4 w-4" />
        <strong>{dateLabel} 入账</strong>
        <button type="button" onClick={() => setVisible(false)} aria-label="关闭">
          <X className="h-4 w-4" />
        </button>
      </div>
      {(cashLine || assetsLine) && (
        <p className="fst-day-digest__delta">
          {[cashLine, assetsLine].filter(Boolean).join(' · ')}
        </p>
      )}
      <ul>
        {(digest.lines || []).slice(0, 4).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
