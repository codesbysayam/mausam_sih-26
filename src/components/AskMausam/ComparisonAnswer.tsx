// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Multi-Location Weather Comparison Component
// ====================================================================

import React from 'react';
import { LocationWeatherComparison } from '../../types/askMausam';

interface ComparisonAnswerProps {
  comparison?: LocationWeatherComparison;
}

export const ComparisonAnswer: React.FC<ComparisonAnswerProps> = ({ comparison }) => {
  if (!comparison) return null;

  const { locationA, locationB, summary, winnerLabel } = comparison;

  return (
    <div className="mt-2.5 p-3.5 sm:p-4 rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex flex-col gap-3 text-[var(--m-text-secondary)]">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--m-border)] gap-2">
        <div>
          <span className="text-[10px] font-mono font-bold text-[var(--m-accent)] uppercase tracking-wider">
            Comparative Meteorological Analysis
          </span>
          <h3 className="text-sm font-semibold text-[var(--m-text-primary)] mt-0.5">
            {locationA.name} vs {locationB.name}
          </h3>
        </div>
        {winnerLabel && (
          <span className="px-2 py-0.5 rounded bg-[var(--m-accent-soft)] text-[var(--m-accent)] text-xs font-mono font-semibold border border-[var(--m-accent)]/35 shrink-0">
            {winnerLabel}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs tabular-nums">
        <div className="p-3 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col gap-1.5">
          <span className="font-bold text-[var(--m-text-primary)] truncate">{locationA.name}</span>
          <span className="text-2xl font-extrabold text-[var(--m-accent)] font-mono">
            {typeof locationA.temperatureC === 'number' ? `${locationA.temperatureC}°C` : '—'}
          </span>
          <span className="text-[11px] text-[var(--m-text-muted)]">{locationA.condition || '—'}</span>
          {typeof locationA.aqi === 'number' && (
            <span className="text-[10px] font-mono text-[var(--m-text-secondary)] mt-1">
              AQI: {locationA.aqi}
            </span>
          )}
        </div>

        <div className="p-3 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col gap-1.5">
          <span className="font-bold text-[var(--m-text-primary)] truncate">{locationB.name}</span>
          <span className="text-2xl font-extrabold text-[var(--m-accent)] font-mono">
            {typeof locationB.temperatureC === 'number' ? `${locationB.temperatureC}°C` : '—'}
          </span>
          <span className="text-[11px] text-[var(--m-text-muted)]">{locationB.condition || '—'}</span>
          {typeof locationB.aqi === 'number' && (
            <span className="text-[10px] font-mono text-[var(--m-text-secondary)] mt-1">
              AQI: {locationB.aqi}
            </span>
          )}
        </div>
      </div>

      {summary && (
        <p className="text-xs text-[var(--m-text-secondary)] bg-[var(--m-surface-1)] p-2.5 rounded-lg border border-[var(--m-border)] leading-relaxed">
          {summary}
        </p>
      )}

      <div className="text-[10px] font-mono text-[var(--m-text-muted)] pt-1 border-t border-[var(--m-border)]">
        Telemetry synchronized from verified surface observations and point models.
      </div>
    </div>
  );
};
