import { Newspaper, Sparkles, Flame } from 'lucide-react';
import type { TvNewsItem } from '../../types/techventure';

export default function TvNewsPanel({
  news,
  onReload,
}: {
  news: TvNewsItem[];
  onReload?: () => void;
}) {
  const latestId = news[0]?.id;

  return (
    <section className="glass-card overflow-hidden min-h-0 flex flex-col border-t-2 border-t-tv-primary/50 flex-1">
      <div className="shrink-0 px-3 py-2 border-b border-border-subtle flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-tv-primary" />
          赛场快讯
        </h2>
        {onReload && (
          <button type="button" onClick={onReload} className="text-xs text-tv-primary hover:underline">
            刷新
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-2">
        {news.length === 0 && (
          <p className="text-center text-foreground-muted text-xs py-6">结算后将推送市场快讯</p>
        )}
        {news.map((item, index) => {
          const isHeadline = item.id === latestId;
          return (
            <div
              key={item.id}
              className={`rounded-lg p-3 border transition-all ${
                isHeadline
                  ? 'border-tv-pathfinder/40 bg-tv-pathfinder/10 shadow-[0_0_16px_rgba(234,179,8,0.08)]'
                  : 'border-border-subtle bg-white shadow-sm'
              }`}
            >
              <p className={`font-medium text-sm flex gap-1.5 ${isHeadline ? 'text-tv-pathfinder' : ''}`}>
                {isHeadline ? (
                  <Flame className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-foreground-muted shrink-0 mt-0.5" />
                )}
                {item.headline}
              </p>
              {item.body && (
                <p className="text-xs text-foreground-muted mt-1 leading-relaxed">{item.body}</p>
              )}
              {index === 0 && news.length > 1 && (
                <p className="text-[9px] text-tv-pathfinder mt-2 font-medium">最新头条</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
