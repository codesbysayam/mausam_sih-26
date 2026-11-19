import React, { useEffect } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Clock,
  History,
  MapPin,
  Phone,
  Radar,
  ShieldCheck,
  X,
} from 'lucide-react';
import { WarningRecord } from '../../types/warningTypes';

interface WarningDetailDrawerProps {
  warning: WarningRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WarningDetailDrawer: React.FC<WarningDetailDrawerProps> = ({
  warning,
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !warning) return null;

  const badgeStyle =
    warning.severity === 'red'
      ? 'bg-[var(--m-danger-soft)] border-[var(--m-danger)]/45 text-[var(--m-danger)]'
      : warning.severity === 'orange'
      ? 'bg-[var(--m-alert-soft)] border-[var(--m-alert)]/45 text-[var(--m-alert)]'
      : warning.severity === 'yellow'
      ? 'bg-[var(--m-watch-soft)] border-[var(--m-watch)]/45 text-[var(--m-watch)]'
      : warning.severity === 'purple'
      ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/45 text-[var(--m-accent)]'
      : 'bg-[var(--m-ok-soft)] border-[var(--m-ok)]/45 text-[var(--m-ok)]';

  return (
    <div
      id="warning-detail-drawer-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="warning-detail-drawer-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-warning-title"
        className="w-full max-w-2xl h-full bg-[var(--m-surface-inset)] border-l border-[var(--m-border)] shadow-2xl flex flex-col justify-between overflow-hidden"
      >
        <div className="p-4 sm:p-5 bg-[var(--m-surface-1)] border-b border-[var(--m-border)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[11px] font-bold uppercase tracking-wider ${badgeStyle}`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{warning.severityLabel}</span>
            </span>

            <span className="text-xs font-mono text-[var(--m-text-muted)] truncate">
              {warning.bulletinNo}
            </span>
          </div>

          <button
            id="btn-close-warning-drawer"
            type="button"
            onClick={onClose}
            aria-label="Close details drawer"
            className="w-10 h-10 rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer shrink-0 m-focus-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-[var(--m-text-secondary)]">
          <div className="space-y-1.5 pb-4 border-b border-[var(--m-border)]">
            <div className="flex items-center gap-1.5 text-[var(--m-accent)] text-xs font-mono font-semibold uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {warning.state} · {warning.subdivision}
              </span>
            </div>

            <h2
              id="drawer-warning-title"
              className="text-xl sm:text-2xl font-bold text-[var(--m-text-primary)] tracking-tight"
            >
              {warning.title}
            </h2>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-[var(--m-text-muted)]">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--m-ok)]" />
                <span>
                  Issued:{' '}
                  <strong className="text-[var(--m-text-primary)] font-mono tabular-nums">
                    {warning.issuedAt}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-[var(--m-alert)]" />
                <span>
                  Valid until:{' '}
                  <strong className="text-[var(--m-text-primary)] font-mono tabular-nums">
                    {warning.validUntil}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold text-[var(--m-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              <span>Designated Affected Districts ({warning.affectedDistricts.length})</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {warning.affectedDistricts.map((district, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-xs font-medium text-[var(--m-text-primary)]"
                >
                  {district}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-[var(--m-surface-1)] border border-[var(--m-border)] rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-mono font-bold text-[var(--m-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <Radar className="w-4 h-4 text-[var(--m-accent)]" />
              <span>Synoptic Warning Bulletin</span>
            </h4>
            <p className="text-xs sm:text-sm leading-relaxed text-[var(--m-text-secondary)]">
              {warning.description}
            </p>
            {warning.meteorologicalSynopsys && (
              <p className="text-xs text-[var(--m-text-muted)] pt-2 border-t border-[var(--m-border)]">
                {warning.meteorologicalSynopsys}
              </p>
            )}
          </div>

          {warning.expectedConditions && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-[var(--m-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[var(--m-accent)]" />
                <span>Expected Meteorological Quantities</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {warning.expectedConditions.rainfall && (
                  <div className="bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg p-3">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase">24h Precipitation</span>
                    <div className="text-xs font-bold font-mono tabular-nums text-[var(--m-text-primary)] mt-0.5">
                      {warning.expectedConditions.rainfall}
                    </div>
                  </div>
                )}

                {warning.expectedConditions.windSpeed && (
                  <div className="bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg p-3">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase">Sustained Wind</span>
                    <div className="text-xs font-bold font-mono tabular-nums text-[var(--m-text-primary)] mt-0.5">
                      {warning.expectedConditions.windSpeed}
                    </div>
                  </div>
                )}

                {warning.expectedConditions.windGusts && (
                  <div className="bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg p-3">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase">Peak Gusts</span>
                    <div className="text-xs font-bold font-mono tabular-nums text-[var(--m-alert)] mt-0.5">
                      {warning.expectedConditions.windGusts}
                    </div>
                  </div>
                )}

                {warning.expectedConditions.visibility && (
                  <div className="bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg p-3">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase">Visibility</span>
                    <div className="text-xs font-bold font-mono tabular-nums text-[var(--m-text-primary)] mt-0.5">
                      {warning.expectedConditions.visibility}
                    </div>
                  </div>
                )}

                {warning.expectedConditions.waveHeight && (
                  <div className="bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg p-3">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase">Sea Wave Height</span>
                    <div className="text-xs font-bold font-mono tabular-nums text-[var(--m-accent)] mt-0.5">
                      {warning.expectedConditions.waveHeight}
                    </div>
                  </div>
                )}

                {warning.expectedConditions.temperature && (
                  <div className="bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg p-3">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase">Temperature</span>
                    <div className="text-xs font-bold font-mono tabular-nums text-[var(--m-text-primary)] mt-0.5">
                      {warning.expectedConditions.temperature}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {warning.impacts && warning.impacts.length > 0 && (
            <div className="space-y-2 bg-[var(--m-surface-1)] border border-[var(--m-alert)]/35 rounded-xl p-4">
              <h4 className="text-xs font-mono font-bold text-[var(--m-alert)] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Hazard Impact Assessment</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-[var(--m-text-secondary)]">
                {warning.impacts.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[var(--m-alert)] font-bold">·</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warning.recommendedActions && warning.recommendedActions.length > 0 && (
            <div className="space-y-2 bg-[var(--m-surface-1)] border border-[var(--m-ok)]/35 rounded-xl p-4">
              <h4 className="text-xs font-mono font-bold text-[var(--m-ok)] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Actionable Public Advisory &amp; SOPs</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-[var(--m-text-secondary)]">
                {warning.recommendedActions.map((act, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[var(--m-ok)] font-bold">·</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warning.timeline && warning.timeline.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-[var(--m-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[var(--m-accent)]" />
                <span>Bulletin Progression Timeline</span>
              </h4>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-[var(--m-surface-2)]">
                {warning.timeline.map((evt, idx) => (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 ${
                        evt.status === 'completed'
                          ? 'bg-[#22C7A0] border-[var(--m-border)]'
                          : evt.status === 'current'
                          ? 'bg-[#EF4444] border-[#F3F6FA]'
                          : 'bg-[var(--m-surface-2)] border-[var(--m-border)]'
                      }`}
                    />
                    <div className="text-[11px] font-mono text-[var(--m-text-muted)] tabular-nums">
                      {evt.date} · {evt.time}
                    </div>
                    <div className="font-bold text-[var(--m-text-primary)] text-xs">{evt.title}</div>
                    <div className="text-[11px] text-[var(--m-text-secondary)]">{evt.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[var(--m-surface-1)] border border-[var(--m-border)] rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <div className="text-[10px] text-[var(--m-text-muted)] uppercase">Issuing Authority</div>
                <div className="font-bold text-[var(--m-text-primary)]">{warning.source}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--m-text-muted)] uppercase">Tracking Radar</div>
                <div className="font-mono text-[var(--m-accent)]">
                  {warning.radarTrackingStation || 'IMD DWR Network'}
                </div>
              </div>
            </div>

            {warning.emergencyContact && (
              <div className="pt-2.5 border-t border-[var(--m-border)] flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold text-[var(--m-alert)] uppercase">
                    {warning.emergencyContact.title}
                  </div>
                  <div className="text-sm font-bold font-mono text-[var(--m-text-primary)]">
                    {warning.emergencyContact.number}
                  </div>
                </div>

                <a
                  href={`tel:${warning.emergencyContact.number.split('/')[0].trim()}`}
                  className="px-3.5 py-2 min-h-[40px] rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Helpline</span>
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-[var(--m-surface-1)] border-t border-[var(--m-border)] flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-[var(--m-text-muted)] font-mono">
            National Meteorological Feed · Verified CAP Record
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[40px] rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-primary)] text-xs font-semibold border border-[var(--m-border)] transition-colors cursor-pointer m-focus-ring"
          >
            Close Bulletin
          </button>
        </div>
      </div>
    </div>
  );
};
