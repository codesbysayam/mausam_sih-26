export type DataStatus =
  | 'loading'
  | 'live'
  | 'recent'
  | 'stale'
  | 'unavailable'
  | 'error'
  | 'not-applicable';

export interface DataProvenance {
  provider: string;
  product?: string;
  isModelData: boolean;
  isStationObservation: boolean;
  observedAt: string | null;
  validAt?: string | null;
  fetchedAt: string | null;
  status: DataStatus;
  errorMessage?: string | null;
}

export interface NullableMetric<T = number> {
  value: T | null;
  unit?: string;
  status: DataStatus;
  source?: string;
  observedAt?: string | null;
  unavailableReason?: string;
}

export interface FeedStatus {
  id: string;
  label: string;
  provider: string;
  status: DataStatus;
  observedAt: string | null;
  fetchedAt: string | null;
  note?: string;
}

export function getMetricStatus(
  value: number | string | null | undefined,
  options?: {
    isLoading?: boolean;
    hasError?: boolean;
    isStale?: boolean;
    notApplicable?: boolean;
  }
): 'loading' | 'available' | 'stale' | 'unavailable' | 'error' | 'not-applicable' {
  if (options?.notApplicable) return 'not-applicable';
  if (options?.isLoading) return 'loading';
  if (options?.hasError) return 'error';
  if (value === null || value === undefined || value === '') return 'unavailable';
  if (typeof value === 'number' && !Number.isFinite(value)) return 'unavailable';
  if (options?.isStale) return 'stale';
  return 'available';
}
