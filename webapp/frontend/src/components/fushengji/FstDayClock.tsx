import type { RtsCountdownState } from '../../hooks/useRtsCountdown';

type Props = {
  dateLabel: string;
  countdown: RtsCountdownState;
  playing?: boolean;
};

/** 顶栏「游戏日期」槽位：小型日晷/太阳弧，不额外占纵向空间 */
export default function FstDayClock({ dateLabel, countdown, playing = true }: Props) {
  const progress = playing ? countdown.progress : 1;
  const locked = countdown.locked;

  // 太阳沿小弧从左（晨）移到右（暮），progress ∈ [0,1]
  const angle = Math.PI * (0.15 + progress * 0.7);
  const cx = 14;
  const cy = 16;
  const r = 9;
  const sunX = cx + r * Math.cos(Math.PI - angle);
  const sunY = cy - r * Math.sin(Math.PI - angle);

  return (
    <div
      className={`fst-hud-metric fst-hud-metric--cyan fst-day-clock${locked ? ' is-settling' : ''}`}
      title={
        locked
          ? '今日交易正在入账，请稍候'
          : playing
            ? '一日将尽，太阳西沉；指令在今日末统一执行'
            : dateLabel
      }
    >
      <div className="fst-day-clock__dial" aria-hidden>
        <svg width="28" height="28" viewBox="0 0 28 28">
          <path
            d="M 5 20 A 9 9 0 0 1 23 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            opacity="0.35"
          />
          <circle
            cx={sunX}
            cy={sunY}
            r={locked ? 3.2 : 2.8}
            fill={locked ? '#e8b84a' : '#f6c344'}
            className={locked ? 'fst-day-clock__sun--settle' : 'fst-day-clock__sun'}
          />
          {!locked && playing && (
            <circle cx={sunX} cy={sunY} r="5.5" fill="#f6c344" opacity="0.18" />
          )}
        </svg>
      </div>
      <span>游戏日期</span>
      <strong className="fst-day-clock__date">{dateLabel}</strong>
    </div>
  );
}
