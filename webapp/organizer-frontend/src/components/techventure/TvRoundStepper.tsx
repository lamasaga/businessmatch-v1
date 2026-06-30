import { Check } from 'lucide-react';

const ROUNDS = [1, 2, 3, 4];

export default function TvRoundStepper({
  currentRoundNo,
  totalRounds = 4,
  matchStatus,
}: {
  currentRoundNo?: number;
  totalRounds?: number;
  matchStatus?: string;
}) {
  const isFinished = matchStatus === 'finished';
  const activeIndex = isFinished ? totalRounds : currentRoundNo ? currentRoundNo - 1 : -1;

  return (
    <div className="flex items-center min-w-[280px] px-1 py-1">
      {ROUNDS.slice(0, totalRounds).map((n, index) => {
        const isCompleted = index < activeIndex || isFinished;
        const isCurrent = !isFinished && index === activeIndex;
        return (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                  isCurrent
                    ? 'bg-tv-primary border-tv-primary text-white'
                    : isCompleted
                      ? 'bg-tv-primary/20 border-tv-primary text-tv-primary'
                      : 'bg-background-secondary border-border-subtle text-foreground-muted'
                }`}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : n}
              </div>
              <span className={`text-[9px] ${isCurrent ? 'text-tv-primary' : 'text-foreground-muted'}`}>R{n}</span>
            </div>
            {index < totalRounds - 1 && (
              <div className={`h-0.5 flex-1 mx-1 rounded-full ${isCompleted ? 'bg-tv-primary' : 'bg-border-subtle'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
