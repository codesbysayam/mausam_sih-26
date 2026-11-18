import React from 'react';
import { Car, Droplets, CloudFog, Waves, Snowflake, AlertOctagon } from 'lucide-react';

interface CommuterCardProps {
  roadCondition: 'Dry' | 'Wet' | 'Waterlogged' | 'Icy' | 'Foggy';
  roadSafetyIndex: 'Green' | 'Yellow' | 'Red';
  roadSafetyLabel: string;
  visibilityKm: number | null;
  visibilityStatus: 'Clear' | 'Moderate' | 'Poor (Fog)' | 'Dense Fog Danger';
  travelHazards: string[];
  city: string;
}

export const CommuterCard: React.FC<CommuterCardProps> = ({
  roadCondition,
  roadSafetyIndex,
  roadSafetyLabel,
  visibilityKm,
  visibilityStatus,
  travelHazards,
  city,
}) => {
  const safetyBadgeColor =
    roadSafetyIndex === 'Green'
      ? 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35'
      : roadSafetyIndex === 'Yellow'
      ? 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35'
      : 'bg-[#EF4444]/12 text-[#FCA5A5] border-[#EF4444]/35';

  const ConditionIcon =
    roadCondition === 'Wet'
      ? Droplets
      : roadCondition === 'Foggy'
      ? CloudFog
      : roadCondition === 'Waterlogged'
      ? Waves
      : roadCondition === 'Icy'
      ? Snowflake
      : Car;

  const visVal = typeof visibilityKm === 'number' && Number.isFinite(visibilityKm) ? visibilityKm : null;

  return (
    <div className="m-panel-inset p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#26394B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B1927] text-[#35C7E8] flex items-center justify-center border border-[#26394B]">
              <ConditionIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F3F6FA] uppercase tracking-wide">
                Commuters &amp; Highway Drivers
              </h3>
              <p className="text-[11px] text-[#8295A8]">
                Surface Friction &amp; Optical Sight Distance • {city}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${safetyBadgeColor}`}>
            {roadSafetyIndex === 'Green' ? 'Optimal' : roadSafetyIndex === 'Yellow' ? 'Caution' : 'Hazardous'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 font-mono tabular-nums">
          <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B]">
            <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8] block">
              Road Surface
            </span>
            <div className="mt-2">
              <span className="text-xl font-bold text-[#F3F6FA]">{roadCondition}</span>
            </div>
            <span className="text-[10px] font-sans text-[#8295A8] block mt-1 truncate">
              {roadCondition === 'Wet' ? 'Reduced tire grip' : 'Routine pavement state'}
            </span>
          </div>

          <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B]">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8]">Visibility</span>
              <span className="text-[10px] font-sans text-[#35C7E8] font-semibold">
                {visVal !== null ? visibilityStatus : '—'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-[#F3F6FA]">
                {visVal !== null ? visVal : '—'}
              </span>
              {visVal !== null && <span className="text-[10px] font-sans text-[#8295A8]">km</span>}
            </div>
            <span className="text-[10px] font-sans text-[#8295A8] block mt-1 truncate">
              {visVal === null
                ? 'Visibility feed unavailable'
                : visVal >= 5
                ? 'Unrestricted sight distance'
                : 'Fog / mist caution'}
            </span>
          </div>

          <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B] col-span-2 sm:col-span-1">
            <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8] block">
              Hydroplane Risk
            </span>
            <div className="mt-2">
              <span className="text-sm font-sans font-bold text-[#35C7E8]">
                {roadCondition === 'Wet' || roadCondition === 'Waterlogged' ? 'Moderate / High' : 'Minimal'}
              </span>
            </div>
            <span className="text-[10px] font-sans text-[#8295A8] block mt-1 truncate">
              Surface water runoff
            </span>
          </div>
        </div>

        <div className="mt-3.5 p-3 rounded-lg bg-[#0B1927] border border-[#26394B] flex items-start gap-2.5">
          <AlertOctagon className="w-4 h-4 text-[#35C7E8] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="text-[#F3F6FA]">
              <strong>Driver Assessment:</strong> {roadSafetyLabel}
            </p>
            {travelHazards.length > 0 && (
              <p className="text-[11px] text-[#8295A8]">
                <strong>Highway Advisories:</strong> {travelHazards.join(' • ')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#26394B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[#8295A8]">
        <span>Source: <strong className="text-[#B5C3D1]">Surface Visibility &amp; Rain Telemetry</strong></span>
        <span>IRC Highway Safety Thresholds</span>
      </div>
    </div>
  );
};
