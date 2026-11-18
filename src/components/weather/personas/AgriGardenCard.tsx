import React from 'react';
import { Sprout, Snowflake, Leaf } from 'lucide-react';

interface AgriGardenCardProps {
  soilMoisturePercent: number | null;
  soilMoistureStatus: 'Dry' | 'Optimal' | 'Saturated';
  threeDayRainfallTotalMm: number | null;
  frostAlertActive: boolean;
  frostAlertMessage: string | null;
  currentCropSeason: 'Kharif' | 'Rabi' | 'Zaid';
  seasonalPlantingTip: string;
  irrigationRecommendation: string;
  city: string;
  state: string;
}

export const AgriGardenCard: React.FC<AgriGardenCardProps> = ({
  soilMoisturePercent,
  soilMoistureStatus,
  threeDayRainfallTotalMm,
  frostAlertActive,
  frostAlertMessage,
  currentCropSeason,
  seasonalPlantingTip,
  irrigationRecommendation,
  city,
  state,
}) => {
  const soilVal =
    typeof soilMoisturePercent === 'number' && Number.isFinite(soilMoisturePercent)
      ? soilMoisturePercent
      : null;
  const rainVal =
    typeof threeDayRainfallTotalMm === 'number' && Number.isFinite(threeDayRainfallTotalMm)
      ? threeDayRainfallTotalMm
      : null;

  const soilBadgeColor =
    soilVal === null
      ? 'bg-[#08131F] text-[#8295A8] border-[#26394B]'
      : soilMoistureStatus === 'Optimal'
      ? 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35'
      : soilMoistureStatus === 'Dry'
      ? 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35'
      : 'bg-[#0B72B9]/15 text-[#7DD3FC] border-[#0B72B9]/35';

  return (
    <div className="m-panel-inset p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#26394B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B1927] text-[#22C7A0] flex items-center justify-center border border-[#26394B]">
              <Sprout className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F3F6FA] uppercase tracking-wide">
                Agriculture &amp; Gardening
              </h3>
              <p className="text-[11px] text-[#8295A8]">
                Agromet Crop &amp; Soil Guidance • {city}, {state}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#22C7A0]/12 text-[#6EE7B7] border border-[#22C7A0]/35">
            {currentCropSeason} Season
          </span>
        </div>

        {frostAlertActive && (
          <div className="mt-3.5 p-3 rounded-lg bg-[#0B72B9]/12 border border-[#35C7E8]/40 flex items-start gap-2.5 text-xs">
            <Snowflake className="w-4 h-4 shrink-0 text-[#35C7E8] mt-0.5" />
            <div>
              <strong className="block font-bold text-[#F3F6FA]">Frost Risk Tonight</strong>
              <p className="text-[11px] text-[#B5C3D1] mt-0.5">
                {frostAlertMessage ||
                  'Projected surface minimum below 4°C. Cover nursery beds and apply light protective irrigation.'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 font-mono tabular-nums">
          <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B]">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8]">Soil Moisture</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${soilBadgeColor}`}>
                {soilVal !== null ? soilMoistureStatus : '—'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-[#F3F6FA]">{soilVal ?? '—'}</span>
              {soilVal !== null && <span className="text-[10px] font-sans text-[#8295A8]">% vol</span>}
            </div>
            <span className="text-[10px] font-sans text-[#8295A8] block mt-1 truncate">
              Root-zone (0–30 cm)
            </span>
          </div>

          <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B]">
            <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8] block">
              3-Day Rain
            </span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-[#35C7E8]">{rainVal ?? '—'}</span>
              {rainVal !== null && <span className="text-[10px] font-sans text-[#8295A8]">mm</span>}
            </div>
            <span className="text-[10px] font-sans text-[#8295A8] block mt-1 truncate">
              {rainVal === null
                ? 'Unavailable'
                : rainVal > 15
                ? 'Significant rain expected'
                : 'Light / Dry period'}
            </span>
          </div>

          <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B] col-span-2 sm:col-span-1">
            <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8] block">
              Irrigation Plan
            </span>
            <div className="mt-2">
              <span className="text-sm font-sans font-bold text-[#6EE7B7] block truncate">
                {rainVal === null ? 'Unavailable' : rainVal > 15 ? 'Hold Irrigation' : 'Normal Schedule'}
              </span>
            </div>
            <span className="text-[10px] font-sans text-[#8295A8] block mt-1 truncate">
              Water Balance Guidance
            </span>
          </div>
        </div>

        <div className="mt-3.5 p-3 rounded-lg bg-[#0B1927] border border-[#26394B] flex items-start gap-2.5">
          <Leaf className="w-4 h-4 text-[#22C7A0] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="text-[#F3F6FA]">
              <strong>Crop &amp; Field Advice ({currentCropSeason}):</strong> {seasonalPlantingTip}
            </p>
            <p className="text-[11px] text-[#8295A8]">
              <strong>Irrigation:</strong> {irrigationRecommendation}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#26394B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[#8295A8]">
        <span>Source: <strong className="text-[#B5C3D1]">GKMS Framework &amp; Open-Meteo Soil</strong></span>
        <span>ICAR Crop Season Context</span>
      </div>
    </div>
  );
};
