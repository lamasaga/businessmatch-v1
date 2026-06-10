import { useState } from 'react';
import type { OpsCategory, OpsSegment, OpsCategoryConfig, OpsSegmentConfig } from '../../types/ops';

interface Props {
  categories: Record<string, OpsCategoryConfig>;
  segments: Record<string, OpsSegmentConfig>;
  onSubmit: (payload: { product_name: string; category: OpsCategory; target_segment: OpsSegment }) => void;
  submitting: boolean;
}

export default function ProductPositioningPanel({ categories, segments, onSubmit, submitting }: Props) {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<OpsCategory>('home');
  const [targetSegment, setTargetSegment] = useState<OpsSegment>('pragmatic');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) return;
    onSubmit({ product_name: productName.trim(), category, target_segment: targetSegment });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border-subtle bg-background-secondary p-6 space-y-6">
      <h2 className="text-xl font-bold">产品定位</h2>
      <p className="text-sm text-foreground-muted">选择你的产品品类和目标客群，这将影响你的成本结构和市场偏好。</p>

      <div className="space-y-2">
        <label className="text-sm font-semibold">产品名称</label>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="例如：智享台灯"
          className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">产品品类</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(categories).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key as OpsCategory)}
              className={`text-left rounded-xl border p-3 transition-colors ${
                category === key
                  ? 'border-primary/50 bg-primary/15'
                  : 'border-border-subtle bg-background hover:bg-background-hover'
              }`}
            >
              <div className="text-sm font-semibold">{cfg.name}</div>
              <div className="text-xs text-foreground-muted mt-1">
                原料 ¥{cfg.base_material_cost} · 人工 ¥{cfg.base_labor_cost}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">目标客群</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(segments).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTargetSegment(key as OpsSegment)}
              className={`text-left rounded-xl border p-3 transition-colors ${
                targetSegment === key
                  ? 'border-primary/50 bg-primary/15'
                  : 'border-border-subtle bg-background hover:bg-background-hover'
              }`}
            >
              <div className="text-sm font-semibold">{cfg.name}</div>
              <div className="text-xs text-foreground-muted mt-1">
                Tech {Math.round(cfg.tech_weight * 100)}% · Fit {Math.round(cfg.fit_weight * 100)}% · Show {Math.round(cfg.show_weight * 100)}%
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !productName.trim()}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? '提交中...' : '确认定位'}
      </button>
    </form>
  );
}
