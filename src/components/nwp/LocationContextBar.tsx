import React from 'react';
import { LocationRecord } from '../../types';
import { MapPin, RefreshCw, Navigation, SlidersHorizontal } from 'lucide-react';

interface LocationContextBarProps {
  location: LocationRecord;
  source?: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  isLocating?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
  onOpenLocationCenter?: () => void;
  onDetectLocation?: () => void;
}

export const LocationContextBar: React.FC<LocationContextBarProps> = ({
  location,
  source = 'DEVICE_GPS',
  isLocating = false,
  isLoading = false,
  onRefresh,
  onOpenLocationCenter,
  onDetectLocation,
}) => {
  const lat = typeof location.lat === 'number' ? location.lat : 20.36;
  const lon = typeof location.lng === 'number' ? location.lng : 85.81;
  const isGps = source === 'DEVICE_GPS';

  return (
    <div
      id="nwp-location-context-bar"
      className="w-full bg-[var(--m-surface-1)] border border-[var(--m-border)] rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm backdrop-blur-xs"
    >
      {/* Left: Location Identity & Coordinates */}
      <div className="flex items-center gap-2.5 flex-wrap min-w-0">
        <div className="w-7 h-7 rounded-lg bg-[#0E2D4A] border border-[var(--m-border)] flex items-center justify-center text-[#29B6F6] shrink-0">
          <MapPin className="w-4 h-4" />
        </div>

        {/* GPS Badge */}
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider ${
            isGps
              ? 'bg-[#00E676]/15 border border-[#00E676]/40 text-[#00E676]'
              : 'bg-[#29B6F6]/15 border border-[#29B6F6]/40 text-[#29B6F6]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          <span>{isGps ? 'GPS ACTIVE' : 'MANUAL LOCATION'}</span>
        </span>

        {/* City & State */}
        <span className="text-white font-semibold text-xs sm:text-sm tracking-tight truncate">
          {location.city || 'Chandaka'}, {location.state || 'Odisha'}
        </span>

        <span className="text-slate-500 hidden sm:inline">•</span>

        {/* Nearest Observation */}
        <span className="text-[#AFC4D8] text-[11px] truncate hidden md:inline">
          Nearest Observation:{' '}
          <span className="text-slate-200">
            {location.district || location.city || 'Bhubaneswar'}, {location.state || 'Odisha'}
          </span>
        </span>

        <span className="text-slate-500 hidden md:inline">•</span>

        {/* Coordinates */}
        <span className="text-[#AFC4D8] text-[11px] font-mono shrink-0">
          {Math.abs(lat).toFixed(2)}°{lat >= 0 ? 'N' : 'S'}, {Math.abs(lon).toFixed(2)}°{lon >= 0 ? 'E' : 'W'}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        {onDetectLocation && (
          <button
            type="button"
            onClick={onDetectLocation}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-[#AFC4D8] hover:text-[var(--m-text-primary)] text-xs font-sans transition-colors cursor-pointer disabled:opacity-50"
            title="Detect GPS location"
          >
            <Navigation className={`w-3.5 h-3.5 text-[#29B6F6] ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Detect GPS</span>
          </button>
        )}

        {onOpenLocationCenter && (
          <button
            type="button"
            onClick={onOpenLocationCenter}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-[#AFC4D8] hover:text-[var(--m-text-primary)] text-xs font-sans transition-colors cursor-pointer"
            title="Change Location"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#29B6F6]" />
            <span>Change Location</span>
          </button>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1565C0] hover:bg-[#0B3D91] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            title="Refresh numerical weather forecast"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>
    </div>
  );
};
