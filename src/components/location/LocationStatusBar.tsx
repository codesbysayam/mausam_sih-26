import React from 'react';
import { MapPin, RefreshCw, Search, Loader2 } from 'lucide-react';
import { LocationRecord } from '../../types';
import { NearestStationResult } from '../../services/geolocationService';
import { useLocationSafe, GpsStatus, formatNearestObservation } from '../../context/LocationContext';
import { formatCoordinatePair } from '../../../shared/weatherContract';

export interface LocationStatusBarProps {
  location?: LocationRecord;
  source?: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  locationSource?: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  isLocating?: boolean;
  nearestStationInfo?: NearestStationResult | null;
  accuracyMeters?: number | null;
  onRefreshLocation?: () => void;
  onDetectLocation?: () => void;
  onOpenLocationCenter?: () => void;
  onChangeLocationClick?: () => void;
  onOpenPrivacyModal?: () => void;
  className?: string;
  id?: string;
}

function getBadgeConfig(status: GpsStatus) {
  switch (status) {
    case 'GPS ACTIVE':
      return {
        badgeBg: 'bg-[#064E3B]/80 text-[var(--m-ok)] border-[#059669]/50',
        dotBg: 'bg-[#10B981]',
        animateDot: true,
      };
    case 'REQUESTING LOCATION':
      return {
        badgeBg: 'bg-[#451A03]/80 text-[var(--m-alert)] border-[#D97706]/50',
        dotBg: 'bg-[#F59E0B]',
        animateDot: true,
      };
    case 'LOCATION PERMISSION DENIED':
      return {
        badgeBg: 'bg-[#4C0519]/80 text-[#FDA4AF] border-[#E11D48]/50',
        dotBg: 'bg-[#F43F5E]',
        animateDot: false,
      };
    case 'LOCATION UNAVAILABLE':
      return {
        badgeBg: 'bg-[var(--m-surface-2)] text-[var(--m-text-muted)] border-[#475569]/50',
        dotBg: 'bg-[#64748B]',
        animateDot: false,
      };
    case 'LOCATION DETECTED':
    default:
      return {
        badgeBg: 'bg-[#0C2D48]/80 text-[var(--m-accent)] border-[#0284C7]/50',
        dotBg: 'bg-[#38BDF8]',
        animateDot: false,
      };
  }
}

function formatCoords(lat?: number, lng?: number): string {
  return formatCoordinatePair(lat, lng, 2);
}

export const LocationStatusBar: React.FC<LocationStatusBarProps> = ({
  location: propLocation,
  source: propSource,
  locationSource: propLocationSource,
  isLocating: propIsLocating,
  nearestStationInfo: propNearestStation,
  accuracyMeters: propAccuracyMeters,
  onRefreshLocation,
  onDetectLocation,
  onOpenLocationCenter,
  onChangeLocationClick,
  onOpenPrivacyModal,
  className = '',
  id = 'location-status-bar',
}) => {
  const context = useLocationSafe();

  // Resolve values prioritizing context as single source of truth, falling back to props
  const activeLocation = propLocation || context?.location;
  const activeSource = propSource || propLocationSource || context?.locationSource || 'MANUAL_SEARCH';
  const locating = propIsLocating !== undefined ? propIsLocating : context?.isLocating || false;
  const nearestStation = propNearestStation !== undefined ? propNearestStation : context?.nearestStationInfo;

  // Determine current GPS status
  let currentGpsStatus: GpsStatus = context?.gpsStatus || 'LOCATION DETECTED';
  if (locating) {
    currentGpsStatus = 'REQUESTING LOCATION';
  } else if (!context) {
    // If not in context, determine from props
    currentGpsStatus = activeSource === 'DEVICE_GPS' ? 'GPS ACTIVE' : 'LOCATION DETECTED';
  }

  // Action handlers
  const handleRefresh = () => {
    if (onRefreshLocation) {
      onRefreshLocation();
    } else if (onDetectLocation) {
      onDetectLocation();
    } else if (context) {
      context.refreshLocation();
    }
  };

  const handleChangeLocation = () => {
    if (onOpenLocationCenter) {
      onOpenLocationCenter();
    } else if (onChangeLocationClick) {
      onChangeLocationClick();
    } else if (context) {
      context.openLocationModal();
    }
  };

  if (!activeLocation) return null;

  const placeName = activeLocation.city || activeLocation.district || activeLocation.name || 'Chandaka';
  const state = activeLocation.state || 'Odisha';
  const nearestObservation =
    context?.nearestObservationStation || formatNearestObservation(activeLocation, nearestStation);
  const coordsFormatted = formatCoords(activeLocation.lat, activeLocation.lng);

  const badgeConfig = getBadgeConfig(currentGpsStatus);

  return (
    <div
      id={id}
      className={`w-full rounded-xl border border-[var(--m-border-strong)] bg-[var(--m-surface-2)] px-3.5 py-2.5 sm:px-4 sm:py-2.5 lg:px-5 shadow-xs transition-colors overflow-hidden ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 min-w-0">
        {/* Left Section: Icon + Structured Information */}
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          {/* Location Pin Icon Container */}
          <div className="w-8 h-8 rounded-lg bg-[#0B3D91]/25 border border-[#1565C0]/40 text-[var(--m-accent)] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <MapPin className="w-4 h-4" />
          </div>

          {/* Text Information Hierarchy */}
          <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-3 gap-y-1 min-w-0 flex-1">
            {/* Top row / Leading: GPS status + Primary Location Name */}
            <div className="flex items-center gap-2 min-w-0">
              {/* GPS Status Badge */}
              <span
                id="location-status-badge"
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${badgeConfig.badgeBg}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${badgeConfig.dotBg} ${
                    badgeConfig.animateDot ? 'animate-pulse' : ''
                  }`}
                />
                {currentGpsStatus}
              </span>

              {/* Primary Location Name */}
              <span
                id="location-primary-name"
                className="font-bold text-sm sm:text-[15px] text-[var(--m-text-primary)] tracking-tight truncate max-w-[200px] sm:max-w-xs"
              >
                {placeName}, {state}
              </span>
            </div>

            {/* Separator on desktop/tablet */}
            <span className="hidden sm:inline text-[#2A435E] select-none">•</span>

            {/* Secondary: Nearest Observation Station */}
            <span className="text-xs text-[var(--m-text-muted)] truncate max-w-[220px] sm:max-w-xs lg:max-w-sm xl:max-w-none">
              Nearest Observation:{' '}
              <strong className="text-[var(--m-text-secondary)] font-semibold">{nearestObservation}</strong>
            </span>

            {/* Separator on large desktop */}
            <span className="hidden xl:inline text-[#2A435E] select-none">•</span>

            {/* Small metadata: Coordinates */}
            <span className="hidden xl:inline font-mono text-[11px] text-[var(--m-text-muted)] shrink-0">
              {coordsFormatted}
            </span>
          </div>
        </div>

        {/* Right Section: Compact Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto ml-auto">
          {/* Refresh Button */}
          <button
            type="button"
            id="btn-location-refresh"
            onClick={handleRefresh}
            disabled={locating}
            title="Refresh current location and weather telemetry"
            className="h-8 px-3 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-[var(--m-accent)] border border-[var(--m-border-strong)] hover:border-[var(--m-accent)]/40 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {locating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--m-accent)]" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-[var(--m-accent)]" />
            )}
            <span>Refresh</span>
          </button>

          {/* Change Location Button */}
          <button
            type="button"
            id="btn-location-change"
            onClick={handleChangeLocation}
            className="h-8 px-3 rounded-lg bg-[#0B3D91] hover:bg-[#1565C0] text-white border border-[#1565C0] hover:border-[var(--m-accent)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            title="Search or select a different observation location"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Change Location</span>
          </button>
        </div>
      </div>
    </div>
  );
};
