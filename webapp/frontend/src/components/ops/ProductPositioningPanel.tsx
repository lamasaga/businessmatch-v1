import { useState } from 'react';
import { Building2, Lightbulb, Users, ArrowRight, Check } from 'lucide-react';
import type { OpsCategory, OpsSegment, OpsCategoryConfig, OpsSegmentConfig } from '../../types/ops';

interface Props {
  categories: Record<string, OpsCategoryConfig>;
  segments: Record<string, OpsSegmentConfig>;
  onSubmit: (payload: { product_name: string; category: OpsCategory; target_segment: OpsSegment }) => void;
  submitting: boolean;
}

const CATEGORY_META: Record<string, { icon: string; tagline: string }> = {
  electronics: { icon: '⚡', tagline: '高毛利，重研发' },
  fast_moving: { icon: '🧴', tagline: '高频消费，重渠道' },
  home: { icon: '🏠', tagline: '稳健需求，重品牌' },
};

const SEGMENT_META: Record<string, { icon: string; tagline: string }> = {
  geek: { icon: '🤖', tagline: '追求参数与性能' },
  pragmatic: { icon: '🧮', tagline: '重视性价比' },
  show: { icon: '✨', tagline: '在意形象与体验' },
};

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
    <form onSubmit={handleSubmit} className="rounded-2xl border border-ops-primary/20 bg-background-secondary/60 p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ops-primary/15 border border-ops-primary/30 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-ops-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">产品定位</h2>
            <p className="text-sm text-foreground-muted">选择品类与目标客群，决定你的成本结构和市场偏好。</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting || !productName.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-ops-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-ops-primary/90 disabled:opacity-50 shadow-[0_0_20px_rgba(59,130,246,0.18)] transition-all"
        >
          {submitting ? '提交中...' : <><PlayIcon /> <span>开始经营</span></>}
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="w-4 h-4 text-ops-primary" /> 产品名称
        </label>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="例如：智享台灯"
          className="w-full rounded-xl border border-ops-primary/20 bg-background px-4 py-3 text-sm focus:outline-none focus:border-ops-primary/60 focus:ring-1 focus:ring-ops-primary/30 transition-all"
          required
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-semibold">产品品类</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(categories).map(([key, cfg]) => {
            const selected = category === key;
            const meta = CATEGORY_META[key] || { icon: '📦', tagline: '' };
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key as OpsCategory)}
                className={`relative text-left rounded-xl border p-4 transition-all duration-200 ${
                  selected
                    ? 'border-ops-primary bg-ops-primary/15 shadow-[0_0_20px_rgba(59,130,246,0.12)]'
                    : 'border-border-subtle bg-background/60 hover:border-ops-primary/30 hover:bg-background-hover'
                }`}
              >
                {selected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-ops-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="text-2xl mb-2">{meta.icon}</div>
                <div className="text-sm font-bold">{cfg.name}</div>
                <div className="text-[11px] text-foreground-muted mt-1">{meta.tagline}</div>
                <div className="mt-3 pt-3 border-t border-border-subtle space-y-1 text-[11px] text-foreground-muted">
                  <div className="flex justify-between"><span>原料</span><span>¥{cfg.base_material_cost}</span></div>
                  <div className="flex justify-between"><span>人工</span><span>¥{cfg.base_labor_cost}</span></div>
                  <div className="flex justify-between"><span>管理</span><span>¥{cfg.base_overhead}</span></div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-ops-primary" /> 目标客群
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(segments).map(([key, cfg]) => {
            const selected = targetSegment === key;
            const meta = SEGMENT_META[key] || { icon: '👤', tagline: '' };
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTargetSegment(key as OpsSegment)}
                className={`relative text-left rounded-xl border p-4 transition-all duration-200 ${
                  selected
                    ? 'border-ops-primary bg-ops-primary/15 shadow-[0_0_20px_rgba(59,130,246,0.12)]'
                    : 'border-border-subtle bg-background/60 hover:border-ops-primary/30 hover:bg-background-hover'
                }`}
              >
                {selected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-ops-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="text-2xl mb-2">{meta.icon}</div>
                <div className="text-sm font-bold">{cfg.name}</div>
                <div className="text-[11px] text-foreground-muted mt-1">{meta.tagline}</div>
                <div className="mt-3 space-y-1.5">
                  <WeightBar label="Tech" value={cfg.tech_weight} color="bg-ops-primary" />
                  <WeightBar label="Fit" value={cfg.fit_weight} color="bg-success" />
                  <WeightBar label="Show" value={cfg.show_weight} color="bg-ops-auction" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !productName.trim()}
        className="w-full rounded-xl bg-ops-primary px-4 py-3 text-sm font-bold text-white hover:bg-ops-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all"
      >
        {submitting ? '提交中...' : <><span>开始经营</span><ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  );
}

function PlayIcon() {
  return <ArrowRight className="w-4 h-4" />;
}

function WeightBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-8 text-foreground-muted">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-background-secondary overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="text-[10px] w-7 text-right text-foreground-muted">{Math.round(value * 100)}%</span>
    </div>
  );
}
