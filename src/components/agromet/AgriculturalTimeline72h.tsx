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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#22C7A0]/12 border border-[#22C7A0]/35 text-[#6EE7B7] text-[10px] font-mono font-semibold">
          <CheckCircle2 className="w-3 h-3" />
          OPTIMAL
        </span>
      );
    }
    if (suitability === 'MODERATE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F59E0B]/12 border border-[#F59E0B]/35 text-[#FCD34D] text-[10px] font-mono font-semibold">
          <AlertTriangle className="w-3 h-3" />
          MODERATE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EF4444]/12 border border-[#EF4444]/35 text-[#FCA5A5] text-[10px] font-mono font-semibold">
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
                      ? 'bg-[#101F2E] border-[#35C7E8]'
                      : 'bg-[#08131F] border-[#26394B]'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[#26394B] pb-2 gap-1.5">
                    <div className="min-w-0">
                      <span className={`text-xs font-mono font-bold block ${isNow ? 'text-[#35C7E8]' : 'text-[#F3F6FA]'}`}>
                        {item.offsetLabel}
                      </span>
                      <div className="text-[10px] font-mono text-[#8295A8] tabular-nums truncate">
                        {item.hourTime}
                      </div>
                    </div>
                    {getSuitabilityPill(item.fieldSuitability)}
                  </div>

                  <div className="space-y-1.5 text-xs font-mono tabular-nums">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8295A8] flex items-center gap-1">
                        <Thermometer className="w-3 h-3 text-[#F59E0B]" />
                        Temp
                      </span>
                      <span className="text-[#F3F6FA] font-semibold">{item.tempC}°C</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#8295A8] flex items-center gap-1">
                        <CloudRain className="w-3 h-3 text-[#35C7E8]" />
                        Rain
                      </span>
                      <span className="text-[#35C7E8] font-semibold">
                        {item.rainMm !== null ? `${item.rainMm}mm` : '—'}
                        {item.rainProbPct !== null ? ` (${item.rainProbPct}%)` : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#8295A8] flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-[#35C7E8]" />
                        RH
                      </span>
                      <span className="text-[#F3F6FA]">
                        {item.humidityPct !== null ? `${item.humidityPct}%` : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#8295A8] flex items-center gap-1">
                        <Wind className="w-3 h-3 text-[#8295A8]" />
                        Wind
                      </span>
                      <span className="text-[#F3F6FA]">
                        {item.windKmh !== null ? `${item.windKmh} km/h` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#26394B]">
                    <div className="text-[9px] font-mono font-bold text-[#22C7A0] uppercase">
                      Suitability
                    </div>
                    <p className="text-[11px] text-[#B5C3D1] leading-snug mt-0.5">
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
