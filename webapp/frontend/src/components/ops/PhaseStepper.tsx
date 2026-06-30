import { Check } from 'lucide-react';
import type { OpsPhase } from '../../types/ops';

const STEPS = [
  { id: 'positioning', label: '产品定位', short: '定位' },
  { id: 'auction_a', label: '拍卖 A · 基础资源', short: '拍卖 A' },
  { id: 'operation_early', label: '运营 R1-R3', short: 'R1-R3' },
  { id: 'auction_b', label: '拍卖 B · 战略资源', short: '拍卖 B' },
  { id: 'operation_late', label: '运营 R4-R6', short: 'R4-R6' },
  { id: 'finished', label: '比赛结束', short: '结束' },
];

function phaseToStepIndex(phase: OpsPhase | undefined): number {
  if (!phase) return 0;
  if (phase === 'positioning') return 0;
  if (phase === 'auction_a' || phase === 'auction') return 1;
  if (phase === 'operation_round_1' || phase === 'operation_round_2' || phase === 'operation_round_3') return 2;
  if (phase === 'auction_b') return 3;
  if (phase === 'operation_round_4' || phase === 'operation_round_5' || phase === 'operation_round_6') return 4;
  if (phase === 'finished') return 5;
  if (phase === 'paused') return 2; // 默认显示在运营早期
  return 0;
}

interface Props {
  phase: OpsPhase | undefined;
  currentRound?: number;
}

export default function PhaseStepper({ phase, currentRound }: Props) {
  const currentIndex = phaseToStepIndex(phase);

  const subLabel = (() => {
    if (!phase?.startsWith('operation_round_') || !currentRound) return null;
    if (currentRound <= 3) return `当前 R${currentRound}`;
    return `当前 R${currentRound}`;
  })();

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-[600px] px-2 py-1.5">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${
                    isCurrent
                      ? 'bg-ops-primary border-ops-primary text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                      : isCompleted
                        ? 'bg-ops-primary/20 border-ops-primary text-ops-primary'
                        : 'bg-background-secondary border-border-subtle text-foreground-muted'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : index + 1}
                </div>
                <div className="text-center">
                  <p
                    className={`text-[10px] font-medium whitespace-nowrap ${
                      isCurrent ? 'text-ops-primary' : isCompleted ? 'text-foreground' : 'text-foreground-muted'
                    }`}
                  >
                    {step.short}
                  </p>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 rounded-full transition-colors ${
                    isCompleted ? 'bg-ops-primary' : 'bg-border-subtle'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      {subLabel && (
        <p className="text-center text-[9px] text-ops-primary pb-1 -mt-1">{subLabel} · 6 轮运营 + 双拍卖</p>
      )}
    </div>
  );
}
