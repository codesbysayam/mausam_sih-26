// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Agromet & Agricultural Advisory Answer Component
// ====================================================================

import React from 'react';
import { AgricultureContext } from '../../types/askMausam';

interface AgricultureAnswerProps {
  agriculture?: AgricultureContext;
  locationName: string;
}

export const AgricultureAnswer: React.FC<AgricultureAnswerProps> = ({ agriculture, locationName }) => {
  if (!agriculture) return null;

  const isOptimal = agriculture.spraySuitability === 'OPTIMAL';
  const isModerate = agriculture.spraySuitability === 'MODERATE';

  const badgeColor = isOptimal
    ? 'text-[var(--m-ok)] bg-[var(--m-ok-soft)] border-[#10B981]/30'
    : isModerate
    ? 'text-[var(--m-watch)] bg-[var(--m-watch-soft)] border-[var(--m-watch)]/30'
    : 'text-[var(--m-danger)] bg-[var(--m-danger-soft)] border-[var(--m-danger)]/30';

  const badgeLabel = isOptimal
    ? 'Optimal Spray Window'
    : isModerate
    ? 'Moderate Caution Window'
    : 'Spraying Not Recommended';

  return (
    <div className="mt-2.5 p-3.5 sm:p-4 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col gap-3 text-[var(--m-text-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--m-border)]">
        <div>
          <span className="text-[11px] font-bold text-[var(--m-ok)] uppercase tracking-wider">
            Agromet Farming Intelligence
          </span>
          <h3 className="text-sm font-semibold text-white mt-0.5">{locationName}</h3>
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeColor}`}>
          {badgeLabel}
        </span>
      </div>

      {/* Advisory Text */}
      <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed bg-[var(--m-surface-1)] p-2.5 rounded-lg border border-[var(--m-border)]">
        {agriculture.advisoryText}
      </p>

      {/* Soil & Environmental Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {agriculture.soilMoisture0To1cm !== undefined && (
          <div className="p-2 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col">
            <span className="text-[10px] text-[var(--m-text-muted)]">Soil Moisture (0–1cm)</span>
            <span className="font-semibold text-white font-mono mt-0.5">
              {Math.round(agriculture.soilMoisture0To1cm * 100)}%
            </span>
          </div>
        )}
        {agriculture.soilTemperatureC !== undefined && (
          <div className="p-2 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col">
            <span className="text-[10px] text-[var(--m-text-muted)]">Soil Temperature</span>
            <span className="font-semibold text-white font-mono mt-0.5">
              {agriculture.soilTemperatureC}°C
            </span>
          </div>
        )}
        {agriculture.evapotranspirationMm !== undefined && (
          <div className="p-2 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col">
            <span className="text-[10px] text-[var(--m-text-muted)]">Reference ET0</span>
            <span className="font-semibold text-white font-mono mt-0.5">
              {agriculture.evapotranspirationMm} mm/day
            </span>
          </div>
        )}
      </div>

      <div className="text-[10px] text-[var(--m-text-muted)] pt-1.5 border-t border-[var(--m-border)]">
        Source: ICAR / IMD Agromet Advisory Network & Numerical Telemetry
      </div>
    </div>
  );
};
