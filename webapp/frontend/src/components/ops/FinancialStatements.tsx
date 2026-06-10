import type { OpsSnapshot } from '../../types/ops';

interface Props {
  snapshot: OpsSnapshot;
}

export default function FinancialStatements({ snapshot }: Props) {
  const income = snapshot.financial_statements?.income_statement || {};
  const balance = snapshot.financial_statements?.balance_sheet || {};
  const result = snapshot.result || {};

  const profitColor = income.net_profit >= 0 ? 'text-success' : 'text-destructive';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-border-subtle bg-background-secondary p-5">
        <h3 className="text-base font-bold mb-3">损益表 · R{result.round_number}</h3>
        <div className="space-y-2 text-sm">
          <Row label="营业收入" value={income.revenue} />
          <Row label="营业成本" value={-income.cogs} />
          <Row label="毛利润" value={income.gross_profit} bold />
          <Row label="营销费用" value={-income.marketing_expense} />
          <Row label="研发费用" value={-income.rnd_expense} />
          <Row label="人力费用" value={-income.labor_expense} />
          <Row label="管理费用" value={-income.overhead_expense} />
          <Row label="开城费" value={-income.opening_fees} />
          <Row label="库存持有成本" value={-income.holding_cost} />
          <Row label="运营利润" value={income.operating_profit} bold />
          <Row label="净利润" value={income.net_profit} bold className={profitColor} />
        </div>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-background-secondary p-5">
        <h3 className="text-base font-bold mb-3">资产负债表 · R{result.round_number}</h3>
        <div className="space-y-2 text-sm">
          <Row label="现金" value={balance.cash} />
          <Row label="存货" value={balance.inventory} suffix={`件（价值 ¥${balance.inventory_value?.toLocaleString() || 0}）`} />
          <Row label="总资产" value={balance.cash + (balance.inventory_value || 0)} bold />
          <div className="h-px bg-border-subtle my-2" />
          <Row label="净资产" value={balance.net_assets} bold className="text-primary" />
        </div>

        <div className="mt-4 rounded-lg bg-background p-3 text-xs space-y-1">
          <div className="flex justify-between"><span>实际销量</span><span>{result.sales} 件</span></div>
          <div className="flex justify-between"><span>期末库存</span><span>{result.inventory_after} 件</span></div>
          <div className="flex justify-between"><span>Tech / Fit / Show</span>
            <span>{result.tech} / {result.fit} / {result.show}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  className = '',
  suffix,
}: {
  label: string;
  value: number;
  bold?: boolean;
  className?: string;
  suffix?: string;
}) {
  const num = Number(value) || 0;
  return (
    <div className={`flex items-center justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-foreground-muted">{label}</span>
      <span className={`tabular-nums ${className}`}>
        {num >= 0 ? '' : '-'}¥{Math.abs(num).toLocaleString()}
        {suffix ? <span className="text-foreground-muted ml-1">{suffix}</span> : null}
      </span>
    </div>
  );
}
