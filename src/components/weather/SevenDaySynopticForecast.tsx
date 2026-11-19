import React, { useState, useMemo } from 'react';
import { DailyForecastItem } from '../../types';
import { getWeatherVisualConfig } from '../../utils/weatherIcons';
import { DataPanel, SectionHeading, UnavailableState } from '../ui/ObservatoryPrimitives';
import {
  CalendarDays,
  Droplets,
  Wind,
  Table,
  ChevronDown,
  ChevronUp,
  Flame,
  Thermometer,
  CloudRain,
  Sun,
} from 'lucide-react';

interface SevenDaySynopticForecastProps {
  daily: DailyForecastItem[];
}

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const SevenDaySynopticForecast: React.FC<SevenDaySynopticForecastProps> = ({
  daily = [],
}) => {
  const [showDetailedTable, setShowDetailedTable] = useState(false);

  const { globalMin, globalMax } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    daily.forEach((d) => {
      if (isFiniteNum(d.low) && d.low < min) min = d.low;
      if (isFiniteNum(d.high) && d.high > max) max = d.high;
    });
    if (min === Infinity) min = 15;
    if (max === -Infinity) max = 35;
    return { globalMin: min, globalMax: max };
  }, [daily]);

  const weeklySummary = useMemo(() => {
    if (!daily || daily.length === 0) return null;

    let hottest: { day: string; high: number } | null = null;
    let coolest: { day: string; low: number } | null = null;
    let wettest: { day: string; rainProb: number } | null = null;
    let windiest: { day: string; windVal: number } | null = null;
    let bestDay: { day: string; score: number } | null = null;

    daily.forEach((d) => {
      const h = isFiniteNum(d.high) ? d.high : null;
      const l = isFiniteNum(d.low) ? d.low : null;
      const r = isFiniteNum(d.rainProb) ? d.rainProb : null;
      const windMatch = typeof d.wind === 'string' ? d.wind.match(/\d+/) : null;
      const wVal = windMatch ? parseInt(windMatch[0], 10) : null;

      if (h !== null && (!hottest || h > hottest.high)) hottest = { day: d.day, high: h };
      if (l !== null && (!coolest || l < coolest.low)) coolest = { day: d.day, low: l };
      if (r !== null && (!wettest || r > wettest.rainProb)) wettest = { day: d.day, rainProb: r };
      if (wVal !== null && (!windiest || wVal > windiest.windVal)) windiest = { day: d.day, windVal: wVal };

      if (h !== null && r !== null) {
        let score = 100 - r * 1.2;
        if (h > 35) score -= (h - 35) * 5;
        if (wVal !== null && wVal > 25) score -= (wVal - 25) * 2;
        if (!bestDay || score > bestDay.score) {
          bestDay = { day: d.day, score };
        }
      }
    });

    return {
      hottestDay: hottest ? `${hottest.day} (${Math.round(hottest.high)}°C)` : '—',
      coolestDay: coolest ? `${coolest.day} (${Math.round(coolest.low)}°C)` : '—',
      wettestDay: wettest ? `${wettest.day} (${wettest.rainProb}% prob)` : '—',
      windiestDay: windiest ? `${windiest.day} (${windiest.windVal} km/h)` : '—',
      bestOutdoorDay: bestDay ? `${bestDay.day} (Lowest rain/heat load)` : '—',
    };
  }, [daily]);

  if (!daily || daily.length === 0) {
    return (
      <DataPanel id="seven-day-synoptic-forecast-section" className="h-full">
        <UnavailableState
          title="7-Day Extended Forecast Unavailable"
          reason="Extended daily ensemble guidance is currently unavailable for this location."
          source="Open-Meteo Daily Ensemble"
        />
      </DataPanel>
    );
  }

  return (
    <DataPanel id="seven-day-synoptic-forecast-section" className="flex flex-col gap-4 h-full">
      <SectionHeading
        title="7-Day Extended Synoptic Outlook"
        subtitle="Multi-day thermal envelope, rain probability, and surface wind matrix"
        icon={<CalendarDays className="w-4 h-4" />}
        action={
          <button
            type="button"
            onClick={() => setShowDetailedTable(!showDetailedTable)}
            className="px-3 py-1.5 bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] text-xs font-semibold text-[var(--m-accent)] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Table className="w-3.5 h-3.5" />
            <span>{showDetailedTable ? 'Hide Matrix Table' : 'Numerical Matrix'}</span>
            {showDetailedTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        }
      />

      {weeklySummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <div className="m-panel-inset p-2.5 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/30 text-[var(--m-danger)] flex items-center justify-center shrink-0">
              <Flame className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[var(--m-text-muted)] uppercase font-semibold">Warmest Day</div>
              <div className="text-xs font-bold text-[var(--m-text-primary)] font-mono tabular-nums truncate">
                {weeklySummary.hottestDay}
              </div>
            </div>
          </div>

          <div className="m-panel-inset p-2.5 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/30 text-[var(--m-accent)] flex items-center justify-center shrink-0">
              <Thermometer className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[var(--m-text-muted)] uppercase font-semibold">Coolest Night</div>
              <div className="text-xs font-bold text-[var(--m-text-primary)] font-mono tabular-nums truncate">
                {weeklySummary.coolestDay}
              </div>
            </div>
          </div>

          <div className="m-panel-inset p-2.5 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--m-accent-soft)] border border-[#0B72B9]/35 text-[var(--m-accent)] flex items-center justify-center shrink-0">
              <CloudRain className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[var(--m-text-muted)] uppercase font-semibold">Wettest Day</div>
              <div className="text-xs font-bold text-[var(--m-accent)] font-mono tabular-nums truncate">
                {weeklySummary.wettestDay}
              </div>
            </div>
          </div>

          <div className="m-panel-inset p-2.5 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--m-ok-soft)] border border-[var(--m-ok)]/30 text-[var(--m-ok)] flex items-center justify-center shrink-0">
              <Wind className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[var(--m-text-muted)] uppercase font-semibold">Windiest Day</div>
              <div className="text-xs font-bold text-[var(--m-text-primary)] font-mono tabular-nums truncate">
                {weeklySummary.windiestDay}
              </div>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 m-panel-inset p-2.5 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--m-ok-soft)] border border-[var(--m-ok)]/30 text-[var(--m-ok)] flex items-center justify-center shrink-0">
              <Sun className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[var(--m-text-muted)] uppercase font-semibold">Best Window</div>
              <div className="text-xs font-bold text-[var(--m-ok)] truncate">{weeklySummary.bestOutdoorDay}</div>
            </div>
          </div>
        </div>
      )}

      {/* 7-Day Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3">
        {daily.map((item, idx) => {
          const visual = getWeatherVisualConfig(item.condition);
          const IconComp = visual.icon;

          const highVal = isFiniteNum(item.high) ? Math.round(item.high) : null;
          const lowVal = isFiniteNum(item.low) ? Math.round(item.low) : null;
          const rainProb = isFiniteNum(item.rainProb) ? Math.round(item.rainProb) : null;
          const isToday = idx === 0 || item.day.toLowerCase().includes('today');

          const rangeTotal = Math.max(1, globalMax - globalMin);
          const leftPercent =
            lowVal !== null ? Math.max(0, Math.min(80, ((lowVal - globalMin) / rangeTotal) * 100)) : 0;
          const widthPercent =
            highVal !== null && lowVal !== null
              ? Math.max(18, Math.min(100 - leftPercent, ((highVal - lowVal) / rangeTotal) * 100))
              : 0;

          const hasWarning =
            (rainProb !== null && rainProb >= 70) ||
            (item.condition || '').toLowerCase().includes('thunder');

          return (
            <div
              key={idx}
              id={`daily-forecast-card-${idx}`}
              className={`p-3 rounded-lg border flex flex-col justify-between gap-2.5 transition-colors ${
                isToday
                  ? 'bg-[var(--m-surface-2)] border-[var(--m-accent)]'
                  : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] hover:border-[var(--m-border-strong)]'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div>
                  <div className="text-xs font-bold text-[var(--m-text-primary)] uppercase tracking-tight">
                    {isToday ? 'Today' : item.day}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--m-text-muted)]">{item.date}</div>
                </div>
                <span
                  className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                    hasWarning
                      ? 'bg-[var(--m-watch-soft)] border-[var(--m-watch)]/40 text-[var(--m-watch)]'
                      : 'bg-[var(--m-ok-soft)] border-[var(--m-ok)]/30 text-[var(--m-ok)]'
                  }`}
                >
                  {hasWarning ? 'Watch' : 'Normal'}
                </span>
              </div>

              <div className="flex items-center gap-2.5 my-0.5">
                <div className="p-2 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] shrink-0">
                  <IconComp className={`w-5 h-5 ${visual.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--m-text-primary)] truncate">
                    {item.condition || '—'}
                  </div>
                  <div className="text-[10px] text-[var(--m-text-muted)] truncate">
                    {rainProb !== null ? `${rainProb}% Rain Prob` : 'PoP unavailable'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between text-xs font-mono tabular-nums">
                  <span className="text-[var(--m-text-muted)] font-semibold">
                    {lowVal !== null ? `${lowVal}°` : '—'}
                  </span>
                  <span className="text-[var(--m-text-primary)] font-bold">
                    {highVal !== null ? `${highVal}°` : '—'}
                  </span>
                </div>

                <div className="relative w-full h-1.5 bg-[var(--m-surface-1)] border border-[var(--m-border)] rounded-full overflow-hidden">
                  {widthPercent > 0 && (
                    <div
                      className="absolute h-full rounded-full bg-gradient-to-r from-[#35C7E8] to-[#EF4444]"
                      style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                    />
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--m-border)]/70 flex flex-col gap-1 text-[10px] text-[var(--m-text-muted)] font-mono tabular-nums">
                <div className="flex items-center justify-between">
                  <span className="font-sans flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-[var(--m-accent)]" />
                    PoP
                  </span>
                  <span className="text-[var(--m-accent)] font-bold">
                    {rainProb !== null ? `${rainProb}%` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-sans flex items-center gap-1">
                    <Wind className="w-3 h-3 text-[var(--m-ok)]" />
                    Wind
                  </span>
                  <span className="text-[var(--m-text-secondary)] truncate max-w-[85px]">{item.wind || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-sans">Humidity</span>
                  <span className="text-[var(--m-text-secondary)]">
                    {isFiniteNum(item.humidity) ? `${Math.round(item.humidity)}%` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-sans">UV Index</span>
                  <span className="text-[var(--m-watch)]">
                    {isFiniteNum(item.uv) ? item.uv.toFixed(1) : '—'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expandable Numerical Matrix */}
      {showDetailedTable && (
        <div id="detailed-synoptic-table-container" className="m-panel-inset p-3 overflow-x-auto">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--m-border)] text-xs">
            <span className="font-bold text-[var(--m-text-primary)] uppercase text-[11px] flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              7-Day Numerical Forecast Matrix
            </span>
            <span className="text-[10px] text-[var(--m-text-muted)]">Upstream NWP / Daily Ensemble</span>
          </div>

          <table className="w-full text-left text-xs border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-[var(--m-border)] text-[var(--m-text-muted)] uppercase text-[10px] tracking-wider bg-[var(--m-surface-1)]">
                <th className="p-2.5">Date &amp; Day</th>
                <th className="p-2.5">Condition</th>
                <th className="p-2.5">Max / Min Temp</th>
                <th className="p-2.5">Rain Prob</th>
                <th className="p-2.5">Humidity</th>
                <th className="p-2.5">Surface Wind</th>
                <th className="p-2.5">UV Index</th>
                <th className="p-2.5">Advisory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--m-border-strong)] font-mono tabular-nums text-[var(--m-text-secondary)]">
              {daily.map((item, idx) => {
                const rainProb = isFiniteNum(item.rainProb) ? Math.round(item.rainProb) : null;
                const hasWarning =
                  (rainProb !== null && rainProb >= 70) ||
                  (item.condition || '').toLowerCase().includes('thunder');
                return (
                  <tr key={idx} className="hover:bg-[var(--m-surface-2)] transition-colors">
                    <td className="p-2.5 font-sans">
                      <span className="font-bold text-[var(--m-text-primary)] block">{item.day}</span>
                      <span className="text-[10px] font-mono text-[var(--m-text-muted)]">{item.date}</span>
                    </td>
                    <td className="p-2.5 font-sans text-[var(--m-text-primary)]">{item.condition || '—'}</td>
                    <td className="p-2.5">
                      <span className="text-[var(--m-text-primary)] font-bold">
                        {isFiniteNum(item.high) ? `${Math.round(item.high)}°C` : '—'}
                      </span>{' '}
                      /{' '}
                      <span className="text-[var(--m-text-muted)]">
                        {isFiniteNum(item.low) ? `${Math.round(item.low)}°C` : '—'}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className={`font-bold ${rainProb !== null && rainProb > 40 ? 'text-[var(--m-accent)]' : 'text-[var(--m-text-muted)]'}`}>
                        {rainProb !== null ? `${rainProb}%` : '—'}
                      </span>
                    </td>
                    <td className="p-2.5">
                      {isFiniteNum(item.humidity) ? `${Math.round(item.humidity)}%` : '—'}
                    </td>
                    <td className="p-2.5">{item.wind || '—'}</td>
                    <td className="p-2.5 text-[var(--m-watch)]">
                      {isFiniteNum(item.uv) ? item.uv.toFixed(1) : '—'}
                    </td>
                    <td className="p-2.5 font-sans">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          hasWarning
                            ? 'bg-[var(--m-watch-soft)] border-[var(--m-watch)]/40 text-[var(--m-watch)]'
                            : 'bg-[var(--m-ok-soft)] border-[var(--m-ok)]/30 text-[var(--m-ok)]'
                        }`}
                      >
                        {hasWarning ? 'Watch' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DataPanel>
  );
};
