import { useEffect, useRef, useState } from 'react';
import type { RtsMeta } from '../types';

export type RtsCountdownState = {
  msRemaining: number;
  progress: number;
  locked: boolean;
  intervalSec: number;
};

function syncFromMeta(rts?: RtsMeta | null): RtsCountdownState {
  const intervalSec = rts?.tick_interval_sec ?? 4;
  const ms = rts?.ms_until_next_tick ?? (rts?.seconds_until_next_tick ?? 0) * 1000;
  const progress = rts?.tick_progress ?? 0;
  const locked = Boolean(rts?.settlement_locked) || ms < 600;
  return {
    msRemaining: Math.max(0, ms),
    progress: Math.max(0, Math.min(1, progress)),
    locked,
    intervalSec,
  };
}

/** 本地平滑倒计时：在 WS/HTTP 同步之间用 requestAnimationFrame 递减。 */
export function useRtsCountdown(rts?: RtsMeta | null): RtsCountdownState {
  const [state, setState] = useState<RtsCountdownState>(() => syncFromMeta(rts));
  const anchorRef = useRef({ at: performance.now(), ms: state.msRemaining, interval: state.intervalSec });

  useEffect(() => {
    const synced = syncFromMeta(rts);
    anchorRef.current = {
      at: performance.now(),
      ms: synced.msRemaining,
      interval: synced.intervalSec,
    };
    setState(synced);
  }, [rts?.tick, rts?.last_tick_at, rts?.ms_until_next_tick, rts?.tick_interval_sec, rts?.settlement_locked]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const { at, ms, interval } = anchorRef.current;
      const elapsed = performance.now() - at;
      const remaining = Math.max(0, ms - elapsed);
      const progress = interval > 0 ? 1 - remaining / (interval * 1000) : 0;
      setState({
        msRemaining: remaining,
        progress: Math.max(0, Math.min(1, progress)),
        locked: remaining < 600,
        intervalSec: interval,
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [rts?.tick, rts?.last_tick_at]);

  return state;
}
