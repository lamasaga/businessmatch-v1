import type { OpsSnapshot } from '../../types/ops';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, Wallet, Building2 } from 'lucide-react';

interface Props {
  snapshot: OpsSnapshot;
  history?: OpsSnapshot[];
}

export default function FinancialStatements({ snapshot, history = [] }: Props) {
  const income = snapshot.financial_statements?.income_statement || {};
  const balance = snapshot.financial_statements?.balance_sheet || {};
  const result = snapshot.result || {};

  const profitColor = income.net_profit >= 0 ? 'text-success' : 'text-danger';
  const profitIcon = income.net_profit >= 0 ? TrendingUp : TrendingDown;

  const chartData = history.map((s) => {
    const inc = s.financial_statements?.income_statement || {};
    const bal = s.financial_statements?.balance_sheet || {};
    return {
      round: `R${s.result?.round_number ?? '-'}`,
      revenue: inc.revenue || 0,
      cogs: inc.cogs || 0,
      grossProfit: inc.gross_profit || 0,
      operatingProfit: inc.operating_profit || 0,
      netProfit: inc.net_profit || 0,
      cash: bal.cash || 0,
      netAssets: bal.net_assets || 0,
    };
  });

  return (
    <div className="space-y-4">
      {/* 指标卡 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard label="营业收入" value={income.revenue || 0} icon={DollarSign} variant="primary" />
        <MetricCard label="毛利润" value={income.gross_profit || 0} icon={TrendingUp} variant="success" />
        <MetricCard label="净利润" value={income.net_profit || 0} icon={profitIcon} variant={income.net_profit >= 0 ? 'success' : 'danger'} />
        <MetricCard label="现金余额" value={balance.cash || 0} icon={Wallet} variant="muted" />
        <MetricCard label="库存价值" value={balance.inventory_value || 0} suffix={`${balance.inventory || result.inventory_after || 0} 件`} icon={Package} variant="muted" />
        <MetricCard label="净资产" value={balance.net_assets || 0} icon={Building2} variant="primary" />
      </div>

      {/* 趋势图 */}
      {chartData.length > 1 && (
        <div className="rounded-2xl border border-border-subtle bg-background-secondary/60 p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-ops-primary" />
            经营趋势 · R1-R{result.round_number}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="round" stroke="#8a8a92" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#8a8a92" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                  formatter={(value) => `¥${Number(value ?? 0).toLocaleString()}`}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="revenue" name="营业收入" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                <Area type="monotone" dataKey="netProfit" name="净利润" stroke="#22c55e" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 财务报表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border-subtle bg-background-secondary/60 p-5">
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-ops-primary" />
            损益表 · R{result.round_number}
          </h3>
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

        <div className="rounded-2xl border border-border-subtle bg-background-secondary/60 p-5">
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-success" />
            资产负债表 · R{result.round_number}
          </h3>
          <div className="space-y-2 text-sm">
            <Row label="现金" value={balance.cash} />
            <Row label="存货" value={balance.inventory_value} suffix={`${balance.inventory || 0} 件`} />
            <Row label="总资产" value={balance.cash + (balance.inventory_value || 0)} bold />
            <div className="h-px bg-border-subtle my-2" />
            <Row label="净资产" value={balance.net_assets} bold className="text-ops-primary" />
          </div>

          <div className="mt-4 rounded-xl bg-background/60 p-3 text-xs space-y-1.5">
            <div className="flex justify-between"><span className="text-foreground-muted">实际销量</span><span className="font-medium">{result.sales} 件</span></div>
            <div className="flex justify-between"><span className="text-foreground-muted">期末库存</span><span className="font-medium">{result.inventory_after} 件</span></div>
            <div className="flex justify-between"><span className="text-foreground-muted">Tech / Fit / Show</span>
              <span className="font-medium">{result.tech} / {result.fit} / {result.show}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
  variant: 'primary' | 'success' | 'danger' | 'muted';
}) {
  const isPositive = value >= 0;
  const styles = {
    primary: { text: 'text-ops-primary', bg: 'bg-ops-primary/15' },
    success: { text: 'text-success', bg: 'bg-success/15' },
    danger: { text: 'text-danger', bg: 'bg-danger/15' },
    muted: { text: 'text-foreground', bg: 'bg-white/5' },
  }[variant];
  return (
    <div className="rounded-xl border border-border-subtle bg-background/60 p-4 flex items-start justify-between">
      <div>
        <p className="text-xs text-foreground-muted mb-1">{label}</p>
        <p className={`text-xl font-bold tabular-nums ${styles.text}`}>
          {isPositive ? '' : '-'}¥{Math.abs(value).toLocaleString()}
        </p>
        {suffix && <p className="text-[10px] text-foreground-muted mt-0.5">{suffix}</p>}
      </div>
      <div className={`p-2 rounded-lg ${styles.bg}`}>
        <Icon className={`w-4 h-4 ${styles.text}`} />
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
