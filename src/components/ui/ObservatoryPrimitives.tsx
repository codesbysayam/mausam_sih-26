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
  | 'REFERENCE';

const STATUS_META: Record<
  ProvenanceStatus,
  {
    label: string;
    containerClass: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  LIVE: {
    label: 'LIVE',
    containerClass: 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35',
    Icon: CheckCircle2,
  },
  RECENT: {
    label: 'RECENT',
    containerClass: 'bg-[#35C7E8]/12 text-[#7DD3FC] border-[#35C7E8]/35',
    Icon: Clock,
  },
  STALE: {
    label: 'CACHED / STALE',
    containerClass: 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35',
    Icon: Clock,
  },
  UNAVAILABLE: {
    label: 'UNAVAILABLE',
    containerClass: 'bg-[#EF4444]/12 text-[#FCA5A5] border-[#EF4444]/35',
    Icon: WifiOff,
  },
  LOADING: {
    label: 'SYNCING',
    containerClass: 'bg-[#35C7E8]/12 text-[#7DD3FC] border-[#35C7E8]/35',
    Icon: Loader2,
  },
  ALL_CLEAR: {
    label: 'ALL CLEAR',
    containerClass: 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35',
    Icon: CheckCircle2,
  },
  REFERENCE: {
    label: 'REFERENCE BASELINE',
    containerClass: 'bg-[#8295A8]/12 text-[#B5C3D1] border-[#38536A]',
    Icon: Info,
  },
};

interface SourceStatusProps {
  status: ProvenanceStatus;
  source?: string;
  updatedAt?: string | null;
  className?: string;
  labelOverride?: string;
}

export const SourceStatus: React.FC<SourceStatusProps> = ({
  status,
  source,
  updatedAt,
  className = '',
  labelOverride,
}) => {
  const meta = STATUS_META[status] || STATUS_META.UNAVAILABLE;
  const Icon = meta.Icon;

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 text-xs ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono text-[10px] font-semibold uppercase tracking-wider ${meta.containerClass}`}
      >
        <Icon className={`w-3 h-3 shrink-0 ${status === 'LOADING' ? 'animate-spin' : ''}`} />
        <span>{labelOverride || meta.label}</span>
      </span>
      {source && (
        <span className="text-[#B5C3D1] font-medium truncate max-w-[260px]" title={source}>
          {source}
        </span>
      )}
      {updatedAt && (
        <span className="text-[#8295A8] font-mono text-[11px] tabular-nums">
          · {updatedAt}
        </span>
      )}
    </div>
  );
};

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  status?: ProvenanceStatus;
  statusLabel?: string;
  source?: string;
  updatedAt?: string | null;
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
  coordinates,
  actions,
  children,
  id,
  className = '',
}) => {
  return (
    <section
      id={id}
      className={`m-panel px-4 py-4 sm:px-6 sm:py-5 flex flex-col gap-3 ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1">
          {eyebrow && (
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#35C7E8]">
              {eyebrow}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#F3F6FA] tracking-tight leading-snug">
              {title}
            </h1>
            {coordinates && (
              <span className="text-[11px] font-mono text-[#8295A8] tabular-nums px-2 py-0.5 rounded bg-[#08131F] border border-[#26394B]">
                {coordinates}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-[#B5C3D1] leading-relaxed max-w-3xl">
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
        <div className="pt-3 border-t border-[#26394B] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {status ? (
            <SourceStatus
              status={status}
              labelOverride={statusLabel}
              source={source}
              updatedAt={updatedAt}
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

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  title,
  subtitle,
  action,
  icon,
  badge,
  className = '',
}) => (
  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#26394B] ${className}`}>
    <div className="flex items-start sm:items-center gap-2.5 min-w-0">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-[#101F2E] border border-[#26394B] flex items-center justify-center text-[#35C7E8] shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm sm:text-base font-bold text-[#F3F6FA] tracking-tight">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-[#8295A8] mt-0.5 leading-snug">{subtitle}</p>
        )}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

interface MetricValueProps {
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
  unavailableLabel = 'Unavailable',
  valueClassName = 'text-xl sm:text-2xl font-bold text-[#F3F6FA]',
  className = '',
}) => {
  const isAvailable =
    value !== null &&
    value !== undefined &&
    (typeof value !== 'number' || !Number.isNaN(value));

  const formatted =
    typeof value === 'number' && !Number.isNaN(value)
      ? precision > 0
        ? value.toFixed(precision)
        : Math.round(value).toString()
      : isAvailable
      ? String(value)
      : '—';

  return (
    <div className={`flex flex-col gap-0.5 min-w-0 ${className}`}>
      <span className="text-[11px] font-medium text-[#8295A8] uppercase tracking-wider truncate">
        {label}
      </span>
      <div className="flex items-baseline gap-1 font-mono tabular-nums">
        <span className={isAvailable ? valueClassName : 'text-lg font-semibold text-[#8295A8]'}>
          {formatted}
        </span>
        {isAvailable && unit && (
          <span className="text-xs text-[#B5C3D1] font-sans">{unit}</span>
        )}
      </div>
      <span className="text-[11px] text-[#8295A8] truncate">
        {isAvailable ? hint || '\u00A0' : unavailableLabel}
      </span>
    </div>
  );
};

interface DataPanelProps {
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
    <div id={id} className={`${variantClass} p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
};

interface UnavailableStateProps {
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
      <div className="w-8 h-8 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#FCA5A5] shrink-0">
        <XCircle className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[#F3F6FA]">{title}</span>
          <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-[#EF4444]/12 text-[#FCA5A5] border border-[#EF4444]/30">
            Unavailable
          </span>
        </div>
        <p className="text-xs text-[#B5C3D1] mt-1 leading-relaxed">{reason}</p>
        {source && (
          <p className="text-[11px] font-mono text-[#8295A8] mt-1">Upstream: {source}</p>
        )}
      </div>
    </div>

    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="px-3 py-2 min-h-[40px] rounded-lg bg-[#101F2E] hover:bg-[#172A3B] border border-[#38536A] text-xs font-semibold text-[#F3F6FA] transition-colors shrink-0 cursor-pointer m-focus-ring"
      >
        {retryLabel}
      </button>
    )}
  </div>
);

interface SeverityBannerProps {
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
  const styles: Record<SeverityBannerProps['state'], { wrap: string; label: string; Icon: React.ComponentType<{ className?: string }> }> = {
    UNAVAILABLE: {
      wrap: 'bg-[#101F2E] border-[#F59E0B]/40 text-[#FCD34D]',
      label: 'FEED UNAVAILABLE',
      Icon: WifiOff,
    },
    ALL_CLEAR: {
      wrap: 'bg-[#0B1927] border-[#22C7A0]/35 text-[#6EE7B7]',
      label: 'ALL CLEAR',
      Icon: CheckCircle2,
    },
    WATCH: {
      wrap: 'bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#FCD34D]',
      label: 'YELLOW WATCH',
      Icon: AlertTriangle,
    },
    ALERT: {
      wrap: 'bg-[#F97316]/12 border-[#F97316]/45 text-[#FDBA74]',
      label: 'ORANGE ALERT',
      Icon: AlertTriangle,
    },
    SEVERE: {
      wrap: 'bg-[#EF4444]/12 border-[#EF4444]/50 text-[#FCA5A5]',
      label: 'RED WARNING',
      Icon: AlertTriangle,
    },
  };

  const current = styles[state];
  const Icon = current.Icon;

  return (
    <div
      className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${current.wrap} ${className}`}
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
            <span className="text-xs sm:text-sm font-semibold text-[#F3F6FA]">{title}</span>
          </div>
          <p className="text-xs text-[#B5C3D1] mt-1 leading-snug">{description}</p>
          {source && (
            <span className="text-[10px] font-mono text-[#8295A8] block mt-1">{source}</span>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
