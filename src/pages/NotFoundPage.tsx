import React from 'react';
import { Home, CloudSun, AlertCircle } from 'lucide-react';
import { MainNavTab } from '../components/layout/MainNavigation';
import { DataPanel } from '../components/ui/ObservatoryPrimitives';

interface NotFoundPageProps {
  onNavigateHome: () => void;
  onNavigateTab: (tab: MainNavTab) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onNavigateHome,
  onNavigateTab,
}) => {
  return (
    <div
      className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6"
      aria-labelledby="not-found-title"
    >
      <DataPanel variant="surface-1" className="w-full max-w-xl p-8 sm:p-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--m-surface-2)] border border-[var(--m-border)] text-xs font-mono font-semibold text-[var(--m-accent)] mb-5">
          <AlertCircle className="w-3.5 h-3.5 text-[var(--m-watch)]" aria-hidden="true" />
          <span>HTTP 404 · ROUTE UNRESOLVED</span>
        </div>

        <h1
          id="not-found-title"
          className="text-6xl sm:text-7xl font-extrabold text-[var(--m-text-primary)] tracking-tight font-mono tabular-nums mb-2"
        >
          404
        </h1>

        <h2 className="text-xl sm:text-2xl font-bold text-[var(--m-text-primary)] mb-3">
          Weather station route not found.
        </h2>

        <p className="text-sm text-[var(--m-text-secondary)] max-w-md mx-auto leading-relaxed mb-8">
          The requested meteorological route or station endpoint does not exist on this observatory portal. Return to the overview or jump directly to live local weather.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            id="not-found-home-btn"
            onClick={onNavigateHome}
            className="w-full sm:w-auto px-6 min-h-[44px] sm:min-h-[40px] rounded-xl bg-[var(--m-accent)] hover:opacity-95 text-[var(--m-on-accent)] font-semibold text-sm transition-opacity flex items-center justify-center gap-2 cursor-pointer m-focus-ring"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Back to MAUSAM</span>
          </button>

          <button
            type="button"
            id="not-found-weather-btn"
            onClick={() => onNavigateTab('weather')}
            className="w-full sm:w-auto px-6 min-h-[44px] sm:min-h-[40px] rounded-xl bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-[var(--m-text-primary)] font-semibold text-sm border border-[var(--m-border)] transition-colors flex items-center justify-center gap-2 cursor-pointer m-focus-ring"
          >
            <CloudSun className="w-4 h-4 text-[var(--m-accent)]" aria-hidden="true" />
            <span>Check Weather</span>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--m-border)] flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--m-text-muted)]">
          <button
            type="button"
            onClick={() => onNavigateTab('warnings')}
            className="hover:text-[var(--m-accent)] transition-colors min-h-[36px] px-2 cursor-pointer"
          >
            Disaster Warnings
          </button>
          <span className="text-[var(--m-border-strong)]" aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => onNavigateTab('radar')}
            className="hover:text-[var(--m-accent)] transition-colors min-h-[36px] px-2 cursor-pointer"
          >
            Doppler Radar
          </button>
          <span className="text-[var(--m-border-strong)]" aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => onNavigateTab('aqi')}
            className="hover:text-[var(--m-accent)] transition-colors min-h-[36px] px-2 cursor-pointer"
          >
            Air Quality (AQI)
          </button>
        </div>
      </DataPanel>
    </div>
  );
};
