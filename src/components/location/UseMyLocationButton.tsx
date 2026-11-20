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

  let iconNode = <MapPin className="w-4 h-4 text-[var(--m-accent)]" />;
  let labelText = isCompact ? 'Locate Me' : 'Use My Current Location';

  if (isLocating || activePhase === 'locating') {
    iconNode = <Loader2 className="w-4 h-4 text-[var(--m-accent)] animate-spin" />;
    labelText = isCompact ? 'Locating…' : 'Locating you…';
  } else if (activePhase === 'geocoding') {
    iconNode = <Compass className="w-4 h-4 text-[var(--m-ok)] animate-spin" />;
    labelText = isCompact ? 'Resolving…' : 'Resolving station…';
  } else if (activePhase === 'success') {
    iconNode = <CheckCircle2 className="w-4 h-4 text-[var(--m-ok)]" />;
    labelText = isCompact ? 'Detected' : 'Location Detected';
  } else if (activePhase === 'error' || locateError) {
    iconNode = <AlertTriangle className="w-4 h-4 text-[var(--m-danger)]" />;
    labelText = isCompact ? 'Failed' : 'Location Unavailable';
  } else if (isGpsActive) {
    iconNode = <RefreshCw className="w-4 h-4 text-[var(--m-accent)]" />;
    labelText = isCompact ? 'Refresh GPS' : 'Refresh Current Location';
  }

  let baseStyle = '';
  if (effectiveVariant === 'primary') {
    baseStyle =
      'bg-[var(--m-accent)] hover:bg-[var(--m-accent-soft)] text-[var(--m-text-primary)] border border-[var(--m-accent)]/40 focus:ring-2 focus:ring-[var(--m-focus)]';
  } else if (effectiveVariant === 'secondary') {
    baseStyle =
      'bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-[var(--m-text-primary)] border border-[var(--m-accent)]/40 hover:border-[var(--m-accent)] focus:ring-2 focus:ring-[var(--m-focus)]';
  } else if (effectiveVariant === 'toolbar') {
    baseStyle =
      'bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] hover:border-[var(--m-accent)]/50 focus:ring-2 focus:ring-[var(--m-focus)]';
  } else if (effectiveVariant === 'dropdown') {
    baseStyle =
      'w-full bg-[var(--m-accent-soft)] hover:bg-[var(--m-accent-soft)] text-[var(--m-accent)] border border-[var(--m-accent)]/35 hover:border-[var(--m-accent)]/60 focus:ring-2 focus:ring-[var(--m-focus)] justify-center';
  } else {
    baseStyle =
      'bg-transparent hover:bg-[var(--m-accent-soft)] text-[var(--m-accent)] hover:text-[var(--m-text-primary)] border border-transparent hover:border-[var(--m-accent)]/35';
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
        <div className="absolute top-full mt-2 left-0 right-0 z-50 min-w-[280px] p-3 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-danger)]/40 text-xs shadow-2xl space-y-2 animate-fadeIn">
          <div className="flex items-start gap-2 text-[var(--m-danger)]">
            <AlertTriangle className="w-4 h-4 text-[var(--m-danger)] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[var(--m-text-primary)]">{locateError.message}</div>
              {locateError.instruction && (
                <div className="text-[11px] text-[var(--m-text-secondary)] mt-0.5 leading-snug">
                  {locateError.instruction}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--m-border)]">
            <button
              type="button"
              onClick={handleClick}
              className="px-2.5 min-h-[36px] rounded-lg bg-[var(--m-danger-soft)] hover:bg-[#EF4444]/30 text-[var(--m-danger)] font-bold text-[11px] transition-colors cursor-pointer"
            >
              Try Again
            </button>
            {onOpenManualSearch && (
              <button
                type="button"
                onClick={onOpenManualSearch}
                className="px-2.5 min-h-[36px] rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[var(--m-text-primary)] text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Search className="w-3 h-3 text-[var(--m-accent)]" />
                <span>Search Manually</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
