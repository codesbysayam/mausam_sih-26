import React from 'react';
import {
  Clock,
  CloudRain,
  Thermometer,
  Wind,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { WeatherDataBundle } from '../../services/weatherService';
import { generate72HourTimeline, Timeline72hItem } from '../../services/agronomicEngine';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
  UnavailableState,
} from '../ui/ObservatoryPrimitives';

interface AgriculturalTimeline72hProps {
  weather?: WeatherDataBundle;
  district: string;
}

export const AgriculturalTimeline72h: React.FC<AgriculturalTimeline72hProps> = ({
  weather,
  district,
}) => {
  const timelineItems = generate72HourTimeline(weather);

  const getSuitabilityPill = (suitability: Timeline72hItem['fieldSuitability']) => {
    if (suitability === 'OPTIMAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--m-ok-soft)] border border-[var(--m-ok)]/35 text-[var(--m-ok)] text-[10px] font-mono font-semibold">
          <CheckCircle2 className="w-3 h-3" />
          OPTIMAL
        </span>
      );
    }
    if (suitability === 'MODERATE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--m-watch-soft)] border border-[var(--m-watch)]/35 text-[var(--m-watch)] text-[10px] font-mono font-semibold">
          <AlertTriangle className="w-3 h-3" />
          MODERATE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/35 text-[var(--m-danger)] text-[10px] font-mono font-semibold">
        <XCircle className="w-3 h-3" />
        RESTRICTED
      </span>
    );
  };

  return (
    <DataPanel id="agromet-72h-timeline" className="space-y-4">
      <SectionHeading
        title="72-Hour Agricultural Operation Timeline"
        subtitle={`High-resolution hourly field windows across ${district}`}
        icon={<Clock className="w-4 h-4" />}
        badge={
          <SourceStatus
            status={timelineItems.length > 0 ? 'LIVE' : 'UNAVAILABLE'}
            source="Hourly NWP Interpolation"
          />
        }
      />

      {timelineItems.length === 0 ? (
        <UnavailableState
          title="72-Hour Operational Timeline Unavailable"
          reason="Hourly NWP forecast telemetry has not synced for this district."
          source="IMD / Open-Meteo Hourly Feed"
        />
      ) : (
        <div className="w-full max-w-full overflow-x-auto pb-2">
          <div className="flex items-stretch gap-3 min-w-[780px]">
            {timelineItems.map((item, idx) => {
              const isNow = idx === 0;

              return (
                <div
                  key={item.offsetLabel}
                  id={`timeline-72h-card-${idx}`}
                  className={`flex-1 rounded-xl p-3.5 flex flex-col justify-between space-y-3 border ${
                    isNow
                      ? 'bg-[var(--m-surface-2)] border-[var(--m-accent)]'
                      : 'bg-[var(--m-surface-inset)] border-[var(--m-border)]'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[var(--m-border)] pb-2 gap-1.5">
                    <div className="min-w-0">
                      <span className={`text-xs font-mono font-bold block ${isNow ? 'text-[var(--m-accent)]' : 'text-[var(--m-text-primary)]'}`}>
                        {item.offsetLabel}
                      </span>
                      <div className="text-[10px] font-mono text-[var(--m-text-muted)] tabular-nums truncate">
                        {item.hourTime}
                      </div>
                    </div>
                    {getSuitabilityPill(item.fieldSuitability)}
                  </div>

                  <div className="space-y-1.5 text-xs font-mono tabular-nums">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--m-text-muted)] flex items-center gap-1">
                        <Thermometer className="w-3 h-3 text-[var(--m-watch)]" />
                        Temp
                      </span>
                      <span className="text-[var(--m-text-primary)] font-semibold">{item.tempC}°C</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--m-text-muted)] flex items-center gap-1">
                        <CloudRain className="w-3 h-3 text-[var(--m-accent)]" />
                        Rain
                      </span>
                      <span className="text-[var(--m-accent)] font-semibold">
                        {item.rainMm !== null ? `${item.rainMm}mm` : '—'}
                        {item.rainProbPct !== null ? ` (${item.rainProbPct}%)` : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--m-text-muted)] flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-[var(--m-accent)]" />
                        RH
                      </span>
                      <span className="text-[var(--m-text-primary)]">
                        {item.humidityPct !== null ? `${item.humidityPct}%` : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--m-text-muted)] flex items-center gap-1">
                        <Wind className="w-3 h-3 text-[var(--m-text-muted)]" />
                        Wind
                      </span>
                      <span className="text-[var(--m-text-primary)]">
                        {item.windKmh !== null ? `${item.windKmh} km/h` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--m-border)]">
                    <div className="text-[9px] font-mono font-bold text-[var(--m-ok)] uppercase">
                      Suitability
                    </div>
                    <p className="text-[11px] text-[var(--m-text-secondary)] leading-snug mt-0.5">
                      {item.recommendedOperation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DataPanel>
  );
};
