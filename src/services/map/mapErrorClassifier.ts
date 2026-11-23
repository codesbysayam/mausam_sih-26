// ====================================================================
// MAUSAM - Map & Weather Provider Error Classifier
// Classifies HTTP/network/provider failures accurately so 404 glyph/tile
// misses or transient network blips are NEVER misdiagnosed as missing
// API keys and NEVER break or reload the underlying global basemap.
// ====================================================================

export type MapErrorCategory =
  | 'network'
  | 'authentication'
  | 'forbidden'
  | 'missing-resource'
  | 'rate-limit'
  | 'provider'
  | 'unknown';

export function classifyMapError(
  status?: number,
  message = ''
): MapErrorCategory {
  const normalized = message.toLowerCase();

  if (
    status === 401 ||
    normalized.includes('unauthorized') ||
    normalized.includes('invalid token') ||
    normalized.includes('invalid api key')
  ) {
    return 'authentication';
  }

  if (status === 403 || normalized.includes('forbidden')) {
    return 'forbidden';
  }

  if (
    status === 404 ||
    normalized.includes('not found') ||
    normalized.includes('(404)')
  ) {
    return 'missing-resource';
  }

  if (
    status === 429 ||
    normalized.includes('rate limit') ||
    normalized.includes('too many requests')
  ) {
    return 'rate-limit';
  }

  if (
    normalized.includes('network') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('cors') ||
    normalized.includes('load failed') ||
    normalized.includes('timeout')
  ) {
    return 'network';
  }

  if (typeof status === 'number' && status >= 500) {
    return 'provider';
  }

  return 'unknown';
}

/**
 * Only transient network, rate-limit, and 5xx server errors should be retried.
 * Never retry 401, 403, or 404 missing resources indefinitely.
 */
export function isRetryableMapError(category: MapErrorCategory): boolean {
  return (
    category === 'network' ||
    category === 'rate-limit' ||
    category === 'provider'
  );
}

/**
 * Produces an honest, non-alarmist status message for a classified error.
 * Never claims an API key is missing unless status is genuinely 401.
 */
export function formatMapErrorMessage(
  category: MapErrorCategory,
  providerLabel = 'Weather overlay'
): string {
  switch (category) {
    case 'network':
      return `${providerLabel} temporarily unreachable. Base map remains active.`;
    case 'authentication':
      return `${providerLabel} requires server-side credentials. Base map remains active.`;
    case 'forbidden':
      return `${providerLabel} access is restricted by upstream policy.`;
    case 'missing-resource':
      return `${providerLabel} resource unavailable for this sector.`;
    case 'rate-limit':
      return `${providerLabel} rate-limited temporarily. Holding cached view.`;
    case 'provider':
      return `${providerLabel} upstream service temporarily unavailable.`;
    default:
      return `${providerLabel} temporarily unavailable.`;
  }
}
