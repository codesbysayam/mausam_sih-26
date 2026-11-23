// ====================================================================
// MAUSAM Floating Alert Center Drawer / Modal
// Renders real SACHET/NDMA and IMD warning status across Analyze,
// Classic, and Explore modes with truthful feed provenance and timestamp.
// ====================================================================

import React, { useEffect } from 'react';
import { AlertTriangle, ShieldCheck, X, ArrowUpRight, RefreshCw } from 'lucide-react';
import type { LocationRecord, WeatherAlert } from '../../types';
import { useProvider } from '../../store/providerStore';
import { formatTimestampIST, getAlertFeedAvailability } from '../../services/providers/providerStatus';
import { useExperience } from '../../context/ExperienceContext';
import { formatLocationTitle } from '../../utils/locationFormatter';
import { AnimatePresence, motion } from 'motion/react';
import { MOTION_DURATION, MOTION_EASE } from '../../motion';

interface AlertCenterModalProps {
  selectedLocation: LocationRecord;
  alerts: WeatherAlert[];
  onOpenFullWarningsPage: () => void;
}

export const AlertCenterModal: React.FC<AlertCenterModalProps> = ({
  selectedLocation,
  alerts = [],
  onOpenFullWarningsPage,
}) => {
  const { isAlertDrawerOpen, setIsAlertDrawerOpen } = useExperience();
  const { state: sachetState, refresh: refreshSachet } = useProvider('SACHET');
  const sachetAvailability = getAlertFeedAvailability(sachetState);
  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  useEffect(() => {
    if (!isAlertDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAlertDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAlertDrawerOpen, setIsAlertDrawerOpen]);

  const lastChecked =
    sachetState.lastSuccessfulFetch || sachetState.fetchedAt
      ? formatTimestampIST(sachetState.lastSuccessfulFetch || sachetState.fetchedAt)
      : 'latest sync';

  return (
    <AnimatePresence>
      {isAlertDrawerOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Official Meteorological Warnings & SACHET Feed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MOTION_DURATION.FAST, ease: MOTION_EASE.FEEDBACK }}
          className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end bg-black/50 p-3 sm:p-4"
          onClick={() => setIsAlertDrawerOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 16, scale: 0.98 }}
            transition={{ duration: MOTION_DURATION.STANDARD, ease: MOTION_EASE.ENTRANCE }}
            className="w-full max-w-md bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[var(--m-text-primary)] shadow-2xl rounded-[11px] p-4 sm:p-5 flex flex-col gap-3.5 max-h-[85dvh] overflow-y-auto scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--m-border)]">
          <div>
            <span className="mausam-eyebrow">
              NDMA SACHET CAP · IMD Bulletins
            </span>
            <h2 className="text-base font-bold text-[var(--m-text-primary)] mt-1">
              Hazard Posture — {selectedLocation.state}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => refreshSachet(true)}
              title="Refresh SACHET alert feed"
              aria-label="Refresh SACHET alert feed"
              className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] cursor-pointer m-focus-ring"
            >
              <RefreshCw className={`w-4 h-4 ${sachetState.status === 'LOADING' ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsAlertDrawerOpen(false)}
              aria-label="Close alerts drawer"
              className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] cursor-pointer m-focus-ring"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Truthful Feed Status Banner */}
        {sachetAvailability === 'UNAVAILABLE' ? (
          <div className="rounded-xl bg-[var(--m-watch-soft)] border border-[var(--m-watch)]/35 p-3.5 text-xs">
            <div className="font-semibold text-[var(--m-watch)] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>SACHET / Official Alert Feed Unavailable</span>
            </div>
            <p className="mt-1.5 text-[var(--m-text-secondary)] leading-relaxed">
              {sachetState.error || 'NDMA SACHET / IMD alert feed could not be reached.'} This does not confirm an all-clear. Retry sync or inspect the full Warnings matrix.
            </p>
          </div>
        ) : safeAlerts.length === 0 ? (
          <div className="rounded-xl bg-[var(--m-ok-soft)] border border-[var(--m-ok)]/30 p-3.5 text-xs">
            <div className="font-semibold text-[var(--m-ok)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>No Active Alerts Reported</span>
            </div>
            <p className="mt-1.5 text-[var(--m-text-secondary)] leading-relaxed">
              No active alerts reported by SACHET/IMD for {formatLocationTitle(selectedLocation)} as of{' '}
              <span className="font-mono text-[var(--m-text-primary)]">{lastChecked}</span>.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {safeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border)] p-3.5 text-xs flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--m-text-primary)]">{alert.title}</span>
                  <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-[var(--m-alert-soft)] border border-[var(--m-alert)]/35 text-[var(--m-alert)] shrink-0">
                    {alert.severity}
                  </span>
                </div>
                <p className="text-[var(--m-text-secondary)] leading-relaxed">{alert.description}</p>
                {Array.isArray(alert.affectedDistricts) && alert.affectedDistricts.length > 0 && (
                  <div className="text-[11px] text-[var(--m-text-muted)]">
                    Districts: {alert.affectedDistricts.slice(0, 5).join(', ')}
                  </div>
                )}
                <div className="text-[10px] font-mono text-[var(--m-text-muted)] flex items-center justify-between pt-1.5 border-t border-[var(--m-border)]">
                  <span>{alert.agency}</span>
                  <span>Valid until {alert.validUntil || 'Not reported'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setIsAlertDrawerOpen(false);
            onOpenFullWarningsPage();
          }}
          className="w-full min-h-[44px] sm:min-h-[40px] px-4 rounded-[7px] bg-[var(--m-accent)] text-[var(--m-on-accent)] text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-95 cursor-pointer m-focus-ring"
        >
          <span>Open Full Warnings Matrix</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
