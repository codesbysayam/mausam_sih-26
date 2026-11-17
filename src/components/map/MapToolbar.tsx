import React from 'react';
import { WeatherMapMetric } from './MapLayerControl';

export interface MapToolbarProps {
  activeMetric: WeatherMapMetric;
  onSelectMetric: (metric: WeatherMapMetric) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetView?: () => void;
  onMyLocation?: () => void;
  hasUserLocation?: boolean;
  isLocked?: boolean;
  onToggleLock?: () => void;
  sectorName?: string;
  hideMetricSelector?: boolean;
}

const METRICS: { id: WeatherMapMetric; label: string; icon: string }[] = [
  { id: 'temperature', label: 'Temperature', icon: 'thermostat' },
  { id: 'rainfall', label: 'Rainfall', icon: 'rainy' },
  { id: 'aqi', label: 'AQI', icon: 'air' },
  { id: 'humidity', label: 'Humidity', icon: 'humidity_percentage' },
  { id: 'wind', label: 'Wind', icon: 'airwave' },
  { id: 'warnings', label: 'Warnings', icon: 'warning' },
];

export const MapToolbar: React.FC<MapToolbarProps> = ({
  activeMetric,
  onSelectMetric,
  onZoomIn,
  onZoomOut,
  onResetView,
  onMyLocation,
  hasUserLocation = false,
  isLocked = false,
  onToggleLock,
  sectorName,
  hideMetricSelector = false,
}) => {
  return (
    <div className="bg-[#101B26] border border-white/12 rounded-t-xl px-3 py-2 flex items-center justify-between gap-2.5 text-xs overflow-x-auto no-scrollbar">
      {/* Left: Layer Selector Buttons (or active sector summary when rail is visible) */}
      {!hideMetricSelector ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-semibold text-[#8EA3B8] uppercase tracking-wider mr-1 hidden sm:inline">
            Layer:
          </span>
          <div className="flex items-center gap-1 bg-[#162331] p-0.5 rounded-lg border border-white/10">
            {METRICS.map((m) => {
              const isActive = activeMetric === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectMetric(m.id)}
                  className={`min-h-[34px] px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#1499E8] text-white font-semibold'
                      : 'text-[#B6C7D8] hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#8EA3B8] shrink-0">
            Sector
          </span>
          <span className="text-xs font-semibold text-[#F4F7FA] truncate">
            {sectorName || 'India Meteorological Sector'}
          </span>
        </div>
      )}

      {/* Center/Right: Map Controls & Sector Lock */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        <button
          type="button"
          id="btn-radar-map-lock"
          onClick={onToggleLock}
          aria-label={isLocked ? 'Unlock radar map panning and zooming' : 'Lock radar map to current sector'}
          aria-pressed={isLocked}
          title={
            isLocked
              ? `Map locked to ${sectorName || 'current weather sector'}. Click to unlock.`
              : 'Lock view to current weather sector (prevents accidental panning & zooming)'
          }
          className={`min-h-[34px] px-2.5 flex items-center gap-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
            isLocked
              ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/60'
              : 'bg-[#162331] text-[#B6C7D8] hover:text-white hover:bg-[#1B2C3D] border border-white/10'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">
            {isLocked ? 'lock' : 'lock_open'}
          </span>
          <span className="font-mono uppercase tracking-wider text-[10px]">
            {isLocked ? 'Locked' : 'Lock View'}
          </span>
        </button>

        <div className="h-4 w-px bg-white/10 mx-0.5 hidden sm:block" />

        <button
          type="button"
          onClick={isLocked ? undefined : onZoomIn}
          disabled={isLocked}
          aria-label="Zoom in"
          title={isLocked ? 'Map is locked to sector. Unlock to zoom.' : 'Zoom In'}
          className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
            isLocked
              ? 'bg-[#162331]/50 text-[#8EA3B8]/40 border-white/5 cursor-not-allowed'
              : 'bg-[#162331] text-[#B6C7D8] hover:text-white border-white/10 cursor-pointer'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
        </button>

        <button
          type="button"
          onClick={isLocked ? undefined : onZoomOut}
          disabled={isLocked}
          aria-label="Zoom out"
          title={isLocked ? 'Map is locked to sector. Unlock to zoom.' : 'Zoom Out'}
          className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
            isLocked
              ? 'bg-[#162331]/50 text-[#8EA3B8]/40 border-white/5 cursor-not-allowed'
              : 'bg-[#162331] text-[#B6C7D8] hover:text-white border-white/10 cursor-pointer'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">remove</span>
        </button>

        <button
          type="button"
          onClick={isLocked ? undefined : onResetView}
          disabled={isLocked}
          title={isLocked ? 'Map is locked to sector. Unlock to reset view.' : 'Reset Map to All India View'}
          className={`min-h-[34px] px-2.5 flex items-center gap-1 rounded-lg border text-[11px] font-medium transition-colors ${
            isLocked
              ? 'bg-[#162331]/50 text-[#8EA3B8]/40 border-white/5 cursor-not-allowed'
              : 'bg-[#162331] text-[#B6C7D8] hover:text-white border-white/10 cursor-pointer'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">restart_alt</span>
          <span className="hidden md:inline">Reset</span>
        </button>

        {hasUserLocation && (
          <button
            type="button"
            onClick={isLocked ? undefined : onMyLocation}
            disabled={isLocked}
            title={isLocked ? 'Map is locked to sector. Unlock to pan to location.' : 'Pan to My Detected Coordinates'}
            className={`min-h-[34px] px-2.5 flex items-center gap-1 rounded-lg border text-[11px] font-medium transition-colors ${
              isLocked
                ? 'bg-[#1499E8]/10 text-[#38BDF8]/40 border-[#1499E8]/20 cursor-not-allowed'
                : 'bg-[#1499E8]/15 text-[#38BDF8] hover:bg-[#1499E8] hover:text-white border-[#1499E8]/40 cursor-pointer'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">my_location</span>
            <span className="hidden md:inline">My Location</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MapToolbar;

