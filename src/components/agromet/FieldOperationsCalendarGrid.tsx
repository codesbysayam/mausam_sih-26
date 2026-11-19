import React from 'react';
import {
  CalendarDays,
  Droplets,
  SprayCan,
  Sprout,
  Tractor,
  Scissors,
  Wheat,
} from 'lucide-react';
import { WeatherDataBundle } from '../../services/weatherService';
import { CropType, PhenologicalStage, generate7DayAgriculturalForecast } from '../../services/agronomicEngine';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
  UnavailableState,
} from '../ui/ObservatoryPrimitives';

interface FieldOperationsCalendarGridProps {
  weather?: WeatherDataBundle;
  selectedCrop: CropType;
  selectedStage: PhenologicalStage;
  district: string;
}

export const FieldOperationsCalendarGrid: React.FC<FieldOperationsCalendarGridProps> = ({
  weather,
  selectedCrop,
  selectedStage,
  district,
}) => {
  const forecast = generate7DayAgriculturalForecast(weather, selectedCrop, selectedStage);

  const operations = [
    { id: 'irrigation', name: 'Irrigation', icon: Droplets },
    { id: 'spraying', name: 'Foliar Spraying', icon: SprayCan },
    { id: 'fertilization', name: 'Fertilizer Top-Dressing', icon: Sprout },
    { id: 'sowing', name: 'Sowing & Tillage', icon: Tractor },
    { id: 'weeding', name: 'Interculture / Weeding', icon: Scissors },
    { id: 'harvesting', name: 'Harvesting & Threshing', icon: Wheat },
  ];

  const getCellStatus = (opId: string, dayIdx: number) => {
    const day = forecast[dayIdx];
    if (!day) return { text: '—', status: 'na' };

    const isRain = (day.rainMm !== null && day.rainMm > 8) || (day.rainProb !== null && day.rainProb > 50);
    const isHeavyRain = (day.rainMm !== null && day.rainMm > 20) || (day.rainProb !== null && day.rainProb > 75);
    const isWindy = day.windKmh !== null && day.windKmh > 18;
    const isHot = day.tempMax > 38;

    if (opId === 'irrigation') {
      if (isHeavyRain || isRain) return { text: 'Defer', status: 'avoid' };
      if (day.rainMm !== null && day.rainMm > 2) return { text: 'Check', status: 'caution' };
      return { text: 'Ideal', status: 'recommended' };
    }

    if (opId === 'spraying') {
      if (isHeavyRain || isRain || isWindy) return { text: 'Avoid', status: 'avoid' };
      if (isHot || (day.windKmh !== null && day.windKmh > 12)) return { text: 'Caution', status: 'caution' };
      return { text: 'Favorable', status: 'recommended' };
    }

    if (opId === 'fertilization') {
      if (isHeavyRain) return { text: 'Avoid', status: 'avoid' };
      if (isRain) return { text: 'Caution', status: 'caution' };
      return { text: 'Suitable', status: 'recommended' };
    }

    if (opId === 'sowing') {
      if (isHeavyRain) return { text: 'Wet Soil', status: 'avoid' };
      if (isRain) return { text: 'Caution', status: 'caution' };
      return { text: 'Optimal', status: 'recommended' };
    }

    if (opId === 'weeding') {
      if (isHeavyRain || isRain) return { text: 'Avoid', status: 'avoid' };
      return { text: 'Suitable', status: 'recommended' };
    }

    if (opId === 'harvesting') {
      if (isHeavyRain || isRain) return { text: 'Avoid', status: 'avoid' };
      if (day.humidity !== null && day.humidity > 80) return { text: 'Dew Delay', status: 'caution' };
      return { text: 'Prime', status: 'recommended' };
    }

    return { text: 'Suitable', status: 'recommended' };
  };

  const renderCellBadge = (cell: { text: string; status: string }) => {
    if (cell.status === 'recommended') {
      return (
        <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-[var(--m-ok-soft)] text-[var(--m-ok)] font-mono text-[10px] font-semibold border border-[var(--m-ok)]/35 w-full">
          {cell.text}
        </span>
      );
    }
    if (cell.status === 'caution') {
      return (
        <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-[var(--m-watch-soft)] text-[var(--m-watch)] font-mono text-[10px] font-semibold border border-[var(--m-watch)]/35 w-full">
          {cell.text}
        </span>
      );
    }
    if (cell.status === 'avoid') {
      return (
        <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-[var(--m-danger-soft)] text-[var(--m-danger)] font-mono text-[10px] font-semibold border border-[var(--m-danger)]/35 w-full">
          {cell.text}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-[var(--m-surface-2)] text-[var(--m-text-muted)] font-mono text-[10px] w-full">
        {cell.text}
      </span>
    );
  };

  return (
    <DataPanel id="agromet-calendar-grid" className="space-y-4">
      <SectionHeading
        title="7-Day Farm Operations Calendar Matrix"
        subtitle={`Cross-operational suitability matrix for ${selectedCrop} in ${district}`}
        icon={<CalendarDays className="w-4 h-4" />}
        badge={<SourceStatus status={forecast.length > 0 ? 'LIVE' : 'UNAVAILABLE'} />}
        action={
          forecast.length > 0 ? (
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-[var(--m-ok)]">Recommended</span>
              <span className="text-[var(--m-watch)]">Caution</span>
              <span className="text-[var(--m-danger)]">Avoid</span>
            </div>
          ) : undefined
        }
      />

      {forecast.length === 0 ? (
        <UnavailableState
          title="7-Day Operations Matrix Unavailable"
          reason="Extended daily meteorological forecast telemetry is currently unavailable."
          source="IMD / Open-Meteo 7-Day Ensemble"
        />
      ) : (
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[var(--m-border)] bg-[var(--m-surface-inset)]">
                <th className="py-3 px-4 text-xs font-mono font-bold text-[var(--m-text-primary)] uppercase w-[210px]">
                  Operation
                </th>
                {forecast.map((d, idx) => (
                  <th key={idx} className="py-3 px-2 text-center text-xs font-mono font-bold text-[var(--m-text-secondary)]">
                    <div className="text-[var(--m-text-primary)]">{d.dayName}</div>
                    <div className="text-[10px] text-[var(--m-text-muted)] font-normal tabular-nums">{d.dateStr}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--m-border)]">
              {operations.map((op) => {
                const Icon = op.icon;

                return (
                  <tr key={op.id} className="hover:bg-[var(--m-surface-2)]/50 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono font-semibold text-[var(--m-text-primary)] flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[var(--m-accent)] shrink-0" />
                      <span>{op.name}</span>
                    </td>
                    {forecast.map((_, dayIdx) => {
                      const cell = getCellStatus(op.id, dayIdx);
                      return (
                        <td key={dayIdx} className="py-2.5 px-2 text-center">
                          {renderCellBadge(cell)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DataPanel>
  );
};
