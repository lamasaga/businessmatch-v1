import { Check } from 'lucide-react';

interface Props {
  currentRoundNo?: number;
  totalRounds?: number;
  matchStatus?: string;
}

export default function TvRoundStepper({ currentRoundNo, totalRounds = 6, matchStatus }: Props) {
  const rounds = Array.from({ length: totalRounds }, (_, index) => index + 1);
  const isFinished = matchStatus === 'finished';
  const activeIndex = isFinished
    ? totalRounds
    : currentRoundNo
      ? currentRoundNo - 1
      : -1;

  return (
    <div className="w-full overflow-x-auto border-b border-slate-200 bg-white/80">
      <div className="flex items-center min-w-[420px] px-3 py-1.5 gap-1">
        {rounds.map((n, index) => {
          const isCompleted = index < activeIndex || isFinished;
          const isCurrent = !isFinished && index === activeIndex;
          return (
            <div key={n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-0.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all ${
                    isCurrent
                      ? 'bg-tv-primary border-tv-primary text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)]'
                      : isCompleted
                        ? 'bg-tv-primary/20 border-tv-primary text-tv-primary'
                        : 'bg-background-secondary border-border-subtle text-foreground-muted'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : `R${n}`}
                </div>
                <span className={`text-[9px] ${isCurrent ? 'text-tv-primary font-semibold' : 'text-foreground-muted'}`}>
                  第{n}轮
                </span>
              </div>
              {index < totalRounds - 1 && (
                <div className={`h-0.5 flex-1 mx-2 rounded-full ${isCompleted ? 'bg-tv-primary' : 'bg-border-subtle'}`} />
              )}
            </div>
          );
        })}
        {isFinished && (
          <span className="text-[10px] text-success font-medium ml-2 whitespace-nowrap">已结束</span>
        )}
      </div>
    </div>
  );
}
