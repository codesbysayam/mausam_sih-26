// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Forecast Answer Card Component
// ====================================================================

import React from 'react';
import { ForecastContext } from '../../types/askMausam';

interface ForecastAnswerProps {
  forecast?: ForecastContext;
  locationName: string;
}

export const ForecastAnswer: React.FC<ForecastAnswerProps> = ({ forecast, locationName }) => {
  if (!forecast || !forecast.daily || forecast.daily.length === 0) return null;

  return (
    <div className="mt-2.5 p-3.5 sm:p-4 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col gap-3 text-[var(--m-text-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--m-border)]">
        <div>
          <span className="text-[11px] font-bold text-[var(--m-accent)] uppercase tracking-wider">
            7-Day Synoptic Outlook
          </span>
          <h3 className="text-sm font-semibold text-white mt-0.5">{locationName}</h3>
        </div>
      </div>

      {/* Daily Outlook Strip */}
      <div className="flex flex-col gap-1.5">
        {forecast.daily.slice(0, 5).map((d) => (
          <div
            key={d.date}
            className="p-2 sm:p-2.5 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-center justify-between gap-2 text-xs"
          >
            <div className="w-20 shrink-0">
              <span className="font-semibold text-white">{d.dayName}</span>
              <span className="block text-[10px] text-[var(--m-text-muted)]">{d.date.slice(5)}</span>
            </div>

            <div className="flex-1 truncate">
              <span className="text-white font-medium truncate block">{d.condition}</span>
              {d.precipitationProbability > 0 && (
                <span className="text-[10px] text-[var(--m-accent)] font-mono">
                  {d.precipitationProbability}% rain ({d.precipitationMm} mm)
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 font-mono text-right shrink-0">
              <span className="font-bold text-white">{d.maxTempC}°</span>
              <span className="text-[var(--m-text-muted)]">/</span>
              <span className="text-[var(--m-text-muted)]">{d.minTempC}°C</span>
            </div>
          </div>
        ))}
      </div>

      {forecast.synopsis && (
        <p className="text-xs text-[var(--m-text-muted)] bg-[var(--m-surface-1)] p-2.5 rounded-lg border border-[var(--m-border)] leading-relaxed">
          {forecast.synopsis}
        </p>
      )}
    </div>
  );
};
