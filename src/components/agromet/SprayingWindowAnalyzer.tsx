import React from 'react';
import { SprayCan } from 'lucide-react';
import { WeatherDataBundle } from '../../services/weatherService';
import { CropType, PhenologicalStage } from '../../services/agronomicEngine';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
  UnavailableState,
} from '../ui/ObservatoryPrimitives';

interface SprayingWindowAnalyzerProps {
  weather?: WeatherDataBundle;
  selectedCrop: CropType;
  selectedStage: PhenologicalStage;
  district: string;
}

export const SprayingWindowAnalyzer: React.FC<SprayingWindowAnalyzerProps> = ({
  weather,
  district,
}) => {
  const hourly = weather?.hourly || [];
  const sampleHours = [
    { label: '06:00 IST', index: 6, title: 'Dawn / Early Morning' },
    { label: '09:00 IST', index: 9, title: 'Mid Morning' },
    { label: '12:00 IST', index: 12, title: 'Noon' },
    { label: '15:00 IST', index: 15, title: 'Afternoon' },
    { label: '18:00 IST', index: 18, title: 'Dusk / Evening' },
    { label: '21:00 IST', index: 21, title: 'Night' },
    { label: '+24h 06:00', index: 30, title: 'Tomorrow Morning' },
    { label: '+24h 15:00', index: 39, title: 'Tomorrow Afternoon' },
  ];

  const windows = sampleHours
    .filter(({ index }) => {
      const item = hourly[index];
      return item && typeof item.temp === 'number' && !Number.isNaN(item.temp);
    })
    .map(({ label, index, title }) => {
      const item = hourly[index]!;
      const temp = Math.round(item.temp);
      const wind = typeof item.windSpeed === 'number' ? Math.round(item.windSpeed) : null;
      const rainProb = typeof item.rainProb === 'number' ? Math.round(item.rainProb) : null;
      const humidity = typeof item.humidity === 'number' ? Math.round(item.humidity) : null;

      let suitability: 'IDEAL' | 'ACCEPTABLE' | 'AVOID' = 'IDEAL';
      let advice = 'Calm winds and balanced humidity support uniform droplet adhesion.';

      if ((rainProb !== null && rainProb > 45) || (wind !== null && wind > 18) || temp > 36) {
        suitability = 'AVOID';
        advice =
          rainProb !== null && rainProb > 45
            ? 'High wash-off risk from expected rain.'
            : wind !== null && wind > 18
            ? 'High spray drift risk (>18 km/h).'
            : 'Extreme heat causes rapid evaporation and leaf scorch.';
      } else if (
        (wind !== null && wind > 12) ||
        temp > 32 ||
        (humidity !== null && humidity < 40) ||
        wind === null
      ) {
        suitability = 'ACCEPTABLE';
        advice =
          wind === null
            ? 'Anemometer forecast unavailable; verify calm canopy conditions manually.'
            : 'Use coarse spray nozzles and anti-drift surfactants.';
      }

      return {
        label,
        title,
        temp,
        wind,
        rainProb,
        humidity,
        suitability,
        advice,
      };
    });

  return (
    <DataPanel id="agromet-spraying-window" className="space-y-4">
      <SectionHeading
        title="Spraying Window & Drift Hazard Analyzer"
        subtitle={`Hourly suitability index for pesticide, fungicide, and foliar micronutrient application in ${district}`}
        icon={<SprayCan className="w-4 h-4" />}
        badge={<SourceStatus status={windows.length > 0 ? 'LIVE' : 'UNAVAILABLE'} />}
        action={
          windows.length > 0 ? (
            <div className="flex items-center gap-3 text-[11px] font-mono text-[#B5C3D1]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#22C7A0]" /> IDEAL
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> ACCEPTABLE
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> AVOID
              </span>
            </div>
          ) : undefined
        }
      />

      {windows.length === 0 ? (
        <UnavailableState
          title="Hourly Spraying Windows Unavailable"
          reason="Hourly wind velocity and precipitation probability forecasts have not synced for spray-drift modeling."
          source="Hourly NWP Forecast Feed"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {windows.map((w, idx) => {
            let badgeBg = 'bg-[#22C7A0]/12 border-[#22C7A0]/35 text-[#6EE7B7]';
            let cardBorder = 'border-[#22C7A0]/30';
            if (w.suitability === 'ACCEPTABLE') {
              badgeBg = 'bg-[#F59E0B]/12 border-[#F59E0B]/35 text-[#FCD34D]';
              cardBorder = 'border-[#F59E0B]/30';
            } else if (w.suitability === 'AVOID') {
              badgeBg = 'bg-[#EF4444]/12 border-[#EF4444]/35 text-[#FCA5A5]';
              cardBorder = 'border-[#EF4444]/30';
            }

            return (
              <div
                key={idx}
                className={`rounded-xl bg-[#08131F] border ${cardBorder} p-4 flex flex-col justify-between space-y-3`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#F3F6FA] block">
                      {w.label}
                    </span>
                    <span className="text-[10px] font-mono text-[#8295A8]">{w.title}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${badgeBg}`}>
                    {w.suitability}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums text-[#B5C3D1] bg-[#07111D] p-2.5 rounded-lg border border-[#26394B]">
                  <div>
                    Wind: <strong className="text-[#F3F6FA]">{w.wind !== null ? `${w.wind} km/h` : '—'}</strong>
                  </div>
                  <div>
                    Rain: <strong className="text-[#35C7E8]">{w.rainProb !== null ? `${w.rainProb}%` : '—'}</strong>
                  </div>
                  <div>
                    Temp: <strong className="text-[#F3F6FA]">{w.temp}°C</strong>
                  </div>
                  <div>
                    RH: <strong className="text-[#F3F6FA]">{w.humidity !== null ? `${w.humidity}%` : '—'}</strong>
                  </div>
                </div>

                <p className="text-[11px] text-[#8295A8] leading-snug">{w.advice}</p>
              </div>
            );
          })}
        </div>
      )}
    </DataPanel>
  );
};
