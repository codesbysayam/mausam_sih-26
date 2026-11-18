import React from 'react';
import {
  MapPin,
  Compass,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Search,
} from 'lucide-react';
import { LocatingPhase } from '../../hooks/useUserLocation';
import { GeolocationServiceError } from '../../services/geolocationService';

interface UseMyLocationButtonProps {
  onDetectLocation?: (forceRefresh?: boolean) => Promise<any>;
  onDetect?: (forceRefresh?: boolean) => Promise<any>;
  isLocating?: boolean;
  locatePhase?: LocatingPhase;
  phase?: LocatingPhase;
  locateError?: GeolocationServiceError | null;
  locationSource?: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  compact?: boolean;
  variant?: 'primary' | 'secondary' | 'toolbar' | 'ghost' | 'dropdown' | 'compact';
  className?: string;
  onOpenManualSearch?: () => void;
  onOpenPrivacyModal?: () => void;
}

export const UseMyLocationButton: React.FC<UseMyLocationButtonProps> = ({
  onDetectLocation,
  onDetect,
  isLocating = false,
  locatePhase = 'idle',
  phase,
  locateError = null,
  locationSource = 'MANUAL_SEARCH',
  compact = false,
  variant = 'primary',
  className = '',
  onOpenManualSearch,
}) => {
  const activeDetect = onDetectLocation || onDetect || (() => Promise.resolve(null));
  const activePhase = phase || locatePhase;
  const isCompact = compact || variant === 'compact';
  const effectiveVariant = variant === 'compact' ? 'dropdown' : variant;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const isAlreadyGps = locationSource === 'DEVICE_GPS';
    try {
      await activeDetect(isAlreadyGps);
    } catch (err) {
      console.debug('[UseMyLocationButton] Location detection handled error:', err);
    }
  };

  const isGpsActive = locationSource === 'DEVICE_GPS';

  let iconNode = <MapPin className="w-4 h-4 text-[#35C7E8]" />;
  let labelText = isCompact ? 'Locate Me' : 'Use My Current Location';

  if (isLocating || activePhase === 'locating') {
    iconNode = <Loader2 className="w-4 h-4 text-[#35C7E8] animate-spin" />;
    labelText = isCompact ? 'Locating…' : 'Locating you…';
  } else if (activePhase === 'geocoding') {
    iconNode = <Compass className="w-4 h-4 text-[#22C7A0] animate-spin" />;
    labelText = isCompact ? 'Resolving…' : 'Resolving station…';
  } else if (activePhase === 'success') {
    iconNode = <CheckCircle2 className="w-4 h-4 text-[#22C7A0]" />;
    labelText = isCompact ? 'Detected' : 'Location Detected';
  } else if (activePhase === 'error' || locateError) {
    iconNode = <AlertTriangle className="w-4 h-4 text-[#EF4444]" />;
    labelText = isCompact ? 'Failed' : 'Location Unavailable';
  } else if (isGpsActive) {
    iconNode = <RefreshCw className="w-4 h-4 text-[#35C7E8]" />;
    labelText = isCompact ? 'Refresh GPS' : 'Refresh Current Location';
  }

  let baseStyle = '';
  if (effectiveVariant === 'primary') {
    baseStyle =
      'bg-[#0B72B9] hover:bg-[#0B72B9]/85 text-[#F3F6FA] border border-[#35C7E8]/40 focus:ring-2 focus:ring-[#35C7E8]';
  } else if (effectiveVariant === 'secondary') {
    baseStyle =
      'bg-[#101F2E] hover:bg-[#172A3D] text-[#F3F6FA] border border-[#35C7E8]/40 hover:border-[#35C7E8] focus:ring-2 focus:ring-[#35C7E8]';
  } else if (effectiveVariant === 'toolbar') {
    baseStyle =
      'bg-[#08131F] hover:bg-[#101F2E] text-[#B5C3D1] hover:text-[#F3F6FA] border border-[#26394B] hover:border-[#35C7E8]/50 focus:ring-2 focus:ring-[#35C7E8]';
  } else if (effectiveVariant === 'dropdown') {
    baseStyle =
      'w-full bg-[#35C7E8]/12 hover:bg-[#35C7E8]/20 text-[#35C7E8] border border-[#35C7E8]/35 hover:border-[#35C7E8]/60 focus:ring-2 focus:ring-[#35C7E8] justify-center';
  } else {
    baseStyle =
      'bg-transparent hover:bg-[#35C7E8]/15 text-[#35C7E8] hover:text-[#F3F6FA] border border-transparent hover:border-[#35C7E8]/35';
  }

  return (
    <div className="relative inline-flex flex-col">
      <button
        type="button"
        id="btn-use-my-location"
        onClick={handleClick}
        disabled={isLocating}
        aria-label={labelText}
        aria-busy={isLocating}
        title={
          isGpsActive
            ? 'Click to refresh your current GPS weather observation'
            : 'Detect your current location using browser GPS'
        }
        className={`inline-flex items-center gap-2 px-3.5 min-h-[44px] sm:min-h-[38px] rounded-xl text-xs font-semibold tracking-tight transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed select-none ${baseStyle} ${className}`}
      >
        {iconNode}
        <span className="truncate">{labelText}</span>
        {isGpsActive && locatePhase === 'idle' && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C7A0] ml-0.5 shrink-0" />
        )}
      </button>

      {locateError && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 min-w-[280px] p-3 rounded-xl bg-[#101F2E] border border-[#EF4444]/40 text-xs shadow-2xl space-y-2 animate-fadeIn">
          <div className="flex items-start gap-2 text-[#FCA5A5]">
            <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#F3F6FA]">{locateError.message}</div>
              {locateError.instruction && (
                <div className="text-[11px] text-[#B5C3D1] mt-0.5 leading-snug">
                  {locateError.instruction}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#26394B]">
            <button
              type="button"
              onClick={handleClick}
              className="px-2.5 min-h-[36px] rounded-lg bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#FCA5A5] font-bold text-[11px] transition-colors cursor-pointer"
            >
              Try Again
            </button>
            {onOpenManualSearch && (
              <button
                type="button"
                onClick={onOpenManualSearch}
                className="px-2.5 min-h-[36px] rounded-lg bg-[#08131F] hover:bg-[#0B1927] border border-[#26394B] text-[#F3F6FA] text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Search className="w-3 h-3 text-[#35C7E8]" />
                <span>Search Manually</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
