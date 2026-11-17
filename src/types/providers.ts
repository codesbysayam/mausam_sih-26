// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// Independent Provider State & Store Contracts
// Ensures strict failure isolation: one provider failing never affects another.
// ====================================================================

export type ProviderId = 'SACHET' | 'IMD' | 'RADAR' | 'AQI' | 'WEATHER' | 'NWP';

export type ProviderStatus =
  | 'LOADING'
  | 'LIVE'
  | 'RECENT'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'ERROR';

export interface ProviderState<T = unknown> {
  status: ProviderStatus;
  data: T | null;
  error: string | null;
  fetchedAt: string | null;
  latencyMs: number | null;
  source: string;
  lastSuccessfulFetch?: string | null;
  lastAttemptedFetch?: string | null;
  endpointType?: string;
  requestId?: string | null;
}

export interface ProviderStore {
  SACHET: ProviderState;
  IMD: ProviderState;
  RADAR: ProviderState;
  AQI: ProviderState;
  WEATHER: ProviderState;
  NWP: ProviderState;
}

export type SystemDataStatus = 'LIVE' | 'PARTIAL' | 'UNAVAILABLE';

export interface ProviderDescriptor {
  id: ProviderId;
  name: string;
  category: 'GOVERNMENT' | 'OPEN_DATA' | 'ENSEMBLE' | 'OBSERVATION';
  description: string;
  defaultSource: string;
  refreshIntervalMs: number;
  cacheKey: string;
}
