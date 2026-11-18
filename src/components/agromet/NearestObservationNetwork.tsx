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
                <span className="text-[10px] font-mono font-bold text-[#35C7E8] bg-[#35C7E8]/12 px-2 py-0.5 rounded border border-[#35C7E8]/30">
                  {primaryStationId}
                </span>
                <span className="text-[10px] font-mono font-semibold text-[#6EE7B7]">
                  PRIMARY SYNCED NODE
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#F3F6FA]">{primaryStationName}</h3>
              <div className="text-[11px] font-mono text-[#8295A8] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{primarySource}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono tabular-nums text-[#F3F6FA] bg-[#07111D] p-3 rounded-lg border border-[#26394B]">
              <div className="flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>{temp.toFixed(1)}°C</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-[#35C7E8]" />
                <span>{humidity !== null ? `${Math.round(humidity)}%` : '—'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-[#B5C3D1]" />
                <span>{wind !== null ? `${Math.round(wind)} km/h` : '—'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5 text-[#35C7E8]" />
                <span>{rain !== null ? `${rain} mm` : '—'}</span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-[#8295A8] flex items-center justify-between pt-2 border-t border-[#26394B] tabular-nums">
              <span>Observation Cadence: Hourly</span>
              <span>{lastUpdatedStr ? `${lastUpdatedStr}` : 'Timestamp pending'}</span>
            </div>
          </div>

          <div className="m-panel-inset p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold text-[#8295A8] bg-[#101F2E] px-2 py-0.5 rounded border border-[#26394B]">
                  SECONDARY ARG / KVK NODES
                </span>
                <span className="text-[10px] font-mono text-[#8295A8]">FEED NOT CONNECTED</span>
              </div>
              <h3 className="text-sm font-semibold text-[#F3F6FA]">
                Sub-District Block Rain Gauges
              </h3>
              <p className="text-xs text-[#B5C3D1] leading-relaxed">
                Direct sub-district Automatic Rain Gauge (ARG) and ICAR-KVK block sensors are not published over this endpoint. Readings are never extrapolated from the primary station.
              </p>
            </div>
            <div className="text-[11px] font-mono text-[#8295A8] pt-2 border-t border-[#26394B]">
              Upstream: IMD AWS / State Agromet Telemetry Gateway
            </div>
          </div>
        </div>
      )}
    </DataPanel>
  );
};
