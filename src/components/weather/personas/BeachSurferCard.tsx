import React from 'react';
import { AuthoritativeTide, AuthoritativeMarine } from '../../../services/authoritativeService';
import { UnavailableState } from '../../ui/ObservatoryPrimitives';
import { Waves, Anchor } from 'lucide-react';

interface BeachSurferCardProps {
  isCoastal: boolean;
  tides: AuthoritativeTide | null;
  marine: AuthoritativeMarine | null;
  city: string;
}

export const BeachSurferCard: React.FC<BeachSurferCardProps> = ({
  isCoastal,
  tides,
  marine,
  city,
}) => {
  const surfBadgeColor =
    !marine
      ? 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]'
      : marine.surfCondition === 'Calm & Safe'
      ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35'
      : marine.surfCondition === 'Moderate Swell'
      ? 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/35'
      : marine.surfCondition === 'Rough Waves'
      ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35'
      : 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35';

  return (
    <div className="m-panel-inset p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--m-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-1)] text-[var(--m-accent)] flex items-center justify-center border border-[var(--m-border)]">
              <Waves className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--m-text-primary)] uppercase tracking-wide">
                Beach, Surf &amp; Maritime
              </h3>
              <p className="text-[11px] text-[var(--m-text-muted)]">
                Coastal Marine Hydrodynamics • {city}
              </p>
            </div>
          </div>
          {isCoastal ? (
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${surfBadgeColor}`}>
              {marine?.surfCondition || 'Unavailable'}
            </span>
          ) : (
            <span className="text-[10px] font-mono bg-[var(--m-surface-1)] text-[var(--m-text-muted)] px-2 py-0.5 rounded border border-[var(--m-border)]">
              Inland Sector
            </span>
          )}
        </div>

        {!isCoastal ? (
          <div className="mt-4 p-4 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] text-center">
            <Waves className="w-7 h-7 text-[var(--m-text-muted)] mx-auto" />
            <p className="text-xs text-[var(--m-text-secondary)] mt-2 leading-relaxed">
              {city} is an inland station. Marine swell, wave period, and sea-surface temperature telemetry apply only to coastal districts (e.g. Mumbai, Puri, Paradip, Chennai, Kochi, Visakhapatnam).
            </p>
          </div>
        ) : !marine && !tides ? (
          <div className="mt-4">
            <UnavailableState
              title="Coastal Marine Feed Unavailable"
              reason="Real-time wave buoy and hydrographic tide observations are currently unavailable for this coastal sector."
              source="Open-Meteo Marine"
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 font-mono tabular-nums">
              <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)]">High Tide</span>
                  <span className="text-[10px] text-[var(--m-ok)] font-bold">
                    {tides?.nextHighTide ? 'Flood' : '—'}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-base font-bold text-[var(--m-text-primary)]">
                    {tides?.nextHighTide?.time || 'Unavailable'}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--m-accent)] block mt-1">
                  {tides?.nextHighTide?.heightMeters !== undefined
                    ? `Peak: +${tides.nextHighTide.heightMeters} m`
                    : 'Requires tide gauge'}
                </span>
              </div>

              <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)]">Low Tide</span>
                  <span className="text-[10px] text-[var(--m-watch)] font-bold">
                    {tides?.nextLowTide ? 'Ebb' : '—'}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-base font-bold text-[var(--m-text-primary)]">
                    {tides?.nextLowTide?.time || 'Unavailable'}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--m-text-muted)] block mt-1">
                  {tides?.nextLowTide?.heightMeters !== undefined
                    ? `Low: +${tides.nextLowTide.heightMeters} m`
                    : 'Requires tide gauge'}
                </span>
              </div>

              <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
                <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)] block">
                  Wave Height
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-[var(--m-text-primary)]">
                    {typeof marine?.waveHeightMeters === 'number' ? marine.waveHeightMeters : '—'}
                  </span>
                  {typeof marine?.waveHeightMeters === 'number' && (
                    <span className="text-[10px] font-sans text-[var(--m-text-muted)]">m</span>
                  )}
                </div>
                <span className="text-[10px] text-[var(--m-text-muted)] block mt-1">
                  Period: {typeof marine?.wavePeriodSeconds === 'number' ? `${marine.wavePeriodSeconds}s` : '—'}
                </span>
              </div>

              <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
                <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)] block">
                  Water Temp (SST)
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-[var(--m-ok)]">
                    {typeof marine?.seaSurfaceTemperatureC === 'number'
                      ? marine.seaSurfaceTemperatureC
                      : '—'}
                  </span>
                  {typeof marine?.seaSurfaceTemperatureC === 'number' && (
                    <span className="text-[10px] text-[var(--m-text-muted)]">°C</span>
                  )}
                </div>
                <span className="text-[10px] font-sans text-[var(--m-text-muted)] block mt-1">Sea Surface Temp</span>
              </div>
            </div>

            {marine?.marineAdvisory && (
              <div className="mt-3.5 p-3 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-start gap-2.5">
                <Anchor className="w-4 h-4 text-[var(--m-accent)] shrink-0 mt-0.5" />
                <p className="text-xs text-[var(--m-text-secondary)]">
                  <strong className="text-[var(--m-text-primary)]">Marine Advisory:</strong> {marine.marineAdvisory}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--m-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[var(--m-text-muted)]">
        <span>Source: <strong className="text-[var(--m-text-secondary)]">{marine?.source || tides?.source || 'Open-Meteo Marine'}</strong></span>
        <span>Coastal Hydrography</span>
      </div>
    </div>
  );
};
