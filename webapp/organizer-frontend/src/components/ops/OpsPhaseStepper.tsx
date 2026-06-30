import { Check } from 'lucide-react';

const STEPS = [
  { id: 'positioning', short: '定位' },
  { id: 'auction_a', short: '拍卖 A' },
  { id: 'operation_early', short: 'R1-R3' },
  { id: 'auction_b', short: '拍卖 B' },
  { id: 'operation_late', short: 'R4-R6' },
  { id: 'finished', short: '结束' },
];

function phaseToStepIndex(phase: string | undefined): number {
  if (!phase) return 0;
  if (phase === 'positioning') return 0;
  if (phase === 'auction_a' || phase === 'auction') return 1;
  if (phase === 'operation_round_1' || phase === 'operation_round_2' || phase === 'operation_round_3') return 2;
  if (phase === 'auction_b') return 3;
  if (phase === 'operation_round_4' || phase === 'operation_round_5' || phase === 'operation_round_6') return 4;
  if (phase === 'finished') return 5;
  if (phase === 'paused') return 2;
  return 0;
}

export default function OpsPhaseStepper({ phase }: { phase: string }) {
  const currentIndex = phaseToStepIndex(phase);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-[560px] px-2 py-2">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                    isCurrent
                      ? 'bg-ops-primary border-ops-primary text-white'
                      : isCompleted
                        ? 'bg-ops-primary/20 border-ops-primary text-ops-primary'
                        : 'bg-background-secondary border-border-subtle text-foreground-muted'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : index + 1}
                </div>
                <p className={`text-[10px] whitespace-nowrap ${isCurrent ? 'text-ops-primary font-semibold' : 'text-foreground-muted'}`}>
                  {step.short}
                </p>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1.5 rounded-full ${isCompleted ? 'bg-ops-primary' : 'bg-border-subtle'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
