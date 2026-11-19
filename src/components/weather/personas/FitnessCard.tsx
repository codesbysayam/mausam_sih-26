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
      ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35'
      : workoutSuitability === 'Fair'
      ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35'
      : 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35';

  const windVal = typeof windSpeedKmh === 'number' && Number.isFinite(windSpeedKmh) ? windSpeedKmh : null;
  const hydrationVal =
    typeof hydrationRateMlHour === 'number' && Number.isFinite(hydrationRateMlHour) ? hydrationRateMlHour : null;

  return (
    <div className="m-panel-inset p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--m-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-1)] text-[var(--m-watch)] flex items-center justify-center border border-[var(--m-border)]">
              <Footprints className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--m-text-primary)] uppercase tracking-wide">
                Outdoor Fitness &amp; Running
              </h3>
              <p className="text-[11px] text-[var(--m-text-muted)]">
                Solar Window &amp; Biometeorology • {city}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${suitabilityColor}`}>
            {workoutSuitability}
          </span>
        </div>

        {heatAlertActive && (
          <div className="mt-3.5 p-3 rounded-lg bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/40 flex items-start gap-2.5 text-xs text-[var(--m-danger)]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-[var(--m-text-primary)]">Heat Alert: High Thermal Stress</strong>
              <p className="text-[11px] text-[var(--m-text-secondary)] mt-0.5">
                {heatAlertMessage ||
                  'High heat index active. Avoid strenuous exertion between 11 AM and 4 PM.'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 font-mono tabular-nums">
          <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
            <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)] block">
              Sun Schedule
            </span>
            <div className="flex items-center justify-between mt-2 text-xs">
              <div className="flex items-center gap-1 text-[var(--m-watch)]">
                <Sunrise className="w-3.5 h-3.5" />
                <span className="text-[var(--m-text-primary)] font-bold">{sunrise || '—'}</span>
              </div>
              <div className="flex items-center gap-1 text-[var(--m-alert)]">
                <Sunset className="w-3.5 h-3.5" />
                <span className="text-[var(--m-text-primary)] font-bold">{sunset || '—'}</span>
              </div>
            </div>
            <span className="text-[10px] font-sans text-[var(--m-text-muted)] block mt-1.5">
              Sunrise &amp; Sunset Ephemeris
            </span>
          </div>

          <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
            <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)] block">
              Surface Wind
            </span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-xl font-bold text-[var(--m-text-primary)]">{windVal ?? '—'}</span>
              {windVal !== null && <span className="text-[10px] font-sans text-[var(--m-text-muted)]">km/h</span>}
              {windDirection && windDirection !== '—' && (
                <span className="text-xs text-[var(--m-accent)] ml-1 font-bold">{windDirection}</span>
              )}
            </div>
            <span className="text-[10px] font-sans text-[var(--m-text-muted)] block mt-1">
              {windVal === null ? 'Unavailable' : windVal > 20 ? 'Breezy headwind' : 'Light breeze'}
            </span>
          </div>

          <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)] col-span-2 sm:col-span-1">
            <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)] block">
              Hydration Target
            </span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-xl font-bold text-[var(--m-accent)]">{hydrationVal ?? '—'}</span>
              {hydrationVal !== null && <span className="text-[10px] font-sans text-[var(--m-text-muted)]">mL/hr</span>}
            </div>
            <span className="text-[10px] font-sans text-[var(--m-text-muted)] block mt-1">
              Thermal Stress: <strong className="text-[var(--m-text-primary)]">{thermalStressLevel}</strong>
            </span>
          </div>
        </div>

        <div className="mt-3.5 p-3 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-[var(--m-watch)] shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="text-[var(--m-text-primary)] font-semibold">
              Optimal Outdoor Window:{' '}
              <span className="text-[var(--m-ok)] font-mono">{bestRunningHours || '—'}</span>
            </p>
            <p className="text-[11px] text-[var(--m-text-muted)] mt-0.5">
              Derived from diurnal temperature, solar UV radiation, and wind conditions.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--m-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[var(--m-text-muted)]">
        <span>Source: <strong className="text-[var(--m-text-secondary)]">NOAA Solar &amp; Biometeorology Model</strong></span>
        <span>Calibrated Telemetry</span>
      </div>
    </div>
  );
};
