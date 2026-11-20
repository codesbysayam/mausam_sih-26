import React from 'react';
import { NWPForecastPoint } from '../../types/nwp';
import { Wind, Compass, Navigation } from 'lucide-react';

interface WindPanelProps {
  points: NWPForecastPoint[];
}

export const WindPanel: React.FC<WindPanelProps> = ({ points }) => {
  const first24 = points.slice(0, 24);

  let maxWind = 0;
  let maxGust = 0;
  let maxWindTime = '';
  let avgDirection = 0;

  if (first24.length > 0) {
    first24.forEach((p) => {
      if ((p.windSpeed10m || 0) > maxWind) {
        maxWind = p.windSpeed10m || 0;
        maxWindTime = p.validTime;
      }
      if ((p.windGusts10m || 0) > maxGust) {
        maxGust = p.windGusts10m || 0;
      }
      avgDirection += p.windDirection10m || 0;
    });
    avgDirection = Math.round(avgDirection / first24.length);
  }

  const getCardinal = (deg: number) => {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(((deg % 360) / 22.5)) % 16;
    return dirs[idx];
  };

  const formatHour = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return `${String(d.getHours()).padStart(2, '0')}:00`;
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="flex flex-col gap-3 bg-[var(--m-surface-1)] border border-[var(--m-border)] rounded-[11px] p-4 sm:p-5">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--m-border)]">
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-[var(--weather-wind)]" />
          <h3 className="text-sm font-mono font-bold text-[var(--m-text-primary)] uppercase tracking-wider">
            Wind &amp; Gust Outlook (24-Hour Profile)
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[var(--m-text-muted)] bg-[var(--m-surface-2)] px-2 py-0.5 rounded border border-[var(--m-border)]">
          10-METER LEVEL
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
        {/* Sustained Max */}
        <div className="p-3.5 rounded-[7px] bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-[var(--m-text-muted)]">Peak Sustained Wind</span>
          <span className="text-2xl font-bold font-mono text-[var(--weather-wind)] mt-1 tabular-nums">
            {maxWind} km/h
          </span>
          <span className="text-[10px] text-[var(--m-text-muted)] font-mono">
            {maxWindTime ? `At ${formatHour(maxWindTime)}` : '24h Horizon'}
          </span>
        </div>

        {/* Max Gust */}
        <div className="p-3.5 rounded-[7px] bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-[var(--m-text-muted)]">Maximum Wind Gust</span>
          <span className="text-2xl font-bold font-mono text-[var(--weather-sun)] mt-1 tabular-nums">
            {maxGust > 0 ? `${maxGust} km/h` : '—'}
          </span>
          <span className="text-[10px] text-[var(--m-text-muted)] font-mono">
            Turbulent Kinetic Energy
          </span>
        </div>

        {/* Dominant Vector */}
        <div className="p-3.5 rounded-[7px] bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-[var(--m-text-muted)]">Dominant Direction</span>
          <div className="flex items-center gap-2 mt-1">
            <Navigation
              className="w-4 h-4 text-[var(--m-accent)] transition-transform"
              style={{ transform: `rotate(${avgDirection}deg)` }}
            />
            <span className="text-2xl font-bold font-mono text-[var(--m-text-primary)] tabular-nums">
              {getCardinal(avgDirection)} ({avgDirection}°)
            </span>
          </div>
          <span className="text-[10px] text-[var(--m-text-muted)] font-mono">
            Mean 24h Flow
          </span>
        </div>

        {/* Squall / Convective Risk */}
        <div className="p-3.5 rounded-[7px] bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-[var(--m-text-muted)]">Squall Threshold</span>
          <span className="text-sm font-bold font-mono text-[var(--m-text-primary)] mt-1">
            {maxGust > 45 ? 'Elevated Gust Risk' : 'Normal Gradient Flow'}
          </span>
          <span className="text-[10px] text-[var(--m-text-muted)] font-mono">
            {maxGust > 45 ? 'Convective downburst potential' : 'Boundary layer stability normal'}
          </span>
        </div>
      </div>
    </div>
  );
};
