import { useMemo, useState } from 'react';
import { Package, Tag, Megaphone, FlaskConical, Users, MapPin, ArrowRight, AlertTriangle, Check } from 'lucide-react';
import type { OpsTeamState, OpsCityConfig, OpsCategoryConfig, OpsRound } from '../../types/ops';

interface Props {
  team: OpsTeamState;
  cities: Record<string, OpsCityConfig>;
  category: OpsCategoryConfig;
  currentRound: OpsRound | null;
  hasSubmitted: boolean;
  onSubmit: (payload: {
    production_quantity: number;
    unit_price: number;
    marketing_spend: number;
    rnd_spend: number;
    sales_force: number;
    target_cities: string[];
  }) => void;
  submitting: boolean;
}

export default function DecisionForm({ team, cities, category, currentRound, hasSubmitted, onSubmit, submitting }: Props) {
  const [production, setProduction] = useState(0);
  const [unitPrice, setUnitPrice] = useState(() => category?.base_price || 100);
  const [marketing, setMarketing] = useState(0);
  const [rnd, setRnd] = useState(0);
  const [salesForce, setSalesForce] = useState(0);
  const [targetCities, setTargetCities] = useState<string[]>(team.entered_cities || []);

  const materialCost = category?.base_material_cost || 0;
  const rawSpend = production * materialCost * (1 - team.discount_rate);

  const openingFees = useMemo(() => {
    let fee = 0;
    for (const cityId of targetCities) {
      if (!team.entered_cities.includes(cityId)) {
        const c = cities[cityId];
        if (c) {
          const multi = { 1: 2.0, 2: 1.5, 3: 1.0, 4: 0.6 }[c.tier] || 1.0;
          fee += c.opening_cost * multi;
        }
      }
    }
    return fee;
  }, [targetCities, team.entered_cities, cities]);

  const laborCost = salesForce * 1500;
  const totalCost = rawSpend + openingFees + marketing + rnd + laborCost;
  const remaining = team.cash - totalCost;
  const usageRatio = Math.min(1, Math.max(0, totalCost / Math.max(team.cash, 1)));

  const toggleCity = (cityId: string) => {
    setTargetCities((prev) => {
      if (prev.includes(cityId)) return prev.filter((c) => c !== cityId);
      if (prev.length >= 3) return prev;
      return [...prev, cityId];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (remaining < -0.01) return;
    onSubmit({
      production_quantity: production,
      unit_price: unitPrice,
      marketing_spend: marketing,
      rnd_spend: rnd,
      sales_force: salesForce,
      target_cities: targetCities,
    });
  };

  if (hasSubmitted) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6 text-success" />
        </div>
        <div className="text-lg font-bold text-success">已提交 R{currentRound?.round_number} 决策</div>
        <p className="text-sm text-foreground-muted mt-1">请等待组织者结算或进入下一轮</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-ops-primary/20 bg-background-secondary/60 p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-ops-primary/15 flex items-center justify-center">
            <Package className="w-4 h-4 text-ops-primary" />
          </div>
          <h2 className="text-lg font-bold">R{currentRound?.round_number} 运营决策</h2>
        </div>
        <div className={`text-sm font-bold px-3 py-1 rounded-full ${remaining >= 0 ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
          剩余现金 ¥{remaining.toLocaleString()}
        </div>
      </div>

      {/* 预算进度条 */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-foreground-muted">
          <span>预算使用</span>
          <span>{Math.round(usageRatio * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-background overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              usageRatio > 1 ? 'bg-danger' : usageRatio > 0.8 ? 'bg-ops-auction' : 'bg-ops-primary'
            }`}
            style={{ width: `${Math.min(usageRatio, 1) * 100}%` }}
          />
        </div>
        {remaining < 0 && (
          <div className="flex items-center gap-1.5 text-xs text-danger">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>支出超出可用现金，请调整决策</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <InputGroup icon={Package} label="生产量（单位）" hint={`原料成本 ¥${materialCost}/单位`}>
          <input
            type="number"
            min={0}
            value={production}
            onChange={(e) => setProduction(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-lg border border-ops-primary/20 bg-background px-3 py-2 text-sm focus:outline-none focus:border-ops-primary/60 focus:ring-1 focus:ring-ops-primary/30"
          />
        </InputGroup>

        <InputGroup icon={Tag} label="出厂定价（¥）" hint="建议参考基础定价">
          <input
            type="number"
            min={1}
            value={unitPrice}
            onChange={(e) => setUnitPrice(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-lg border border-ops-primary/20 bg-background px-3 py-2 text-sm focus:outline-none focus:border-ops-primary/60 focus:ring-1 focus:ring-ops-primary/30"
          />
        </InputGroup>

        <InputGroup icon={Megaphone} label="市场营销投入（¥）" hint="提升 Show 与需求">
          <input
            type="number"
            min={0}
            value={marketing}
            onChange={(e) => setMarketing(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-lg border border-ops-primary/20 bg-background px-3 py-2 text-sm focus:outline-none focus:border-ops-primary/60 focus:ring-1 focus:ring-ops-primary/30"
          />
        </InputGroup>

        <InputGroup icon={FlaskConical} label="研发投入（¥）" hint="提升 Tech 与 Fit">
          <input
            type="number"
            min={0}
            value={rnd}
            onChange={(e) => setRnd(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-lg border border-ops-primary/20 bg-background px-3 py-2 text-sm focus:outline-none focus:border-ops-primary/60 focus:ring-1 focus:ring-ops-primary/30"
          />
        </InputGroup>

        <InputGroup icon={Users} label="销售人员数" hint="工资 ¥1,500/人/轮">
          <input
            type="number"
            min={0}
            max={10}
            value={salesForce}
            onChange={(e) => setSalesForce(Math.max(0, Math.min(10, Number(e.target.value))))}
            className="w-full rounded-lg border border-ops-primary/20 bg-background px-3 py-2 text-sm focus:outline-none focus:border-ops-primary/60 focus:ring-1 focus:ring-ops-primary/30"
          />
        </InputGroup>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-ops-primary" /> 目标城市（最多 3 个）
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(cities).map(([cityId, cfg]) => {
            const selected = targetCities.includes(cityId);
            const entered = team.entered_cities.includes(cityId);
            const tierColor = { 1: 'text-ops-auction', 2: 'text-foreground', 3: 'text-foreground-muted', 4: 'text-foreground-muted' }[cfg.tier] || 'text-foreground-muted';
            return (
              <button
                key={cityId}
                type="button"
                onClick={() => toggleCity(cityId)}
                className={`text-left rounded-xl border px-3 py-2.5 text-sm transition-all ${
                  selected
                    ? 'border-ops-primary bg-ops-primary/15 shadow-[0_0_12px_rgba(59,130,246,0.12)]'
                    : 'border-border-subtle bg-background/60 hover:border-ops-primary/30 hover:bg-background-hover'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{cfg.name}</span>
                  {entered && <span className="text-[9px] px-1 py-0.5 rounded bg-success/15 text-success">已开拓</span>}
                </div>
                <div className="text-[10px] text-foreground-muted mt-1">
                  {entered ? `${cfg.market_size} 市场规模` : `开城费 ¥${(cfg.opening_cost * ({1:2,2:1.5,3:1}[cfg.tier] || 1)).toLocaleString()}`}
                </div>
                <div className={`text-[10px] ${tierColor} mt-0.5`}>
                  {cfg.tier === 1 ? '一线城市' : cfg.tier === 2 ? '二线城市' : cfg.tier === 3 ? '三线城市' : '下沉市场'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl bg-background/60 p-4 text-sm space-y-2">
        <div className="flex justify-between text-foreground-muted"><span>原材料支出</span><span className="tabular-nums text-foreground">¥{rawSpend.toLocaleString()}</span></div>
        <div className="flex justify-between text-foreground-muted"><span>开城费</span><span className="tabular-nums text-foreground">¥{openingFees.toLocaleString()}</span></div>
        <div className="flex justify-between text-foreground-muted"><span>营销 + 研发</span><span className="tabular-nums text-foreground">¥{(marketing + rnd).toLocaleString()}</span></div>
        <div className="flex justify-between text-foreground-muted"><span>人力支出</span><span className="tabular-nums text-foreground">¥{laborCost.toLocaleString()}</span></div>
        <div className="flex justify-between font-bold border-t border-border-subtle pt-2">
          <span>总支出</span>
          <span className={remaining >= 0 ? 'text-ops-primary' : 'text-danger'}>¥{totalCost.toLocaleString()}</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || remaining < -0.01}
        className="w-full rounded-xl bg-ops-primary px-4 py-3 text-sm font-bold text-white hover:bg-ops-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all"
      >
        {submitting ? '提交中...' : <><span>提交本轮决策</span><ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  );
}

function InputGroup({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: React.ElementType;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-ops-primary" />
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-foreground-muted">{hint}</p>}
    </div>
  );
}
