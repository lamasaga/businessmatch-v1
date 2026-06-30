import { Wallet, ArrowRightLeft, MapPin } from 'lucide-react';

interface Props {
  budget: number;
  totalCost: number;
  remaining: number;
  switchCost: number;
  expandCost: number;
  investTech: number;
  investFitTotal: number;
  investShowTotal: number;
}

export default function TvBudgetPanel({
  budget,
  totalCost,
  remaining,
  switchCost,
  expandCost,
  investTech,
  investFitTotal,
  investShowTotal,
}: Props) {
  const usage = Math.min(1, Math.max(0, totalCost / Math.max(budget, 1)));

  return (
    <div className="tv-budget-card">
      <div className="tv-budget-head">
        <span className="tv-budget-title">
          <Wallet className="w-3.5 h-3.5" />
          预算仪表盘
        </span>
        <span className={`tv-budget-remaining ${remaining < -0.01 ? 'is-danger' : ''}`}>
          剩余 {remaining.toFixed(1)} 万
        </span>
      </div>

      <div className="tv-budget-progress">
        <div
          className={usage > 1 ? 'is-danger' : usage > 0.85 ? 'is-warning' : ''}
          style={{ width: `${Math.min(usage, 1) * 100}%` }}
        />
      </div>

      <div className="tv-budget-lines">
        <Row label="Tech 研发" value={investTech} color="text-tv-tech" />
        <Row label="Fit 合计" value={investFitTotal} color="text-tv-user" />
        <Row label="Show 合计" value={investShowTotal} color="text-tv-brand" />
        {switchCost > 0 && (
          <Row label="路线切换" value={switchCost} color="text-tv-pathfinder" icon={ArrowRightLeft} />
        )}
        {expandCost > 0 && (
          <Row label="城市开拓" value={expandCost} color="text-tv-primary" icon={MapPin} />
        )}
      </div>

      <div className="tv-budget-foot">
        <span>本轮预算 {budget.toFixed(1)} 万</span>
        <span>支出 {totalCost.toFixed(1)} 万</span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="tv-budget-row">
      <span>
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </span>
      <span className={`font-mono font-semibold ${color}`}>{value.toFixed(1)}</span>
    </div>
  );
}
