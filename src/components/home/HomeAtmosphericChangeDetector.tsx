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
      return <span className="text-[11px] font-mono text-[#8295A8]">—</span>;
    }

    if (delta.direction === 'stable') {
      return (
        <div className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#B5C3D1] tabular-nums">
          <Minus className="w-3 h-3 text-[#8295A8]" />
          <span>{delta.displayDiff}</span>
        </div>
      );
    }

    const isUp = delta.direction === 'up';
    const isWarmOrRain = delta.parameter === 'Temperature' || delta.parameter === 'Rainfall';
    const colorClass =
      delta.severity === 'warning'
        ? 'text-[#EF4444]'
        : delta.severity === 'caution'
        ? 'text-[#F59E0B]'
        : isUp
        ? (isWarmOrRain ? 'text-[#F59E0B]' : 'text-[#35C7E8]')
        : (isWarmOrRain ? 'text-[#35C7E8]' : 'text-[#22C7A0]');

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
      iconColor: 'text-[#F59E0B]',
      delta: deltas.temperature,
    },
    {
      icon: Droplets,
      iconColor: 'text-[#35C7E8]',
      delta: deltas.humidity,
    },
    {
      icon: Wind,
      iconColor: 'text-[#22C7A0]',
      delta: deltas.wind,
    },
    {
      icon: Gauge,
      iconColor: 'text-[#35C7E8]',
      delta: deltas.pressure,
      extra: deltas.pressure.trendLabel || undefined,
    },
    {
      icon: CloudRain,
      iconColor: 'text-[#35C7E8]',
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
              <tr className="border-b border-[#26394B] text-[10px] font-mono font-semibold text-[#8295A8] uppercase tracking-wider">
                <th className="py-2 px-3">Parameter</th>
                <th className="py-2 px-2 text-right">Current</th>
                <th className="py-2 px-2 text-right hidden sm:table-cell">Previous</th>
                <th className="py-2 px-3 text-right">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26394B]">
              {metricRows.map((row) => {
                const IconComponent = row.icon;
                const { delta } = row;

                return (
                  <tr key={delta.parameter} className="hover:bg-[#101F2E]/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <IconComponent className={`w-3.5 h-3.5 ${row.iconColor} shrink-0`} />
                        <div className="min-w-0">
                          <span className="font-medium text-[#F3F6FA] block">{delta.parameter}</span>
                          {row.extra && (
                            <span className="text-[10px] text-[#8295A8] block font-mono truncate">
                              {row.extra}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-[#F3F6FA] tabular-nums">
                      {delta.currentVal}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-[#8295A8] tabular-nums hidden sm:table-cell">
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
          <div className="p-2.5 rounded-lg bg-[#08131F] border border-[#26394B] flex items-start gap-2 text-xs text-[#8295A8]">
            <Info className="w-4 h-4 text-[#35C7E8] shrink-0 mt-0.5" />
            <div>
              <span className="text-[#F3F6FA] font-medium block">
                Baseline recorded for {selectedLocation.city}
              </span>
              <p className="text-[11px] text-[#8295A8] mt-0.5 leading-snug">
                Differentials populate after two distinct observation timestamps are captured for this station.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Status Info */}
      <div className="pt-2.5 border-t border-[#26394B] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8295A8]">
        <div className="flex items-center gap-1.5 truncate max-w-[300px]" title={sourceText}>
          <Navigation className="w-3.5 h-3.5 text-[#35C7E8] shrink-0" />
          <span className="truncate">Source: {sourceText}</span>
        </div>
        <span className="font-mono text-[10px] text-[#8295A8]">Δ = Current − Previous</span>
      </div>
    </DataPanel>
  );
};

