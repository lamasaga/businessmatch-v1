import { ArrowLeft, Clock, Rocket } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  onExit?: () => void;
  exitLabel?: string;
  center?: ReactNode;
  right?: ReactNode;
  statusLabel?: string;
  statusProgress?: number; // 0-100
  isSubmitted?: boolean;
};

export default function TvHud({
  title,
  subtitle,
  onExit,
  exitLabel,
  center,
  right,
  statusLabel,
  statusProgress = 0,
  isSubmitted = false,
}: Props) {
  return (
    <header className="shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-[220px]">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="p-1.5 rounded-lg hover:bg-tv-primary/10 text-foreground-muted transition-colors"
              title={exitLabel || '返回'}
              aria-label={exitLabel || '返回'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-tv-primary/10 border border-tv-primary/25 flex items-center justify-center shadow-[0_8px_18px_rgba(37,99,235,0.1)]">
              <Rocket className="w-4 h-4 text-tv-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-tight truncate text-transparent bg-clip-text bg-gradient-to-r from-tv-primary to-tv-pathfinder">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[10px] text-foreground-muted truncate">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-foreground-muted min-w-[220px] justify-center">
          {center ?? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tv-primary/10 border border-tv-primary/20">
              <Clock className="w-3.5 h-3.5 text-tv-primary" />
              <span className="text-tv-primary font-medium">{statusLabel || '等待中'}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm min-w-[220px] justify-end">
          {right}
        </div>
      </div>

      {/* 底部进度条 */}
      <div className="mt-1.5 flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isSubmitted ? 'bg-success shadow-[0_0_10px_rgba(45,212,160,0.35)]' : 'bg-tv-primary shadow-[0_0_10px_rgba(37,99,235,0.28)]'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, statusProgress))}%` }}
          />
        </div>
        <span className={`text-[10px] font-medium ${isSubmitted ? 'text-success' : 'text-tv-primary'}`}>
          {isSubmitted ? '已提交' : '未提交'}
        </span>
      </div>
    </header>
  );
}
