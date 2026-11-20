import React from 'react';
import { RadarStation } from '../../types/radar';
import { StateWeatherData } from '../map/IndiaWeatherMap';
import { formatCoordinatePair } from '../../../shared/weatherContract';

export interface StationObservationPanelProps {
  viewMode: 'synoptic' | 'radar';
  station?: RadarStation | null;
  stateData?: StateWeatherData | null;
  observationTime?: string;
  dataStatus?: 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';
  onSwitchMode?: (mode: 'synoptic' | 'radar') => void;
}

export const StationObservationPanel: React.FC<StationObservationPanelProps> = ({
  viewMode,
  station,
  stateData,
  observationTime = 'Awaiting telemetry sync',
  dataStatus = 'RECENT',
}) => {
  const isRadar = viewMode === 'radar';

  const title = isRadar
    ? station?.name || 'Select Radar Station'
    : stateData?.name ? `${stateData.name} Regional Summary` : 'Select State Observation';

  const code = isRadar
    ? station?.id || 'DWR'
    : stateData?.id?.replace('IN-', '') || 'REG';

  const stateName = isRadar
    ? station?.state || 'India Network'
    : stateData?.name || 'National Grid';

  const coords = isRadar && station
    ? formatCoordinatePair(station.latitude, station.longitude, 4)
    : stateData
    ? 'State Meteorological Reference'
    : 'N/A';

  const source = isRadar
    ? 'IMD Doppler Radar Network Reference'
    : stateData?.dataSource || 'Regional Meteorological Reference Snapshot';

  const getStatusBadge = () => {
    switch (dataStatus) {
      case 'LIVE':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#22C7A0]/15 text-[#22C7A0]">
            LIVE
          </span>
        );
      case 'RECENT':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--m-accent-soft)] text-[var(--m-accent)]">
            RECENT
          </span>
        );
      case 'STALE':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#F59E0B]/15 text-[#F59E0B]">
            STALE
          </span>
        );
      case 'UNAVAILABLE':
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#EF4444]/15 text-[#EF4444]">
            UNAVAILABLE
          </span>
        );
    }
  };

  return (
    <div className="bg-[#101B26] border border-white/12 rounded-xl p-4 flex flex-col justify-between h-full text-[var(--m-text-primary)]">
      <div>
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-[#B6C7D8]">
              {isRadar ? 'Selected Radar' : 'Regional Reference'}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--m-surface-2)] text-[var(--m-accent)]">
              {code}
            </span>
          </div>
          {getStatusBadge()}
        </div>

        <div className="mb-3.5">
          <h3 className="text-base font-semibold text-[var(--m-text-primary)] leading-snug line-clamp-1">{title}</h3>
          <div className="flex items-center gap-2 text-xs text-[#B6C7D8] mt-1 flex-wrap">
            <span>{stateName}</span>
            <span>•</span>
            <span className="font-mono text-[11px] tabular-nums text-[var(--m-text-primary)]">{coords}</span>
          </div>
          <div className="text-[11px] text-[var(--m-text-muted)] mt-1">
            <span>Source: <strong className="text-[#B6C7D8] font-medium">{source}</strong></span>
          </div>
          <div className="text-[11px] text-[var(--m-text-muted)] mt-0.5">
            <span>Updated: <span className="font-mono tabular-nums text-[#B6C7D8]">{observationTime}</span></span>
          </div>
        </div>

        <div className="mb-3.5">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-[var(--m-text-muted)] mb-1.5">
            Regional Reference Readings
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[var(--m-surface-2)] p-2.5 rounded-lg">
              <span className="text-[10px] text-[var(--m-text-muted)] block">Temperature</span>
              <span className="text-sm font-bold font-mono tabular-nums text-[var(--m-text-primary)]">
                {stateData?.temperature != null ? `${stateData.temperature}°C` : 'N/A'}
              </span>
            </div>

            <div className="bg-[var(--m-surface-2)] p-2.5 rounded-lg">
              <span className="text-[10px] text-[var(--m-text-muted)] block">Rainfall (24h)</span>
              <span className="text-sm font-bold font-mono tabular-nums text-[var(--m-accent)]">
                {stateData?.rainfall != null ? `${stateData.rainfall} mm` : 'N/A'}
              </span>
            </div>

            <div className="bg-[var(--m-surface-2)] p-2.5 rounded-lg">
              <span className="text-[10px] text-[var(--m-text-muted)] block">Wind Speed</span>
              <span className="text-sm font-bold font-mono tabular-nums text-[#22C7A0]">
                {stateData?.windSpeed != null ? `${stateData.windSpeed} km/h ${stateData.windDir || ''}` : 'N/A'}
              </span>
            </div>

            <div className="bg-[var(--m-surface-2)] p-2.5 rounded-lg">
              <span className="text-[10px] text-[var(--m-text-muted)] block">Relative Humidity</span>
              <span className="text-sm font-bold font-mono tabular-nums text-[var(--m-text-primary)]">
                {stateData?.humidity != null ? `${stateData.humidity}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {isRadar && station && (
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-[var(--m-text-muted)] mb-1.5">
              Station Hardware Parameters
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[var(--m-surface-2)] p-2.5 rounded-lg">
                <span className="text-[10px] text-[var(--m-text-muted)] block">Radar Band</span>
                <span className="text-xs font-semibold font-mono text-[var(--m-accent)]">{station.band}</span>
              </div>
              <div className="bg-[var(--m-surface-2)] p-2.5 rounded-lg">
                <span className="text-[10px] text-[var(--m-text-muted)] block">Surveillance Range</span>
                <span className="text-xs font-semibold font-mono tabular-nums text-[var(--m-text-primary)]">{station.maxRangeKm} km</span>
              </div>
              <div className="bg-[var(--m-surface-2)] p-2.5 rounded-lg">
                <span className="text-[10px] text-[var(--m-text-muted)] block">Antenna Elevation</span>
                <span className="text-xs font-semibold font-mono tabular-nums text-[#22C7A0]">{station.elevationM ? `${station.elevationM}m ASL` : 'Site ASL'}</span>
              </div>
              <div className="bg-[var(--m-surface-2)] p-2.5 rounded-lg">
                <span className="text-[10px] text-[var(--m-text-muted)] block">Scan Cycle</span>
                <span className="text-xs font-semibold font-mono text-[var(--m-text-primary)]">10 Minutes</span>
              </div>
            </div>
          </div>
        )}

        {!isRadar && stateData?.warningMessage && (
          <div className="bg-[var(--m-surface-2)] p-2.5 rounded-lg text-xs">
            <span className="text-[10px] text-[#F59E0B] font-semibold uppercase tracking-wider block mb-0.5">
              Warning Summary
            </span>
            <p className="text-[11px] text-[#B6C7D8] leading-relaxed line-clamp-2">
              {stateData.warningMessage}
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-white/10 text-[10px] text-[var(--m-text-muted)]">
        <span>Unmeasured fields display N/A rather than fabricated numbers.</span>
      </div>
    </div>
  );
};

export default StationObservationPanel;
