import React, { useState } from 'react';
import { Calendar, Sprout } from 'lucide-react';
import { WeatherDataBundle } from '../../services/weatherService';
import {
  CropType,
  PhenologicalStage,
  generate7DayAgriculturalForecast,
} from '../../services/agronomicEngine';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
  UnavailableState,
} from '../ui/ObservatoryPrimitives';

interface WeatherCropResponse7DayProps {
  weather?: WeatherDataBundle;
  selectedCrop: CropType;
  selectedStage: PhenologicalStage;
  district: string;
}

export const WeatherCropResponse7Day: React.FC<WeatherCropResponse7DayProps> = ({
  weather,
  selectedCrop,
  selectedStage,
  district,
}) => {
  const forecastItems = generate7DayAgriculturalForecast(weather, selectedCrop, selectedStage);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const selectedDay = forecastItems[selectedDayIdx] || forecastItems[0];

  const getSuitabilityPill = (value: string, color: string) => {
    let cls = 'bg-[var(--m-surface-2)] text-[var(--m-text-muted)] border-[var(--m-border)]';
    if (color === 'emerald') cls = 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35';
    else if (color === 'amber') cls = 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35';
    else if (color === 'rose') cls = 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35';
    else if (color === 'cyan') cls = 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/35';

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${cls}`}>
        {value}
      </span>
    );
  };

  return (
    <DataPanel id="agromet-7day-crop-response" className="space-y-4">
      <SectionHeading
        title="7-Day Weather & Crop Response Outlook"
        subtitle={`Physiological impact and daily operational suitability for ${selectedCrop} in ${district}`}
        icon={<Calendar className="w-4 h-4" />}
        badge={<SourceStatus status={forecastItems.length > 0 ? 'LIVE' : 'UNAVAILABLE'} />}
      />

      {forecastItems.length === 0 ? (
        <UnavailableState
          title="7-Day Agricultural Forecast Unavailable"
          reason="Extended daily NWP forecast feeds are currently unavailable for this station."
          source="IMD / Open-Meteo 7-Day Ensemble"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
            {forecastItems.map((item, idx) => {
              const isSelected = idx === selectedDayIdx;

              return (
                <button
                  type="button"
                  key={`${item.dayName}-${idx}`}
                  id={`forecast-day-card-${idx}`}
                  onClick={() => setSelectedDayIdx(idx)}
                  className={`text-left rounded-xl p-3 flex flex-col justify-between space-y-2.5 cursor-pointer transition-colors border min-h-[44px] m-focus-ring ${
                    isSelected
                      ? 'bg-[var(--m-surface-2)] border-[var(--m-accent)]'
                      : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] hover:border-[var(--m-border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[var(--m-border)] pb-1.5">
                    <span className={`text-xs font-mono font-bold ${isSelected ? 'text-[var(--m-accent)]' : 'text-[var(--m-text-primary)]'}`}>
                      {item.dayName}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--m-text-muted)] tabular-nums">{item.dateStr}</span>
                  </div>

                  <div className="space-y-1 font-mono tabular-nums text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--m-text-muted)]">Temp</span>
                      <span className="text-[var(--m-text-primary)] font-semibold">
                        {item.tempMax}°/{item.tempMin}°
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--m-accent)]">Rain</span>
                      <span className="text-[var(--m-accent)] font-semibold">
                        {item.rainMm !== null ? `${item.rainMm}mm` : '—'}
                        {item.rainProb !== null ? ` (${item.rainProb}%)` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[var(--m-text-muted)]">
                      <span>Wind</span>
                      <span>{item.windKmh !== null ? `${item.windKmh} km/h` : '—'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--m-border)] space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[var(--m-text-muted)]">Irrig</span>
                      {getSuitabilityPill(item.fieldSuitability.irrigation, item.fieldSuitability.irrigationColor)}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[var(--m-text-muted)]">Spray</span>
                      {getSuitabilityPill(item.fieldSuitability.spraying, item.fieldSuitability.sprayingColor)}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[var(--m-text-muted)]">Harv</span>
                      {getSuitabilityPill(item.fieldSuitability.harvesting, item.fieldSuitability.harvestingColor)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedDay && (
            <div className="m-panel-elevated p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--m-border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-[var(--m-ok)]" />
                  <h3 className="text-xs font-mono font-bold text-[var(--m-text-primary)] uppercase tracking-wider">
                    Agronomic Interpretation · {selectedDay.dayName} ({selectedDay.dateStr})
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-[var(--m-text-secondary)]">
                  <span>
                    Max: <strong className="text-[var(--m-text-primary)]">{selectedDay.tempMax}°C</strong>
                  </span>
                  <span>
                    Precip:{' '}
                    <strong className="text-[var(--m-accent)]">
                      {selectedDay.rainMm !== null ? `${selectedDay.rainMm} mm` : '—'}
                    </strong>
                  </span>
                  <span>
                    RH:{' '}
                    <strong className="text-[var(--m-text-primary)]">
                      {selectedDay.humidity !== null ? `${selectedDay.humidity}%` : '—'}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                <div className="md:col-span-8 m-panel-inset p-3.5 space-y-1">
                  <span className="text-[11px] font-mono font-semibold text-[var(--m-ok)] uppercase">
                    {selectedCrop} Stage Impact
                  </span>
                  <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">{selectedDay.cropImpact}</p>
                </div>

                <div className="md:col-span-4 grid grid-cols-3 gap-2 text-center">
                  <div className="m-panel-inset p-2.5 space-y-1">
                    <span className="text-[10px] font-mono text-[var(--m-text-muted)] block">Irrigation</span>
                    {getSuitabilityPill(selectedDay.fieldSuitability.irrigation, selectedDay.fieldSuitability.irrigationColor)}
                  </div>
                  <div className="m-panel-inset p-2.5 space-y-1">
                    <span className="text-[10px] font-mono text-[var(--m-text-muted)] block">Spraying</span>
                    {getSuitabilityPill(selectedDay.fieldSuitability.spraying, selectedDay.fieldSuitability.sprayingColor)}
                  </div>
                  <div className="m-panel-inset p-2.5 space-y-1">
                    <span className="text-[10px] font-mono text-[var(--m-text-muted)] block">Harvest</span>
                    {getSuitabilityPill(selectedDay.fieldSuitability.harvesting, selectedDay.fieldSuitability.harvestingColor)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DataPanel>
  );
};
