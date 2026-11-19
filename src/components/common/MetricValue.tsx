import React from 'react';

export type MetricState =
  | 'loading'
  | 'available'
  | 'stale'
  | 'unavailable'
  | 'error'
  | 'not-applicable';

export interface MetricValueProps {
  value?: number | string | null;
  unit?: string;
  state: MetricState;
  label?: string;
  source?: string;
  observedAt?: string | null;
  unavailableReason?: string;
  errorReason?: string;
  notApplicableReason?: string;
  decimals?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showMeta?: boolean;
}

function formatNumericOrText(
  value: number | string,
  decimals?: number
): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    if (typeof decimals === 'number') {
      return value.toFixed(decimals);
    }
    return String(value);
  }
  return value;
}

export const MetricValue: React.FC<MetricValueProps> = ({
  value,
  unit,
  state,
  label,
  source,
  observedAt,
  unavailableReason = 'Not reported by source',
  errorReason = 'Unable to load reading',
  notApplicableReason = 'Not applicable',
  decimals,
  size = 'md',
  className = '',
  showMeta = true,
}) => {
  const sizeClass =
    size === 'lg'
      ? 'metric-value__reading--lg'
      : size === 'sm'
      ? 'metric-value__reading--sm'
      : 'metric-value__reading--md';

  if (state === 'loading') {
    return (
      <span
        className={`metric-value metric-value--loading ${className}`.trim()}
        aria-live="polite"
        aria-busy="true"
      >
        {label && <span className="mausam-eyebrow">{label}</span>}
        <span className="metric-value__skeleton" aria-hidden="true" />
        <span className="sr-only">Fetching latest observation…</span>
      </span>
    );
  }

  if (state === 'not-applicable') {
    return (
      <span className={`metric-value metric-value--na ${className}`.trim()}>
        {label && <span className="mausam-eyebrow">{label}</span>}
        <span className="metric-value__status">{notApplicableReason}</span>
      </span>
    );
  }

  if (state === 'error') {
    return (
      <span className={`metric-value metric-value--error ${className}`.trim()} role="status">
        {label && <span className="mausam-eyebrow">{label}</span>}
        <span className="metric-value__status">{errorReason}</span>
        {showMeta && source && (
          <span className="metric-value__meta">Source: {source}</span>
        )}
      </span>
    );
  }

  const hasValidValue =
    value !== null &&
    value !== undefined &&
    value !== '' &&
    (typeof value !== 'number' || Number.isFinite(value));

  if (state === 'unavailable' || !hasValidValue) {
    return (
      <span className={`metric-value metric-value--unavailable ${className}`.trim()}>
        {label && <span className="mausam-eyebrow">{label}</span>}
        <span className="metric-value__status">{unavailableReason}</span>
        {showMeta && source && (
          <span className="metric-value__meta">Source: {source}</span>
        )}
      </span>
    );
  }

  const formatted = formatNumericOrText(value, decimals);

  return (
    <span
      className={`metric-value ${state === 'stale' ? 'metric-value--stale' : ''} ${className}`.trim()}
    >
      {label && <span className="mausam-eyebrow">{label}</span>}
      <span className={`metric-value__reading ${sizeClass}`}>
        {formatted}
        {unit ? (
          <span className="ml-0.5 text-[0.72em] font-medium text-[var(--m-text-muted)]">
            {unit}
          </span>
        ) : null}
      </span>
      {showMeta && (state === 'stale' || source || observedAt) ? (
        <span className="metric-value__meta">
          {state === 'stale' ? 'Stale · ' : ''}
          {source ? source : ''}
          {source && observedAt ? ' · ' : ''}
          {observedAt ? observedAt : ''}
        </span>
      ) : null}
    </span>
  );
};

export default MetricValue;
