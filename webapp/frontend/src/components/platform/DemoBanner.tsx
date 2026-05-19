import { Link } from 'react-router-dom';
import { Presentation, Play, X } from 'lucide-react';
import { useCareerStore } from '../../stores/careerStore';
import { useState } from 'react';

export default function DemoBanner() {
  const { demoMode, enableDemoMode, resetDemo } = useCareerStore();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed && !demoMode) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-start gap-3 flex-1">
        <Presentation className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">MVP 演示模式</p>
          <p className="text-sm text-foreground-muted mt-0.5">
            面向参观解说的可交互原型：五域一体 · 生涯主线 · Athena / Demia / Rival。数据为模拟，无需后端。
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/showcase"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-slate-900 text-sm font-semibold hover:bg-amber-400"
        >
          <Presentation className="w-4 h-4" />
          解说路线
        </Link>
        {!demoMode ? (
          <button
            type="button"
            onClick={() => enableDemoMode()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
          >
            <Play className="w-4 h-4" />
            一键开启生涯
          </button>
        ) : (
          <button
            type="button"
            onClick={resetDemo}
            className="px-4 py-2 rounded-lg border border-border-subtle text-sm text-foreground-secondary"
          >
            重置演示
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-2 rounded-lg hover:bg-background-hover"
          aria-label="关闭"
        >
          <X className="w-4 h-4 text-foreground-muted" />
        </button>
      </div>
    </div>
  );
}
