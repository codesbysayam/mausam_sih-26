import React, { useState, useMemo } from 'react';
import { Clock, Flame, CloudRain, Wind } from 'lucide-react';
import { NWPForecastPoint } from '../../types/nwp';
import { DataPanel, SectionHeading, UnavailableState } from '../ui/ObservatoryPrimitives';

interface HourlyForecastTableProps {
  points: NWPForecastPoint[];
  modelName: string;
}

export const HourlyForecastTable: React.FC<HourlyForecastTableProps> = ({
  points,
  modelName,
}) => {
  const [horizonFilter, setHorizonFilter] = useState<24 | 48 | 72 | 168>(24);

  const displayedPoints = useMemo(() => points.slice(0, horizonFilter), [points, horizonFilter]);

  const highlights = useMemo(() => {
    if (displayedPoints.length === 0) return { maxTemp: null, maxRain: null, maxWind: null };

    let maxTemp = -Infinity;
    let maxRain = 0;
    let maxWind = 0;

    displayedPoints.forEach((p) => {
      if (typeof p.temperature2m === 'number' && p.temperature2m > maxTemp) maxTemp = p.temperature2m;
      if (typeof p.precipitation === 'number' && p.precipitation > maxRain) maxRain = p.precipitation;
      if (typeof p.windSpeed10m === 'number' && p.windSpeed10m > maxWind) maxWind = p.windSpeed10m;
    });

    return {
      maxTemp: maxTemp > -Infinity ? maxTemp : null,
      maxRain: maxRain > 0 ? maxRain : null,
      maxWind: maxWind > 0 ? maxWind : null,
    };
  }, [displayedPoints]);

  const formatHour = (isoTime: string) => {
    try {
      const d = new Date(isoTime);
      if (isNaN(d.getTime())) return isoTime;
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return isoTime;
    }
  };

  const formatDateLabel = (isoTime: string) => {
    try {
      const d = new Date(isoTime);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (points.length === 0) {
    return (
      <DataPanel className="flex flex-col gap-3">
        <SectionHeading
          title={`Hourly Model Forecast — ${modelName}`}
          icon={<Clock className="w-4 h-4" />}
        />
        <UnavailableState
          title={`No Hourly Forecast Points Available for ${modelName}`}
          reason="This model feed is currently unconfigured or did not return hourly numerical steps for this cycle."
        />
      </DataPanel>
    );
  }

  return (
    <DataPanel className="flex flex-col gap-4">
      <SectionHeading
        title={`Hourly Model Forecast — ${modelName}`}
        subtitle={`Discrete hourly grid values across ${displayedPoints.length}h`}
        icon={<Clock className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-1 bg-[var(--m-surface-inset)] p-1 rounded-lg border border-[var(--m-border)] text-xs font-mono">
            {([
              { label: '24H', val: 24 },
              { label: '48H', val: 48 },
              { label: '72H', val: 72 },
              { label: '7D', val: 168 },
            ] as const).map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setHorizonFilter(opt.val)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs font-medium ${
                  horizonFilter === opt.val
                    ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)] font-semibold'
                    : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {(highlights.maxTemp !== null || highlights.maxRain !== null || highlights.maxWind !== null) && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[var(--m-text-secondary)] tabular-nums">
          <span className="text-[var(--m-text-muted)] font-sans">Horizon Peaks:</span>
          {highlights.maxTemp !== null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[var(--m-watch)]">
              <Flame className="w-3 h-3 text-[var(--m-watch)]" />
              <span>Peak Temp {highlights.maxTemp}°C</span>
            </span>
          )}
          {highlights.maxRain !== null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[var(--m-ok)]">
              <CloudRain className="w-3 h-3 text-[var(--m-ok)]" />
              <span>Max Rain {highlights.maxRain} mm/h</span>
            </span>
          )}
          {highlights.maxWind !== null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[var(--m-accent)]">
              <Wind className="w-3 h-3 text-[var(--m-accent)]" />
              <span>Max Wind {highlights.maxWind} km/h</span>
            </span>
          )}
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-xl border border-[var(--m-border)] bg-[var(--m-surface-inset)] no-scrollbar">
        <table className="w-full text-left text-xs border-collapse font-mono tabular-nums">
          <thead className="bg-[var(--m-surface-1)] text-[10px] uppercase tracking-wider text-[var(--m-text-muted)] border-b border-[var(--m-border)]">
            <tr>
              <th className="py-2.5 px-3 sticky left-0 bg-[var(--m-surface-1)] z-10">Time</th>
              <th className="py-2.5 px-3">Temp</th>
              <th className="py-2.5 px-3">Feels</th>
              <th className="py-2.5 px-3">Rain</th>
              <th className="py-2.5 px-3">Rain %</th>
              <th className="py-2.5 px-3">Wind</th>
              <th className="py-2.5 px-3">Gust</th>
              <th className="py-2.5 px-3">Pressure</th>
              <th className="py-2.5 px-3">Humidity</th>
              <th className="py-2.5 px-3 text-right">Cloud</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--m-border-strong)] text-[var(--m-text-secondary)]">
            {displayedPoints.map((pt, idx) => {
              const dateLabel = formatDateLabel(pt.validTime);
              const hourLabel = formatHour(pt.validTime);
              const isFirstHourOfDay = idx === 0 || hourLabel === '00:00';
              const isEven = idx % 2 === 0;

              const isMaxTemp = highlights.maxTemp !== null && pt.temperature2m === highlights.maxTemp;
              const isMaxRain = highlights.maxRain !== null && pt.precipitation === highlights.maxRain;
              const isMaxWind = highlights.maxWind !== null && pt.windSpeed10m === highlights.maxWind;

              return (
                <tr
                  key={idx}
                  className={`hover:bg-[var(--m-surface-3)]/60 transition-colors ${
                    isEven ? 'bg-[var(--m-surface-1)]/50' : 'bg-[var(--m-surface-inset)]'
                  }`}
                >
                  <td
                    className={`py-2 px-3 whitespace-nowrap sticky left-0 z-10 font-semibold text-[var(--m-text-primary)] border-r border-[var(--m-border)]/70 ${
                      isEven ? 'bg-[var(--m-surface-1)]' : 'bg-[var(--m-surface-inset)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{hourLabel}</span>
                      {isFirstHourOfDay && dateLabel && (
                        <span className="text-[9px] text-[var(--m-accent)] bg-[var(--m-surface-2)] px-1 py-0.5 rounded border border-[var(--m-border)] font-normal">
                          {dateLabel}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap">
                    <span
                      className={
                        isMaxTemp
                          ? 'text-[var(--m-watch)] font-bold bg-[var(--m-watch-soft)] px-1.5 py-0.5 rounded'
                          : 'text-[var(--m-text-primary)] font-medium'
                      }
                    >
                      {pt.temperature2m !== undefined ? `${pt.temperature2m}°` : '—'}
                    </span>
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap text-[var(--m-text-muted)]">
                    {pt.apparentTemperature !== undefined ? `${pt.apparentTemperature}°` : '—'}
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap">
                    {pt.precipitation !== undefined ? (
                      <span
                        className={
                          isMaxRain
                            ? 'text-[var(--m-ok)] font-bold bg-[var(--m-ok-soft)] px-1.5 py-0.5 rounded'
                            : pt.precipitation > 0
                            ? 'text-[var(--m-accent)] font-semibold'
                            : 'text-[var(--m-text-muted)]'
                        }
                      >
                        {pt.precipitation} mm
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap">
                    {pt.precipitationProbability !== undefined ? (
                      <span
                        className={
                          pt.precipitationProbability >= 50
                            ? 'text-[var(--m-accent)] font-bold'
                            : pt.precipitationProbability > 0
                            ? 'text-[var(--m-text-secondary)]'
                            : 'text-[var(--m-text-muted)]'
                        }
                      >
                        {pt.precipitationProbability}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap">
                    {pt.windSpeed10m !== undefined ? (
                      <span
                        className={
                          isMaxWind
                            ? 'text-[var(--m-accent)] font-bold bg-[var(--m-accent-soft)] px-1.5 py-0.5 rounded'
                            : 'text-[var(--m-text-primary)]'
                        }
                      >
                        {pt.windSpeed10m} km/h
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap text-[var(--m-text-muted)]">
                    {pt.windGusts10m !== undefined ? `${pt.windGusts10m} km/h` : '—'}
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap text-[var(--m-text-secondary)]">
                    {pt.pressureMSL !== undefined ? `${pt.pressureMSL} hPa` : '—'}
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap text-[var(--m-text-secondary)]">
                    {pt.relativeHumidity !== undefined ? `${pt.relativeHumidity}%` : '—'}
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap text-right text-[var(--m-text-secondary)]">
                    {pt.cloudCover !== undefined ? `${pt.cloudCover}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DataPanel>
  );
};
