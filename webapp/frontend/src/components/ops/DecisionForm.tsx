import { useEffect, useMemo, useState } from 'react';
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
  const [unitPrice, setUnitPrice] = useState(category?.base_price || 100);
  const [marketing, setMarketing] = useState(0);
  const [rnd, setRnd] = useState(0);
  const [salesForce, setSalesForce] = useState(0);
  const [targetCities, setTargetCities] = useState<string[]>(team.entered_cities || []);

  useEffect(() => {
    if (category?.base_price) {
      setUnitPrice(category.base_price);
    }
  }, [category?.base_price]);

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

  const totalCost = rawSpend + openingFees + marketing + rnd + salesForce * 1500;
  const remaining = team.cash - totalCost;

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
      <div className="rounded-2xl border border-success/30 bg-success/10 p-6 text-center">
        <div className="text-lg font-bold text-success">已提交 R{currentRound?.round_number} 决策</div>
        <p className="text-sm text-foreground-muted mt-1">请等待组织者结算或进入下一轮</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border-subtle bg-background-secondary p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">R{currentRound?.round_number} 运营决策</h2>
        <div className={`text-sm font-semibold ${remaining >= 0 ? 'text-success' : 'text-destructive'}`}>
          剩余现金 ¥{remaining.toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold">生产量（单位）</label>
          <input
            type="number"
            min={0}
            value={production}
            onChange={(e) => setProduction(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm"
          />
          <p className="text-[10px] text-foreground-muted">原料成本 ¥{materialCost}/单位</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold">出厂定价（¥）</label>
          <input
            type="number"
            min={1}
            value={unitPrice}
            onChange={(e) => setUnitPrice(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold">市场营销投入（¥）</label>
          <input
            type="number"
            min={0}
            value={marketing}
            onChange={(e) => setMarketing(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold">研发投入（¥）</label>
          <input
            type="number"
            min={0}
            value={rnd}
            onChange={(e) => setRnd(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold">销售人员数</label>
          <input
            type="number"
            min={0}
            max={10}
            value={salesForce}
            onChange={(e) => setSalesForce(Math.max(0, Math.min(10, Number(e.target.value))))}
            className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm"
          />
          <p className="text-[10px] text-foreground-muted">工资 ¥1,500/人/轮</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold">目标城市（最多 3 个）</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(cities).map(([cityId, cfg]) => {
            const selected = targetCities.includes(cityId);
            const entered = team.entered_cities.includes(cityId);
            return (
              <button
                key={cityId}
                type="button"
                onClick={() => toggleCity(cityId)}
                className={`text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selected
                    ? 'border-primary/50 bg-primary/15'
                    : 'border-border-subtle bg-background hover:bg-background-hover'
                }`}
              >
                <div className="font-medium">{cfg.name}</div>
                <div className="text-[10px] text-foreground-muted">
                  {entered ? '已开拓' : `开城费 ¥${(cfg.opening_cost * ({1:2,2:1.5,3:1}[cfg.tier] || 1)).toLocaleString()}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg bg-background p-3 text-xs space-y-1">
        <div className="flex justify-between"><span>原材料支出</span><span>¥{rawSpend.toLocaleString()}</span></div>
        <div className="flex justify-between"><span>开城费</span><span>¥{openingFees.toLocaleString()}</span></div>
        <div className="flex justify-between"><span>营销+研发</span><span>¥{(marketing + rnd).toLocaleString()}</span></div>
        <div className="flex justify-between"><span>人力支出</span><span>¥{(salesForce * 1500).toLocaleString()}</span></div>
        <div className="flex justify-between font-bold border-t border-border-subtle pt-1">
          <span>总支出</span>
          <span className={remaining >= 0 ? 'text-success' : 'text-destructive'}>¥{totalCost.toLocaleString()}</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || remaining < -0.01}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? '提交中...' : '提交本轮决策'}
      </button>
    </form>
  );
}
