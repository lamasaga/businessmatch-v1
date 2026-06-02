import { Newspaper, Sparkles } from 'lucide-react';
import type { TvNewsItem } from '../../types/techventure';

export default function TvNewsPanel({
  news,
  onReload,
}: {
  news: TvNewsItem[];
  onReload?: () => void;
}) {
  return (
    <section className="glass-card overflow-hidden min-h-0 flex flex-col">
      <div className="shrink-0 px-3 py-2 border-b border-border-subtle flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-blue-400" />
          赛场快讯
        </h2>
        {onReload && (
          <button type="button" onClick={onReload} className="text-xs text-primary hover:underline">
            刷新
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-2">
        {news.length === 0 && (
          <p className="text-center text-foreground-muted text-xs py-6">暂无赛场快讯</p>
        )}
        {news.map((item) => (
          <div key={item.id} className="rounded-lg bg-background-secondary p-3 border border-border-subtle">
            <p className="font-medium text-sm flex gap-1">
              <Sparkles className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
              {item.headline}
            </p>
            <p className="text-xs text-foreground-muted mt-1">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

