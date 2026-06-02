import { ArrowLeft, Clock } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  onExit?: () => void;
  exitLabel?: string;
  center?: ReactNode;
  right?: ReactNode;
};

export default function TvHud({
  title,
  subtitle,
  onExit,
  exitLabel,
  center,
  right,
}: Props) {
  return (
    <header className="shrink-0 border-b border-border-subtle bg-background-secondary/90 backdrop-blur-md px-4 py-2.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-[220px]">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="p-2 rounded-lg hover:bg-background-hover text-foreground-muted"
              title={exitLabel || '返回'}
              aria-label={exitLabel || '返回'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-[11px] text-foreground-muted truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-foreground-muted min-w-[220px] justify-center">
          {center ?? (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>—</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm min-w-[220px] justify-end">
          {right}
        </div>
      </div>
    </header>
  );
}

