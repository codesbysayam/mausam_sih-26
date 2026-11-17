import React from 'react';
import { RadarStation } from '../../types/radar';
import { StateWeatherData } from '../map/IndiaWeatherMap';

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
    ? `${station.latitude.toFixed(4)}°N, ${station.longitude.toFixed(4)}°E`
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
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#38BDF8]/15 text-[#38BDF8]">
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
    <div className="bg-[#101B26] border border-white/12 rounded-xl p-4 flex flex-col justify-between h-full text-[#F4F7FA]">
      <div>
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-[#B6C7D8]">
              {isRadar ? 'Selected Radar' : 'Regional Reference'}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#162331] text-[#38BDF8]">
              {code}
            </span>
          </div>
          {getStatusBadge()}
        </div>

        <div className="mb-3.5">
          <h3 className="text-base font-semibold text-[#F4F7FA] leading-snug line-clamp-1">{title}</h3>
          <div className="flex items-center gap-2 text-xs text-[#B6C7D8] mt-1 flex-wrap">
            <span>{stateName}</span>
            <span>•</span>
            <span className="font-mono text-[11px] tabular-nums text-[#F4F7FA]">{coords}</span>
          </div>
          <div className="text-[11px] text-[#8EA3B8] mt-1">
            <span>Source: <strong className="text-[#B6C7D8] font-medium">{source}</strong></span>
          </div>
          <div className="text-[11px] text-[#8EA3B8] mt-0.5">
            <span>Updated: <span className="font-mono tabular-nums text-[#B6C7D8]">{observationTime}</span></span>
          </div>
        </div>

        <div className="mb-3.5">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-[#8EA3B8] mb-1.5">
            Regional Reference Readings
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#162331] p-2.5 rounded-lg">
              <span className="text-[10px] text-[#8EA3B8] block">Temperature</span>
              <span className="text-sm font-bold font-mono tabular-nums text-[#F4F7FA]">
                {stateData?.temperature != null ? `${stateData.temperature}°C` : 'N/A'}
              </span>
            </div>

            <div className="bg-[#162331] p-2.5 rounded-lg">
              <span className="text-[10px] text-[#8EA3B8] block">Rainfall (24h)</span>
              <span className="text-sm font-bold font-mono tabular-nums text-[#38BDF8]">
                {stateData?.rainfall != null ? `${stateData.rainfall} mm` : 'N/A'}
              </span>
            </div>

            <div className="bg-[#162331] p-2.5 rounded-lg">
              <span className="text-[10px] text-[#8EA3B8] block">Wind Speed</span>
              <span className="text-sm font-bold font-mono tabular-nums text-[#22C7A0]">
                {stateData?.windSpeed != null ? `${stateData.windSpeed} km/h ${stateData.windDir || ''}` : 'N/A'}
              </span>
            </div>

            <div className="bg-[#162331] p-2.5 rounded-lg">
              <span className="text-[10px] text-[#8EA3B8] block">Relative Humidity</span>
              <span className="text-sm font-bold font-mono tabular-nums text-[#F4F7FA]">
                {stateData?.humidity != null ? `${stateData.humidity}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {isRadar && station && (
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-[#8EA3B8] mb-1.5">
              Station Hardware Parameters
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#162331] p-2.5 rounded-lg">
                <span className="text-[10px] text-[#8EA3B8] block">Radar Band</span>
                <span className="text-xs font-semibold font-mono text-[#38BDF8]">{station.band}</span>
              </div>
              <div className="bg-[#162331] p-2.5 rounded-lg">
                <span className="text-[10px] text-[#8EA3B8] block">Surveillance Range</span>
                <span className="text-xs font-semibold font-mono tabular-nums text-[#F4F7FA]">{station.maxRangeKm} km</span>
              </div>
              <div className="bg-[#162331] p-2.5 rounded-lg">
                <span className="text-[10px] text-[#8EA3B8] block">Antenna Elevation</span>
                <span className="text-xs font-semibold font-mono tabular-nums text-[#22C7A0]">{station.elevationM ? `${station.elevationM}m ASL` : 'Site ASL'}</span>
              </div>
              <div className="bg-[#162331] p-2.5 rounded-lg">
                <span className="text-[10px] text-[#8EA3B8] block">Scan Cycle</span>
                <span className="text-xs font-semibold font-mono text-[#F4F7FA]">10 Minutes</span>
              </div>
            </div>
          </div>
        )}

        {!isRadar && stateData?.warningMessage && (
          <div className="bg-[#162331] p-2.5 rounded-lg text-xs">
            <span className="text-[10px] text-[#F59E0B] font-semibold uppercase tracking-wider block mb-0.5">
              Warning Summary
            </span>
            <p className="text-[11px] text-[#B6C7D8] leading-relaxed line-clamp-2">
              {stateData.warningMessage}
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-white/10 text-[10px] text-[#8EA3B8]">
        <span>Unmeasured fields display N/A rather than fabricated numbers.</span>
      </div>
    </div>
  );
};

export default StationObservationPanel;
