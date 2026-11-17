// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// Provider Status Normalization & Alert Availability Helpers
// Strictly distinguishes UNAVAILABLE official feeds from ALL CLEAR.
// ====================================================================

import {
  ProviderId,
  ProviderState,
  ProviderStatus,
  ProviderStore,
  SystemDataStatus,
} from '../../types/providers';
import { LocationWarningResult } from '../../types/warnings';

export type AlertFeedAvailability =
  | 'AVAILABLE_WITH_ALERTS'
  | 'AVAILABLE_ALL_CLEAR'
  | 'UNAVAILABLE'
  | 'LOADING';

export interface ProviderStatusVisual {
  label: string;
  tone: 'live' | 'recent' | 'stale' | 'unavailable' | 'error' | 'loading';
  description: string;
  dotClass: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
}

export function getProviderStatusVisual(status: ProviderStatus): ProviderStatusVisual {
  switch (status) {
    case 'LIVE':
      return {
        label: 'Live',
        tone: 'live',
        description: 'Fresh telemetry verified from upstream feed',
        dotClass: 'bg-emerald-400',
        textClass: 'text-emerald-300',
        bgClass: 'bg-emerald-500/12',
        borderClass: 'border-emerald-500/35',
      };
    case 'RECENT':
      return {
        label: 'Recent',
        tone: 'recent',
        description: 'Valid recent telemetry within operational window',
        dotClass: 'bg-[#38BDF8]',
        textClass: 'text-[#7DD3FC]',
        bgClass: 'bg-[#38BDF8]/12',
        borderClass: 'border-[#38BDF8]/35',
      };
    case 'STALE':
      return {
        label: 'Stale',
        tone: 'stale',
        description: 'Cached response retained; upstream refresh delayed',
        dotClass: 'bg-amber-400',
        textClass: 'text-amber-300',
        bgClass: 'bg-amber-500/12',
        borderClass: 'border-amber-500/35',
      };
    case 'LOADING':
      return {
        label: 'Syncing',
        tone: 'loading',
        description: 'Request in progress',
        dotClass: 'bg-sky-400',
        textClass: 'text-sky-300',
        bgClass: 'bg-sky-500/12',
        borderClass: 'border-sky-500/35',
      };
    case 'ERROR':
      return {
        label: 'Error',
        tone: 'error',
        description: 'Upstream request failed without fallback data',
        dotClass: 'bg-rose-400',
        textClass: 'text-rose-300',
        bgClass: 'bg-rose-500/12',
        borderClass: 'border-rose-500/35',
      };
    case 'UNAVAILABLE':
    default:
      return {
        label: 'Unavailable',
        tone: 'unavailable',
        description: 'Official feed unreachable or not configured in this environment',
        dotClass: 'bg-amber-500',
        textClass: 'text-amber-300',
        bgClass: 'bg-amber-500/10',
        borderClass: 'border-amber-500/30',
      };
  }
}

/**
 * Derives whole-system availability from independent provider states
 * without allowing a single failed provider to mask live providers.
 */
export function deriveSystemDataStatus(store: ProviderStore): SystemDataStatus {
  const ids: ProviderId[] = ['SACHET', 'IMD', 'RADAR', 'AQI', 'WEATHER', 'NWP'];
  let liveOrRecentCount = 0;
  let totalResolved = 0;

  for (const id of ids) {
    const state = store[id];
    if (state.status !== 'LOADING') {
      totalResolved++;
    }
    if (state.status === 'LIVE' || state.status === 'RECENT' || state.status === 'STALE') {
      liveOrRecentCount++;
    }
  }

  if (totalResolved === 0 || liveOrRecentCount === ids.length) {
    return liveOrRecentCount > 0 ? 'LIVE' : 'PARTIAL';
  }
  if (liveOrRecentCount > 0) {
    return 'PARTIAL';
  }
  return 'UNAVAILABLE';
}

/**
 * Strictly separates SACHET feed outage from genuine All Clear.
 * Never reports "All Clear" when SACHET state is UNAVAILABLE or ERROR.
 */
export function getAlertFeedAvailability(
  sachetState: ProviderState<LocationWarningResult | unknown>
): AlertFeedAvailability {
  if (sachetState.status === 'LOADING' && !sachetState.data) {
    return 'LOADING';
  }
  if (sachetState.status === 'UNAVAILABLE' || sachetState.status === 'ERROR' || !sachetState.data) {
    return 'UNAVAILABLE';
  }

  const warningData = sachetState.data as Partial<LocationWarningResult>;
  if (warningData.status === 'UNAVAILABLE') {
    return 'UNAVAILABLE';
  }
  if (Array.isArray(warningData.allLocationWarnings) && warningData.allLocationWarnings.length > 0) {
    return 'AVAILABLE_WITH_ALERTS';
  }
  if (warningData.primaryWarning) {
    return 'AVAILABLE_WITH_ALERTS';
  }
  return 'AVAILABLE_ALL_CLEAR';
}

export function formatRelativeAge(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return 'Not yet synced';
  const ts = new Date(isoTimestamp).getTime();
  if (Number.isNaN(ts)) return 'Unknown timestamp';
  const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ${diffMin % 60}m ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export function formatTimestampIST(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return 'Unavailable';
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return String(isoTimestamp);
  return (
    d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }) +
    ' IST, ' +
    d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    })
  );
}
