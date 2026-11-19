import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  CloudRain,
  Info,
  Navigation,
} from 'lucide-react';
import { CurrentWeather, LocationRecord } from '../../types';
import { observationHistoryService, AtmosphericDelta } from '../../services/observationHistoryService';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';

interface HomeAtmosphericChangeDetectorProps {
  current?: CurrentWeather | null;
  selectedLocation: LocationRecord;
  lastUpdated?: string;
}

export const HomeAtmosphericChangeDetector: React.FC<HomeAtmosphericChangeDetectorProps> = ({
  current,
  selectedLocation,
  lastUpdated,
}) => {
  const report = useMemo(() => {
    return observationHistoryService.getObservationReport(selectedLocation, current);
  }, [
    selectedLocation.id,
    current?.lastUpdatedTimestamp,
    current?.temp,
    current?.humidity,
    current?.windSpeed,
    current?.pressure,
    current?.precipitation,
  ]);

  const { hasValidComparison, deltas, overallStatus, sourceText, timeDifferenceMinutes, previousObs } = report;

  const renderChangeCell = (delta: AtmosphericDelta) => {
    if (delta.direction === 'unavailable' || !hasValidComparison) {
      return <span className="text-[11px] font-mono text-[var(--m-text-muted)]">—</span>;
    }

    if (delta.direction === 'stable') {
      return (
        <div className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[var(--m-text-secondary)] tabular-nums">
          <Minus className="w-3 h-3 text-[var(--m-text-muted)]" />
          <span>{delta.displayDiff}</span>
        </div>
      );
    }

    const isUp = delta.direction === 'up';
    const isWarmOrRain = delta.parameter === 'Temperature' || delta.parameter === 'Rainfall';
    const colorClass =
      delta.severity === 'warning'
        ? 'text-[var(--m-danger)]'
        : delta.severity === 'caution'
        ? 'text-[var(--m-watch)]'
        : isUp
        ? (isWarmOrRain ? 'text-[var(--m-watch)]' : 'text-[var(--m-accent)]')
        : (isWarmOrRain ? 'text-[var(--m-accent)]' : 'text-[var(--m-ok)]');

    return (
      <div className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold tabular-nums ${colorClass}`}>
        {isUp ? (
          <TrendingUp className="w-3 h-3 shrink-0" />
        ) : (
          <TrendingDown className="w-3 h-3 shrink-0" />
        )}
        <span>{delta.displayDiff}</span>
      </div>
    );
  };

  const metricRows = [
    {
      icon: Thermometer,
      iconColor: 'text-[var(--m-watch)]',
      delta: deltas.temperature,
    },
    {
      icon: Droplets,
      iconColor: 'text-[var(--m-accent)]',
      delta: deltas.humidity,
    },
    {
      icon: Wind,
      iconColor: 'text-[var(--m-ok)]',
      delta: deltas.wind,
    },
    {
      icon: Gauge,
      iconColor: 'text-[var(--m-accent)]',
      delta: deltas.pressure,
      extra: deltas.pressure.trendLabel || undefined,
    },
    {
      icon: CloudRain,
      iconColor: 'text-[var(--m-accent)]',
      delta: deltas.rainfall,
      extra:
        typeof current?.rainfallLast1h === 'number' && Number.isFinite(current.rainfallLast1h)
          ? `1h: ${current.rainfallLast1h.toFixed(1)} mm`
          : undefined,
    },
  ];

  const displayTime = lastUpdated || current?.lastUpdated || null;

  return (
    <DataPanel id="atmospheric-change-detector-panel" className="flex flex-col justify-between gap-3">
      <div className="flex flex-col gap-3">
        <SectionHeading
          title="Atmospheric Change"
          subtitle={
            hasValidComparison && timeDifferenceMinutes
              ? `${selectedLocation.city} · Δ vs -${timeDifferenceMinutes}m (${previousObs?.timeString || 'Prior'})`
              : `${selectedLocation.city} · Sequential observation delta`
          }
          action={<SourceStatus status={overallStatus} updatedAt={displayTime} />}
        />

        {/* Compact Telemetry Delta Table */}
        <div className="table-wrapper m-panel-inset">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--m-border)] text-[10px] font-mono font-semibold text-[var(--m-text-muted)] uppercase tracking-wider">
                <th className="py-2 px-3">Parameter</th>
                <th className="py-2 px-2 text-right">Current</th>
                <th className="py-2 px-2 text-right hidden sm:table-cell">Previous</th>
                <th className="py-2 px-3 text-right">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--m-border)]">
              {metricRows.map((row) => {
                const IconComponent = row.icon;
                const { delta } = row;

                return (
                  <tr key={delta.parameter} className="hover:bg-[var(--m-surface-2)]/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <IconComponent className={`w-3.5 h-3.5 ${row.iconColor} shrink-0`} />
                        <div className="min-w-0">
                          <span className="font-medium text-[var(--m-text-primary)] block">{delta.parameter}</span>
                          {row.extra && (
                            <span className="text-[10px] text-[var(--m-text-muted)] block font-mono truncate">
                              {row.extra}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-[var(--m-text-primary)] tabular-nums">
                      {delta.currentVal}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-[var(--m-text-muted)] tabular-nums hidden sm:table-cell">
                      {hasValidComparison ? delta.previousVal : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {renderChangeCell(delta)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!hasValidComparison && (
          <div className="p-2.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-start gap-2 text-xs text-[var(--m-text-muted)]">
            <Info className="w-4 h-4 text-[var(--m-accent)] shrink-0 mt-0.5" />
            <div>
              <span className="text-[var(--m-text-primary)] font-medium block">
                Baseline recorded for {selectedLocation.city}
              </span>
              <p className="text-[11px] text-[var(--m-text-muted)] mt-0.5 leading-snug">
                Differentials populate after two distinct observation timestamps are captured for this station.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Status Info */}
      <div className="pt-2.5 border-t border-[var(--m-border)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--m-text-muted)]">
        <div className="flex items-center gap-1.5 truncate max-w-[300px]" title={sourceText}>
          <Navigation className="w-3.5 h-3.5 text-[var(--m-accent)] shrink-0" />
          <span className="truncate">Source: {sourceText}</span>
        </div>
        <span className="font-mono text-[10px] text-[var(--m-text-muted)]">Δ = Current − Previous</span>
      </div>
    </DataPanel>
  );
};

