import React from 'react';
import { Clock, Cloud, Sun, CloudRain, Wind, Droplets, AlertCircle } from 'lucide-react';
import { HourlyForecastItem } from '../../types';

interface HomeLiveTimelineProps {
  hourly?: HourlyForecastItem[];
  locationName?: string;
  modelRunTime?: string;
}

export const HomeLiveTimeline: React.FC<HomeLiveTimelineProps> = ({
  hourly = [],
  locationName = 'Selected Station',
  modelRunTime = '00:00 UTC Synoptic Cycle',
}) => {
  const hasData = Array.isArray(hourly) && hourly.length > 0;

  const getWeatherIcon = (condition?: string) => {
    const c = (condition || '').toLowerCase();
    if (c.includes('thunder') || c.includes('lightning')) {
      return <CloudRain className="w-5 h-5 text-[#E74C3C]" />;
    }
    if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) {
      return <CloudRain className="w-5 h-5 text-[var(--m-accent)]" />;
    }
    if (c.includes('cloud') || c.includes('overcast')) {
      return <Cloud className="w-5 h-5 text-[var(--m-text-muted)]" />;
    }
    if (c.includes('wind') || c.includes('breeze')) {
      return <Wind className="w-5 h-5 text-[var(--m-accent)]" />;
    }
    return <Sun className="w-5 h-5 text-[#F1C40F]" />;
  };

  // Select deterministic timeline slots: Now, +1h, +2h, +3h, +6h, +12h, +18h, +24h
  const slots = [
    { label: 'NOW', index: 0, isObserved: true },
    { label: '+1h', index: 1, isObserved: false },
    { label: '+2h', index: 2, isObserved: false },
    { label: '+3h', index: 3, isObserved: false },
    { label: '+6h', index: 6, isObserved: false },
    { label: '+12h', index: 12, isObserved: false },
    { label: '+18h', index: 18, isObserved: false },
    { label: '+24h', index: 23, isObserved: false },
  ];

  return (
    <section
      id="live-weather-timeline"
      className="bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] rounded-xl p-4 sm:p-5 shadow-lg"
      aria-label="Hourly Atmospheric Timeline"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--m-border-strong)] pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-[var(--m-accent)]" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              ATMOSPHERIC TIMELINE (HOURLY)
            </h3>
            <p className="text-xs text-[var(--m-text-secondary)]">
              Surface telemetry & deterministic prediction for{' '}
              <span className="text-[var(--m-text-primary)] font-medium">{locationName}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[var(--m-text-secondary)]">
          <span className="w-2 h-2 rounded-full bg-[#2ECC71]" />
          <span>IMD-GFS / WRF Surface Grid</span>
          <span className="hidden md:inline text-[var(--m-text-muted)]">|</span>
          <span className="text-[var(--m-accent)]">{modelRunTime}</span>
        </div>
      </div>

      {!hasData ? (
        <div className="p-6 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border-strong)] flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-8 h-8 text-[var(--m-text-secondary)] mb-2" />
          <p className="text-xs text-[var(--m-text-primary)] font-medium">
            Model forecast data unavailable for current observation coordinates
          </p>
          <p className="text-[11px] text-[var(--m-text-secondary)] mt-1">
            Awaiting next synoptic NWP cycle upload from meteorological server
          </p>
        </div>
      ) : (
        <div className="w-full max-w-full overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex items-stretch gap-2.5 min-w-[760px]">
            {slots.map((slot) => {
              const item = hourly[slot.index];
              const isNow = slot.index === 0;

              if (!item && !isNow) return null;

              return (
                <div
                  key={slot.label}
                  className={`flex-1 min-w-[95px] p-3 rounded-lg border flex flex-col items-center justify-between text-center transition-all ${
                    isNow
                      ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)] shadow-md ring-1 ring-[var(--m-focus)]/40'
                      : 'bg-[var(--m-surface-1)] border-[var(--m-border-strong)] hover:border-[var(--m-accent)]/60'
                  }`}
                >
                  {/* Step label & Status Badge */}
                  <div className="w-full flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isNow
                          ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)]'
                          : 'bg-[var(--m-surface-2)] text-[var(--m-text-secondary)]'
                      }`}
                    >
                      {slot.label}
                    </span>
                    <span
                      className={`text-[8px] font-mono font-bold px-1 rounded uppercase ${
                        isNow
                          ? 'text-[#2ECC71] bg-[#008000]/20'
                          : 'text-[var(--m-accent)] bg-[var(--m-accent-soft)]'
                      }`}
                    >
                      {isNow ? 'OBSERVED' : 'FORECAST'}
                    </span>
                  </div>

                  {/* Time */}
                  <span className="text-xs text-[var(--m-text-primary)] font-mono font-medium mt-1">
                    {item?.time || (isNow ? 'Now' : 'N/A')}
                  </span>

                  {/* Weather Icon */}
                  <div className="my-2" title={item?.condition || 'Weather'}>
                    {item ? getWeatherIcon(item.condition) : <span className="text-xs text-[var(--m-text-secondary)]">N/A</span>}
                  </div>

                  {/* Temperature */}
                  <span className="text-base sm:text-lg font-bold font-mono text-white">
                    {typeof item?.temp === 'number' && Number.isFinite(item.temp) ? `${Math.round(item.temp)}°C` : '—'}
                  </span>

                  {/* Condition label */}
                  <span
                    className="text-[10px] text-[var(--m-text-secondary)] mt-0.5 truncate max-w-[90px]"
                    title={item?.condition || 'Conditions'}
                  >
                    {item?.condition || 'Unavailable'}
                  </span>

                  {/* Metrics footer: Rain & Humidity */}
                  <div className="mt-2 pt-1.5 border-t border-[var(--m-border-strong)] w-full flex items-center justify-between text-[10px] font-mono">
                    <div
                      className="flex items-center gap-0.5 text-[var(--m-accent)]"
                      title={typeof item?.rainProb === 'number' && Number.isFinite(item.rainProb) ? `Rain Probability: ${item.rainProb}%` : 'Rain Probability unavailable'}
                    >
                      <CloudRain className="w-3 h-3 shrink-0" />
                      <span>{typeof item?.rainProb === 'number' && Number.isFinite(item.rainProb) ? `${item.rainProb}%` : '—'}</span>
                    </div>

                    <div
                      className="flex items-center gap-0.5 text-[var(--m-text-secondary)]"
                      title={typeof item?.humidity === 'number' && Number.isFinite(item.humidity) ? `Humidity: ${item.humidity}%` : 'Humidity unavailable'}
                    >
                      <Droplets className="w-3 h-3 shrink-0" />
                      <span>{typeof item?.humidity === 'number' && Number.isFinite(item.humidity) ? `${item.humidity}%` : '—'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
