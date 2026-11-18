import React, { useState } from 'react';
import { DailyForecastItem } from '../../types';
import { getWeatherVisualConfig } from '../../utils/weatherIcons';
import { Calendar, ChevronDown, ChevronUp, Droplets, Wind, Sun, ShieldCheck, ArrowRight } from 'lucide-react';
import { DataPanel, SectionHeading, UnavailableState } from '../ui/ObservatoryPrimitives';

interface HomeSevenDayForecastProps {
  daily: DailyForecastItem[];
  onNavigateToForecast?: () => void;
}

export const HomeSevenDayForecast: React.FC<HomeSevenDayForecastProps> = ({
  daily,
  onNavigateToForecast,
}) => {
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(0);

  const safeDaily = (daily || []).slice(0, 7);

  let globalMin = Infinity;
  let globalMax = -Infinity;
  safeDaily.forEach((d) => {
    if (typeof d.low === 'number' && Number.isFinite(d.low) && d.low < globalMin) globalMin = d.low;
    if (typeof d.high === 'number' && Number.isFinite(d.high) && d.high > globalMax) globalMax = d.high;
  });
  const hasRange = globalMin !== Infinity && globalMax !== -Infinity;

  const toggleDay = (idx: number) => {
    setExpandedDayIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <DataPanel id="homepage-seven-day-forecast" className="flex flex-col gap-4">
      <SectionHeading
        title="7-Day Synoptic Outlook"
        subtitle="Multi-model ensemble consensus & regional atmospheric trend"
        icon={<Calendar className="w-4 h-4 text-[#22C7A0]" />}
        action={
          onNavigateToForecast ? (
            <button
              type="button"
              onClick={onNavigateToForecast}
              className="text-xs text-[#35C7E8] hover:text-[#7DD3FC] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Full Forecast &amp; NWP View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : undefined
        }
      />

      {safeDaily.length === 0 ? (
        <UnavailableState
          title="7-Day Outlook Unavailable"
          reason="Extended daily ensemble projections are awaiting upstream model synchronization."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {safeDaily.map((day, idx) => {
            const isExpanded = expandedDayIndex === idx;
            const isToday = idx === 0;
            const visual = getWeatherVisualConfig(day.condition);
            const Icon = visual.icon;
            const rain = typeof day.rainProb === 'number' && Number.isFinite(day.rainProb) ? Math.round(day.rainProb) : null;
            const precipVol = typeof day.precipMm === 'number' && Number.isFinite(day.precipMm) ? day.precipMm : null;
            const lowNum = typeof day.low === 'number' && Number.isFinite(day.low) ? day.low : null;
            const highNum = typeof day.high === 'number' && Number.isFinite(day.high) ? day.high : null;

            const leftPercent =
              hasRange && lowNum !== null
                ? Math.max(0, ((lowNum - globalMin) / (globalMax - globalMin || 1)) * 100)
                : 0;
            const rightPercent =
              hasRange && highNum !== null
                ? Math.min(100, ((highNum - globalMin) / (globalMax - globalMin || 1)) * 100)
                : 100;
            const widthPercent = Math.max(8, rightPercent - leftPercent);

            return (
              <div
                key={day.date || idx}
                className={`rounded-xl border transition-colors ${
                  isExpanded
                    ? 'bg-[#101F2E] border-[#38536A]'
                    : 'bg-[#08131F] border-[#26394B] hover:border-[#38536A]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleDay(idx)}
                  aria-expanded={isExpanded}
                  className="w-full p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left cursor-pointer m-focus-ring rounded-xl"
                >
                  {/* Day, Date & Icon */}
                  <div className="flex items-center gap-3 sm:w-52 shrink-0">
                    <div className="w-9 h-9 rounded-lg bg-[#0B1927] border border-[#26394B] flex items-center justify-center shrink-0">
                      <Icon className={`w-5 h-5 ${visual.iconColor}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#F3F6FA]">
                          {isToday ? 'Today' : day.day || `Day ${idx + 1}`}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#35C7E8]/15 text-[#7DD3FC] border border-[#35C7E8]/30">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#8295A8] block">
                        {day.date || day.condition}
                      </span>
                    </div>
                  </div>

                  {/* Condition Text & Rain Chance */}
                  <div className="flex items-center gap-4 sm:w-48">
                    <span className="text-xs text-[#B5C3D1] font-medium truncate">
                      {day.condition || '—'}
                    </span>
                    {rain !== null && rain > 0 && (
                      <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-[#35C7E8] shrink-0 tabular-nums">
                        <Droplets className="w-3 h-3" />
                        <span>{rain}%</span>
                      </div>
                    )}
                  </div>

                  {/* Thermal Range Bar */}
                  <div className="flex items-center gap-3 flex-1 max-w-xs w-full">
                    <span className="text-xs font-mono text-[#8295A8] w-8 text-right tabular-nums">
                      {lowNum !== null ? `${Math.round(lowNum)}°` : '—'}
                    </span>
                    <div className="flex-1 h-2 bg-[#172A3B] rounded-full relative overflow-hidden">
                      {hasRange && lowNum !== null && highNum !== null && (
                        <div
                          className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-[#35C7E8] via-[#F59E0B] to-[#EF4444]"
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                        />
                      )}
                    </div>
                    <span className="text-xs font-mono font-bold text-[#F3F6FA] w-8 tabular-nums">
                      {highNum !== null ? `${Math.round(highNum)}°` : '—'}
                    </span>
                  </div>

                  <div className="hidden sm:block text-[#8295A8] pl-2">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 border-t border-[#26394B] bg-[#08131F]/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs rounded-b-xl">
                    <div className="p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B] flex flex-col">
                      <div className="flex items-center gap-1 text-[10px] font-mono text-[#8295A8] uppercase">
                        <Droplets className="w-3 h-3 text-[#35C7E8]" />
                        <span>Precipitation</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-[#35C7E8] mt-1 tabular-nums">
                        {rain !== null ? `${rain}%` : '—'}
                      </span>
                      <span className="text-[11px] text-[#8295A8]">
                        {precipVol !== null ? `Est. ${precipVol.toFixed(1)} mm` : 'Volume unavailable'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B] flex flex-col">
                      <div className="flex items-center gap-1 text-[10px] font-mono text-[#8295A8] uppercase">
                        <Wind className="w-3 h-3 text-[#22C7A0]" />
                        <span>Wind Profile</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-[#F3F6FA] mt-1">
                        {day.wind || '—'}
                      </span>
                      <span className="text-[11px] text-[#8295A8]">Surface flow</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B] flex flex-col">
                      <div className="flex items-center gap-1 text-[10px] font-mono text-[#8295A8] uppercase">
                        <Sun className="w-3 h-3 text-[#F59E0B]" />
                        <span>UV &amp; Moisture</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-[#F59E0B] mt-1 tabular-nums">
                        {typeof day.uv === 'number' && Number.isFinite(day.uv) ? `UV ${day.uv.toFixed(0)}` : '—'}
                      </span>
                      <span className="text-[11px] text-[#8295A8] tabular-nums">
                        {typeof day.humidity === 'number' && Number.isFinite(day.humidity)
                          ? `RH Avg: ${Math.round(day.humidity)}%`
                          : 'RH unavailable'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B] flex flex-col">
                      <div className="flex items-center gap-1 text-[10px] font-mono text-[#8295A8] uppercase">
                        <ShieldCheck className="w-3 h-3 text-[#22C7A0]" />
                        <span>Horizon</span>
                      </div>
                      <span className="text-sm font-bold text-[#22C7A0] mt-1">
                        {idx <= 2 ? 'Short-Range' : 'Medium-Range'}
                      </span>
                      <span className="text-[11px] text-[#8295A8]">Ensemble Guidance</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DataPanel>
  );
};


