import React from 'react';
import {
  Thermometer,
  CloudRain,
  Gauge,
  Droplets,
  Wind,
  AlertTriangle,
  Lock,
  Unlock,
  Plus,
  Minus,
  RotateCcw,
  Crosshair,
} from 'lucide-react';
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

const METRICS: {
  id: WeatherMapMetric;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'temperature', label: 'Temperature', Icon: Thermometer },
  { id: 'rainfall', label: 'Rainfall', Icon: CloudRain },
  { id: 'aqi', label: 'AQI', Icon: Gauge },
  { id: 'humidity', label: 'Humidity', Icon: Droplets },
  { id: 'wind', label: 'Wind', Icon: Wind },
  { id: 'warnings', label: 'Warnings', Icon: AlertTriangle },
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
    <div className="bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-t-xl px-3 py-2 flex items-center justify-between gap-2.5 text-xs overflow-x-auto no-scrollbar">
      {/* Left: Layer Selector Buttons (or active sector summary when rail is visible) */}
      {!hideMetricSelector ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-semibold text-[var(--m-text-muted)] uppercase tracking-wider mr-1 hidden sm:inline">
            Layer:
          </span>
          <div className="flex items-center gap-1 bg-[var(--m-surface-inset)] p-0.5 rounded-lg border border-[var(--m-border)]">
            {METRICS.map((m) => {
              const isActive = activeMetric === m.id;
              const Icon = m.Icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectMetric(m.id)}
                  className={`min-h-[36px] px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer m-focus-ring ${
                    isActive
                      ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)] font-semibold'
                      : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--m-text-muted)] shrink-0">
            Sector
          </span>
          <span className="text-xs font-semibold text-[var(--m-text-primary)] truncate">
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
          className={`min-h-[36px] px-2.5 flex items-center gap-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 m-focus-ring ${
            isLocked
              ? 'bg-[#F59E0B]/15 text-[#FCD34D] border border-[#F59E0B]/55'
              : 'bg-[var(--m-surface-inset)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-1)] border border-[var(--m-border)]'
          }`}
        >
          {isLocked ? (
            <Lock className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Unlock className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="font-mono uppercase tracking-wider text-[10px]">
            {isLocked ? 'Locked' : 'Lock View'}
          </span>
        </button>

        <div className="h-4 w-px bg-[var(--m-surface-2)] mx-0.5 hidden sm:block" />

        <button
          type="button"
          onClick={isLocked ? undefined : onZoomIn}
          disabled={isLocked}
          aria-label="Zoom in"
          title={isLocked ? 'Map is locked to sector. Unlock to zoom.' : 'Zoom In'}
          className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors m-focus-ring ${
            isLocked
              ? 'bg-[var(--m-surface-inset)]/60 text-[var(--m-text-muted)]/40 border-[var(--m-border)]/50 cursor-not-allowed'
              : 'bg-[var(--m-surface-inset)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-1)] border-[var(--m-border)] cursor-pointer'
          }`}
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={isLocked ? undefined : onZoomOut}
          disabled={isLocked}
          aria-label="Zoom out"
          title={isLocked ? 'Map is locked to sector. Unlock to zoom.' : 'Zoom Out'}
          className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors m-focus-ring ${
            isLocked
              ? 'bg-[var(--m-surface-inset)]/60 text-[var(--m-text-muted)]/40 border-[var(--m-border)]/50 cursor-not-allowed'
              : 'bg-[var(--m-surface-inset)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-1)] border-[var(--m-border)] cursor-pointer'
          }`}
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={isLocked ? undefined : onResetView}
          disabled={isLocked}
          title={isLocked ? 'Map is locked to sector. Unlock to reset view.' : 'Reset Map to All India View'}
          className={`min-h-[36px] px-2.5 flex items-center gap-1 rounded-lg border text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 m-focus-ring ${
            isLocked
              ? 'bg-[var(--m-surface-inset)]/60 text-[var(--m-text-muted)]/40 border-[var(--m-border)]/50 cursor-not-allowed'
              : 'bg-[var(--m-surface-inset)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-1)] border-[var(--m-border)] cursor-pointer'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">Reset</span>
        </button>

        {hasUserLocation && (
          <button
            type="button"
            onClick={isLocked ? undefined : onMyLocation}
            disabled={isLocked}
            title={isLocked ? 'Map is locked to sector. Unlock to pan to location.' : 'Pan to My Detected Coordinates'}
            className={`min-h-[36px] px-2.5 flex items-center gap-1 rounded-lg border text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 m-focus-ring ${
              isLocked
                ? 'bg-[var(--m-accent-soft)] text-[var(--m-accent)]/40 border-[var(--m-accent)]/20 cursor-not-allowed'
                : 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] hover:bg-[var(--m-accent-hover)] hover:text-white border-[var(--m-accent)]/40 cursor-pointer'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">My Location</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MapToolbar;
