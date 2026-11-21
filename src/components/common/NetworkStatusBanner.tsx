import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, X, CheckCircle2, Database } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface NetworkStatusBannerProps {
  isOnline: boolean;
  isApiReachable: boolean;
  lastSyncedAt?: string | Date | null;
  onRetry?: () => Promise<any> | void;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({
  isOnline,
  isApiReachable,
  lastSyncedAt,
  onRetry,
}) => {
  const { t } = useLanguage();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const [prevOffline, setPrevOffline] = useState(false);

  const isOfflineMode = !isOnline || !isApiReachable;

  useEffect(() => {
    if (isOfflineMode) {
      setIsDismissed(false);
      setPrevOffline(true);
    } else if (prevOffline) {
      setShowRestoredNotice(true);
      const timer = setTimeout(() => {
        setShowRestoredNotice(false);
        setPrevOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOfflineMode, prevOffline]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      }
    } finally {
      setTimeout(() => setIsRetrying(false), 800);
    }
  };

  const formattedLastSync = React.useMemo(() => {
    if (!lastSyncedAt) return null;
    const date = typeof lastSyncedAt === 'string' ? new Date(lastSyncedAt) : lastSyncedAt;
    if (isNaN(date.getTime())) return null;
    return (
      new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(date) + ' IST'
    );
  }, [lastSyncedAt]);

  if (showRestoredNotice && !isOfflineMode) {
    return (
      <aside
        id="network-restored-banner"
        aria-label="Network connection status"
        className="w-full bg-[var(--m-surface-inset)] border-b border-[var(--m-ok)]/40 text-[var(--m-ok)] px-3 sm:px-4 py-2 text-xs select-none z-30"
      >
        <div className="max-w-[1560px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--m-ok)]" />
            <span className="font-semibold text-[var(--m-text-primary)]">
              {t('networkRestored', 'Live meteorological telemetry connection restored.')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowRestoredNotice(false)}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#22C7A0]/80 hover:text-[var(--m-text-primary)] rounded-lg hover:bg-[var(--m-surface-2)] transition-colors cursor-pointer"
            aria-label="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  if (!isOfflineMode || isDismissed) {
    return null;
  }

  return (
    <aside
      id="network-offline-banner"
      role="status"
      aria-live="polite"
      aria-label="Network offline banner"
      className="w-full bg-[var(--m-surface-2)] border-b border-[var(--m-watch)]/40 text-[#FDE68A] px-3 sm:px-4 py-2.5 text-xs select-none z-30"
    >
      <div className="max-w-[1560px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[var(--m-watch-soft)] border border-[var(--m-watch)]/40 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 text-[var(--m-watch)]">
            <WifiOff className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className="font-bold text-[var(--m-text-primary)] tracking-wide">
              {t('offlineTelemetryActive', 'Read-Only Offline Mode')}
            </span>
            <span className="text-[var(--m-text-secondary)] text-[11px] flex items-center gap-1">
              <Database className="w-3 h-3 text-[var(--m-watch)]" />
              {t('servingCachedBundle', 'Serving cached meteorological data from local service worker storage')}
              {formattedLastSync && (
                <span className="font-mono text-[var(--m-watch)] font-medium tabular-nums">
                  (Last synced {formattedLastSync})
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            id="network-retry-sync-btn"
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center gap-1.5 px-3 min-h-[40px] sm:min-h-[32px] bg-[var(--m-watch-soft)] hover:bg-[#F59E0B]/25 text-[var(--m-text-primary)] border border-[var(--m-watch)]/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            title="Retry connecting to national weather network"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? t('reconnecting', 'Checking...') : t('retrySync', 'Retry Sync')}</span>
          </button>

          <button
            type="button"
            id="network-dismiss-banner-btn"
            onClick={() => setIsDismissed(true)}
            className="min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] rounded-lg hover:bg-[var(--m-surface-1)] transition-colors cursor-pointer"
            aria-label="Dismiss offline banner"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
