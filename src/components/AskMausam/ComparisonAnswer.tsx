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
    <div className="mt-2.5 p-3.5 sm:p-4 rounded-xl bg-[#08131F] border border-[#26394B] flex flex-col gap-3 text-[#B5C3D1]">
      <div className="flex items-center justify-between pb-2 border-b border-[#26394B] gap-2">
        <div>
          <span className="text-[10px] font-mono font-bold text-[#35C7E8] uppercase tracking-wider">
            Comparative Meteorological Analysis
          </span>
          <h3 className="text-sm font-semibold text-[#F3F6FA] mt-0.5">
            {locationA.name} vs {locationB.name}
          </h3>
        </div>
        {winnerLabel && (
          <span className="px-2 py-0.5 rounded bg-[#35C7E8]/12 text-[#35C7E8] text-xs font-mono font-semibold border border-[#35C7E8]/35 shrink-0">
            {winnerLabel}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs tabular-nums">
        <div className="p-3 rounded-lg bg-[#0B1927] border border-[#26394B] flex flex-col gap-1.5">
          <span className="font-bold text-[#F3F6FA] truncate">{locationA.name}</span>
          <span className="text-2xl font-extrabold text-[#35C7E8] font-mono">
            {typeof locationA.temperatureC === 'number' ? `${locationA.temperatureC}°C` : '—'}
          </span>
          <span className="text-[11px] text-[#8295A8]">{locationA.condition || '—'}</span>
          {typeof locationA.aqi === 'number' && (
            <span className="text-[10px] font-mono text-[#B5C3D1] mt-1">
              AQI: {locationA.aqi}
            </span>
          )}
        </div>

        <div className="p-3 rounded-lg bg-[#0B1927] border border-[#26394B] flex flex-col gap-1.5">
          <span className="font-bold text-[#F3F6FA] truncate">{locationB.name}</span>
          <span className="text-2xl font-extrabold text-[#35C7E8] font-mono">
            {typeof locationB.temperatureC === 'number' ? `${locationB.temperatureC}°C` : '—'}
          </span>
          <span className="text-[11px] text-[#8295A8]">{locationB.condition || '—'}</span>
          {typeof locationB.aqi === 'number' && (
            <span className="text-[10px] font-mono text-[#B5C3D1] mt-1">
              AQI: {locationB.aqi}
            </span>
          )}
        </div>
      </div>

      {summary && (
        <p className="text-xs text-[#B5C3D1] bg-[#0B1927] p-2.5 rounded-lg border border-[#26394B] leading-relaxed">
          {summary}
        </p>
      )}

      <div className="text-[10px] font-mono text-[#8295A8] pt-1 border-t border-[#26394B]">
        Telemetry synchronized from verified surface observations and point models.
      </div>
    </div>
  );
};
