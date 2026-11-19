import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  WifiOff,
  XCircle,
} from 'lucide-react';

export type ProvenanceStatus =
  | 'LIVE'
  | 'RECENT'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'LOADING'
  | 'ALL_CLEAR'
  | 'REFERENCE'
  | 'OBSERVED'
  | 'FORECAST'
  | 'MODEL_DERIVED'
  | 'ESTIMATED'
  | 'DERIVED';

const STATUS_META: Record<
  ProvenanceStatus,
  {
    label: string;
    containerClass: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  LIVE: {
    label: 'LIVE FEED',
    containerClass: 'bg-[#2E7D5B]/15 text-[#75D4A6] border-[#2E7D5B]/45',
    Icon: CheckCircle2,
  },
  OBSERVED: {
    label: 'OBSERVED',
    containerClass: 'bg-[#2E7D5B]/15 text-[#75D4A6] border-[#2E7D5B]/45',
    Icon: CheckCircle2,
  },
  RECENT: {
    label: 'RECENT',
    containerClass: 'bg-[#2C7BE5]/15 text-[#8AB8F7] border-[#2C7BE5]/40',
    Icon: Clock,
  },
  FORECAST: {
    label: 'FORECAST',
    containerClass: 'bg-[#2C7BE5]/15 text-[#8AB8F7] border-[#2C7BE5]/40',
    Icon: Clock,
  },
  MODEL_DERIVED: {
    label: 'MODEL-DERIVED',
    containerClass: 'bg-[#1E90B8]/15 text-[#7CD4F0] border-[#1E90B8]/40',
    Icon: Info,
  },
  ESTIMATED: {
    label: 'ESTIMATED',
    containerClass: 'bg-[#D98A2B]/15 text-[#F4B96B] border-[#D98A2B]/40',
    Icon: Info,
  },
  DERIVED: {
    label: 'DERIVED',
    containerClass: 'bg-[#D98A2B]/15 text-[#F4B96B] border-[#D98A2B]/40',
    Icon: Info,
  },
  STALE: {
    label: 'CACHED / STALE',
    containerClass: 'bg-[#D98A2B]/15 text-[#F4B96B] border-[#D98A2B]/40',
    Icon: Clock,
  },
  UNAVAILABLE: {
    label: 'NOT AVAILABLE',
    containerClass: 'bg-[#B83227]/15 text-[#F59B93] border-[#B83227]/40',
    Icon: WifiOff,
  },
  LOADING: {
    label: 'SYNCING',
    containerClass: 'bg-[#2C7BE5]/15 text-[#8AB8F7] border-[#2C7BE5]/40',
    Icon: Loader2,
  },
  ALL_CLEAR: {
    label: 'ALL CLEAR',
    containerClass: 'bg-[#2E7D5B]/15 text-[#75D4A6] border-[#2E7D5B]/45',
    Icon: CheckCircle2,
  },
  REFERENCE: {
    label: 'REFERENCE BASELINE',
    containerClass: 'bg-[var(--m-surface-2)] text-[var(--m-text-secondary)] border-[var(--m-border-strong)]',
    Icon: Info,
  },
};

export interface SourceStatusProps {
  status: ProvenanceStatus;
  source?: string;
  updatedAt?: string | null;
  retrievedAt?: string | null;
  className?: string;
  labelOverride?: string;
}

export const SourceStatus: React.FC<SourceStatusProps> = ({
  status,
  source,
  updatedAt,
  retrievedAt,
  className = '',
  labelOverride,
}) => {
  const meta = STATUS_META[status] || STATUS_META.UNAVAILABLE;
  const Icon = meta.Icon;

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 text-xs ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-mono text-[10px] font-semibold uppercase tracking-wider ${meta.containerClass}`}
      >
        <Icon className={`w-3 h-3 shrink-0 ${status === 'LOADING' ? 'animate-spin' : ''}`} />
        <span>{labelOverride || meta.label}</span>
      </span>
      {source && (
        <span
          className="text-[var(--m-text-secondary)] font-medium truncate max-w-[280px]"
          title={source}
        >
          {source}
        </span>
      )}
      {updatedAt && (
        <span className="text-[var(--m-text-muted)] font-mono text-[11px] tabular-nums">
          · Valid {updatedAt}
        </span>
      )}
      {retrievedAt && (
        <span className="text-[var(--m-text-muted)] font-mono text-[11px] tabular-nums">
          · Retrieved {retrievedAt}
        </span>
      )}
    </div>
  );
};

export interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  status?: ProvenanceStatus;
  statusLabel?: string;
  source?: string;
  updatedAt?: string | null;
  retrievedAt?: string | null;
  coordinates?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  id?: string;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  eyebrow,
  status,
  statusLabel,
  source,
  updatedAt,
  retrievedAt,
  coordinates,
  actions,
  children,
  id,
  className = '',
}) => {
  return (
    <section
      id={id}
      className={`m-panel px-5 py-5 sm:px-7 sm:py-6 flex flex-col gap-3.5 ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="min-w-0 flex flex-col gap-1.5">
          {eyebrow && (
            <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.08em] text-[#2C7BE5]">
              {eyebrow}
            </span>
          )}
          <div className="flex flex-wrap items-baseline gap-3">
            <h1
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--m-text-primary)] tracking-[-0.03em] leading-[1.05]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {title}
            </h1>
            {coordinates && (
              <span className="text-xs font-mono text-[var(--m-text-muted)] tabular-nums">
                · {coordinates}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-[var(--m-text-secondary)] leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {(status || source || updatedAt || children) && (
        <div className="pt-3 border-t border-[var(--m-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {status ? (
            <SourceStatus
              status={status}
              labelOverride={statusLabel}
              source={source}
              updatedAt={updatedAt}
              retrievedAt={retrievedAt}
            />
          ) : (
            <div />
          )}
          {children}
        </div>
      )}
    </section>
  );
};

export interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  title,
  subtitle,
  eyebrow,
  action,
  icon,
  badge,
  className = '',
}) => (
  <div
    className={`flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 pb-3.5 border-b border-[var(--m-border)] ${className}`}
  >
    <div className="flex items-start sm:items-center gap-3 min-w-0">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-center justify-center text-[#2C7BE5] shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        {eyebrow && (
          <span className="block text-[10px] font-mono font-semibold uppercase tracking-[0.08em] text-[var(--m-text-muted)] mb-0.5">
            {eyebrow}
          </span>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h2
            className="text-base sm:text-lg font-bold text-[var(--m-text-primary)] tracking-[-0.02em]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-[var(--m-text-muted)] mt-0.5 leading-snug">
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export interface MetricValueProps {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
  precision?: number;
  hint?: string;
  unavailableLabel?: string;
  valueClassName?: string;
  className?: string;
}

export const MetricValue: React.FC<MetricValueProps> = ({
  label,
  value,
  unit,
  precision = 0,
  hint,
  unavailableLabel = 'Not available',
  valueClassName = 'text-xl sm:text-2xl font-bold text-[var(--m-text-primary)]',
  className = '',
}) => {
  const isAvailable =
    value !== null &&
    value !== undefined &&
    value !== '' &&
    value !== '—' &&
    value !== '_____' &&
    (typeof value !== 'number' || !Number.isNaN(value));

  const formatted =
    typeof value === 'number' && !Number.isNaN(value)
      ? precision > 0
        ? value.toFixed(precision)
        : Math.round(value).toString()
      : isAvailable
      ? String(value)
      : unavailableLabel;

  return (
    <div className={`flex flex-col gap-0.5 min-w-0 ${className}`}>
      <span className="text-[11px] font-mono font-medium text-[var(--m-text-muted)] uppercase tracking-[0.06em] truncate">
        {label}
      </span>
      <div className="flex items-baseline gap-1 font-mono tabular-nums">
        <span
          className={
            isAvailable
              ? valueClassName
              : 'text-sm font-mono font-medium text-[var(--m-text-muted)]'
          }
        >
          {formatted}
        </span>
        {isAvailable && unit && (
          <span className="text-xs text-[var(--m-text-secondary)] font-sans">{unit}</span>
        )}
      </div>
      <span className="text-[11px] text-[var(--m-text-muted)] truncate">
        {isAvailable ? hint || '\u00A0' : 'Feed value unavailable'}
      </span>
    </div>
  );
};

export interface DataPanelProps {
  children: React.ReactNode;
  variant?: 'surface-1' | 'surface-2' | 'inset';
  className?: string;
  id?: string;
}

export const DataPanel: React.FC<DataPanelProps> = ({
  children,
  variant = 'surface-1',
  className = '',
  id,
}) => {
  const variantClass =
    variant === 'surface-2'
      ? 'm-panel-elevated'
      : variant === 'inset'
      ? 'm-panel-inset'
      : 'm-panel';

  return (
    <div id={id} className={`${variantClass} p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
};

export interface UnavailableStateProps {
  title: string;
  reason?: string;
  source?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const UnavailableState: React.FC<UnavailableStateProps> = ({
  title,
  reason = 'Live station or upstream model data is currently unavailable.',
  source,
  onRetry,
  retryLabel = 'Retry Sync',
  className = '',
}) => (
  <div
    className={`m-panel-inset p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
    role="status"
  >
    <div className="flex items-start gap-3 min-w-0">
      <div className="w-8 h-8 rounded-lg bg-[#B83227]/12 border border-[#B83227]/35 flex items-center justify-center text-[#F59B93] shrink-0">
        <XCircle className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[var(--m-text-primary)]">{title}</span>
          <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-[#B83227]/15 text-[#F59B93] border border-[#B83227]/35">
            Not available
          </span>
        </div>
        <p className="text-xs text-[var(--m-text-secondary)] mt-1 leading-relaxed">{reason}</p>
        {source && (
          <p className="text-[11px] font-mono text-[var(--m-text-muted)] mt-1">
            Upstream: {source}
          </p>
        )}
      </div>
    </div>

    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="px-3.5 py-2 min-h-[40px] rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border-strong)] text-xs font-semibold text-[var(--m-text-primary)] transition-colors shrink-0 cursor-pointer m-focus-ring"
      >
        {retryLabel}
      </button>
    )}
  </div>
);

export interface SeverityBannerProps {
  state: 'UNAVAILABLE' | 'ALL_CLEAR' | 'WATCH' | 'ALERT' | 'SEVERE';
  title: string;
  description: string;
  source?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SeverityBanner: React.FC<SeverityBannerProps> = ({
  state,
  title,
  description,
  source,
  action,
  className = '',
}) => {
  const styles: Record<
    SeverityBannerProps['state'],
    { wrap: string; label: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    UNAVAILABLE: {
      wrap: 'bg-[var(--m-surface-2)] border-[#D98A2B]/45 text-[#F4B96B]',
      label: 'FEED UNAVAILABLE',
      Icon: WifiOff,
    },
    ALL_CLEAR: {
      wrap: 'bg-[var(--m-surface-1)] border-[#2E7D5B]/45 text-[#75D4A6]',
      label: 'ALL CLEAR',
      Icon: CheckCircle2,
    },
    WATCH: {
      wrap: 'bg-[#D98A2B]/12 border-[#D98A2B]/45 text-[#F4B96B]',
      label: 'YELLOW WATCH',
      Icon: AlertTriangle,
    },
    ALERT: {
      wrap: 'bg-[#C65D21]/15 border-[#C65D21]/50 text-[#F7B28B]',
      label: 'ORANGE ALERT',
      Icon: AlertTriangle,
    },
    SEVERE: {
      wrap: 'bg-[#B83227]/15 border-[#B83227]/55 text-[#F59B93]',
      label: 'RED WARNING',
      Icon: AlertTriangle,
    },
  };

  const current = styles[state];
  const Icon = current.Icon;

  return (
    <div
      className={`rounded-xl border px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${current.wrap} ${className}`}
      role="region"
      aria-label={title}
    >
      <div className="flex items-start gap-3 min-w-0">
        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-current/30 bg-black/20">
              {current.label}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-[var(--m-text-primary)]">
              {title}
            </span>
          </div>
          <p className="text-xs text-[var(--m-text-secondary)] mt-1 leading-snug">{description}</p>
          {source && (
            <span className="text-[10px] font-mono text-[var(--m-text-muted)] block mt-1">
              {source}
            </span>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
