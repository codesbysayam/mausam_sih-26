import React, { useState, useEffect } from 'react';
import { LocationRecord, MarineObservation } from '../../types';
import { marineService } from '../../services/marineService';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
  UnavailableState,
} from '../ui/ObservatoryPrimitives';
import {
  Waves,
  Anchor,
  ShieldCheck,
} from 'lucide-react';
import { formatLocationTitle } from '../../utils/formatLocation';

interface CoastalMarineSectionProps {
  location: LocationRecord;
}

export const CoastalMarineSection: React.FC<CoastalMarineSectionProps> = ({ location }) => {
  const [marineData, setMarineData] = useState<MarineObservation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    marineService.getMarineData(location).then((data) => {
      if (isMounted) {
        setMarineData(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [location.id, location.lat, location.lng]);

  const isCoastal = marineService.isLocationCoastal(location);

  if (!isCoastal) {
    return (
      <DataPanel id="coastal-marine-section">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-text-muted)] shrink-0">
              <Waves className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--m-text-primary)] uppercase tracking-wider">
                Coastal &amp; Marine Meteorology
              </h3>
              <p className="text-xs text-[var(--m-text-muted)]">
                Not applicable to inland continental stations ({formatLocationTitle(location)})
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-md bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border border-[var(--m-border)] self-start sm:self-auto">
            INLAND STATION
          </span>
        </div>
      </DataPanel>
    );
  }

  if (loading) {
    return (
      <DataPanel id="coastal-marine-section" className="space-y-4">
        <SectionHeading
          title="Coastal & Marine Meteorology"
          subtitle={`Synchronizing wave height, swell, and SST for ${location.displayName || location.city}`}
          icon={<Waves className="w-4 h-4" />}
          action={<SourceStatus status="LOADING" source="Open-Meteo Marine" />}
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="m-panel-inset h-20" />
          ))}
        </div>
      </DataPanel>
    );
  }

  if (!marineData || !marineData.isApplicable || marineData.status === 'UNAVAILABLE') {
    return (
      <DataPanel id="coastal-marine-section">
        <UnavailableState
          title="Coastal & Marine Telemetry Unavailable"
          reason="Wave buoy / Open-Meteo marine grid data is unavailable for this coordinate cell."
          source={marineData?.source || 'Open-Meteo Marine'}
        />
      </DataPanel>
    );
  }

  const fishingBadgeColor =
    marineData.fishingSuitability === 'Favorable'
      ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35'
      : marineData.fishingSuitability === 'Caution'
      ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35'
      : marineData.fishingSuitability === 'Unavailable'
      ? 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]'
      : 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35';

  const beachBadgeColor =
    marineData.beachSafetyStatus === 'Safe'
      ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35'
      : marineData.beachSafetyStatus.includes('Caution')
      ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35'
      : marineData.beachSafetyStatus === 'Unavailable'
      ? 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]'
      : 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35';

  return (
    <DataPanel id="coastal-marine-section" className="space-y-4">
      <SectionHeading
        title="Coastal & Marine Meteorology"
        subtitle={`Sea state, swell period, and sea-surface temperature for ${location.displayName || location.city}`}
        icon={<Waves className="w-4 h-4" />}
        action={
          <SourceStatus
            status={marineData.status}
            source={marineData.source}
            updatedAt={marineData.timestampFormatted}
          />
        }
      />

      {/* Advisory Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="m-panel-inset p-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Anchor className="w-4 h-4 text-[var(--m-accent)] shrink-0" />
            <div>
              <div className="text-xs font-bold text-[var(--m-text-primary)]">Small Craft &amp; Fishing</div>
              <div className="text-[11px] text-[var(--m-text-muted)]">Derived from significant wave &amp; swell state</div>
            </div>
          </div>
          <span className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md uppercase border ${fishingBadgeColor}`}>
            {marineData.fishingSuitability}
          </span>
        </div>

        <div className="m-panel-inset p-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[var(--m-ok)] shrink-0" />
            <div>
              <div className="text-xs font-bold text-[var(--m-text-primary)]">Littoral Surf State</div>
              <div className="text-[11px] text-[var(--m-text-muted)]">Shoreline wave-height classification</div>
            </div>
          </div>
          <span className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md uppercase border ${beachBadgeColor}`}>
            {marineData.beachSafetyStatus}
          </span>
        </div>
      </div>

      {/* Numerical Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono tabular-nums">
        <div className="m-panel-inset p-3">
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] font-semibold uppercase">Wave Height</div>
          <div className="text-lg font-bold text-[var(--m-text-primary)] mt-0.5">
            {marineData.waveHeightMeters !== null ? `${marineData.waveHeightMeters} m` : '—'}
          </div>
          <div className="text-[10px] text-[var(--m-text-muted)] mt-0.5">
            Period: {marineData.wavePeriodSeconds !== null ? `${marineData.wavePeriodSeconds}s` : '—'}
          </div>
        </div>

        <div className="m-panel-inset p-3">
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] font-semibold uppercase">Swell Height</div>
          <div className="text-lg font-bold text-[var(--m-accent)] mt-0.5">
            {marineData.swellHeightMeters !== null ? `${marineData.swellHeightMeters} m` : '—'}
          </div>
          <div className="text-[10px] text-[var(--m-text-muted)] mt-0.5">
            Period: {marineData.swellPeriodSeconds !== null ? `${marineData.swellPeriodSeconds}s` : '—'}
          </div>
        </div>

        <div className="m-panel-inset p-3">
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] font-semibold uppercase">Sea Surface Temp</div>
          <div className="text-lg font-bold text-[var(--m-watch)] mt-0.5">
            {marineData.seaSurfaceTempC !== null ? `${marineData.seaSurfaceTempC}°C` : '—'}
          </div>
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] mt-0.5">Open-Meteo SST Grid</div>
        </div>

        <div className="m-panel-inset p-3">
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] font-semibold uppercase">Ocean Current</div>
          <div className="text-lg font-bold text-[var(--m-text-primary)] mt-0.5">
            {marineData.currentVelocityKmh !== null ? `${marineData.currentVelocityKmh} km/h` : '—'}
          </div>
          <div className="text-[10px] text-[var(--m-text-muted)] mt-0.5">
            {marineData.currentDirectionCompass && marineData.currentDirectionDeg !== null
              ? `Towards ${marineData.currentDirectionCompass} (${marineData.currentDirectionDeg}°)`
              : 'Direction unavailable'}
          </div>
        </div>

        <div className="m-panel-inset p-3">
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] font-semibold uppercase">Next High Tide</div>
          <div className="text-sm font-bold text-[var(--m-text-primary)] mt-1">
            {marineData.highTideTime || 'Unavailable'}
          </div>
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] mt-0.5">
            {marineData.highTideTime ? 'Tide gauge feed' : 'Requires harmonic tide feed'}
          </div>
        </div>

        <div className="m-panel-inset p-3">
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] font-semibold uppercase">Next Low Tide</div>
          <div className="text-sm font-bold text-[var(--m-text-primary)] mt-1">
            {marineData.lowTideTime || 'Unavailable'}
          </div>
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] mt-0.5">
            {marineData.lowTideTime ? 'Tide gauge feed' : 'Requires harmonic tide feed'}
          </div>
        </div>
      </div>
    </DataPanel>
  );
};
