import React from 'react';
import { Footprints, AlertTriangle, Sunrise, Sunset, Clock } from 'lucide-react';

interface FitnessCardProps {
  sunrise: string;
  sunset: string;
  bestRunningHours: string;
  workoutSuitability: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  heatAlertActive: boolean;
  heatAlertMessage: string | null;
  windSpeedKmh: number | null;
  windDirection: string;
  hydrationRateMlHour: number | null;
  thermalStressLevel: 'Low' | 'Moderate' | 'High' | 'Extreme';
  city: string;
}

export const FitnessCard: React.FC<FitnessCardProps> = ({
  sunrise,
  sunset,
  bestRunningHours,
  workoutSuitability,
  heatAlertActive,
  heatAlertMessage,
  windSpeedKmh,
  windDirection,
  hydrationRateMlHour,
  thermalStressLevel,
  city,
}) => {
  const suitabilityColor =
    workoutSuitability === 'Excellent' || workoutSuitability === 'Good'
      ? 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35'
      : workoutSuitability === 'Fair'
      ? 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35'
      : 'bg-[#EF4444]/12 text-[#FCA5A5] border-[#EF4444]/35';

  const windVal = typeof windSpeedKmh === 'number' && Number.isFinite(windSpeedKmh) ? windSpeedKmh : null;
  const hydrationVal =
    typeof hydrationRateMlHour === 'number' && Number.isFinite(hydrationRateMlHour) ? hydrationRateMlHour : null;

  return (
    <div className="m-panel-inset p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#26394B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B1927] text-[#F59E0B] flex items-center justify-center border border-[#26394B]">
              <Footprints className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F3F6FA] uppercase tracking-wide">
                Outdoor Fitness &amp; Running
              </h3>
              <p className="text-[11px] text-[#8295A8]">
                Solar Window &amp; Biometeorology • {city}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${suitabilityColor}`}>
            {workoutSuitability}
          </span>
        </div>

        {heatAlertActive && (
          <div className="mt-3.5 p-3 rounded-lg bg-[#EF4444]/12 border border-[#EF4444]/40 flex items-start gap-2.5 text-xs text-[#FCA5A5]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-[#F3F6FA]">Heat Alert: High Thermal Stress</strong>
              <p className="text-[11px] text-[#B5C3D1] mt-0.5">
                {heatAlertMessage ||
                  'High heat index active. Avoid strenuous exertion between 11 AM and 4 PM.'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 font-mono tabular-nums">
          <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B]">
            <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8] block">
              Sun Schedule
            </span>
            <div className="flex items-center justify-between mt-2 text-xs">
              <div className="flex items-center gap-1 text-[#F59E0B]">
                <Sunrise className="w-3.5 h-3.5" />
                <span className="text-[#F3F6FA] font-bold">{sunrise || '—'}</span>
              </div>
              <div className="flex items-center gap-1 text-[#F97316]">
                <Sunset className="w-3.5 h-3.5" />
                <span className="text-[#F3F6FA] font-bold">{sunset || '—'}</span>
              </div>
            </div>
            <span className="text-[10px] font-sans text-[#8295A8] block mt-1.5">
              Sunrise &amp; Sunset Ephemeris
            </span>
          </div>

          <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B]">
            <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8] block">
              Surface Wind
            </span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-xl font-bold text-[#F3F6FA]">{windVal ?? '—'}</span>
              {windVal !== null && <span className="text-[10px] font-sans text-[#8295A8]">km/h</span>}
              {windDirection && windDirection !== '—' && (
                <span className="text-xs text-[#35C7E8] ml-1 font-bold">{windDirection}</span>
              )}
            </div>
            <span className="text-[10px] font-sans text-[#8295A8] block mt-1">
              {windVal === null ? 'Unavailable' : windVal > 20 ? 'Breezy headwind' : 'Light breeze'}
            </span>
          </div>

          <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B] col-span-2 sm:col-span-1">
            <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8] block">
              Hydration Target
            </span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-xl font-bold text-[#35C7E8]">{hydrationVal ?? '—'}</span>
              {hydrationVal !== null && <span className="text-[10px] font-sans text-[#8295A8]">mL/hr</span>}
            </div>
            <span className="text-[10px] font-sans text-[#8295A8] block mt-1">
              Thermal Stress: <strong className="text-[#F3F6FA]">{thermalStressLevel}</strong>
            </span>
          </div>
        </div>

        <div className="mt-3.5 p-3 rounded-lg bg-[#0B1927] border border-[#26394B] flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="text-[#F3F6FA] font-semibold">
              Optimal Outdoor Window:{' '}
              <span className="text-[#6EE7B7] font-mono">{bestRunningHours || '—'}</span>
            </p>
            <p className="text-[11px] text-[#8295A8] mt-0.5">
              Derived from diurnal temperature, solar UV radiation, and wind conditions.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#26394B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[#8295A8]">
        <span>Source: <strong className="text-[#B5C3D1]">NOAA Solar &amp; Biometeorology Model</strong></span>
        <span>Calibrated Telemetry</span>
      </div>
    </div>
  );
};
