import React from 'react';
import { RefreshCw, Clock, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export type LiveDataStatus = 'live' | 'updating' | 'stale' | 'unavailable' | 'error';

interface LiveDataIndicatorProps {
  status: LiveDataStatus;
  fetchedAt?: string | Date;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
  showSource?: boolean;
  sourceLabel?: string;
}

export const LiveDataIndicator: React.FC<LiveDataIndicatorProps> = ({
  status,
  fetchedAt,
  onRefresh,
  isRefreshing = false,
  className = '',
  showSource = true,
  sourceLabel = 'Upstream Feed',
}) => {
  const formatTime = (timeStr?: string | Date) => {
    if (!timeStr) return '';
    try {
      const d = typeof timeStr === 'string' ? new Date(timeStr) : timeStr;
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return '';
    }
  };

  const formattedTime = formatTime(fetchedAt);

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 text-xs font-mono rounded-lg px-2.5 py-1.5 border transition-colors ${
        status === 'live'
          ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/30'
          : status === 'updating'
          ? 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/30'
          : status === 'stale'
          ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/30'
          : 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/30'
      } ${className}`}
    >
      <span className="font-semibold tracking-wide uppercase">
        {status === 'live' && 'LIVE'}
        {status === 'updating' && 'UPDATING…'}
        {status === 'stale' && 'STALE CACHE'}
        {status === 'unavailable' && 'UNAVAILABLE'}
        {status === 'error' && 'DISCONNECTED'}
      </span>

      {formattedTime && (
        <span className="text-[var(--m-text-secondary)] flex items-center gap-1 border-l border-[var(--m-border)] pl-2">
          <Clock className="w-3 h-3 text-[var(--m-text-muted)]" />
          <span>{status === 'stale' ? `Last success: ${formattedTime} IST` : `Updated: ${formattedTime} IST`}</span>
        </span>
      )}

      {showSource && (
        <span className="text-[11px] text-[var(--m-text-muted)] font-sans hidden sm:inline">
          ({sourceLabel})
        </span>
      )}

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="ml-1 p-0.5 text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] m-focus-ring transition-colors disabled:opacity-50 cursor-pointer"
          title={`Refresh ${sourceLabel}`}
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-[var(--m-accent)]' : ''}`} />
        </button>
      )}
    </div>
  );
};
export default LiveDataIndicator;
