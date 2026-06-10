import { useState } from 'react';
import { Gavel, TrendingUp } from 'lucide-react';
import type { OpsAuctionItemState } from '../../types/ops';

interface Props {
  items: OpsAuctionItemState[];
  teamId?: number;
  cash: number;
  onBid: (itemId: number, amount: number) => void;
}

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

  return (
    <div className="rounded-2xl border border-border-subtle bg-background-secondary p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Gavel className="w-5 h-5 text-warning" />
        <h2 className="text-lg font-bold">资源竞价</h2>
        <span className="text-xs text-foreground-muted ml-2">可用现金 ¥{cash.toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const isLeading = item.leading_team_id === teamId;
          const minBid = item.current_price + Math.max(item.base_price * 0.05, 500);

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-4 transition-colors ${
                isLeading ? 'border-success/50 bg-success/10' : 'border-border-subtle bg-background'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-xs text-foreground-muted mt-1">
                    {item.item_type === 'production' && `产能 +${item.effect.capacity_bonus || 0}`}
                    {item.item_type === 'advertising' && `${item.effect.city} Show ×${item.effect.show_multiplier || 1}`}
                    {item.item_type === 'discount' && `原材料成本 -${Math.round((item.effect.material_cost_discount || 0) * 100)}%`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">¥{item.current_price.toLocaleString()}</div>
                  <div className="text-[10px] text-foreground-muted">
                    {item.leading_team_name ? `领先：${item.leading_team_name}` : '暂无出价'}
                  </div>
                </div>
              </div>

              {item.status === 'settled' ? (
                <div className="mt-3 text-xs text-foreground-muted">
                  {item.leading_team_id ? `成交：${item.leading_team_name} ¥${item.final_price?.toLocaleString()}` : '流拍'}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <div className="relative flex-1">
                    <TrendingUp className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                    <input
                      type="number"
                      value={amounts[item.id] || ''}
                      onChange={(e) => setAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder={`最低 ¥${Math.ceil(minBid).toLocaleString()}`}
                      className="w-full rounded-lg border border-border-subtle bg-background pl-8 pr-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBid(item)}
                    disabled={!amounts[item.id] || Number(amounts[item.id]) <= item.current_price || Number(amounts[item.id]) > cash}
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
