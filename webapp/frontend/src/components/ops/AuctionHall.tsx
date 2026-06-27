import { useState } from 'react';
import { Gavel, TrendingUp, Crown, Clock, Package } from 'lucide-react';
import type { OpsAuctionItemState } from '../../types/ops';

interface Props {
  items: OpsAuctionItemState[];
  teamId?: number;
  cash: number;
  onBid: (itemId: number, amount: number) => void;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  production: Package,
  advertising: TrendingUp,
  discount: Gavel,
  exclusive_channel: Crown,
  strategic_resource: Package,
  brand_endorsement: Crown,
  legal_protection: Gavel,
};

export default function AuctionHall({ items, teamId, cash, onBid }: Props) {
  const [amounts, setAmounts] = useState<Record<number, string>>({});

  const handleBid = (item: OpsAuctionItemState) => {
    const raw = amounts[item.id];
    if (!raw) return;
    const amount = Number(raw);
    if (Number.isNaN(amount) || amount <= item.current_price) return;
    if (amount > cash) return;
    onBid(item.id, amount);
    setAmounts((prev) => ({ ...prev, [item.id]: '' }));
  };

  const effectText = (item: OpsAuctionItemState) => {
    const effect = item.effect || {};
    if (item.item_type === 'production') return `产能 +${effect.capacity_bonus || 0}`;
    if (item.item_type === 'advertising') return `${effect.city || '指定城市'} Show ×${effect.show_multiplier || 1}`;
    if (item.item_type === 'discount') return `原材料成本 -${Math.round((effect.material_cost_discount || 0) * 100)}%`;
    if (item.item_type === 'exclusive_channel') return `渠道效用 +${effect.utility_bonus || 0}，需求 ×${effect.demand_multiplier || 1}`;
    if (item.item_type === 'strategic_resource') return `成本/研发资源加成`;
    if (item.item_type === 'brand_endorsement') return `品牌 +${effect.show_bonus || 0}，效用 +${effect.utility_bonus || 0}`;
    if (item.item_type === 'legal_protection') return `风险保护 ${Math.round((effect.protection_rate || 0) * 100)}%`;
    return '战略资源';
  };

  return (
    <div className="rounded-2xl border border-ops-auction/30 bg-background-secondary/60 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ops-auction/15 border border-ops-auction/30 flex items-center justify-center">
            <Gavel className="w-5 h-5 text-ops-auction" />
          </div>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              资源拍卖
              <span className="px-1.5 py-0.5 rounded bg-ops-auction/15 text-ops-auction text-[10px] font-bold uppercase tracking-wide">Live</span>
            </h2>
            <p className="text-xs text-foreground-muted">可用现金 ¥{cash.toLocaleString()} · 出价后立即扣款</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-foreground-muted">
          <Clock className="w-3.5 h-3.5" />
          <span>等待出价</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const isLeading = item.leading_team_id === teamId;
          const minBid = item.current_price + Math.max(item.base_price * 0.05, 500);
          const TypeIcon = TYPE_ICON[item.item_type] || Package;
          const isSettled = item.status === 'settled';
          const bidDisabled = !amounts[item.id] || Number(amounts[item.id]) <= item.current_price || Number(amounts[item.id]) > cash;

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-4 transition-all duration-300 ${
                isSettled
                  ? 'border-border-subtle bg-background/40'
                  : isLeading
                    ? 'border-ops-auction/60 bg-ops-auction/10 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                    : 'border-border-subtle bg-background/60 hover:border-ops-auction/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isLeading ? 'bg-ops-auction/20' : 'bg-background-secondary'}`}>
                    <TypeIcon className={`w-4.5 h-4.5 ${isLeading ? 'text-ops-auction' : 'text-foreground-muted'}`} />
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {item.name}
                      {isLeading && !isSettled && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-ops-auction text-background text-[10px] font-bold animate-pulse">
                          <Crown className="w-3 h-3" /> 领先
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-foreground-muted mt-1">
                      {effectText(item)}
                    </div>
                  </div>
                </div>
                <div className="text-right min-w-[80px]">
                  <div className="text-sm font-bold text-ops-auction">¥{item.current_price.toLocaleString()}</div>
                  <div className="text-[10px] text-foreground-muted truncate max-w-[120px]">
                    {item.leading_team_name ? `领先：${item.leading_team_name}` : '暂无出价'}
                  </div>
                </div>
              </div>

              {isSettled ? (
                <div className="mt-4 text-xs rounded-lg bg-background-secondary px-3 py-2 text-foreground-muted">
                  {item.leading_team_id ? `成交：${item.leading_team_name} ¥${item.final_price?.toLocaleString()}` : '流拍'}
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2">
                  <div className="relative flex-1">
                    <TrendingUp className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ops-auction/70" />
                    <input
                      type="number"
                      value={amounts[item.id] || ''}
                      onChange={(e) => setAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder={`最低 ¥${Math.ceil(minBid).toLocaleString()}`}
                      className="w-full rounded-lg border border-ops-auction/20 bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-ops-auction/60 focus:ring-1 focus:ring-ops-auction/30"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBid(item)}
                    disabled={bidDisabled}
                    className="rounded-lg bg-ops-auction px-4 py-2 text-xs font-bold text-background hover:bg-ops-auction/90 disabled:opacity-40 disabled:hover:opacity-40 shadow-[0_0_12px_rgba(245,158,11,0.2)] transition-all"
                  >
                    出价
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
