import React from 'react';
import { AlertTriangle, Layers, Loader2, RefreshCw, WifiOff } from 'lucide-react';

export interface MapLoadingOverlayProps {
  visible: boolean;
  label?: string;
}

export const MapLoadingOverlay: React.FC<MapLoadingOverlayProps> = ({
  visible,
  label = 'Loading geospatial frames…',
}) => {
  if (!visible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute top-3 left-1/2 -translate-x-1/2 z-[460] pointer-events-none px-3 py-1.5 rounded-lg bg-[var(--m-surface-inset)]/95 backdrop-blur-md border border-[var(--m-border)] shadow-lg flex items-center gap-2 text-[11px] font-mono text-[var(--m-text-primary)] whitespace-nowrap"
    >
      <Loader2 className="w-3.5 h-3.5 text-[var(--m-accent)] animate-spin shrink-0" />
      <span>{label}</span>
    </div>
  );
};

export interface MapErrorOverlayProps {
  message: string | null;
  onRetry?: () => void;
  severity?: 'warning' | 'error';
}

export const MapErrorOverlay: React.FC<MapErrorOverlayProps> = ({
  message,
  onRetry,
  severity = 'warning',
}) => {
  if (!message) return null;
  const isError = severity === 'error';
  return (
    <div
      role="alert"
      className={`absolute top-14 left-3 right-3 sm:right-auto sm:max-w-md z-[455] pointer-events-auto px-3 py-2 rounded-lg backdrop-blur-md border shadow-lg flex items-center justify-between gap-2.5 text-[11px] ${
        isError
          ? 'bg-[#2A1417]/95 border-[#EF4444]/45 text-[#FCA5A5]'
          : 'bg-[#261E10]/95 border-[#F59E0B]/45 text-[#FDE68A]'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isError ? (
          <WifiOff className="w-3.5 h-3.5 shrink-0 text-[#F87171]" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#FBBF24]" />
        )}
        <span className="truncate">{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-white font-mono text-[10px] font-semibold shrink-0 cursor-pointer whitespace-nowrap"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  );
};

export interface MapOpacitySliderProps {
  opacity: number;
  onChange: (nextOpacity: number) => void;
  label?: string;
  className?: string;
}

export const MapOpacitySlider: React.FC<MapOpacitySliderProps> = ({
  opacity,
  onChange,
  label = 'Overlay',
  className = '',
}) => {
  const pct = Math.round(Math.max(0.2, Math.min(1, opacity)) * 100);
  return (
    <label
      className={`inline-flex items-center gap-2 px-2.5 h-9 rounded-lg bg-[var(--m-surface-inset)]/95 backdrop-blur-md border border-[var(--m-border)] text-[10px] font-mono text-[var(--m-text-secondary)] shadow-lg ${className}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Layers className="w-3.5 h-3.5 text-[var(--m-accent)] shrink-0" />
      <span className="hidden sm:inline whitespace-nowrap">{label}</span>
      <input
        type="range"
        min={20}
        max={100}
        step={5}
        value={pct}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        aria-label={`${label} opacity (${pct}%)`}
        className="w-16 sm:w-20 h-1.5 accent-[var(--m-accent)] cursor-pointer"
      />
      <span className="tabular-nums text-[var(--m-text-primary)] font-semibold w-8 text-right">
        {pct}%
      </span>
    </label>
  );
};
