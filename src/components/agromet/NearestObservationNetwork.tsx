import React from 'react';
import {
  Radio,
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
} from 'lucide-react';
import { WeatherDataBundle } from '../../services/weatherService';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
  UnavailableState,
} from '../ui/ObservatoryPrimitives';

interface NearestObservationNetworkProps {
  weather?: WeatherDataBundle;
  stateName: string;
  districtName: string;
  lastUpdatedStr: string;
}

export const NearestObservationNetwork: React.FC<NearestObservationNetworkProps> = ({
  weather,
  stateName,
  districtName,
  lastUpdatedStr,
}) => {
  const current = weather?.current;
  const temp = typeof current?.temp === 'number' ? current.temp : null;
  const humidity = typeof current?.humidity === 'number' ? current.humidity : null;
  const wind = typeof current?.windSpeed === 'number' ? current.windSpeed : null;
  const rain = typeof current?.precipitation === 'number' ? current.precipitation : null;
  const isAvailable = temp !== null;

  const primaryStationId =
    current?.stationCode || `AWS-${districtName.toUpperCase().slice(0, 3)}-01`;
  const primaryStationName =
    current?.stationName || `${districtName} District Meteorological Station`;
  const primarySource =
    current?.observationSource || current?.source || 'IMD / Open-Meteo Surface Feed';

  return (
    <DataPanel id="agromet-observation-network" className="space-y-4">
      <SectionHeading
        title="Nearest Meteorological Observation Station"
        subtitle={`Primary synced surface telemetry node serving ${districtName}, ${stateName}`}
        icon={<Radio className="w-4 h-4" />}
        badge={
          <SourceStatus
            status={isAvailable ? 'LIVE' : 'UNAVAILABLE'}
            source={primarySource}
            updatedAt={lastUpdatedStr || null}
          />
        }
      />

      {!isAvailable ? (
        <UnavailableState
          title="Surface Observation Telemetry Offline"
          reason={`No active surface observation readings have synced for ${districtName}, ${stateName}.`}
          source={primarySource}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="m-panel-inset p-4 flex flex-col justify-between space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold text-[var(--m-accent)] bg-[var(--m-accent-soft)] px-2 py-0.5 rounded border border-[var(--m-accent)]/30">
                  {primaryStationId}
                </span>
                <span className="text-[10px] font-mono font-semibold text-[var(--m-ok)]">
                  PRIMARY SYNCED NODE
                </span>
              </div>
              <h3 className="text-sm font-bold text-[var(--m-text-primary)]">{primaryStationName}</h3>
              <div className="text-[11px] font-mono text-[var(--m-text-muted)] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{primarySource}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono tabular-nums text-[var(--m-text-primary)] bg-[var(--m-surface-inset)] p-3 rounded-lg border border-[var(--m-border)]">
              <div className="flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-[var(--m-watch)]" />
                <span>{temp.toFixed(1)}°C</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-[var(--m-accent)]" />
                <span>{humidity !== null ? `${Math.round(humidity)}%` : '—'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-[var(--m-text-secondary)]" />
                <span>{wind !== null ? `${Math.round(wind)} km/h` : '—'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5 text-[var(--m-accent)]" />
                <span>{rain !== null ? `${rain} mm` : '—'}</span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-[var(--m-text-muted)] flex items-center justify-between pt-2 border-t border-[var(--m-border)] tabular-nums">
              <span>Observation Cadence: Hourly</span>
              <span>{lastUpdatedStr ? `${lastUpdatedStr}` : 'Timestamp pending'}</span>
            </div>
          </div>

          <div className="m-panel-inset p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold text-[var(--m-text-muted)] bg-[var(--m-surface-2)] px-2 py-0.5 rounded border border-[var(--m-border)]">
                  SECONDARY ARG / KVK NODES
                </span>
                <span className="text-[10px] font-mono text-[var(--m-text-muted)]">FEED NOT CONNECTED</span>
              </div>
              <h3 className="text-sm font-semibold text-[var(--m-text-primary)]">
                Sub-District Block Rain Gauges
              </h3>
              <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
                Direct sub-district Automatic Rain Gauge (ARG) and ICAR-KVK block sensors are not published over this endpoint. Readings are never extrapolated from the primary station.
              </p>
            </div>
            <div className="text-[11px] font-mono text-[var(--m-text-muted)] pt-2 border-t border-[var(--m-border)]">
              Upstream: IMD AWS / State Agromet Telemetry Gateway
            </div>
          </div>
        </div>
      )}
    </DataPanel>
  );
};
