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
      ? 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]'
      : soilMoistureStatus === 'Optimal'
      ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35'
      : soilMoistureStatus === 'Dry'
      ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35'
      : 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[#0B72B9]/35';

  return (
    <div className="m-panel-inset p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--m-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-1)] text-[var(--m-ok)] flex items-center justify-center border border-[var(--m-border)]">
              <Sprout className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--m-text-primary)] uppercase tracking-wide">
                Agriculture &amp; Gardening
              </h3>
              <p className="text-[11px] text-[var(--m-text-muted)]">
                Agromet Crop &amp; Soil Guidance • {city}, {state}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--m-ok-soft)] text-[var(--m-ok)] border border-[var(--m-ok)]/35">
            {currentCropSeason} Season
          </span>
        </div>

        {frostAlertActive && (
          <div className="mt-3.5 p-3 rounded-lg bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/40 flex items-start gap-2.5 text-xs">
            <Snowflake className="w-4 h-4 shrink-0 text-[var(--m-accent)] mt-0.5" />
            <div>
              <strong className="block font-bold text-[var(--m-text-primary)]">Frost Risk Tonight</strong>
              <p className="text-[11px] text-[var(--m-text-secondary)] mt-0.5">
                {frostAlertMessage ||
                  'Projected surface minimum below 4°C. Cover nursery beds and apply light protective irrigation.'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 font-mono tabular-nums">
          <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)]">Soil Moisture</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${soilBadgeColor}`}>
                {soilVal !== null ? soilMoistureStatus : '—'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-[var(--m-text-primary)]">{soilVal ?? '—'}</span>
              {soilVal !== null && <span className="text-[10px] font-sans text-[var(--m-text-muted)]">% vol</span>}
            </div>
            <span className="text-[10px] font-sans text-[var(--m-text-muted)] block mt-1 truncate">
              Root-zone (0–30 cm)
            </span>
          </div>

          <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
            <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)] block">
              3-Day Rain
            </span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-[var(--m-accent)]">{rainVal ?? '—'}</span>
              {rainVal !== null && <span className="text-[10px] font-sans text-[var(--m-text-muted)]">mm</span>}
            </div>
            <span className="text-[10px] font-sans text-[var(--m-text-muted)] block mt-1 truncate">
              {rainVal === null
                ? 'Unavailable'
                : rainVal > 15
                ? 'Significant rain expected'
                : 'Light / Dry period'}
            </span>
          </div>

          <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)] col-span-2 sm:col-span-1">
            <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)] block">
              Irrigation Plan
            </span>
            <div className="mt-2">
              <span className="text-sm font-sans font-bold text-[var(--m-ok)] block truncate">
                {rainVal === null ? 'Unavailable' : rainVal > 15 ? 'Hold Irrigation' : 'Normal Schedule'}
              </span>
            </div>
            <span className="text-[10px] font-sans text-[var(--m-text-muted)] block mt-1 truncate">
              Water Balance Guidance
            </span>
          </div>
        </div>

        <div className="mt-3.5 p-3 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-start gap-2.5">
          <Leaf className="w-4 h-4 text-[var(--m-ok)] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="text-[var(--m-text-primary)]">
              <strong>Crop &amp; Field Advice ({currentCropSeason}):</strong> {seasonalPlantingTip}
            </p>
            <p className="text-[11px] text-[var(--m-text-muted)]">
              <strong>Irrigation:</strong> {irrigationRecommendation}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--m-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[var(--m-text-muted)]">
        <span>Source: <strong className="text-[var(--m-text-secondary)]">GKMS Framework &amp; Open-Meteo Soil</strong></span>
        <span>ICAR Crop Season Context</span>
      </div>
    </div>
  );
};
