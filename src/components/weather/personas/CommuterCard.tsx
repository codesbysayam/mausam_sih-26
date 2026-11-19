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
      ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35'
      : roadSafetyIndex === 'Yellow'
      ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35'
      : 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35';

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
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--m-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-1)] text-[var(--m-accent)] flex items-center justify-center border border-[var(--m-border)]">
              <ConditionIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--m-text-primary)] uppercase tracking-wide">
                Commuters &amp; Highway Drivers
              </h3>
              <p className="text-[11px] text-[var(--m-text-muted)]">
                Surface Friction &amp; Optical Sight Distance • {city}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${safetyBadgeColor}`}>
            {roadSafetyIndex === 'Green' ? 'Optimal' : roadSafetyIndex === 'Yellow' ? 'Caution' : 'Hazardous'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 font-mono tabular-nums">
          <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
            <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)] block">
              Road Surface
            </span>
            <div className="mt-2">
              <span className="text-xl font-bold text-[var(--m-text-primary)]">{roadCondition}</span>
            </div>
            <span className="text-[10px] font-sans text-[var(--m-text-muted)] block mt-1 truncate">
              {roadCondition === 'Wet' ? 'Reduced tire grip' : 'Routine pavement state'}
            </span>
          </div>

          <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)]">Visibility</span>
              <span className="text-[10px] font-sans text-[var(--m-accent)] font-semibold">
                {visVal !== null ? visibilityStatus : '—'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-[var(--m-text-primary)]">
                {visVal !== null ? visVal : '—'}
              </span>
              {visVal !== null && <span className="text-[10px] font-sans text-[var(--m-text-muted)]">km</span>}
            </div>
            <span className="text-[10px] font-sans text-[var(--m-text-muted)] block mt-1 truncate">
              {visVal === null
                ? 'Visibility feed unavailable'
                : visVal >= 5
                ? 'Unrestricted sight distance'
                : 'Fog / mist caution'}
            </span>
          </div>

          <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)] col-span-2 sm:col-span-1">
            <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)] block">
              Hydroplane Risk
            </span>
            <div className="mt-2">
              <span className="text-sm font-sans font-bold text-[var(--m-accent)]">
                {roadCondition === 'Wet' || roadCondition === 'Waterlogged' ? 'Moderate / High' : 'Minimal'}
              </span>
            </div>
            <span className="text-[10px] font-sans text-[var(--m-text-muted)] block mt-1 truncate">
              Surface water runoff
            </span>
          </div>
        </div>

        <div className="mt-3.5 p-3 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-start gap-2.5">
          <AlertOctagon className="w-4 h-4 text-[var(--m-accent)] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="text-[var(--m-text-primary)]">
              <strong>Driver Assessment:</strong> {roadSafetyLabel}
            </p>
            {travelHazards.length > 0 && (
              <p className="text-[11px] text-[var(--m-text-muted)]">
                <strong>Highway Advisories:</strong> {travelHazards.join(' • ')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--m-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[var(--m-text-muted)]">
        <span>Source: <strong className="text-[var(--m-text-secondary)]">Surface Visibility &amp; Rain Telemetry</strong></span>
        <span>IRC Highway Safety Thresholds</span>
      </div>
    </div>
  );
};
