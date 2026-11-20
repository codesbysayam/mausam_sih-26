import React, { useState, useRef, useMemo } from 'react';
import { HourlyForecastItem } from '../../types';
import { getWeatherVisualConfig } from '../../utils/weatherIcons';
import { ArrowRight, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { DataPanel, SectionHeading, UnavailableState } from '../ui/ObservatoryPrimitives';

interface HomeHourlyTimelineProps {
  hourly: HourlyForecastItem[];
  onNavigateToHourly?: () => void;
}

export const HomeHourlyTimeline: React.FC<HomeHourlyTimelineProps> = ({
  hourly,
  onNavigateToHourly,
}) => {
  const [rangeMode, setRangeMode] = useState<'8h' | '24h'>('8h');
  const [selectedHourIndex, setSelectedHourIndex] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const displayList = useMemo(() => {
    const count = rangeMode === '8h' ? 8 : 24;
    return (hourly || []).slice(0, count);
  }, [hourly, rangeMode]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === 'left' ? -280 : 280;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <DataPanel id="homepage-hourly-timeline" className="flex flex-col gap-4">
      <SectionHeading
        title="Hourly Atmospheric Timeline"
        subtitle="Diurnal temperature & precipitation progression"
        icon={<Clock className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-2">
            <div className="flex bg-[var(--m-surface-inset)] p-0.5 rounded-lg border border-[var(--m-border)]">
              <button
                type="button"
                onClick={() => setRangeMode('8h')}
                className={`px-3 min-h-[32px] text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  rangeMode === '8h'
                    ? 'bg-[var(--m-accent)] text-[#05101C]'
                    : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
                }`}
              >
                Next 8h
              </button>
              <button
                type="button"
                onClick={() => setRangeMode('24h')}
                className={`px-3 min-h-[32px] text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  rangeMode === '24h'
                    ? 'bg-[var(--m-accent)] text-[#05101C]'
                    : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
                }`}
              >
                24-Hour
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                className="w-8 h-8 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)] flex items-center justify-center cursor-pointer"
                aria-label="Scroll hourly timeline left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                className="w-8 h-8 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)] flex items-center justify-center cursor-pointer"
                aria-label="Scroll hourly timeline right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      />

      {displayList.length === 0 ? (
        <UnavailableState
          title="Hourly Timeline Unavailable"
          reason="Hourly meteorological progression is awaiting upstream model synchronization."
        />
      ) : (
        <div
          ref={scrollContainerRef}
          className="w-full max-w-full min-w-0 flex items-stretch gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin scroll-smooth select-none"
        >
          {displayList.map((item, idx) => {
            const isSelected = selectedHourIndex === idx;
            const isCurrent = idx === 0;
            const visual = getWeatherVisualConfig(item.condition);
            const Icon = visual.icon;

            const rawRain = item.precipitationProbability ?? item.rainProb;
            const rain = typeof rawRain === 'number' && Number.isFinite(rawRain) ? Math.round(rawRain) : null;
            const temp = typeof item.temp === 'number' && Number.isFinite(item.temp) ? Math.round(item.temp) : null;
            const humidity = typeof item.humidity === 'number' && Number.isFinite(item.humidity) ? Math.round(item.humidity) : null;
            const wind = typeof item.windSpeed === 'number' && Number.isFinite(item.windSpeed) ? Math.round(item.windSpeed) : null;

            return (
              <button
                type="button"
                key={item.time ? `hourly-${item.time}-${idx}` : `hourly-${idx}`}
                onClick={() => setSelectedHourIndex(idx)}
                className={`min-w-[106px] sm:min-w-[114px] p-3 rounded-xl border flex flex-col justify-between items-center text-center cursor-pointer transition-colors shrink-0 m-focus-ring ${
                  isSelected
                    ? 'bg-[var(--m-surface-2)] border-[var(--m-accent)]'
                    : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] hover:border-[var(--m-border-strong)]'
                }`}
              >
                <div className="flex flex-col items-center">
                  <span className={`text-xs font-mono font-semibold ${isCurrent ? 'text-[var(--m-accent)]' : 'text-[var(--m-text-primary)]'}`}>
                    {isCurrent ? 'Now' : item.time || `${idx}:00`}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--m-text-muted)] tabular-nums mt-0.5">
                    {humidity !== null ? `${humidity}% RH` : '— RH'}
                  </span>
                </div>

                <div className="my-2 p-2 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)]">
                  <Icon className={`w-5 h-5 ${visual.iconColor}`} />
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-lg font-mono font-bold text-[var(--m-text-primary)] tabular-nums">
                    {temp !== null ? `${temp}°` : '—'}
                  </span>
                  <span className="text-[10px] text-[var(--m-text-muted)] truncate max-w-[92px]">
                    {item.condition || '—'}
                  </span>
                </div>

                <div className="w-full mt-2 pt-2 border-t border-[var(--m-border)] flex flex-col items-center gap-1">
                  <div className="flex items-center justify-between w-full text-[9px] font-mono text-[var(--m-text-muted)] tabular-nums">
                    <span>Rain</span>
                    <span className={rain !== null && rain >= 40 ? 'text-[var(--m-accent)] font-semibold' : 'text-[var(--m-text-secondary)]'}>
                      {rain !== null ? `${rain}%` : '—'}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-[var(--m-surface-2)] rounded overflow-hidden">
                    <div
                      className="h-full bg-[var(--m-accent)] rounded"
                      style={{ width: `${rain !== null ? Math.min(100, Math.max(0, rain)) : 0}%` }}
                    />
                  </div>
                </div>

                <div className="text-[10px] text-[var(--m-text-muted)] mt-1 font-mono tabular-nums">
                  {wind !== null ? `${wind} km/h` : '— km/h'}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[var(--m-border)] text-xs text-[var(--m-text-muted)]">
        <span>Hourly guidance synchronized from Open-Meteo &amp; IMD multi-model feeds</span>
        {onNavigateToHourly && (
          <button
            type="button"
            onClick={onNavigateToHourly}
            className="text-[var(--m-accent)] hover:text-[var(--m-accent)] font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Open Local Weather Detail</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </DataPanel>
  );
};

